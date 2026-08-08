-- Add team_id to territory_assignments to support assigning territories to a team
ALTER TABLE territory_assignments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE territory_assignments ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Drop old UNIQUE constraint and create a new one that allows either user_id or team_id to be unique per territory
ALTER TABLE territory_assignments DROP CONSTRAINT territory_assignments_user_id_territory_id_key;
CREATE UNIQUE INDEX territory_assignments_user_id_territory_id_idx ON territory_assignments (user_id, territory_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX territory_assignments_team_id_territory_id_idx ON territory_assignments (team_id, territory_id) WHERE team_id IS NOT NULL;

-- Ensure at least one is present
ALTER TABLE territory_assignments ADD CONSTRAINT territory_assignments_target_check CHECK (
    (user_id IS NOT NULL AND team_id IS NULL) OR
    (user_id IS NULL AND team_id IS NOT NULL)
);
