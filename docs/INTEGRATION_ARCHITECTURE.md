# Exodis Integration Architecture

## Overview

This document outlines the integration strategy for connecting Exodis with external food industry systems:
- **FoodLogiQ** - Food safety and traceability platform
- **Plex ERP** - Manufacturing cloud ERP (already partially implemented)
- **Genesis R&D via EshaPort** - Nutritional analysis and formulation software
- **SAP S/4HANA** - Enterprise resource planning

---

## 1. FoodLogiQ Integration

### Overview
FoodLogiQ Connect is a food safety and traceability platform. The integration enables tracking of:
- Critical Tracking Events (CTEs)
- Key Data Elements (KDEs)
- Supplier compliance data
- Product traceability

### API Details
- **Authentication**: Bearer-token OAuth 2.0
- **Protocol**: REST + JSON
- **Documentation**: Accessible via FoodLogiQ Connect portal

### Integration Points

| Direction | Data Type | Use Case |
|-----------|-----------|----------|
| Export → FoodLogiQ | Recipe/Product data | Product registration and traceability |
| Export → FoodLogiQ | Ingredient statements | Compliance documentation |
| Export → FoodLogiQ | Allergen declarations | Safety compliance |
| Import ← FoodLogiQ | Supplier data | Ingredient sourcing validation |
| Import ← FoodLogiQ | Audit results | Compliance tracking |

### Implementation Components

```
src/lib/integrations/foodlogiq-client.ts   # API client
src/components/foodlogiq-integration-settings.tsx
src/app/api/integrations/foodlogiq/route.ts
src/app/api/webhooks/foodlogiq/[organizationId]/route.ts
```

### Configuration Fields
- `client_id` - OAuth client ID
- `client_secret` - OAuth client secret
- `environment` - 'production' | 'sandbox'
- `community_id` - FoodLogiQ community identifier
- `sync_products` - Enable product sync
- `sync_suppliers` - Enable supplier sync
- `sync_events` - Enable traceability events

---

## 2. Plex ERP Integration (Enhanced)

### Current Status
✅ Basic webhook integration implemented
✅ Incoming formulation sync
✅ Outgoing nutrition data sync
✅ Compliance report push

### Enhancements Needed
- [ ] Plex Connect REST API client
- [ ] Bi-directional ingredient sync
- [ ] Material specification sync
- [ ] Quality checkpoint integration

### API Details
- **Platform**: Plex Connect (Rockwell Automation)
- **Protocol**: REST/JSON API
- **Authentication**: Bearer token + Company Code headers

### Additional Integration Points

| Direction | Data Type | Use Case |
|-----------|-----------|----------|
| Bi-directional | Ingredients/Materials | Master data sync |
| Bi-directional | Bill of Materials | Recipe composition |
| Export → Plex | Quality specs | Compliance requirements |
| Import ← Plex | Lot tracking data | Traceability |

---

## 3. Genesis R&D / EshaPort Integration

### Overview
Genesis R&D by Trustwell (formerly ESHA Research) is the leading nutritional analysis software. Integration via:
- **EshaPort Utility**: Bulk import/export via delimited files
- **Genesis R&D API**: Real-time SOAP/REST data streaming

### Integration Approaches

#### Option A: EshaPort File-Based (Recommended for initial rollout)
- Export recipes/ingredients as `.exl` or delimited text files
- Import Genesis R&D calculations
- Supports bulk operations

#### Option B: Genesis R&D API (For real-time sync)
- SOAP and REST interfaces available
- Real-time data streaming
- Automated label generation

### Data Mapping

| Exodis Field | Genesis R&D Field | Notes |
|--------------|-------------------|-------|
| `ingredients` | Ingredients | Name, code, nutrition |
| `recipes` | Recipes/Formulations | Full formulation data |
| `calculated_nutrition` | Analysis | Per-serving nutrition |
| `labels` | Labels | NFP, ingredient statements |

### Import Capabilities
- Recipe/Ingredient import from Genesis R&D export files
- Nutrient breakdown import
- Label-rounded analysis import

### Export Capabilities
- Recipe export as ingredient (hides formulation)
- Full formulation export
- Nutritional analysis export

### Implementation Components

```
src/lib/integrations/genesis-client.ts       # API/file handler
src/lib/integrations/eshaport-parser.ts      # EshaPort file parser
src/components/genesis-integration-settings.tsx
src/app/api/integrations/genesis/route.ts
src/app/api/integrations/genesis/import/route.ts
src/app/api/integrations/genesis/export/route.ts
```

