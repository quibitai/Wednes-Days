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
  } {
    const periods = this.algorithm.getCustodyPeriods(schedule, dayRange);
    const totalHandoffs = periods.length - 1; // Number of transitions
    const averagePeriodLength = periods.length > 0 
      ? periods.reduce((sum, p) => sum + p.dayCount, 0) / periods.length 
      : 0;

    return {
      periods: periods.map(p => ({ personId: p.personId, days: p.dayCount })),
      totalHandoffs,
      averagePeriodLength,
    };
  }

  /**
   * Clear all data (for development/testing)
   */
  async clearAllData(): Promise<void> {
    await this.storage.clear();
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