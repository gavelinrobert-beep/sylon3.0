/**
 * SYLON Field App - Main App Component
 * Mobile-first, offline-capable app for field personnel
 */

import React, { useState, useEffect } from 'react';
import {
  Home,
  Briefcase,
  MapPin,
  User,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Camera,
  Clock,
  Navigation,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { JOB_TYPE_LABELS } from '@sylon/shared';
import type { Job, GeoPosition } from '@sylon/shared';
import * as offlineStorage from './services/offline-storage';
import { syncAll, fetchAndCacheJobs, isOnline } from './services/sync';
import { startTracking, stopTracking, onPositionUpdate } from './services/gps';
import './styles/globals.css';

type Screen = 'home' | 'jobs' | 'map' | 'profile';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [syncPending, setSyncPending] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize
  useEffect(() => {
    async function init() {
      await offlineStorage.initDB();
      
      // Load cached jobs
      const cachedJobs = await offlineStorage.getJobs();
      setJobs(cachedJobs);
      
      // Find active job
      const active = cachedJobs.find(j => j.status === 'in_progress');
      if (active) {
        setActiveJob(active);
        // Start GPS tracking for active job
        if (active.assignedResources[0]?.resourceId) {
          startTracking(active.assignedResources[0].resourceId);
        }
      }
      
      // Check sync status
      const status = await offlineStorage.getSyncStatus();
      setSyncPending(status.pendingGps + status.pendingSync);
      
      setLoading(false);
      
      // Fetch fresh data if online
      if (isOnline()) {
        refreshJobs();
      }
    }
    init();
  }, []);

  // Online/offline listener
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      handleSync();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // GPS position listener
  useEffect(() => {
    const unsubscribe = onPositionUpdate((pos) => {
      setPosition(pos);
    });
    return unsubscribe;
  }, []);

  // Refresh jobs from server
  const refreshJobs = async () => {
    try {
      const freshJobs = await fetchAndCacheJobs();
      setJobs(freshJobs);
    } catch (error) {
      console.error('Failed to refresh jobs:', error);
    }
  };

  // Handle sync
  const handleSync = async () => {
    if (syncing || !online) return;
    
    setSyncing(true);
    try {
      const result = await syncAll();
      const status = await offlineStorage.getSyncStatus();
      setSyncPending(status.pendingGps + status.pendingSync);
      
      if (result.success) {
        await refreshJobs();
      }
    } finally {
      setSyncing(false);
    }
  };

  // Start a job
  const handleStartJob = async (job: Job) => {
    const updatedJob = { ...job, status: 'in_progress' as const, updatedAt: new Date() };
    await offlineStorage.saveJob(updatedJob);
    setActiveJob(updatedJob);
    setJobs(prev => prev.map(j => j.id === job.id ? updatedJob : j));
    
    // Queue for sync
    await offlineStorage.queueSync('update', 'job', job.id, { status: 'in_progress' });
    
    // Start GPS tracking
    if (job.assignedResources[0]?.resourceId) {
      startTracking(job.assignedResources[0].resourceId);
    }
    
    // Try to sync
    if (online) {
      handleSync();
    }
  };

  // Pause job
  const handlePauseJob = async () => {
    if (!activeJob) return;
    
    const updatedJob = { ...activeJob, status: 'paused' as const, updatedAt: new Date() };
    await offlineStorage.saveJob(updatedJob);
    setActiveJob(null);
    setJobs(prev => prev.map(j => j.id === activeJob.id ? updatedJob : j));
    
    await offlineStorage.queueSync('update', 'job', activeJob.id, { status: 'paused' });
    stopTracking();
    
    if (online) handleSync();
  };

  // Complete job
  const handleCompleteJob = async () => {
    if (!activeJob) return;
    
    const updatedJob = { ...activeJob, status: 'completed' as const, updatedAt: new Date() };
    await offlineStorage.saveJob(updatedJob);
    setActiveJob(null);
    setJobs(prev => prev.map(j => j.id === activeJob.id ? updatedJob : j));
    
    await offlineStorage.queueSync('update', 'job', activeJob.id, { status: 'completed' });
    stopTracking();
    
    if (online) handleSync();
  };

  const assignedJobs = jobs.filter(j => 
    j.status === 'scheduled' || j.status === 'assigned' || j.status === 'paused'
  );

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner" />
          <p>Laddar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Sync indicator */}
      {(syncing || syncPending > 0) && (
        <div className={`sync-indicator ${syncing ? 'syncing' : 'pending'}`}>
          <RefreshCw size={14} className={syncing ? 'animate-pulse' : ''} />
          <span>{syncing ? 'Synkar...' : `${syncPending} väntar`}</span>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <h1 className="header-title">
          {screen === 'home' ? 'SYLON Field' : 
           screen === 'jobs' ? 'Uppdrag' :
           screen === 'map' ? 'Karta' : 'Profil'}
        </h1>
        <div className="header-status">
          <div className={`status-dot ${online ? 'online' : 'offline'}`} />
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
        </div>
      </header>

      {/* Main content */}
      <main className="main-content">
        {screen === 'home' && (
          <HomeScreen
            activeJob={activeJob}
            position={position}
            assignedJobs={assignedJobs}
            onStartJob={handleStartJob}
            onPauseJob={handlePauseJob}
            onCompleteJob={handleCompleteJob}
            onSync={handleSync}
          />
        )}
        
        {screen === 'jobs' && (
          <JobsScreen
            jobs={assignedJobs}
            activeJob={activeJob}
            onStartJob={handleStartJob}
          />
        )}
        
        {screen === 'map' && (
          <MapScreen position={position} />
        )}
        
        {screen === 'profile' && (
          <ProfileScreen />
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${screen === 'home' ? 'active' : ''}`}
          onClick={() => setScreen('home')}
        >
          <Home size={24} />
          <span>Hem</span>
        </button>
        <button 
          className={`nav-item ${screen === 'jobs' ? 'active' : ''}`}
          onClick={() => setScreen('jobs')}
        >
          <Briefcase size={24} />
          <span>Uppdrag</span>
        </button>
        <button 
          className={`nav-item ${screen === 'map' ? 'active' : ''}`}
          onClick={() => setScreen('map')}
        >
          <MapPin size={24} />
          <span>Karta</span>
        </button>
        <button 
          className={`nav-item ${screen === 'profile' ? 'active' : ''}`}
          onClick={() => setScreen('profile')}
        >
          <User size={24} />
          <span>Profil</span>
        </button>
      </nav>
    </div>
  );
};

// ============================================
// HOME SCREEN
// ============================================

interface HomeScreenProps {
  activeJob: Job | null;
  position: GeoPosition | null;
  assignedJobs: Job[];
  onStartJob: (job: Job) => void;
  onPauseJob: () => void;
  onCompleteJob: () => void;
  onSync: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  activeJob,
  position,
  assignedJobs,
  onStartJob,
  onPauseJob,
  onCompleteJob,
}) => {
  return (
    <div>
      {/* Active job */}
      {activeJob ? (
        <div className="card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="job-number">{activeJob.jobNumber}</span>
              <h2 className="card-title">{activeJob.title}</h2>
              <p className="card-subtitle">{JOB_TYPE_LABELS[activeJob.type] ?? activeJob.type}</p>
            </div>
            <span className="badge badge-success">Pågår</span>
          </div>
          
          <div className="job-meta">
            <div className="job-meta-item">
              <MapPin size={16} />
              <span>{activeJob.location.name}</span>
            </div>
            {position && (
              <div className="job-meta-item">
                <Navigation size={16} />
                <span>{Math.round(position.speed ?? 0)} km/h</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Briefcase size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>Inget aktivt uppdrag</p>
          <p style={{ fontSize: 'var(--font-size-sm)' }}>
            {assignedJobs.length} uppdrag tilldelade
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div className="quick-actions">
        {activeJob ? (
          <>
            <button className="quick-action action-pause" onClick={onPauseJob}>
              <Pause />
              <span>Paus</span>
            </button>
            <button className="quick-action action-complete" onClick={onCompleteJob}>
              <CheckCircle />
              <span>Slutför</span>
            </button>
            <button className="quick-action action-issue">
              <AlertTriangle />
              <span>Avvikelse</span>
            </button>
            <button className="quick-action action-photo">
              <Camera />
              <span>Foto</span>
            </button>
          </>
        ) : (
          assignedJobs.slice(0, 4).map(job => (
            <button 
              key={job.id} 
              className="quick-action action-start"
              onClick={() => onStartJob(job)}
            >
              <Play />
              <span>{job.jobNumber}</span>
            </button>
          ))
        )}
      </div>

      {/* Upcoming jobs */}
      {!activeJob && assignedJobs.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 'var(--spacing-md)', fontWeight: 600 }}>
            Kommande uppdrag
          </h3>
          {assignedJobs.slice(0, 3).map(job => (
            <div key={job.id} className="job-card" onClick={() => onStartJob(job)}>
              <div className="job-card-header">
                <div>
                  <span className="job-number">{job.jobNumber}</span>
                  <h4 className="job-title">{job.title}</h4>
                  <span className="job-type">{JOB_TYPE_LABELS[job.type] ?? job.type}</span>
                </div>
                <span className={`badge ${job.status === 'paused' ? 'badge-warning' : 'badge-info'}`}>
                  {job.status === 'paused' ? 'Pausad' : 'Tilldelad'}
                </span>
              </div>
              <div className="job-meta">
                <div className="job-meta-item">
                  <MapPin size={14} />
                  <span>{job.location.name}</span>
                </div>
                <div className="job-meta-item">
                  <Clock size={14} />
                  <span>{new Date(job.scheduledTime.start).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// JOBS SCREEN
// ============================================

interface JobsScreenProps {
  jobs: Job[];
  activeJob: Job | null;
  onStartJob: (job: Job) => void;
}

const JobsScreen: React.FC<JobsScreenProps> = ({ jobs, activeJob, onStartJob }) => {
  return (
    <div>
      {jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <Briefcase size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>Inga tilldelade uppdrag</p>
        </div>
      ) : (
        jobs.map(job => (
          <div 
            key={job.id} 
            className="job-card"
            onClick={() => !activeJob && onStartJob(job)}
            style={job.id === activeJob?.id ? { borderLeft: '4px solid var(--color-success)' } : {}}
          >
            <div className="job-card-header">
              <div>
                <span className="job-number">{job.jobNumber}</span>
                <h4 className="job-title">{job.title}</h4>
                <span className="job-type">{JOB_TYPE_LABELS[job.type] ?? job.type}</span>
              </div>
              <span className={`badge ${
                job.id === activeJob?.id ? 'badge-success' :
                job.status === 'paused' ? 'badge-warning' : 'badge-info'
              }`}>
                {job.id === activeJob?.id ? 'Pågår' :
                 job.status === 'paused' ? 'Pausad' : 'Tilldelad'}
              </span>
            </div>
            <div className="job-meta">
              <div className="job-meta-item">
                <MapPin size={14} />
                <span>{job.location.name}</span>
              </div>
              <div className="job-meta-item">
                <Clock size={14} />
                <span>
                  {new Date(job.scheduledTime.start).toLocaleDateString('sv-SE')} {new Date(job.scheduledTime.start).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ============================================
// MAP SCREEN
// ============================================

interface MapScreenProps {
  position: GeoPosition | null;
}

const MapScreen: React.FC<MapScreenProps> = ({ position }) => {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <MapPin size={64} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
      <h2 style={{ marginBottom: '0.5rem' }}>Din position</h2>
      {position ? (
        <div style={{ color: 'var(--text-secondary)' }}>
          <p>{position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</p>
          <p style={{ marginTop: '0.5rem' }}>
            Hastighet: {Math.round(position.speed ?? 0)} km/h
          </p>
          <p>Noggrannhet: {Math.round(position.accuracy ?? 0)} m</p>
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>Väntar på GPS-signal...</p>
      )}
    </div>
  );
};

// ============================================
// PROFILE SCREEN
// ============================================

const ProfileScreen: React.FC = () => {
  return (
    <div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ 
          width: 80, 
          height: 80, 
          borderRadius: '50%', 
          background: 'var(--color-primary)', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
          fontSize: '2rem',
          fontWeight: 'bold'
        }}>
          D
        </div>
        <h2>Demo Förare</h2>
        <p style={{ color: 'var(--text-secondary)' }}>SYLON Demo Contractors AB</p>
      </div>
      
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Statistik idag</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>3</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Slutförda</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>6.5h</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Arbetstid</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
