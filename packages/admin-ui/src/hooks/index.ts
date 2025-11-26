/**
 * SYLON Admin UI - Custom Hooks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import wsService, { type WebSocketMessage } from '../services/websocket';
import type { Resource, Job, Site, GeoPosition } from '@sylon/shared';

// ============================================
// useApi Hook
// ============================================

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseApiState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}

// ============================================
// useWebSocket Hook
// ============================================

export function useWebSocket(
  onMessage?: (message: WebSocketMessage) => void
): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    wsService.connect();

    const handleMessage = (message: WebSocketMessage) => {
      if (message.type === 'INITIAL_POSITIONS' || message.type === 'POSITION_UPDATE') {
        setConnected(true);
      }
      onMessageRef.current?.(message);
    };

    const unsubscribe = wsService.subscribe(handleMessage);

    return () => {
      unsubscribe();
    };
  }, []);

  return { connected };
}

// ============================================
// useResources Hook
// ============================================

interface ResourceWithPosition {
  resource: Resource;
  position: GeoPosition;
}

export function useResources(): {
  resources: ResourceWithPosition[];
  loading: boolean;
  error: Error | null;
} {
  const [resources, setResources] = useState<ResourceWithPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initial fetch
  useEffect(() => {
    async function fetchResources() {
      try {
        const data = await api.getResources() as Resource[];
        const resourcesWithPositions: ResourceWithPosition[] = data.map(resource => ({
          resource,
          position: resource.currentPosition ?? {
            latitude: 62.3908,
            longitude: 17.3069,
            timestamp: new Date(),
            speed: 0,
            heading: 0,
          },
        }));
        setResources(resourcesWithPositions);
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    }
    fetchResources();
  }, []);

  // WebSocket updates
  useWebSocket((message) => {
    if (message.type === 'POSITION_UPDATE') {
      const updates = message.data as { resourceId: string; position: GeoPosition }[];
      setResources(prev => prev.map(r => {
        const update = updates.find(u => u.resourceId === r.resource.id);
        if (update) {
          return { ...r, position: update.position };
        }
        return r;
      }));
    }
  });

  return { resources, loading, error };
}

// ============================================
// useJobs Hook
// ============================================

export function useJobs(): {
  jobs: Job[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateStatus: (jobId: string, status: string) => Promise<void>;
  createJob: (jobData: Partial<Job>) => Promise<Job>;
} {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getJobs() as Job[];
      setJobs(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const updateStatus = useCallback(async (jobId: string, status: string) => {
    try {
      await api.updateJobStatus(jobId, status);
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: status as Job['status'], updatedAt: new Date() } : job
      ));
    } catch (err) {
      throw err;
    }
  }, []);

  const createJob = useCallback(async (jobData: Partial<Job>) => {
    const newJob = await api.createJob(jobData) as Job;
    setJobs(prev => [newJob, ...prev]);
    return newJob;
  }, []);

  // WebSocket updates
  useWebSocket((message) => {
    if (message.type === 'JOB_STATUS_CHANGE') {
      const { jobId, status } = message.data as { jobId: string; status: string };
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: status as Job['status'], updatedAt: new Date() } : job
      ));
    }
  });

  return { jobs, loading, error, refetch: fetchJobs, updateStatus, createJob };
}

// ============================================
// useSites Hook
// ============================================

export function useSites(): {
  sites: Site[];
  loading: boolean;
  error: Error | null;
} {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSites() {
      try {
        const data = await api.getSites() as Site[];
        setSites(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchSites();
  }, []);

  return { sites, loading, error };
}
