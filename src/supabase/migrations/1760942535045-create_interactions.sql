/*
# Create interactions table

1. New Tables
- `interactions`
  - `id` (uuid, primary key)
  - `lead_id` (uuid, foreign key)
  - `user_id` (uuid, foreign key)
  - `outcome` (text)
  - `notes` (text)
  - `interaction_date` (timestamp)
  - `location` (jsonb)
  - `created_at` (timestamp)

2. Security
- Enable RLS on `interactions` table
- Add policy for authenticated users to read/write their own interactions
*/

CREATE TABLE IF NOT EXISTS interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id),
  user_id uuid REFERENCES users(id),
  outcome text NOT NULL,
  notes text,
  interaction_date timestamptz DEFAULT now(),
  location jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Interactions are viewable by creator" 
ON interactions FOR SELECT TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Interactions are insertable by authenticated users" 
ON interactions FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Interactions are updatable by creator" 
ON interactions FOR UPDATE TO authenticated 
USING (user_id = auth.uid());