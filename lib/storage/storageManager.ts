import type { StorageAdapter, StorageBackend } from './types';
import type { CustodySchedule, AppConfig, ChangeHistory, ChangeHistoryEntry } from '@/types';

import { LocalStorageAdapter } from './localStorageAdapter';
import { VercelBlobAdapter } from './vercelBlobAdapter';
import { VercelKVAdapter } from './vercelKVAdapter';

/**
 * Storage manager that automatically selects the best available storage backend
 * with intelligent fallbacks based on environment and configuration
 */
export class StorageManager {
  private adapter: StorageAdapter;
  private fallbackAdapter?: StorageAdapter;
  private changeHistoryKey = 'custody-change-history';

  constructor(preferredBackend?: StorageBackend) {
    const { primary, fallback } = this.selectAdapters(preferredBackend);
    this.adapter = primary;
    this.fallbackAdapter = fallback;

    console.log(`Storage: Using ${this.adapter.name}${fallback ? ` with ${fallback.name} fallback` : ''}`);
  }

  /**
   * Get the current storage adapter name for debugging
   */
  getStorageInfo(): { primary: string; fallback?: string; isConfigured: boolean } {
    return {
      primary: this.adapter.name,
      fallback: this.fallbackAdapter?.name,
      isConfigured: this.adapter.isConfigured(),
    };
  }

  /**
   * Save app configuration
   */
  async saveConfig(config: AppConfig): Promise<void> {
    try {
      await this.adapter.saveConfig(config);
    } catch (error) {
      console.warn(`Primary storage (${this.adapter.name}) failed, trying fallback:`, error);
      if (this.fallbackAdapter) {
        await this.fallbackAdapter.saveConfig(config);
        this.switchToFallback();
      } else {
        throw error;
      }
    }
  }

  /**
   * Load app configuration
   */
  async loadConfig(): Promise<AppConfig | null> {
    try {
      return await this.adapter.loadConfig();
    } catch (error) {
      console.warn(`Primary storage (${this.adapter.name}) failed, trying fallback:`, error);
      if (this.fallbackAdapter) {
        const result = await this.fallbackAdapter.loadConfig();
        this.switchToFallback();
        return result;
      }
      return null;
    }
  }

  /**
   * Save schedule data
   */
  async saveSchedule(schedule: CustodySchedule): Promise<void> {
    try {
      await this.adapter.saveSchedule(schedule);
    } catch (error) {
      console.warn(`Primary storage (${this.adapter.name}) failed, trying fallback:`, error);
      if (this.fallbackAdapter) {
        await this.fallbackAdapter.saveSchedule(schedule);
        this.switchToFallback();
      } else {
        throw error;
      }
    }
  }

  /**
   * Load schedule data
   */
  async loadSchedule(): Promise<CustodySchedule | null> {
    try {
      return await this.adapter.loadSchedule();
    } catch (error) {
      console.warn(`Primary storage (${this.adapter.name}) failed, trying fallback:`, error);
      if (this.fallbackAdapter) {
        const result = await this.fallbackAdapter.loadSchedule();
        this.switchToFallback();
        return result;
      }
      return null;
    }
  }

  /**
   * Subscribe to configuration changes
   */
  subscribeToConfig(callback: (config: AppConfig | null) => void): () => void {
    if (this.adapter.subscribeToConfig) {
      return this.adapter.subscribeToConfig(callback);
    }
    
    // Fallback to periodic loading if subscriptions not supported
    this.loadConfig().then(callback);
    const interval = setInterval(() => {
      this.loadConfig().then(callback);
    }, 5000);
    
    return () => clearInterval(interval);
  }

  /**
   * Subscribe to schedule changes
   */
  subscribeToSchedule(callback: (schedule: CustodySchedule | null) => void): () => void {
    if (this.adapter.subscribeToSchedule) {
      return this.adapter.subscribeToSchedule(callback);
    }
    
    // Fallback to periodic loading if subscriptions not supported
    this.loadSchedule().then(callback);
    const interval = setInterval(() => {
      this.loadSchedule().then(callback);
    }, 5000);
    
    return () => clearInterval(interval);
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    try {
      await this.adapter.clear();
      if (this.fallbackAdapter) {
        await this.fallbackAdapter.clear();
      }
    } catch (error) {
      console.error('Error clearing storage:', error);
      // Don't throw - clearing is not critical
    }
  }

  /**
   * Check if storage is properly initialized
   */
  async isInitialized(): Promise<boolean> {
    try {
      const [config, schedule] = await Promise.all([
        this.loadConfig(),
        this.loadSchedule(),
      ]);
      return config !== null && schedule !== null;
    } catch (error) {
      console.error('Error checking initialization:', error);
      return false;
    }
  }

