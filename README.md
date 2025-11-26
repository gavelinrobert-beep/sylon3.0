# SYLON 3.0

> Modern, modular and scalable platform for real-time logistics, construction management and resource control.

![SYLON](https://img.shields.io/badge/version-3.0.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)
![React](https://img.shields.io/badge/React-19-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)

## 🎯 Overview

SYLON is a comprehensive platform designed for construction and logistics companies. It handles fleet management, job scheduling, real-time GPS tracking, material flow management, and more. The system is built to work in challenging conditions: winter roads, poor connectivity, with heavy machinery and complex assignments.

## 🏗️ Architecture

```
sylon/
├── packages/
│   ├── shared/          # TypeScript types, constants, utilities
│   ├── backend/         # Node.js/Express API server
│   ├── admin-ui/        # React admin dashboard
│   └── field-app/       # React mobile app (offline-first)
├── database/            # PostgreSQL + PostGIS schema
├── package.json         # Monorepo configuration
└── tsconfig.base.json   # Shared TypeScript config
```

## 📦 Modules

### Works
Job management, assignments, time logging, photo documentation, deviation reporting, and automatic invoice generation.

### Logistics
Transport planning, route optimization, delivery tracking, digital waybills, and environmental reporting.

### Sites
Geographic workplace management: quarries, depots, snow dumps, project areas with material tracking.

### Garage
Vehicle service management, daily checks, fuel tracking, spare parts inventory, and maintenance scheduling.

### Field App
Mobile-first application for drivers and operators with offline capability, GPS batching, and simple UI.

### Admin UI
Web dashboard for dispatchers and supervisors with real-time maps, KPIs, and planning tools.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 8+
- PostgreSQL 15+ with PostGIS extension (optional for full functionality)

### Installation

```bash
# Clone repository
git clone https://github.com/gavelinrobert-beep/sylon3.0.git
cd sylon3.0

# Install dependencies
npm install

# Build shared package (required before running backend or frontend)
npm run build --workspace=@sylon/shared
```

> **Note**: If you update constants or types in the shared package, you must rebuild it with `npm run build --workspace=@sylon/shared` and restart any running services (backend, admin-ui, field-app) to see the changes.

### Running the Backend

```bash
# Development mode
npm run backend:dev

# Or
cd packages/backend
npm run dev
```

The API server starts at `http://localhost:3001`

### Running the Admin UI

```bash
# Development mode
npm run admin:dev

# Or
cd packages/admin-ui
npm install
npm run dev
```

The admin UI is available at `http://localhost:5173`

### Running the Field App

```bash
cd packages/field-app
npm install
npm run dev
```

The field app is available at `http://localhost:5174`

## 🗄️ Database Setup

### PostgreSQL + PostGIS

```sql
-- Create database
CREATE DATABASE sylon;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Run schema
\i database/schema.sql
```

## 📡 API Endpoints

### Health & Info
- `GET /api/health` - Server health check
- `GET /api/info` - API information

### Resources
- `GET /api/resources` - List all resources
- `GET /api/resources/:id` - Get resource details
- `GET /api/resources/positions` - Get all positions

### Jobs
- `GET /api/jobs` - List jobs
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create new job
- `PATCH /api/jobs/:id/status` - Update job status

### Sites
- `GET /api/sites` - List sites
- `GET /api/sites/:id` - Get site details

### Dashboard
- `GET /api/dashboard` - Get dashboard data

## 🛰️ Real-time Features

### WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  switch (message.type) {
    case 'POSITION_UPDATE':
      // Handle position updates
      break;
    case 'JOB_STATUS_CHANGE':
      // Handle job changes
      break;
  }
};
```

## 🏢 Demo Company

The system comes with a pre-configured demo company:

**SYLON Demo Contractors AB**
- 16 resources (4 wheel loaders, 4 excavators, 4 plow trucks, 4 haul trucks)
- 3 sites (Garage HQ, Bergtäkt Norra, Bergtäkt Södra)
- Sample jobs for snow plowing, material transport, and excavation

### GPS Simulation

The backend includes a GPS simulation engine that generates realistic movement patterns in the Sundsvall area:
- Plow trucks following city routes
- Haul trucks moving between quarries and project sites
- Wheel loaders working at quarries
- Excavators at construction sites

## 🔧 Configuration

### Environment Variables

```env
# Backend
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/sylon
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001/ws
```

## 📱 Field App Features

- **Offline-first**: Works without network connection
- **GPS batching**: Queues position data for sync
- **IndexedDB storage**: Local data persistence
- **Large touch targets**: Mobile-optimized UI
- **One-tap actions**: Start, pause, complete jobs

## 🗺️ Map Features

- Real-time resource positions
- Trail history visualization
- Site geofences
- Resource type filtering
- Animated markers with direction

## 📊 Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 15+, PostGIS |
| Real-time | WebSocket |
| Maps | Leaflet, React-Leaflet |
| Offline | IndexedDB (idb) |
| Styling | CSS Custom Properties |

## 📁 Project Structure

### Shared Package (`@sylon/shared`)
```
src/
├── types/          # TypeScript interfaces
│   ├── core.ts     # Base types
│   ├── works.ts    # Job management
│   ├── logistics.ts # Transport
│   ├── sites.ts    # Sites
│   ├── garage.ts   # Service
│   └── field-app.ts # Mobile
├── constants/      # Demo data, labels
└── utils/          # Helper functions
```

### Backend (`@sylon/backend`)
```
src/
├── data/           # Demo data stores
├── modules/
│   └── gps/        # GPS simulation
└── index.ts        # Express server
```

### Admin UI (`@sylon/admin-ui`)
```
src/
├── components/
│   ├── ui/         # Buttons, cards, badges
│   ├── layout/     # App shell
│   ├── map/        # Live map
│   ├── dashboard/  # Dashboard
│   ├── works/      # Job management
│   ├── resources/  # Fleet view
│   └── sites/      # Sites view
├── hooks/          # Custom React hooks
├── services/       # API, WebSocket
└── styles/         # Global CSS
```

### Field App (`@sylon/field-app`)
```
src/
├── components/     # UI components
├── services/
│   ├── offline-storage.ts  # IndexedDB
│   ├── sync.ts             # Sync service
│   └── gps.ts              # GPS tracking
└── styles/         # Mobile CSS
```

## 🧪 Development

### Build All Packages

```bash
npm run build
```

### Type Checking

```bash
npm run build --workspace=@sylon/shared
```

### Code Style

The project uses TypeScript strict mode with:
- `noImplicitAny`
- `strictNullChecks`
- `noUncheckedIndexedAccess`

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ❤️ for the construction and logistics industry
