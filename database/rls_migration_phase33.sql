-- Update policies to consider team assignments as well as user assignments for reps, and for team leaders

-- Drop existing REP and TEAM_LEADER policies if they exist (need to fix TEAM_LEADER overarching policies too, previously we didn't add the team scoping fully for map pins)
DROP POLICY IF EXISTS leads_rep_policy ON leads;
DROP POLICY IF EXISTS interactions_rep_policy ON interactions;
DROP POLICY IF EXISTS leads_manager_policy ON leads;
DROP POLICY IF EXISTS interactions_manager_policy ON interactions;
DROP POLICY IF EXISTS leads_team_leader_policy ON leads;
DROP POLICY IF EXISTS interactions_team_leader_policy ON interactions;

-- TEAM_LEADER Policies
-- TEAM_LEADER can read/write leads in territories assigned to their team OR assigned to reps in their team
CREATE POLICY leads_team_leader_policy ON leads
    FOR ALL
    USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND current_setting('app.current_user_role', true) = 'TEAM_LEADER'
        AND EXISTS (
            SELECT 1
            FROM territory_assignments ta
            JOIN territories t ON ta.territory_id = t.id
            LEFT JOIN users u ON ta.user_id = u.id
            WHERE (
              ta.team_id = (SELECT team_id FROM users WHERE id = current_setting('app.current_user_id', true)::uuid)
              OR u.team_id = (SELECT team_id FROM users WHERE id = current_setting('app.current_user_id', true)::uuid)
            )
            AND ST_Contains(t.boundary, leads.location)
        )
    );

CREATE POLICY interactions_team_leader_policy ON interactions
    FOR ALL
    USING (
        lead_id IN (SELECT id FROM leads WHERE organization_id = current_setting('app.current_organization_id', true)::uuid)
        AND current_setting('app.current_user_role', true) = 'TEAM_LEADER'
        AND (
            user_id IN (SELECT id FROM users WHERE team_id = (SELECT team_id FROM users WHERE id = current_setting('app.current_user_id', true)::uuid))
            OR user_id = current_setting('app.current_user_id', true)::uuid
        )
    );

-- REP Policies
-- REP can read/update leads in territories assigned specifically to them OR assigned to their team
CREATE POLICY leads_rep_policy ON leads
    FOR ALL
    USING (
        organization_id = current_setting('app.current_organization_id', true)::uuid
        AND current_setting('app.current_user_role', true) = 'REP'
        AND EXISTS (
            SELECT 1
            FROM territory_assignments ta
            JOIN territories t ON ta.territory_id = t.id
            WHERE (
              ta.user_id = current_setting('app.current_user_id', true)::uuid
              OR ta.team_id = (SELECT team_id FROM users WHERE id = current_setting('app.current_user_id', true)::uuid)
            )
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
            WHERE (
              ta.user_id = current_setting('app.current_user_id', true)::uuid
              OR ta.team_id = (SELECT team_id FROM users WHERE id = current_setting('app.current_user_id', true)::uuid)
            )
            AND ST_Contains(t.boundary, interactions.location)
        )
    );
