/**
 * SYLON Logistics Module Types
 * Transport planning, routing, delivery tracking, and POD
 */

import type {
  BaseEntity,
  AuditedEntity,
  Coordinates,
  GeoPosition,
  TimeRange,
} from './core.js';

// ============================================
// TRANSPORT TYPES
// ============================================

export type TransportType = 
  | 'bulk'
  | 'package'
  | 'container'
  | 'tanker'
  | 'flatbed'
  | 'temperature_controlled';

export type DeliveryStatus = 
  | 'pending'
  | 'picked_up'
  | 'in_transit'
  | 'arriving'
  | 'delivered'
  | 'failed'
  | 'returned';

// ============================================
// SHIPMENT & DELIVERY
// ============================================

export interface Shipment extends AuditedEntity {
  companyId: string;
  shipmentNumber: string;
  type: TransportType;
  status: DeliveryStatus;
  
  // Origin & Destination
  origin: ShipmentLocation;
  destination: ShipmentLocation;
  waypoints: ShipmentWaypoint[];
  
  // Assignment
  resourceId?: string;
  driverId?: string;
  
  // Timing
  pickupWindow: TimeRange;
  deliveryWindow: TimeRange;
  estimatedPickup?: Date;
  estimatedDelivery?: Date;
  actualPickup?: Date;
  actualDelivery?: Date;
  
  // Cargo
  cargo: CargoItem[];
  totalWeight: number;
  totalVolume: number;
  
  // Documents
  waybill?: Waybill;
  pod?: ProofOfDelivery;
  
  // Events
  events: ShipmentEvent[];
  
  // Environmental
  routeDistance?: number;
  fuelConsumed?: number;
  co2Emissions?: number;
}

export interface ShipmentLocation {
  name: string;
  address: string;
  coordinates: Coordinates;
  contactName?: string;
  contactPhone?: string;
  instructions?: string;
}

export interface ShipmentWaypoint {
  order: number;
  location: ShipmentLocation;
  type: 'pickup' | 'delivery' | 'stop';
  scheduledTime: TimeRange;
  actualArrival?: Date;
  actualDeparture?: Date;
  completed: boolean;
}

// ============================================
// CARGO
// ============================================

export interface CargoItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  weight: number;
  volume?: number;
  dangerousGoods?: DangerousGoodsInfo;
  temperatureRequirements?: TemperatureRequirements;
}

export interface DangerousGoodsInfo {
  unNumber: string;
  class: string;
  packingGroup: string;
  properShippingName: string;
}

export interface TemperatureRequirements {
  min: number;
  max: number;
  unit: 'celsius' | 'fahrenheit';
}

// ============================================
// WAYBILL & POD
// ============================================

export interface Waybill extends BaseEntity {
  shipmentId: string;
  waybillNumber: string;
  shipper: PartyInfo;
  consignee: PartyInfo;
  carrier: PartyInfo;
  cargoDescription: string;
  instructions?: string;
  declared: boolean;
  declaredAt?: Date;
}

export interface PartyInfo {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  reference?: string;
}

export interface ProofOfDelivery extends BaseEntity {
  shipmentId: string;
  receivedBy: string;
  signatureUrl?: string;
  photoUrls: string[];
  receivedAt: Date;
  coordinates: Coordinates;
  notes?: string;
  condition: 'good' | 'damaged' | 'partial';
  exceptions?: string[];
}

// ============================================
// EVENTS & TRACKING
// ============================================

export type ShipmentEventType = 
  | 'created'
  | 'assigned'
  | 'pickup_started'
  | 'picked_up'
  | 'departed'
  | 'in_transit'
  | 'stop_arrived'
  | 'stop_departed'
  | 'arriving'
  | 'delivered'
  | 'failed'
  | 'exception'
  | 'delay'
  | 'rerouted';

export interface ShipmentEvent extends BaseEntity {
  shipmentId: string;
  type: ShipmentEventType;
  description: string;
  coordinates?: Coordinates;
  metadata?: Record<string, unknown>;
}

// ============================================
// ROUTES
// ============================================

export interface Route extends AuditedEntity {
  companyId: string;
  name: string;
  description?: string;
  waypoints: RoutePoint[];
  estimatedDistance: number;
  estimatedDuration: number;
  isOptimized: boolean;
  optimizedAt?: Date;
}

export interface RoutePoint {
  order: number;
  name: string;
  coordinates: Coordinates;
  estimatedArrival?: Date;
  stopDuration?: number;
}

// ============================================
// DRIVER BEHAVIOR & ENVIRONMENTAL
// ============================================

export interface DrivingMetrics {
  resourceId: string;
  driverId: string;
  period: TimeRange;
  totalDistance: number;
  drivingTime: number;
  idleTime: number;
  fuelConsumed: number;
  co2Emissions: number;
  averageSpeed: number;
  maxSpeed: number;
  harshBraking: number;
  harshAcceleration: number;
  speeding: number;
  score: number;
}

export interface EnvironmentalReport {
  companyId: string;
  period: TimeRange;
  totalDistance: number;
  totalFuelConsumed: number;
  totalCo2Emissions: number;
  avgFuelEfficiency: number;
  byResourceType: {
    type: string;
    distance: number;
    fuel: number;
    co2: number;
  }[];
}

// ============================================
// CUSTOMER TRACKING
// ============================================

export interface TrackingInfo {
  shipmentId: string;
  status: DeliveryStatus;
  currentPosition?: GeoPosition;
  estimatedDelivery?: Date;
  events: {
    timestamp: Date;
    status: string;
    location?: string;
  }[];
  trackingUrl: string;
}
