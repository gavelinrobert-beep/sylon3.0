/**
 * SYLON Admin UI - Resources View
 * Resource list and detail view
 */

import React, { useState } from 'react';
import {
  Truck,
  Fuel,
  MapPin,
  Clock,
  AlertCircle,
  Grid,
  List,
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, Tabs } from '../ui';
import { LiveMap } from '../map/LiveMap';
import { RESOURCE_TYPE_LABELS } from '@sylon/shared';
import type { Resource, GeoPosition, ResourceType } from '@sylon/shared';
import './resources.css';

interface ResourcesViewProps {
  resources: { resource: Resource; position: GeoPosition }[];
}

const STATUS_LABELS: Record<string, string> = {
  available: 'Ledig',
  on_job: 'På uppdrag',
  en_route: 'Under transport',
  paused: 'Paus',
  maintenance: 'Service',
  offline: 'Offline',
  error: 'Fel',
};

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  available: 'success',
  on_job: 'info',
  en_route: 'info',
  paused: 'warning',
  maintenance: 'warning',
  offline: 'default',
  error: 'danger',
};

export const ResourcesView: React.FC<ResourcesViewProps> = ({ resources }) => {
  const [selectedType, setSelectedType] = useState<ResourceType | 'all'>('all');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredResources = selectedType === 'all'
    ? resources
    : resources.filter(r => r.resource.type === selectedType);

  const selectedResource = resources.find(r => r.resource.id === selectedResourceId);

  const resourceTypes: { id: ResourceType | 'all'; label: string }[] = [
    { id: 'all', label: 'Alla' },
    { id: 'wheel_loader', label: 'Hjullastare' },
    { id: 'excavator', label: 'Grävmaskiner' },
    { id: 'plow_truck', label: 'Plogbilar' },
    { id: 'haul_truck', label: 'Lastbilar' },
  ];

  return (
    <div className="resources-view">
      {/* Toolbar */}
      <div className="resources-toolbar">
        <div className="toolbar-filters">
          <Tabs
            tabs={resourceTypes.map(t => ({ id: t.id, label: t.label }))}
            activeTab={selectedType}
            onChange={(id) => setSelectedType(id as ResourceType | 'all')}
          />
        </div>
        <div className="toolbar-actions">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'secondary'}
            size="sm"
            icon={<Grid size={16} />}
            onClick={() => setViewMode('grid')}
          />
          <Button
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            size="sm"
            icon={<List size={16} />}
            onClick={() => setViewMode('list')}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="resources-content">
        {/* Resource grid/list */}
        <div className={`resources-grid ${viewMode === 'list' ? 'resources-list' : ''}`}>
          {filteredResources.map(({ resource, position }) => (
            <Card
              key={resource.id}
              className={`resource-card ${selectedResourceId === resource.id ? 'resource-card-selected' : ''}`}
              hover
              onClick={() => setSelectedResourceId(resource.id)}
            >
              <div className="resource-card-content">
                <div className="resource-header">
                  <div className="resource-icon" style={{
                    backgroundColor:
                      resource.type === 'wheel_loader' ? 'var(--color-wheel-loader)' :
                      resource.type === 'excavator' ? 'var(--color-excavator)' :
                      resource.type === 'plow_truck' ? 'var(--color-plow-truck)' :
                      resource.type === 'haul_truck' ? 'var(--color-haul-truck)' :
                      '#6b7280'
                  }}>
                    <Truck size={20} />
                  </div>
                  <div className="resource-info">
                    <h4 className="resource-name">{resource.name}</h4>
                    <span className="resource-type">
                      {RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}
                    </span>
                  </div>
                  <Badge variant={STATUS_VARIANTS[resource.status] ?? 'default'} size="sm">
                    {STATUS_LABELS[resource.status] ?? resource.status}
                  </Badge>
                </div>

                <div className="resource-details">
                  <div className="resource-detail">
                    <span className="detail-label">Reg.nr</span>
                    <span className="detail-value">{resource.registrationNumber}</span>
                  </div>
                  <div className="resource-detail">
                    <Fuel size={14} />
                    <span className="detail-value">{Math.round(resource.fuelStatus.currentLevel)}%</span>
                  </div>
                  <div className="resource-detail">
                    <Clock size={14} />
                    <span className="detail-value">{Math.round(resource.operatingHours)}h</span>
                  </div>
                  <div className="resource-detail">
                    <MapPin size={14} />
                    <span className="detail-value">{Math.round(position.speed ?? 0)} km/h</span>
                  </div>
                </div>

                {resource.errorCodes.length > 0 && (
                  <div className="resource-errors">
                    <AlertCircle size={14} />
                    <span>{resource.errorCodes.length} felkoder</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Detail panel / Map */}
        <div className="resources-detail-panel">
          {selectedResource ? (
            <Card className="detail-card">
              <CardHeader
                title={selectedResource.resource.name}
                subtitle={RESOURCE_TYPE_LABELS[selectedResource.resource.type]}
              />
              <div className="detail-map">
                <LiveMap
                  resources={[selectedResource]}
                  selectedResourceId={selectedResourceId ?? undefined}
                  showTrails
                />
              </div>
              <div className="detail-info">
                <div className="detail-section">
                  <h5>Specifikationer</h5>
                  <div className="detail-grid">
                    <div className="detail-row">
                      <span>Tillverkare</span>
                      <span>{selectedResource.resource.specifications.manufacturer}</span>
                    </div>
                    <div className="detail-row">
                      <span>Modell</span>
                      <span>{selectedResource.resource.specifications.model}</span>
                    </div>
                    <div className="detail-row">
                      <span>Årsmodell</span>
                      <span>{selectedResource.resource.specifications.year}</span>
                    </div>
                    <div className="detail-row">
                      <span>Motoreffekt</span>
                      <span>{selectedResource.resource.specifications.enginePower} kW</span>
                    </div>
                  </div>
                </div>
                <div className="detail-section">
                  <h5>Status</h5>
                  <div className="detail-grid">
                    <div className="detail-row">
                      <span>Bränslenivå</span>
                      <div className="fuel-bar">
                        <div 
                          className="fuel-fill" 
                          style={{ width: `${selectedResource.resource.fuelStatus.currentLevel}%` }}
                        />
                        <span>{Math.round(selectedResource.resource.fuelStatus.currentLevel)}%</span>
                      </div>
                    </div>
                    <div className="detail-row">
                      <span>Drifttimmar</span>
                      <span>{Math.round(selectedResource.resource.operatingHours)} h</span>
                    </div>
                    <div className="detail-row">
                      <span>Senaste service</span>
                      <span>{new Date(selectedResource.resource.lastService).toLocaleDateString('sv-SE')}</span>
                    </div>
                    <div className="detail-row">
                      <span>Nästa service</span>
                      <span>{new Date(selectedResource.resource.nextService).toLocaleDateString('sv-SE')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="detail-card detail-card-empty">
              <div className="empty-detail">
                <Truck size={48} />
                <p>Välj en resurs för att se detaljer</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourcesView;
