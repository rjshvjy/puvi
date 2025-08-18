# Feature Pack: SKU
Generated: 2025-08-18T09:35:36.982Z
Routes: 21 | Tables: 16 | Files: 10

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_sku_master_list
GET    /api/sku/master
GET    /api/sku/master
# create_sku
POST   /api/sku/master
# get_sku_bom
GET    /api/sku/bom/<int:sku_id>
# create_or_update_bom
POST   /api/sku/bom
# get_materials_for_bom
GET    /api/sku/materials
# get_cost_preview
POST   /api/sku/cost-preview
# get_bom_history
GET    /api/sku/bom-history/<int:sku_id>
# get_sku_master_details
GET    /api/sku/master/<int:sku_id>
# create_sku_master
POST   /api/sku/master
# update_sku_master
PUT    /api/sku/master/<int:sku_id>
# get_mrp_history
GET    /api/sku/mrp-history/<int:sku_id>
# get_current_mrp
GET    /api/sku/current-mrp/<int:sku_id>
# create_sku_production
POST   /api/sku/production
# get_production_history
GET    /api/sku/production/history
# get_expiry_alerts
GET    /api/sku/expiry-alerts
# get_expiry_summary
GET    /api/sku/expiry-summary
# get_fefo_allocation_for_sku
POST   /api/sku/fefo-allocation/<int:sku_id>
# get_production_summary_report
GET    /api/sku/production-summary/<int:production_id>
# create_production_plan
POST   /api/sku/production/plan
# allocate_oil_for_production
POST   /api/sku/production/allocate-oil
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| BOM | sku-management | 🟡 MEDIUM | Changes affect 1 other modules |
| CURRENT_DATE | sku-production | 🟡 MEDIUM | Changes affect 1 other modules |
| DESC | sku-production | 🟡 MEDIUM | Changes affect 1 other modules |
| batch | batch-production, blending, cost-management | 🔴 HIGH | Changes affect 7 other modules |
| blend_batches | blending, sku-production | 🟡 MEDIUM | Changes affect 2 other modules |
| cost_elements_master | cost-management, sku-management, sku-production | 🔴 HIGH | Changes affect 4 other modules |
| created_at | sku-production | 🟡 MEDIUM | Changes affect 1 other modules |
| inventory | batch-production, blending, material-writeoff | 🔴 HIGH | Changes affect 7 other modules |
| materials | batch-production, blending, material-writeoff | 🔴 HIGH | Changes affect 9 other modules |
| sku_bom_details | sku-management, sku-production | 🟡 MEDIUM | Changes affect 2 other modules |
| sku_bom_master | sku-management, sku-production | 🟡 MEDIUM | Changes affect 2 other modules |
| sku_master | sku-management, sku-production, system-config | 🔴 HIGH | Changes affect 4 other modules |
| sku_material_consumption | sku-production | 🟡 MEDIUM | Changes affect 1 other modules |
| sku_mrp_history | sku-production | 🟡 MEDIUM | Changes affect 1 other modules |
| sku_oil_allocation | sku-production | 🟡 MEDIUM | Changes affect 1 other modules |
| sku_production | sku-production | 🟡 MEDIUM | Changes affect 1 other modules |

### ⚠️ Hardcoded Values Detected
- `ProductionSummaryReport.js:185` - object

## Backend Implementation

## Frontend Components

## Data Flow & Integration
### 🔗 Cascading Dependencies
- **inventory** (HIGH RISK)
  - Shared with: batch-production, blending, material-writeoff, opening-balance, purchase, sku-production, unknown
  - Impact: Changes will cascade to these modules
- **materials** (HIGH RISK)
  - Shared with: batch-production, blending, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, unknown
  - Impact: Changes will cascade to these modules
- **cost_elements_master** (HIGH RISK)
  - Shared with: cost-management, sku-management, sku-production, system-config
  - Impact: Changes will cascade to these modules

### Integration Points
- **Upstream**: Batch Production (oil source)
- **Downstream**: Sales, Reports
- **Tables Modified**: sku_production, sku_oil_allocation

---
*End of Feature Pack*