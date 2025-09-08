# Feature Pack: OILCAKE-FOR-WRITEOFF
Generated: 2025-09-08T12:20:14.248Z
Routes: 1 | Tables: 13 | Files: 1

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_oilcake_for_writeoff
GET    /api/oilcake_for_writeoff
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| batch | batch-production, blending, cost-management | 🔴 HIGH | Changes affect 10 other modules |
| categories_master | blending, masters-crud, material-writeoff | 🔴 HIGH | Changes affect 5 other modules |
| inventory | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 8 other modules |
| material_writeoffs | material-writeoff, opening-balance, writeoff-analytics | 🔴 HIGH | Changes affect 3 other modules |
| materials | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 10 other modules |
| oil_cake_inventory | batch-production, material-sales, material-writeoff | 🔴 HIGH | Changes affect 3 other modules |
| sku_inventory | locations, material-writeoff, sku-outbound | 🔴 HIGH | Changes affect 5 other modules |
| sku_master | batch-production, masters-crud, material-writeoff | 🔴 HIGH | Changes affect 9 other modules |
| sku_production | material-writeoff, sku-management, sku-outbound | 🔴 HIGH | Changes affect 5 other modules |
| writeoff | material-writeoff, writeoff-analytics | 🟡 MEDIUM | Changes affect 2 other modules |
| writeoff_impact_tracking | material-writeoff, writeoff-analytics | 🟡 MEDIUM | Changes affect 2 other modules |
| writeoff_monthly_summary | material-writeoff, writeoff-analytics | 🟡 MEDIUM | Changes affect 2 other modules |
| writeoff_reasons | material-writeoff, system-config, writeoff-analytics | 🔴 HIGH | Changes affect 3 other modules |

## Backend Implementation

## Data Flow & Integration
### 🔗 Cascading Dependencies
- **materials** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, system-config, writeoff-analytics, unknown
  - Impact: Changes will cascade to these modules
- **inventory** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, unknown
  - Impact: Changes will cascade to these modules

### Integration Points

---
*End of Feature Pack*