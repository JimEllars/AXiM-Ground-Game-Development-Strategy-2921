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
