import type { StorageAdapter, StorageBackend } from './types';
import type { CustodySchedule, AppConfig } from '@/types';

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
   * Switch to fallback adapter when primary fails
   */
  private switchToFallback(): void {
    if (this.fallbackAdapter) {
      console.log(`Switching from ${this.adapter.name} to ${this.fallbackAdapter.name}`);
      this.adapter = this.fallbackAdapter;
      this.fallbackAdapter = undefined;
    }
  }
} 