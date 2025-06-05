import { put, del, head } from '@vercel/blob';
import type { StorageAdapter } from './types';
import type { CustodySchedule, AppConfig } from '@/types';

/**
 * Vercel Blob storage adapter for production deployment
 * Note: Blob storage is optimized for files, not frequent updates.
 * Consider Vercel KV for better performance with frequent data changes.
 */
export class VercelBlobAdapter implements StorageAdapter {
  name = 'vercelBlob';
  private readonly configPath = 'config.json';
  private readonly schedulePath = 'schedule.json';
  private readonly token: string;

  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN || '';
  }

  isConfigured(): boolean {
    return !!this.token;
  }

  async saveConfig(config: AppConfig): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Vercel Blob not configured. Missing BLOB_READ_WRITE_TOKEN');
    }

    const data = {
      ...config,
      createdAt: new Date().toISOString(),
    };

    try {
      await put(this.configPath, JSON.stringify(data, null, 2), {
        access: 'public',
        token: this.token,
      });
    } catch (error) {
      console.error('Error saving config to Vercel Blob:', error);
      throw new Error('Failed to save configuration');
    }
  }

  async loadConfig(): Promise<AppConfig | null> {
    if (!this.isConfigured()) return null;

    try {
      // Check if the blob exists
      const response = await fetch(
        `https://${process.env.VERCEL_URL || 'localhost'}/api/blob/${this.configPath}`
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        personA: data.personA,
        personB: data.personB,
        maxConsecutiveDays: data.maxConsecutiveDays,
        defaultRotationDays: data.defaultRotationDays,
      };
    } catch (error) {
      console.error('Error loading config from Vercel Blob:', error);
      return null;
    }
  }

  async saveSchedule(schedule: CustodySchedule): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Vercel Blob not configured. Missing BLOB_READ_WRITE_TOKEN');
    }

    const data = {
      ...schedule,
      lastUpdated: new Date().toISOString(),
    };

    try {
      await put(this.schedulePath, JSON.stringify(data, null, 2), {
        access: 'public',
        token: this.token,
      });
    } catch (error) {
      console.error('Error saving schedule to Vercel Blob:', error);
      throw new Error('Failed to save schedule');
    }
  }

  async loadSchedule(): Promise<CustodySchedule | null> {
    if (!this.isConfigured()) return null;

    try {
      const response = await fetch(
        `https://${process.env.VERCEL_URL || 'localhost'}/api/blob/${this.schedulePath}`
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        entries: data.entries || {},
        startDate: data.startDate,
        initialPerson: data.initialPerson,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error loading schedule from Vercel Blob:', error);
      return null;
    }
  }

  // Note: Vercel Blob doesn't support real-time subscriptions
  // You would need to implement polling or use a different service for real-time updates
  subscribeToConfig(callback: (config: AppConfig | null) => void): () => void {
    // Initial load
    this.loadConfig().then(callback);

    // Polling for changes (not ideal, but Blob doesn't support real-time)
    const pollInterval = setInterval(async () => {
      try {
        const config = await this.loadConfig();
        callback(config);
      } catch (error) {
        console.error('Error polling config:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }

  subscribeToSchedule(callback: (schedule: CustodySchedule | null) => void): () => void {
    // Initial load
    this.loadSchedule().then(callback);

    // Polling for changes (not ideal, but Blob doesn't support real-time)
    const pollInterval = setInterval(async () => {
      try {
        const schedule = await this.loadSchedule();
        callback(schedule);
      } catch (error) {
        console.error('Error polling schedule:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }

  async clear(): Promise<void> {
    if (!this.isConfigured()) return;

    try {
      await Promise.all([
        del(this.configPath, { token: this.token }),
        del(this.schedulePath, { token: this.token }),
      ]);
    } catch (error) {
      console.error('Error clearing Vercel Blob data:', error);
      // Don't throw - clearing is not critical
    }
  }
} 