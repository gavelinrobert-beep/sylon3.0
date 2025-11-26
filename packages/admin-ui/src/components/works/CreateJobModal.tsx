/**
 * SYLON Admin UI - Create Job Modal
 */

import React, { useState } from 'react';
import { Modal, Button } from '../ui';
import { JOB_TYPE_LABELS } from '@sylon/shared';
import type { Job, JobType, JobPriority } from '@sylon/shared';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (jobData: Partial<Job>) => Promise<void>;
  resources: Array<{ id: string; name: string }>;
  sites: Array<{ id: string; name: string; coordinates: { latitude: number; longitude: number } }>;
}

const JOB_TYPES: JobType[] = [
  'snow_plowing',
  'salting',
  'gravel_transport',
  'excavation',
  'loading',
  'material_delivery',
  'site_preparation',
  'demolition',
  'maintenance',
];

export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  resources,
  sites,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'snow_plowing' as JobType,
    title: '',
    description: '',
    priority: 'normal' as JobPriority,
    locationName: '',
    locationLat: '',
    locationLng: '',
    siteId: '',
    scheduledStartDate: '',
    scheduledStartTime: '',
    estimatedDuration: '120',
    assignedResourceIds: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate and parse dates
      const scheduledStart = new Date(`${formData.scheduledStartDate}T${formData.scheduledStartTime}:00`);
      if (isNaN(scheduledStart.getTime())) {
        throw new Error('Invalid date or time');
      }
      
      const estimatedDurationMinutes = parseInt(formData.estimatedDuration, 10);
      if (isNaN(estimatedDurationMinutes) || estimatedDurationMinutes <= 0) {
        throw new Error('Invalid duration');
      }
      
      const scheduledEnd = new Date(scheduledStart.getTime() + estimatedDurationMinutes * 60000);

      // Use site location if selected, otherwise use manual coordinates
      const selectedSite = sites.find(s => s.id === formData.siteId);
      let location;
      
      if (selectedSite) {
        location = {
          name: selectedSite.name,
          coordinates: selectedSite.coordinates,
          siteId: selectedSite.id,
        };
      } else {
        const latitude = parseFloat(formData.locationLat);
        const longitude = parseFloat(formData.locationLng);
        
        if (isNaN(latitude) || isNaN(longitude)) {
          throw new Error('Invalid coordinates');
        }
        
        location = {
          name: formData.locationName,
          coordinates: { latitude, longitude },
        };
      }

      const jobData: Partial<Job> = {
        type: formData.type,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        location,
        scheduledTime: {
          start: scheduledStart,
          end: scheduledEnd,
        },
        estimatedDuration: estimatedDurationMinutes,
        assignedResources: formData.assignedResourceIds.map(resourceId => ({
          resourceId,
          assignedAt: new Date(),
          status: 'assigned' as const,
        })),
      };

      await onSubmit(jobData);
      
      // Reset form
      setFormData({
        type: 'snow_plowing',
        title: '',
        description: '',
        priority: 'normal',
        locationName: '',
        locationLat: '',
        locationLng: '',
        siteId: '',
        scheduledStartDate: '',
        scheduledStartTime: '',
        estimatedDuration: '120',
        assignedResourceIds: [],
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to create job:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ett oväntat fel uppstod';
      // TODO: Replace with toast notification system
      alert(`Kunde inte skapa uppdrag: ${errorMessage}. Försök igen.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSiteChange = (siteId: string) => {
    setFormData(prev => ({ ...prev, siteId }));
  };

  const handleResourceToggle = (resourceId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedResourceIds: prev.assignedResourceIds.includes(resourceId)
        ? prev.assignedResourceIds.filter(id => id !== resourceId)
        : [...prev.assignedResourceIds, resourceId],
    }));
  };

  // Set default date/time when modal opens
  React.useEffect(() => {
    if (isOpen && !formData.scheduledStartDate) {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      setFormData(prev => ({
        ...prev,
        scheduledStartDate: tomorrow.toISOString().split('T')[0],
        scheduledStartTime: '08:00',
      }));
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Skapa nytt uppdrag"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Avbryt
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Skapa uppdrag
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="create-job-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="type">Typ av uppdrag *</label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as JobType }))}
              required
            >
              {JOB_TYPES.map(type => (
                <option key={type} value={type}>
                  {JOB_TYPE_LABELS[type] ?? type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="priority">Prioritet *</label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as JobPriority }))}
              required
            >
              <option value="low">Låg</option>
              <option value="normal">Normal</option>
              <option value="high">Hög</option>
              <option value="urgent">Brådskande</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="title">Titel *</label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="T.ex. Snöplogning E4 Norr"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Beskrivning *</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Detaljerad beskrivning av uppdraget"
            rows={3}
            required
          />
        </div>

        <div className="form-section-title">Plats</div>
        
        <div className="form-group">
          <label htmlFor="siteId">Välj plats (valfritt)</label>
          <select
            id="siteId"
            value={formData.siteId}
            onChange={(e) => handleSiteChange(e.target.value)}
          >
            <option value="">Ange koordinater manuellt</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>

        {!formData.siteId && (
          <>
            <div className="form-group">
              <label htmlFor="locationName">Platsnamn *</label>
              <input
                type="text"
                id="locationName"
                value={formData.locationName}
                onChange={(e) => setFormData(prev => ({ ...prev, locationName: e.target.value }))}
                placeholder="T.ex. E4 Norr"
                required={!formData.siteId}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="locationLat">Latitud *</label>
                <input
                  type="number"
                  id="locationLat"
                  step="0.0001"
                  value={formData.locationLat}
                  onChange={(e) => setFormData(prev => ({ ...prev, locationLat: e.target.value }))}
                  placeholder="62.3908"
                  required={!formData.siteId}
                />
              </div>

              <div className="form-group">
                <label htmlFor="locationLng">Longitud *</label>
                <input
                  type="number"
                  id="locationLng"
                  step="0.0001"
                  value={formData.locationLng}
                  onChange={(e) => setFormData(prev => ({ ...prev, locationLng: e.target.value }))}
                  placeholder="17.3069"
                  required={!formData.siteId}
                />
              </div>
            </div>
          </>
        )}

        <div className="form-section-title">Tid</div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="scheduledStartDate">Datum *</label>
            <input
              type="date"
              id="scheduledStartDate"
              value={formData.scheduledStartDate}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledStartDate: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="scheduledStartTime">Starttid *</label>
            <input
              type="time"
              id="scheduledStartTime"
              value={formData.scheduledStartTime}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledStartTime: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="estimatedDuration">Beräknad tid (min) *</label>
            <input
              type="number"
              id="estimatedDuration"
              min="15"
              step="15"
              value={formData.estimatedDuration}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="form-section-title">Tilldelade resurser</div>

        <div className="resource-checkboxes">
          {resources.map(resource => (
            <label key={resource.id} className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.assignedResourceIds.includes(resource.id)}
                onChange={() => handleResourceToggle(resource.id)}
              />
              <span>{resource.name}</span>
            </label>
          ))}
        </div>
      </form>
    </Modal>
  );
};

export default CreateJobModal;
