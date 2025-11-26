/**
 * SYLON Backend - Main Server
 * Express.js API with WebSocket support for real-time updates
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

import type { ApiResponse, WebSocketEvent, Resource, Job, Site, SiteMaterial, GeoPosition } from '@sylon/shared';
import { DEMO_COMPANY } from '@sylon/shared';

import { allResources, getResourceById, getResourcesByType } from './data/resources.js';
import { allSites, getSiteById, getSitesByType, updateSite, addMaterialToSite, updateMaterialInSite, deleteMaterialFromSite } from './data/sites.js';
import { allJobs, getJobById, getJobsByStatus, getJobsByResource } from './data/jobs.js';
import { initializeSimulation, updateSimulation, getAllPositions, getResourcePosition } from './modules/gps/simulation.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================
// HEALTH & INFO ENDPOINTS
// ============================================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '3.0.0',
    },
  } satisfies ApiResponse<unknown>);
});

app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: 'SYLON API',
      version: '3.0.0',
      company: DEMO_COMPANY,
      modules: ['works', 'logistics', 'sites', 'garage', 'field-app'],
    },
  } satisfies ApiResponse<unknown>);
});

// ============================================
// RESOURCES ENDPOINTS
// ============================================

// Helper function to derive resource status from job assignments
// Priority: in_progress (on_job) > assigned (en_route) > available
// If a resource has multiple jobs, the highest priority status is returned
function getResourceStatusFromJobs(resourceId: string): Resource['status'] {
  const resourceJobs = getJobsByResource(resourceId);
  
  // Check if resource is assigned to any active job (in_progress takes priority)
  for (const job of resourceJobs) {
    if (job.status === 'in_progress') {
      return 'on_job';
    }
  }
  
  // Then check for assigned jobs
  for (const job of resourceJobs) {
    if (job.status === 'assigned') {
      return 'en_route';
    }
  }
  
  return 'available';
}

app.get('/api/resources', (req: Request, res: Response) => {
  let resources = [...allResources];
  
  // Filter by type
  const type = req.query.type as string | undefined;
  if (type) {
    resources = resources.filter(r => r.type === type);
  }
  
  // Add current positions from simulation and update status based on job assignments
  const positions = getAllPositions();
  resources = resources.map(r => ({
    ...r,
    currentPosition: positions.get(r.id) ?? r.currentPosition,
    status: getResourceStatusFromJobs(r.id),
  }));
  
  // Filter by status (after status is derived from jobs)
  const status = req.query.status as string | undefined;
  if (status) {
    resources = resources.filter(r => r.status === status);
  }
  
  res.json({
    success: true,
    data: resources,
    meta: {
      total: resources.length,
    },
  } satisfies ApiResponse<Resource[]>);
});

app.get('/api/resources/:id', (req: Request, res: Response) => {
  const resourceId = req.params.id ?? '';
  const resource = getResourceById(resourceId);
  
  if (!resource) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    } satisfies ApiResponse<never>);
    return;
  }
  
  // Add current position from simulation and update status based on job assignments
  const position = getResourcePosition(resourceId);
  const resourceWithPosition = {
    ...resource,
    currentPosition: position ?? resource.currentPosition,
    status: getResourceStatusFromJobs(resourceId),
  };
  
  res.json({
    success: true,
    data: resourceWithPosition,
  } satisfies ApiResponse<Resource>);
});

app.get('/api/resources/:id/position', (req: Request, res: Response) => {
  const resourceId = req.params.id ?? '';
  const position = getResourcePosition(resourceId);
  
  if (!position) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource position not found' },
    } satisfies ApiResponse<never>);
    return;
  }
  
  res.json({
    success: true,
    data: position,
  } satisfies ApiResponse<GeoPosition>);
});

app.get('/api/resources/positions', (_req: Request, res: Response) => {
  const positions = getAllPositions();
  const positionsArray = Array.from(positions.entries()).map(([resourceId, position]) => ({
    resourceId,
    ...position,
  }));
  
  res.json({
    success: true,
    data: positionsArray,
  } satisfies ApiResponse<unknown>);
});

// ============================================
// JOBS/WORKS ENDPOINTS
// ============================================

app.get('/api/jobs', (req: Request, res: Response) => {
  let jobs = [...allJobs];
  
  // Filter by status
  const status = req.query.status as string | undefined;
  if (status) {
    jobs = jobs.filter(j => j.status === status);
  }
  
  // Filter by type
  const type = req.query.type as string | undefined;
  if (type) {
    jobs = jobs.filter(j => j.type === type);
  }
  
  // Filter by resource
  const resourceId = req.query.resourceId as string | undefined;
  if (resourceId) {
    jobs = jobs.filter(j => j.assignedResources.some(r => r.resourceId === resourceId));
  }
  
  res.json({
    success: true,
    data: jobs,
    meta: {
      total: jobs.length,
    },
  } satisfies ApiResponse<Job[]>);
});

app.get('/api/jobs/:id', (req: Request, res: Response) => {
  const jobId = req.params.id ?? '';
  const job = getJobById(jobId);
  
  if (!job) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Job not found' },
    } satisfies ApiResponse<never>);
    return;
  }
  
  res.json({
    success: true,
    data: job,
  } satisfies ApiResponse<Job>);
});

app.post('/api/jobs', (req: Request, res: Response) => {
  const newJob: Job = {
    id: `job-${uuidv4()}`,
    companyId: DEMO_COMPANY.id,
    jobNumber: `JOB-${Date.now()}`,
    ...req.body,
    status: 'scheduled',
    timeEntries: [],
    photos: [],
    deviations: [],
    notes: [],
    invoiceStatus: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'api',
    updatedBy: 'api',
  };
  
  allJobs.push(newJob);
  
  // Broadcast to WebSocket clients
  broadcastEvent({
    type: 'JOB_STATUS_CHANGE',
    data: { jobId: newJob.id, status: 'scheduled' },
  });
  
  res.status(201).json({
    success: true,
    data: newJob,
  } satisfies ApiResponse<Job>);
});

app.patch('/api/jobs/:id/status', (req: Request, res: Response) => {
  const jobId = req.params.id ?? '';
  const job = getJobById(jobId);
  
  if (!job) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Job not found' },
    } satisfies ApiResponse<never>);
    return;
  }
  
  const { status } = req.body;
  if (status) {
    job.status = status;
    job.updatedAt = new Date();
    
    // Broadcast to WebSocket clients
    broadcastEvent({
      type: 'JOB_STATUS_CHANGE',
      data: { jobId: job.id, status },
    });
  }
  
  res.json({
    success: true,
    data: job,
  } satisfies ApiResponse<Job>);
});

// ============================================
// SITES ENDPOINTS
// ============================================

app.get('/api/sites', (req: Request, res: Response) => {
  let sites = [...allSites];
  
  // Filter by type
  const type = req.query.type as string | undefined;
  if (type) {
    sites = sites.filter(s => s.type === type);
  }
  
  // Filter by status
  const status = req.query.status as string | undefined;
  if (status) {
    sites = sites.filter(s => s.status === status);
  }
  
  res.json({
    success: true,
    data: sites,
    meta: {
      total: sites.length,
    },
  } satisfies ApiResponse<Site[]>);
});

app.get('/api/sites/:id', (req: Request, res: Response) => {
  const siteId = req.params.id ?? '';
  const site = getSiteById(siteId);
  
  if (!site) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Site not found' },
    } satisfies ApiResponse<never>);
    return;
  }
  
  res.json({
    success: true,
    data: site,
  } satisfies ApiResponse<Site>);
});

// Allowed fields for site updates
const ALLOWED_SITE_FIELDS = ['name', 'description', 'address', 'status', 'operatingHours', 'contact', 'accessInstructions', 'restrictions'];
const ALLOWED_MATERIAL_FIELDS = ['name', 'code', 'category', 'fraction', 'description', 'unit', 'pricePerUnit', 'currentStock', 'minStock', 'maxStock', 'availability', 'qualityGrade', 'certifications'];

// Simple validation helper to filter allowed fields
function filterAllowedFields<T extends Record<string, unknown>>(data: T, allowedFields: string[]): Partial<T> {
  const filtered: Partial<T> = {};
  for (const key of allowedFields) {
    if (key in data) {
      filtered[key as keyof T] = data[key as keyof T];
    }
  }
  return filtered;
}

app.patch('/api/sites/:id', (req: Request, res: Response) => {
  const siteId = req.params.id ?? '';
  const site = getSiteById(siteId);
  
  if (!site) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Site not found' },
    } satisfies ApiResponse<never>);
    return;
  }
  
  // Filter only allowed fields for update
  const filteredUpdates = filterAllowedFields(req.body, ALLOWED_SITE_FIELDS);
  const updatedSite = updateSite(siteId, filteredUpdates);
  
  res.json({
    success: true,
    data: updatedSite,
  } satisfies ApiResponse<Site>);
});

// Materials management for sites
app.post('/api/sites/:id/materials', (req: Request, res: Response) => {
  const siteId = req.params.id ?? '';
  const site = getSiteById(siteId);
  
  if (!site) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Site not found' },
    } satisfies ApiResponse<never>);
    return;
  }
  
  // Validate required fields
  const { name, code, category, unit, availability } = req.body;
  if (!name || !code || !category || !unit || !availability) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Missing required fields: name, code, category, unit, availability' },
    } satisfies ApiResponse<never>);
    return;
  }
  
  // Filter only allowed fields and add id
  const filteredMaterial = filterAllowedFields(req.body, ALLOWED_MATERIAL_FIELDS);
  const material: SiteMaterial = {
    id: `mat-${uuidv4()}`,
    name,
    code,
    category,
    unit,
    availability,
    ...filteredMaterial,
  };
  
  const updatedSite = addMaterialToSite(siteId, material);
  
  res.status(201).json({
    success: true,
    data: updatedSite,
  } satisfies ApiResponse<Site>);
});

app.patch('/api/sites/:id/materials/:materialId', (req: Request, res: Response) => {
  const siteId = req.params.id ?? '';
  const materialId = req.params.materialId ?? '';
  
  const site = getSiteById(siteId);
  
  if (!site) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Site not found' },
    } satisfies ApiResponse<never>);
    return;
  }
  
  // Filter only allowed fields for update
  const filteredUpdates = filterAllowedFields(req.body, ALLOWED_MATERIAL_FIELDS);
  const updatedSite = updateMaterialInSite(siteId, materialId, filteredUpdates);
  
  if (!updatedSite) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Material not found' },
    } satisfies ApiResponse<never>);
    return;
  }
  
  res.json({
    success: true,
    data: updatedSite,
  } satisfies ApiResponse<Site>);
});

app.delete('/api/sites/:id/materials/:materialId', (req: Request, res: Response) => {
  const siteId = req.params.id ?? '';
  const materialId = req.params.materialId ?? '';
  
  const site = getSiteById(siteId);
  
  if (!site) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Site not found' },
    } satisfies ApiResponse<never>);
    return;
  }
  
  const updatedSite = deleteMaterialFromSite(siteId, materialId);
  
  if (!updatedSite) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Material not found' },
    } satisfies ApiResponse<never>);
    return;
  }
  
  res.json({
    success: true,
    data: updatedSite,
  } satisfies ApiResponse<Site>);
});

// ============================================
// DASHBOARD ENDPOINTS
// ============================================

app.get('/api/dashboard', (_req: Request, res: Response) => {
  const positions = getAllPositions();
  
  // Count resources that are actively moving (speed > 0) or have active job status
  const activeResources = allResources.filter(r => {
    const position = positions.get(r.id);
    return (position && (position.speed ?? 0) > 0) || r.status === 'on_job' || r.status === 'en_route';
  }).length;
  
  const activeJobs = allJobs.filter(j => 
    j.status === 'in_progress' || j.status === 'assigned'
  ).length;
  
  const completedToday = allJobs.filter(j => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return j.status === 'completed' && j.updatedAt >= today;
  }).length;
  
  const dashboard = {
    resourcesTotal: allResources.length,
    resourcesActive: activeResources,
    resourcesIdle: allResources.length - activeResources,
    activeJobs,
    completedToday,
    totalSites: allSites.length,
    upcomingJobs: allJobs.filter(j => j.status === 'scheduled').slice(0, 5),
    recentActivity: allJobs
      .filter(j => j.status === 'in_progress')
      .map(j => ({
        id: j.id,
        type: 'job_in_progress' as const,
        description: j.title,
        timestamp: j.updatedAt,
        jobId: j.id,
      }))
      .slice(0, 10),
    resourcePositions: Array.from(positions.entries()).map(([id, pos]) => ({
      resourceId: id,
      resource: getResourceById(id),
      position: pos,
    })),
  };
  
  res.json({
    success: true,
    data: dashboard,
  } satisfies ApiResponse<typeof dashboard>);
});

// ============================================
// STATISTICS ENDPOINTS
// ============================================

app.get('/api/stats/resources', (_req: Request, res: Response) => {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  
  allResources.forEach(r => {
    byType[r.type] = (byType[r.type] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  });
  
  res.json({
    success: true,
    data: {
      total: allResources.length,
      byType,
      byStatus,
    },
  } satisfies ApiResponse<unknown>);
});

app.get('/api/stats/jobs', (_req: Request, res: Response) => {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  
  allJobs.forEach(j => {
    byType[j.type] = (byType[j.type] || 0) + 1;
    byStatus[j.status] = (byStatus[j.status] || 0) + 1;
  });
  
  res.json({
    success: true,
    data: {
      total: allJobs.length,
      byType,
      byStatus,
    },
  } satisfies ApiResponse<unknown>);
});

// ============================================
// WEBSOCKET SERVER
// ============================================

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients: Set<WebSocket> = new Set();

wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');
  clients.add(ws);
  
  // Send initial positions
  const positions = getAllPositions();
  ws.send(JSON.stringify({
    type: 'INITIAL_POSITIONS',
    data: Array.from(positions.entries()).map(([id, pos]) => ({
      resourceId: id,
      position: pos,
    })),
  }));
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

function broadcastEvent(event: WebSocketEvent): void {
  const message = JSON.stringify(event);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ============================================
// GPS SIMULATION & BROADCAST
// ============================================

// Initialize simulation on startup
initializeSimulation().catch(console.error);

// Update simulation every 2 seconds
setInterval(() => {
  const positions = updateSimulation();
  
  // Broadcast position updates to all connected clients
  if (clients.size > 0) {
    const positionUpdates = Array.from(positions.entries()).map(([resourceId, position]) => ({
      resourceId,
      position,
    }));
    
    const message = JSON.stringify({
      type: 'POSITION_UPDATE',
      data: positionUpdates,
    });
    
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}, 2000);

// ============================================
// ERROR HANDLING
// ============================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal server error occurred',
    },
  } satisfies ApiResponse<never>);
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  } satisfies ApiResponse<never>);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

function gracefulShutdown(signal: string): void {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  // Close WebSocket connections
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.close(1000, 'Server shutting down');
    }
  });
  clients.clear();
  
  // Close WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed.');
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  
  // Force exit after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
}

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ============================================
// START SERVER
// ============================================

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use.`);
    console.error('   Another instance of the server may be running.');
    console.error('   Please stop the other instance or use a different port.\n');
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    SYLON API Server                       ║
║                      Version 3.0.0                        ║
╠═══════════════════════════════════════════════════════════╣
║  REST API:     http://localhost:${PORT}/api                  ║
║  WebSocket:    ws://localhost:${PORT}/ws                     ║
║  Health:       http://localhost:${PORT}/api/health           ║
╠═══════════════════════════════════════════════════════════╣
║  Demo Company: ${DEMO_COMPANY.name}         ║
║  Resources:    ${allResources.length} units                                    ║
║  Sites:        ${allSites.length} locations                                   ║
║  Jobs:         ${allJobs.length} active/scheduled                          ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export { app, server };
