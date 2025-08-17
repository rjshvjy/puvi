# Feature Pack: CONFIG
Generated: 2025-08-17T10:23:44.837Z
Routes: 1 | Tables: 4 | Files: 1

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Database Dependencies](#database-dependencies)
3. [Backend Implementation](#backend-implementation)
4. [API Service Layer](#api-service-layer)
5. [Frontend Components](#frontend-components)
6. [Data Flow & Integration](#data-flow--integration)

## API Endpoints
```
# get_config
GET    /api/config/<config_type>
```

## Database Dependencies
| Table | Shared With | Risk | Impact |
|-------|-------------|------|--------|
| cost_elements_master | cost-management, sku-management, sku-production | 🔴 HIGH | Changes affect 4 other modules |
| materials | batch-production, blending, material-writeoff | 🔴 HIGH | Changes affect 9 other modules |
| sku_master | sku-management, sku-production, system-config | 🔴 HIGH | Changes affect 4 other modules |
| suppliers | opening-balance, purchase, system-config | 🔴 HIGH | Changes affect 4 other modules |

### ⚠️ Hardcoded Values Detected
- `system_config.py:116` - object

## Backend Implementation

## Data Flow & Integration
### 🔗 Cascading Dependencies
- **materials** (HIGH RISK)
  - Shared with: batch-production, blending, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, unknown
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