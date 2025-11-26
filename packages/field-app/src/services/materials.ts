/**
 * SYLON Field App - Materials & Loads Service
 * Handles material loading/unloading logging
 */

import * as offlineStorage from './offline-storage';
import { MATERIALS } from '@sylon/shared';

export interface MaterialLoad {
  id: string;
  jobId: string;
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  type: 'load' | 'unload';
  sourceId?: string;
  sourceName?: string;
  destinationId?: string;
  destinationName?: string;
  weight?: number; // kg
  timestamp: Date;
  syncedAt?: Date;
}

export interface MaterialFormData {
  jobId: string;
  materialId: string;
  quantity: number;
  type: 'load' | 'unload';
  sourceId?: string;
  destinationId?: string;
  weight?: number;
}

// Get available materials
export function getAvailableMaterials(): typeof MATERIALS {
  return MATERIALS;
}

// Create a material load entry
export async function createMaterialLoad(formData: MaterialFormData): Promise<MaterialLoad> {
  const material = MATERIALS.find(m => m.id === formData.materialId);
  
  const load: MaterialLoad = {
    id: `load-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    ...formData,
    materialName: material?.name || 'Okänt material',
    unit: material?.unit || 'ton',
    timestamp: new Date(),
  };

  // Queue for sync
  await offlineStorage.queueSync('create', 'material_load', load.id, load);

  return load;
}

// Calculate total for a material type
export function calculateMaterialTotal(
  loads: MaterialLoad[],
  materialId: string
): { loaded: number; unloaded: number; net: number } {
  const filtered = loads.filter(l => l.materialId === materialId);
  const loaded = filtered
    .filter(l => l.type === 'load')
    .reduce((sum, l) => sum + l.quantity, 0);
  const unloaded = filtered
    .filter(l => l.type === 'unload')
    .reduce((sum, l) => sum + l.quantity, 0);
  
  return {
    loaded,
    unloaded,
    net: loaded - unloaded,
  };
}
