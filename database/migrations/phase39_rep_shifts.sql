CREATE TABLE IF NOT EXISTS rep_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  distance_meters NUMERIC DEFAULT 0,
  pins_knocked INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rep_shifts_user_id ON rep_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_rep_shifts_org_id ON rep_shifts(organization_id);
CREATE INDEX IF NOT EXISTS idx_rep_shifts_team_id ON rep_shifts(team_id);