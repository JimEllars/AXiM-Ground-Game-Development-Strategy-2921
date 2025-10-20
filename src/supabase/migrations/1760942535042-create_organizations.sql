/*
# Create organizations table

1. New Tables
- `organizations`
  - `id` (uuid, primary key)
  - `name` (text)
  - `created_at` (timestamp)

2. Security
- Enable RLS on `organizations` table
- Add policy for authenticated users to read organizations
*/

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations are viewable by authenticated users" 
ON organizations FOR SELECT TO authenticated 
USING (true);