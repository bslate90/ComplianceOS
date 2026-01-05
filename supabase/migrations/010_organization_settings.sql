-- Migration: Organization Settings, Branding, Notifications, and Audit Log
-- Created: 2026-01-04

-- Organization Settings table (extended settings for organizations)
CREATE TABLE IF NOT EXISTS organization_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Label Defaults
    default_label_format TEXT DEFAULT 'fda_vertical',
    default_serving_size_g DECIMAL(10,2) DEFAULT 30,
    default_servings_per_container INTEGER DEFAULT 1,
    default_household_measure TEXT DEFAULT '1 serving',
    show_dual_column BOOLEAN DEFAULT false,
    
    -- Branding
    logo_url TEXT,
    primary_color TEXT DEFAULT '#10b981',
    secondary_color TEXT DEFAULT '#0d9488',
    company_address TEXT,
    company_phone TEXT,
    company_website TEXT,
    general_disclaimer TEXT,
    footer_text TEXT,
    
    -- Notifications
    email_compliance_alerts BOOLEAN DEFAULT true,
    email_expiration_reminders BOOLEAN DEFAULT true,
    email_weekly_digest BOOLEAN DEFAULT false,
    email_team_activity BOOLEAN DEFAULT false,
    expiration_reminder_days INTEGER DEFAULT 30,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(organization_id)
);

-- User permissions table (granular permissions per user)
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Permission flags
    can_manage_ingredients BOOLEAN DEFAULT true,
    can_manage_recipes BOOLEAN DEFAULT true,
    can_manage_labels BOOLEAN DEFAULT true,
    can_manage_suppliers BOOLEAN DEFAULT true,
    can_export_data BOOLEAN DEFAULT true,
    can_import_data BOOLEAN DEFAULT false,
    can_manage_team BOOLEAN DEFAULT false,
    can_manage_settings BOOLEAN DEFAULT false,
    can_view_audit_log BOOLEAN DEFAULT false,
    can_delete_data BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    UNIQUE(profile_id, organization_id)
);

-- Organization Audit Log (comprehensive activity tracking)
CREATE TABLE IF NOT EXISTS organization_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    user_email TEXT,
    
    -- Action details
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'ingredient', 'recipe', 'label', 'supplier', 'settings', 'user', etc.
    entity_id UUID,
    entity_name TEXT,
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    change_summary TEXT,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_settings_org_id ON organization_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_profile_id ON user_permissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_org_id ON user_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_audit_log_org_id ON organization_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_audit_log_user_id ON organization_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_org_audit_log_created_at ON organization_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_audit_log_entity_type ON organization_audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_org_audit_log_action ON organization_audit_log(action);

-- Enable RLS
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_settings
CREATE POLICY "Users can view their organization settings"
    ON organization_settings FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can update their organization settings"
    ON organization_settings FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert organization settings"
    ON organization_settings FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for user_permissions
CREATE POLICY "Users can view their own permissions"
    ON user_permissions FOR SELECT
    USING (
        profile_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage permissions"
    ON user_permissions FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for organization_audit_log
CREATE POLICY "Users with permission can view audit log"
    ON organization_audit_log FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "System can insert audit log entries"
    ON organization_audit_log FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_org_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_org_settings_timestamp ON organization_settings;
CREATE TRIGGER update_org_settings_timestamp
    BEFORE UPDATE ON organization_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_org_settings_updated_at();

DROP TRIGGER IF EXISTS update_user_permissions_timestamp ON user_permissions;
CREATE TRIGGER update_user_permissions_timestamp
    BEFORE UPDATE ON user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_org_settings_updated_at();

-- Function to log audit entries
CREATE OR REPLACE FUNCTION log_organization_activity(
    p_organization_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID DEFAULT NULL,
    p_entity_name TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_change_summary TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_name TEXT;
    v_user_email TEXT;
    v_log_id UUID;
BEGIN
    -- Get user info
    SELECT full_name INTO v_user_name FROM profiles WHERE id = p_user_id;
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    
    INSERT INTO organization_audit_log (
        organization_id, user_id, user_name, user_email,
        action, entity_type, entity_id, entity_name,
        old_values, new_values, change_summary
    ) VALUES (
        p_organization_id, p_user_id, v_user_name, v_user_email,
        p_action, p_entity_type, p_entity_id, p_entity_name,
        p_old_values, p_new_values, p_change_summary
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
