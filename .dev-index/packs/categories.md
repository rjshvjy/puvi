# Feature Pack: CATEGORIES
Generated: 2025-09-04T14:52:32.466Z
Routes: 1 | Tables: 12 | Files: 1

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_categories
GET    /api/categories
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| batch | batch-production, blending, cost-management | 🔴 HIGH | Changes affect 10 other modules |
| batch_extended_costs | batch-production, cost-management, masters-crud | 🔴 HIGH | Changes affect 3 other modules |
| blend_batches | blending, masters-crud, sku-production | 🔴 HIGH | Changes affect 3 other modules |
| categories_master | blending, masters-crud, material-writeoff | 🔴 HIGH | Changes affect 5 other modules |
| cost_element_rate_history | cost-management, masters-crud | 🟡 MEDIUM | Changes affect 2 other modules |
| cost_elements_master | cost-management, masters-crud, package-sizes | 🔴 HIGH | Changes affect 5 other modules |
| information_schema | masters-common, masters-crud | 🟡 MEDIUM | Changes affect 2 other modules |
| inventory | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 8 other modules |
| materials | batch-production, blending, masters-crud | 🔴 HIGH | Changes affect 10 other modules |
| package_sizes_master | masters-crud, package-sizes, sku-production | 🔴 HIGH | Changes affect 3 other modules |
| sku_master | masters-crud, material-writeoff, package-sizes | 🔴 HIGH | Changes affect 8 other modules |
| subcategories_master | blending, masters-crud, purchase | 🔴 HIGH | Changes affect 4 other modules |

### ⚠️ Hardcoded Values Detected
- `masters_crud.py:108` - object

## Backend Implementation

## Data Flow & Integration
### 🔗 Cascading Dependencies
- **materials** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, system-config, writeoff-analytics, unknown
  - Impact: Changes will cascade to these modules
- **inventory** (HIGH RISK)
  - Shared with: batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, unknown
  - Impact: Changes will cascade to these modules
- **cost_elements_master** (HIGH RISK)
  - Shared with: cost-management, masters-crud, package-sizes, sku-production, system-config
  - Impact: Changes will cascade to these modules

### Integration Points

---
*End of Feature Pack*