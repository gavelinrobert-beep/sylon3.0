/**
 * SYLON Admin UI - Sites View
 */

import React, { useState } from 'react';
import {
  MapPin,
  Mountain,
  Warehouse,
  Snowflake,
  Clock,
  Package,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, Badge } from '../ui';
import { LiveMap } from '../map/LiveMap';
import type { Site } from '@sylon/shared';
import './sites.css';

interface SitesViewProps {
  sites: Site[];
}

const SITE_TYPE_ICONS: Record<string, React.ReactNode> = {
  garage: <Warehouse size={20} />,
  quarry: <Mountain size={20} />,
  snow_dump: <Snowflake size={20} />,
  depot: <Package size={20} />,
  project_area: <MapPin size={20} />,
};

const SITE_TYPE_LABELS: Record<string, string> = {
  garage: 'Garage',
  quarry: 'Bergtäkt',
  snow_dump: 'Snötipp',
  depot: 'Depå',
  project_area: 'Projektområde',
};

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'default' | 'info'> = {
  active: 'success',
  seasonal: 'info',
  inactive: 'default',
  closed: 'warning',
};

export const SitesView: React.FC<SitesViewProps> = ({ sites }) => {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  
  const selectedSite = sites.find(s => s.id === selectedSiteId);

  return (
    <div className="sites-view">
      <div className="sites-content">
        {/* Sites list */}
        <div className="sites-list">
          {sites.map(site => (
            <Card
              key={site.id}
              className={`site-card ${selectedSiteId === site.id ? 'site-card-selected' : ''}`}
              hover
              onClick={() => setSelectedSiteId(site.id)}
            >
              <div className="site-card-content">
                <div className="site-icon" style={{
                  backgroundColor:
                    site.type === 'garage' ? 'var(--color-primary)' :
                    site.type === 'quarry' ? 'var(--color-warning)' :
                    site.type === 'snow_dump' ? 'var(--color-info)' :
                    '#6b7280'
                }}>
                  {SITE_TYPE_ICONS[site.type] ?? <MapPin size={20} />}
                </div>
                
                <div className="site-info">
                  <div className="site-header">
                    <h4 className="site-name">{site.name}</h4>
                    <Badge variant={STATUS_VARIANTS[site.status] ?? 'default'} size="sm">
                      {site.status === 'active' ? 'Aktiv' : site.status}
                    </Badge>
                  </div>
                  <span className="site-type">{SITE_TYPE_LABELS[site.type] ?? site.type}</span>
                  <span className="site-address">{site.address}</span>
                  
                  {site.materials && site.materials.length > 0 && (
                    <div className="site-materials">
                      <Package size={12} />
                      <span>{site.materials.length} materialtyper</span>
                    </div>
                  )}
                </div>
                
                <ChevronRight size={20} className="site-arrow" />
              </div>
            </Card>
          ))}
        </div>

        {/* Site detail panel */}
        <div className="site-detail-panel">
          {selectedSite ? (
            <Card className="site-detail-card">
              <CardHeader
                title={selectedSite.name}
                subtitle={`${selectedSite.code} • ${SITE_TYPE_LABELS[selectedSite.type]}`}
                action={
                  <Badge variant={STATUS_VARIANTS[selectedSite.status] ?? 'default'}>
                    {selectedSite.status === 'active' ? 'Aktiv' : selectedSite.status}
                  </Badge>
                }
              />
              
              <div className="site-detail-map">
                <LiveMap
                  resources={[]}
                />
              </div>
              
              <div className="site-detail-content">
                {selectedSite.description && (
                  <div className="detail-section">
                    <h5>Beskrivning</h5>
                    <p>{selectedSite.description}</p>
                  </div>
                )}
                
                <div className="detail-section">
                  <h5>Adress</h5>
                  <p>{selectedSite.address}</p>
                  <span className="coords">
                    {selectedSite.coordinates.latitude.toFixed(5)}, {selectedSite.coordinates.longitude.toFixed(5)}
                  </span>
                </div>
                
                {selectedSite.operatingHours && (
                  <div className="detail-section">
                    <h5>Öppettider</h5>
                    <div className="hours-info">
                      <Clock size={14} />
                      <span>
                        {selectedSite.operatingHours.regular.start} - {selectedSite.operatingHours.regular.end}
                      </span>
                    </div>
                  </div>
                )}
                
                {selectedSite.contact && (
                  <div className="detail-section">
                    <h5>Kontakt</h5>
                    <div className="contact-info">
                      <p><strong>{selectedSite.contact.name}</strong></p>
                      <p>{selectedSite.contact.role}</p>
                      <p>{selectedSite.contact.phone}</p>
                      <p>{selectedSite.contact.email}</p>
                    </div>
                  </div>
                )}
                
                {selectedSite.materials && selectedSite.materials.length > 0 && (
                  <div className="detail-section">
                    <h5>Material</h5>
                    <div className="materials-list">
                      {selectedSite.materials.map(material => (
                        <div key={material.id} className="material-item">
                          <div className="material-info">
                            <span className="material-name">{material.name}</span>
                            <span className="material-code">{material.code}</span>
                          </div>
                          <div className="material-stock">
                            <Badge 
                              variant={material.availability === 'available' ? 'success' : 'warning'}
                              size="sm"
                            >
                              {material.availability === 'available' ? 'Tillgänglig' : material.availability}
                            </Badge>
                            {material.currentStock !== undefined && (
                              <span className="stock-value">
                                {material.currentStock.toLocaleString()} {material.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedSite.restrictions && selectedSite.restrictions.length > 0 && (
                  <div className="detail-section">
                    <h5>Restriktioner</h5>
                    <ul className="restrictions-list">
                      {selectedSite.restrictions.map((restriction, i) => (
                        <li key={i}>{restriction}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="site-detail-card site-detail-empty">
              <div className="empty-detail">
                <MapPin size={48} />
                <p>Välj en plats för att se detaljer</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SitesView;
