/**
 * SYLON Demo Data - Sites
 * Garage HQ, 2 Quarries (Bergtäkt Norra & Södra)
 */

import type { Site, SiteMaterial, QuarryInfo } from '@sylon/shared';
import { DEMO_COMPANY, DEMO_GARAGE, DEMO_QUARRY_NORTH, DEMO_QUARRY_SOUTH } from '@sylon/shared';

const now = new Date();

// Garage HQ
export const garageHQ: Site = {
  id: 'site-garage-hq',
  companyId: DEMO_COMPANY.id,
  name: 'Garage HQ',
  code: 'GRG-001',
  type: 'garage',
  status: 'active',
  description: 'Huvuddepå med verkstad, fordonstvätt och parkering för alla resurser',
  address: 'Industrigatan 15, 852 33 Sundsvall',
  coordinates: DEMO_GARAGE,
  geofence: {
    id: 'gf-garage',
    name: 'Garage HQ Area',
    type: 'circle',
    center: DEMO_GARAGE,
    radius: 150,
    alertOnEnter: true,
    alertOnExit: true,
  },
  operatingHours: {
    regular: {
      start: '06:00',
      end: '22:00',
      days: [1, 2, 3, 4, 5, 6, 0],
    },
  },
  contact: {
    name: 'Erik Lindqvist',
    phone: '+46 70 123 45 67',
    email: 'erik.lindqvist@sylon-demo.se',
    role: 'Depåchef',
  },
  capacity: {
    maxConcurrentVehicles: 30,
    loadingBays: 4,
    storageCapacity: 5000,
    storageUnit: 'm2',
  },
  accessInstructions: 'Infart via Industrigatan. Parkering för besökare vid port A.',
  createdAt: new Date('2024-01-01'),
  updatedAt: now,
  createdBy: 'system',
  updatedBy: 'system',
};

// Bergtäkt Norra - Materials
const northQuarryMaterials: SiteMaterial[] = [
  {
    id: 'mat-n-001',
    name: '0-32 mm Krossad Sten',
    code: '0-32',
    category: 'aggregate',
    fraction: '0-32',
    description: 'Krossad sten för vägar och grundläggning',
    unit: 'ton',
    pricePerUnit: 85,
    currentStock: 15000,
    minStock: 2000,
    maxStock: 25000,
    availability: 'available',
    qualityGrade: 'A',
    certifications: ['CE', 'ISO 9001'],
  },
  {
    id: 'mat-n-002',
    name: '32-64 mm Krossad Sten',
    code: '32-64',
    category: 'aggregate',
    fraction: '32-64',
    description: 'Grov krossad sten för dränering och fyllning',
    unit: 'ton',
    pricePerUnit: 75,
    currentStock: 8500,
    minStock: 1500,
    maxStock: 15000,
    availability: 'available',
    qualityGrade: 'A',
    certifications: ['CE'],
  },
  {
    id: 'mat-n-003',
    name: 'Bergkross 0-90',
    code: 'BK-0-90',
    category: 'rock',
    fraction: '0-90',
    description: 'Bergkross för större fyllnadsarbeten',
    unit: 'ton',
    pricePerUnit: 55,
    currentStock: 25000,
    minStock: 5000,
    maxStock: 50000,
    availability: 'available',
    qualityGrade: 'B',
  },
];

// Bergtäkt Norra
export const quarryNorth: Site = {
  id: 'site-quarry-north',
  companyId: DEMO_COMPANY.id,
  name: 'Bergtäkt Norra',
  code: 'QRY-001',
  type: 'quarry',
  status: 'active',
  description: 'Huvudtäkt för krossad sten och bergkross. Kapacitet 200 000 ton/år.',
  address: 'Norra Bergsvägen 50, 856 41 Sundsvall',
  coordinates: DEMO_QUARRY_NORTH,
  geofence: {
    id: 'gf-quarry-north',
    name: 'Bergtäkt Norra Geofence',
    type: 'circle',
    center: DEMO_QUARRY_NORTH,
    radius: 500,
    alertOnEnter: true,
    alertOnExit: true,
  },
  operatingHours: {
    regular: {
      start: '06:00',
      end: '17:00',
      days: [1, 2, 3, 4, 5],
    },
    exceptions: [
      { date: '2024-12-24', closed: true, reason: 'Julafton' },
      { date: '2024-12-25', closed: true, reason: 'Juldagen' },
      { date: '2024-12-31', hours: { start: '06:00', end: '12:00', days: [] }, reason: 'Nyårsafton' },
    ],
  },
  contact: {
    name: 'Anders Bergström',
    phone: '+46 70 234 56 78',
    email: 'anders.bergstrom@sylon-demo.se',
    role: 'Täktchef',
  },
  materials: northQuarryMaterials,
  capacity: {
    maxDailyVisits: 150,
    maxConcurrentVehicles: 20,
    loadingBays: 3,
    unloadingAreas: 2,
  },
  accessInstructions: 'Följ skyltning från E4. Våg vid infart - väg in och ut obligatoriskt.',
  restrictions: ['Max 60 ton totalvikt', 'Hjälm och varselväst obligatoriskt', 'Max hastighet 20 km/h'],
  createdAt: new Date('2024-01-01'),
  updatedAt: now,
  createdBy: 'system',
  updatedBy: 'system',
};

