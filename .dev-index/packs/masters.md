# Feature Pack: MASTERS
Generated: 2025-09-08T18:40:05.121Z
Routes: 32 | Tables: 16 | Files: 4

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_field_options
GET    /api/masters/<master_type>/field-options/<field_name>
# get_cost_element_categories
GET    /api/masters/cost_elements/field-options/category
# get_cost_element_activities
GET    /api/masters/cost_elements/field-options/activity
# get_cost_element_unit_types
GET    /api/masters/cost_elements/field-options/unit_type
# get_cost_element_calculation_methods
GET    /api/masters/cost_elements/field-options/calculation_method
# get_cost_element_applicable_to
GET    /api/masters/cost_elements/field-options/applicable_to
# list_master_types
GET    /api/masters/types
# get_master_schema
GET    /api/masters/<master_type>/schema
# list_master_records
GET    /api/masters/<master_type>
# cost_elements_validation_report
GET    /api/masters/cost_elements/validation_report
# cost_elements_usage_stats
GET    /api/masters/cost_elements/usage_stats
# bulk_update_cost_elements
POST   /api/masters/cost_elements/bulk_update
# get_cost_element_history
GET    /api/masters/cost_elements/<int:element_id>/history
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
| batch | batch-production, blending, cost-management | 🔴 HIGH | Changes affect 10 other modules |
| batch_extended_costs | batch-production, cost-management, masters-crud | 🔴 HIGH | Changes affect 3 other modules |
| blend_batches | blending, masters-crud, sku-production | 🔴 HIGH | Changes affect 3 other modules |
| categories_master | blending, masters-crud, material-writeoff | 🔴 HIGH | Changes affect 5 other modules |
| cost | package-sizes | 🟡 MEDIUM | Changes affect 1 other modules |
| cost_element_activities | masters-crud | 🟡 MEDIUM | Changes affect 1 other modules |
| cost_element_categories | masters-crud | 🟡 MEDIUM | Changes affect 1 other modules |
| cost_element_rate_history | cost-management, masters-crud | 🟡 MEDIUM | Changes affect 2 other modules |
| cost_element_unit_types | masters-crud | 🟡 MEDIUM | Changes affect 1 other modules |
| cost_elements_master | batch-production, cost-management, masters-crud | 🔴 HIGH | Changes affect 6 other modules |
| information_schema | masters-common, masters-crud | 🟡 MEDIUM | Changes affect 2 other modules |
| inventory | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 8 other modules |
| materials | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 10 other modules |
| package_sizes_master | masters-crud, package-sizes, sku-production | 🔴 HIGH | Changes affect 3 other modules |
| sku_master | batch-production, masters-crud, material-writeoff | 🔴 HIGH | Changes affect 9 other modules |
| subcategories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 4 other modules |

### ⚠️ Hardcoded Values Detected
- `masters_crud.py:108` - object

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

### Integration Points

---
*End of Feature Pack*