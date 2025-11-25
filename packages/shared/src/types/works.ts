/**
 * SYLON Works Module Types
 * Job management, assignments, time logging, and reporting
 */

import type {
  BaseEntity,
  AuditedEntity,
  Coordinates,
  GeoPosition,
  TimeRange,
  ResourceType,
} from './core.js';

// ============================================
// JOB TYPES
// ============================================

export type JobType = 
  | 'snow_plowing'
  | 'salting'
  | 'gravel_transport'
  | 'excavation'
  | 'loading'
  | 'material_delivery'
  | 'site_preparation'
  | 'demolition'
  | 'maintenance';

export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

export type JobStatus = 
  | 'draft'
  | 'scheduled'
  | 'assigned'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface Job extends AuditedEntity {
  companyId: string;
  jobNumber: string;
  type: JobType;
  title: string;
  description: string;
  priority: JobPriority;
  status: JobStatus;
  
  // Location
  location: JobLocation;
  route?: RouteWaypoint[];
  
  // Assignment
  assignedResources: JobResourceAssignment[];
  
  // Timing
  scheduledTime: TimeRange;
  actualTime?: TimeRange;
  estimatedDuration: number; // minutes
  
  // Customer
  customerId?: string;
  customerReference?: string;
  
  // Materials
  materials?: JobMaterial[];
  
  // Reporting
  timeEntries: TimeEntry[];
  photos: JobPhoto[];
  deviations: Deviation[];
  notes: JobNote[];
  
  // Metrics
  machineHours?: number;
  fuelConsumed?: number;
  co2Emissions?: number;
  distanceTraveled?: number;
  
  // Invoice
  invoiceStatus: 'pending' | 'generated' | 'sent' | 'paid';
  invoiceData?: InvoiceData;
}

export interface JobLocation {
  name: string;
  address?: string;
  coordinates: Coordinates;
  siteId?: string;
  geofence?: {
    radius: number;
    coordinates: Coordinates;
  };
}

export interface RouteWaypoint {
  order: number;
  name: string;
  coordinates: Coordinates;
  type: 'start' | 'waypoint' | 'destination';
  estimatedArrival?: Date;
  actualArrival?: Date;
  completed: boolean;
}

export interface JobResourceAssignment {
  resourceId: string;
  operatorId?: string;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'assigned' | 'active' | 'completed' | 'released';
}

export interface JobMaterial {
  materialId: string;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  sourceId?: string;
  destinationId?: string;
  loaded?: boolean;
  delivered?: boolean;
}

// ============================================
// TIME LOGGING
// ============================================

export type TimeEntryType = 
  | 'work'
  | 'travel'
  | 'break'
  | 'maintenance'
  | 'waiting'
  | 'loading'
  | 'unloading';

export interface TimeEntry extends BaseEntity {
  jobId: string;
  resourceId: string;
  operatorId: string;
  type: TimeEntryType;
  timeRange: TimeRange;
  description?: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

// ============================================
// PHOTOS & ATTACHMENTS
// ============================================

export interface JobPhoto extends BaseEntity {
  jobId: string;
  resourceId?: string;
  operatorId: string;
  filename: string;
  url: string;
  thumbnailUrl: string;
  mimeType: string;
  size: number;
  coordinates?: Coordinates;
  caption?: string;
  category: 'before' | 'during' | 'after' | 'damage' | 'other';
}

// ============================================
// DEVIATIONS & ISSUES
// ============================================

export type DeviationSeverity = 'info' | 'warning' | 'error' | 'critical';

export type DeviationType = 
  | 'delay'
  | 'damage'
  | 'safety_issue'
  | 'equipment_failure'
  | 'weather'
  | 'access_issue'
  | 'material_shortage'
  | 'other';

export interface Deviation extends BaseEntity {
  jobId: string;
  resourceId?: string;
  reportedBy: string;
  type: DeviationType;
  severity: DeviationSeverity;
  title: string;
  description: string;
  coordinates?: Coordinates;
  photos: string[];
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;
}

// ============================================
// NOTES
// ============================================

export interface JobNote extends BaseEntity {
  jobId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
}

// ============================================
// INVOICING
// ============================================

export interface InvoiceData {
  generatedAt: Date;
  lineItems: InvoiceLineItem[];
  totalHours: number;
  totalMaterials: number;
  totalAmount: number;
  currency: string;
  notes?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  category: 'labor' | 'equipment' | 'material' | 'other';
}

// ============================================
// WORK ORDERS
// ============================================

export interface WorkOrder extends AuditedEntity {
  companyId: string;
  orderNumber: string;
  customerId: string;
  jobs: string[];
  status: 'draft' | 'active' | 'completed' | 'invoiced';
  validFrom: Date;
  validTo?: Date;
  contractType: 'fixed' | 'hourly' | 'call_out';
  terms?: string;
}

// ============================================
// DASHBOARD & ANALYTICS
// ============================================

export interface WorksDashboard {
  activeJobs: number;
  completedToday: number;
  resourcesInField: number;
  deviationsOpen: number;
  hoursLoggedToday: number;
  upcomingJobs: Job[];
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  timestamp: Date;
  type: 'job_started' | 'job_completed' | 'deviation_reported' | 'photo_added' | 'resource_assigned';
  description: string;
  jobId?: string;
  resourceId?: string;
  operatorId?: string;
}
