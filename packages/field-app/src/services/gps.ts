/**
 * SYLON Field App - GPS Tracking Service
 */

import type { GeoPosition } from '@sylon/shared';
import { queueGpsReading } from './sync';

type PositionCallback = (position: GeoPosition) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

interface GpsConfig {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  minDistance: number; // meters
}

const defaultConfig: GpsConfig = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
  minDistance: 10,
};

let watchId: number | null = null;
let lastPosition: GeoPosition | null = null;
const positionCallbacks: Set<PositionCallback> = new Set();
const errorCallbacks: Set<ErrorCallback> = new Set();
let currentResourceId: string | null = null;

// Calculate distance between two positions in meters
function calculateDistance(pos1: GeoPosition, pos2: GeoPosition): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
  const dLon = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;
  const lat1 = (pos1.latitude * Math.PI) / 180;
  const lat2 = (pos2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Convert GeolocationPosition to GeoPosition
function toGeoPosition(pos: GeolocationPosition): GeoPosition {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    altitude: pos.coords.altitude ?? undefined,
    accuracy: pos.coords.accuracy,
    timestamp: new Date(pos.timestamp),
    speed: pos.coords.speed ?? undefined,
    heading: pos.coords.heading ?? undefined,
  };
}

// Handle position update
function handlePosition(position: GeolocationPosition, config: GpsConfig): void {
  const geoPosition = toGeoPosition(position);

  // Check if moved enough
  if (lastPosition) {
    const distance = calculateDistance(lastPosition, geoPosition);
    if (distance < config.minDistance) {
      return; // Not moved enough
    }
  }

  lastPosition = geoPosition;

  // Queue for sync
  if (currentResourceId) {
    queueGpsReading(currentResourceId, geoPosition);
  }

  // Notify callbacks
  positionCallbacks.forEach(callback => callback(geoPosition));
}

// Handle position error
function handleError(error: GeolocationPositionError): void {
  console.error('GPS Error:', error.message);
  errorCallbacks.forEach(callback => callback(error));
}

// Start GPS tracking
export function startTracking(
  resourceId: string,
  config: Partial<GpsConfig> = {}
): void {
  if (watchId !== null) {
    stopTracking();
  }

  const fullConfig = { ...defaultConfig, ...config };
  currentResourceId = resourceId;

  if (!navigator.geolocation) {
    console.error('Geolocation not supported');
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    pos => handlePosition(pos, fullConfig),
    handleError,
    {
      enableHighAccuracy: fullConfig.enableHighAccuracy,
      timeout: fullConfig.timeout,
      maximumAge: fullConfig.maximumAge,
    }
  );

  console.log('GPS tracking started for resource:', resourceId);
}

// Stop GPS tracking
export function stopTracking(): void {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    currentResourceId = null;
    console.log('GPS tracking stopped');
  }
}

// Get current position
export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => resolve(toGeoPosition(pos)),
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

// Get last known position
export function getLastPosition(): GeoPosition | null {
  return lastPosition;
}

// Subscribe to position updates
export function onPositionUpdate(callback: PositionCallback): () => void {
  positionCallbacks.add(callback);
  return () => positionCallbacks.delete(callback);
}

// Subscribe to errors
export function onError(callback: ErrorCallback): () => void {
  errorCallbacks.add(callback);
  return () => errorCallbacks.delete(callback);
}

// Check if tracking is active
export function isTracking(): boolean {
  return watchId !== null;
}
