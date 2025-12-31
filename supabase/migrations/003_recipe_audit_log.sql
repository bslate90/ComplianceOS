-- Recipe Audit Trail
-- Tracks all changes to recipes for compliance documentation

CREATE TABLE IF NOT EXISTS recipe_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
    recipe_name VARCHAR(255), -- Store name in case recipe is deleted
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_name VARCHAR(255), -- Store name in case user is deleted
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'
    changes JSONB, -- {field: {old: x, new: y}}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_recipe_audit_recipe_id ON recipe_audit_log(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_audit_org_id ON recipe_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_recipe_audit_created_at ON recipe_audit_log(created_at);

-- RLS Policies
ALTER TABLE recipe_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's audit logs" ON recipe_audit_log
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert audit logs for their organization" ON recipe_audit_log
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );
