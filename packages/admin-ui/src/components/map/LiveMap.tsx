/**
 * SYLON Admin UI - Live Map Component
 * Real-time resource tracking on interactive map
 */

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { SUNDSVALL_CENTER, RESOURCE_TYPE_LABELS, DEMO_GARAGE, DEMO_QUARRY_NORTH, DEMO_QUARRY_SOUTH, DEMO_SNOW_DUMP } from '@sylon/shared';
import type { GeoPosition, Resource, ResourceType } from '@sylon/shared';
import { Badge } from '../ui';
import 'leaflet/dist/leaflet.css';
import './map.css';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Resource type colors
const RESOURCE_COLORS: Record<ResourceType, string> = {
  wheel_loader: '#f59e0b',
  excavator: '#8b5cf6',
  plow_truck: '#06b6d4',
  haul_truck: '#22c55e',
  dump_truck: '#10b981',
  tanker: '#6366f1',
  crane: '#ec4899',
};

// Create custom marker icons
function createMarkerIcon(type: ResourceType, heading: number = 0): L.DivIcon {
  const color = RESOURCE_COLORS[type] ?? '#6b7280';
  return L.divIcon({
    className: 'resource-marker',
    html: `
      <div class="marker-container" style="--marker-color: ${color}; --rotation: ${heading}deg">
        <div class="marker-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
        <div class="marker-pulse"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
}

// Map auto-panner component
function MapController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom ?? map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

interface ResourcePosition {
  resource: Resource;
  position: GeoPosition;
}

interface LiveMapProps {
  resources: ResourcePosition[];
  selectedResourceId?: string;
  onResourceSelect?: (resourceId: string) => void;
  showTrails?: boolean;
  filterTypes?: ResourceType[];
}

export const LiveMap: React.FC<LiveMapProps> = ({
  resources,
  selectedResourceId,
  onResourceSelect,
  showTrails = false,
  filterTypes,
}) => {
  const [trails, setTrails] = useState<Map<string, [number, number][]>>(new Map());
  
  // Filter resources by type
  const filteredResources = filterTypes
    ? resources.filter(r => filterTypes.includes(r.resource.type))
    : resources;
  
  // Update trails
  useEffect(() => {
    if (showTrails) {
      setTrails(prev => {
        const next = new Map(prev);
        filteredResources.forEach(({ resource, position }) => {
          const trail = next.get(resource.id) ?? [];
          const newPoint: [number, number] = [position.latitude, position.longitude];
          // Only add if significantly moved
          const last = trail[trail.length - 1];
          if (!last || Math.abs(last[0] - newPoint[0]) > 0.0001 || Math.abs(last[1] - newPoint[1]) > 0.0001) {
            next.set(resource.id, [...trail.slice(-50), newPoint]);
          }
        });
        return next;
      });
    }
  }, [filteredResources, showTrails]);

  const selectedResource = filteredResources.find(r => r.resource.id === selectedResourceId);
  const center: [number, number] = selectedResource
    ? [selectedResource.position.latitude, selectedResource.position.longitude]
    : [SUNDSVALL_CENTER.latitude, SUNDSVALL_CENTER.longitude];

  return (
    <div className="live-map-container">
      <MapContainer
        center={center}
        zoom={12}
        className="live-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={center} />

        {/* Resource trails */}
        {showTrails && Array.from(trails.entries()).map(([resourceId, trail]) => {
          const resource = filteredResources.find(r => r.resource.id === resourceId);
          if (!resource || trail.length < 2) return null;
          return (
            <Polyline
              key={`trail-${resourceId}`}
              positions={trail}
              color={RESOURCE_COLORS[resource.resource.type] ?? '#6b7280'}
              weight={3}
              opacity={0.5}
              dashArray="5, 10"
            />
          );
        })}

        {/* Resource markers */}
        {filteredResources.map(({ resource, position }) => (
          <Marker
            key={resource.id}
            position={[position.latitude, position.longitude]}
            icon={createMarkerIcon(resource.type, position.heading)}
            eventHandlers={{
              click: () => onResourceSelect?.(resource.id),
            }}
          >
            <Popup className="resource-popup">
              <div className="popup-content">
                <div className="popup-header">
                  <strong>{resource.name}</strong>
                  <Badge variant={resource.status === 'on_job' ? 'success' : 'default'} size="sm">
                    {resource.status}
                  </Badge>
                </div>
                <div className="popup-details">
                  <div className="popup-row">
                    <span className="popup-label">Typ:</span>
                    <span>{RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}</span>
                  </div>
                  <div className="popup-row">
                    <span className="popup-label">Reg.nr:</span>
                    <span>{resource.registrationNumber}</span>
                  </div>
                  <div className="popup-row">
                    <span className="popup-label">Hastighet:</span>
                    <span>{Math.round(position.speed ?? 0)} km/h</span>
                  </div>
                  <div className="popup-row">
                    <span className="popup-label">Bränsle:</span>
                    <span>{Math.round(resource.fuelStatus.currentLevel)}%</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Sites - Garage HQ */}
        <Circle
          center={[DEMO_GARAGE.latitude, DEMO_GARAGE.longitude]}
          radius={150}
          pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.2 }}
        >
          <Popup>
            <strong>Garage HQ</strong>
            <br />
            Huvuddepå
          </Popup>
        </Circle>

        {/* Sites - Quarry North */}
        <Circle
          center={[DEMO_QUARRY_NORTH.latitude, DEMO_QUARRY_NORTH.longitude]}
          radius={500}
          pathOptions={{ color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 0.2 }}
        >
          <Popup>
            <strong>Bergtäkt Norra</strong>
            <br />
            Material: 0-32, 32-64, Bergkross
          </Popup>
        </Circle>

        {/* Sites - Quarry South */}
        <Circle
          center={[DEMO_QUARRY_SOUTH.latitude, DEMO_QUARRY_SOUTH.longitude]}
          radius={400}
          pathOptions={{ color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 0.2 }}
        >
          <Popup>
            <strong>Bergtäkt Södra</strong>
            <br />
            Material: Sand, Grus, Makadam
          </Popup>
        </Circle>

        {/* Sites - Snow Dump */}
        <Circle
          center={[DEMO_SNOW_DUMP.latitude, DEMO_SNOW_DUMP.longitude]}
          radius={300}
          pathOptions={{ color: '#06b6d4', fillColor: '#22d3ee', fillOpacity: 0.2 }}
        >
          <Popup>
            <strong>Snötipp Norra</strong>
            <br />
            Snödeponi för vinterväghållning
          </Popup>
        </Circle>
      </MapContainer>
    </div>
  );
};

export default LiveMap;
