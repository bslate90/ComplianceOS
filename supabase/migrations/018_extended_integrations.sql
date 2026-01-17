-- Migration: Extended Integration Support
-- Adds support for FoodLogiQ, Genesis R&D, and SAP S/4HANA integrations
-- Created: 2026-01-16

-- Create webhook_configurations table if it doesn't exist (base table for all integrations)
CREATE TABLE IF NOT EXISTS webhook_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Connection details
    name TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'custom', -- 'plex', 'foodlogiq', 'genesis', 'sap', 'tracegains', 'custom'
    webhook_url TEXT,
    api_key TEXT,
    api_secret TEXT,
    
    -- Provider-specific configuration
    plex_company_code TEXT,
    plex_data_source_key TEXT,
    plex_environment TEXT DEFAULT 'production',
    
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

-- Extend webhook_configurations table for multi-provider support
ALTER TABLE webhook_configurations ADD COLUMN IF NOT EXISTS provider_config JSONB DEFAULT '{}';
ALTER TABLE webhook_configurations ADD COLUMN IF NOT EXISTS oauth_tokens JSONB;
ALTER TABLE webhook_configurations ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE webhook_configurations ADD COLUMN IF NOT EXISTS oauth_state TEXT;
ALTER TABLE webhook_configurations ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Add comment for provider values
COMMENT ON COLUMN webhook_configurations.provider IS 
    'Integration provider: plex, foodlogiq, genesis, sap, tracegains, custom';

-- Integration Sync Log - tracks all sync operations across providers
CREATE TABLE IF NOT EXISTS integration_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    config_id UUID REFERENCES webhook_configurations(id) ON DELETE SET NULL,
    
    -- Sync details
    provider TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('import', 'export', 'bidirectional')),
    sync_type TEXT NOT NULL DEFAULT 'incremental', -- 'full', 'incremental', 'manual'
    entity_type TEXT NOT NULL, -- 'ingredient', 'recipe', 'product', 'supplier', etc.
    
    -- Entity references
    entity_id UUID,
    external_id TEXT,
    external_system_ref TEXT, -- Additional reference (e.g., SAP plant code)
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'partial', 'failed', 'cancelled'
    )),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Statistics
    records_total INTEGER DEFAULT 0,
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    error_log JSONB,
    warnings JSONB,
    
    -- Metadata
    initiated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- External Entity Mapping - tracks mapping between Exodis and external system IDs
CREATE TABLE IF NOT EXISTS external_entity_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Provider and entity info
    provider TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    
    -- Exodis side
    internal_id UUID NOT NULL,
    internal_table TEXT NOT NULL, -- 'ingredients', 'recipes', 'labels', etc.
    
    -- External system side
    external_id TEXT NOT NULL,
    external_code TEXT, -- Optional user-friendly code
    external_system_ref TEXT, -- Additional context (e.g., environment, plant)
    
    -- Sync metadata
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_direction TEXT, -- 'from_external', 'to_external', 'bidirectional'
    sync_hash TEXT, -- Hash to detect changes
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Ensure unique mapping per provider/entity
    UNIQUE(organization_id, provider, entity_type, internal_id),
    UNIQUE(organization_id, provider, entity_type, external_id)
);

-- FoodLogiQ specific: Product registrations
CREATE TABLE IF NOT EXISTS foodlogiq_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    config_id UUID REFERENCES webhook_configurations(id) ON DELETE SET NULL,
    
    -- Exodis reference
    recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    
    -- FoodLogiQ data
    foodlogiq_product_id TEXT,
    community_id TEXT NOT NULL,
    gtin TEXT, -- Global Trade Item Number
    product_name TEXT NOT NULL,
    brand TEXT,
    
    -- Traceability
    lot_tracking_enabled BOOLEAN DEFAULT false,
    
    -- Compliance status from FoodLogiQ
    compliance_score DECIMAL(5,2),
    last_audit_date DATE,
    audit_status TEXT,
    
    -- Sync status
    sync_status TEXT DEFAULT 'pending',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Genesis R&D specific: Import sessions
CREATE TABLE IF NOT EXISTS genesis_import_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    config_id UUID REFERENCES webhook_configurations(id) ON DELETE SET NULL,
    
    -- Import details
    import_type TEXT NOT NULL, -- 'ingredients', 'recipes', 'analysis', 'labels'
    file_name TEXT,
    file_size INTEGER,
    
    -- Template used
    template_name TEXT,
    field_delimiter TEXT DEFAULT '\t',
    text_qualifier TEXT DEFAULT '"',
    
    -- Processing status
    status TEXT DEFAULT 'uploaded' CHECK (status IN (
        'uploaded', 'validating', 'validated', 'importing', 'completed', 'failed'
    )),
    
    -- Validation results
    validation_errors JSONB,
    validation_warnings JSONB,
    
    -- Import results
    rows_total INTEGER DEFAULT 0,
    rows_imported INTEGER DEFAULT 0,
    rows_updated INTEGER DEFAULT 0,
    rows_skipped INTEGER DEFAULT 0,
    rows_failed INTEGER DEFAULT 0,
    
    -- Error details
    error_rows JSONB,
    
    -- User who initiated
    imported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- SAP specific: Material linkage
