/**
 * SYLON Core Types
 * Base types and enums used across the platform
 */

// ============================================
// GEOGRAPHIC TYPES
// ============================================

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

export interface GeoPosition extends Coordinates {
  timestamp: Date;
  speed?: number;
  heading?: number;
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GeoFence {
  id: string;
  name: string;
  type: 'circle' | 'polygon';
  center?: Coordinates;
  radius?: number;
  vertices?: Coordinates[];
  alertOnEnter: boolean;
  alertOnExit: boolean;
}

// ============================================
// BASE ENTITY TYPES
// ============================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditedEntity extends BaseEntity {
  createdBy: string;
  updatedBy: string;
}

// ============================================
// COMPANY & ORGANIZATION
// ============================================

export interface Company extends BaseEntity {
  name: string;
  organizationNumber: string;
  address: Address;
  contact: ContactInfo;
  settings: CompanySettings;
}

export interface Address {
  street: string;
  postalCode: string;
  city: string;
  country: string;
  coordinates?: Coordinates;
}

export interface ContactInfo {
  phone: string;
  email: string;
  website?: string;
}

export interface CompanySettings {
  timezone: string;
  locale: string;
  currency: string;
  workingHours: WorkingHours;
}

export interface WorkingHours {
  start: string; // HH:MM format
  end: string;
  days: number[]; // 0-6, 0 = Sunday
}

// ============================================
// USER & AUTH
// ============================================

export type UserRole = 'admin' | 'dispatcher' | 'supervisor' | 'operator' | 'driver';

export interface User extends BaseEntity {
  companyId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
}

// ============================================
// RESOURCE TYPES
// ============================================

export type ResourceType = 'wheel_loader' | 'excavator' | 'plow_truck' | 'haul_truck' | 'dump_truck' | 'tanker' | 'crane';

export type ResourceStatus = 'available' | 'on_job' | 'en_route' | 'paused' | 'maintenance' | 'offline' | 'error';

export interface Resource extends AuditedEntity {
  companyId: string;
  name: string;
  type: ResourceType;
  registrationNumber: string;
  gpsDeviceId: string;
  capacity: ResourceCapacity;
  fuelStatus: FuelStatus;
  lastService: Date;
  nextService: Date;
  status: ResourceStatus;
  currentPosition?: GeoPosition;
  assignedOperatorId?: string;
  assignedJobId?: string;
  errorCodes: string[];
  operatingHours: number;
  specifications: ResourceSpecifications;
}

export interface ResourceCapacity {
  maxLoad: number;
  unit: 'kg' | 'ton' | 'm3' | 'liter';
  bucketSize?: number;
  armReach?: number;
}

export interface FuelStatus {
  currentLevel: number; // percentage 0-100
  tankCapacity: number; // liters
  consumption: number; // liters per hour
  lastRefuel: Date;
}

export interface ResourceSpecifications {
  manufacturer: string;
  model: string;
  year: number;
  enginePower: number; // kW
  weight: number; // kg
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
}

// ============================================
// GPS & TRACKING
// ============================================

export interface GpsReading {
  id: string;
  resourceId: string;
  position: GeoPosition;
  engineOn: boolean;
  fuelLevel?: number;
  odometerKm?: number;
  engineHours?: number;
  diagnostics?: DiagnosticData;
}

export interface DiagnosticData {
  engineTemp?: number;
  oilPressure?: number;
  coolantLevel?: number;
  batteryVoltage?: number;
  errorCodes: string[];
}

export interface GpsBatch {
  resourceId: string;
  readings: GpsReading[];
  batchedAt: Date;
  syncedAt?: Date;
}

// ============================================
// TIME & SCHEDULING
// ============================================

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface Shift extends BaseEntity {
  operatorId: string;
  resourceId: string;
  timeRange: TimeRange;
  breaks: TimeRange[];
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}
