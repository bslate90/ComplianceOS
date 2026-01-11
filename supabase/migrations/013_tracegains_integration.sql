-- Migration: TraceGains Integration Support
-- Adds tables for TraceGains credentials and item linking

-- Table to store TraceGains API credentials per organization
-- Credentials are encrypted at the application level before storage
CREATE TABLE IF NOT EXISTS tracegains_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    api_key_encrypted TEXT NOT NULL,  -- Encrypted API bearer token
    instance_url TEXT NOT NULL DEFAULT 'https://api.tracegains.net',
    is_connected BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'not_synced', -- 'not_synced', 'syncing', 'success', 'error'
    sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- Table to cache TraceGains items for linking
CREATE TABLE IF NOT EXISTS tracegains_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tracegains_item_id TEXT NOT NULL,  -- TraceGains internal item ID
    name TEXT NOT NULL,
    item_number TEXT,  -- TraceGains item number/code
    category TEXT,
    supplier_name TEXT,
    specification_id TEXT,
    last_updated_at TIMESTAMPTZ,
    raw_data JSONB,  -- Full TraceGains item data for reference
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, tracegains_item_id)
);

-- Link table to connect local ingredients to TraceGains items
CREATE TABLE IF NOT EXISTS ingredient_tracegains_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    tracegains_item_id UUID NOT NULL REFERENCES tracegains_items(id) ON DELETE CASCADE,
    linked_by UUID REFERENCES profiles(id),
    auto_sync BOOLEAN DEFAULT FALSE,  -- Whether to auto-update ingredient data from TraceGains
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ingredient_id, tracegains_item_id)
);

-- Add tracegains_item_id to ingredients table for direct linking
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS tracegains_item_id TEXT DEFAULT NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tracegains_items_org ON tracegains_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_tracegains_items_name ON tracegains_items(name);
CREATE INDEX IF NOT EXISTS idx_tracegains_items_item_number ON tracegains_items(item_number);
CREATE INDEX IF NOT EXISTS idx_ingredient_links_ingredient ON ingredient_tracegains_links(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_tracegains ON ingredients(tracegains_item_id);

-- Enable RLS
ALTER TABLE tracegains_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracegains_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_tracegains_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracegains_credentials
CREATE POLICY "Users can view their organization's TraceGains credentials"
    ON tracegains_credentials FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their organization's TraceGains credentials"
    ON tracegains_credentials FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's TraceGains credentials"
    ON tracegains_credentials FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their organization's TraceGains credentials"
    ON tracegains_credentials FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for tracegains_items
CREATE POLICY "Users can view their organization's TraceGains items"
    ON tracegains_items FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their organization's TraceGains items"
    ON tracegains_items FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for ingredient_tracegains_links
CREATE POLICY "Users can view their organization's TraceGains links"
    ON ingredient_tracegains_links FOR SELECT
    USING (
        ingredient_id IN (
            SELECT id FROM ingredients WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage their organization's TraceGains links"
    ON ingredient_tracegains_links FOR ALL
    USING (
        ingredient_id IN (
            SELECT id FROM ingredients WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Comment for documentation
COMMENT ON TABLE tracegains_credentials IS 'Stores encrypted TraceGains API credentials per organization';
COMMENT ON TABLE tracegains_items IS 'Cached TraceGains items/ingredients for linking to local ingredients';
COMMENT ON TABLE ingredient_tracegains_links IS 'Links between local ingredients and TraceGains items';
