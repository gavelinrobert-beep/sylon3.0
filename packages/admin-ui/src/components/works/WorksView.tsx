/**
 * SYLON Admin UI - Works View (Job Management)
 */

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  Truck,
  ChevronRight,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, Tabs } from '../ui';
import { JOB_TYPE_LABELS, RESOURCE_TYPE_LABELS } from '@sylon/shared';
import type { Job, Resource, Site } from '@sylon/shared';
import { CreateJobModal } from './CreateJobModal';
import './works.css';

interface WorksViewProps {
  jobs: Job[];
  resources: Resource[];
  sites: Site[];
  onCreateJob?: (jobData: Partial<Job>) => Promise<Job>;
  onUpdateJobStatus?: (jobId: string, status: string) => void;
}

const STATUS_TABS = [
  { id: 'all', label: 'Alla' },
  { id: 'scheduled', label: 'Schemalagda' },
  { id: 'in_progress', label: 'Pågående' },
  { id: 'completed', label: 'Klara' },
];

const STATUS_VARIANTS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'default',
  scheduled: 'info',
  assigned: 'primary',
  in_progress: 'success',
  paused: 'warning',
  completed: 'success',
  cancelled: 'default',
  failed: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Utkast',
  scheduled: 'Schemalagd',
  assigned: 'Tilldelad',
  in_progress: 'Pågår',
  paused: 'Pausad',
  completed: 'Klar',
  cancelled: 'Avbruten',
  failed: 'Misslyckad',
};

const PRIORITY_VARIANTS: Record<string, 'default' | 'warning' | 'danger'> = {
  low: 'default',
  normal: 'default',
  high: 'warning',
  urgent: 'danger',
};

