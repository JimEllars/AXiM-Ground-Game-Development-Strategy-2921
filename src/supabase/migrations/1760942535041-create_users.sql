/*
# Create users table

1. New Tables
- `users`
  - `id` (uuid, primary key)
  - `email` (text, unique)
  - `first_name` (text)
  - `last_name` (text)
  - `role` (text)
  - `organization_id` (uuid, foreign key)
  - `created_at` (timestamp)

2. Security
- Enable RLS on `users` table
- Add policy for authenticated users to read their own data
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  role text NOT NULL DEFAULT 'REP',
  organization_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON users 
FOR SELECT TO authenticated 
USING (auth.uid() = id);