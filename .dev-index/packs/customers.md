# Feature Pack: CUSTOMERS
Generated: 2025-09-07T11:56:10.960Z
Routes: 12 | Tables: 11 | Files: 2

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
GET    /api/customers/dropdown
# restore_customer
POST   /api/customers/<int:customer_id>/restore
# get_customer_all_locations
GET    /api/customers/<int:customer_id>/all-locations
# get_customer_ship_to_locations
GET    /api/customers/<int:customer_id>/ship-to
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| categories_master | blending, masters-crud, material-writeoff | 🔴 HIGH | Changes affect 5 other modules |
| customer_ship_to_locations | sku-outbound | 🟡 MEDIUM | Changes affect 1 other modules |
| customers | locations, sku-outbound, unknown | 🔴 HIGH | Changes affect 3 other modules |
| locations_master | locations, sku-outbound, sku-production | 🔴 HIGH | Changes affect 4 other modules |
| sku_expiry_tracking | locations, sku-outbound, unknown | 🔴 HIGH | Changes affect 3 other modules |
| sku_inventory | locations, material-writeoff, sku-outbound | 🔴 HIGH | Changes affect 5 other modules |
| sku_master | masters-crud, material-writeoff, package-sizes | 🔴 HIGH | Changes affect 8 other modules |
| sku_outbound | locations, sku-outbound, unknown | 🔴 HIGH | Changes affect 3 other modules |
| sku_outbound_items | sku-outbound | 🟡 MEDIUM | Changes affect 1 other modules |
| sku_production | material-writeoff, sku-management, sku-outbound | 🔴 HIGH | Changes affect 5 other modules |
| subcategories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 4 other modules |

### ⚠️ Hardcoded Values Detected
- `sku_outbound.py:103` - object
- `sku_outbound.py:154` - object
- `sku_outbound.py:519` - object

## Backend Implementation

## Data Flow & Integration
*No critical cross-module dependencies detected*

### Integration Points

---
*End of Feature Pack*