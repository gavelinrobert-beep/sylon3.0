/**
 * SYLON Demo Data - Resources
 * 16 units: 4 wheel loaders, 4 excavators, 4 plow trucks, 4 haul trucks
 */

import type { Resource, ResourceType, ResourceStatus } from '@sylon/shared';
import { DEMO_COMPANY, DEMO_GARAGE } from '@sylon/shared';

function createResource(
  id: string,
  name: string,
  type: ResourceType,
  regNumber: string,
  specs: Partial<Resource['specifications']>,
  capacity: Partial<Resource['capacity']>
): Resource {
  const now = new Date();
  const lastService = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
  const nextService = new Date(lastService.getTime() + 90 * 24 * 60 * 60 * 1000);
  
  return {
    id,
    companyId: DEMO_COMPANY.id,
    name,
    type,
    registrationNumber: regNumber,
    gpsDeviceId: `GPS-${id}`,
    capacity: {
      maxLoad: capacity.maxLoad ?? 0,
      unit: capacity.unit ?? 'ton',
      bucketSize: capacity.bucketSize,
      armReach: capacity.armReach,
    },
    fuelStatus: {
      currentLevel: 40 + Math.random() * 60,
      tankCapacity: type === 'wheel_loader' || type === 'excavator' ? 400 : 300,
      consumption: type === 'wheel_loader' || type === 'excavator' ? 25 : 35,
      lastRefuel: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    },
    lastService,
    nextService,
    status: 'available' as ResourceStatus,
    currentPosition: {
      latitude: DEMO_GARAGE.latitude + (Math.random() - 0.5) * 0.002,
      longitude: DEMO_GARAGE.longitude + (Math.random() - 0.5) * 0.002,
      timestamp: now,
      speed: 0,
      heading: Math.random() * 360,
    },
    errorCodes: [],
    operatingHours: 2000 + Math.random() * 8000,
    specifications: {
      manufacturer: specs.manufacturer ?? 'Unknown',
      model: specs.model ?? 'Unknown',
      year: specs.year ?? 2020,
      enginePower: specs.enginePower ?? 200,
      weight: specs.weight ?? 15000,
      dimensions: specs.dimensions ?? { length: 8, width: 3, height: 3.5 },
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system',
  };
}

// 4 Wheel Loaders (Hjullastare)
export const wheelLoaders: Resource[] = [
  createResource(
    'loader-01',
    'Volvo L120H',
    'wheel_loader',
    'KLM 235',
    { manufacturer: 'Volvo', model: 'L120H', year: 2022, enginePower: 220, weight: 19500 },
    { maxLoad: 6.5, unit: 'ton', bucketSize: 3.5 }
  ),
  createResource(
    'loader-02',
    'Volvo L90H',
    'wheel_loader',
    'KLM 190',
    { manufacturer: 'Volvo', model: 'L90H', year: 2021, enginePower: 180, weight: 15000 },
    { maxLoad: 5, unit: 'ton', bucketSize: 2.8 }
  ),
  createResource(
    'loader-03',
    'Caterpillar 950M',
    'wheel_loader',
    'PQR 450',
    { manufacturer: 'Caterpillar', model: '950M', year: 2023, enginePower: 210, weight: 18500 },
    { maxLoad: 6, unit: 'ton', bucketSize: 3.2 }
  ),
  createResource(
    'loader-04',
    'Liebherr L556',
    'wheel_loader',
    'STU 556',
    { manufacturer: 'Liebherr', model: 'L556', year: 2020, enginePower: 200, weight: 17500 },
    { maxLoad: 5.5, unit: 'ton', bucketSize: 3.0 }
  ),
];

// 4 Excavators (Grävmaskiner)
export const excavators: Resource[] = [
  createResource(
    'excavator-01',
    'Volvo EC300E',
    'excavator',
    'ABC 300',
    { manufacturer: 'Volvo', model: 'EC300E', year: 2022, enginePower: 210, weight: 29500 },
    { maxLoad: 1.8, unit: 'ton', bucketSize: 1.8, armReach: 10.5 }
  ),
  createResource(
    'excavator-02',
    'Hitachi ZX250LC-6',
    'excavator',
    'DEF 250',
    { manufacturer: 'Hitachi', model: 'ZX250LC-6', year: 2021, enginePower: 140, weight: 24500 },
    { maxLoad: 1.4, unit: 'ton', bucketSize: 1.4, armReach: 9.8 }
  ),
  createResource(
    'excavator-03',
    'Komatsu PC210LC',
    'excavator',
    'GHI 210',
    { manufacturer: 'Komatsu', model: 'PC210LC', year: 2023, enginePower: 160, weight: 21500 },
    { maxLoad: 1.2, unit: 'ton', bucketSize: 1.2, armReach: 9.5 }
  ),
  createResource(
    'excavator-04',
    'Caterpillar 320GC',
    'excavator',
    'JKL 320',
    { manufacturer: 'Caterpillar', model: '320GC', year: 2020, enginePower: 170, weight: 22500 },
    { maxLoad: 1.5, unit: 'ton', bucketSize: 1.5, armReach: 10.0 }
  ),
];

// 4 Plow Trucks (Plogbilar)
export const plowTrucks: Resource[] = [
  createResource(
    'plow-truck-01',
    'Scania P410',
    'plow_truck',
    'MNO 410',
    { manufacturer: 'Scania', model: 'P410', year: 2022, enginePower: 300, weight: 18000 },
    { maxLoad: 12, unit: 'ton' }
  ),
  createResource(
    'plow-truck-02',
    'Volvo FM460',
    'plow_truck',
    'PQR 460',
    { manufacturer: 'Volvo', model: 'FM460', year: 2021, enginePower: 340, weight: 19000 },
    { maxLoad: 14, unit: 'ton' }
  ),
  createResource(
    'plow-truck-03',
    'MAN TGS 26.430',
    'plow_truck',
    'STU 430',
    { manufacturer: 'MAN', model: 'TGS 26.430', year: 2023, enginePower: 320, weight: 18500 },
    { maxLoad: 13, unit: 'ton' }
  ),
  createResource(
    'plow-truck-04',
    'Mercedes-Benz Arocs 2643',
    'plow_truck',
    'VWX 264',
    { manufacturer: 'Mercedes-Benz', model: 'Arocs 2643', year: 2020, enginePower: 315, weight: 17500 },
    { maxLoad: 12, unit: 'ton' }
  ),
];

// 4 Haul Trucks (Materialtransporter)
export const haulTrucks: Resource[] = [
  createResource(
    'haul-truck-01',
    'Scania R580',
    'haul_truck',
    'YZA 580',
    { manufacturer: 'Scania', model: 'R580', year: 2022, enginePower: 430, weight: 19000 },
    { maxLoad: 25, unit: 'ton' }
  ),
  createResource(
    'haul-truck-02',
    'Volvo FH540',
    'haul_truck',
    'BCD 540',
    { manufacturer: 'Volvo', model: 'FH540', year: 2021, enginePower: 400, weight: 18500 },
    { maxLoad: 24, unit: 'ton' }
  ),
  createResource(
    'haul-truck-03',
    'Scania R520',
    'haul_truck',
    'EFG 520',
    { manufacturer: 'Scania', model: 'R520', year: 2023, enginePower: 380, weight: 18000 },
    { maxLoad: 22, unit: 'ton' }
  ),
  createResource(
    'haul-truck-04',
    'MAN TGX 26.560',
    'haul_truck',
    'HIJ 560',
    { manufacturer: 'MAN', model: 'TGX 26.560', year: 2020, enginePower: 410, weight: 19500 },
    { maxLoad: 26, unit: 'ton' }
  ),
];

export const allResources: Resource[] = [
  ...wheelLoaders,
  ...excavators,
  ...plowTrucks,
  ...haulTrucks,
];

export function getResourceById(id: string): Resource | undefined {
  return allResources.find(r => r.id === id);
}

export function getResourcesByType(type: ResourceType): Resource[] {
  return allResources.filter(r => r.type === type);
}
