import type { CustodySchedule, AppConfig } from '@/types';

/**
 * Storage adapter interface for different storage backends
 */
export interface StorageAdapter {
  name: string;
  
  // Configuration methods
  isConfigured(): boolean;
  
  // Data operations
  saveConfig(config: AppConfig): Promise<void>;
  loadConfig(): Promise<AppConfig | null>;
  
  saveSchedule(schedule: CustodySchedule): Promise<void>;
  loadSchedule(): Promise<CustodySchedule | null>;
  
  // Real-time subscriptions (optional - only some adapters support this)
  subscribeToConfig?(callback: (config: AppConfig | null) => void): () => void;
  subscribeToSchedule?(callback: (schedule: CustodySchedule | null) => void): () => void;
  
  // Cleanup
  clear(): Promise<void>;
}

export type StorageBackend = 'localStorage' | 'vercelBlob' | 'vercelKV' | 'firebase';

export interface StorageConfig {
  backend: StorageBackend;
  fallback?: StorageBackend;
} 