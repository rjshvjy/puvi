# Feature Pack: CUSTOMERS
Generated: 2025-08-30T06:35:30.150Z
Routes: 9 | Tables: 3 | Files: 1

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_customers
GET    /api/customers
# get_customer_details
GET    /api/customers/<int:customer_id>
# create_customer
POST   /api/customers
# update_customer
PUT    /api/customers/<int:customer_id>
# delete_customer
DELETE /api/customers/<int:customer_id>
# get_ship_to_locations
GET    /api/customers/<int:customer_id>/ship-to
# create_ship_to_location
POST   /api/customers/<int:customer_id>/ship-to
# get_customers_dropdown
GET    /api/customers/dropdown
# restore_customer
POST   /api/customers/<int:customer_id>/restore
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| customer_ship_to_locations | None | 🟢 LOW | Isolated to this module |
| customers | locations, unknown | 🟡 MEDIUM | Changes affect 2 other modules |
| sku_outbound | locations, sku-outbound, unknown | 🔴 HIGH | Changes affect 3 other modules |

## Backend Implementation

## Data Flow & Integration
*No critical cross-module dependencies detected*

### Integration Points

---
*End of Feature Pack*