/**
 * SYLON GPS Simulation Service
 * Simulates realistic GPS data for resources in Sundsvall area
 */

import type { Resource, GeoPosition, Coordinates } from '@sylon/shared';
import { DEMO_GARAGE, DEMO_QUARRY_NORTH, DEMO_QUARRY_SOUTH, PLOW_ROUTES, PROJECT_AREAS, calculateDistance, interpolatePosition, calculateBearing } from '@sylon/shared';
import { allResources } from '../data/resources.js';
import { allJobs } from '../data/jobs.js';

interface SimulationState {
  resourceId: string;
  currentPosition: Coordinates;
  targetPosition: Coordinates;
  speed: number; // km/h
  heading: number;
  waypoints: Coordinates[];
  waypointIndex: number;
  status: 'idle' | 'moving' | 'working' | 'returning';
  lastUpdate: Date;
}

const simulationStates: Map<string, SimulationState> = new Map();

// Initialize simulation states for all resources
export function initializeSimulation(): void {
  allResources.forEach(resource => {
    const state = createInitialState(resource);
    simulationStates.set(resource.id, state);
  });
  console.log(`GPS Simulation initialized for ${simulationStates.size} resources`);
}

function createInitialState(resource: Resource): SimulationState {
  let waypoints: Coordinates[] = [];
  let status: SimulationState['status'] = 'idle';
  let speed = 0;
  
  // Assign routes based on resource type
  switch (resource.type) {
    case 'plow_truck': {
      // Plow trucks follow plow routes
      const routeIndex = parseInt(resource.id.split('-')[2] || '1') - 1;
      const route = PLOW_ROUTES[routeIndex % PLOW_ROUTES.length];
      waypoints = route?.waypoints.map(w => ({ latitude: w.lat, longitude: w.lng })) ?? [];
      status = 'moving';
      speed = 30 + Math.random() * 20;
      break;
    }
    case 'haul_truck': {
      // Haul trucks go between quarries and project areas
      const projectIndex = parseInt(resource.id.split('-')[2] || '1') - 1;
      const project = PROJECT_AREAS[projectIndex % PROJECT_AREAS.length];
      const quarry = projectIndex % 2 === 0 ? DEMO_QUARRY_NORTH : DEMO_QUARRY_SOUTH;
      waypoints = [
        DEMO_GARAGE,
        quarry,
        project?.coordinates ?? DEMO_GARAGE,
        DEMO_GARAGE,
      ];
      status = 'moving';
      speed = 40 + Math.random() * 30;
      break;
    }
    case 'wheel_loader': {
      // Wheel loaders work at quarries
      const loaderIndex = parseInt(resource.id.split('-')[1] || '1');
      const quarry = loaderIndex <= 2 ? DEMO_QUARRY_NORTH : DEMO_QUARRY_SOUTH;
      waypoints = [
        { latitude: quarry.latitude + (Math.random() - 0.5) * 0.002, longitude: quarry.longitude + (Math.random() - 0.5) * 0.002 },
        { latitude: quarry.latitude + (Math.random() - 0.5) * 0.002, longitude: quarry.longitude + (Math.random() - 0.5) * 0.002 },
        { latitude: quarry.latitude + (Math.random() - 0.5) * 0.002, longitude: quarry.longitude + (Math.random() - 0.5) * 0.002 },
      ];
      status = 'working';
      speed = 5 + Math.random() * 10;
      break;
    }
    case 'excavator': {
      // Excavators work at project areas
      const excIndex = parseInt(resource.id.split('-')[1] || '1') - 1;
      const project = PROJECT_AREAS[excIndex % PROJECT_AREAS.length];
      const center = project?.coordinates ?? DEMO_GARAGE;
      waypoints = [
        { latitude: center.latitude + (Math.random() - 0.5) * 0.001, longitude: center.longitude + (Math.random() - 0.5) * 0.001 },
        { latitude: center.latitude + (Math.random() - 0.5) * 0.001, longitude: center.longitude + (Math.random() - 0.5) * 0.001 },
      ];
      status = 'working';
      speed = 2 + Math.random() * 5;
      break;
    }
    default:
      waypoints = [DEMO_GARAGE];
  }
  
  const currentPosition = waypoints[0] ?? DEMO_GARAGE;
  const targetPosition = waypoints[1] ?? waypoints[0] ?? DEMO_GARAGE;
  
  return {
    resourceId: resource.id,
    currentPosition,
    targetPosition,
    speed,
    heading: calculateBearing(currentPosition, targetPosition),
    waypoints,
    waypointIndex: 0,
    status,
    lastUpdate: new Date(),
  };
}

