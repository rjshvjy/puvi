# Feature Pack: OPENING-BALANCE
Generated: 2025-08-18T09:49:29.345Z
Routes: 8 | Tables: 11 | Files: 1

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_system_status
GET    /api/opening_balance/status
# configure_system
POST   /api/opening_balance/configure
# get_materials_for_opening
GET    /api/opening_balance/materials
# save_opening_balances
POST   /api/opening_balance/save
# initialize_system
POST   /api/opening_balance/initialize
# close_financial_year
POST   /api/opening_balance/year_end_close
# download_template
GET    /api/opening_balance/template
# import_opening_balances
POST   /api/opening_balance/import
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| batch | batch-production, blending, cost-management | 🔴 HIGH | Changes affect 6 other modules |
| inventory | batch-production, blending, material-writeoff | 🔴 HIGH | Changes affect 6 other modules |
| masters_audit_log | masters-common | 🟡 MEDIUM | Changes affect 1 other modules |
| material_writeoffs | material-writeoff | 🟡 MEDIUM | Changes affect 1 other modules |
| materials | batch-production, blending, material-writeoff | 🔴 HIGH | Changes affect 8 other modules |
| opening_balances | None | 🟢 LOW | Isolated to this module |
| purchases | batch-production, blending, purchase | 🔴 HIGH | Changes affect 4 other modules |
| serial_number_tracking | unknown | 🟡 MEDIUM | Changes affect 1 other modules |
| suppliers | purchase, system-config, unknown | 🔴 HIGH | Changes affect 3 other modules |
| system_configuration | unknown | 🟡 MEDIUM | Changes affect 1 other modules |
| year_end_closing | None | 🟢 LOW | Isolated to this module |

## Backend Implementation

## Data Flow & Integration
### 🔗 Cascading Dependencies
- **inventory** (HIGH RISK)
  - Shared with: batch-production, blending, material-writeoff, purchase, sku-production, unknown
  - Impact: Changes will cascade to these modules
- **materials** (HIGH RISK)
  - Shared with: batch-production, blending, material-writeoff, purchase, sku-management, sku-production, system-config, unknown
  - Impact: Changes will cascade to these modules
- **suppliers** (HIGH RISK)
  - Shared with: purchase, system-config, unknown
  - Impact: Changes will cascade to these modules

### Integration Points

---
*End of Feature Pack*