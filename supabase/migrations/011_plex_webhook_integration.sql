-- Migration: PLEX ERP Integration and Webhook Support
-- Created: 2026-01-04
-- Purpose: Enable bi-directional data sync with PLEX by Rockwell Automation

-- Webhook configuration table
CREATE TABLE IF NOT EXISTS webhook_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Connection details
    name TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'plex', -- 'plex', 'custom', etc.
    webhook_url TEXT, -- For outgoing webhooks to PLEX
    api_key TEXT, -- Encrypted API key for authentication
    api_secret TEXT, -- Encrypted secret
    
    -- PLEX-specific configuration
    plex_company_code TEXT,
    plex_data_source_key TEXT,
    plex_environment TEXT DEFAULT 'production', -- 'production', 'test'
    
    -- Sync settings
    sync_ingredients BOOLEAN DEFAULT true,
    sync_recipes BOOLEAN DEFAULT true,
    sync_nutrition BOOLEAN DEFAULT true,
    sync_compliance BOOLEAN DEFAULT true,
    auto_generate_reports BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Incoming webhook events log
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    webhook_config_id UUID REFERENCES webhook_configurations(id) ON DELETE SET NULL,
    
    -- Event details
    event_type TEXT NOT NULL, -- 'formulation_created', 'formulation_updated', 'formulation_deleted'
    source TEXT NOT NULL DEFAULT 'plex',
    external_id TEXT, -- PLEX record ID
    
    -- Payload
    payload JSONB NOT NULL,
    headers JSONB,
    
    -- Processing status
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Result tracking
    recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    compliance_report_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Compliance reports table
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Source
    recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    label_id UUID REFERENCES labels(id) ON DELETE SET NULL,
    trigger_source TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'webhook', 'schedule', 'recipe_update'
    webhook_event_id UUID REFERENCES webhook_events(id) ON DELETE SET NULL,
    
    -- Report details
    report_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'nutrition', 'allergen', 'labeling'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    
    -- Results
    overall_status TEXT, -- 'compliant', 'warnings', 'errors'
    total_checks INTEGER DEFAULT 0,
    passed_checks INTEGER DEFAULT 0,
    warning_checks INTEGER DEFAULT 0,
    failed_checks INTEGER DEFAULT 0,
    
    -- Detailed results
    results JSONB,
    summary TEXT,
    recommendations JSONB,
    
    -- Metadata
    generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    generated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Sync queue for outgoing data to PLEX
CREATE TABLE IF NOT EXISTS plex_sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    webhook_config_id UUID REFERENCES webhook_configurations(id) ON DELETE CASCADE,
    
    -- What to sync
    entity_type TEXT NOT NULL, -- 'ingredient', 'recipe', 'nutrition', 'compliance_report'
    entity_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'delete'
    
    -- Payload to send
    payload JSONB NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'failed'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_attempt_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    response_data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_configs_org ON webhook_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON webhook_configurations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_webhook_events_org ON webhook_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_org ON compliance_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_recipe ON compliance_reports(recipe_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_status ON compliance_reports(status);
CREATE INDEX IF NOT EXISTS idx_plex_sync_queue_status ON plex_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_plex_sync_queue_next_attempt ON plex_sync_queue(next_attempt_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE webhook_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE plex_sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Webhook Configurations (Admin only)
CREATE POLICY "Admins can manage webhook configurations"
    ON webhook_configurations FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies - Webhook Events
CREATE POLICY "Organization members can view webhook events"
    ON webhook_events FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "System can insert webhook events"
    ON webhook_events FOR INSERT
    WITH CHECK (true); -- Webhooks come from external sources

CREATE POLICY "Admins can update webhook events"
    ON webhook_events FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies - Compliance Reports
CREATE POLICY "Organization members can view compliance reports"
    ON compliance_reports FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Organization members can create compliance reports"
    ON compliance_reports FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Organization members can update their compliance reports"
    ON compliance_reports FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies - Sync Queue
CREATE POLICY "Admins can manage sync queue"
    ON plex_sync_queue FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Triggers for updated_at
CREATE TRIGGER update_webhook_configs_timestamp
    BEFORE UPDATE ON webhook_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_org_settings_updated_at();

CREATE TRIGGER update_compliance_reports_timestamp
    BEFORE UPDATE ON compliance_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_org_settings_updated_at();

-- Function to queue recipe changes for PLEX sync
CREATE OR REPLACE FUNCTION queue_recipe_for_plex_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_config_id UUID;
    v_org_id UUID;
BEGIN
    v_org_id := COALESCE(NEW.organization_id, OLD.organization_id);
    
    -- Find active PLEX webhook config for this organization
    SELECT id INTO v_config_id
    FROM webhook_configurations
    WHERE organization_id = v_org_id
      AND provider = 'plex'
      AND is_active = true
      AND sync_recipes = true
    LIMIT 1;
    
    -- If no active config, skip
    IF v_config_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Queue the sync
    INSERT INTO plex_sync_queue (
        organization_id,
        webhook_config_id,
        entity_type,
        entity_id,
        action,
        payload,
        next_attempt_at
    ) VALUES (
        v_org_id,
        v_config_id,
        'recipe',
        COALESCE(NEW.id, OLD.id),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'create'
            WHEN TG_OP = 'UPDATE' THEN 'update'
            WHEN TG_OP = 'DELETE' THEN 'delete'
        END,
        CASE 
            WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
            ELSE to_jsonb(NEW)
        END,
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-queue recipe changes
DROP TRIGGER IF EXISTS queue_recipe_plex_sync ON recipes;
CREATE TRIGGER queue_recipe_plex_sync
    AFTER INSERT OR UPDATE OR DELETE ON recipes
    FOR EACH ROW
    EXECUTE FUNCTION queue_recipe_for_plex_sync();

-- Function to auto-generate compliance report on recipe update
CREATE OR REPLACE FUNCTION auto_generate_compliance_report()
RETURNS TRIGGER AS $$
DECLARE
    v_config_id UUID;
    v_org_id UUID;
BEGIN
    v_org_id := NEW.organization_id;
    
    -- Check if auto-report generation is enabled
    SELECT id INTO v_config_id
    FROM webhook_configurations
    WHERE organization_id = v_org_id
      AND is_active = true
      AND auto_generate_reports = true
    LIMIT 1;
    
    -- If enabled, create a pending compliance report
    IF v_config_id IS NOT NULL THEN
        INSERT INTO compliance_reports (
            organization_id,
            recipe_id,
            trigger_source,
            report_type,
            status
        ) VALUES (
            v_org_id,
            NEW.id,
            'recipe_update',
            'full',
            'pending'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto compliance report generation on recipe update
DROP TRIGGER IF EXISTS auto_compliance_on_recipe_update ON recipes;
CREATE TRIGGER auto_compliance_on_recipe_update
    AFTER UPDATE ON recipes
    FOR EACH ROW
    WHEN (OLD.calculated_nutrition IS DISTINCT FROM NEW.calculated_nutrition
          OR OLD.recipe_yield_g IS DISTINCT FROM NEW.recipe_yield_g
          OR OLD.serving_size_g IS DISTINCT FROM NEW.serving_size_g)
    EXECUTE FUNCTION auto_generate_compliance_report();
