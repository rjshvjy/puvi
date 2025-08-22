# PUVI System - Dependency Analysis Report

**Generated:** 2025-08-22T08:17:41.809Z
**Version:** 1.0

## Executive Summary

- **Total Tables:** 51
- **Shared Tables:** 26 (cross-module dependencies)
- **Hardcoded Categories:** 0
- **Migration Opportunities:** 0

## Risk Assessment

## Critical Shared Tables

Tables used by multiple modules (changes have cascading effects):

### inventory
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, unknown
- **File Count:** 8
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 8 modules

### materials
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, unknown
- **File Count:** 11
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 10 modules

### purchases
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, opening-balance, purchase, unknown
- **File Count:** 5
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 5 modules

### batch
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, cost-management, masters-crud, material-sales, opening-balance, sku-production, unknown
- **File Count:** 9
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 8 modules

### cost_elements_master
- **Risk Level:** HIGH
- **Shared By:** cost-management, sku-management, sku-production, system-config
- **File Count:** 4
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

### sku_master
- **Risk Level:** HIGH
- **Shared By:** masters-crud, sku-management, sku-production, system-config, unknown
- **File Count:** 5
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 5 modules

### suppliers
- **Risk Level:** HIGH
- **Shared By:** opening-balance, purchase, system-config, unknown
- **File Count:** 5
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

### subcategories_master
- **Risk Level:** MEDIUM
- **Shared By:** blending, masters-crud, purchase
- **File Count:** 3
- **Recommendation:** Changes will affect blending, masters-crud, purchase

### categories_master
- **Risk Level:** MEDIUM
- **Shared By:** blending, masters-crud, purchase
- **File Count:** 3
- **Recommendation:** Changes will affect blending, masters-crud, purchase

### blend_batches
- **Risk Level:** MEDIUM
- **Shared By:** blending, masters-crud, sku-production
- **File Count:** 3
- **Recommendation:** Changes will affect blending, masters-crud, sku-production

## Migration Opportunities

Hardcoded values that should be moved to database:

## Appendix: Detailed Table Usage

- **materials**: Used by batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, unknown (11 files)
- **inventory**: Used by batch-production, blending, masters-crud, material-writeoff, opening-balance, purchase, sku-production, unknown (8 files)
- **batch**: Used by batch-production, blending, cost-management, masters-crud, material-sales, opening-balance, sku-production, unknown (9 files)
- **purchases**: Used by batch-production, blending, opening-balance, purchase, unknown (5 files)
- **sku_master**: Used by masters-crud, sku-management, sku-production, system-config, unknown (5 files)
- **cost_elements_master**: Used by cost-management, sku-management, sku-production, system-config (4 files)
- **suppliers**: Used by opening-balance, purchase, system-config, unknown (5 files)
- **subcategories_master**: Used by blending, masters-crud, purchase (3 files)
- **categories_master**: Used by blending, masters-crud, purchase (3 files)
- **blend_batches**: Used by blending, masters-crud, sku-production (3 files)