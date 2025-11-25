-- SYLON Database Schema
-- PostgreSQL + PostGIS for geospatial data
-- Version 3.0.0

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE resource_type AS ENUM (
  'wheel_loader', 'excavator', 'plow_truck', 'haul_truck', 
  'dump_truck', 'tanker', 'crane'
);

CREATE TYPE resource_status AS ENUM (
  'available', 'on_job', 'en_route', 'paused', 
  'maintenance', 'offline', 'error'
);

CREATE TYPE job_type AS ENUM (
  'snow_plowing', 'salting', 'gravel_transport', 'excavation',
  'loading', 'material_delivery', 'site_preparation', 'demolition', 'maintenance'
);

CREATE TYPE job_status AS ENUM (
  'draft', 'scheduled', 'assigned', 'in_progress', 
  'paused', 'completed', 'cancelled', 'failed'
);

CREATE TYPE job_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TYPE site_type AS ENUM (
  'quarry', 'depot', 'asphalt_plant', 'snow_dump', 
  'project_area', 'garage', 'fuel_station', 'customer_site', 'public_works'
);

CREATE TYPE site_status AS ENUM ('active', 'inactive', 'closed', 'seasonal');

CREATE TYPE material_category AS ENUM (
  'aggregate', 'sand', 'gravel', 'rock', 
  'asphalt', 'concrete', 'salt', 'other'
);

CREATE TYPE user_role AS ENUM (
  'admin', 'dispatcher', 'supervisor', 'operator', 'driver'
);

CREATE TYPE service_type AS ENUM (
  'scheduled', 'unscheduled', 'inspection', 'repair', 
  'tire_change', 'oil_change', 'wash', 'winterization', 'safety_check'
);

-- ============================================
-- COMPANIES & USERS
-- ============================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  organization_number VARCHAR(20) UNIQUE NOT NULL,
  address_street VARCHAR(255),
  address_postal_code VARCHAR(10),
  address_city VARCHAR(100),
  address_country VARCHAR(100) DEFAULT 'Sverige',
  address_location GEOGRAPHY(POINT, 4326),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  contact_website VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'Europe/Stockholm',
  locale VARCHAR(10) DEFAULT 'sv-SE',
  currency CHAR(3) DEFAULT 'SEK',
  work_hours_start TIME DEFAULT '06:00',
  work_hours_end TIME DEFAULT '18:00',
  work_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  role user_role NOT NULL DEFAULT 'driver',
  is_active BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- RESOURCES (MACHINES/VEHICLES)
-- ============================================

CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type resource_type NOT NULL,
  registration_number VARCHAR(20) NOT NULL,
  gps_device_id VARCHAR(100),
  
  -- Capacity
  max_load DECIMAL(10,2),
  load_unit VARCHAR(10) DEFAULT 'ton',
  bucket_size DECIMAL(5,2),
  arm_reach DECIMAL(5,2),
  
  -- Fuel
  fuel_level DECIMAL(5,2) DEFAULT 100,
  tank_capacity DECIMAL(7,2),
  fuel_consumption DECIMAL(6,2),
  last_refuel_at TIMESTAMPTZ,
  
  -- Service
  last_service_at TIMESTAMPTZ,
  next_service_at TIMESTAMPTZ,
  operating_hours DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status resource_status DEFAULT 'available',
  current_position GEOGRAPHY(POINT, 4326),
  current_speed DECIMAL(6,2),
  current_heading DECIMAL(5,2),
  position_updated_at TIMESTAMPTZ,
  error_codes TEXT[],
  
  -- Specifications
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  engine_power INTEGER,
  weight INTEGER,
  length DECIMAL(5,2),
  width DECIMAL(5,2),
  height DECIMAL(5,2),
  
  -- Assignment
  assigned_operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_job_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  UNIQUE(company_id, registration_number)
);

CREATE INDEX idx_resources_company ON resources(company_id);
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_position ON resources USING GIST(current_position);

-- ============================================
-- GPS TRACKING
-- ============================================

CREATE TABLE gps_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  position GEOGRAPHY(POINT, 4326) NOT NULL,
  altitude DECIMAL(7,2),
  accuracy DECIMAL(6,2),
  speed DECIMAL(6,2),
  heading DECIMAL(5,2),
  engine_on BOOLEAN DEFAULT true,
  fuel_level DECIMAL(5,2),
  odometer_km DECIMAL(10,2),
  engine_hours DECIMAL(10,2),
  diagnostics JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioned by month for performance with large datasets
