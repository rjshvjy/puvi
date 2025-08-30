# PUVI System - Dependency Analysis Report

**Generated:** 2025-08-30T06:35:30.087Z
**Version:** 1.0

## Executive Summary

- **Total Tables:** 68
- **Shared Tables:** 36 (cross-module dependencies)
- **Hardcoded Categories:** 0
- **Migration Opportunities:** 0

## Risk Assessment

## Critical Shared Tables

Tables used by multiple modules (changes have cascading effects):

### purchases
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, opening-balance, purchase, sku-production, unknown
- **File Count:** 6
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 6 modules

### materials
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, writeoff-analytics, unknown
- **File Count:** 12
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 11 modules

### inventory
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, unknown
- **File Count:** 8
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 8 modules

### batch
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, cost-management, masters-crud, material-sales, material-writeoff, opening-balance, sku-production, writeoff-analytics, unknown
- **File Count:** 11
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 10 modules

### categories_master
- **Risk Level:** HIGH
- **Shared By:** blending, masters-crud, material-writeoff, purchase
- **File Count:** 4
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

### cost_elements_master
- **Risk Level:** HIGH
- **Shared By:** cost-management, package-sizes, sku-management, sku-production, system-config
- **File Count:** 5
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 5 modules

### sku_outbound
- **Risk Level:** HIGH
- **Shared By:** customers, locations, sku-outbound, unknown
- **File Count:** 4
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

### sku_inventory
- **Risk Level:** HIGH
- **Shared By:** locations, material-writeoff, sku-outbound, sku-production
- **File Count:** 4
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

### sku_master
- **Risk Level:** HIGH
- **Shared By:** masters-crud, material-writeoff, package-sizes, sku-management, sku-outbound, sku-production, system-config, unknown
- **File Count:** 8
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 8 modules

### sku_production
- **Risk Level:** HIGH
- **Shared By:** material-writeoff, sku-management, sku-outbound, sku-production, unknown
- **File Count:** 5
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 5 modules

### suppliers
- **Risk Level:** HIGH
- **Shared By:** opening-balance, purchase, sku-production, system-config, unknown
- **File Count:** 6
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 5 modules

### oil_cake_inventory
- **Risk Level:** MEDIUM
- **Shared By:** batch-production, material-sales, material-writeoff
- **File Count:** 3
- **Recommendation:** Changes will affect batch-production, material-sales, material-writeoff

### subcategories_master
- **Risk Level:** MEDIUM
- **Shared By:** blending, masters-crud, purchase
- **File Count:** 3
- **Recommendation:** Changes will affect blending, masters-crud, purchase

### blend_batches
- **Risk Level:** MEDIUM
- **Shared By:** blending, masters-crud, sku-production
- **File Count:** 3
- **Recommendation:** Changes will affect blending, masters-crud, sku-production

### customers
- **Risk Level:** MEDIUM
- **Shared By:** customers, locations, unknown
- **File Count:** 3
- **Recommendation:** Changes will affect customers, locations, unknown

### locations_master
- **Risk Level:** MEDIUM
- **Shared By:** locations, sku-outbound, unknown
- **File Count:** 3
- **Recommendation:** Changes will affect locations, sku-outbound, unknown

### writeoff_reasons
- **Risk Level:** MEDIUM
- **Shared By:** material-writeoff, system-config, writeoff-analytics
- **File Count:** 3
- **Recommendation:** Changes will affect material-writeoff, system-config, writeoff-analytics

### material_writeoffs
- **Risk Level:** MEDIUM
- **Shared By:** material-writeoff, opening-balance, writeoff-analytics
- **File Count:** 3
- **Recommendation:** Changes will affect material-writeoff, opening-balance, writeoff-analytics

## Migration Opportunities

Hardcoded values that should be moved to database:

## Appendix: Detailed Table Usage

- **materials**: Used by batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, writeoff-analytics, unknown (12 files)
- **batch**: Used by batch-production, blending, cost-management, masters-crud, material-sales, material-writeoff, opening-balance, sku-production, writeoff-analytics, unknown (11 files)
- **inventory**: Used by batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, unknown (8 files)
- **sku_master**: Used by masters-crud, material-writeoff, package-sizes, sku-management, sku-outbound, sku-production, system-config, unknown (8 files)
- **purchases**: Used by batch-production, blending, opening-balance, purchase, sku-production, unknown (6 files)
- **cost_elements_master**: Used by cost-management, package-sizes, sku-management, sku-production, system-config (5 files)
- **sku_production**: Used by material-writeoff, sku-management, sku-outbound, sku-production, unknown (5 files)
- **suppliers**: Used by opening-balance, purchase, sku-production, system-config, unknown (6 files)
- **categories_master**: Used by blending, masters-crud, material-writeoff, purchase (4 files)
- **sku_outbound**: Used by customers, locations, sku-outbound, unknown (4 files)