/**
 * SYLON Utility Functions
 */

import type { Coordinates, GeoPosition } from '../types/core.js';

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  from: Coordinates,
  to: Coordinates
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate bearing between two coordinates
 */
export function calculateBearing(
  from: Coordinates,
  to: Coordinates
): number {
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return bearing;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Interpolate position between two coordinates
 */
export function interpolatePosition(
  from: Coordinates,
  to: Coordinates,
  fraction: number
): Coordinates {
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * fraction,
    longitude: from.longitude + (to.longitude - from.longitude) * fraction,
  };
}

/**
 * Generate random position within bounds
 */
export function randomPositionInBounds(
  north: number,
  south: number,
  east: number,
  west: number
): Coordinates {
  return {
    latitude: south + Math.random() * (north - south),
    longitude: west + Math.random() * (east - west),
  };
}

/**
 * Check if point is within radius of center
 */
export function isWithinRadius(
  point: Coordinates,
  center: Coordinates,
  radiusKm: number
): boolean {
  return calculateDistance(point, center) <= radiusKm;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(coords: Coordinates): string {
  return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}-${timestamp}-${randomPart}` : `${timestamp}-${randomPart}`;
}

/**
 * Format duration in minutes to human readable
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

/**
 * Parse Swedish date format
 */
export function formatSwedishDate(date: Date): string {
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Parse Swedish time format
 */
export function formatSwedishTime(date: Date): string {
  return date.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format Swedish datetime
 */
export function formatSwedishDateTime(date: Date): string {
  return `${formatSwedishDate(date)} ${formatSwedishTime(date)}`;
}
