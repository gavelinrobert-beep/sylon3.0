/**
 * SYLON Field App - Daily Workflow Service
 * Handles Start Day checklist and End Day summary
 */

import * as offlineStorage from './offline-storage';

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  required: boolean;
  category: 'vehicle' | 'safety' | 'equipment' | 'fuel';
}

export interface DayStartChecklist {
  id: string;
  date: Date;
  resourceId: string;
  operatorId: string;
  items: ChecklistItem[];
  fuelLevel: number;
  odometerReading?: number;
  notes?: string;
  completedAt?: Date;
}

export interface DaySummary {
  id: string;
  date: Date;
  resourceId: string;
  operatorId: string;
  startTime: Date;
  endTime: Date;
  totalWorkTime: number; // minutes
  breakTime: number; // minutes
  completedJobs: number;
  totalDistance?: number; // km
  fuelUsed?: number; // liters
  endOdometer?: number;
  machineHours?: number;
  defectsReported: string[];
  notes?: string;
}

export const DEFAULT_CHECKLIST_ITEMS: Omit<ChecklistItem, 'checked'>[] = [
  // Vehicle condition
  { id: 'lights', label: 'Belysning fungerar', required: true, category: 'vehicle' },
  { id: 'tires', label: 'Däck och lufttryck OK', required: true, category: 'vehicle' },
  { id: 'wipers', label: 'Vindrutetorkare fungerar', required: true, category: 'vehicle' },
  { id: 'mirrors', label: 'Speglar rena och inställda', required: true, category: 'vehicle' },
  { id: 'body', label: 'Kaross utan skador', required: false, category: 'vehicle' },
  
  // Safety
  { id: 'seatbelt', label: 'Säkerhetsbälte OK', required: true, category: 'safety' },
  { id: 'first_aid', label: 'Första hjälpen-kit finns', required: true, category: 'safety' },
  { id: 'warning_triangle', label: 'Varningstriangel finns', required: true, category: 'safety' },
  { id: 'fire_extinguisher', label: 'Brandsläckare finns', required: false, category: 'safety' },
  { id: 'hi_vis', label: 'Reflexväst finns', required: true, category: 'safety' },
  
  // Equipment
  { id: 'plow', label: 'Plog/skopa monterad korrekt', required: false, category: 'equipment' },
  { id: 'tools', label: 'Verktyg finns', required: false, category: 'equipment' },
  { id: 'radio', label: 'Radio/kommunikation fungerar', required: true, category: 'equipment' },
  
  // Fuel
  { id: 'fuel_check', label: 'Bränslenivå kontrollerad', required: true, category: 'fuel' },
  { id: 'adblue', label: 'AdBlue-nivå OK', required: false, category: 'fuel' },
];

const DAY_START_KEY = 'sylon_day_start';
const DAY_SUMMARY_KEY = 'sylon_day_summary';

// Get today's date string
function getTodayString(): string {
  return new Date().toISOString().split('T')[0]!;
}

// Check if day has been started
export async function isDayStarted(): Promise<boolean> {
  const checklist = await offlineStorage.getSetting<DayStartChecklist>(
    `${DAY_START_KEY}_${getTodayString()}`
  );
  return !!checklist?.completedAt;
}

// Get today's checklist (create new if needed)
export async function getTodayChecklist(
  resourceId: string,
  operatorId: string
): Promise<DayStartChecklist> {
  const key = `${DAY_START_KEY}_${getTodayString()}`;
  let checklist = await offlineStorage.getSetting<DayStartChecklist>(key);
  
  if (!checklist) {
    checklist = {
      id: `checklist-${Date.now()}`,
      date: new Date(),
      resourceId,
      operatorId,
      items: DEFAULT_CHECKLIST_ITEMS.map(item => ({ ...item, checked: false })),
      fuelLevel: 0,
    };
    await offlineStorage.setSetting(key, checklist);
  }
  
  return checklist;
}

// Update checklist item
export async function updateChecklistItem(
  itemId: string,
  checked: boolean,
  resourceId: string,
  operatorId: string
): Promise<DayStartChecklist> {
  const checklist = await getTodayChecklist(resourceId, operatorId);
  
  const item = checklist.items.find(i => i.id === itemId);
  if (item) {
    item.checked = checked;
  }
  
  const key = `${DAY_START_KEY}_${getTodayString()}`;
  await offlineStorage.setSetting(key, checklist);
  
  return checklist;
}

// Update fuel level
export async function updateFuelLevel(
  fuelLevel: number,
  resourceId: string,
  operatorId: string
): Promise<DayStartChecklist> {
  const checklist = await getTodayChecklist(resourceId, operatorId);
  checklist.fuelLevel = fuelLevel;
  
  const key = `${DAY_START_KEY}_${getTodayString()}`;
  await offlineStorage.setSetting(key, checklist);
  
  return checklist;
}

// Complete day start checklist
export async function completeDayStart(
  resourceId: string,
  operatorId: string,
  notes?: string
): Promise<DayStartChecklist> {
  const checklist = await getTodayChecklist(resourceId, operatorId);
  checklist.completedAt = new Date();
  checklist.notes = notes;
  
  const key = `${DAY_START_KEY}_${getTodayString()}`;
  await offlineStorage.setSetting(key, checklist);
  
  // Queue for sync
  await offlineStorage.queueSync('create', 'day_start', checklist.id, checklist);
  
  return checklist;
}

// Check if all required items are checked
export function areRequiredItemsComplete(checklist: DayStartChecklist): boolean {
  return checklist.items
    .filter(item => item.required)
    .every(item => item.checked);
}

// Get today's summary (for end of day)
export async function getTodaySummary(
  resourceId: string,
  operatorId: string,
  completedJobsCount: number
): Promise<DaySummary> {
  const dayStart = await getTodayChecklist(resourceId, operatorId);
  const now = new Date();
  
  const summary: DaySummary = {
    id: `summary-${Date.now()}`,
    date: new Date(),
    resourceId,
    operatorId,
    startTime: dayStart.completedAt || now,
    endTime: now,
    totalWorkTime: dayStart.completedAt 
      ? Math.round((now.getTime() - dayStart.completedAt.getTime()) / 60000)
      : 0,
    breakTime: 0, // Would be calculated from actual breaks
    completedJobs: completedJobsCount,
    defectsReported: [],
  };
  
  return summary;
}

// Complete end of day
export async function completeEndDay(
  summary: DaySummary,
  notes?: string
): Promise<DaySummary> {
  summary.notes = notes;
  
  const key = `${DAY_SUMMARY_KEY}_${getTodayString()}`;
  await offlineStorage.setSetting(key, summary);
  
  // Queue for sync
  await offlineStorage.queueSync('create', 'day_summary', summary.id, summary);
  
  return summary;
}