export const quarryNorthInfo: QuarryInfo = {
  siteId: 'site-quarry-north',
  permitNumber: 'MT-2020-123456',
  permitValidUntil: new Date('2035-12-31'),
  extractionLimit: 200000,
  extractedThisYear: 85000,
  environmentalZone: 'Normal',
  blastingSchedule: [
    { dayOfWeek: 2, time: '12:00' },
    { dayOfWeek: 4, time: '12:00' },
  ],
};

// Bergtäkt Södra - Materials
const southQuarryMaterials: SiteMaterial[] = [
  {
    id: 'mat-s-001',
    name: 'Sand 0-4 mm',
    code: 'SAND-0-4',
    category: 'sand',
    fraction: '0-4',
    description: 'Fin sand för betong och murbruk',
    unit: 'ton',
    pricePerUnit: 95,
    currentStock: 12000,
    minStock: 2000,
    maxStock: 20000,
    availability: 'available',
    qualityGrade: 'A',
    certifications: ['CE', 'ISO 9001'],
  },
  {
    id: 'mat-s-002',
    name: 'Grus 4-16 mm',
    code: 'GRUS-4-16',
    category: 'gravel',
    fraction: '4-16',
    description: 'Naturgrus för dränering och filtrering',
    unit: 'ton',
    pricePerUnit: 90,
    currentStock: 8000,
    minStock: 1500,
    maxStock: 15000,
    availability: 'available',
    qualityGrade: 'A',
    certifications: ['CE'],
  },
  {
    id: 'mat-s-003',
    name: 'Makadam 16-32 mm',
    code: 'MAK-16-32',
    category: 'aggregate',
    fraction: '16-32',
    description: 'Makadam för vägar och parkeringar',
    unit: 'ton',
    pricePerUnit: 80,
    currentStock: 10000,
    minStock: 2000,
    maxStock: 18000,
    availability: 'available',
    qualityGrade: 'A',
  },
  {
    id: 'mat-s-004',
    name: 'Sandningssand',
    code: 'S-SAND',
    category: 'sand',
    fraction: '0-8',
    description: 'Sand för vinterväghållning och halkbekämpning',
    unit: 'ton',
    pricePerUnit: 70,
    currentStock: 5000,
    minStock: 3000,
    maxStock: 10000,
    availability: 'available',
  },
];

// Bergtäkt Södra
export const quarrySouth: Site = {
  id: 'site-quarry-south',
  companyId: DEMO_COMPANY.id,
  name: 'Bergtäkt Södra',
  code: 'QRY-002',
  type: 'quarry',
  status: 'active',
  description: 'Specialiserad täkt för sand, grus och makadam. Kapacitet 120 000 ton/år.',
  address: 'Södra Täktvägen 12, 852 42 Sundsvall',
  coordinates: DEMO_QUARRY_SOUTH,
  geofence: {
    id: 'gf-quarry-south',
    name: 'Bergtäkt Södra Geofence',
    type: 'circle',
    center: DEMO_QUARRY_SOUTH,
    radius: 400,
    alertOnEnter: true,
    alertOnExit: true,
  },
  operatingHours: {
    regular: {
      start: '06:30',
      end: '16:30',
      days: [1, 2, 3, 4, 5],
    },
  },
  contact: {
    name: 'Maria Sandberg',
    phone: '+46 70 345 67 89',
    email: 'maria.sandberg@sylon-demo.se',
    role: 'Täktchef',
  },
  materials: southQuarryMaterials,
  capacity: {
    maxDailyVisits: 100,
    maxConcurrentVehicles: 15,
    loadingBays: 2,
    unloadingAreas: 1,
  },
  accessInstructions: 'Infart via väg 86 söderut. Våg vid infart.',
  restrictions: ['Max 50 ton totalvikt', 'Varselväst obligatoriskt'],
  createdAt: new Date('2024-01-01'),
  updatedAt: now,
  createdBy: 'system',
  updatedBy: 'system',
};

export const quarrySouthInfo: QuarryInfo = {
  siteId: 'site-quarry-south',
  permitNumber: 'MT-2018-654321',
  permitValidUntil: new Date('2033-06-30'),
  extractionLimit: 120000,
  extractedThisYear: 52000,
  environmentalZone: 'Känslig',
};

// Snow dump for winter operations
export const snowDump: Site = {
  id: 'site-snow-dump',
  companyId: DEMO_COMPANY.id,
  name: 'Snötipp Norra',
  code: 'SNW-001',
  type: 'snow_dump',
  status: 'seasonal',
  description: 'Kommunens huvudsakliga snötipp. Öppen november-april.',
  address: 'Snödeponivägen 1, 856 50 Sundsvall',
  coordinates: { latitude: 62.4200, longitude: 17.3100 },
  geofence: {
    id: 'gf-snow-dump',
    name: 'Snötipp Norra',
    type: 'circle',
    center: { latitude: 62.4200, longitude: 17.3100 },
    radius: 300,
    alertOnEnter: true,
    alertOnExit: false,
  },
  operatingHours: {
    regular: {
      start: '00:00',
      end: '23:59',
      days: [0, 1, 2, 3, 4, 5, 6],
    },
  },
  capacity: {
    maxDailyVisits: 500,
    maxConcurrentVehicles: 30,
    storageCapacity: 500000,
    storageUnit: 'm3',
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: now,
  createdBy: 'system',
  updatedBy: 'system',
};

export const allSites: Site[] = [garageHQ, quarryNorth, quarrySouth, snowDump];

export function getSiteById(id: string): Site | undefined {
  return allSites.find(s => s.id === id);
}

export function getSitesByType(type: Site['type']): Site[] {
  return allSites.filter(s => s.type === type);
}