-- Note: In production, use table partitioning
CREATE INDEX idx_gps_resource ON gps_readings(resource_id);
CREATE INDEX idx_gps_recorded_at ON gps_readings(recorded_at DESC);
CREATE INDEX idx_gps_position ON gps_readings USING GIST(position);

-- GPS batches for offline sync
CREATE TABLE gps_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  readings JSONB NOT NULL,
  reading_count INTEGER NOT NULL,
  first_reading_at TIMESTAMPTZ NOT NULL,
  last_reading_at TIMESTAMPTZ NOT NULL,
  batched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gps_batches_resource ON gps_batches(resource_id);
CREATE INDEX idx_gps_batches_synced ON gps_batches(synced_at) WHERE synced_at IS NULL;

-- ============================================
-- SITES
-- ============================================

CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) NOT NULL,
  type site_type NOT NULL,
  status site_status DEFAULT 'active',
  description TEXT,
  
  -- Location
  address VARCHAR(500),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  geofence GEOGRAPHY(POLYGON, 4326),
  geofence_radius DECIMAL(10,2),
  
  -- Operating hours
  hours_weekday_start TIME,
  hours_weekday_end TIME,
  hours_weekend_start TIME,
  hours_weekend_end TIME,
  hours_exceptions JSONB DEFAULT '[]',
  
  -- Contact
  contact_name VARCHAR(100),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  contact_role VARCHAR(100),
  
  -- Capacity
  max_daily_visits INTEGER,
  max_concurrent_vehicles INTEGER,
  loading_bays INTEGER,
  unloading_areas INTEGER,
  storage_capacity DECIMAL(12,2),
  storage_unit VARCHAR(10),
  
  access_instructions TEXT,
  restrictions TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  UNIQUE(company_id, code)
);

CREATE INDEX idx_sites_company ON sites(company_id);
CREATE INDEX idx_sites_type ON sites(type);
CREATE INDEX idx_sites_status ON sites(status);
CREATE INDEX idx_sites_location ON sites USING GIST(location);

-- ============================================
-- MATERIALS
-- ============================================

CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  category material_category NOT NULL,
  fraction VARCHAR(20),
  description TEXT,
  unit VARCHAR(10) NOT NULL,
  price_per_unit DECIMAL(10,2),
  
  -- Stock
  current_stock DECIMAL(12,2) DEFAULT 0,
  min_stock DECIMAL(12,2),
  max_stock DECIMAL(12,2),
  availability VARCHAR(20) DEFAULT 'available',
  
  -- Quality
  quality_grade VARCHAR(10),
  certifications TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_materials_site ON materials(site_id);
CREATE INDEX idx_materials_category ON materials(category);

-- Material transactions (in/out)
CREATE TABLE material_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
  quantity DECIMAL(12,2) NOT NULL,
  unit VARCHAR(10) NOT NULL,
  resource_id UUID REFERENCES resources(id),
  operator_id UUID REFERENCES users(id),
  job_id UUID,
  destination_site_id UUID REFERENCES sites(id),
  notes TEXT,
  weighticket_number VARCHAR(50),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mat_trans_site ON material_transactions(site_id);
CREATE INDEX idx_mat_trans_material ON material_transactions(material_id);
CREATE INDEX idx_mat_trans_recorded ON material_transactions(recorded_at DESC);

-- ============================================
-- JOBS (UPPDRAG)
-- ============================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_number VARCHAR(50) NOT NULL,
  type job_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority job_priority DEFAULT 'normal',
  status job_status DEFAULT 'draft',
  
  -- Location
  location_name VARCHAR(255),
  location GEOGRAPHY(POINT, 4326),
  location_address VARCHAR(500),
  site_id UUID REFERENCES sites(id),
  geofence_radius DECIMAL(10,2),
  
  -- Route (for multi-stop jobs)
  route JSONB,
  
  -- Timing
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  estimated_duration INTEGER, -- minutes
  
  -- Customer
  customer_id UUID,
  customer_reference VARCHAR(100),
  
  -- Metrics
  machine_hours DECIMAL(10,2),
  fuel_consumed DECIMAL(10,2),
  co2_emissions DECIMAL(10,2),
  distance_traveled DECIMAL(10,2),
  
  -- Invoice
  invoice_status VARCHAR(20) DEFAULT 'pending',
  invoice_generated_at TIMESTAMPTZ,
  invoice_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  UNIQUE(company_id, job_number)
);

CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_scheduled ON jobs(scheduled_start);
CREATE INDEX idx_jobs_location ON jobs USING GIST(location);

