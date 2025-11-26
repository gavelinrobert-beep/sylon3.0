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
  Edit,
  Plus,
  Trash2,
  Save,
} from 'lucide-react';
import { Card, CardHeader, Badge, Button, Modal } from '../ui';
import { LiveMap } from '../map/LiveMap';
import type { Site, SiteMaterial, MaterialCategory } from '@sylon/shared';
import './sites.css';

interface SitesViewProps {
  sites: Site[];
  onUpdateSite?: (siteId: string, updates: Partial<Site>) => Promise<Site>;
  onAddMaterial?: (siteId: string, material: Partial<SiteMaterial>) => Promise<Site>;
  onUpdateMaterial?: (siteId: string, materialId: string, updates: Partial<SiteMaterial>) => Promise<Site>;
  onDeleteMaterial?: (siteId: string, materialId: string) => Promise<Site>;
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

const MATERIAL_CATEGORIES: { value: MaterialCategory; label: string }[] = [
  { value: 'aggregate', label: 'Aggregat' },
  { value: 'sand', label: 'Sand' },
  { value: 'gravel', label: 'Grus' },
  { value: 'rock', label: 'Berg' },
  { value: 'asphalt', label: 'Asfalt' },
  { value: 'concrete', label: 'Betong' },
  { value: 'salt', label: 'Salt' },
  { value: 'other', label: 'Övrigt' },
];

interface MaterialFormData {
  name: string;
  code: string;
  category: MaterialCategory;
  fraction: string;
  description: string;
  unit: 'ton' | 'm3' | 'kg';
  pricePerUnit: string;
  currentStock: string;
  minStock: string;
  maxStock: string;
  availability: 'available' | 'low' | 'out_of_stock' | 'seasonal';
}

const initialMaterialFormData: MaterialFormData = {
  name: '',
  code: '',
  category: 'aggregate',
  fraction: '',
  description: '',
  unit: 'ton',
  pricePerUnit: '',
  currentStock: '',
  minStock: '',
  maxStock: '',
  availability: 'available',
};

export const SitesView: React.FC<SitesViewProps> = ({ 
  sites,
  onUpdateSite,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
}) => {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [isEditingSite, setIsEditingSite] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<SiteMaterial | null>(null);
  const [materialFormData, setMaterialFormData] = useState<MaterialFormData>(initialMaterialFormData);
  const [isSaving, setIsSaving] = useState(false);
  
  // Site edit form state
  const [siteFormData, setSiteFormData] = useState({
    name: '',
    description: '',
    address: '',
    status: 'active' as Site['status'],
  });
  
  const selectedSite = sites.find(s => s.id === selectedSiteId);

  const handleEditSite = () => {
    if (selectedSite) {
      setSiteFormData({
        name: selectedSite.name,
        description: selectedSite.description ?? '',
        address: selectedSite.address,
        status: selectedSite.status,
      });
      setIsEditingSite(true);
    }
  };

  const handleSaveSite = async () => {
    if (!selectedSite || !onUpdateSite) return;
    setIsSaving(true);
    try {
      await onUpdateSite(selectedSite.id, siteFormData);
      setIsEditingSite(false);
    } catch (error) {
      console.error('Failed to update site:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenMaterialModal = (material?: SiteMaterial) => {
    if (material) {
      setEditingMaterial(material);
      setMaterialFormData({
        name: material.name,
        code: material.code,
        category: material.category,
        fraction: material.fraction ?? '',
        description: material.description ?? '',
        unit: material.unit,
        pricePerUnit: material.pricePerUnit?.toString() ?? '',
        currentStock: material.currentStock?.toString() ?? '',
        minStock: material.minStock?.toString() ?? '',
        maxStock: material.maxStock?.toString() ?? '',
        availability: material.availability,
      });
    } else {
      setEditingMaterial(null);
      setMaterialFormData(initialMaterialFormData);
    }
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = async () => {
    if (!selectedSite) return;
    setIsSaving(true);
    
    try {
      const materialData: Partial<SiteMaterial> = {
        name: materialFormData.name,
        code: materialFormData.code,
        category: materialFormData.category,
        fraction: materialFormData.fraction || undefined,
        description: materialFormData.description || undefined,
        unit: materialFormData.unit,
        pricePerUnit: materialFormData.pricePerUnit ? parseFloat(materialFormData.pricePerUnit) : undefined,
        currentStock: materialFormData.currentStock ? parseFloat(materialFormData.currentStock) : undefined,
        minStock: materialFormData.minStock ? parseFloat(materialFormData.minStock) : undefined,
        maxStock: materialFormData.maxStock ? parseFloat(materialFormData.maxStock) : undefined,
        availability: materialFormData.availability,
      };

      if (editingMaterial && onUpdateMaterial) {
        await onUpdateMaterial(selectedSite.id, editingMaterial.id, materialData);
      } else if (onAddMaterial) {
        await onAddMaterial(selectedSite.id, materialData);
      }
      
      setIsMaterialModalOpen(false);
      setEditingMaterial(null);
      setMaterialFormData(initialMaterialFormData);
    } catch (error) {
      console.error('Failed to save material:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!selectedSite || !onDeleteMaterial) return;
    if (!confirm('Är du säker på att du vill ta bort detta material?')) return;
    
    try {
      await onDeleteMaterial(selectedSite.id, materialId);
    } catch (error) {
      console.error('Failed to delete material:', error);
    }
  };

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
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Badge variant={STATUS_VARIANTS[selectedSite.status] ?? 'default'}>
                      {selectedSite.status === 'active' ? 'Aktiv' : selectedSite.status}
                    </Badge>
                    {onUpdateSite && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        icon={<Edit size={16} />}
                        onClick={handleEditSite}
                      >
                        Redigera
                      </Button>
                    )}
                  </div>
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
                
                <div className="detail-section">
                  <div className="section-header">
                    <h5>Material</h5>
                    {onAddMaterial && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        icon={<Plus size={14} />}
                        onClick={() => handleOpenMaterialModal()}
                      >
                        Lägg till
                      </Button>
                    )}
                  </div>
                  {selectedSite.materials && selectedSite.materials.length > 0 ? (
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
                            {(onUpdateMaterial || onDeleteMaterial) && (
                              <div className="material-actions">
                                {onUpdateMaterial && (
                                  <button 
                                    className="material-action-btn"
                                    onClick={() => handleOpenMaterialModal(material)}
                                    title="Redigera"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}
                                {onDeleteMaterial && (
                                  <button 
                                    className="material-action-btn material-action-delete"
                                    onClick={() => handleDeleteMaterial(material.id)}
                                    title="Ta bort"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-materials">Inga material registrerade</p>
                  )}
                </div>
                
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

      {/* Site Edit Modal */}
      <Modal
        isOpen={isEditingSite}
        onClose={() => setIsEditingSite(false)}
        title="Redigera plats"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditingSite(false)}>
              Avbryt
            </Button>
            <Button 
              variant="primary" 
              icon={<Save size={16} />}
              onClick={handleSaveSite}
              loading={isSaving}
            >
              Spara
            </Button>
          </>
        }
      >
        <div className="form-group">
          <label>Namn</label>
          <input
            type="text"
            value={siteFormData.name}
            onChange={(e) => setSiteFormData(prev => ({ ...prev, name: e.target.value }))}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Beskrivning</label>
          <textarea
            value={siteFormData.description}
            onChange={(e) => setSiteFormData(prev => ({ ...prev, description: e.target.value }))}
            className="form-input"
            rows={3}
          />
        </div>
        <div className="form-group">
          <label>Adress</label>
          <input
            type="text"
            value={siteFormData.address}
            onChange={(e) => setSiteFormData(prev => ({ ...prev, address: e.target.value }))}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select
            value={siteFormData.status}
            onChange={(e) => setSiteFormData(prev => ({ ...prev, status: e.target.value as Site['status'] }))}
            className="form-input"
          >
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="seasonal">Säsongsbetonad</option>
            <option value="closed">Stängd</option>
          </select>
        </div>
      </Modal>

      {/* Material Modal */}
      <Modal
        isOpen={isMaterialModalOpen}
        onClose={() => {
          setIsMaterialModalOpen(false);
          setEditingMaterial(null);
          setMaterialFormData(initialMaterialFormData);
        }}
        title={editingMaterial ? 'Redigera material' : 'Lägg till material'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setIsMaterialModalOpen(false);
              setEditingMaterial(null);
              setMaterialFormData(initialMaterialFormData);
            }}>
              Avbryt
            </Button>
            <Button 
              variant="primary" 
              icon={<Save size={16} />}
              onClick={handleSaveMaterial}
              loading={isSaving}
              disabled={!materialFormData.name || !materialFormData.code}
            >
              Spara
            </Button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>Namn *</label>
            <input
              type="text"
              value={materialFormData.name}
              onChange={(e) => setMaterialFormData(prev => ({ ...prev, name: e.target.value }))}
              className="form-input"
              placeholder="ex. Sand 0-4 mm"
            />
          </div>
          <div className="form-group">
            <label>Kod *</label>
            <input
              type="text"
              value={materialFormData.code}
              onChange={(e) => setMaterialFormData(prev => ({ ...prev, code: e.target.value }))}
              className="form-input"
              placeholder="ex. SAND-0-4"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Kategori</label>
            <select
              value={materialFormData.category}
              onChange={(e) => setMaterialFormData(prev => ({ ...prev, category: e.target.value as MaterialCategory }))}
              className="form-input"
            >
              {MATERIAL_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Fraktion</label>
            <input
              type="text"
              value={materialFormData.fraction}
              onChange={(e) => setMaterialFormData(prev => ({ ...prev, fraction: e.target.value }))}
              className="form-input"
              placeholder="ex. 0-4"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Beskrivning</label>
          <textarea
            value={materialFormData.description}
            onChange={(e) => setMaterialFormData(prev => ({ ...prev, description: e.target.value }))}
            className="form-input"
            rows={2}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Enhet</label>
            <select
              value={materialFormData.unit}
              onChange={(e) => setMaterialFormData(prev => ({ ...prev, unit: e.target.value as 'ton' | 'm3' | 'kg' }))}
              className="form-input"
            >
              <option value="ton">Ton</option>
              <option value="m3">m³</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <div className="form-group">
            <label>Pris per enhet (kr)</label>
            <input
              type="number"
              value={materialFormData.pricePerUnit}
              onChange={(e) => setMaterialFormData(prev => ({ ...prev, pricePerUnit: e.target.value }))}
              className="form-input"
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Nuvarande lager</label>
            <input
              type="number"
              value={materialFormData.currentStock}
              onChange={(e) => setMaterialFormData(prev => ({ ...prev, currentStock: e.target.value }))}
              className="form-input"
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Min lager</label>
            <input
              type="number"
              value={materialFormData.minStock}
              onChange={(e) => setMaterialFormData(prev => ({ ...prev, minStock: e.target.value }))}
              className="form-input"
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Max lager</label>
            <input
              type="number"
              value={materialFormData.maxStock}
              onChange={(e) => setMaterialFormData(prev => ({ ...prev, maxStock: e.target.value }))}
              className="form-input"
              min="0"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Tillgänglighet</label>
          <select
            value={materialFormData.availability}
            onChange={(e) => setMaterialFormData(prev => ({ ...prev, availability: e.target.value as MaterialFormData['availability'] }))}
            className="form-input"
          >
            <option value="available">Tillgänglig</option>
            <option value="low">Låg</option>
            <option value="out_of_stock">Slut i lager</option>
            <option value="seasonal">Säsongsbetonad</option>
          </select>
        </div>
      </Modal>
    </div>
  );
};

export default SitesView;
