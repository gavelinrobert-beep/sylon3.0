/**
 * SYLON Admin UI - Main App
 */

import React, { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { ResourcesView } from './components/resources/ResourcesView';
import { WorksView } from './components/works/WorksView';
import { SitesView } from './components/sites/SitesView';
import { GarageView } from './components/garage/GarageView';
import { useResources, useJobs, useSites } from './hooks';
import { Spinner } from './components/ui';
import './styles/globals.css';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState('dashboard');
  
  const { resources, loading: resourcesLoading } = useResources();
  const { jobs, loading: jobsLoading, updateStatus, createJob } = useJobs();
  const { sites, loading: sitesLoading, updateSite, addMaterial, updateMaterial, deleteMaterial } = useSites();

  const loading = resourcesLoading || jobsLoading || sitesLoading;

  const renderModule = () => {
    if (loading && activeModule !== 'dashboard') {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '400px',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <Spinner size="lg" />
          <p>Laddar data...</p>
        </div>
      );
    }

    switch (activeModule) {
      case 'dashboard':
        return (
          <Dashboard 
            resources={resources} 
            jobs={jobs}
            loading={loading}
          />
        );
      case 'works':
        return (
          <WorksView 
            jobs={jobs}
            resources={resources.map(r => r.resource)}
            onUpdateJobStatus={updateStatus}
            onCreateJob={createJob}
            sites={sites}
          />
        );
      case 'resources':
        return <ResourcesView resources={resources} />;
      case 'sites':
        return (
          <SitesView 
            sites={sites} 
            onUpdateSite={updateSite}
            onAddMaterial={addMaterial}
            onUpdateMaterial={updateMaterial}
            onDeleteMaterial={deleteMaterial}
          />
        );
      case 'garage':
        return <GarageView resources={resources} />;
      default:
        return (
          <Dashboard 
            resources={resources} 
            jobs={jobs}
            loading={loading}
          />
        );
    }
  };

  return (
    <Layout activeModule={activeModule} onModuleChange={setActiveModule}>
      {renderModule()}
    </Layout>
  );
};

export default App;
