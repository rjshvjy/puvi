# Feature Pack: OIL-CONFIG
Generated: 2025-08-21T19:06:32.806Z
Routes: 7 | Tables: 8 | Files: 1

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# apply_single_oil_suggestion
POST   /api/oil-config/apply-suggestion
# get_oil_config_status
GET    /api/oil-config/status
# get_seed_varieties
GET    /api/oil-config/seed-varieties
# get_oil_products
GET    /api/oil-config/oil-products
# get_production_flow
GET    /api/oil-config/production-flow
# validate_oil_configuration
POST   /api/oil-config/validate
# apply_oil_suggestions
POST   /api/oil-config/apply-suggestions
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| batch | batch-production, blending, cost-management | 🔴 HIGH | Changes affect 8 other modules |
| blend_batches | blending, masters-crud, sku-production | 🔴 HIGH | Changes affect 3 other modules |
| categories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 3 other modules |
| information_schema | masters-common, masters-crud | 🟡 MEDIUM | Changes affect 2 other modules |
| inventory | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 8 other modules |
| materials | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 10 other modules |
| sku_master | masters-crud, sku-management, sku-production | 🔴 HIGH | Changes affect 5 other modules |
| subcategories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 3 other modules |

## Backend Implementation

## Data Flow & Integration
### 🔗 Cascading Dependencies
- **inventory** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, unknown
  - Impact: Changes will cascade to these modules
- **materials** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, unknown
  - Impact: Changes will cascade to these modules

### Integration Points

---
*End of Feature Pack*