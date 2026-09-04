-- Add client_mutation_id for offline sync idempotency
ALTER TABLE interactions ADD COLUMN client_mutation_id UUID UNIQUE;
CREATE INDEX idx_interactions_client_mutation_id ON interactions (client_mutation_id);
