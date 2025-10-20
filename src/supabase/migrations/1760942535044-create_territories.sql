/*
# Create territories table

1. New Tables
- `territories`
  - `id` (uuid, primary key)
  - `name` (text)
  - `description` (text)
  - `boundary` (jsonb)
  - `organization_id` (uuid, foreign key)
  - `created_by` (uuid, foreign key)
  - `created_at` (timestamp)

2. Security
- Enable RLS on `territories` table
- Add policy for authenticated users to read/write territories in their organization
*/

CREATE TABLE IF NOT EXISTS territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  boundary jsonb,
  organization_id uuid REFERENCES organizations(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Territories are viewable by org members" 
ON territories FOR SELECT TO authenticated 
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Territories are insertable by org members" 
ON territories FOR INSERT TO authenticated 
WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Territories are updatable by org members" 
ON territories FOR UPDATE TO authenticated 
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));