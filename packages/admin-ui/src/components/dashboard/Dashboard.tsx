/**
 * SYLON Admin UI - Dashboard
 * Overview with KPIs, real-time map, and activity feed
 */

import React from 'react';
import {
  Truck,
  Briefcase,
  MapPin,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { Card, CardHeader, StatCard, Badge, Spinner } from '../ui';
import { LiveMap } from '../map/LiveMap';
import { RESOURCE_TYPE_LABELS, JOB_TYPE_LABELS } from '@sylon/shared';
import type { Resource, Job, GeoPosition } from '@sylon/shared';
import './dashboard.css';

interface DashboardProps {
  resources: { resource: Resource; position: GeoPosition }[];
  jobs: Job[];
  loading?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  resources,
  jobs,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="dashboard-loading">
        <Spinner size="lg" />
        <p>Laddar dashboard...</p>
      </div>
    );
  }

  const activeResources = resources.filter(r => 
    (r.position.speed ?? 0) > 0 || r.resource.status === 'on_job' || r.resource.status === 'en_route'
  ).length;
  
  const activeJobs = jobs.filter(j => 
    j.status === 'in_progress' || j.status === 'assigned'
  ).length;
  
  const scheduledJobs = jobs.filter(j => j.status === 'scheduled').length;
  
  const openDeviations = jobs.reduce(
    (acc, job) => acc + job.deviations.filter(d => !d.resolved).length,
    0
  );

  // Group resources by type
  const resourcesByType = resources.reduce((acc, { resource }) => {
    acc[resource.type] = (acc[resource.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Recent activity from jobs
  const recentActivity = jobs
    .filter(j => j.status === 'in_progress')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="dashboard">
      {/* Stats row */}
      <div className="dashboard-stats">
        <StatCard
          title="Aktiva resurser"
          value={activeResources}
          subtitle={`av ${resources.length} totalt`}
          icon={<Truck size={24} />}
          variant="primary"
        />
        <StatCard
          title="Pågående uppdrag"
          value={activeJobs}
          subtitle={`${scheduledJobs} schemalagda`}
          icon={<Briefcase size={24} />}
          variant="success"
        />
        <StatCard
          title="Aktiva platser"
          value={4}
          subtitle="Täkter, garage, projekt"
          icon={<MapPin size={24} />}
          variant="warning"
        />
        <StatCard
          title="Öppna avvikelser"
          value={openDeviations}
          subtitle="Kräver åtgärd"
          icon={<AlertTriangle size={24} />}
          variant={openDeviations > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Main content grid */}
      <div className="dashboard-grid">
        {/* Live map */}
        <Card className="dashboard-map-card" padding="none">
          <CardHeader 
            title="Realtidskarta" 
            subtitle="Alla resurser i Sundsvallsområdet"
            action={
              <Badge variant="success" size="sm">
                <Activity size={12} style={{ marginRight: 4 }} />
                Live
              </Badge>
            }
          />
          <div className="dashboard-map">
            <LiveMap 
              resources={resources}
              showTrails={true}
            />
          </div>
        </Card>

        {/* Side panel */}
        <div className="dashboard-side">
          {/* Resource summary */}
          <Card>
            <CardHeader title="Resurser per typ" />
            <div className="resource-summary">
              {Object.entries(resourcesByType).map(([type, count]) => (
                <div key={type} className="resource-summary-item">
                  <div className="resource-type-info">
                    <span 
                      className="resource-type-dot" 
                      style={{ 
                        backgroundColor: 
                          type === 'wheel_loader' ? 'var(--color-wheel-loader)' :
                          type === 'excavator' ? 'var(--color-excavator)' :
                          type === 'plow_truck' ? 'var(--color-plow-truck)' :
                          type === 'haul_truck' ? 'var(--color-haul-truck)' :
                          '#6b7280'
                      }}
                    />
                    <span className="resource-type-name">
                      {RESOURCE_TYPE_LABELS[type] ?? type}
                    </span>
                  </div>
                  <span className="resource-type-count">{count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Active jobs */}
          <Card>
            <CardHeader 
              title="Pågående uppdrag" 
              subtitle={`${activeJobs} uppdrag aktiva`}
            />
            <div className="active-jobs-list">
              {recentActivity.length === 0 ? (
                <div className="empty-message">Inga pågående uppdrag</div>
              ) : (
                recentActivity.map(job => (
                  <div key={job.id} className="active-job-item">
                    <div className="job-info">
                      <span className="job-number">{job.jobNumber}</span>
                      <span className="job-title">{job.title}</span>
                      <span className="job-type">
                        {JOB_TYPE_LABELS[job.type] ?? job.type}
                      </span>
                    </div>
                    <Badge 
                      variant={job.status === 'in_progress' ? 'success' : 'info'}
                      size="sm"
                    >
                      {job.status === 'in_progress' ? 'Pågår' : job.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Quick stats */}
          <Card>
            <CardHeader title="Idag" />
            <div className="today-stats">
              <div className="today-stat">
                <Clock size={16} />
                <span className="stat-label">Körda timmar</span>
                <span className="stat-value">127h</span>
              </div>
              <div className="today-stat">
                <TrendingUp size={16} />
                <span className="stat-label">Transporter</span>
                <span className="stat-value">24</span>
              </div>
              <div className="today-stat">
                <MapPin size={16} />
                <span className="stat-label">Täktbesök</span>
                <span className="stat-value">18</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
