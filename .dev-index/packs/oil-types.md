# Feature Pack: OIL-TYPES
Generated: 2025-08-21T04:54:47.272Z
Routes: 1 | Tables: 9 | Files: 1

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_oil_types
GET    /api/oil_types
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| available_oil_types | batch-production, system-config | 🟡 MEDIUM | Changes affect 2 other modules |
| batch | batch-production, blending, cost-management | 🔴 HIGH | Changes affect 7 other modules |
| batch_extended_costs | batch-production, cost-management | 🟡 MEDIUM | Changes affect 2 other modules |
| inventory | batch-production, blending, material-writeoff | 🔴 HIGH | Changes affect 7 other modules |
| materials | batch-production, blending, material-writeoff | 🔴 HIGH | Changes affect 9 other modules |
| oil_cake_inventory | batch-production, material-sales | 🟡 MEDIUM | Changes affect 2 other modules |
| oil_cake_rate_master | batch-production | 🟡 MEDIUM | Changes affect 1 other modules |
| purchase_items | batch-production, purchase | 🟡 MEDIUM | Changes affect 2 other modules |
| purchases | batch-production, blending, opening-balance | 🔴 HIGH | Changes affect 5 other modules |

### ⚠️ Hardcoded Values Detected
- `batch_production.py:216` - object
- `batch_production.py:217` - object
- `batch_production.py:218` - object
- `batch_production.py:219` - object

## Backend Implementation

## Data Flow & Integration
### 🔗 Cascading Dependencies
- **inventory** (HIGH RISK)
  - Shared with: batch-production, blending, material-writeoff, opening-balance, purchase, sku-production, unknown
  - Impact: Changes will cascade to these modules
- **materials** (HIGH RISK)
  - Shared with: batch-production, blending, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, unknown
  - Impact: Changes will cascade to these modules

### Integration Points

---
*End of Feature Pack*