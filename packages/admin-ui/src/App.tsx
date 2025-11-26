/**
 * SYLON Admin UI - Main App
 */

import React, { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { ResourcesView } from './components/resources/ResourcesView';
import { WorksView } from './components/works/WorksView';
import { SitesView } from './components/sites/SitesView';
import { useResources, useJobs, useSites } from './hooks';
import { Spinner } from './components/ui';
import './styles/globals.css';

const GarageView: React.FC = () => (
  <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
    <h2 style={{ marginBottom: '1.5rem' }}>Garage</h2>
    <div style={{ 
      backgroundColor: 'var(--bg-secondary)', 
      padding: '1.5rem', 
      borderRadius: '8px',
      marginBottom: '1rem'
    }}>
      <p style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
        <strong>Kommande funktionalitet:</strong>
      </p>
      <ul style={{ 
        listStyle: 'disc', 
        paddingLeft: '1.5rem', 
        color: 'var(--text-secondary)',
        lineHeight: '1.8'
      }}>
        <li>Fordonsservice och underhållsschema</li>
        <li>Dagliga kontroller och checklistor</li>
        <li>Bränsle- och kostnadsuppföljning</li>
        <li>Reservdelshantering och lager</li>
        <li>Parkeringsöversikt och resurslokalisering vid depå</li>
        <li>Historik över service och reparationer</li>
        <li>Integrering med fordonsdata och diagnostik</li>
      </ul>
    </div>
    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '1rem' }}>
      Garage HQ-platsen finns redan registrerad under "Platser"-modulen och används för 
      resurspositionering i GPS-simuleringen.
    </p>
  </div>
);

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState('dashboard');
  
  const { resources, loading: resourcesLoading } = useResources();
  const { jobs, loading: jobsLoading, updateStatus, createJob } = useJobs();
  const { sites, loading: sitesLoading } = useSites();

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
        return <SitesView sites={sites} />;
      case 'garage':
        return <GarageView />;
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
