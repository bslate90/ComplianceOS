---
description: Create SPC (Statistical Process Control) data import and visualization system
---

# SPC Data Import Development Workflow

## Overview
Build a Statistical Process Control module for importing, storing, and visualizing process control data with automatic calculation of control limits and capability indices.

## Step 1: Database Migration

Create the database migration file at `supabase/migrations/014_spc_data.sql`:

```sql
-- SPC Control Points (what we're measuring)
CREATE TABLE IF NOT EXISTS spc_control_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    unit_of_measure TEXT NOT NULL, -- lbs, oz, °F, %, etc.
    
    -- Specification limits (from customer/regulatory)
    usl NUMERIC, -- Upper Specification Limit
    lsl NUMERIC, -- Lower Specification Limit
    target NUMERIC, -- Target/nominal value
    
    -- Measurement settings
    subgroup_size INTEGER DEFAULT 5,
    measurement_frequency TEXT, -- hourly, per-batch, per-shift, etc.
    
    -- Related entities
    recipe_id UUID REFERENCES recipes(id),
    process_step TEXT,
    equipment_id TEXT,
    
    -- Control chart type
    chart_type TEXT DEFAULT 'xbar_r' CHECK (chart_type IN (
        'xbar_r',      -- X-bar and R chart (subgroups)
        'xbar_s',      -- X-bar and S chart (larger subgroups)
        'individual_mr', -- Individual and Moving Range
        'p_chart',     -- Proportion defective
        'np_chart',    -- Number defective
        'c_chart',     -- Count of defects
        'u_chart'      -- Defects per unit
    )),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SPC Data Points (individual measurements)
CREATE TABLE IF NOT EXISTS spc_data_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_point_id UUID NOT NULL REFERENCES spc_control_points(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    value NUMERIC NOT NULL,
    
    -- Subgroup info
    subgroup_id TEXT, -- Groups readings taken together
    subgroup_position INTEGER, -- Position within subgroup (1, 2, 3...)
    
    -- Context
    lot_number TEXT,
    batch_id TEXT,
    operator TEXT,
    equipment_id TEXT,
    shift TEXT,
    
    -- Flags
    is_out_of_control BOOLEAN DEFAULT false,
    out_of_control_reason TEXT,
    
    notes TEXT,
    recorded_by UUID REFERENCES profiles(id),
    import_batch_id UUID, -- For tracking imports
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SPC Calculated Statistics (periodic calculations)
CREATE TABLE IF NOT EXISTS spc_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_point_id UUID NOT NULL REFERENCES spc_control_points(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Sample statistics
    sample_count INTEGER,
    subgroup_count INTEGER,
    mean NUMERIC,
    std_dev NUMERIC,
    range_avg NUMERIC,
    
    -- Control limits (calculated from data)
    ucl NUMERIC, -- Upper Control Limit
    lcl NUMERIC, -- Lower Control Limit
    cl NUMERIC,  -- Center Line
    
    -- For R or S charts
    ucl_range NUMERIC,
    lcl_range NUMERIC,
    cl_range NUMERIC,
    
    -- Capability indices
    cp NUMERIC,  -- Process Capability
    cpk NUMERIC, -- Process Capability Index (centered)
    pp NUMERIC,  -- Process Performance
    ppk NUMERIC, -- Process Performance Index
    
    -- Out of control summary
    ooc_count INTEGER, -- Out of control points
    ooc_percentage NUMERIC,
    
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculated_by UUID REFERENCES profiles(id)
);

-- SPC Import Logs
CREATE TABLE IF NOT EXISTS spc_import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    import_source TEXT, -- 'csv', 'plex', 'manual'
    file_name TEXT,
    
    control_point_id UUID REFERENCES spc_control_points(id),
    
    records_imported INTEGER,
    records_failed INTEGER,
    error_messages JSONB,
    
    imported_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE spc_control_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE spc_data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE spc_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE spc_import_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for organization access...
```

## Step 2: SPC Calculation Service

Create SPC calculator at `src/lib/spc/spc-calculator.ts`:

