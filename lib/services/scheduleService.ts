import { CustodySchedulingAlgorithm } from '@/lib/scheduling/algorithm';
import { StorageManager } from '@/lib/storage/storageManager';
import type { 
  CustodySchedule, 
  UnavailabilityRequest, 
  AppConfig,
  User 
} from '@/types';
import type { StorageBackend } from '@/lib/storage/types';

/**
 * Service for managing custody schedule data with multiple storage backends
 * Automatically selects best available storage (Vercel KV > Vercel Blob > localStorage)
 */
export class ScheduleService {
  private algorithm = new CustodySchedulingAlgorithm();
  private storage: StorageManager;

  constructor(preferredBackend?: StorageBackend) {
    this.storage = new StorageManager(preferredBackend);
  }

  /**
   * Initialize the application with user setup
   */
  async initializeApp(config: {
    personAName: string;
    personBName: string;
    startDate: string;
    initialPerson: 'personA' | 'personB';
  }): Promise<void> {
    const appConfig: AppConfig = {
      personA: {
        id: 'personA',
        name: config.personAName,
        color: '#0ea5e9', // person-a-500
      },
      personB: {
        id: 'personB',
        name: config.personBName,
        color: '#f97316', // person-b-500
      },
      maxConsecutiveDays: 4,
      defaultRotationDays: 3,
    };

    // Generate initial schedule
    const initialSchedule = this.algorithm.generateInitialSchedule(
      config.startDate,
      config.initialPerson,
      90 // Generate 3 months initially
    );

    // Save both config and schedule
    await Promise.all([
      this.storage.saveConfig(appConfig),
      this.storage.saveSchedule(initialSchedule),
    ]);
  }

  /**
   * Get current app configuration
   */
  async getAppConfig(): Promise<AppConfig | null> {
    return this.storage.loadConfig();
  }

  /**
   * Get current custody schedule
   */
  async getCurrentSchedule(): Promise<CustodySchedule | null> {
    return this.storage.loadSchedule();
  }

  /**
   * Subscribe to real-time schedule updates
   */
  subscribeToSchedule(callback: (schedule: CustodySchedule | null) => void): () => void {
    return this.storage.subscribeToSchedule(callback);
  }

  /**
   * Subscribe to real-time config updates
   */
  subscribeToConfig(callback: (config: AppConfig | null) => void): () => void {
    return this.storage.subscribeToConfig(callback);
  }

  /**
   * Mark dates as unavailable for a specific person
   */
  async markUnavailable(
    personId: 'personA' | 'personB',
    dates: string[]
  ): Promise<{ success: boolean; message: string; handoffCount?: number }> {
    try {
      const [schedule, config] = await Promise.all([
        this.storage.loadSchedule(),
        this.storage.loadConfig()
      ]);

      if (!schedule || !config) {
        throw new Error('Schedule or configuration not found. Please set up the application first.');
      }

      const request: UnavailabilityRequest = {
        personId,
        dates,
        reason: 'User marked unavailable',
      };

      const { adjustedSchedule, adjustment } = this.algorithm.processUnavailabilityRequest(
        schedule, 
        request,
        config
      );

      await this.storage.saveSchedule(adjustedSchedule);

      const personName = personId === 'personA' ? config.personA.name : config.personB.name;
      const datesStr = dates.length === 1 ? dates[0] : `${dates.length} dates`;
      
      if (adjustment.conflictDates.length > 0) {
        const warningMessage = adjustment.warnings 
          ? ` Note: ${adjustment.warnings.join('; ')}`
          : '';
        return {
          success: true,
          message: `${personName} marked unavailable for ${datesStr}. Schedule adjusted with ${adjustment.handoffCount} handoff${adjustment.handoffCount !== 1 ? 's' : ''}.${warningMessage}`,
          handoffCount: adjustment.handoffCount,
        };
      }

      return {
        success: true,
        message: `${personName} marked unavailable for ${datesStr}. No schedule conflicts.`,
        handoffCount: 0,
      };
    } catch (error) {
      console.error('Error marking unavailable:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to mark dates as unavailable',
      };
    }
  }

