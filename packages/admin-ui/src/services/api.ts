/**
 * SYLON Admin UI - API Service
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { total?: number };
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json = await response.json() as ApiResponse<T>;
  
  if (!json.success || !json.data) {
    throw new Error(json.error?.message ?? 'API request failed');
  }
  
  return json.data;
}

export const api = {
  // Resources
  getResources: () => fetchApi<unknown[]>('/resources'),
  getResource: (id: string) => fetchApi<unknown>(`/resources/${id}`),
  getResourcePositions: () => fetchApi<unknown[]>('/resources/positions'),
  
  // Jobs
  getJobs: (params?: { status?: string; type?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetchApi<unknown[]>(`/jobs${query ? `?${query}` : ''}`);
  },
  getJob: (id: string) => fetchApi<unknown>(`/jobs/${id}`),
  createJob: (data: unknown) => fetchApi<unknown>('/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateJobStatus: (id: string, status: string) => fetchApi<unknown>(`/jobs/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  
  // Sites
  getSites: () => fetchApi<unknown[]>('/sites'),
  getSite: (id: string) => fetchApi<unknown>(`/sites/${id}`),
  updateSite: (id: string, data: unknown) => fetchApi<unknown>(`/sites/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  addMaterial: (siteId: string, material: unknown) => fetchApi<unknown>(`/sites/${siteId}/materials`, {
    method: 'POST',
    body: JSON.stringify(material),
  }),
  updateMaterial: (siteId: string, materialId: string, data: unknown) => fetchApi<unknown>(`/sites/${siteId}/materials/${materialId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteMaterial: (siteId: string, materialId: string) => fetchApi<unknown>(`/sites/${siteId}/materials/${materialId}`, {
    method: 'DELETE',
  }),
  
  // Dashboard
  getDashboard: () => fetchApi<unknown>('/dashboard'),
  
  // Stats
  getResourceStats: () => fetchApi<unknown>('/stats/resources'),
  getJobStats: () => fetchApi<unknown>('/stats/jobs'),
};

export default api;
