-- AXiM Ground Game Database Schema

-- Drop existing tables and types to ensure a clean slate
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS interactions CASCADE;
DROP TABLE IF EXISTS territory_assignments CASCADE;
DROP TABLE IF EXISTS territories CASCADE;
DROP TABLE IF EXISTS lead_pii CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Enable PostGIS extension for geospatial operations
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User roles enum
CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'REP');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'REP',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Anonymized leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'New',
    notes TEXT,
    location GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for Personally Identifiable Information (PII)
CREATE TABLE lead_pii (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    street_address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lead_id)
);

-- Spatial index for fast geospatial queries
CREATE INDEX leads_location_idx ON leads USING GIST (location);
CREATE INDEX leads_organization_idx ON leads (organization_id);
CREATE INDEX leads_status_idx ON leads (status);
CREATE INDEX lead_pii_lead_id_idx ON lead_pii (lead_id);

-- Territories table for turf management
CREATE TABLE territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial index for territory boundaries
CREATE INDEX territories_boundary_idx ON territories USING GIST (boundary);
CREATE INDEX territories_organization_idx ON territories (organization_id);

-- Territory assignments (many-to-many relationship)
CREATE TABLE territory_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, territory_id)
);

-- Interactions/activities table
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    outcome VARCHAR(100) NOT NULL,
    notes TEXT,
    interaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    location GEOMETRY(Point, 4326),
    synced_at TIMESTAMP WITH TIME ZONE,
    survey_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX interactions_lead_idx ON interactions (lead_id);
CREATE INDEX interactions_user_idx ON interactions (user_id);
CREATE INDEX interactions_date_idx ON interactions (interaction_date);
CREATE INDEX interactions_synced_idx ON interactions (synced_at);

-- Custom Surveys table
CREATE TABLE custom_surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    questions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX custom_surveys_organization_idx ON custom_surveys (organization_id);

-- Custom Dispositions table
CREATE TABLE custom_dispositions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    require_notes BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX custom_dispositions_organization_idx ON custom_dispositions (organization_id);

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'Scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX appointments_organization_idx ON appointments (organization_id);
CREATE INDEX appointments_lead_idx ON appointments (lead_id);
CREATE INDEX appointments_user_idx ON appointments (user_id);
CREATE INDEX appointments_scheduled_at_idx ON appointments (scheduled_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lead_pii_updated_at BEFORE UPDATE ON lead_pii FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_territories_updated_at BEFORE UPDATE ON territories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_surveys_updated_at BEFORE UPDATE ON custom_surveys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_dispositions_updated_at BEFORE UPDATE ON custom_dispositions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for development with properly hashed passwords
TRUNCATE TABLE organizations CASCADE;
INSERT INTO organizations (id, name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'Demo Organization');

INSERT INTO teams (id, organization_id, name, description) VALUES
    ('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440000', 'Alpha Team', 'The primary canvassing team');

INSERT INTO users (id, organization_id, team_id, email, password_hash, first_name, last_name, role) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', NULL, 'admin@axim.com', '$2b$10$/3wbZwtwXLMqPZ0qH1mcCepgU5IjqH5lZOXoDUXdBA70A6/PX9V82', 'Admin', 'User', 'ADMIN'),
    ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440006', 'manager@axim.com', '$2b$10$/3wbZwtwXLMqPZ0qH1mcCepgU5IjqH5lZOXoDUXdBA70A6/PX9V82', 'Manager', 'User', 'MANAGER'),
    ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440006', 'rep@axim.com', '$2b$10$/3wbZwtwXLMqPZ0qH1mcCepgU5IjqH5lZOXoDUXdBA70A6/PX9V82', 'Rep', 'User', 'REP');

-- Sample Leads
WITH lead_insert AS (
  INSERT INTO leads (id, organization_id, location) VALUES
  ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', ST_SetSRID(ST_MakePoint(-74.0060, 40.7128), 4326)),
  ('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326))
  RETURNING id
)
INSERT INTO lead_pii (lead_id, first_name, last_name, street_address, city, state, zip)
SELECT id,
       CASE WHEN id = '550e8400-e29b-41d4-a716-446655440004' THEN 'John' ELSE 'Jane' END,
       CASE WHEN id = '550e8400-e29b-41d4-a716-446655440004' THEN 'Doe' ELSE 'Smith' END,
       CASE WHEN id = '550e8400-e29b-41d4-a716-446655440004' THEN '123 Main St' ELSE '456 Oak Ave' END,
       CASE WHEN id = '550e8400-e29b-41d4-a716-446655440004' THEN 'New York' ELSE 'Los Angeles' END,
       CASE WHEN id = '550e8400-e29b-41d4-a716-446655440004' THEN 'NY' ELSE 'CA' END,
       CASE WHEN id = '550e8400-e29b-41d4-a716-446655440004' THEN '10001' ELSE '90001' END
FROM lead_insert;
