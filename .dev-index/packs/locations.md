# Feature Pack: LOCATIONS
Generated: 2025-08-30T01:49:12.904Z
Routes: 9 | Tables: 5 | Files: 1

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_locations
GET    /api/locations
# get_location_details
GET    /api/locations/<int:location_id>
# create_location
POST   /api/locations
# update_location
PUT    /api/locations/<int:location_id>
# delete_location
DELETE /api/locations/<int:location_id>
# check_dependencies
GET    /api/locations/<int:location_id>/check-dependencies
# get_locations_for_transfer
GET    /api/locations/for-transfer
# restore_location
POST   /api/locations/<int:location_id>/restore
# get_locations_dropdown
GET    /api/locations/dropdown
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| customers | customers, unknown | 🟡 MEDIUM | Changes affect 2 other modules |
| locations_master | sku-outbound, unknown | 🟡 MEDIUM | Changes affect 2 other modules |
| sku_expiry_tracking | sku-outbound | 🟡 MEDIUM | Changes affect 1 other modules |
| sku_inventory | material-writeoff, sku-outbound, sku-production | 🔴 HIGH | Changes affect 3 other modules |
| sku_outbound | customers, sku-outbound, unknown | 🔴 HIGH | Changes affect 3 other modules |

## Backend Implementation

## Data Flow & Integration
*No critical cross-module dependencies detected*

### Integration Points

---
*End of Feature Pack*