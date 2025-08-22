# Feature Pack: MASTERS
Generated: 2025-08-22T07:21:54.103Z
Routes: 14 | Tables: 8 | Files: 2

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# list_master_types
GET    /api/masters/types
# get_master_schema
GET    /api/masters/<master_type>/schema
# list_master_records
GET    /api/masters/<master_type>
# get_single_record
GET    /api/masters/<master_type>/<record_id>
# create_record
POST   /api/masters/<master_type>
# update_record
PUT    /api/masters/<master_type>/<record_id>
# delete_record
DELETE /api/masters/<master_type>/<record_id>
# restore_record_endpoint
POST   /api/masters/<master_type>/<record_id>/restore
# check_record_dependencies
GET    /api/masters/<master_type>/<record_id>/dependencies
# export_to_csv
GET    /api/masters/<master_type>/export
# import_from_csv
POST   /api/masters/<master_type>/import
# create_subcategory
POST   /api/masters/subcategories
# update_subcategory
PUT    /api/masters/subcategories/<int:subcategory_id>
# delete_subcategory
DELETE /api/masters/subcategories/<int:subcategory_id>
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

## Frontend Components

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