  /**
   * Remove unavailability from a specific date
   */
  async removeUnavailability(date: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const currentSchedule = await this.getCurrentSchedule();
      if (!currentSchedule) {
        return { success: false, message: 'No schedule found. Please initialize the app first.' };
      }

      const entry = currentSchedule.entries[date];
      if (!entry) {
        return { success: false, message: 'Date not found in schedule.' };
      }

      if (!entry.isUnavailable) {
        return { success: false, message: 'Date is not marked as unavailable.' };
      }

      // Validate that date is in the future
      const today = new Date().toISOString().split('T')[0];
      if (date <= today) {
        return { 
          success: false, 
          message: 'Cannot modify past dates' 
        };
      }

      // Remove unavailability flags and restore original assignment if needed
      const updatedEntries = { ...currentSchedule.entries };
      updatedEntries[date] = {
        ...entry,
        isUnavailable: false,
        unavailableBy: undefined,
        // If it was adjusted due to unavailability, restore original assignment
        assignedTo: entry.originalAssignedTo || entry.assignedTo,
        isAdjusted: false,
        originalAssignedTo: undefined,
      };

      const updatedSchedule: CustodySchedule = {
        ...currentSchedule,
        entries: updatedEntries,
        lastUpdated: new Date().toISOString(),
      };

      // Save the updated schedule
      await this.storage.saveSchedule(updatedSchedule);

      return {
        success: true,
        message: 'Unavailability removed successfully.',
      };

    } catch (error) {
      console.error('Error removing unavailability:', error);
      return {
        success: false,
        message: 'An error occurred while removing unavailability.',
      };
    }
  }

  /**
   * Check if the app is initialized
   */
  async isInitialized(): Promise<boolean> {
    return this.storage.isInitialized();
  }

  /**
   * Get schedule statistics for a date range
   */
  getScheduleStats(schedule: CustodySchedule, dayRange: number = 30): {
    periods: Array<{ personId: 'personA' | 'personB'; days: number }>;
    totalHandoffs: number;
    averagePeriodLength: number;
    // Enhanced statistics
    yearToDateSplit: { personA: number; personB: number };
    averageBlockLength: { personA: number; personB: number };
    monthlyHandoffs: Array<{ month: string; handoffs: number }>;
  } {
    const periods = this.algorithm.getCustodyPeriods(schedule, dayRange);
    const totalHandoffs = periods.length - 1; // Number of transitions
    const averagePeriodLength = periods.length > 0 
      ? periods.reduce((sum, p) => sum + p.dayCount, 0) / periods.length 
      : 0;

    // Calculate year-to-date custody split
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const today = new Date().toISOString().split('T')[0];
    
    let ytdPersonA = 0;
    let ytdPersonB = 0;
    
    Object.entries(schedule.entries).forEach(([date, entry]) => {
      if (date >= yearStart && date <= today) {
        if (entry.assignedTo === 'personA') {
          ytdPersonA++;
        } else if (entry.assignedTo === 'personB') {
          ytdPersonB++;
        }
      }
    });

    const totalYtdDays = ytdPersonA + ytdPersonB;
    const yearToDateSplit = {
      personA: totalYtdDays > 0 ? Math.round((ytdPersonA / totalYtdDays) * 100) : 0,
      personB: totalYtdDays > 0 ? Math.round((ytdPersonB / totalYtdDays) * 100) : 0,
    };

    // Calculate average block length per person
    const personABlocks: number[] = [];
    const personBBlocks: number[] = [];
    
    periods.forEach(period => {
      if (period.personId === 'personA') {
        personABlocks.push(period.dayCount);
      } else {
        personBBlocks.push(period.dayCount);
      }
    });

    const averageBlockLength = {
      personA: personABlocks.length > 0 
        ? Math.round((personABlocks.reduce((sum, days) => sum + days, 0) / personABlocks.length) * 10) / 10
        : 0,
      personB: personBBlocks.length > 0 
        ? Math.round((personBBlocks.reduce((sum, days) => sum + days, 0) / personBBlocks.length) * 10) / 10
        : 0,
    };

    // Calculate monthly handoffs for the past 12 months
    const monthlyHandoffs: Array<{ month: string; handoffs: number }> = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthDate.toISOString().slice(0, 7); // YYYY-MM format
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Count handoffs in this month
      let handoffsInMonth = 0;
      const monthStart = `${monthKey}-01`;
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        .toISOString().split('T')[0];
      
      let previousAssignment: 'personA' | 'personB' | null = null;
      
      Object.entries(schedule.entries)
        .filter(([date]) => date >= monthStart && date <= monthEnd)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, entry]) => {
          if (previousAssignment && previousAssignment !== entry.assignedTo) {
            handoffsInMonth++;
          }
          previousAssignment = entry.assignedTo;
        });
      
      monthlyHandoffs.push({
        month: monthName,
        handoffs: handoffsInMonth,
      });
    }

    return {
      periods: periods.map(p => ({ personId: p.personId, days: p.dayCount })),
      totalHandoffs,
      averagePeriodLength,
      yearToDateSplit,
      averageBlockLength,
      monthlyHandoffs,
    };
  }

  /**
   * Clear all data (for development/testing)
   */
  async clearAllData(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * TEMPORARY: Flip all assignments (personA <-> personB) to fix initial setup
   * This can be used when the initial person was set incorrectly
   */
  async flipAllAssignments(): Promise<void> {
    const currentSchedule = await this.getCurrentSchedule();
    if (!currentSchedule) {
      throw new Error('No schedule found to flip');
    }

    // Flip all assignments
    const flippedEntries: Record<string, any> = {};
    Object.entries(currentSchedule.entries).forEach(([date, entry]) => {
      flippedEntries[date] = {
        ...entry,
        assignedTo: entry.assignedTo === 'personA' ? 'personB' : 'personA',
        // Also flip the original assignment if it exists
        originalAssignedTo: entry.originalAssignedTo 
          ? (entry.originalAssignedTo === 'personA' ? 'personB' : 'personA')
          : undefined,
      };
    });

    // Update the schedule with flipped assignments and initial person
    const flippedSchedule: CustodySchedule = {
      ...currentSchedule,
      entries: flippedEntries,
      initialPerson: currentSchedule.initialPerson === 'personA' ? 'personB' as const : 'personA' as const,
      lastUpdated: new Date().toISOString(),
    };

    await this.storage.saveSchedule(flippedSchedule);
  }

  /**
   * Get current storage information for debugging
   */
  getStorageInfo(): { primary: string; fallback?: string; isConfigured: boolean } {
    return this.storage.getStorageInfo();
  }

  /**
   * Get storage mode for backwards compatibility
   */
  getStorageMode(): string {
    const info = this.storage.getStorageInfo();
    return info.primary;
  }
} 