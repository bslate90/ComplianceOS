-- Compliance Rules
-- Stores FDA and regulatory compliance requirements for NFP labels and other compliance areas
-- Based on FDA Guidance for Industry: A Food Labeling Guide (https://www.fda.gov/media/81606/download)

CREATE TABLE IF NOT EXISTS compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    rule_type VARCHAR(100) NOT NULL, -- 'nfp_format', 'serving_size', 'nutrient_content_claim', 'health_claim', 'allergen_labeling', etc.
    rule_category VARCHAR(50) NOT NULL, -- 'required', 'conditional', 'optional', 'prohibited'
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    requirements JSONB NOT NULL, -- Detailed rule specifications, thresholds, conditions
    cfr_reference VARCHAR(100), -- e.g., '21 CFR 101.9(d)(7)'
    guidance_reference TEXT, -- Link or reference to FDA guidance document
    severity VARCHAR(50) DEFAULT 'error', -- 'error', 'warning', 'info'
    active BOOLEAN DEFAULT true,
    applicable_to JSONB, -- Conditions when rule applies: {product_types: [], package_sizes: [], etc.}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Label Validation Results
-- Stores compliance validation results for each label
ALTER TABLE labels ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(50) DEFAULT 'pending'; -- 'compliant', 'warnings', 'errors', 'pending'
ALTER TABLE labels ADD COLUMN IF NOT EXISTS validation_results JSONB; -- Detailed validation check results
ALTER TABLE labels ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE labels ADD COLUMN IF NOT EXISTS claim_statements JSONB; -- Nutrient content claims with validation

-- Indices for fast lookups
CREATE INDEX IF NOT EXISTS idx_compliance_rules_type ON compliance_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_category ON compliance_rules(rule_category);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_org_id ON compliance_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_active ON compliance_rules(active);
CREATE INDEX IF NOT EXISTS idx_labels_compliance_status ON labels(compliance_status);

-- RLS Policies for compliance_rules
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's compliance rules" ON compliance_rules
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
        OR organization_id IS NULL -- Allow viewing global/FDA rules
    );

CREATE POLICY "Users can insert compliance rules for their organization" ON compliance_rules
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's compliance rules" ON compliance_rules
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their organization's compliance rules" ON compliance_rules
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_compliance_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER compliance_rules_updated_at
    BEFORE UPDATE ON compliance_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_rules_updated_at();
