/**
 * SYLON Admin UI - Garage View
 * Vehicle service management, fuel tracking, and maintenance overview
 */

import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Fuel,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Truck,
  Droplets,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { Card, CardHeader, Badge, StatCard, Tabs } from '../ui';
import { RESOURCE_TYPE_LABELS } from '@sylon/shared';
import type { Resource, GeoPosition } from '@sylon/shared';
import './garage.css';

interface GarageViewProps {
  resources: { resource: Resource; position: GeoPosition }[];
}

type ServiceStatus = 'ok' | 'due_soon' | 'overdue';

interface ResourceServiceInfo {
  resource: Resource;
  status: ServiceStatus;
  daysUntilService: number;
  fuelPercentage: number;
}

const STATUS_LABELS: Record<ServiceStatus, string> = {
  ok: 'OK',
  due_soon: 'Snart',
  overdue: 'Försenad',
};

const STATUS_VARIANTS: Record<ServiceStatus, 'success' | 'warning' | 'danger'> = {
  ok: 'success',
  due_soon: 'warning',
  overdue: 'danger',
};

// Helper function to get resource type color
const getResourceTypeColor = (type: string): string => {
  switch (type) {
    case 'wheel_loader':
      return 'var(--color-wheel-loader)';
    case 'excavator':
      return 'var(--color-excavator)';
    case 'plow_truck':
      return 'var(--color-plow-truck)';
    case 'haul_truck':
      return 'var(--color-haul-truck)';
    default:
      return '#6b7280';
  }
};

