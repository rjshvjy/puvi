# Feature Pack: MATERIAL-SALES-INVENTORY
Generated: 2025-08-24T07:59:54.198Z
Routes: 1 | Tables: 5 | Files: 1

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_material_sales_inventory
GET    /api/material_sales_inventory
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| batch | batch-production, blending, cost-management | 🔴 HIGH | Changes affect 8 other modules |
| batches | material-sales | 🟡 MEDIUM | Changes affect 1 other modules |
| oil_cake_inventory | batch-production, material-sales | 🟡 MEDIUM | Changes affect 2 other modules |
| oil_cake_sale_allocations | material-sales | 🟡 MEDIUM | Changes affect 1 other modules |
| oil_cake_sales | material-sales | 🟡 MEDIUM | Changes affect 1 other modules |

## Backend Implementation

## Data Flow & Integration
*No critical cross-module dependencies detected*

### Integration Points

---
*End of Feature Pack*