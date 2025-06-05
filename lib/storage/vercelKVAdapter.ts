import { kv } from '@vercel/kv';
import type { StorageAdapter } from './types';
import type { CustodySchedule, AppConfig } from '@/types';

/**
 * Vercel KV storage adapter for production deployment
 * KV is better suited for application data with frequent updates
 * than Blob storage, which is optimized for files.
 */
export class VercelKVAdapter implements StorageAdapter {
  name = 'vercelKV';
  private readonly configKey = 'dog-custody:config';
  private readonly scheduleKey = 'dog-custody:schedule';
  private readonly lastUpdatedKey = 'dog-custody:last-updated';

  isConfigured(): boolean {
    return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  }

  async saveConfig(config: AppConfig): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Vercel KV not configured. Missing KV_REST_API_URL or KV_REST_API_TOKEN');
    }

    const data = {
      ...config,
      createdAt: new Date().toISOString(),
    };

    try {
      await kv.set(this.configKey, data);
      await kv.set(`${this.configKey}:updated`, Date.now());
    } catch (error) {
      console.error('Error saving config to Vercel KV:', error);
      throw new Error('Failed to save configuration');
    }
  }

  async loadConfig(): Promise<AppConfig | null> {
    if (!this.isConfigured()) return null;

    try {
      const data = await kv.get(this.configKey);
      if (!data || typeof data !== 'object') return null;

      const config = data as any;
      return {
        personA: config.personA,
        personB: config.personB,
        maxConsecutiveDays: config.maxConsecutiveDays,
        defaultRotationDays: config.defaultRotationDays,
      };
    } catch (error) {
      console.error('Error loading config from Vercel KV:', error);
      return null;
    }
  }

  async saveSchedule(schedule: CustodySchedule): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Vercel KV not configured. Missing KV_REST_API_URL or KV_REST_API_TOKEN');
    }

    const data = {
      ...schedule,
      lastUpdated: new Date().toISOString(),
    };

    try {
      await kv.set(this.scheduleKey, data);
      await kv.set(this.lastUpdatedKey, Date.now());
    } catch (error) {
      console.error('Error saving schedule to Vercel KV:', error);
      throw new Error('Failed to save schedule');
    }
  }

  async loadSchedule(): Promise<CustodySchedule | null> {
    if (!this.isConfigured()) return null;

    try {
      const data = await kv.get(this.scheduleKey);
      if (!data || typeof data !== 'object') return null;

      const schedule = data as any;
      return {
        entries: schedule.entries || {},
        startDate: schedule.startDate,
        initialPerson: schedule.initialPerson,
        lastUpdated: schedule.lastUpdated || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error loading schedule from Vercel KV:', error);
      return null;
    }
  }

  // KV doesn't have built-in subscriptions, but we can implement smart polling
  subscribeToConfig(callback: (config: AppConfig | null) => void): () => void {
    let lastUpdated = 0;
    let isActive = true;

    // Initial load
    this.loadConfig().then(callback);

    // Smart polling - only fetch if data changed
    const poll = async () => {
      if (!isActive) return;

      try {
        const currentUpdated = await kv.get(`${this.configKey}:updated`) as number || 0;
        
        if (currentUpdated > lastUpdated) {
          lastUpdated = currentUpdated;
          const config = await this.loadConfig();
          callback(config);
        }
      } catch (error) {
        console.error('Error polling config:', error);
      }

      if (isActive) {
        setTimeout(poll, 2000); // Poll every 2 seconds
      }
    };

    // Start polling
    setTimeout(poll, 2000);

    return () => {
      isActive = false;
    };
  }

  subscribeToSchedule(callback: (schedule: CustodySchedule | null) => void): () => void {
    let lastUpdated = 0;
    let isActive = true;

    // Initial load
    this.loadSchedule().then(callback);

    // Smart polling - only fetch if data changed
    const poll = async () => {
      if (!isActive) return;

      try {
        const currentUpdated = await kv.get(this.lastUpdatedKey) as number || 0;
        
        if (currentUpdated > lastUpdated) {
          lastUpdated = currentUpdated;
          const schedule = await this.loadSchedule();
          callback(schedule);
        }
      } catch (error) {
        console.error('Error polling schedule:', error);
      }

      if (isActive) {
        setTimeout(poll, 2000); // Poll every 2 seconds
      }
    };

    // Start polling
    setTimeout(poll, 2000);

    return () => {
      isActive = false;
    };
  }

  async clear(): Promise<void> {
    if (!this.isConfigured()) return;

    try {
      await Promise.all([
        kv.del(this.configKey),
        kv.del(this.scheduleKey),
        kv.del(`${this.configKey}:updated`),
        kv.del(this.lastUpdatedKey),
      ]);
    } catch (error) {
      console.error('Error clearing Vercel KV data:', error);
      // Don't throw - clearing is not critical
    }
  }
} 