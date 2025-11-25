/**
 * SYLON Field App Types
 * Mobile app for drivers, operators and field personnel
 */

import type {
  BaseEntity,
  Coordinates,
  GeoPosition,
  ResourceStatus,
} from './core.js';
import type { Job, TimeEntry, Deviation, JobPhoto } from './works.js';

// ============================================
// SYNC & OFFLINE
// ============================================

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

export interface SyncState {
  lastSyncAt?: Date;
  pendingUploads: number;
  pendingDownloads: number;
  status: SyncStatus;
  errorMessage?: string;
}

export interface OfflineQueue {
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

// ============================================
// GPS BATCHING
// ============================================

export interface GpsQueueItem {
  id: string;
  position: GeoPosition;
  batteryLevel?: number;
  networkType?: string;
  accuracy?: number;
  queued: boolean;
}

export interface GpsBatchConfig {
  batchSize: number;
  maxAge: number; // seconds
  minDistance: number; // meters
  uploadInterval: number; // seconds
  offlineMaxSize: number;
}

// ============================================
// FIELD APP STATE
// ============================================

export interface FieldAppState {
  // User session
  isAuthenticated: boolean;
  userId?: string;
  operatorId?: string;
  
  // Resource assignment
  assignedResourceId?: string;
  resourceStatus?: ResourceStatus;
  
  // Current job
  activeJobId?: string;
  activeJob?: Job;
  
  // Location
  currentPosition?: GeoPosition;
  trackingEnabled: boolean;
  
  // Sync
  sync: SyncState;
  offlineMode: boolean;
  
  // GPS queue
  gpsQueue: GpsQueueItem[];
}

// ============================================
// FIELD ACTIONS
// ============================================

export type FieldAction =
  | { type: 'START_SHIFT' }
  | { type: 'END_SHIFT' }
  | { type: 'START_JOB'; jobId: string }
  | { type: 'PAUSE_JOB' }
  | { type: 'RESUME_JOB' }
  | { type: 'COMPLETE_JOB' }
  | { type: 'START_BREAK' }
  | { type: 'END_BREAK' }
  | { type: 'REPORT_DEVIATION'; deviation: Partial<Deviation> }
  | { type: 'ADD_PHOTO'; photo: Partial<JobPhoto> }
  | { type: 'ADD_NOTE'; content: string }
  | { type: 'UPDATE_STATUS'; status: ResourceStatus }
  | { type: 'SYNC_DATA' };

// ============================================
// FIELD APP SCREENS
// ============================================

export interface HomeScreenData {
  operatorName: string;
  resourceName?: string;
  resourceStatus?: ResourceStatus;
  activeJob?: JobSummary;
  upcomingJobs: JobSummary[];
  notifications: AppNotification[];
}

export interface JobSummary {
  id: string;
  jobNumber: string;
  title: string;
  type: string;
  status: string;
  location: string;
  scheduledStart: Date;
  distance?: number;
}

export interface AppNotification {
  id: string;
  type: 'job_assigned' | 'job_updated' | 'message' | 'alert' | 'sync';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

// ============================================
// QUICK ACTIONS
// ============================================

export interface QuickAction {
  id: string;
  icon: string;
  label: string;
  action: FieldAction['type'];
  color: string;
  requiresConfirmation?: boolean;
  disabled?: boolean;
}

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: 'start_job', icon: 'play', label: 'Starta', action: 'START_JOB', color: 'green' },
  { id: 'pause_job', icon: 'pause', label: 'Paus', action: 'PAUSE_JOB', color: 'yellow' },
  { id: 'complete_job', icon: 'check', label: 'Klar', action: 'COMPLETE_JOB', color: 'blue', requiresConfirmation: true },
  { id: 'report_issue', icon: 'alert', label: 'Avvikelse', action: 'REPORT_DEVIATION', color: 'red' },
  { id: 'add_photo', icon: 'camera', label: 'Foto', action: 'ADD_PHOTO', color: 'gray' },
];

// ============================================
// FIELD SETTINGS
// ============================================

export interface FieldAppSettings {
  gpsTracking: boolean;
  gpsInterval: number;
  offlineMode: boolean;
  autoSync: boolean;
  syncInterval: number;
  notifications: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  mapStyle: 'standard' | 'satellite' | 'terrain';
}

export const DEFAULT_FIELD_SETTINGS: FieldAppSettings = {
  gpsTracking: true,
  gpsInterval: 10,
  offlineMode: false,
  autoSync: true,
  syncInterval: 30,
  notifications: true,
  soundEnabled: true,
  hapticEnabled: true,
  theme: 'auto',
  language: 'sv',
  mapStyle: 'standard',
};
