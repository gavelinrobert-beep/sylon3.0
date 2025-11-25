/**
 * SYLON Garage Module Types
 * Service, maintenance, parking, and resource management
 */

import type {
  BaseEntity,
  AuditedEntity,
  Coordinates,
  ResourceType,
  TimeRange,
} from './core.js';

// ============================================
// GARAGE & FACILITY
// ============================================

export interface Garage extends AuditedEntity {
  companyId: string;
  name: string;
  code: string;
  address: string;
  coordinates: Coordinates;
  isHeadquarters: boolean;
  
  // Facilities
  facilities: GarageFacility[];
  parkingSpots: ParkingSpot[];
  fuelPumps: FuelPump[];
  
  // Staff
  managerId?: string;
  mechanics: string[];
  
  // Operations
  operatingHours: {
    weekday: { start: string; end: string };
    weekend?: { start: string; end: string };
  };
  
  // Contact
  phone: string;
  email?: string;
}

export type FacilityType = 
  | 'service_bay'
  | 'wash_station'
  | 'machine_hall'
  | 'spare_parts'
  | 'office'
  | 'fuel_depot'
  | 'electric_charging';

export interface GarageFacility {
  id: string;
  type: FacilityType;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'maintenance' | 'out_of_order';
}

export interface ParkingSpot {
  id: string;
  number: string;
  type: ResourceType | 'any';
  indoor: boolean;
  hasCharging: boolean;
  status: 'available' | 'occupied' | 'reserved';
  assignedResourceId?: string;
}

export interface FuelPump {
  id: string;
  number: string;
  fuelType: 'diesel' | 'gasoline' | 'hvo' | 'electric' | 'adblue';
  status: 'available' | 'in_use' | 'out_of_order';
  lastReading?: number;
}

// ============================================
// SERVICE & MAINTENANCE
// ============================================

export type ServiceType = 
  | 'scheduled'
  | 'unscheduled'
  | 'inspection'
  | 'repair'
  | 'tire_change'
  | 'oil_change'
  | 'wash'
  | 'winterization'
  | 'safety_check';

export type ServiceStatus = 
  | 'scheduled'
  | 'in_progress'
  | 'waiting_parts'
  | 'completed'
  | 'cancelled';

export interface ServiceRecord extends AuditedEntity {
  companyId: string;
  garageId: string;
  resourceId: string;
  type: ServiceType;
  status: ServiceStatus;
  
  // Scheduling
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration: number; // minutes
  actualDuration?: number;
  
  // Details
  description: string;
  workPerformed?: string;
  mechanicId?: string;
  
  // Parts & Costs
  partsUsed: ServicePart[];
  laborHours: number;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  
  // Documentation
  photos: string[];
  documents: string[];
  notes?: string;
  
  // Next service
  nextServiceDate?: Date;
  nextServiceOdometer?: number;
  nextServiceHours?: number;
}

export interface ServicePart {
  id: string;
  partNumber: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  fromStock: boolean;
}

// ============================================
// SPARE PARTS INVENTORY
// ============================================

export interface SparePart extends BaseEntity {
  garageId: string;
  partNumber: string;
  name: string;
  description?: string;
  category: string;
  manufacturer?: string;
  
  // Stock
  stockQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  unit: string;
  
  // Pricing
  costPrice: number;
  location: string; // shelf/bin location
  
  // Compatibility
  compatibleResources?: string[];
}

// ============================================
// DAILY CHECKS
// ============================================

export interface DailyCheck extends BaseEntity {
  resourceId: string;
  operatorId: string;
  garageId?: string;
  checkDate: Date;
  shift: 'morning' | 'evening' | 'night';
  
  // Check items
  items: DailyCheckItem[];
  
  // Summary
  allPassed: boolean;
  issuesFound: number;
  notes?: string;
  signature?: string;
}

export interface DailyCheckItem {
  category: string;
  item: string;
  passed: boolean;
  issue?: string;
  photo?: string;
}

// ============================================
// FUEL MANAGEMENT
// ============================================

export interface FuelTransaction extends BaseEntity {
  garageId: string;
  resourceId: string;
  operatorId?: string;
  pumpId: string;
  fuelType: string;
  quantity: number;
  odometer?: number;
  engineHours?: number;
  costPerLiter?: number;
  totalCost?: number;
  timestamp: Date;
}

// ============================================
// BOOKING & SCHEDULING
// ============================================

export interface GarageBooking extends BaseEntity {
  garageId: string;
  resourceId: string;
  facilityId?: string;
  type: 'service' | 'wash' | 'parking' | 'inspection';
  timeRange: TimeRange;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  bookedBy: string;
}

// ============================================
// GARAGE DASHBOARD
// ============================================

export interface GarageDashboard {
  totalResources: number;
  resourcesAtGarage: number;
  resourcesInField: number;
  
  servicesScheduledToday: number;
  servicesInProgress: number;
  servicesCompleted: number;
  
  pendingIssues: number;
  lowStockParts: number;
  
  upcomingServices: ServiceRecord[];
  recentActivity: {
    timestamp: Date;
    type: string;
    description: string;
    resourceId?: string;
  }[];
}
