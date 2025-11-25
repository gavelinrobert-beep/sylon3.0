/**
 * SYLON Sites Module Types
 * Quarries, depots, asphalt plants, snow dumps, and project areas
 */

import type {
  BaseEntity,
  AuditedEntity,
  Coordinates,
  GeoFence,
  WorkingHours,
} from './core.js';

// ============================================
// SITE TYPES
// ============================================

export type SiteType = 
  | 'quarry'
  | 'depot'
  | 'asphalt_plant'
  | 'snow_dump'
  | 'project_area'
  | 'garage'
  | 'fuel_station'
  | 'customer_site'
  | 'public_works';

export type SiteStatus = 'active' | 'inactive' | 'closed' | 'seasonal';

// ============================================
// SITE
// ============================================

export interface Site extends AuditedEntity {
  companyId: string;
  name: string;
  code: string;
  type: SiteType;
  status: SiteStatus;
  description?: string;
  
  // Location
  address: string;
  coordinates: Coordinates;
  geofence?: GeoFence;
  
  // Operations
  operatingHours: SiteOperatingHours;
  contact?: SiteContact;
  
  // Materials (for quarries/depots)
  materials?: SiteMaterial[];
  
  // Capacity
  capacity?: SiteCapacity;
  
  // Access
  accessInstructions?: string;
  restrictions?: string[];
  
  // Statistics
  trafficStats?: TrafficStats;
}

export interface SiteOperatingHours {
  regular: WorkingHours;
  exceptions?: {
    date: string;
    hours?: WorkingHours;
    closed?: boolean;
    reason?: string;
  }[];
}

export interface SiteContact {
  name: string;
  phone: string;
  email?: string;
  role?: string;
}

// ============================================
// MATERIALS
// ============================================

export type MaterialCategory = 
  | 'aggregate'
  | 'sand'
  | 'gravel'
  | 'rock'
  | 'asphalt'
  | 'concrete'
  | 'salt'
  | 'other';

export interface SiteMaterial {
  id: string;
  name: string;
  code: string;
  category: MaterialCategory;
  fraction?: string; // e.g., "0-32", "32-64"
  description?: string;
  unit: 'ton' | 'm3' | 'kg';
  pricePerUnit?: number;
  
  // Availability
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  availability: 'available' | 'low' | 'out_of_stock' | 'seasonal';
  
  // Quality
  qualityGrade?: string;
  certifications?: string[];
}

export interface MaterialTransaction extends BaseEntity {
  siteId: string;
  materialId: string;
  type: 'in' | 'out';
  quantity: number;
  unit: string;
  resourceId?: string;
  operatorId?: string;
  jobId?: string;
  destinationSiteId?: string;
  notes?: string;
  weighticketNumber?: string;
}

// ============================================
// CAPACITY & TRAFFIC
// ============================================

export interface SiteCapacity {
  maxDailyVisits?: number;
  maxConcurrentVehicles?: number;
  loadingBays?: number;
  unloadingAreas?: number;
  storageCapacity?: number;
  storageUnit?: string;
}

export interface TrafficStats {
  date: string;
  totalVisits: number;
  totalLoads: number;
  totalUnloads: number;
  peakHour?: string;
  averageWaitTime?: number;
  byResourceType?: {
    type: string;
    count: number;
  }[];
}

// ============================================
// SITE VISITS
// ============================================

export interface SiteVisit extends BaseEntity {
  siteId: string;
  resourceId: string;
  operatorId?: string;
  jobId?: string;
  
  // Timing
  arrivedAt: Date;
  departedAt?: Date;
  waitTime?: number;
  
  // Activity
  type: 'loading' | 'unloading' | 'service' | 'parking' | 'other';
  materials?: {
    materialId: string;
    quantity: number;
    unit: string;
  }[];
  
  // Documentation
  weighticketNumber?: string;
  notes?: string;
}

// ============================================
// QUARRY SPECIFIC
// ============================================

export interface QuarryInfo {
  siteId: string;
  permitNumber: string;
  permitValidUntil: Date;
  extractionLimit?: number;
  extractedThisYear?: number;
  environmentalZone?: string;
  blastingSchedule?: {
    dayOfWeek: number;
    time: string;
  }[];
}

// ============================================
// SNOW DUMP SPECIFIC
// ============================================

export interface SnowDumpInfo {
  siteId: string;
  season: string;
  capacity: number;
  currentFill: number;
  fillPercentage: number;
  estimatedMeltDate?: Date;
  environmentalPermit?: string;
}

// ============================================
// SITE DASHBOARD
// ============================================

export interface SiteDashboard {
  totalSites: number;
  activeSites: number;
  sitesWithLowStock: number;
  todayVisits: number;
  materialMovements: {
    material: string;
    in: number;
    out: number;
  }[];
  busySites: {
    siteId: string;
    name: string;
    currentVisits: number;
  }[];
}
