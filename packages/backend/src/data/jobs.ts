/**
 * SYLON Demo Data - Jobs
 * Sample jobs for demonstration
 */

import type { Job, JobType, JobStatus, JobPriority } from '@sylon/shared';
import { DEMO_COMPANY, PROJECT_AREAS, PLOW_ROUTES, DEMO_QUARRY_NORTH, DEMO_QUARRY_SOUTH } from '@sylon/shared';

const now = new Date();

function createJob(
  id: string,
  jobNumber: string,
  type: JobType,
  title: string,
  description: string,
  location: { name: string; lat: number; lng: number },
  resourceIds: string[],
  status: JobStatus = 'scheduled',
  priority: JobPriority = 'normal'
): Job {
  const scheduledStart = new Date(now.getTime() + Math.random() * 4 * 60 * 60 * 1000);
  const scheduledEnd = new Date(scheduledStart.getTime() + (2 + Math.random() * 4) * 60 * 60 * 1000);
  
  return {
    id,
    companyId: DEMO_COMPANY.id,
    jobNumber,
    type,
    title,
    description,
    priority,
    status,
    location: {
      name: location.name,
      coordinates: { latitude: location.lat, longitude: location.lng },
    },
    assignedResources: resourceIds.map(resourceId => ({
      resourceId,
      assignedAt: now,
      status: 'assigned' as const,
    })),
    scheduledTime: {
      start: scheduledStart,
      end: scheduledEnd,
    },
    estimatedDuration: Math.floor((scheduledEnd.getTime() - scheduledStart.getTime()) / 60000),
    timeEntries: [],
    photos: [],
    deviations: [],
    notes: [],
    invoiceStatus: 'pending',
    createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    updatedAt: now,
    createdBy: 'system',
    updatedBy: 'system',
  };
}

// Snow plowing jobs
export const plowingJobs: Job[] = [
  createJob(
    'job-plow-001',
    'PL-2024-001',
    'snow_plowing',
    'Plogning E4 Norr',
    'Snöplogning av E4 norrgående mellan Sundsvall och Njurunda',
    { name: 'E4 Norr', lat: 62.4300, lng: 17.3400 },
    ['plow-truck-01'],
    'in_progress',
    'high'
  ),
  createJob(
    'job-plow-002',
    'PL-2024-002',
    'snow_plowing',
    'Plogning Stadscentrum',
    'Plogning av gator i Sundsvalls centrum',
    { name: 'Stadscentrum', lat: 62.3880, lng: 17.3100 },
    ['plow-truck-02'],
    'scheduled',
    'high'
  ),
  createJob(
    'job-plow-003',
    'PL-2024-003',
    'snow_plowing',
    'Plogning Industriområdet',
    'Snöröjning av industriområdet väster om centrum',
    { name: 'Industriområdet', lat: 62.4050, lng: 17.2700 },
    ['plow-truck-03'],
    'scheduled',
    'normal'
  ),
  createJob(
    'job-salt-001',
    'SA-2024-001',
    'salting',
    'Saltning Södermalm',
    'Saltning av vägar och gångbanor på Södermalm',
    { name: 'Södermalm', lat: 62.3650, lng: 17.2900 },
    ['plow-truck-04'],
    'scheduled',
    'normal'
  ),
];

// Gravel transport jobs
export const transportJobs: Job[] = [
  createJob(
    'job-haul-001',
    'TR-2024-001',
    'gravel_transport',
    'Transport 0-32 till Norra Kajen',
    'Leverans av 0-32 krossad sten från Bergtäkt Norra till byggprojekt Norra Kajen',
    { name: 'Norra Kajen', lat: PROJECT_AREAS[0]!.coordinates.latitude, lng: PROJECT_AREAS[0]!.coordinates.longitude },
    ['haul-truck-01'],
    'in_progress',
    'normal'
  ),
  createJob(
    'job-haul-002',
    'TR-2024-002',
    'gravel_transport',
    'Transport Makadam till Timrå',
    'Leverans av makadam från Bergtäkt Södra till vägbygge Timrå',
    { name: 'Vägbygge Timrå', lat: PROJECT_AREAS[1]!.coordinates.latitude, lng: PROJECT_AREAS[1]!.coordinates.longitude },
    ['haul-truck-02'],
    'scheduled',
    'normal'
  ),
  createJob(
    'job-haul-003',
    'TR-2024-003',
    'gravel_transport',
    'Transport Sand till Industrimark',
    'Leverans av sand från Bergtäkt Södra till industrimark expansion',
    { name: 'Industrimark expansion', lat: PROJECT_AREAS[2]!.coordinates.latitude, lng: PROJECT_AREAS[2]!.coordinates.longitude },
    ['haul-truck-03'],
    'scheduled',
    'low'
  ),
  createJob(
    'job-haul-004',
    'TR-2024-004',
    'material_delivery',
    'Sandleverans till väghållning',
    'Transport av sandningssand till kommunens väghållningsdepå',
    { name: 'Väghållningsdepå', lat: 62.3950, lng: 17.3200 },
    ['haul-truck-04'],
    'scheduled',
    'high'
  ),
];

