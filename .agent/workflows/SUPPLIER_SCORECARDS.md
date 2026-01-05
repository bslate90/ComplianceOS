---
description: Build supplier scorecard and performance tracking system
---

# Supplier Scorecards Development Workflow

## Overview
Create an automated supplier scoring system that evaluates suppliers based on quality, delivery, compliance, and responsiveness metrics.

## Step 1: Database Migration

Create the database migration file at `supabase/migrations/013_supplier_scorecards.sql`:

```sql
-- Supplier scorecard configuration
CREATE TABLE IF NOT EXISTS supplier_scorecard_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Weights (must sum to 100)
    quality_weight INTEGER DEFAULT 30,
    delivery_weight INTEGER DEFAULT 30,
    compliance_weight INTEGER DEFAULT 25,
    responsiveness_weight INTEGER DEFAULT 15,
    
    -- Thresholds for ratings
    excellent_threshold INTEGER DEFAULT 90,  -- Score >= 90 = Excellent
    good_threshold INTEGER DEFAULT 75,       -- Score >= 75 = Good
    acceptable_threshold INTEGER DEFAULT 60, -- Score >= 60 = Acceptable
    -- Below 60 = Needs Improvement
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_weights CHECK (
        quality_weight + delivery_weight + compliance_weight + responsiveness_weight = 100
    )
);

-- Supplier performance metrics (raw data)
CREATE TABLE IF NOT EXISTS supplier_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Metric type
    metric_type TEXT NOT NULL CHECK (metric_type IN (
        'delivery', 'quality', 'response', 'audit', 'complaint'
    )),
    
    -- Common fields
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Delivery metrics
    po_number TEXT,
    expected_date DATE,
    actual_date DATE,
    on_time BOOLEAN,
    
    -- Quality metrics
    lot_number TEXT,
    quantity_received NUMERIC,
    quantity_accepted NUMERIC,
    quantity_rejected NUMERIC,
    defect_type TEXT,
    
    -- Response metrics
    request_date DATE,
    response_date DATE,
    response_days INTEGER,
    
    -- Notes
    notes TEXT,
    recorded_by UUID REFERENCES profiles(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calculated supplier scores (periodic snapshots)
CREATE TABLE IF NOT EXISTS supplier_scorecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Individual scores (0-100)
    quality_score NUMERIC(5,2),
    delivery_score NUMERIC(5,2),
    compliance_score NUMERIC(5,2),
    responsiveness_score NUMERIC(5,2),
    
    -- Weighted total score
    overall_score NUMERIC(5,2),
    
    -- Rating based on thresholds
    rating TEXT CHECK (rating IN (
        'excellent', 'good', 'acceptable', 'needs_improvement', 'critical'
    )),
    
    -- Metrics used in calculation
    total_deliveries INTEGER,
    on_time_deliveries INTEGER,
    total_lots_received INTEGER,
    lots_accepted INTEGER,
    total_requests INTEGER,
    avg_response_days NUMERIC(5,2),
    documents_current INTEGER,
    documents_total INTEGER,
    
    notes TEXT,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    calculated_by UUID REFERENCES profiles(id),
    
    UNIQUE(supplier_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE supplier_scorecard_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_scorecards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "org_access" ON supplier_scorecard_config
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));
```

## Step 2: Scoring Algorithm

Create scoring service at `src/lib/suppliers/scorecard-calculator.ts`:

```typescript
interface ScorecardConfig {
  qualityWeight: number;    // % weight for quality
  deliveryWeight: number;   // % weight for delivery
  complianceWeight: number; // % weight for compliance
  responsivenessWeight: number; // % weight for responsiveness
}

interface PerformanceData {
  // Delivery
  totalDeliveries: number;
  onTimeDeliveries: number;
  
  // Quality
  totalLotsReceived: number;
  lotsAccepted: number;
  
  // Responsiveness
  totalRequests: number;
  avgResponseDays: number;
  targetResponseDays: number;
  
  // Compliance (documents)
  documentsTotal: number;
  documentsCurrent: number; // Not expired
}

function calculateScorecard(data: PerformanceData, config: ScorecardConfig) {
  // Delivery Score: % on-time
  const deliveryScore = data.totalDeliveries > 0
    ? (data.onTimeDeliveries / data.totalDeliveries) * 100
    : 100;
  
  // Quality Score: % accepted lots
  const qualityScore = data.totalLotsReceived > 0
    ? (data.lotsAccepted / data.totalLotsReceived) * 100
    : 100;
  
  // Responsiveness Score: Based on avg response time
  const responsivenessScore = data.avgResponseDays <= data.targetResponseDays
    ? 100
    : Math.max(0, 100 - ((data.avgResponseDays - data.targetResponseDays) * 10));
  
  // Compliance Score: % current documents
  const complianceScore = data.documentsTotal > 0
    ? (data.documentsCurrent / data.documentsTotal) * 100
    : 100;
  
  // Weighted overall
  const overallScore = (
    (deliveryScore * config.deliveryWeight / 100) +
    (qualityScore * config.qualityWeight / 100) +
    (responsivenessScore * config.responsivenessWeight / 100) +
    (complianceScore * config.complianceWeight / 100)
  );
  
  return {
    deliveryScore,
    qualityScore,
    responsivenessScore,
    complianceScore,
    overallScore,
    rating: getRating(overallScore),
  };
}
```

## Step 3: API Routes

Create API routes at `src/app/api/suppliers/[id]/scorecard/route.ts`:
- GET: Get current scorecard for supplier
- POST: Calculate/refresh scorecard

Create `src/app/api/suppliers/[id]/performance/route.ts`:
- GET: List performance logs
- POST: Log new performance data

## Step 4: Dashboard Page

Create scorecard dashboard at `src/app/(dashboard)/suppliers/scorecards/page.tsx`:
- Supplier ranking table
- Filter by rating (Excellent, Good, etc.)
- Trend charts
- Export functionality

## Step 5: Supplier Detail Integration

Add scorecard tab to existing supplier detail page:
- Current score summary
- Historical score chart
- Performance log table
- Quick log entry form

## Step 6: Dashboard Widget

Add to main dashboard:
- Supplier risk summary
- Suppliers needing attention (low scores)
- Upcoming document expirations

## Key Features

1. **Configurable Weights**: Organization can adjust metric weights
2. **Automated Calculation**: Periodic or on-demand score calculation
3. **Trend Analysis**: Compare scores over time
4. **Risk Alerts**: Flag suppliers below thresholds
5. **Bulk Import**: Import delivery/quality data from spreadsheets
6. **Reports**: Generate supplier performance reports

## Testing

```bash
# Verify TypeScript
npx tsc --noEmit

# Run development server
npm run dev
```
