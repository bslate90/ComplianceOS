---
description: Develop CAPA (Corrective and Preventive Action) management system
---

# CAPA Management Development Workflow

## Overview
Build a comprehensive CAPA tracking system for food safety compliance, tracking corrective and preventive actions from identification through verification and closure.

## Step 1: Database Migration

Create the database migration file at `supabase/migrations/012_capa_management.sql`:

```sql
-- CAPA Categories
CREATE TABLE IF NOT EXISTS capa_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_corrective BOOLEAN DEFAULT true,
    is_preventive BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main CAPA table
CREATE TABLE IF NOT EXISTS capas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    capa_number TEXT NOT NULL, -- Auto-generated: CAPA-2024-001
    title TEXT NOT NULL,
    description TEXT,
    capa_type TEXT NOT NULL CHECK (capa_type IN ('corrective', 'preventive', 'both')),
    category_id UUID REFERENCES capa_categories(id),
    
    -- Source/trigger
    source_type TEXT, -- audit, complaint, ncr, inspection, spc, other
    source_reference TEXT, -- Link to source document/record
    
    -- Root cause
    root_cause_method TEXT, -- 5-why, fishbone, fmea, other
    root_cause_analysis TEXT,
    
    -- Action details
    immediate_action TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    
    -- Assignments
    initiated_by UUID REFERENCES profiles(id),
    assigned_to UUID REFERENCES profiles(id),
    verified_by UUID REFERENCES profiles(id),
    approved_by UUID REFERENCES profiles(id),
    
    -- Dates
    identified_date DATE NOT NULL DEFAULT CURRENT_DATE,
    target_date DATE,
    completed_date DATE,
    verified_date DATE,
    closed_date DATE,
    
    -- Status workflow
    status TEXT DEFAULT 'open' CHECK (status IN (
        'open', 'investigating', 'action_planned', 
        'in_progress', 'pending_verification', 
        'verified', 'closed', 'cancelled'
    )),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Effectiveness
    effectiveness_check_date DATE,
    effectiveness_verified BOOLEAN DEFAULT false,
    effectiveness_notes TEXT,
    
    -- Related records
    supplier_id UUID REFERENCES suppliers(id),
    recipe_id UUID REFERENCES recipes(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAPA action items (tasks)
CREATE TABLE IF NOT EXISTS capa_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capa_id UUID NOT NULL REFERENCES capas(id) ON DELETE CASCADE,
    action_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    assigned_to UUID REFERENCES profiles(id),
    due_date DATE,
    completed_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAPA attachments
CREATE TABLE IF NOT EXISTS capa_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capa_id UUID NOT NULL REFERENCES capas(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAPA comments/notes
CREATE TABLE IF NOT EXISTS capa_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    capa_id UUID NOT NULL REFERENCES capas(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE capa_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE capas ENABLE ROW LEVEL SECURITY;
ALTER TABLE capa_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE capa_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE capa_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (organization-based access)
CREATE POLICY "Users can view CAPAs in their organization"
    ON capas FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

-- Add similar policies for INSERT, UPDATE, DELETE
```

## Step 2: TypeScript Types

Add types to `src/lib/database.types.ts` for the new tables.

## Step 3: API Routes

Create API routes at `src/app/api/capas/route.ts`:
- GET: List CAPAs with filtering
- POST: Create new CAPA

Create `src/app/api/capas/[id]/route.ts`:
- GET: Single CAPA details
- PUT: Update CAPA
- DELETE: Archive CAPA

## Step 4: Dashboard Page

Create the CAPA dashboard at `src/app/(dashboard)/capas/page.tsx`:
- List view with status filters
- Summary stats (Open, Overdue, Closed this month)
- Quick actions

## Step 5: CAPA Form

Create new CAPA form at `src/app/(dashboard)/capas/new/page.tsx`:
- Multi-step wizard or tabbed form
- Root cause analysis section
- Action items list
- File uploads

## Step 6: Detail View

Create CAPA detail page at `src/app/(dashboard)/capas/[id]/page.tsx`:
- Full CAPA information
- Action items with status
- Comments/notes timeline
- Status workflow buttons

## Key Considerations

1. **Auto-numbering**: Generate CAPA numbers like "CAPA-2024-001"
2. **Due Date Alerts**: Highlight overdue items
3. **Audit Trail**: Log all status changes
4. **Email Notifications**: Alert assigned users
5. **Dashboard Widgets**: Add CAPA stats to main dashboard
6. **Reporting**: Export CAPA summary reports

## Testing

```bash
# Verify TypeScript
npx tsc --noEmit

# Run dev server to test UI
npm run dev
```