```typescript
// Control chart constants (for subgroup sizes 2-10)
const A2 = [0, 0, 1.880, 1.023, 0.729, 0.577, 0.483, 0.419, 0.373, 0.337, 0.308];
const D3 = [0, 0, 0, 0, 0, 0, 0, 0.076, 0.136, 0.184, 0.223];
const D4 = [0, 0, 3.267, 2.574, 2.282, 2.114, 2.004, 1.924, 1.864, 1.816, 1.777];

interface SPCResult {
  mean: number;
  stdDev: number;
  rangeAvg: number;
  
  // Control limits
  ucl: number;
  cl: number;
  lcl: number;
  uclR: number;
  clR: number;
  lclR: number;
  
  // Capability
  cp: number | null;
  cpk: number | null;
  
  outOfControlPoints: number[];
}

function calculateXbarR(
  subgroups: number[][], 
  usl?: number, 
  lsl?: number
): SPCResult {
  const n = subgroups[0]?.length || 1; // subgroup size
  
  // Calculate subgroup means and ranges
  const xbars = subgroups.map(sg => sg.reduce((a, b) => a + b, 0) / sg.length);
  const ranges = subgroups.map(sg => Math.max(...sg) - Math.min(...sg));
  
  // Grand mean (X-double-bar) and average range
  const xDoublebar = xbars.reduce((a, b) => a + b, 0) / xbars.length;
  const rBar = ranges.reduce((a, b) => a + b, 0) / ranges.length;
  
  // Control limits for X-bar chart
  const ucl = xDoublebar + A2[n] * rBar;
  const lcl = xDoublebar - A2[n] * rBar;
  
  // Control limits for R chart
  const uclR = D4[n] * rBar;
  const lclR = D3[n] * rBar;
  
  // Estimate process standard deviation
  const d2 = [0, 0, 1.128, 1.693, 2.059, 2.326, 2.534, 2.704, 2.847, 2.970, 3.078];
  const sigma = rBar / d2[n];
  
  // Capability indices (if spec limits provided)
  let cp = null, cpk = null;
  if (usl !== undefined && lsl !== undefined) {
    cp = (usl - lsl) / (6 * sigma);
    const cpu = (usl - xDoublebar) / (3 * sigma);
    const cpl = (xDoublebar - lsl) / (3 * sigma);
    cpk = Math.min(cpu, cpl);
  }
  
  // Find out-of-control points
  const oocPoints = xbars
    .map((x, i) => (x > ucl || x < lcl) ? i : -1)
    .filter(i => i >= 0);
  
  return {
    mean: xDoublebar,
    stdDev: sigma,
    rangeAvg: rBar,
    ucl, cl: xDoublebar, lcl,
    uclR, clR: rBar, lclR,
    cp, cpk,
    outOfControlPoints: oocPoints,
  };
}
```

## Step 3: CSV Import Parser

Create import service at `src/lib/spc/spc-import.ts`:

```typescript
interface SPCImportRow {
  timestamp: Date;
  value: number;
  lotNumber?: string;
  operator?: string;
  subgroupId?: string;
}

function parseCSV(content: string, mapping: ColumnMapping): SPCImportRow[] {
  // Parse CSV with column mapping
  // Handle date formats
  // Validate numeric values
  // Return structured data
}
```

## Step 4: API Routes

Create API routes:
- `src/app/api/spc/control-points/route.ts` - CRUD for control points
- `src/app/api/spc/data/route.ts` - CRUD for data points
- `src/app/api/spc/import/route.ts` - CSV/PLEX import
- `src/app/api/spc/calculate/route.ts` - Trigger calculations

## Step 5: Control Chart Component

Create reusable chart component at `src/components/spc/control-chart.tsx`:
- X-bar chart with UCL/LCL lines
- R chart or S chart
- Highlight out-of-control points
- Zoom/pan controls
- Export as image

Use a charting library like Recharts or Chart.js.

## Step 6: Dashboard Pages

Create SPC pages:
- `src/app/(dashboard)/spc/page.tsx` - Control points list
- `src/app/(dashboard)/spc/[id]/page.tsx` - Control point detail with chart
- `src/app/(dashboard)/spc/import/page.tsx` - Import wizard

## Step 7: PLEX Integration

Add SPC data import from PLEX:
- Extend `src/lib/integrations/plex-sync.ts`
- Pull SPC data from PLEX data sources
- Map to ComplianceOS control points

## Key Features

1. **Multiple Chart Types**: X-bar/R, Individual/MR, p-chart, etc.
2. **Automatic Limit Calculation**: Calculate UCL/LCL from data
3. **Capability Analysis**: Cp, Cpk, Pp, Ppk indices
4. **Out-of-Control Alerts**: Flag and notify on OOC points
5. **Western Electric Rules**: Apply additional OOC detection rules
6. **CSV Import**: Flexible column mapping
7. **PLEX Integration**: Pull data automatically
8. **Historical Analysis**: Trend capability over time

## CSV Import Format Example

```csv
Timestamp,Value,LotNumber,Operator,Equipment
2024-01-15 08:00,10.2,LOT-001,John,Line1
2024-01-15 08:05,10.1,LOT-001,John,Line1
2024-01-15 08:10,10.3,LOT-001,John,Line1
```

## Testing

```bash
# Verify TypeScript
npx tsc --noEmit

# Run development server
npm run dev
```
