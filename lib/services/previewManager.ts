import type { 
  ScheduleEntry, 
  SchedulePreview, 
  ScheduleChange, 
  CustodySchedule,
  AppConfig 
} from '@/types';
import { AutoRebalanceService } from './autoRebalanceService';
import type { AIRebalanceRequest } from './aiRebalanceService';

export class PreviewManager {
  private storageKey = 'custody-schedule-preview';
  private autoRebalanceService = new AutoRebalanceService();
  private config: AppConfig | null = null;

  /**
   * Set configuration for AI requests
   */
  setConfig(config: AppConfig): void {
    this.config = config;
  }

  /**
   * Load the current preview state
   */
  loadPreview(): SchedulePreview | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    }
    return null;
  }

  /**
   * Initialize a new preview session from current schedule
   */
  initializePreview(currentSchedule: Record<string, ScheduleEntry>): SchedulePreview {
    const preview: SchedulePreview = {
      current: { ...currentSchedule },
      unavailable: {},
      proposed: {},
      manual: {},
      hasUnsavedChanges: false
    };

    this.savePreview(preview);
    return preview;
  }

  /**
   * Mark a day as unavailable
   */
  markUnavailable(preview: SchedulePreview, date: string, person: 'personA' | 'personB'): SchedulePreview {
    const updated = {
      ...preview,
      unavailable: {
        ...preview.unavailable,
        [date]: person
      },
      hasUnsavedChanges: true
    };

    this.savePreview(updated);
    return updated;
  }

  /**
   * Remove unavailability marking
   */
  removeUnavailable(preview: SchedulePreview, date: string): SchedulePreview {
    const updated = { ...preview };
    delete updated.unavailable[date];
    
    // Also remove from proposed if it was changed due to this unavailability
    if (updated.proposed[date]) {
      delete updated.proposed[date];
    }

    updated.hasUnsavedChanges = Object.keys(updated.unavailable).length > 0 || 
                                Object.keys(updated.proposed).length > 0 ||
                                Object.keys(updated.manual).length > 0;

    this.savePreview(updated);
    return updated;
  }

  /**
   * Generate AI-powered proposals based on unavailable days
   */
  async generateAIProposals(preview: SchedulePreview): Promise<SchedulePreview> {
    const updated = { ...preview };
    
    // Reset proposals
    updated.proposed = {};

    // If no unavailable days, nothing to do
    const unavailableDays = Object.keys(preview.unavailable);
    if (unavailableDays.length === 0) {
      this.savePreview(updated);
      return updated;
    }

    if (!this.config) {
      console.warn('No config set for AI proposals, falling back to algorithmic approach');
      return this.generateProposals(preview);
    }

    try {
      // For now, handle the first unavailable day (can be extended for multiple days)
      const firstUnavailableDate = unavailableDays[0];
      const unavailablePerson = preview.unavailable[firstUnavailableDate];

      // Build context window (4 weeks around the unavailable date)
      const unavailableDateTime = new Date(firstUnavailableDate);
      const windowStart = new Date(unavailableDateTime.getTime() - 14 * 24 * 60 * 60 * 1000); // 2 weeks before
      const windowEnd = new Date(unavailableDateTime.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks after

      const aiRequest: AIRebalanceRequest = {
        currentSchedule: preview.current,
        unavailableDate: firstUnavailableDate,
        unavailablePerson,
        config: this.config,
        context: {
          windowStart: windowStart.toISOString().split('T')[0],
          windowEnd: windowEnd.toISOString().split('T')[0],
          currentHandoffCount: this.countHandoffs(preview.current),
          recentChanges: []
        },
        preferences: {
          minimizeHandoffs: true,
          preferLongerBlocks: true,
          maintainFairness: true,
          maxChangesAllowed: 5
        }
      };

      const response = await fetch('/api/ai/rebalance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiRequest)
      });

      if (response.ok) {
        const aiResult = await response.json();
        if (aiResult.success && aiResult.proposedSchedule) {
          // Find what changed from the original
          for (const [date, proposedEntry] of Object.entries(aiResult.proposedSchedule as Record<string, ScheduleEntry>)) {
            const originalEntry = preview.current[date];
            if (originalEntry && proposedEntry && originalEntry.assignedTo !== proposedEntry.assignedTo) {
              updated.proposed[date] = proposedEntry;
            }
          }
        } else {
          throw new Error('AI proposal failed');
        }
      } else {
        throw new Error('AI API request failed');
      }
    } catch (error) {
      console.error('Error generating AI proposals, falling back to algorithmic approach:', error);
      return this.generateProposals(preview);
    }

    updated.hasUnsavedChanges = true;
    this.savePreview(updated);
    return updated;
  }

  /**
   * Count handoffs in a schedule (helper method)
   */
  private countHandoffs(schedule: Record<string, ScheduleEntry>): number {
    const dates = Object.keys(schedule).sort();
    let handoffs = 0;
    
    for (let i = 1; i < dates.length; i++) {
      const prevEntry = schedule[dates[i - 1]];
      const currEntry = schedule[dates[i]];
      
      if (prevEntry && currEntry && prevEntry.assignedTo !== currEntry.assignedTo) {
        handoffs++;
      }
    }
    
    return handoffs;
  }

  /**
   * Generate proposed changes based on unavailable days
   */
  async generateProposals(preview: SchedulePreview): Promise<SchedulePreview> {
    const updated = { ...preview };
    
    // Reset proposals
    updated.proposed = {};

    // If no unavailable days, nothing to do
    const unavailableDays = Object.keys(preview.unavailable);
    if (unavailableDays.length === 0) {
      this.savePreview(updated);
      return updated;
    }

    try {
      // Create a working schedule with all unavailable days already reassigned
      const workingSchedule = { ...preview.current };
      
      // First, reassign all unavailable days to the other person
      for (const [date, unavailablePerson] of Object.entries(preview.unavailable)) {
        const currentEntry = workingSchedule[date];
        if (currentEntry && currentEntry.assignedTo === unavailablePerson) {
          const otherPerson = unavailablePerson === 'personA' ? 'personB' : 'personA';
          workingSchedule[date] = {
            ...currentEntry,
            assignedTo: otherPerson,
            isUnavailable: true,
            unavailableBy: unavailablePerson
          };
        }
      }

      // Now run a single rebalancing operation on the entire schedule
      // Use the first unavailable day as the trigger, but pass all unavailable info
      const firstUnavailableDate = unavailableDays[0];
      const firstUnavailablePerson = preview.unavailable[firstUnavailableDate];
      
      const result = await this.autoRebalanceService.rebalanceScheduleMultiple(
        preview.current,
        preview.unavailable
      );

      if (result.success && result.rebalancedSchedule) {
        // Find what changed from the original
        for (const [date, rebalancedEntry] of Object.entries(result.rebalancedSchedule)) {
          const originalEntry = preview.current[date];
          if (originalEntry && rebalancedEntry && originalEntry.assignedTo !== rebalancedEntry.assignedTo) {
            updated.proposed[date] = rebalancedEntry as ScheduleEntry;
          }
        }
      }
    } catch (error) {
      console.error('Error generating proposals:', error);
      
      // Fallback: at least reassign the unavailable days
      for (const [date, unavailablePerson] of Object.entries(preview.unavailable)) {
        const currentEntry = preview.current[date];
        if (currentEntry && currentEntry.assignedTo === unavailablePerson) {
          const otherPerson = unavailablePerson === 'personA' ? 'personB' : 'personA';
          updated.proposed[date] = {
            ...currentEntry,
            assignedTo: otherPerson,
            isUnavailable: true,
            unavailableBy: unavailablePerson
          };
        }
      }
    }

    updated.hasUnsavedChanges = true;
    this.savePreview(updated);
    return updated;
  }

  /**
   * Make a manual adjustment to a proposed change
   */
  makeManualAdjustment(
    preview: SchedulePreview, 
    date: string, 
    newAssignment: 'personA' | 'personB'
  ): SchedulePreview {
    const updated = {
      ...preview,
      manual: {
        ...preview.manual,
        [date]: {
          date,
          assignedTo: newAssignment
        }
      },
      hasUnsavedChanges: true
    };

    this.savePreview(updated);
    return updated;
  }

  /**
   * Get the final schedule with all changes applied
   */
  getFinalSchedule(preview: SchedulePreview): Record<string, ScheduleEntry> {
    const final = { ...preview.current };

    // Apply proposed changes
    Object.assign(final, preview.proposed);

    // Apply manual overrides
    Object.assign(final, preview.manual);

    return final;
  }

  /**
   * Get list of all changes
   */
  getChanges(preview: SchedulePreview): ScheduleChange[] {
    const changes: ScheduleChange[] = [];
    const finalSchedule = this.getFinalSchedule(preview);

    // Check all dates that might have changed
    const allDates = new Set([
      ...Object.keys(preview.current),
      ...Object.keys(preview.proposed),
      ...Object.keys(preview.manual)
    ]);

    for (const date of allDates) {
      const currentEntry = preview.current[date];
      const finalEntry = finalSchedule[date];

      if (currentEntry && finalEntry && currentEntry.assignedTo !== finalEntry.assignedTo) {
        let reason: 'unavailable' | 'manual' | 'auto_balance' = 'auto_balance';
        
        if (preview.unavailable[date]) {
          reason = 'unavailable';
        } else if (preview.manual[date]) {
          reason = 'manual';
        }

        changes.push({
          date,
          fromPerson: currentEntry.assignedTo,
          toPerson: finalEntry.assignedTo,
          reason
        });
      }
    }

    return changes.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Commit all changes to the actual schedule
   */
  commitChanges(preview: SchedulePreview): Record<string, ScheduleEntry> {
    const finalSchedule = this.getFinalSchedule(preview);
    
    // Clear the preview
    this.clearPreview();
    
    return finalSchedule;
  }

  /**
   * Discard all changes and clear preview
   */
  discardChanges(): void {
    this.clearPreview();
  }

  /**
   * Reset to clean state (for 3-day reset button)
   */
  resetToCleanState(newSchedule: Record<string, ScheduleEntry>): SchedulePreview {
    const preview: SchedulePreview = {
      current: newSchedule,
      unavailable: {},
      proposed: {},
      manual: {},
      hasUnsavedChanges: false
    };

    this.savePreview(preview);
    return preview;
  }

  /**
   * Save preview to localStorage
   */
  private savePreview(preview: SchedulePreview): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(preview));
      }
    } catch (error) {
      console.error('Error saving preview:', error);
    }
  }

  /**
   * Clear preview from localStorage
   */
  private clearPreview(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      console.error('Error clearing preview:', error);
    }
  }

  /**
   * Check if a date has been changed in the preview
   */
  isDateChanged(preview: SchedulePreview, date: string): boolean {
    const currentEntry = preview.current[date];
    const finalSchedule = this.getFinalSchedule(preview);
    const finalEntry = finalSchedule[date];

    return currentEntry && finalEntry && currentEntry.assignedTo !== finalEntry.assignedTo;
  }

  /**
   * Get the effective assignment for a date (considering all changes)
   */
  getEffectiveAssignment(preview: SchedulePreview, date: string): 'personA' | 'personB' | null {
    // Manual override takes precedence
    if (preview.manual[date]) {
      return preview.manual[date].assignedTo;
    }

    // Then proposed changes
    if (preview.proposed[date]) {
      return preview.proposed[date].assignedTo;
    }

    // Finally current assignment
    if (preview.current[date]) {
      return preview.current[date].assignedTo;
    }

    return null;
  }
} 