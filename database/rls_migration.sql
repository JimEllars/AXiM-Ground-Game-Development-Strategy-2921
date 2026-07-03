-- Enable RLS on core tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_pii ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_isolation_policy ON leads USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY lead_pii_isolation_policy ON lead_pii USING (lead_id IN (SELECT id FROM leads WHERE organization_id = current_setting('app.current_organization_id', true)::uuid));
CREATE POLICY territories_isolation_policy ON territories USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY interactions_isolation_policy ON interactions USING (lead_id IN (SELECT id FROM leads WHERE organization_id = current_setting('app.current_organization_id', true)::uuid));
CREATE POLICY appointments_isolation_policy ON appointments USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY custom_surveys_isolation_policy ON custom_surveys USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY custom_dispositions_isolation_policy ON custom_dispositions USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY users_isolation_policy ON users USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
CREATE POLICY teams_isolation_policy ON teams USING (organization_id = current_setting('app.current_organization_id', true)::uuid);

ALTER TABLE territory_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY territory_assignments_isolation_policy ON territory_assignments USING (territory_id IN (SELECT id FROM territories WHERE organization_id = current_setting('app.current_organization_id', true)::uuid));

-- Drop previous policies to replace them
DROP POLICY IF EXISTS leads_isolation_policy ON leads;
DROP POLICY IF EXISTS interactions_isolation_policy ON interactions;

-- Overarching policy for managers
CREATE POLICY leads_manager_policy ON leads
  AS PERMISSIVE
  FOR ALL

  USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND current_setting('app.current_user_role', true) = 'MANAGER'
  );

CREATE POLICY interactions_manager_policy ON interactions
  AS PERMISSIVE
  FOR ALL

  USING (
    lead_id IN (SELECT id FROM leads WHERE organization_id = current_setting('app.current_organization_id', true)::uuid)
    AND current_setting('app.current_user_role', true) = 'MANAGER'
  );

-- Policy for standard field reps
CREATE POLICY leads_rep_policy ON leads
  AS PERMISSIVE
  FOR ALL

  USING (
    organization_id = current_setting('app.current_organization_id', true)::uuid
    AND current_setting('app.current_user_role', true) = 'REP'
    AND ST_Contains(
      (SELECT boundary FROM territories t
       JOIN territory_assignments ta ON t.id = ta.territory_id
       WHERE ta.user_id = current_setting('app.current_user_id', true)::uuid
       LIMIT 1
      ),
      location
    )
  );

CREATE POLICY interactions_rep_policy ON interactions
  AS PERMISSIVE
  FOR ALL

  USING (
    lead_id IN (SELECT id FROM leads WHERE organization_id = current_setting('app.current_organization_id', true)::uuid)
    AND current_setting('app.current_user_role', true) = 'REP'
    AND ST_Contains(
      (SELECT boundary FROM territories t
       JOIN territory_assignments ta ON t.id = ta.territory_id
       WHERE ta.user_id = current_setting('app.current_user_id', true)::uuid
       LIMIT 1
      ),
      (SELECT location FROM leads WHERE id = lead_id)
    )
  );

-- Task 2: Supabase Row-Level Security (RLS) Lockdown

-- 1. Drop existing overarching policies on leads and interactions if they exist
DROP POLICY IF EXISTS leads_isolation_policy ON leads;
DROP POLICY IF EXISTS interactions_isolation_policy ON interactions;

-- 2. Manager overarching policies (can access all within organization)
CREATE POLICY leads_manager_policy ON leads
    FOR ALL
    USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND current_setting('app.current_user_role', true) IN ('MANAGER', 'ADMIN')
    );

CREATE POLICY interactions_manager_policy ON interactions
    FOR ALL
    USING (
        lead_id IN (SELECT id FROM leads WHERE organization_id = current_setting('app.current_organization_id', true)::uuid)
        AND current_setting('app.current_user_role', true) IN ('MANAGER', 'ADMIN')
    );

-- 3. Field Rep policies (can only access their assigned territories)
CREATE POLICY leads_rep_policy ON leads
    FOR ALL
    USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND current_setting('app.current_user_role', true) = 'REP'
        AND EXISTS (
            SELECT 1
            FROM territory_assignments ta
            JOIN territories t ON ta.territory_id = t.id
            WHERE ta.user_id = current_setting('app.current_user_id', true)::uuid
            AND ST_Contains(t.boundary, leads.location)
        )
    );

CREATE POLICY interactions_rep_policy ON interactions
    FOR ALL
    USING (
        lead_id IN (SELECT id FROM leads WHERE organization_id = current_setting('app.current_organization_id', true)::uuid)
        AND current_setting('app.current_user_role', true) = 'REP'
        AND EXISTS (
            SELECT 1
            FROM territory_assignments ta
            JOIN territories t ON ta.territory_id = t.id
            WHERE ta.user_id = current_setting('app.current_user_id', true)::uuid
            AND ST_Contains(t.boundary, interactions.location)
        )
    );
