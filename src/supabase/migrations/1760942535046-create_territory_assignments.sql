/*
# Create territory assignments table

1. New Tables
- `territory_assignments`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `territory_id` (uuid, foreign key)
  - `assigned_by` (uuid, foreign key)
  - `assigned_at` (timestamp)

2. Security
- Enable RLS on `territory_assignments` table
- Add policy for authenticated users to read assignments in their organization
*/

CREATE TABLE IF NOT EXISTS territory_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  territory_id uuid REFERENCES territories(id),
  assigned_by uuid REFERENCES users(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, territory_id)
);

ALTER TABLE territory_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assignments are viewable by org members" 
ON territory_assignments FOR SELECT TO authenticated 
USING (
  user_id IN (SELECT id FROM users WHERE organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ))
);

CREATE POLICY "Assignments are insertable by org members" 
ON territory_assignments FOR INSERT TO authenticated 
WITH CHECK (
  user_id IN (SELECT id FROM users WHERE organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ))
);