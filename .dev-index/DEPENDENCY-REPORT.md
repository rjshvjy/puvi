# PUVI System - Dependency Analysis Report

**Generated:** 2025-08-17T00:05:54.839Z
**Version:** 1.0

## Executive Summary

- **Total Tables:** 41
- **Shared Tables:** 17 (cross-module dependencies)
- **Hardcoded Categories:** 0
- **Migration Opportunities:** 0

## Risk Assessment

## Critical Shared Tables

Tables used by multiple modules (changes have cascading effects):

### inventory
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, material-writeoff, opening-balance, purchase, sku-production, unknown
- **File Count:** 7
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 7 modules

### materials
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, unknown
- **File Count:** 10
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 9 modules

### purchases
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, opening-balance, purchase, unknown
- **File Count:** 5
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 5 modules

### batch
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, cost-management, material-sales, opening-balance, sku-production, unknown
- **File Count:** 8
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 7 modules

### sku_master
- **Risk Level:** HIGH
- **Shared By:** batch-production, sku-management, sku-production, system-config, unknown
- **File Count:** 5
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 5 modules

### cost_elements_master
- **Risk Level:** HIGH
- **Shared By:** cost-management, sku-management, sku-production, system-config
- **File Count:** 4
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

### suppliers
- **Risk Level:** HIGH
- **Shared By:** opening-balance, purchase, system-config, unknown
- **File Count:** 5
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

## Migration Opportunities

Hardcoded values that should be moved to database:

## Appendix: Detailed Table Usage

- **materials**: Used by batch-production, blending, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, unknown (10 files)
- **inventory**: Used by batch-production, blending, material-writeoff, opening-balance, purchase, sku-production, unknown (7 files)
- **batch**: Used by batch-production, blending, cost-management, material-sales, opening-balance, sku-production, unknown (8 files)
- **purchases**: Used by batch-production, blending, opening-balance, purchase, unknown (5 files)
- **sku_master**: Used by batch-production, sku-management, sku-production, system-config, unknown (5 files)
- **cost_elements_master**: Used by cost-management, sku-management, sku-production, system-config (4 files)
- **suppliers**: Used by opening-balance, purchase, system-config, unknown (5 files)
- **purchase_items**: Used by batch-production, purchase (2 files)
- **batch_extended_costs**: Used by batch-production, cost-management (2 files)
- **oil_cake_inventory**: Used by batch-production, material-sales (2 files)