  /**
   * Switch day assignment to the other person
   */
  async switchDayAssignment(date: string): Promise<void> {
    try {
      const schedule = await this.loadSchedule();
      if (!schedule) {
        throw new Error('No schedule data found');
      }

      const entry = schedule.entries[date];
      if (!entry) {
        throw new Error(`No schedule entry found for ${date}`);
      }

      // Switch to the other person
      const newAssignedTo: 'personA' | 'personB' = entry.assignedTo === 'personA' ? 'personB' : 'personA';
      
      const updatedEntry = {
        ...entry,
        assignedTo: newAssignedTo,
        isAdjusted: true,
        originalAssignedTo: entry.originalAssignedTo || entry.assignedTo,
      };

      const updatedSchedule = {
        ...schedule,
        entries: {
          ...schedule.entries,
          [date]: updatedEntry,
        },
        lastUpdated: new Date().toISOString(),
      };

      await this.saveSchedule(updatedSchedule);
    } catch (error) {
      console.warn(`Primary storage (${this.adapter.name}) failed, trying fallback:`, error);
      if (this.fallbackAdapter) {
        // Retry with fallback adapter
        await this.switchDayAssignment(date);
        this.switchToFallback();
      } else {
        throw error;
      }
    }
  }

  /**
   * Toggle informational unavailability for a person on a specific date
   */
  async toggleInformationalUnavailability(date: string, personId: 'personA' | 'personB'): Promise<void> {
    try {
      const schedule = await this.loadSchedule();
      if (!schedule) {
        throw new Error('No schedule data found');
      }

      // Get or create entry for this date
      let entry = schedule.entries[date];
      if (!entry) {
        // Create a default entry if none exists - use proper ScheduleEntry type
        entry = {
          date,
          assignedTo: 'personA',
        };
      }

      // Toggle informational unavailability
      const currentUnavailability = entry.informationalUnavailability || {};
      const isCurrentlyUnavailable = currentUnavailability[personId] || false;
      
      const updatedEntry = {
        ...entry,
        informationalUnavailability: {
          ...currentUnavailability,
          [personId]: !isCurrentlyUnavailable,
        },
      };

      const updatedSchedule = {
        ...schedule,
        entries: {
          ...schedule.entries,
          [date]: updatedEntry,
        },
        lastUpdated: new Date().toISOString(),
      };

      await this.saveSchedule(updatedSchedule);
    } catch (error) {
      console.warn(`Primary storage (${this.adapter.name}) failed, trying fallback:`, error);
      if (this.fallbackAdapter) {
        // Retry with fallback adapter
        await this.toggleInformationalUnavailability(date, personId);
        this.switchToFallback();
      } else {
        throw error;
      }
    }
  }

  /**
   * Save or update a note for a specific date
   */
  async saveNote(date: string, note: string): Promise<void> {
    try {
      const schedule = await this.loadSchedule();
      if (!schedule) {
        throw new Error('No schedule data found');
      }

      // Get or create entry for this date
      let entry = schedule.entries[date];
      if (!entry) {
        // Create a default entry if none exists
        entry = {
          date,
          assignedTo: 'personA',
        };
      }

      const updatedEntry = {
        ...entry,
        note: note.trim(),
      };

      const updatedSchedule = {
        ...schedule,
        entries: {
          ...schedule.entries,
          [date]: updatedEntry,
        },
        lastUpdated: new Date().toISOString(),
      };

      await this.saveSchedule(updatedSchedule);
    } catch (error) {
      console.warn(`Primary storage (${this.adapter.name}) failed, trying fallback:`, error);
      if (this.fallbackAdapter) {
        // Retry with fallback adapter
        await this.saveNote(date, note);
        this.switchToFallback();
      } else {
        throw error;
      }
    }
  }

  /**
   * Delete a note for a specific date
   */
  async deleteNote(date: string): Promise<void> {
    try {
      const schedule = await this.loadSchedule();
      if (!schedule) {
        throw new Error('No schedule data found');
      }

      const entry = schedule.entries[date];
      if (!entry) {
        return; // No entry to delete note from
      }

      const updatedEntry = {
        ...entry,
      };
      delete updatedEntry.note;

      const updatedSchedule = {
        ...schedule,
        entries: {
          ...schedule.entries,
          [date]: updatedEntry,
        },
        lastUpdated: new Date().toISOString(),
      };

      await this.saveSchedule(updatedSchedule);
    } catch (error) {
      console.warn(`Primary storage (${this.adapter.name}) failed, trying fallback:`, error);
      if (this.fallbackAdapter) {
        // Retry with fallback adapter
        await this.deleteNote(date);
        this.switchToFallback();
      } else {
        throw error;
      }
    }
  }

