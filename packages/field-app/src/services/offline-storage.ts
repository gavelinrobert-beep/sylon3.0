/**
 * SYLON Field App - Offline Storage with IndexedDB
 * Handles offline data persistence and sync queue
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Job, GeoPosition, Resource } from '@sylon/shared';

interface SylonDB extends DBSchema {
  jobs: {
    key: string;
    value: Job;
    indexes: { 'by-status': string };
  };
  resources: {
    key: string;
    value: Resource;
  };
  gpsQueue: {
    key: string;
    value: QueuedGpsReading;
    indexes: { 'by-synced': number };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: { 'by-type': string; 'by-created': Date };
  };
  settings: {
    key: string;
    value: unknown;
  };
}

interface QueuedGpsReading {
  id: string;
  resourceId: string;
  position: GeoPosition;
  synced: 0 | 1;
  createdAt: Date;
}

interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data: unknown;
  createdAt: Date;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

let db: IDBPDatabase<SylonDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<SylonDB>> {
  if (db) return db;

  db = await openDB<SylonDB>('sylon-field', 1, {
    upgrade(database) {
      // Jobs store
      const jobsStore = database.createObjectStore('jobs', { keyPath: 'id' });
      jobsStore.createIndex('by-status', 'status');

      // Resources store
      database.createObjectStore('resources', { keyPath: 'id' });

      // GPS queue store
      const gpsStore = database.createObjectStore('gpsQueue', { keyPath: 'id' });
      gpsStore.createIndex('by-synced', 'synced');

      // Sync queue store
      const syncStore = database.createObjectStore('syncQueue', { keyPath: 'id' });
      syncStore.createIndex('by-type', 'entityType');
      syncStore.createIndex('by-created', 'createdAt');

      // Settings store
      database.createObjectStore('settings');
    },
  });

  return db;
}

// ============================================
// JOBS
// ============================================

export async function getJobs(): Promise<Job[]> {
  const database = await initDB();
  return database.getAll('jobs');
}

export async function getJob(id: string): Promise<Job | undefined> {
  const database = await initDB();
  return database.get('jobs', id);
}

export async function saveJob(job: Job): Promise<void> {
  const database = await initDB();
  await database.put('jobs', job);
}

export async function saveJobs(jobs: Job[]): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('jobs', 'readwrite');
  await Promise.all([
    ...jobs.map(job => tx.store.put(job)),
    tx.done,
  ]);
}

// ============================================
// GPS QUEUE
// ============================================

export async function queueGpsReading(
  resourceId: string,
  position: GeoPosition
): Promise<void> {
  const database = await initDB();
  const reading: QueuedGpsReading = {
    id: `gps-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    resourceId,
    position,
    synced: 0,
    createdAt: new Date(),
  };
  await database.add('gpsQueue', reading);
}

export async function getUnsynedGpsReadings(): Promise<QueuedGpsReading[]> {
  const database = await initDB();
  return database.getAllFromIndex('gpsQueue', 'by-synced', 0);
}

export async function markGpsReadingsAsSynced(ids: string[]): Promise<void> {
  const database = await initDB();
  const tx = database.transaction('gpsQueue', 'readwrite');
  
  for (const id of ids) {
    const reading = await tx.store.get(id);
    if (reading) {
      reading.synced = 1;
      await tx.store.put(reading);
    }
  }
  
  await tx.done;
}

export async function clearSyncedGpsReadings(): Promise<void> {
  const database = await initDB();
  const synced = await database.getAllFromIndex('gpsQueue', 'by-synced', 1);
  const tx = database.transaction('gpsQueue', 'readwrite');
  
  for (const reading of synced) {
    await tx.store.delete(reading.id);
  }
  
  await tx.done;
}

// ============================================
// SYNC QUEUE
// ============================================

export async function queueSync(
  action: SyncQueueItem['action'],
  entityType: string,
  entityId: string,
  data: unknown
): Promise<void> {
  const database = await initDB();
  const item: SyncQueueItem = {
    id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    action,
    entityType,
    entityId,
    data,
    createdAt: new Date(),
    attempts: 0,
  };
  await database.add('syncQueue', item);
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const database = await initDB();
  return database.getAll('syncQueue');
}

export async function removeSyncItem(id: string): Promise<void> {
  const database = await initDB();
  await database.delete('syncQueue', id);
}

export async function updateSyncItemError(id: string, error: string): Promise<void> {
  const database = await initDB();
  const item = await database.get('syncQueue', id);
  if (item) {
    item.attempts += 1;
    item.lastAttempt = new Date();
    item.error = error;
    await database.put('syncQueue', item);
  }
}

// ============================================
// SETTINGS
// ============================================

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const database = await initDB();
  return database.get('settings', key) as Promise<T | undefined>;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const database = await initDB();
  await database.put('settings', value, key);
}

// ============================================
// SYNC STATUS
// ============================================

export async function getSyncStatus(): Promise<{
  pendingGps: number;
  pendingSync: number;
  lastSync?: Date;
}> {
  const database = await initDB();
  const [unsynedGps, pendingSync, lastSync] = await Promise.all([
    database.countFromIndex('gpsQueue', 'by-synced', 0),
    database.count('syncQueue'),
    getSetting<Date>('lastSyncAt'),
  ]);
  
  return {
    pendingGps: unsynedGps,
    pendingSync,
    lastSync,
  };
}

export async function setLastSyncTime(): Promise<void> {
  await setSetting('lastSyncAt', new Date());
}
