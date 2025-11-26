/**
 * SYLON Field App - Main App Component
 * Mobile-first, offline-capable app for field personnel
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  LogOut,
  Settings,
  Sun,
  Moon,
  Smartphone,
  Check,
  X,
  Plus,
  Minus,
  ChevronRight,
  Package,
  ExternalLink,
  Truck,
} from 'lucide-react';
import { JOB_TYPE_LABELS } from '@sylon/shared';
import type { Job, GeoPosition, DeviationType, DeviationSeverity } from '@sylon/shared';
import * as offlineStorage from './services/offline-storage';
import { syncAll, fetchAndCacheJobs, isOnline } from './services/sync';
import { startTracking, stopTracking, onPositionUpdate } from './services/gps';
import * as auth from './services/auth';
import * as incidents from './services/incidents';
import * as dailyWorkflow from './services/daily-workflow';
import * as materials from './services/materials';
import * as theme from './services/theme';
import './styles/globals.css';

type Screen = 'login' | 'day_start' | 'home' | 'jobs' | 'map' | 'profile' | 'job_details';

const App: React.FC = () => {
  // Auth state
  const [authState, setAuthState] = useState<auth.AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  });
  
  // App state
  const [screen, setScreen] = useState<Screen>('login');
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [syncPending, setSyncPending] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Day workflow state
  const [, setDayStarted] = useState(false);
  const [checklist, setChecklist] = useState<dailyWorkflow.DayStartChecklist | null>(null);
  
  // Modal states
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDayEndModal, setShowDayEndModal] = useState(false);

  // Refresh jobs from server
  const refreshJobs = useCallback(async () => {
    try {
      const freshJobs = await fetchAndCacheJobs();
      setJobs(freshJobs);
    } catch (error) {
      console.error('Failed to refresh jobs:', error);
    }
  }, []);

  // Handle sync
  const handleSync = useCallback(async () => {
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
  }, [syncing, online, refreshJobs]);

  // Initialize app
  useEffect(() => {
    async function init() {
      // Initialize theme
      await theme.initializeTheme();
      
      // Initialize offline storage
      await offlineStorage.initDB();
      
      // Check auth state
      const storedAuth = await auth.getAuthState();
      setAuthState(storedAuth);
      
      if (storedAuth.isAuthenticated) {
        // Check if day is started
        const isDayActive = await dailyWorkflow.isDayStarted();
        setDayStarted(isDayActive);
        
        if (!isDayActive && storedAuth.user?.assignedResourceId) {
          // Load checklist for day start
          const checklistData = await dailyWorkflow.getTodayChecklist(
            storedAuth.user.assignedResourceId,
            storedAuth.user.id
          );
          setChecklist(checklistData);
          setScreen('day_start');
        } else {
          setScreen('home');
        }
        
        // Load cached jobs
        const cachedJobs = await offlineStorage.getJobs();
        setJobs(cachedJobs);
        
        // Find active job
        const active = cachedJobs.find(j => j.status === 'in_progress');
        if (active) {
          setActiveJob(active);
          if (active.assignedResources[0]?.resourceId) {
            startTracking(active.assignedResources[0].resourceId);
          }
        }
        
        // Check sync status
        const status = await offlineStorage.getSyncStatus();
        setSyncPending(status.pendingGps + status.pendingSync);
        
        // Fetch fresh data if online
        if (isOnline()) {
          refreshJobs();
        }
      }
      
      setLoading(false);
    }
    init();
  }, [refreshJobs]);

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
  }, [handleSync]);

  // GPS position listener
  useEffect(() => {
    const unsubscribe = onPositionUpdate((pos) => {
      setPosition(pos);
    });
    return unsubscribe;
  }, []);

  // Handle login
  const handleLogin = async (email: string, password: string) => {
    const deviceId = auth.getDeviceId();
    const newAuthState = await auth.login({ email, password, deviceId });
    setAuthState(newAuthState);
    
    if (newAuthState.user?.assignedResourceId) {
      const isDayActive = await dailyWorkflow.isDayStarted();
      setDayStarted(isDayActive);
      
      if (!isDayActive) {
        const checklistData = await dailyWorkflow.getTodayChecklist(
          newAuthState.user.assignedResourceId,
          newAuthState.user.id
        );
        setChecklist(checklistData);
        setScreen('day_start');
      } else {
        setScreen('home');
        await refreshJobs();
      }
    } else {
      setScreen('home');
      await refreshJobs();
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await auth.logout();
    setAuthState({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });
    setScreen('login');
    setJobs([]);
    setActiveJob(null);
    stopTracking();
  };

  // Handle day start checklist
  const handleChecklistItemToggle = async (itemId: string, checked: boolean) => {
    if (!authState.user?.assignedResourceId || !checklist) return;
    
    const updated = await dailyWorkflow.updateChecklistItem(
      itemId,
      checked,
      authState.user.assignedResourceId,
      authState.user.id
    );
    setChecklist(updated);
  };

  const handleFuelLevelChange = async (level: number) => {
    if (!authState.user?.assignedResourceId || !checklist) return;
    
    const updated = await dailyWorkflow.updateFuelLevel(
      level,
      authState.user.assignedResourceId,
      authState.user.id
    );
    setChecklist(updated);
  };

  const handleCompleteDayStart = async () => {
    if (!authState.user?.assignedResourceId || !checklist) return;
    
    await dailyWorkflow.completeDayStart(
      authState.user.assignedResourceId,
      authState.user.id
    );
    setDayStarted(true);
    setScreen('home');
    await refreshJobs();
  };

  // Start a job
  const handleStartJob = async (job: Job) => {
    const updatedJob = { ...job, status: 'in_progress' as const, updatedAt: new Date() };
    await offlineStorage.saveJob(updatedJob);
    setActiveJob(updatedJob);
    setJobs(prev => prev.map(j => j.id === job.id ? updatedJob : j));
    
    await offlineStorage.queueSync('update', 'job', job.id, { status: 'in_progress' });
    
    if (job.assignedResources[0]?.resourceId) {
      startTracking(job.assignedResources[0].resourceId);
    }
    
    if (online) handleSync();
    setScreen('home');
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

  // Handle incident report
  const handleReportIncident = async (
    type: DeviationType,
    severity: DeviationSeverity,
    title: string,
    description: string,
    photos: string[]
  ) => {
    await incidents.createIncident({
      type,
      severity,
      title,
      description,
      jobId: activeJob?.id,
    }, photos);
    
    setShowIncidentModal(false);
    if (online) handleSync();
  };

  // Handle photo capture
  const handleCapturePhoto = async () => {
    const photo = await incidents.capturePhoto();
    if (photo && activeJob) {
      await incidents.addJobPhoto(activeJob.id, photo);
      if (online) handleSync();
    }
  };

  // Handle material logging
  const handleLogMaterial = async (
    materialId: string,
    quantity: number,
    type: 'load' | 'unload'
  ) => {
    if (!activeJob) return;
    
    await materials.createMaterialLoad({
      jobId: activeJob.id,
      materialId,
      quantity,
      type,
    });
    
    setShowMaterialsModal(false);
    if (online) handleSync();
  };

  // Handle day end
  const handleEndDay = async (notes?: string) => {
    if (!authState.user?.assignedResourceId) return;
    
    const completedCount = jobs.filter(j => j.status === 'completed').length;
    const summary = await dailyWorkflow.getTodaySummary(
      authState.user.assignedResourceId,
      authState.user.id,
      completedCount
    );
    
    await dailyWorkflow.completeEndDay(summary, notes);
    setShowDayEndModal(false);
    if (online) handleSync();
  };

  // View job details
  const handleViewJobDetails = (job: Job) => {
    setSelectedJob(job);
    setScreen('job_details');
  };

  const assignedJobs = jobs.filter(j => 
    j.status === 'scheduled' || j.status === 'assigned' || j.status === 'paused'
  );

  if (loading) {
    return (
      <div className="app">
        <div className="loading" style={{ height: '100vh' }}>
          <div className="spinner" />
          <p>Laddar SYLON Field...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (screen === 'login' || !authState.isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Day start checklist
  if (screen === 'day_start' && checklist) {
    return (
      <DayStartScreen
        checklist={checklist}
        onToggleItem={handleChecklistItemToggle}
        onFuelLevelChange={handleFuelLevelChange}
        onComplete={handleCompleteDayStart}
        canComplete={dailyWorkflow.areRequiredItemsComplete(checklist) && checklist.fuelLevel > 0}
      />
    );
  }

  // Job details screen
  if (screen === 'job_details' && selectedJob) {
    return (
      <JobDetailsScreen
        job={selectedJob}
        isActive={selectedJob.id === activeJob?.id}
        onBack={() => setScreen('jobs')}
        onStart={() => handleStartJob(selectedJob)}
        onNavigate={() => {
          const coords = selectedJob.location.coordinates;
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`,
            '_blank'
          );
        }}
      />
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
            onReportIncident={() => setShowIncidentModal(true)}
            onCapturePhoto={handleCapturePhoto}
            onLogMaterial={() => setShowMaterialsModal(true)}
            onViewJob={handleViewJobDetails}
          />
        )}
        
        {screen === 'jobs' && (
          <JobsScreen
            jobs={assignedJobs}
            activeJob={activeJob}
            onStartJob={handleStartJob}
            onViewJob={handleViewJobDetails}
          />
        )}
        
        {screen === 'map' && (
          <MapScreen 
            position={position}
            activeJob={activeJob}
          />
        )}
        
        {screen === 'profile' && (
          <ProfileScreen
            user={authState.user}
            completedJobsCount={jobs.filter(j => j.status === 'completed').length}
            onLogout={handleLogout}
            onSettings={() => setShowSettingsModal(true)}
            onEndDay={() => setShowDayEndModal(true)}
          />
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

      {/* Modals */}
      {showIncidentModal && (
        <IncidentModal
          onClose={() => setShowIncidentModal(false)}
          onSubmit={handleReportIncident}
        />
      )}

      {showMaterialsModal && activeJob && (
        <MaterialsModal
          onClose={() => setShowMaterialsModal(false)}
          onSubmit={handleLogMaterial}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showDayEndModal && (
        <DayEndModal
          completedJobs={jobs.filter(j => j.status === 'completed').length}
          onClose={() => setShowDayEndModal(false)}
          onSubmit={handleEndDay}
        />
      )}
    </div>
  );
};