// Excavation jobs
export const excavationJobs: Job[] = [
  createJob(
    'job-exc-001',
    'EX-2024-001',
    'excavation',
    'Schaktning Norra Kajen',
    'Grundschakt för nytt bostadshus vid Norra Kajen',
    { name: 'Norra Kajen', lat: PROJECT_AREAS[0]!.coordinates.latitude, lng: PROJECT_AREAS[0]!.coordinates.longitude },
    ['excavator-01'],
    'in_progress',
    'normal'
  ),
  createJob(
    'job-exc-002',
    'EX-2024-002',
    'excavation',
    'Grävning för VA-ledning',
    'Nedläggning av ny VA-ledning längs Storgatan',
    { name: 'Storgatan', lat: 62.3900, lng: 17.3050 },
    ['excavator-02'],
    'scheduled',
    'high'
  ),
  createJob(
    'job-exc-003',
    'EX-2024-003',
    'site_preparation',
    'Markberedning Industrimark',
    'Markberedning för industrimark expansion',
    { name: 'Industrimark expansion', lat: PROJECT_AREAS[2]!.coordinates.latitude, lng: PROJECT_AREAS[2]!.coordinates.longitude },
    ['excavator-03', 'loader-02'],
    'scheduled',
    'normal'
  ),
  createJob(
    'job-exc-004',
    'EX-2024-004',
    'excavation',
    'Schaktning för parkeringsplats',
    'Schaktning och planering av ny parkeringsplats vid köpcentrum',
    { name: 'Köpcentrum P-plats', lat: 62.3920, lng: 17.2950 },
    ['excavator-04'],
    'scheduled',
    'low'
  ),
];

// Loading jobs (wheel loaders at quarries)
export const loadingJobs: Job[] = [
  createJob(
    'job-load-001',
    'LD-2024-001',
    'loading',
    'Lastning Bergtäkt Norra',
    'Lastning av material på transportfordon vid Bergtäkt Norra',
    { name: 'Bergtäkt Norra', lat: DEMO_QUARRY_NORTH.latitude, lng: DEMO_QUARRY_NORTH.longitude },
    ['loader-01'],
    'in_progress',
    'normal'
  ),
  createJob(
    'job-load-002',
    'LD-2024-002',
    'loading',
    'Lastning Bergtäkt Södra',
    'Lastning av sand och grus på transportfordon vid Bergtäkt Södra',
    { name: 'Bergtäkt Södra', lat: DEMO_QUARRY_SOUTH.latitude, lng: DEMO_QUARRY_SOUTH.longitude },
    ['loader-03'],
    'in_progress',
    'normal'
  ),
  createJob(
    'job-load-003',
    'LD-2024-003',
    'loading',
    'Lastning sandningssand',
    'Lastning av sandningssand för vinterväghållning',
    { name: 'Bergtäkt Södra', lat: DEMO_QUARRY_SOUTH.latitude, lng: DEMO_QUARRY_SOUTH.longitude },
    ['loader-04'],
    'scheduled',
    'high'
  ),
  createJob(
    'job-load-004',
    'LD-2024-004',
    'loading',
    'Materialhantering Norra Kajen',
    'Lastning och förflyttning av material på byggarbetsplats Norra Kajen',
    { name: 'Norra Kajen', lat: PROJECT_AREAS[0]!.coordinates.latitude, lng: PROJECT_AREAS[0]!.coordinates.longitude },
    ['loader-02'],
    'scheduled',
    'normal'
  ),
];

export const allJobs: Job[] = [
  ...plowingJobs,
  ...transportJobs,
  ...excavationJobs,
  ...loadingJobs,
];

export function getJobById(id: string): Job | undefined {
  return allJobs.find(j => j.id === id);
}

export function getJobsByStatus(status: JobStatus): Job[] {
  return allJobs.filter(j => j.status === status);
}

export function getJobsByResource(resourceId: string): Job[] {
  return allJobs.filter(j => j.assignedResources.some(r => r.resourceId === resourceId));
}