-- Job resource assignments
CREATE TABLE job_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'assigned',
  
  UNIQUE(job_id, resource_id)
);

CREATE INDEX idx_job_assignments_job ON job_assignments(job_id);
CREATE INDEX idx_job_assignments_resource ON job_assignments(resource_id);

-- Job materials
CREATE TABLE job_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id),
  material_name VARCHAR(255),
  material_type VARCHAR(100),
  quantity DECIMAL(12,2) NOT NULL,
  unit VARCHAR(10) NOT NULL,
  source_site_id UUID REFERENCES sites(id),
  destination_site_id UUID REFERENCES sites(id),
  loaded BOOLEAN DEFAULT false,
  delivered BOOLEAN DEFAULT false,
  loaded_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_job_materials_job ON job_materials(job_id);

-- Time entries
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id),
  operator_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(20) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  description TEXT,
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_entries_job ON time_entries(job_id);
CREATE INDEX idx_time_entries_resource ON time_entries(resource_id);

-- Job photos
CREATE TABLE job_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id),
  operator_id UUID NOT NULL REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  mime_type VARCHAR(100),
  size INTEGER,
  location GEOGRAPHY(POINT, 4326),
  caption TEXT,
  category VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_photos_job ON job_photos(job_id);

-- Deviations (avvikelser)
CREATE TABLE deviations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id),
  reported_by UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location GEOGRAPHY(POINT, 4326),
  photos TEXT[],
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deviations_job ON deviations(job_id);
CREATE INDEX idx_deviations_resolved ON deviations(resolved);

-- Job notes
CREATE TABLE job_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_notes_job ON job_notes(job_id);

-- ============================================
-- GARAGE & SERVICE
-- ============================================

CREATE TABLE garages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) NOT NULL,
  address VARCHAR(500),
  location GEOGRAPHY(POINT, 4326),
  is_headquarters BOOLEAN DEFAULT false,
  phone VARCHAR(50),
  email VARCHAR(255),
  manager_id UUID REFERENCES users(id),
  hours_weekday_start TIME,
  hours_weekday_end TIME,
  hours_weekend_start TIME,
  hours_weekend_end TIME,
  facilities JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, code)
);

CREATE INDEX idx_garages_company ON garages(company_id);

-- Service records
CREATE TABLE service_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  garage_id UUID NOT NULL REFERENCES garages(id),
  resource_id UUID NOT NULL REFERENCES resources(id),
  type service_type NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled',
  scheduled_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_duration INTEGER,
  actual_duration INTEGER,
  description TEXT NOT NULL,
  work_performed TEXT,
  mechanic_id UUID REFERENCES users(id),
  parts_used JSONB DEFAULT '[]',
  labor_hours DECIMAL(6,2),
  labor_cost DECIMAL(10,2),
  parts_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  photos TEXT[],
  documents TEXT[],
  notes TEXT,
  next_service_date DATE,
  next_service_odometer INTEGER,
  next_service_hours INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_service_resource ON service_records(resource_id);
CREATE INDEX idx_service_garage ON service_records(garage_id);
CREATE INDEX idx_service_status ON service_records(status);
CREATE INDEX idx_service_scheduled ON service_records(scheduled_date);

-- Daily checks
CREATE TABLE daily_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES users(id),
  garage_id UUID REFERENCES garages(id),
  check_date DATE NOT NULL,
  shift VARCHAR(20),
  items JSONB NOT NULL,
  all_passed BOOLEAN DEFAULT true,
  issues_found INTEGER DEFAULT 0,
  notes TEXT,
  signature_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_checks_resource ON daily_checks(resource_id);
CREATE INDEX idx_daily_checks_date ON daily_checks(check_date DESC);

-- Fuel transactions
CREATE TABLE fuel_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  garage_id UUID NOT NULL REFERENCES garages(id),
  resource_id UUID NOT NULL REFERENCES resources(id),
  operator_id UUID REFERENCES users(id),
  pump_id VARCHAR(50),
  fuel_type VARCHAR(20) NOT NULL,
  quantity DECIMAL(8,2) NOT NULL,
  odometer INTEGER,
  engine_hours DECIMAL(10,2),
  cost_per_liter DECIMAL(6,2),
  total_cost DECIMAL(10,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fuel_resource ON fuel_transactions(resource_id);
CREATE INDEX idx_fuel_garage ON fuel_transactions(garage_id);
CREATE INDEX idx_fuel_recorded ON fuel_transactions(recorded_at DESC);

-- ============================================
-- SITE VISITS
-- ============================================

CREATE TABLE site_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id),
  operator_id UUID REFERENCES users(id),
  job_id UUID REFERENCES jobs(id),
  type VARCHAR(20) NOT NULL,
  arrived_at TIMESTAMPTZ NOT NULL,
  departed_at TIMESTAMPTZ,
  wait_time INTEGER,
  materials JSONB,
  weighticket_number VARCHAR(50),
  notes TEXT
);