// ============================================
// LOGIN SCREEN
// ============================================

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await onLogin(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-logo">
        <Truck size={64} color="var(--color-primary)" />
        <h1>SYLON Field</h1>
        <p>Logga in för att komma igång</p>
      </div>
      
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">E-post</label>
          <input
            type="email"
            className="form-input"
            placeholder="din@email.se"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Lösenord</label>
          <input
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        
        {error && <p className="form-error">{error}</p>}
        
        <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
          {loading ? 'Loggar in...' : 'Logga in'}
        </button>
        
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-md)' }}>
          Demo: använd &quot;demo@sylon.se&quot; med valfritt lösenord
        </p>
      </form>
    </div>
  );
};

// ============================================
// DAY START SCREEN
// ============================================

interface DayStartScreenProps {
  checklist: dailyWorkflow.DayStartChecklist;
  onToggleItem: (itemId: string, checked: boolean) => void;
  onFuelLevelChange: (level: number) => void;
  onComplete: () => void;
  canComplete: boolean;
}

const DayStartScreen: React.FC<DayStartScreenProps> = ({
  checklist,
  onToggleItem,
  onFuelLevelChange,
  onComplete,
  canComplete,
}) => {
  const categories = ['vehicle', 'safety', 'equipment', 'fuel'] as const;
  const categoryLabels: Record<string, string> = {
    vehicle: 'Fordon',
    safety: 'Säkerhet',
    equipment: 'Utrustning',
    fuel: 'Bränsle',
  };

  return (
    <div className="app">
      <header className="header">
        <h1 className="header-title">Starta dagen</h1>
      </header>
      
      <main className="main-content">
        <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
          <h2 style={{ marginBottom: 'var(--spacing-sm)' }}>Daglig kontroll</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Gå igenom checklistan innan du börjar dagen
          </p>
        </div>

        {categories.map(category => (
          <div key={category} className="checklist-section">
            <h3 className="checklist-section-title">{categoryLabels[category]}</h3>
            <div className="checklist">
              {checklist.items
                .filter(item => item.category === category)
                .map(item => (
                  <div
                    key={item.id}
                    className="checklist-item"
                    onClick={() => onToggleItem(item.id, !item.checked)}
                  >
                    <div className={`checklist-checkbox ${item.checked ? 'checked' : ''}`}>
                      {item.checked && <Check size={16} />}
                    </div>
                    <span className={`checklist-label ${item.required ? 'required' : ''}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}

        <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Bränslenivå</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <input
              type="range"
              min="0"
              max="100"
              value={checklist.fuelLevel}
              onChange={e => onFuelLevelChange(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontWeight: 600, minWidth: '50px' }}>{checklist.fuelLevel}%</span>
          </div>
        </div>

        <button
          className={`btn ${canComplete ? 'btn-success' : 'btn-secondary'} btn-large`}
          style={{ marginTop: 'var(--spacing-lg)' }}
          onClick={onComplete}
          disabled={!canComplete}
        >
          <CheckCircle />
          {canComplete ? 'Starta arbetsdag' : 'Slutför checklistan först'}
        </button>
      </main>
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
  onReportIncident: () => void;
  onCapturePhoto: () => void;
  onLogMaterial: () => void;
  onViewJob: (job: Job) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  activeJob,
  position,
  assignedJobs,
  onStartJob,
  onPauseJob,
  onCompleteJob,
  onReportIncident,
  onCapturePhoto,
  onLogMaterial,
  onViewJob,
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
            <button className="quick-action action-issue" onClick={onReportIncident}>
              <AlertTriangle />
              <span>Avvikelse</span>
            </button>
            <button className="quick-action action-photo" onClick={onCapturePhoto}>
              <Camera />
              <span>Foto</span>
            </button>
            {activeJob.materials && activeJob.materials.length > 0 && (
              <button className="quick-action" onClick={onLogMaterial} style={{ color: 'var(--color-info)' }}>
                <Package />
                <span>Material</span>
              </button>
            )}
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
            <div key={job.id} className="job-card" onClick={() => onViewJob(job)}>
              <div className="job-card-header">
                <div>
                  <span className="job-number">{job.jobNumber}</span>
                  <h4 className="job-title">{job.title}</h4>
                  <span className="job-type">{JOB_TYPE_LABELS[job.type] ?? job.type}</span>
                </div>
                <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
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
  onViewJob: (job: Job) => void;
}

const JobsScreen: React.FC<JobsScreenProps> = ({ jobs, activeJob, onViewJob }) => {
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
            onClick={() => onViewJob(job)}
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
// JOB DETAILS SCREEN
// ============================================

interface JobDetailsScreenProps {
  job: Job;
  isActive: boolean;
  onBack: () => void;
  onStart: () => void;
  onNavigate: () => void;
}

const JobDetailsScreen: React.FC<JobDetailsScreenProps> = ({
  job,
  isActive,
  onBack,
  onStart,
  onNavigate,
}) => {
  return (
    <div className="app">
      <header className="header">
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Tillbaka
        </button>
        <span className={`badge ${isActive ? 'badge-success' : 'badge-info'}`}>
          {isActive ? 'Pågår' : job.status === 'paused' ? 'Pausad' : 'Tilldelad'}
        </span>
      </header>
      
      <main className="main-content">
        <div className="job-details">
          <div className="job-details-header">
            <span className="job-number">{job.jobNumber}</span>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--spacing-sm)' }}>
              {job.title}
            </h1>
            <span className="job-type">{JOB_TYPE_LABELS[job.type] ?? job.type}</span>
          </div>

          <div className="job-details-section">
            <h3>Beskrivning</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {job.description || 'Ingen beskrivning tillgänglig'}
            </p>
          </div>

          <div className="job-details-section">
            <h3>Plats</h3>
            <div className="card" style={{ marginTop: 'var(--spacing-sm)' }}>
              <div className="job-info-row">
                <span className="job-info-label">Namn</span>
                <span className="job-info-value">{job.location.name}</span>
              </div>
              {job.location.address && (
                <div className="job-info-row">
                  <span className="job-info-label">Adress</span>
                  <span className="job-info-value">{job.location.address}</span>
                </div>
              )}
              <div className="job-info-row">
                <span className="job-info-label">Koordinater</span>
                <span className="job-info-value" style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>
                  {job.location.coordinates.latitude.toFixed(5)}, {job.location.coordinates.longitude.toFixed(5)}
                </span>
              </div>
            </div>
            
            <button className="nav-btn" onClick={onNavigate} style={{ marginTop: 'var(--spacing-md)', width: '100%', justifyContent: 'center' }}>
              <Navigation size={20} />
              Öppna i kartan
              <ExternalLink size={16} />
            </button>
          </div>

          <div className="job-details-section">
            <h3>Schema</h3>
            <div className="card" style={{ marginTop: 'var(--spacing-sm)' }}>
              <div className="job-info-row">
                <span className="job-info-label">Startdatum</span>
                <span className="job-info-value">
                  {new Date(job.scheduledTime.start).toLocaleDateString('sv-SE')}
                </span>
              </div>
              <div className="job-info-row">
                <span className="job-info-label">Starttid</span>
                <span className="job-info-value">
                  {new Date(job.scheduledTime.start).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="job-info-row">
                <span className="job-info-label">Beräknad tid</span>
                <span className="job-info-value">{job.estimatedDuration} min</span>
              </div>
            </div>
          </div>

          {job.materials && job.materials.length > 0 && (
            <div className="job-details-section">
              <h3>Material</h3>
              <div className="card" style={{ marginTop: 'var(--spacing-sm)' }}>
                {job.materials.map((material, index) => (
                  <div key={index} className="job-info-row">
                    <span className="job-info-label">{material.name}</span>
                    <span className="job-info-value">{material.quantity} {material.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isActive && (
            <button
              className="btn btn-success btn-large"
              style={{ marginTop: 'var(--spacing-lg)' }}
              onClick={onStart}
            >
              <Play />
              Starta uppdrag
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

// ============================================
// MAP SCREEN
// ============================================

interface MapScreenProps {
  position: GeoPosition | null;
  activeJob: Job | null;
}

const MapScreen: React.FC<MapScreenProps> = ({ position, activeJob }) => {
  const openNavigation = () => {
    if (activeJob) {
      const coords = activeJob.location.coordinates;
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`,
        '_blank'
      );
    } else if (position) {
      window.open(
        `https://www.google.com/maps/@${position.latitude},${position.longitude},15z`,
        '_blank'
      );
    }
  };

  return (
    <div className="map-container">
      <div className="map-placeholder">
        <MapPin size={64} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>Din position</h2>
        
        {position ? (
          <>
            <div className="map-coords">
              <p>{position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}</p>
            </div>
            <div style={{ marginTop: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
              <p>Hastighet: {Math.round(position.speed ?? 0)} km/h</p>
              <p>Noggrannhet: {Math.round(position.accuracy ?? 0)} m</p>
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Väntar på GPS-signal...</p>
        )}

        {activeJob && (
          <div className="card" style={{ marginTop: 'var(--spacing-lg)', textAlign: 'left' }}>
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Destination</h3>
            <p style={{ fontWeight: 500 }}>{activeJob.location.name}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              {activeJob.location.coordinates.latitude.toFixed(5)}, {activeJob.location.coordinates.longitude.toFixed(5)}
            </p>
          </div>
        )}

        <button className="nav-btn" onClick={openNavigation}>
          <Navigation size={20} />
          {activeJob ? 'Navigera till uppdrag' : 'Öppna i Google Maps'}
          <ExternalLink size={16} />
        </button>
      </div>
    </div>
  );
};

// ============================================
// PROFILE SCREEN
// ============================================

interface ProfileScreenProps {
  user: auth.AuthUser | null;
  completedJobsCount: number;
  onLogout: () => void;
  onSettings: () => void;
  onEndDay: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  completedJobsCount,
  onLogout,
  onSettings,
  onEndDay,
}) => {
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
          {user?.firstName?.[0] || 'U'}
        </div>
        <h2>{user?.firstName} {user?.lastName}</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{user?.companyName}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{user?.email}</p>
      </div>
      
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Statistik idag</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{completedJobsCount}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Slutförda</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>-</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Arbetstid</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <button 
          className="btn btn-secondary"
          style={{ marginBottom: 'var(--spacing-sm)' }}
          onClick={onSettings}
        >
          <Settings size={20} />
          Inställningar
        </button>
        
        <button 
          className="btn btn-warning"
          style={{ marginBottom: 'var(--spacing-sm)' }}
          onClick={onEndDay}
        >
          <Clock size={20} />
          Avsluta arbetsdag
        </button>
        
        <button 
          className="btn btn-danger"
          onClick={onLogout}
        >
          <LogOut size={20} />
          Logga ut
        </button>
      </div>
    </div>
  );
};

// ============================================
// INCIDENT MODAL
// ============================================

interface IncidentModalProps {
  onClose: () => void;
  onSubmit: (
    type: DeviationType,
    severity: DeviationSeverity,
    title: string,
    description: string,
    photos: string[]
  ) => void;
}

const IncidentModal: React.FC<IncidentModalProps> = ({ onClose, onSubmit }) => {
  const [type, setType] = useState<DeviationType>('other');
  const [severity, setSeverity] = useState<DeviationSeverity>('warning');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const handleAddPhoto = async () => {
    const photo = await incidents.capturePhoto();
    if (photo) {
      setPhotos(prev => [...prev, photo]);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit(type, severity, title, description, photos);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Rapportera avvikelse</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label className="form-label">Typ av avvikelse</label>
            <div className="incident-type-grid">
              {incidents.INCIDENT_TYPES.map(t => (
                <button
                  key={t.value}
                  className={`incident-type-btn ${type === t.value ? 'selected' : ''}`}
                  onClick={() => setType(t.value)}
                >
                  <AlertTriangle size={24} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label className="form-label">Allvarlighetsgrad</label>
            <div className="severity-options">
              {incidents.SEVERITY_LEVELS.map(s => (
                <button
                  key={s.value}
                  className={`severity-btn ${severity === s.value ? 'selected' : ''}`}
                  data-severity={s.value}
                  onClick={() => setSeverity(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label className="form-label">Rubrik *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Kort beskrivning av avvikelsen"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label className="form-label">Beskrivning</label>
            <textarea
              className="textarea"
              placeholder="Detaljerad beskrivning..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Foton</label>
            <div className="photo-gallery">
              {photos.map((photo, index) => (
                <div key={index} className="photo-thumbnail">
                  <img src={photo} alt={`Foto ${index + 1}`} />
                  <button
                    className="photo-remove"
                    onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button className="photo-add-btn" onClick={handleAddPhoto}>
                <Camera size={24} />
                <span>Lägg till</span>
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Avbryt
          </button>
          <button 
            className="btn btn-danger" 
            style={{ flex: 1 }}
            onClick={handleSubmit}
            disabled={!title.trim()}
          >
            Skicka rapport
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MATERIALS MODAL
// ============================================

interface MaterialsModalProps {
  onClose: () => void;
  onSubmit: (materialId: string, quantity: number, type: 'load' | 'unload') => void;
}

const MaterialsModal: React.FC<MaterialsModalProps> = ({ onClose, onSubmit }) => {
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<'load' | 'unload'>('load');

  const handleSubmit = () => {
    if (!materialId || quantity <= 0) return;
    onSubmit(materialId, quantity, type);
  };

  const availableMaterials = materials.getAvailableMaterials();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Logga material</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="type-toggle">
            <button
              className={`type-toggle-btn ${type === 'load' ? 'active' : ''}`}
              data-type="load"
              onClick={() => setType('load')}
            >
              Lastning
            </button>
            <button
              className={`type-toggle-btn ${type === 'unload' ? 'active' : ''}`}
              data-type="unload"
              onClick={() => setType('unload')}
            >
              Lossning
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label className="form-label">Material</label>
            <select
              className="material-select"
              value={materialId}
              onChange={e => setMaterialId(e.target.value)}
            >
              <option value="">Välj material...</option>
              {availableMaterials.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Mängd (ton)</label>
            <div className="quantity-input">
              <button
                className="quantity-btn"
                onClick={() => setQuantity(prev => Math.max(0.5, prev - 0.5))}
              >
                <Minus size={20} />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(Math.max(0, Number(e.target.value)))}
                step="0.5"
                min="0"
              />
              <button
                className="quantity-btn"
                onClick={() => setQuantity(prev => prev + 0.5)}
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Avbryt
          </button>
          <button 
            className={`btn ${type === 'load' ? 'btn-success' : 'btn-warning'}`}
            style={{ flex: 1 }}
            onClick={handleSubmit}
            disabled={!materialId || quantity <= 0}
          >
            {type === 'load' ? 'Registrera lastning' : 'Registrera lossning'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// SETTINGS MODAL
// ============================================

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [currentTheme, setCurrentTheme] = useState<theme.Theme>('system');

  useEffect(() => {
    theme.getTheme().then(setCurrentTheme);
  }, []);

  const handleThemeChange = async (newTheme: theme.Theme) => {
    setCurrentTheme(newTheme);
    await theme.setTheme(newTheme);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Inställningar</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="settings-section">
            <h3 className="settings-section-title">Utseende</h3>
            <div className="theme-options">
              <button
                className={`theme-btn ${currentTheme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={24} />
                <span>Ljust</span>
              </button>
              <button
                className={`theme-btn ${currentTheme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={24} />
                <span>Mörkt</span>
              </button>
              <button
                className={`theme-btn ${currentTheme === 'system' ? 'active' : ''}`}
                onClick={() => handleThemeChange('system')}
              >
                <Smartphone size={24} />
                <span>Auto</span>
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">GPS-spårning</h3>
            <div className="settings-item">
              <div className="settings-item-label">
                <span>Automatisk spårning</span>
                <span>Spåra position under aktiva uppdrag</span>
              </div>
              <div className="toggle active" />
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Synkronisering</h3>
            <div className="settings-item">
              <div className="settings-item-label">
                <span>Automatisk synk</span>
                <span>Synka data när nätverk finns</span>
              </div>
              <div className="toggle active" />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DAY END MODAL
// ============================================

interface DayEndModalProps {
  completedJobs: number;
  onClose: () => void;
  onSubmit: (notes?: string) => void;
}

const DayEndModal: React.FC<DayEndModalProps> = ({ completedJobs, onClose, onSubmit }) => {
  const [notes, setNotes] = useState('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Avsluta arbetsdag</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Dagens sammanfattning</h3>
            <div className="summary-stat">
              <span className="summary-label">Slutförda uppdrag</span>
              <span className="summary-value">{completedJobs}</span>
            </div>
            <div className="summary-stat">
              <span className="summary-label">Arbetstid</span>
              <span className="summary-value">-</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Anteckningar (valfritt)</label>
            <textarea
              className="textarea"
              placeholder="Eventuella kommentarer om dagen..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Avbryt
          </button>
          <button 
            className="btn btn-warning"
            style={{ flex: 1 }}
            onClick={() => onSubmit(notes || undefined)}
          >
            Avsluta dag
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
