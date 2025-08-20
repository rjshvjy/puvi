# Feature Pack: SUBCATEGORIES
Generated: 2025-08-20T07:20:29.516Z
Routes: 2 | Tables: 2 | Files: 1

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_subcategories
GET    /api/subcategories
# get_subcategory_details
GET    /api/subcategories/<int:subcategory_id>
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| categories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 3 other modules |
| subcategories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 3 other modules |

## Backend Implementation

## Data Flow & Integration
*No critical cross-module dependencies detected*

### Integration Points

---
*End of Feature Pack*