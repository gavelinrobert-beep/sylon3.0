/**
 * SYLON API Types
 * Request/Response types for API communication
 */

import type { Resource, GeoPosition, User } from './core.js';
import type { Job, WorksDashboard } from './works.js';
import type { Shipment, TrackingInfo } from './logistics.js';
import type { Site, SiteDashboard } from './sites.js';
import type { Garage, GarageDashboard } from './garage.js';

// ============================================
// GENERIC API TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  perPage?: number;
  total?: number;
  totalPages?: number;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string[];
  type?: string[];
  dateFrom?: string;
  dateTo?: string;
}

// ============================================
// AUTH
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ============================================
// RESOURCES
// ============================================

export interface ResourceListParams extends PaginationParams, FilterParams {
  companyId?: string;
}

export interface ResourcePositionUpdate {
  resourceId: string;
  position: GeoPosition;
  engineOn: boolean;
  fuelLevel?: number;
}

export interface BulkPositionUpdate {
  positions: ResourcePositionUpdate[];
  timestamp: Date;
}

// ============================================
// JOBS
// ============================================

export interface JobListParams extends PaginationParams, FilterParams {
  assignedResourceId?: string;
  customerId?: string;
}

export interface CreateJobRequest {
  type: string;
  title: string;
  description: string;
  priority: string;
  location: {
    name: string;
    coordinates: { latitude: number; longitude: number };
  };
  scheduledTime: {
    start: string;
    end: string;
  };
  assignedResources?: string[];
  customerId?: string;
  materials?: {
    materialId: string;
    quantity: number;
  }[];
}

export interface UpdateJobStatusRequest {
  status: string;
  notes?: string;
  timestamp?: string;
}

// ============================================
// SITES
// ============================================

export interface SiteListParams extends PaginationParams, FilterParams {
  companyId?: string;
  nearCoordinates?: { latitude: number; longitude: number };
  withinRadius?: number;
}

// ============================================
// REAL-TIME EVENTS
// ============================================

export type WebSocketEvent =
  | { type: 'RESOURCE_POSITION_UPDATE'; data: ResourcePositionUpdate }
  | { type: 'RESOURCE_STATUS_CHANGE'; data: { resourceId: string; status: string } }
  | { type: 'JOB_STATUS_CHANGE'; data: { jobId: string; status: string } }
  | { type: 'NEW_JOB_ASSIGNED'; data: { jobId: string; resourceId: string } }
  | { type: 'DEVIATION_REPORTED'; data: { jobId: string; deviationId: string } }
  | { type: 'SHIPMENT_UPDATE'; data: { shipmentId: string; status: string } }
  | { type: 'SITE_VISIT'; data: { siteId: string; resourceId: string; action: string } }
  | { type: 'ALERT'; data: { type: string; message: string; severity: string } };

// ============================================
// DASHBOARD
// ============================================

export interface GlobalDashboard {
  works: WorksDashboard;
  sites: SiteDashboard;
  garage: GarageDashboard;
  resourcesTotal: number;
  resourcesActive: number;
  resourcesIdle: number;
  activeJobs: number;
  activeShipments: number;
  todayDeviations: number;
}
