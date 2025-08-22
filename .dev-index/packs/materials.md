# Feature Pack: MATERIALS
Generated: 2025-08-22T06:39:31.992Z
Routes: 4 | Tables: 14 | Files: 2

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_materials
GET    /api/materials
# create_material
POST   /api/materials
# get_material_categories
GET    /api/materials/categories
# get_material_units
GET    /api/materials/units
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| available_oil_types | batch-production, system-config | 🟡 MEDIUM | Changes affect 2 other modules |
| bom_category_mapping | system-config | 🟡 MEDIUM | Changes affect 1 other modules |
| categories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 3 other modules |
| cost_elements_master | cost-management, sku-management, sku-production | 🔴 HIGH | Changes affect 4 other modules |
| inventory | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 8 other modules |
| material_tags | purchase | 🟡 MEDIUM | Changes affect 1 other modules |
| materials | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 10 other modules |
| purchase_items | batch-production, purchase | 🟡 MEDIUM | Changes affect 2 other modules |
| purchases | batch-production, blending, opening-balance | 🔴 HIGH | Changes affect 5 other modules |
| sku_master | masters-crud, sku-management, sku-production | 🔴 HIGH | Changes affect 5 other modules |
| subcategories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 3 other modules |
| suppliers | opening-balance, purchase, system-config | 🔴 HIGH | Changes affect 4 other modules |
| tags | purchase | 🟡 MEDIUM | Changes affect 1 other modules |
| writeoff_reasons | material-writeoff, system-config | 🟡 MEDIUM | Changes affect 2 other modules |

### ⚠️ Hardcoded Values Detected
- `system_config.py:188` - object

## Backend Implementation

## Data Flow & Integration
### 🔗 Cascading Dependencies
- **inventory** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, unknown
  - Impact: Changes will cascade to these modules
- **materials** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, unknown
  - Impact: Changes will cascade to these modules
- **cost_elements_master** (HIGH RISK)
  - Shared with: cost-management, sku-management, sku-production, system-config
  - Impact: Changes will cascade to these modules
- **suppliers** (HIGH RISK)
  - Shared with: opening-balance, purchase, system-config, unknown
  - Impact: Changes will cascade to these modules

### Integration Points

---
*End of Feature Pack*