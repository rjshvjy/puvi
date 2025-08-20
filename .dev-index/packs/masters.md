# Feature Pack: MASTERS
Generated: 2025-08-20T09:48:10.362Z
Routes: 11 | Tables: 2 | Files: 2

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
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| categories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 3 other modules |
| subcategories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 3 other modules |

## Backend Implementation

## Frontend Components

## Data Flow & Integration
*No critical cross-module dependencies detected*

### Integration Points

---
*End of Feature Pack*