CREATE INDEX idx_site_visits_site ON site_visits(site_id);
CREATE INDEX idx_site_visits_resource ON site_visits(resource_id);
CREATE INDEX idx_site_visits_arrived ON site_visits(arrived_at DESC);

-- ============================================
-- OFFLINE SYNC QUEUE
-- ============================================

CREATE TABLE offline_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(100) NOT NULL,
  action VARCHAR(20) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error TEXT,
  synced_at TIMESTAMPTZ
);

CREATE INDEX idx_offline_queue_device ON offline_queue(device_id);
CREATE INDEX idx_offline_queue_synced ON offline_queue(synced_at) WHERE synced_at IS NULL;

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_company ON audit_log(company_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active resources with position
CREATE VIEW v_active_resources AS
SELECT 
  r.*,
  u.first_name || ' ' || u.last_name AS operator_name,
  ST_Y(r.current_position::geometry) AS latitude,
  ST_X(r.current_position::geometry) AS longitude
FROM resources r
LEFT JOIN users u ON r.assigned_operator_id = u.id
WHERE r.status NOT IN ('offline', 'maintenance');

-- Job summary
CREATE VIEW v_job_summary AS
SELECT 
  j.*,
  COUNT(DISTINCT ja.resource_id) AS assigned_resource_count,
  COUNT(DISTINCT d.id) FILTER (WHERE NOT d.resolved) AS open_deviation_count,
  SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time))/3600) AS total_hours
FROM jobs j
LEFT JOIN job_assignments ja ON j.id = ja.job_id
LEFT JOIN deviations d ON j.id = d.job_id
LEFT JOIN time_entries te ON j.id = te.job_id
GROUP BY j.id;

-- Site material inventory
CREATE VIEW v_site_inventory AS
SELECT 
  s.id AS site_id,
  s.name AS site_name,
  s.type AS site_type,
  m.id AS material_id,
  m.name AS material_name,
  m.code AS material_code,
  m.current_stock,
  m.unit,
  m.availability,
  m.min_stock,
  CASE 
    WHEN m.current_stock <= m.min_stock THEN 'low'
    WHEN m.current_stock = 0 THEN 'out'
    ELSE 'ok'
  END AS stock_status
FROM sites s
JOIN materials m ON s.id = m.site_id
WHERE s.status = 'active';

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_garages_updated_at BEFORE UPDATE ON garages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_service_records_updated_at BEFORE UPDATE ON service_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update material stock after transaction
CREATE OR REPLACE FUNCTION update_material_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'in' THEN
    UPDATE materials SET current_stock = current_stock + NEW.quantity
    WHERE id = NEW.material_id;
  ELSIF NEW.type = 'out' THEN
    UPDATE materials SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.material_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_material_stock_trigger AFTER INSERT ON material_transactions
  FOR EACH ROW EXECUTE FUNCTION update_material_stock();

-- Update resource position from GPS reading
CREATE OR REPLACE FUNCTION update_resource_position()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE resources SET 
    current_position = NEW.position,
    current_speed = NEW.speed,
    current_heading = NEW.heading,
    position_updated_at = NEW.recorded_at,
    fuel_level = COALESCE(NEW.fuel_level, fuel_level),
    operating_hours = COALESCE(NEW.engine_hours, operating_hours)
  WHERE id = NEW.resource_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_resource_position_trigger AFTER INSERT ON gps_readings
  FOR EACH ROW EXECUTE FUNCTION update_resource_position();

-- ============================================
-- SAMPLE DATA (for demo)
-- ============================================

-- Insert demo company
INSERT INTO companies (id, name, organization_number, address_street, address_postal_code, address_city, contact_phone, contact_email)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'SYLON Demo Contractors AB',
  '556123-4567',
  'Industrigatan 15',
  '852 33',
  'Sundsvall',
  '+46 60 123 45 67',
  'info@sylon-demo.se'
);

-- Note: Additional sample data would be inserted here for resources, sites, etc.
-- For production, use migration scripts with proper seeding.
