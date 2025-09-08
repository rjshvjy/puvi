# PUVI System - Dependency Analysis Report

**Generated:** 2025-09-08T18:32:59.417Z
**Version:** 1.0

## Executive Summary

- **Total Tables:** 69
- **Shared Tables:** 39 (cross-module dependencies)
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
- **Shared By:** batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, system-config, writeoff-analytics, unknown
- **File Count:** 11
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 10 modules

### batch
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, cost-management, masters-crud, material-sales, material-writeoff, opening-balance, sku-production, writeoff-analytics, unknown
- **File Count:** 11
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 10 modules

### sku_master
- **Risk Level:** HIGH
- **Shared By:** batch-production, masters-crud, material-writeoff, package-sizes, sku-management, sku-outbound, sku-production, system-config, unknown
- **File Count:** 9
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 9 modules

### inventory
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, unknown
- **File Count:** 8
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 8 modules

### cost_elements_master
- **Risk Level:** HIGH
- **Shared By:** batch-production, cost-management, masters-crud, package-sizes, sku-production, system-config
- **File Count:** 6
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 6 modules

### subcategories_master
- **Risk Level:** HIGH
- **Shared By:** blending, masters-crud, purchase, sku-outbound
- **File Count:** 4
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

### categories_master
- **Risk Level:** HIGH
- **Shared By:** blending, masters-crud, material-writeoff, purchase, sku-outbound
- **File Count:** 5
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 5 modules

### customers
- **Risk Level:** HIGH
- **Shared By:** customers, locations, sku-outbound, unknown
- **File Count:** 4
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

### sku_outbound
- **Risk Level:** HIGH
- **Shared By:** customers, locations, sku-outbound, unknown
- **File Count:** 4
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

### locations_master
- **Risk Level:** HIGH
- **Shared By:** locations, sku-outbound, sku-production, unknown
- **File Count:** 5
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

### sku_inventory
- **Risk Level:** HIGH
- **Shared By:** locations, material-writeoff, sku-outbound, sku-production, unknown
- **File Count:** 5
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 5 modules

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

### batch_extended_costs
- **Risk Level:** MEDIUM
- **Shared By:** batch-production, cost-management, masters-crud
- **File Count:** 3
- **Recommendation:** Changes will affect batch-production, cost-management, masters-crud

### blend_batches
- **Risk Level:** MEDIUM
- **Shared By:** blending, masters-crud, sku-production
- **File Count:** 3
- **Recommendation:** Changes will affect blending, masters-crud, sku-production

### sku_expiry_tracking
- **Risk Level:** MEDIUM
- **Shared By:** locations, sku-outbound, unknown
- **File Count:** 3
- **Recommendation:** Changes will affect locations, sku-outbound, unknown

### masters_audit_log
- **Risk Level:** MEDIUM
- **Shared By:** masters-common, opening-balance, sku-management
- **File Count:** 3
- **Recommendation:** Changes will affect masters-common, opening-balance, sku-management

### package_sizes_master
- **Risk Level:** MEDIUM
- **Shared By:** masters-crud, package-sizes, sku-production
- **File Count:** 3
- **Recommendation:** Changes will affect masters-crud, package-sizes, sku-production

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

- **materials**: Used by batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, system-config, writeoff-analytics, unknown (11 files)
- **batch**: Used by batch-production, blending, cost-management, masters-crud, material-sales, material-writeoff, opening-balance, sku-production, writeoff-analytics, unknown (11 files)
- **sku_master**: Used by batch-production, masters-crud, material-writeoff, package-sizes, sku-management, sku-outbound, sku-production, system-config, unknown (9 files)
- **inventory**: Used by batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, unknown (8 files)
- **purchases**: Used by batch-production, blending, opening-balance, purchase, sku-production, unknown (6 files)
- **cost_elements_master**: Used by batch-production, cost-management, masters-crud, package-sizes, sku-production, system-config (6 files)
- **categories_master**: Used by blending, masters-crud, material-writeoff, purchase, sku-outbound (5 files)
- **sku_inventory**: Used by locations, material-writeoff, sku-outbound, sku-production, unknown (5 files)
- **sku_production**: Used by material-writeoff, sku-management, sku-outbound, sku-production, unknown (5 files)
- **suppliers**: Used by opening-balance, purchase, sku-production, system-config, unknown (6 files)