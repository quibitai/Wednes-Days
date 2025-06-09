import { NextResponse } from 'next/server';
import { StorageManager } from '@/lib/storage/storageManager';

export async function GET() {
  try {
    const storageManager = new StorageManager();
    const storageInfo = storageManager.getStorageInfo();
    
    // Check environment variables (without exposing values)
    const envCheck = {
      BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
      KV_URL: !!process.env.KV_URL,
      KV_REST_API_URL: !!process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
      VERCEL_URL: !!process.env.VERCEL_URL,
    };

    try {
      const [config, schedule] = await Promise.all([
        storageManager.loadConfig(),
        storageManager.loadSchedule()
      ]);

      return NextResponse.json({
        storageInfo,
        envCheck,
        dataStatus: {
          hasConfig: !!config,
          hasSchedule: !!schedule,
          scheduleEntryCount: schedule?.entries ? Object.keys(schedule.entries).length : 0
        }
      });
    } catch (error) {
      return NextResponse.json({
        storageInfo,
        envCheck,
        dataStatus: {
          error: error instanceof Error ? error.message : 'Unknown error loading data'
        }
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 