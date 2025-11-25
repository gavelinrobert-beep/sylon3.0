/**
 * SYLON Field App - Sync Service
 * Handles data synchronization between local and server
 */

import type { Job, GeoPosition } from '@sylon/shared';
import * as offlineStorage from './offline-storage';

const API_BASE = 'http://localhost:3001/api';

interface SyncResult {
  success: boolean;
  syncedGps: number;
  syncedItems: number;
  errors: string[];
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Sync all pending data
export async function syncAll(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    syncedGps: 0,
    syncedItems: 0,
    errors: [],
  };

  if (!isOnline()) {
    result.success = false;
    result.errors.push('Offline - sync skipped');
    return result;
  }

  try {
    // Sync GPS readings
    const gpsResult = await syncGpsReadings();
    result.syncedGps = gpsResult.synced;
    if (gpsResult.errors.length > 0) {
      result.errors.push(...gpsResult.errors);
    }

    // Sync queue items
    const queueResult = await syncQueueItems();
    result.syncedItems = queueResult.synced;
    if (queueResult.errors.length > 0) {
      result.errors.push(...queueResult.errors);
    }

    // Update last sync time
    await offlineStorage.setLastSyncTime();

    result.success = result.errors.length === 0;
  } catch (error) {
    result.success = false;
    result.errors.push((error as Error).message);
  }

  return result;
}

// Sync GPS readings in batches
async function syncGpsReadings(): Promise<{ synced: number; errors: string[] }> {
  const unsynced = await offlineStorage.getUnsynedGpsReadings();
  
  if (unsynced.length === 0) {
    return { synced: 0, errors: [] };
  }

  const BATCH_SIZE = 100;
  let synced = 0;
  const errors: string[] = [];

  for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
    const batch = unsynced.slice(i, i + BATCH_SIZE);
    
    try {
      const response = await fetch(`${API_BASE}/gps/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readings: batch.map(r => ({
            resourceId: r.resourceId,
            position: r.position,
            recordedAt: r.createdAt,
          })),
        }),
      });

      if (response.ok) {
        await offlineStorage.markGpsReadingsAsSynced(batch.map(r => r.id));
        synced += batch.length;
      } else {
        errors.push(`GPS batch sync failed: ${response.statusText}`);
      }
    } catch (error) {
      errors.push(`GPS sync error: ${(error as Error).message}`);
    }
  }

  // Clean up synced readings
  await offlineStorage.clearSyncedGpsReadings();

  return { synced, errors };
}

// Sync queue items
async function syncQueueItems(): Promise<{ synced: number; errors: string[] }> {
  const items = await offlineStorage.getPendingSyncItems();
  
  if (items.length === 0) {
    return { synced: 0, errors: [] };
  }

  let synced = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      let endpoint = '';
      let method = 'POST';

      switch (item.entityType) {
        case 'job':
          endpoint = `/jobs/${item.entityId}`;
          method = item.action === 'update' ? 'PATCH' : 'POST';
          break;
        case 'time_entry':
          endpoint = `/jobs/${(item.data as { jobId: string }).jobId}/time-entries`;
          break;
        case 'photo':
          endpoint = `/jobs/${(item.data as { jobId: string }).jobId}/photos`;
          break;
        case 'deviation':
          endpoint = `/jobs/${(item.data as { jobId: string }).jobId}/deviations`;
          break;
        default:
          throw new Error(`Unknown entity type: ${item.entityType}`);
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });

      if (response.ok) {
        await offlineStorage.removeSyncItem(item.id);
        synced++;
      } else {
        const errorText = await response.text();
        await offlineStorage.updateSyncItemError(item.id, errorText);
        errors.push(`Sync failed for ${item.entityType}: ${response.statusText}`);
      }
    } catch (error) {
      await offlineStorage.updateSyncItemError(item.id, (error as Error).message);
      errors.push(`Sync error: ${(error as Error).message}`);
    }
  }

  return { synced, errors };
}

// Fetch and cache jobs
export async function fetchAndCacheJobs(): Promise<Job[]> {
  try {
    const response = await fetch(`${API_BASE}/jobs`);
    const json = await response.json();
    
    if (json.success && json.data) {
      const jobs = json.data as Job[];
      await offlineStorage.saveJobs(jobs);
      return jobs;
    }
    throw new Error('Failed to fetch jobs');
  } catch (error) {
    // Return cached jobs on error
    console.warn('Failed to fetch jobs, using cache:', error);
    return offlineStorage.getJobs();
  }
}

// Queue GPS reading with batching
let gpsBuffer: Array<{ resourceId: string; position: GeoPosition }> = [];
let gpsFlushTimeout: ReturnType<typeof setTimeout> | null = null;

export function queueGpsReading(resourceId: string, position: GeoPosition): void {
  gpsBuffer.push({ resourceId, position });

  // Flush buffer periodically or when it gets large
  if (gpsBuffer.length >= 10) {
    flushGpsBuffer();
  } else if (!gpsFlushTimeout) {
    gpsFlushTimeout = setTimeout(flushGpsBuffer, 30000); // 30 seconds
  }
}

async function flushGpsBuffer(): Promise<void> {
  if (gpsFlushTimeout) {
    clearTimeout(gpsFlushTimeout);
    gpsFlushTimeout = null;
  }

  const toFlush = [...gpsBuffer];
  gpsBuffer = [];

  for (const { resourceId, position } of toFlush) {
    await offlineStorage.queueGpsReading(resourceId, position);
  }

  // Try to sync if online
  if (isOnline()) {
    syncAll().catch(console.error);
  }
}

// Auto-sync on reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online, starting sync...');
    syncAll().catch(console.error);
  });
}
