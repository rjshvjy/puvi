# Feature Pack: SYSTEM-INFO
Generated: 2025-08-26T04:50:00.267Z
Routes: 1 | Tables: 7 | Files: 1

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# system_info
GET    /api/system_info
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| batch | batch-production, blending, cost-management | 🔴 HIGH | Changes affect 10 other modules |
| materials | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 11 other modules |
| purchases | batch-production, blending, opening-balance | 🔴 HIGH | Changes affect 6 other modules |
| sku_master | masters-crud, material-writeoff, package-sizes | 🔴 HIGH | Changes affect 7 other modules |
| sku_production | material-writeoff, sku-management, sku-production | 🔴 HIGH | Changes affect 4 other modules |
| suppliers | opening-balance, purchase, sku-production | 🔴 HIGH | Changes affect 5 other modules |
| system_configuration | opening-balance, unknown | 🟡 MEDIUM | Changes affect 2 other modules |

## Backend Implementation

## Data Flow & Integration
### 🔗 Cascading Dependencies
- **materials** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, writeoff-analytics, unknown
  - Impact: Changes will cascade to these modules
- **suppliers** (HIGH RISK)
  - Shared with: opening-balance, purchase, sku-production, system-config, unknown
  - Impact: Changes will cascade to these modules

### Integration Points

---
*End of Feature Pack*