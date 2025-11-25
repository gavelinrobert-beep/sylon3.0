/**
 * SYLON Constants - Demo Company and Configuration
 */

import type { Coordinates } from '../types/core.js';

// ============================================
// SUNDSVALL COORDINATES
// ============================================

export const SUNDSVALL_CENTER: Coordinates = {
  latitude: 62.3908,
  longitude: 17.3069,
};

export const SUNDSVALL_BOUNDS = {
  north: 62.50,
  south: 62.28,
  east: 17.55,
  west: 17.00,
};

// ============================================
// DEMO COMPANY
// ============================================

export const DEMO_COMPANY = {
  id: 'demo-company-001',
  name: 'SYLON Demo Contractors AB',
  organizationNumber: '556123-4567',
  address: {
    street: 'Industrigatan 15',
    postalCode: '852 33',
    city: 'Sundsvall',
    country: 'Sverige',
    coordinates: { latitude: 62.3908, longitude: 17.3069 },
  },
  contact: {
    phone: '+46 60 123 45 67',
    email: 'info@sylon-demo.se',
    website: 'https://sylon-demo.se',
  },
  settings: {
    timezone: 'Europe/Stockholm',
    locale: 'sv-SE',
    currency: 'SEK',
    workingHours: {
      start: '06:00',
      end: '18:00',
      days: [1, 2, 3, 4, 5], // Mon-Fri
    },
  },
};

// ============================================
// DEMO SITES
// ============================================

export const DEMO_GARAGE: Coordinates = {
  latitude: 62.4012,
  longitude: 17.2856,
};

export const DEMO_QUARRY_NORTH: Coordinates = {
  latitude: 62.4523,
  longitude: 17.3421,
};

export const DEMO_QUARRY_SOUTH: Coordinates = {
  latitude: 62.3345,
  longitude: 17.2789,
};

export const DEMO_SITES = [
  {
    id: 'site-garage-hq',
    name: 'Garage HQ',
    code: 'GRG-001',
    type: 'garage' as const,
    coordinates: DEMO_GARAGE,
    address: 'Industrigatan 15, 852 33 Sundsvall',
    isHeadquarters: true,
  },
  {
    id: 'site-quarry-north',
    name: 'Bergtäkt Norra',
    code: 'QRY-001',
    type: 'quarry' as const,
    coordinates: DEMO_QUARRY_NORTH,
    address: 'Norra Bergsvägen 50, 856 41 Sundsvall',
    materials: ['0-32', '32-64', 'bergkross'],
  },
  {
    id: 'site-quarry-south',
    name: 'Bergtäkt Södra',
    code: 'QRY-002',
    type: 'quarry' as const,
    coordinates: DEMO_QUARRY_SOUTH,
    address: 'Södra Täktvägen 12, 852 42 Sundsvall',
    materials: ['sand', 'grus', 'makadam'],
  },
];

// ============================================
// PLOW ROUTES - SUNDSVALL
// ============================================

export const PLOW_ROUTES = [
  {
    id: 'route-plow-1',
    name: 'E4 Norr',
    waypoints: [
      { lat: 62.3908, lng: 17.3069 },
      { lat: 62.4100, lng: 17.3200 },
      { lat: 62.4300, lng: 17.3400 },
      { lat: 62.4500, lng: 17.3500 },
    ],
  },
  {
    id: 'route-plow-2',
    name: 'Stadscentrum',
    waypoints: [
      { lat: 62.3908, lng: 17.3069 },
      { lat: 62.3880, lng: 17.2900 },
      { lat: 62.3850, lng: 17.3100 },
      { lat: 62.3920, lng: 17.3200 },
    ],
  },
  {
    id: 'route-plow-3',
    name: 'Industriområdet',
    waypoints: [
      { lat: 62.4012, lng: 17.2856 },
      { lat: 62.4050, lng: 17.2700 },
      { lat: 62.4100, lng: 17.2600 },
      { lat: 62.4080, lng: 17.2500 },
    ],
  },
  {
    id: 'route-plow-4',
    name: 'Södermalm',
    waypoints: [
      { lat: 62.3700, lng: 17.3000 },
      { lat: 62.3650, lng: 17.2900 },
      { lat: 62.3600, lng: 17.3100 },
      { lat: 62.3550, lng: 17.3000 },
    ],
  },
];

// ============================================
// PROJECT AREAS
// ============================================

export const PROJECT_AREAS = [
  {
    id: 'project-1',
    name: 'Nytt bostadsområde Norra Kajen',
    coordinates: { latitude: 62.3950, longitude: 17.2800 },
    radius: 200,
  },
  {
    id: 'project-2',
    name: 'Vägbygge Timrå',
    coordinates: { latitude: 62.4850, longitude: 17.3200 },
    radius: 500,
  },
  {
    id: 'project-3',
    name: 'Industrimark expansion',
    coordinates: { latitude: 62.4100, longitude: 17.2500 },
    radius: 300,
  },
];

// ============================================
// MATERIALS
// ============================================

export const MATERIALS = [
  { id: 'mat-001', name: '0-32 mm', code: '0-32', category: 'aggregate', unit: 'ton' },
  { id: 'mat-002', name: '32-64 mm', code: '32-64', category: 'aggregate', unit: 'ton' },
  { id: 'mat-003', name: 'Bergkross', code: 'BK', category: 'rock', unit: 'ton' },
  { id: 'mat-004', name: 'Sand', code: 'SAND', category: 'sand', unit: 'ton' },
  { id: 'mat-005', name: 'Grus', code: 'GRUS', category: 'gravel', unit: 'ton' },
  { id: 'mat-006', name: 'Makadam', code: 'MAK', category: 'aggregate', unit: 'ton' },
  { id: 'mat-007', name: 'Vägsalt', code: 'SALT', category: 'salt', unit: 'ton' },
  { id: 'mat-008', name: 'Sandningssand', code: 'S-SAND', category: 'sand', unit: 'ton' },
];

// ============================================
// RESOURCE TYPE LABELS
// ============================================

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  wheel_loader: 'Hjullastare',
  excavator: 'Grävmaskin',
  plow_truck: 'Plogbil',
  haul_truck: 'Transportbil',
  dump_truck: 'Tippbil',
  tanker: 'Tankbil',
  crane: 'Kran',
};

export const JOB_TYPE_LABELS: Record<string, string> = {
  snow_plowing: 'Snöplogning',
  salting: 'Saltning',
  gravel_transport: 'Grustransport',
  excavation: 'Schaktning',
  loading: 'Lastning',
  material_delivery: 'Materialleverans',
  site_preparation: 'Markberedning',
  demolition: 'Rivning',
  maintenance: 'Underhåll',
};