### Configuration Fields
- `integration_mode` - 'api' | 'file_based'
- `api_endpoint` - Genesis API URL (if API mode)
- `api_key` - API authentication
- `default_export_template` - EshaPort template to use
- `auto_sync_calculations` - Auto-import nutrition updates

---

## 4. SAP S/4HANA Integration

### Overview
SAP S/4HANA Recipe Management (PLM-RM) manages:
- Master recipes for process manufacturing
- Product specifications
- Material compositions
- Quality management data

### API Details
- **Protocol**: OData (REST-like, typically V2/V4)
- **Authentication**: Communication users + OAuth/Basic
- **Documentation**: SAP API Business Hub

### Key APIs

| API | Purpose |
|-----|---------|
| OData API: Master Recipe | Recipe/formulation management |
| Material Master API | Ingredient/material data |
| Production Order API | Manufacturing execution |
| Quality Management API | Compliance and specs |

### Integration Points

| Direction | Data Type | Use Case |
|-----------|-----------|----------|
| Import ← SAP | Material Master | Ingredient sync |
| Import ← SAP | Recipe/BOM | Formulation sync |
| Export → SAP | Nutrition specs | Product specifications |
| Export → SAP | Compliance data | Quality records |
| Bi-directional | Allergen data | Safety compliance |

### Implementation Components

```
src/lib/integrations/sap-client.ts           # OData client
src/lib/integrations/sap-recipe-mapper.ts    # Field mapping
src/components/sap-integration-settings.tsx
src/app/api/integrations/sap/route.ts
src/app/api/integrations/sap/materials/route.ts
src/app/api/integrations/sap/recipes/route.ts
```

### Configuration Fields
- `api_base_url` - SAP S/4HANA API endpoint
- `client_id` - OAuth client ID
- `client_secret` - OAuth client secret
- `communication_arrangement` - SAP communication setup ID
- `company_code` - SAP company code
- `plant` - Manufacturing plant code
- `sync_materials` - Enable material sync
- `sync_recipes` - Enable recipe sync
- `sync_quality` - Enable quality data sync

---

## Database Schema Updates

### Unified Integration Configuration

The existing `webhook_configurations` table will be extended to support all integrations:

```sql
-- Add provider-specific columns
ALTER TABLE webhook_configurations ADD COLUMN IF NOT EXISTS provider_config JSONB DEFAULT '{}';
ALTER TABLE webhook_configurations ADD COLUMN IF NOT EXISTS oauth_tokens JSONB;
ALTER TABLE webhook_configurations ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;

-- Add supported providers enum
COMMENT ON COLUMN webhook_configurations.provider IS 
  'Integration provider: plex, foodlogiq, genesis, sap, custom';
```

### Integration Sync Log

```sql
CREATE TABLE IF NOT EXISTS integration_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    provider TEXT NOT NULL,
    direction TEXT NOT NULL, -- 'import' | 'export'
    entity_type TEXT NOT NULL,
    entity_id UUID,
    external_id TEXT,
    status TEXT DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    records_processed INTEGER DEFAULT 0,
    records_succeeded INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_log JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Implementation Priority

### Phase 1: Genesis R&D / EshaPort (High Priority)
- Most common data source for food formulators
- File-based import reduces API complexity
- Immediate value for existing Genesis users

### Phase 2: FoodLogiQ (High Priority)
- Food safety compliance is critical
- OAuth integration is straightforward
- Enables traceability requirements

### Phase 3: Plex ERP (Medium Priority)  
- Enhance existing integration
- Add bi-directional sync
- Connect to manufacturing execution

### Phase 4: SAP S/4HANA (Medium Priority)
- Enterprise-grade integration
- Complex OData setup
- Target larger customers

---

## Unified Integration Settings UI

Create a central `IntegrationsPage` at `/organization/integrations` with:
- Provider cards showing status
- Configuration modals for each provider
- Sync history and logs
- Test connection functionality

---

## Next Steps

1. Create database migration for extended integration schema
2. Implement Genesis R&D EshaPort parser
3. Build FoodLogiQ OAuth client
4. Enhance Plex integration with Plex Connect API
5. Design SAP OData client for S/4HANA
6. Build unified integrations settings page
