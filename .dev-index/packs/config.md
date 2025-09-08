# Feature Pack: CONFIG
Generated: 2025-09-08T18:40:05.129Z
Routes: 5 | Tables: 8 | Files: 1

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_config
GET    /api/config/<config_type>
# get_bom_categories
GET    /api/config/bom_categories
# get_bom_materials
GET    /api/config/bom_materials
# get_writeoff_reasons
GET    /api/config/writeoff_reasons
# get_labor_rates
GET    /api/config/labor_rates
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| available_oil_types | system-config | 🟡 MEDIUM | Changes affect 1 other modules |
| bom_category_mapping | system-config | 🟡 MEDIUM | Changes affect 1 other modules |
| cost_elements_master | batch-production, cost-management, masters-crud | 🔴 HIGH | Changes affect 6 other modules |
| materials | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 10 other modules |
| sku_master | batch-production, masters-crud, material-writeoff | 🔴 HIGH | Changes affect 9 other modules |
| suppliers | opening-balance, purchase, sku-production | 🔴 HIGH | Changes affect 5 other modules |
| uom_master | masters-common, system-config | 🟡 MEDIUM | Changes affect 2 other modules |
| writeoff_reasons | material-writeoff, system-config, writeoff-analytics | 🔴 HIGH | Changes affect 3 other modules |

### ⚠️ Hardcoded Values Detected
- `system_config.py:202` - object

## Backend Implementation

## Data Flow & Integration
### 🔗 Cascading Dependencies
- **materials** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, system-config, writeoff-analytics, unknown
  - Impact: Changes will cascade to these modules
- **cost_elements_master** (HIGH RISK)
  - Shared with: batch-production, cost-management, masters-crud, package-sizes, sku-production, system-config
  - Impact: Changes will cascade to these modules
- **suppliers** (HIGH RISK)
  - Shared with: opening-balance, purchase, sku-production, system-config, unknown
  - Impact: Changes will cascade to these modules

### Integration Points

---
*End of Feature Pack*