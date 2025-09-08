# Feature Pack: SKU
Generated: 2025-09-08T12:53:05.022Z
Routes: 25 | Tables: 31 | Files: 11

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
# get_single_sku
GET    /api/sku/master/<int:sku_id>
# create_sku
POST   /api/sku/master
# update_sku
PUT    /api/sku/master/<int:sku_id>
# bulk_update_weights
POST   /api/sku/master/update-weights
# calculate_recommended_weights
GET    /api/sku/master/calculate-weights
# delete_sku
DELETE /api/sku/master/<int:sku_id>
# check_availability
POST   /api/sku/outbound/check-availability
# create_outbound
POST   /api/sku/outbound/create
# get_outbound_history
GET    /api/sku/outbound/history
# get_outbound_details
GET    /api/sku/outbound/<int:outbound_id>
# trace_batch
GET    /api/sku/outbound/trace/<traceable_code>
# update_outbound_status
POST   /api/sku/outbound/<int:outbound_id>/update-status
# get_outbound_stats
GET    /api/sku/outbound/stats
# get_sales_summary
GET    /api/sku/outbound/sales-summary
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
| CURRENT_DATE | sku-production | 🟡 MEDIUM | Changes affect 1 other modules |
| DESC | sku-production | 🟡 MEDIUM | Changes affect 1 other modules |
| batch | batch-production, blending, cost-management | 🔴 HIGH | Changes affect 10 other modules |
| blend_batch_components | blending, sku-production | 🟡 MEDIUM | Changes affect 2 other modules |
| blend_batches | blending, masters-crud, sku-production | 🔴 HIGH | Changes affect 3 other modules |
| categories_master | blending, masters-crud, material-writeoff | 🔴 HIGH | Changes affect 5 other modules |
| cost_elements_master | batch-production, cost-management, masters-crud | 🔴 HIGH | Changes affect 6 other modules |
| created_at | sku-production | 🟡 MEDIUM | Changes affect 1 other modules |
| customer_ship_to_locations | customers, sku-outbound | 🟡 MEDIUM | Changes affect 2 other modules |
| customers | customers, locations, sku-outbound | 🔴 HIGH | Changes affect 4 other modules |
| inventory | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 8 other modules |
| locations_master | locations, sku-outbound, sku-production | 🔴 HIGH | Changes affect 4 other modules |
| masters_audit_log | masters-common, opening-balance, sku-management | 🔴 HIGH | Changes affect 3 other modules |
| materials | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 10 other modules |
| package_sizes_master | masters-crud, package-sizes, sku-production | 🔴 HIGH | Changes affect 3 other modules |
| purchases | batch-production, blending, opening-balance | 🔴 HIGH | Changes affect 6 other modules |
| query | masters-common, sku-management | 🟡 MEDIUM | Changes affect 2 other modules |
| sku_bom_details | sku-management, sku-production | 🟡 MEDIUM | Changes affect 2 other modules |
| sku_bom_master | sku-management, sku-production | 🟡 MEDIUM | Changes affect 2 other modules |
| sku_cost_overrides | sku-production | 🟡 MEDIUM | Changes affect 1 other modules |
| sku_expiry_tracking | locations, sku-outbound, unknown | 🔴 HIGH | Changes affect 3 other modules |
| sku_inventory | locations, material-writeoff, sku-outbound | 🔴 HIGH | Changes affect 5 other modules |
| sku_master | batch-production, masters-crud, material-writeoff | 🔴 HIGH | Changes affect 9 other modules |
| sku_material_consumption | sku-production | 🟡 MEDIUM | Changes affect 1 other modules |
| sku_mrp_history | sku-management, sku-production | 🟡 MEDIUM | Changes affect 2 other modules |
| sku_oil_allocation | sku-production | 🟡 MEDIUM | Changes affect 1 other modules |
| sku_outbound | customers, locations, sku-outbound | 🔴 HIGH | Changes affect 4 other modules |
| sku_outbound_items | sku-outbound | 🟡 MEDIUM | Changes affect 1 other modules |
| sku_production | material-writeoff, sku-management, sku-outbound | 🔴 HIGH | Changes affect 5 other modules |
| subcategories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 4 other modules |
| suppliers | opening-balance, purchase, sku-production | 🔴 HIGH | Changes affect 5 other modules |

### ⚠️ Hardcoded Values Detected
- `ProductionSummaryReport.js:277` - object
- `sku_outbound.py:103` - object
- `sku_outbound.py:154` - object
- `sku_outbound.py:519` - object
- `sku_production.py:430` - object

## Backend Implementation

## Frontend Components

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
- **suppliers** (HIGH RISK)
  - Shared with: opening-balance, purchase, sku-production, system-config, unknown
  - Impact: Changes will cascade to these modules

### Integration Points
- **Upstream**: Batch Production (oil source)
- **Downstream**: Sales, Reports
- **Tables Modified**: sku_production, sku_oil_allocation

---
*End of Feature Pack*