export const WorksView: React.FC<WorksViewProps> = ({
  jobs,
  resources,
  sites,
  onCreateJob,
  onUpdateJobStatus,
}) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredJobs = jobs.filter(job => {
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const getAssignedResources = (job: Job) => {
    return job.assignedResources.map(assignment => 
      resources.find(r => r.id === assignment.resourceId)
    ).filter((r): r is Resource => r !== undefined);
  };

  const handleCreateJob = async (jobData: Partial<Job>) => {
    if (onCreateJob) {
      await onCreateJob(jobData);
    }
  };

  return (
    <div className="works-view">
      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateJob}
        resources={resources.map(r => ({ id: r.id, name: r.name }))}
        sites={sites.map(s => ({ id: s.id, name: s.name, coordinates: s.coordinates }))}
      />
      {/* Toolbar */}
      <div className="works-toolbar">
        <div className="toolbar-left">
          <Tabs
            tabs={STATUS_TABS}
            activeTab={statusFilter}
            onChange={setStatusFilter}
          />
        </div>
        <div className="toolbar-right">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Sök uppdrag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Nytt uppdrag
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="works-content">
        {/* Jobs list */}
        <div className="jobs-list">
          {filteredJobs.length === 0 ? (
            <Card className="empty-jobs">
              <div className="empty-content">
                <Calendar size={48} />
                <h3>Inga uppdrag hittade</h3>
                <p>Det finns inga uppdrag som matchar dina filter.</p>
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsCreateModalOpen(true)}>
                  Skapa nytt uppdrag
                </Button>
              </div>
            </Card>
          ) : (
            filteredJobs.map(job => (
              <Card
                key={job.id}
                className={`job-card ${selectedJobId === job.id ? 'job-card-selected' : ''}`}
                hover
                onClick={() => setSelectedJobId(job.id)}
              >
                <div className="job-card-content">
                  <div className="job-header">
                    <div className="job-main">
                      <span className="job-number">{job.jobNumber}</span>
                      <h4 className="job-title">{job.title}</h4>
                      <span className="job-type">
                        {JOB_TYPE_LABELS[job.type] ?? job.type}
                      </span>
                    </div>
                    <div className="job-badges">
                      <Badge variant={STATUS_VARIANTS[job.status] ?? 'default'} size="sm">
                        {STATUS_LABELS[job.status] ?? job.status}
                      </Badge>
                      {job.priority !== 'normal' && (
                        <Badge variant={PRIORITY_VARIANTS[job.priority] ?? 'default'} size="sm">
                          {job.priority === 'high' ? 'Hög' : job.priority === 'urgent' ? 'Brådskande' : job.priority}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="job-meta">
                    <div className="meta-item">
                      <MapPin size={14} />
                      <span>{job.location.name}</span>
                    </div>
                    <div className="meta-item">
                      <Calendar size={14} />
                      <span>{new Date(job.scheduledTime.start).toLocaleDateString('sv-SE')}</span>
                    </div>
                    <div className="meta-item">
                      <Clock size={14} />
                      <span>{new Date(job.scheduledTime.start).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="job-resources">
                    {getAssignedResources(job).map(resource => (
                      <div key={resource.id} className="assigned-resource">
                        <Truck size={12} />
                        <span>{resource.name}</span>
                      </div>
                    ))}
                  </div>

                  {job.deviations.some(d => !d.resolved) && (
                    <div className="job-warning">
                      <AlertTriangle size={14} />
                      <span>{job.deviations.filter(d => !d.resolved).length} öppna avvikelser</span>
                    </div>
                  )}
                </div>
                <ChevronRight size={20} className="job-arrow" />
              </Card>
            ))
          )}
        </div>

        {/* Job detail panel */}
        <div className="job-detail-panel">
          {selectedJob ? (
            <Card className="job-detail-card">
              <CardHeader
                title={selectedJob.title}
                subtitle={`${selectedJob.jobNumber} • ${JOB_TYPE_LABELS[selectedJob.type] ?? selectedJob.type}`}
                action={
                  <Badge variant={STATUS_VARIANTS[selectedJob.status] ?? 'default'}>
                    {STATUS_LABELS[selectedJob.status] ?? selectedJob.status}
                  </Badge>
                }
              />
              
              <div className="job-detail-content">
                <div className="detail-section">
                  <h5>Beskrivning</h5>
                  <p className="job-description">{selectedJob.description}</p>
                </div>

                <div className="detail-section">
                  <h5>Plats</h5>
                  <div className="location-info">
                    <MapPin size={16} />
                    <span>{selectedJob.location.name}</span>
                  </div>
                  <div className="location-coords">
                    {selectedJob.location.coordinates.latitude.toFixed(5)}, 
                    {selectedJob.location.coordinates.longitude.toFixed(5)}
                  </div>
                </div>

                <div className="detail-section">
                  <h5>Tid</h5>
                  <div className="time-info">
                    <div className="time-row">
                      <span>Planerad start:</span>
                      <span>{new Date(selectedJob.scheduledTime.start).toLocaleString('sv-SE')}</span>
                    </div>
                    <div className="time-row">
                      <span>Planerat slut:</span>
                      <span>{new Date(selectedJob.scheduledTime.end).toLocaleString('sv-SE')}</span>
                    </div>
                    <div className="time-row">
                      <span>Uppskattad tid:</span>
                      <span>{Math.round(selectedJob.estimatedDuration / 60)}h</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h5>Tilldelade resurser</h5>
                  <div className="assigned-resources-list">
                    {getAssignedResources(selectedJob).map(resource => (
                      <div key={resource.id} className="resource-chip">
                        <Truck size={14} />
                        <span>{resource.name}</span>
                        <Badge variant="default" size="sm">
                          {RESOURCE_TYPE_LABELS[resource.type]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="detail-actions">
                  {selectedJob.status === 'scheduled' && (
                    <Button
                      variant="success"
                      icon={<Play size={16} />}
                      onClick={() => onUpdateJobStatus?.(selectedJob.id, 'in_progress')}
                    >
                      Starta
                    </Button>
                  )}
                  {selectedJob.status === 'in_progress' && (
                    <>
                      <Button
                        variant="secondary"
                        icon={<Pause size={16} />}
                        onClick={() => onUpdateJobStatus?.(selectedJob.id, 'paused')}
                      >
                        Pausa
                      </Button>
                      <Button
                        variant="success"
                        icon={<CheckCircle size={16} />}
                        onClick={() => onUpdateJobStatus?.(selectedJob.id, 'completed')}
                      >
                        Slutför
                      </Button>
                    </>
                  )}
                  {selectedJob.status === 'paused' && (
                    <Button
                      variant="success"
                      icon={<Play size={16} />}
                      onClick={() => onUpdateJobStatus?.(selectedJob.id, 'in_progress')}
                    >
                      Återuppta
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="job-detail-card job-detail-empty">
              <div className="empty-detail">
                <Calendar size={48} />
                <p>Välj ett uppdrag för att se detaljer</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorksView;
