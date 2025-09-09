# Feature Pack: OIL-CAKE-RATES
Generated: 2025-09-09T05:02:09.131Z
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
# get_oil_cake_rates
GET    /api/oil_cake_rates
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| SKU | batch-production | 🟡 MEDIUM | Changes affect 1 other modules |
| batch | batch-production, blending, cost-management | 🔴 HIGH | Changes affect 10 other modules |
| batch_extended_costs | batch-production, cost-management, masters-crud | 🔴 HIGH | Changes affect 3 other modules |
| cost_elements_master | batch-production, cost-management, masters-crud | 🔴 HIGH | Changes affect 6 other modules |
| existing | batch-production, unknown | 🟡 MEDIUM | Changes affect 2 other modules |
| inventory | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 8 other modules |
| materials | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 10 other modules |
| oil_cake_inventory | batch-production, material-sales, material-writeoff | 🔴 HIGH | Changes affect 3 other modules |
| oil_cake_rate_master | batch-production | 🟡 MEDIUM | Changes affect 1 other modules |
| oil_cake_sales | batch-production, material-sales | 🟡 MEDIUM | Changes affect 2 other modules |
| purchase_items | batch-production, purchase | 🟡 MEDIUM | Changes affect 2 other modules |
| purchases | batch-production, blending, opening-balance | 🔴 HIGH | Changes affect 6 other modules |
| sku_master | batch-production, masters-crud, material-writeoff | 🔴 HIGH | Changes affect 9 other modules |

## Backend Implementation

## Data Flow & Integration
### 🔗 Cascading Dependencies
- **materials** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, system-config, writeoff-analytics, unknown
  - Impact: Changes will cascade to these modules
- **inventory** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, unknown
  - Impact: Changes will cascade to these modules
- **cost_elements_master** (HIGH RISK)
  - Shared with: batch-production, cost-management, masters-crud, package-sizes, sku-production, system-config
  - Impact: Changes will cascade to these modules

### Integration Points

---
*End of Feature Pack*