CREATE TABLE IF NOT EXISTS sap_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    config_id UUID REFERENCES webhook_configurations(id) ON DELETE SET NULL,
    
    -- Exodis reference
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
    
    -- SAP identifiers
    material_number TEXT NOT NULL,
    plant TEXT NOT NULL,
    storage_location TEXT,
    
    -- SAP data
    material_description TEXT,
    material_type TEXT,
    material_group TEXT,
    base_unit_of_measure TEXT,
    
    -- Quality data
    inspection_type TEXT,
    quality_management_active BOOLEAN DEFAULT false,
    
    -- Sync status
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_hash TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(organization_id, material_number, plant)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_log_org ON integration_sync_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_provider ON integration_sync_log(provider);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON integration_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_sync_log_created ON integration_sync_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entity_mapping_org ON external_entity_mapping(organization_id);
CREATE INDEX IF NOT EXISTS idx_entity_mapping_lookup ON external_entity_mapping(provider, entity_type, internal_id);
CREATE INDEX IF NOT EXISTS idx_entity_mapping_external ON external_entity_mapping(provider, entity_type, external_id);

CREATE INDEX IF NOT EXISTS idx_foodlogiq_products_org ON foodlogiq_products(organization_id);
CREATE INDEX IF NOT EXISTS idx_foodlogiq_products_recipe ON foodlogiq_products(recipe_id);

CREATE INDEX IF NOT EXISTS idx_genesis_sessions_org ON genesis_import_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_genesis_sessions_status ON genesis_import_sessions(status);

CREATE INDEX IF NOT EXISTS idx_sap_materials_org ON sap_materials(organization_id);
CREATE INDEX IF NOT EXISTS idx_sap_materials_ingredient ON sap_materials(ingredient_id);

-- Enable RLS
ALTER TABLE integration_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_entity_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE foodlogiq_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE genesis_import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sap_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organization members can view sync logs"
    ON integration_sync_log FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage sync logs"
    ON integration_sync_log FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

CREATE POLICY "Organization members can view entity mappings"
    ON external_entity_mapping FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage entity mappings"
    ON external_entity_mapping FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

CREATE POLICY "Organization members can view FoodLogiQ products"
    ON foodlogiq_products FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage FoodLogiQ products"
    ON foodlogiq_products FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

CREATE POLICY "Organization members can view Genesis import sessions"
    ON genesis_import_sessions FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Members can create Genesis import sessions"
    ON genesis_import_sessions FOR INSERT
    WITH CHECK (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage Genesis import sessions"
    ON genesis_import_sessions FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

CREATE POLICY "Organization members can view SAP materials"
    ON sap_materials FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage SAP materials"
    ON sap_materials FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- Trigger for updated_at on entity mapping
DROP TRIGGER IF EXISTS update_entity_mapping_timestamp ON external_entity_mapping;
CREATE TRIGGER update_entity_mapping_timestamp
    BEFORE UPDATE ON external_entity_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_org_settings_updated_at();

DROP TRIGGER IF EXISTS update_foodlogiq_products_timestamp ON foodlogiq_products;
CREATE TRIGGER update_foodlogiq_products_timestamp
    BEFORE UPDATE ON foodlogiq_products
    FOR EACH ROW
    EXECUTE FUNCTION update_org_settings_updated_at();

DROP TRIGGER IF EXISTS update_sap_materials_timestamp ON sap_materials;
CREATE TRIGGER update_sap_materials_timestamp
    BEFORE UPDATE ON sap_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_org_settings_updated_at();

-- Webhook configurations index and RLS (if table was just created)
CREATE INDEX IF NOT EXISTS idx_webhook_configs_org ON webhook_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_provider ON webhook_configurations(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON webhook_configurations(is_active) WHERE is_active = true;

ALTER TABLE webhook_configurations ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists then recreate (safe for re-running)
DROP POLICY IF EXISTS "Admins can manage webhook configurations" ON webhook_configurations;
CREATE POLICY "Admins can manage webhook configurations"
    ON webhook_configurations FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Organization members can view webhook configurations" ON webhook_configurations;
CREATE POLICY "Organization members can view webhook configurations"
    ON webhook_configurations FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Trigger for webhook_configurations updated_at
DROP TRIGGER IF EXISTS update_webhook_configs_timestamp ON webhook_configurations;
CREATE TRIGGER update_webhook_configs_timestamp
    BEFORE UPDATE ON webhook_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_org_settings_updated_at();
