# Feature Pack: OIL-TYPES-FOR-BLENDING
Generated: 2025-08-30T08:44:55.906Z
Routes: 1 | Tables: 8 | Files: 1

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_oil_types_for_blending
GET    /api/oil_types_for_blending
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| batch | batch-production, blending, cost-management | 🔴 HIGH | Changes affect 10 other modules |
| blend_batch_components | blending, sku-production | 🟡 MEDIUM | Changes affect 2 other modules |
| blend_batches | blending, masters-crud, sku-production | 🔴 HIGH | Changes affect 3 other modules |
| categories_master | blending, masters-crud, material-writeoff | 🔴 HIGH | Changes affect 4 other modules |
| inventory | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 8 other modules |
| materials | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 11 other modules |
| purchases | batch-production, blending, opening-balance | 🔴 HIGH | Changes affect 6 other modules |
| subcategories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 3 other modules |

## Backend Implementation

## Data Flow & Integration
### 🔗 Cascading Dependencies
- **materials** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, writeoff-analytics, unknown
  - Impact: Changes will cascade to these modules
- **inventory** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, unknown
  - Impact: Changes will cascade to these modules

### Integration Points

---
*End of Feature Pack*