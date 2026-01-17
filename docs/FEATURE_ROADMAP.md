# Exodis Feature Roadmap

## Quality Management Module

This document outlines the planned features for the Exodis quality management expansion.

---

## 🎯 Priority Features

### 1. CAPA Management `/CAPA_MANAGEMENT`
**Status**: 📋 Planned  
**Priority**: High  
**Owner**: FSQ Director

Track corrective and preventive actions from identification through closure.

**Key Capabilities:**
- CAPA workflow: Open → Investigating → Action Planned → In Progress → Verification → Closed
- Root cause analysis (5-Why, Fishbone, FMEA)
- Action items with assignments and due dates
- Evidence attachment support
- Effectiveness verification tracking
- Links to suppliers, recipes, audits
- Overdue action alerts
- CAPA trending reports

**Database Tables:**
- `capas` - Main CAPA records
- `capa_categories` - CAPA type categories
- `capa_actions` - Individual action items
- `capa_attachments` - Supporting documents
- `capa_comments` - Notes and updates

---

### 2. Supplier Scorecards `/SUPPLIER_SCORECARDS`
**Status**: 📋 Planned  
**Priority**: High  
**Owner**: FSQ Director

Automated supplier performance scoring and risk assessment.

**Key Capabilities:**
- Configurable scoring weights (Quality, Delivery, Compliance, Responsiveness)
- Automatic score calculation from logged data
- Performance trend charts
- Supplier ranking and comparison
- Risk categorization (Excellent/Good/Acceptable/Needs Improvement)
- Integration with existing supplier module
- Document expiration impact on score
- Performance reports for supplier reviews

**Database Tables:**
- `supplier_scorecard_config` - Scoring configuration
- `supplier_performance_logs` - Raw performance data
- `supplier_scorecards` - Calculated score snapshots

**Scoring Algorithm:**
```
Overall Score = 
  (Quality Score × Quality Weight) +
  (Delivery Score × Delivery Weight) +
  (Compliance Score × Compliance Weight) +
  (Responsiveness Score × Responsiveness Weight)
```

---

### 3. SPC Data Import `/SPC_DATA_IMPORT`
**Status**: 📋 Planned  
**Priority**: Medium  
**Owner**: FSQ Director

Statistical Process Control data import and visualization.

**Key Capabilities:**
- Define control points (weight, temp, time, etc.)
- CSV import with flexible column mapping
- PLEX data integration
- X-bar/R control charts
- Individual/Moving Range charts
- Automatic control limit calculation
- Capability indices (Cp, Cpk, Pp, Ppk)
- Out-of-control point detection
- Western Electric Rules
- Specification limit monitoring
- Historical capability trending

**Database Tables:**
- `spc_control_points` - What we're measuring
- `spc_data_points` - Individual measurements
- `spc_statistics` - Calculated statistics
- `spc_import_logs` - Import history

**Chart Types Supported:**
- X-bar and R (subgroups)
- X-bar and S (larger subgroups)
- Individual and Moving Range
- p-chart (proportion defective)
- c-chart (count of defects)

---

## 📊 Dashboard Integration

Each feature should add widgets to the main dashboard:

### CAPA Widget
- Open CAPAs count
- Overdue actions (red highlight)
- Closed this month
- Quick link to create new CAPA

### Supplier Risk Widget
- Suppliers by rating (pie chart)
- Suppliers needing attention
- Expiring documents count

### SPC Widget
- Control points with OOC status
- Recent capability summary
- Trending Cpk values

---

## 🔗 Cross-Module Connections

| From | To | Connection |
|------|-----|------------|
| CAPA | Supplier | Link CAPA to supplier issue |
| CAPA | Recipe | Link CAPA to recipe issue |
| Scorecard | CAPA | Low score triggers CAPA |
| SPC | CAPA | OOC trend triggers CAPA |
| Supplier | Scorecard | View supplier's score |
| Recipe | SPC | Link control point to recipe |

---

## 🚀 Development Order

1. **Phase 1: Foundation**
   - [ ] Database migrations for all three features
   - [ ] TypeScript types
   - [ ] Basic API routes

2. **Phase 2: CAPA Core**
   - [ ] CAPA list page
   - [ ] CAPA create/edit forms
   - [ ] CAPA detail view
   - [ ] Status workflow

3. **Phase 3: Supplier Scorecards**
   - [ ] Scoring configuration
   - [ ] Performance logging
   - [ ] Score calculation
   - [ ] Scorecard display

4. **Phase 4: SPC Foundation**
   - [ ] Control point management
   - [ ] CSV import
   - [ ] Basic control charts

5. **Phase 5: Integration**
   - [ ] Dashboard widgets
   - [ ] Cross-module links
   - [ ] Reports and exports

---

## 📝 Notes for Development

### Using Antigravity IDE

1. **Start with Database**: Always create migrations first
2. **Follow Patterns**: Look at existing code (recipes, suppliers) as templates
3. **Test Incrementally**: Build and test each component
4. **Use Workflows**: Type `/CAPA_MANAGEMENT` etc. for guided development

### Code Organization

```
src/
├── app/(dashboard)/
│   ├── capas/          # CAPA pages
│   ├── spc/            # SPC pages
│   └── suppliers/
│       └── scorecards/ # Scorecard pages
├── components/
│   ├── capa/           # CAPA components
│   ├── spc/            # SPC components
│   └── scorecard/      # Scorecard components
└── lib/
    ├── capa/           # CAPA services
    ├── spc/            # SPC calculations
    └── suppliers/      # Scorecard calculator
```

### API Pattern

```typescript
// List with filters
GET /api/capas?status=open&priority=high

// Get single item
GET /api/capas/[id]

// Create
POST /api/capas

// Update
PUT /api/capas/[id]

// Delete/Archive
DELETE /api/capas/[id]
```

---

*Last updated: January 2026*
