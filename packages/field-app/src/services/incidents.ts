/**
 * SYLON Field App - Incident Reporting Service
 * Handles deviation/incident reporting with offline support
 */

import type { DeviationType, DeviationSeverity, Coordinates } from '@sylon/shared';
import * as offlineStorage from './offline-storage';
import { getCurrentPosition } from './gps';

export interface Incident {
  id: string;
  jobId?: string;
  type: DeviationType;
  severity: DeviationSeverity;
  title: string;
  description: string;
  coordinates?: Coordinates;
  photos: string[]; // Base64 encoded photos
  createdAt: Date;
  syncedAt?: Date;
}

export interface IncidentFormData {
  type: DeviationType;
  severity: DeviationSeverity;
  title: string;
  description: string;
  jobId?: string;
}

export const INCIDENT_TYPES: { value: DeviationType; label: string }[] = [
  { value: 'delay', label: 'Försening' },
  { value: 'damage', label: 'Skada' },
  { value: 'safety_issue', label: 'Säkerhetsrisk' },
  { value: 'equipment_failure', label: 'Maskinfel' },
  { value: 'weather', label: 'Väder' },
  { value: 'access_issue', label: 'Tillgänglighetsproblem' },
  { value: 'material_shortage', label: 'Materialbrist' },
  { value: 'other', label: 'Övrigt' },
];

export const SEVERITY_LEVELS: { value: DeviationSeverity; label: string; color: string }[] = [
  { value: 'info', label: 'Information', color: '#06b6d4' },
  { value: 'warning', label: 'Varning', color: '#f59e0b' },
  { value: 'error', label: 'Allvarligt', color: '#ef4444' },
  { value: 'critical', label: 'Kritiskt', color: '#dc2626' },
];

// Create and store an incident
export async function createIncident(
  formData: IncidentFormData,
  photos: string[] = []
): Promise<Incident> {
  let coordinates: Coordinates | undefined;
  
  try {
    const position = await getCurrentPosition();
    coordinates = {
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
    };
  } catch (error) {
    console.warn('Could not get GPS position for incident:', error);
  }

  const incident: Incident = {
    id: `incident-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    ...formData,
    coordinates,
    photos,
    createdAt: new Date(),
  };

  // Queue for sync
  await offlineStorage.queueSync('create', 'deviation', incident.id, {
    jobId: incident.jobId,
    type: incident.type,
    severity: incident.severity,
    title: incident.title,
    description: incident.description,
    coordinates: incident.coordinates,
    photos: incident.photos,
  });

  return incident;
}

// Capture photo with timestamp and GPS
export async function capturePhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const base64 = await fileToBase64(file);
        resolve(base64);
      } catch (error) {
        console.error('Failed to capture photo:', error);
        resolve(null);
      }
    };

    input.click();
  });
}

// Convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Add photo to job
export async function addJobPhoto(
  jobId: string,
  photo: string,
  category: 'before' | 'during' | 'after' | 'damage' | 'other' = 'during',
  caption?: string
): Promise<void> {
  let coordinates: Coordinates | undefined;
  
  try {
    const position = await getCurrentPosition();
    coordinates = {
      latitude: position.latitude,
      longitude: position.longitude,
    };
  } catch (error) {
    console.warn('Could not get GPS position for photo:', error);
  }

  await offlineStorage.queueSync('create', 'photo', `photo-${Date.now()}`, {
    jobId,
    photo,
    category,
    caption,
    coordinates,
    timestamp: new Date().toISOString(),
  });
}
