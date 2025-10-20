/*
# Create leads table

1. New Tables
- `leads`
  - `id` (uuid, primary key)
  - `first_name` (text)
  - `last_name` (text)
  - `street_address` (text)
  - `city` (text)
  - `state` (text)
  - `zip` (text)
  - `phone` (text)
  - `email` (text)
  - `status` (text)
  - `notes` (text)
  - `organization_id` (uuid, foreign key)
  - `created_at` (timestamp)

2. Security
- Enable RLS on `leads` table
- Add policy for authenticated users to read/write leads in their organization
*/

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  street_address text NOT NULL,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  status text DEFAULT 'New',
  notes text,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leads are viewable by org members" 
ON leads FOR SELECT TO authenticated 
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Leads are insertable by org members" 
ON leads FOR INSERT TO authenticated 
WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Leads are updatable by org members" 
ON leads FOR UPDATE TO authenticated 
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));