  /**
   * Select the best available storage adapters based on environment
   */
  private selectAdapters(preferredBackend?: StorageBackend): { 
    primary: StorageAdapter; 
    fallback?: StorageAdapter;
  } {
    const adapters = {
      localStorage: new LocalStorageAdapter(),
      vercelKV: new VercelKVAdapter(),
      vercelBlob: new VercelBlobAdapter(),
    };

    // If a specific backend is requested, try it first
    if (preferredBackend && preferredBackend !== 'firebase') {
      const preferred = adapters[preferredBackend];
      if (preferred?.isConfigured()) {
        return {
          primary: preferred,
          fallback: adapters.localStorage.isConfigured() ? adapters.localStorage : undefined,
        };
      }
    }

    // Auto-select based on environment and configuration
    if (adapters.vercelKV.isConfigured()) {
      return {
        primary: adapters.vercelKV,
        fallback: adapters.localStorage.isConfigured() ? adapters.localStorage : undefined,
      };
    }

    if (adapters.vercelBlob.isConfigured()) {
      return {
        primary: adapters.vercelBlob,
        fallback: adapters.localStorage.isConfigured() ? adapters.localStorage : undefined,
      };
    }

    // Default to localStorage for development
    return {
      primary: adapters.localStorage,
    };
  }

  /**
   * Bulk update multiple schedule entries
   */
  async bulkUpdateSchedule(entries: Record<string, any>): Promise<void> {
    try {
      const schedule = await this.loadSchedule();
      if (!schedule) {
        throw new Error('No schedule data found');
      }

      const updatedSchedule = {
        ...schedule,
        entries: {
          ...schedule.entries,
          ...entries,
        },
        lastUpdated: new Date().toISOString(),
      };

      await this.saveSchedule(updatedSchedule);
    } catch (error) {
      console.warn(`Primary storage (${this.adapter.name}) failed, trying fallback:`, error);
      if (this.fallbackAdapter) {
        await this.bulkUpdateSchedule(entries);
        this.switchToFallback();
      } else {
        throw error;
      }
    }
  }

  /**
   * Mark a date as processed for rebalancing to prevent duplicate proposals
   */
  async markDateProcessedForRebalance(date: string): Promise<void> {
    try {
      const schedule = await this.loadSchedule();
      if (!schedule) {
        throw new Error('No schedule data found');
      }

      const entry = schedule.entries[date];
      if (!entry) {
        return; // No entry to mark
      }

      const updatedEntry = {
        ...entry,
        processedForRebalance: true,
      };

      const updatedSchedule = {
        ...schedule,
        entries: {
          ...schedule.entries,
          [date]: updatedEntry,
        },
        lastUpdated: new Date().toISOString(),
      };

      await this.saveSchedule(updatedSchedule);
    } catch (error) {
      console.warn(`Primary storage (${this.adapter.name}) failed, trying fallback:`, error);
      if (this.fallbackAdapter) {
        await this.markDateProcessedForRebalance(date);
        this.switchToFallback();
      } else {
        throw error;
      }
    }
  }

  /**
   * Mark a date as unavailable (schedule-affecting)
   */
  async markDateUnavailable(date: string, personId: 'personA' | 'personB'): Promise<void> {
    try {
      const schedule = await this.loadSchedule();
      if (!schedule) {
        throw new Error('No schedule data found');
      }

      const entry = schedule.entries[date];
      if (!entry) {
        return; // No entry to mark
      }

      const updatedEntry = {
        ...entry,
        isUnavailable: true,
        unavailableBy: personId,
        processedForRebalance: false, // Reset this so auto-rebalancing can kick in
      };

      const updatedSchedule = {
        ...schedule,
        entries: {
          ...schedule.entries,
          [date]: updatedEntry,
        },
        lastUpdated: new Date().toISOString(),
      };

      await this.saveSchedule(updatedSchedule);
    } catch (error) {
      console.warn(`Primary storage (${this.adapter.name}) failed, trying fallback:`, error);
      if (this.fallbackAdapter) {
        await this.markDateUnavailable(date, personId);
        this.switchToFallback();
      } else {
        throw error;
      }
    }
  }

  /**
   * Switch to fallback adapter when primary fails
   */
  private switchToFallback(): void {
    if (this.fallbackAdapter) {
      console.log(`Switching from ${this.adapter.name} to ${this.fallbackAdapter.name}`);
      this.adapter = this.fallbackAdapter;
      this.fallbackAdapter = undefined;
    }
  }

