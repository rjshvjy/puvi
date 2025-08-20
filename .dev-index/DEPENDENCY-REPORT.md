# PUVI System - Dependency Analysis Report

**Generated:** 2025-08-20T01:59:54.164Z
**Version:** 1.0

## Executive Summary

- **Total Tables:** 49
- **Shared Tables:** 22 (cross-module dependencies)
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
- **File Count:** 9
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 9 modules

### purchases
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, opening-balance, purchase
- **File Count:** 4
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

### batch
- **Risk Level:** HIGH
- **Shared By:** batch-production, blending, cost-management, material-sales, opening-balance, sku-production, unknown
- **File Count:** 7
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 7 modules

### cost_elements_master
- **Risk Level:** HIGH
- **Shared By:** cost-management, sku-management, sku-production, system-config
- **File Count:** 4
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

### suppliers
- **Risk Level:** HIGH
- **Shared By:** opening-balance, purchase, system-config, unknown
- **File Count:** 4
- **Recommendation:** ⚠️ CRITICAL: Changes require coordination across 4 modules

### sku_master
- **Risk Level:** MEDIUM
- **Shared By:** sku-management, sku-production, system-config
- **File Count:** 3
- **Recommendation:** Changes will affect sku-management, sku-production, system-config

## Migration Opportunities

Hardcoded values that should be moved to database:

## Appendix: Detailed Table Usage

- **materials**: Used by batch-production, blending, material-writeoff, opening-balance, purchase, sku-management, sku-production, system-config, unknown (9 files)
- **inventory**: Used by batch-production, blending, material-writeoff, opening-balance, purchase, sku-production, unknown (7 files)
- **batch**: Used by batch-production, blending, cost-management, material-sales, opening-balance, sku-production, unknown (7 files)
- **purchases**: Used by batch-production, blending, opening-balance, purchase (4 files)
- **cost_elements_master**: Used by cost-management, sku-management, sku-production, system-config (4 files)
- **suppliers**: Used by opening-balance, purchase, system-config, unknown (4 files)
- **sku_master**: Used by sku-management, sku-production, system-config (3 files)
- **purchase_items**: Used by batch-production, purchase (2 files)
- **available_oil_types**: Used by batch-production, system-config (2 files)
- **batch_extended_costs**: Used by batch-production, cost-management (2 files)