// Update simulation - call this periodically
export function updateSimulation(): Map<string, GeoPosition> {
  const positions = new Map<string, GeoPosition>();
  const now = new Date();
  
  simulationStates.forEach((state, resourceId) => {
    const deltaTime = (now.getTime() - state.lastUpdate.getTime()) / 1000; // seconds
    
    if (state.status === 'idle') {
      // Idle resources stay in place with slight jitter
      state.currentPosition = addJitter(state.currentPosition, 0.00001);
    } else {
      // Calculate movement
      const distanceToTarget = calculateDistance(state.currentPosition, state.targetPosition);
      const distanceToMove = (state.speed / 3600) * deltaTime; // km per second
      
      if (distanceToMove >= distanceToTarget) {
        // Reached waypoint, move to next
        state.waypointIndex++;
        if (state.waypointIndex >= state.waypoints.length) {
          // Loop back to start
          state.waypointIndex = 0;
        }
        state.currentPosition = state.targetPosition;
        state.targetPosition = state.waypoints[state.waypointIndex] ?? state.currentPosition;
        state.heading = calculateBearing(state.currentPosition, state.targetPosition);
      } else {
        // Move towards target
        const fraction = distanceToMove / distanceToTarget;
        state.currentPosition = interpolatePosition(state.currentPosition, state.targetPosition, fraction);
        
        // Add slight variation to speed
        state.speed += (Math.random() - 0.5) * 2;
        state.speed = Math.max(5, Math.min(80, state.speed));
      }
    }
    
    state.lastUpdate = now;
    
    const position: GeoPosition = {
      latitude: state.currentPosition.latitude,
      longitude: state.currentPosition.longitude,
      timestamp: now,
      speed: state.status === 'idle' ? 0 : state.speed,
      heading: state.heading,
      accuracy: 3 + Math.random() * 5,
    };
    
    positions.set(resourceId, position);
  });
  
  return positions;
}

function addJitter(coords: Coordinates, amount: number): Coordinates {
  return {
    latitude: coords.latitude + (Math.random() - 0.5) * amount,
    longitude: coords.longitude + (Math.random() - 0.5) * amount,
  };
}

// Get current position for a resource
export function getResourcePosition(resourceId: string): GeoPosition | undefined {
  const state = simulationStates.get(resourceId);
  if (!state) return undefined;
  
  return {
    latitude: state.currentPosition.latitude,
    longitude: state.currentPosition.longitude,
    timestamp: state.lastUpdate,
    speed: state.status === 'idle' ? 0 : state.speed,
    heading: state.heading,
    accuracy: 5,
  };
}

// Get all current positions
export function getAllPositions(): Map<string, GeoPosition> {
  const positions = new Map<string, GeoPosition>();
  
  simulationStates.forEach((state, resourceId) => {
    positions.set(resourceId, {
      latitude: state.currentPosition.latitude,
      longitude: state.currentPosition.longitude,
      timestamp: state.lastUpdate,
      speed: state.status === 'idle' ? 0 : state.speed,
      heading: state.heading,
      accuracy: 5,
    });
  });
  
  return positions;
}

// Get simulation state for debugging
export function getSimulationState(resourceId: string): SimulationState | undefined {
  return simulationStates.get(resourceId);
}