export const GarageView: React.FC<GarageViewProps> = ({ resources }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'service' | 'fuel'>('overview');

  // Calculate service information for each resource
  const resourceServiceInfo: ResourceServiceInfo[] = useMemo(() => {
    const now = new Date();
    
    return resources.map(({ resource }) => {
      const nextServiceDate = new Date(resource.nextService);
      const daysUntilService = Math.ceil(
        (nextServiceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      let status: ServiceStatus;
      if (daysUntilService < 0) {
        status = 'overdue';
      } else if (daysUntilService <= 14) {
        status = 'due_soon';
      } else {
        status = 'ok';
      }
      
      return {
        resource,
        status,
        daysUntilService,
        fuelPercentage: resource.fuelStatus.currentLevel,
      };
    });
  }, [resources]);

  // Calculate dashboard statistics
  const stats = useMemo(() => {
    const overdueCount = resourceServiceInfo.filter(r => r.status === 'overdue').length;
    const dueSoonCount = resourceServiceInfo.filter(r => r.status === 'due_soon').length;
    const okCount = resourceServiceInfo.filter(r => r.status === 'ok').length;
    
    // Calculate average fuel, handling empty resources case
    const avgFuel = resourceServiceInfo.length > 0
      ? resourceServiceInfo.reduce((acc, r) => acc + r.fuelPercentage, 0) / resourceServiceInfo.length
      : 0;
    
    const lowFuelCount = resourceServiceInfo.filter(r => r.fuelPercentage < 25).length;
    
    const totalOperatingHours = resources.reduce(
      (acc, { resource }) => acc + resource.operatingHours, 0
    );

    return {
      total: resources.length,
      overdueCount,
      dueSoonCount,
      okCount,
      avgFuel: Math.round(avgFuel),
      lowFuelCount,
      totalOperatingHours: Math.round(totalOperatingHours),
    };
  }, [resourceServiceInfo, resources]);

  // Sort resources for different views
  const sortedByServiceUrgency = useMemo(() => {
    return [...resourceServiceInfo].sort((a, b) => a.daysUntilService - b.daysUntilService);
  }, [resourceServiceInfo]);

  const sortedByFuelLevel = useMemo(() => {
    return [...resourceServiceInfo].sort((a, b) => a.fuelPercentage - b.fuelPercentage);
  }, [resourceServiceInfo]);

  const tabs = [
    { id: 'overview', label: 'Översikt', icon: <Activity size={16} /> },
    { id: 'service', label: 'Service', icon: <Wrench size={16} /> },
    { id: 'fuel', label: 'Bränsle', icon: <Fuel size={16} /> },
  ];

  const renderOverview = () => (
    <div className="garage-overview">
      {/* Stats Grid */}
      <div className="garage-stats-grid">
        <StatCard
          title="Totalt antal fordon"
          value={stats.total}
          icon={<Truck size={24} />}
          variant="primary"
        />
        <StatCard
          title="Service OK"
          value={stats.okCount}
          subtitle="fordon"
          icon={<CheckCircle size={24} />}
          variant="success"
        />
        <StatCard
          title="Service snart"
          value={stats.dueSoonCount}
          subtitle="inom 14 dagar"
          icon={<Clock size={24} />}
          variant="warning"
        />
        <StatCard
          title="Service försenad"
          value={stats.overdueCount}
          subtitle="behöver åtgärd"
          icon={<AlertTriangle size={24} />}
          variant="danger"
        />
      </div>

      {/* Two-column layout */}
      <div className="garage-overview-grid">
        {/* Upcoming Services */}
        <Card className="garage-card">
          <CardHeader 
            title="Kommande service" 
            subtitle="Nästa 5 fordon som behöver service"
          />
          <div className="garage-list">
            {sortedByServiceUrgency.slice(0, 5).map(({ resource, status, daysUntilService }) => (
              <div key={resource.id} className="garage-list-item">
                <div className="garage-list-icon" style={{
                  backgroundColor: getResourceTypeColor(resource.type)
                }}>
                  <Truck size={16} />
                </div>
                <div className="garage-list-info">
                  <span className="garage-list-name">{resource.name}</span>
                  <span className="garage-list-type">
                    {RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}
                  </span>
                </div>
                <div className="garage-list-meta">
                  <Badge variant={STATUS_VARIANTS[status]} size="sm">
                    {daysUntilService < 0 
                      ? `${Math.abs(daysUntilService)}d försenad`
                      : daysUntilService === 0
                      ? 'Idag'
                      : `${daysUntilService}d kvar`}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fuel Status */}
        <Card className="garage-card">
          <CardHeader 
            title="Bränslestatus" 
            subtitle={`Genomsnitt: ${stats.avgFuel}%`}
          />
          <div className="garage-list">
            {sortedByFuelLevel.slice(0, 5).map(({ resource, fuelPercentage }) => (
              <div key={resource.id} className="garage-list-item">
                <div className="garage-list-icon" style={{
                  backgroundColor: getResourceTypeColor(resource.type)
                }}>
                  <Fuel size={16} />
                </div>
                <div className="garage-list-info">
                  <span className="garage-list-name">{resource.name}</span>
                  <span className="garage-list-type">{resource.registrationNumber}</span>
                </div>
                <div className="garage-list-meta">
                  <div className="fuel-indicator">
                    <div className="fuel-bar-small">
                      <div 
                        className="fuel-fill-small" 
                        style={{ 
                          width: `${fuelPercentage}%`,
                          backgroundColor: 
                            fuelPercentage < 25 ? 'var(--color-danger)' :
                            fuelPercentage < 50 ? 'var(--color-warning)' :
                            'var(--color-success)'
                        }}
                      />
                    </div>
                    <span className={`fuel-text ${fuelPercentage < 25 ? 'fuel-low' : ''}`}>
                      {Math.round(fuelPercentage)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="garage-quick-stats">
        <div className="quick-stat">
          <Droplets size={20} />
          <div className="quick-stat-info">
            <span className="quick-stat-value">{stats.lowFuelCount}</span>
            <span className="quick-stat-label">Låg bränslenivå (&lt;25%)</span>
          </div>
        </div>
        <div className="quick-stat">
          <TrendingUp size={20} />
          <div className="quick-stat-info">
            <span className="quick-stat-value">{stats.totalOperatingHours.toLocaleString('sv-SE')}</span>
            <span className="quick-stat-label">Totala drifttimmar</span>
          </div>
        </div>
        <div className="quick-stat">
          <Calendar size={20} />
          <div className="quick-stat-info">
            <span className="quick-stat-value">{stats.dueSoonCount + stats.overdueCount}</span>
            <span className="quick-stat-label">Kräver uppmärksamhet</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderServiceTab = () => (
    <div className="garage-service-view">
      <div className="garage-section-header">
        <h3>Serviceöversikt</h3>
        <p>Alla fordon sorterade efter servicebehov</p>
      </div>
      
      <div className="garage-service-grid">
        {sortedByServiceUrgency.map(({ resource, status, daysUntilService }) => (
          <Card key={resource.id} className="service-card" hover>
            <div className="service-card-header">
              <div className="service-card-icon" style={{
                backgroundColor: getResourceTypeColor(resource.type)
              }}>
                <Truck size={20} />
              </div>
              <div className="service-card-info">
                <h4>{resource.name}</h4>
                <span className="service-card-type">
                  {RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}
                </span>
              </div>
              <Badge variant={STATUS_VARIANTS[status]} size="sm">
                {STATUS_LABELS[status]}
              </Badge>
            </div>
            
            <div className="service-card-details">
              <div className="service-detail">
                <span className="detail-label">Reg.nr</span>
                <span className="detail-value">{resource.registrationNumber}</span>
              </div>
              <div className="service-detail">
                <span className="detail-label">Drifttimmar</span>
                <span className="detail-value">{Math.round(resource.operatingHours)} h</span>
              </div>
              <div className="service-detail">
                <span className="detail-label">Senaste service</span>
                <span className="detail-value">
                  {new Date(resource.lastService).toLocaleDateString('sv-SE')}
                </span>
              </div>
              <div className="service-detail">
                <span className="detail-label">Nästa service</span>
                <span className={`detail-value ${status === 'overdue' ? 'text-danger' : status === 'due_soon' ? 'text-warning' : ''}`}>
                  {new Date(resource.nextService).toLocaleDateString('sv-SE')}
                  {daysUntilService < 0 
                    ? ` (${Math.abs(daysUntilService)} dagar sen)`
                    : daysUntilService === 0
                    ? ' (idag)'
                    : ` (om ${daysUntilService} dagar)`}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderFuelTab = () => (
    <div className="garage-fuel-view">
      <div className="garage-section-header">
        <h3>Bränsleöversikt</h3>
        <p>Alla fordon sorterade efter bränslenivå</p>
      </div>

      {/* Fuel summary stats */}
      <div className="fuel-summary-stats">
        <StatCard
          title="Genomsnittlig nivå"
          value={`${stats.avgFuel}%`}
          icon={<Fuel size={24} />}
          variant={stats.avgFuel < 40 ? 'warning' : 'success'}
        />
        <StatCard
          title="Låg nivå"
          value={stats.lowFuelCount}
          subtitle="fordon under 25%"
          icon={<AlertTriangle size={24} />}
          variant={stats.lowFuelCount > 0 ? 'danger' : 'success'}
        />
      </div>
      
      <div className="garage-fuel-grid">
        {sortedByFuelLevel.map(({ resource, fuelPercentage }) => (
          <Card key={resource.id} className="fuel-card" hover>
            <div className="fuel-card-header">
              <div className="fuel-card-icon" style={{
                backgroundColor: getResourceTypeColor(resource.type)
              }}>
                <Fuel size={20} />
              </div>
              <div className="fuel-card-info">
                <h4>{resource.name}</h4>
                <span className="fuel-card-reg">{resource.registrationNumber}</span>
              </div>
            </div>
            
            <div className="fuel-card-gauge">
              <div className="fuel-gauge-bar">
                <div 
                  className="fuel-gauge-fill" 
                  style={{ 
                    width: `${fuelPercentage}%`,
                    backgroundColor: 
                      fuelPercentage < 25 ? 'var(--color-danger)' :
                      fuelPercentage < 50 ? 'var(--color-warning)' :
                      'var(--color-success)'
                  }}
                />
              </div>
              <span className={`fuel-gauge-text ${fuelPercentage < 25 ? 'text-danger' : ''}`}>
                {Math.round(fuelPercentage)}%
              </span>
            </div>
            
            <div className="fuel-card-details">
              <div className="fuel-detail">
                <span className="detail-label">Tankkapacitet</span>
                <span className="detail-value">{resource.fuelStatus.tankCapacity} L</span>
              </div>
              <div className="fuel-detail">
                <span className="detail-label">Förbrukning</span>
                <span className="detail-value">{resource.fuelStatus.consumption} L/h</span>
              </div>
              <div className="fuel-detail">
                <span className="detail-label">Senaste tankning</span>
                <span className="detail-value">
                  {new Date(resource.fuelStatus.lastRefuel).toLocaleDateString('sv-SE')}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="garage-view">
      <div className="garage-header">
        <h2>Garage</h2>
        <p className="garage-subtitle">Fordonsservice och underhållshantering</p>
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'overview' | 'service' | 'fuel')}
      />

      <div className="garage-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'service' && renderServiceTab()}
        {activeTab === 'fuel' && renderFuelTab()}
      </div>
    </div>
  );
};

export default GarageView;
