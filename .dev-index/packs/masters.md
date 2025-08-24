# Feature Pack: MASTERS
Generated: 2025-08-24T07:58:59.886Z
Routes: 22 | Tables: 11 | Files: 4

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
# get_package_sizes
GET    /api/masters/package_sizes
# get_package_size
GET    /api/masters/package_sizes/<int:size_id>
# create_package_size
POST   /api/masters/package_sizes
# update_package_size
PUT    /api/masters/package_sizes/<int:size_id>
# delete_package_size
DELETE /api/masters/package_sizes/<int:size_id>
# bulk_update_package_sizes
POST   /api/masters/package_sizes/bulk-update
# get_package_sizes_dropdown
GET    /api/masters/package_sizes/dropdown
# validate_package_size
POST   /api/masters/package_sizes/validate
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| batch | batch-production, blending, cost-management | 🔴 HIGH | Changes affect 8 other modules |
| blend_batches | blending, masters-crud, sku-production | 🔴 HIGH | Changes affect 3 other modules |
| categories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 3 other modules |
| cost | package-sizes | 🟡 MEDIUM | Changes affect 1 other modules |
| cost_elements_master | cost-management, package-sizes, sku-management | 🔴 HIGH | Changes affect 5 other modules |
| information_schema | masters-common, masters-crud | 🟡 MEDIUM | Changes affect 2 other modules |
| inventory | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 8 other modules |
| materials | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 10 other modules |
| package_sizes_master | package-sizes, sku-production | 🟡 MEDIUM | Changes affect 2 other modules |
| sku_master | masters-crud, package-sizes, sku-management | 🔴 HIGH | Changes affect 6 other modules |
| subcategories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 3 other modules |

## Backend Implementation

## Frontend Components

## Data Flow & Integration
### 🔗 Cascading Dependencies
- **materials** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, unknown
  - Impact: Changes will cascade to these modules
- **inventory** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, unknown
  - Impact: Changes will cascade to these modules
- **cost_elements_master** (HIGH RISK)
  - Shared with: cost-management, package-sizes, sku-management, sku-production, system-config
  - Impact: Changes will cascade to these modules

### Integration Points

---
*End of Feature Pack*