  /**
   * Load change history
   */
  async loadChangeHistory(): Promise<ChangeHistory> {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.changeHistoryKey);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (error) {
      console.error('Error loading change history:', error);
    }

    // Return default empty history
    return {
      entries: [],
      maxEntries: 10
    };
  }

  /**
   * Get the most recent change that can be undone
   */
  async getLatestUndoableChange(): Promise<ChangeHistoryEntry | null> {
    const history = await this.loadChangeHistory();
    return history.entries.length > 0 ? history.entries[0] : null;
  }

  /**
   * Undo the most recent change
   */
  async undoLastChange(): Promise<{ success: boolean; error?: string }> {
    try {
      const history = await this.loadChangeHistory();
      if (history.entries.length === 0) {
        return { success: false, error: 'No changes to undo' };
      }

      const latestChange = history.entries[0];
      const schedule = await this.loadSchedule();
      if (!schedule) {
        return { success: false, error: 'No schedule data found' };
      }

      // Restore the previous state
      const updatedSchedule = {
        ...schedule,
        entries: {
          ...schedule.entries,
          ...latestChange.previousEntries
        },
        lastUpdated: new Date().toISOString(),
      };

      // Save the restored schedule
      await this.saveSchedule(updatedSchedule);

      // Remove the undone change from history
      history.entries.shift();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.changeHistoryKey, JSON.stringify(history));
      }

      return { success: true };
    } catch (error) {
      console.error('Error undoing change:', error);
      return { success: false, error: 'Failed to undo change' };
    }
  }

  /**
   * Enhanced bulk update that tracks changes
   */
  async bulkUpdateScheduleWithHistory(
    entries: Record<string, any>,
    type: ChangeHistoryEntry['type'],
    description: string,
    changedBy: 'personA' | 'personB'
  ): Promise<void> {
    const schedule = await this.loadSchedule();
    if (!schedule) {
      throw new Error('No schedule data found');
    }

    // Save current state to history
    const affectedDates = Object.keys(entries);
    const previousEntries: Record<string, any> = {};
    affectedDates.forEach(date => {
      if (schedule.entries[date]) {
        previousEntries[date] = schedule.entries[date];
      }
    });

    await this.saveChangeToHistory(type, description, changedBy, affectedDates, previousEntries);

    // Apply the changes
    await this.bulkUpdateSchedule(entries);
  }

  /**
   * Save change to history before making modifications
   */
  private async saveChangeToHistory(
    type: ChangeHistoryEntry['type'],
    description: string,
    changedBy: 'personA' | 'personB',
    affectedDates: string[],
    previousEntries: Record<string, any>
  ): Promise<void> {
    try {
      const history = await this.loadChangeHistory();
      
      const newEntry: ChangeHistoryEntry = {
        id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type,
        description,
        changedBy,
        affectedDates,
        previousEntries
      };

      // Add new entry to the beginning and limit to max entries
      history.entries.unshift(newEntry);
      if (history.entries.length > history.maxEntries) {
        history.entries = history.entries.slice(0, history.maxEntries);
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.changeHistoryKey, JSON.stringify(history));
      }
    } catch (error) {
      console.error('Error saving change to history:', error);
      // Don't throw - history is not critical
    }
  }

  /**
   * Enhanced switch day with history tracking
   */
  async switchDayAssignmentWithHistory(date: string, changedBy: 'personA' | 'personB'): Promise<void> {
    const schedule = await this.loadSchedule();
    if (!schedule) {
      throw new Error('No schedule data found');
    }

    const entry = schedule.entries[date];
    if (!entry) {
      throw new Error(`No schedule entry found for ${date}`);
    }

    // Save current state to history
    await this.saveChangeToHistory(
      'manual_switch',
      `Switched ${date} assignment`,
      changedBy,
      [date],
      { [date]: entry }
    );

    // Apply the change
    await this.switchDayAssignment(date);
  }

  /**
   * Enhanced mark unavailable with history tracking
   */
  async markDateUnavailableWithHistory(date: string, personId: 'personA' | 'personB'): Promise<void> {
    const schedule = await this.loadSchedule();
    if (!schedule) {
      throw new Error('No schedule data found');
    }

    const entry = schedule.entries[date];
    if (!entry) {
      return;
    }

    // Save current state to history
    await this.saveChangeToHistory(
      'mark_unavailable',
      `Marked ${date} as unavailable`,
      personId,
      [date],
      { [date]: entry }
    );

    // Apply the change
    await this.markDateUnavailable(date, personId);
  }
} 