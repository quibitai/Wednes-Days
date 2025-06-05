import type { StorageAdapter } from './types';
import type { CustodySchedule, AppConfig } from '@/types';

/**
 * localStorage adapter for development and offline use
 */
export class LocalStorageAdapter implements StorageAdapter {
  name = 'localStorage';
  private readonly prefix = 'dog-custody-';

  isConfigured(): boolean {
    return typeof window !== 'undefined' && 'localStorage' in window;
  }

  async saveConfig(config: AppConfig): Promise<void> {
    if (!this.isConfigured()) throw new Error('localStorage not available');
    
    const data = {
      ...config,
      createdAt: new Date().toISOString(),
    };
    
    localStorage.setItem(`${this.prefix}config`, JSON.stringify(data));
    
    // Trigger storage event for cross-tab sync
    this.triggerStorageEvent('config');
  }

  async loadConfig(): Promise<AppConfig | null> {
    if (!this.isConfigured()) return null;
    
    const stored = localStorage.getItem(`${this.prefix}config`);
    if (!stored) return null;
    
    try {
      const data = JSON.parse(stored);
      return {
        personA: data.personA,
        personB: data.personB,
        maxConsecutiveDays: data.maxConsecutiveDays,
        defaultRotationDays: data.defaultRotationDays,
      };
    } catch (error) {
      console.error('Error parsing config from localStorage:', error);
      return null;
    }
  }

  async saveSchedule(schedule: CustodySchedule): Promise<void> {
    if (!this.isConfigured()) throw new Error('localStorage not available');
    
    const data = {
      ...schedule,
      lastUpdated: new Date().toISOString(),
    };
    
    localStorage.setItem(`${this.prefix}schedule`, JSON.stringify(data));
    
    // Trigger storage event for cross-tab sync
    this.triggerStorageEvent('schedule');
  }

  async loadSchedule(): Promise<CustodySchedule | null> {
    if (!this.isConfigured()) return null;
    
    const stored = localStorage.getItem(`${this.prefix}schedule`);
    if (!stored) return null;
    
    try {
      const data = JSON.parse(stored);
      return {
        entries: data.entries || {},
        startDate: data.startDate,
        initialPerson: data.initialPerson,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error parsing schedule from localStorage:', error);
      return null;
    }
  }

  subscribeToConfig(callback: (config: AppConfig | null) => void): () => void {
    // Initial load
    this.loadConfig().then(callback);
    
    // Listen for changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `${this.prefix}config`) {
        this.loadConfig().then(callback);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }

  subscribeToSchedule(callback: (schedule: CustodySchedule | null) => void): () => void {
    // Initial load
    this.loadSchedule().then(callback);
    
    // Listen for changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `${this.prefix}schedule`) {
        this.loadSchedule().then(callback);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }

  async clear(): Promise<void> {
    if (!this.isConfigured()) return;
    
    localStorage.removeItem(`${this.prefix}config`);
    localStorage.removeItem(`${this.prefix}schedule`);
    
    // Trigger storage events
    this.triggerStorageEvent('config');
    this.triggerStorageEvent('schedule');
  }

  private triggerStorageEvent(type: 'config' | 'schedule'): void {
    const key = `${this.prefix}${type}`;
    const newValue = localStorage.getItem(key);
    
    window.dispatchEvent(new StorageEvent('storage', {
      key,
      newValue,
    }));
  }
} 