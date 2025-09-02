# PUVI Database Schema Documentation

Generated: 2025-09-02 05:19:37.971332
Database Version: PostgreSQL 17.4 on aarch64-unknown-linux-gnu, compiled by gcc (GCC) 13.2.0, 64-bit
Total Tables: 81

## Table Summary

| Table | Columns | Rows | Size | Foreign Keys |
|-------|---------|------|------|-------------|
| available_oil_types | 1 | 0 | None | 0 |
| batch | 31 | 6 | 88 kB | 2 |
| batch_cost_details | 8 | 0 | 48 kB | 1 |
| batch_cost_details_backup | 8 | 7 | 8192 bytes | 0 |
| batch_cost_summary | 12 | 0 | None | 0 |
| batch_extended_costs | 11 | 54 | 112 kB | 2 |
| batch_summary | 16 | 0 | None | 0 |
| batch_time_tracking | 10 | 6 | 64 kB | 1 |
| blend_batch_components | 11 | 4 | 56 kB | 1 |
| blend_batches | 10 | 2 | 72 kB | 0 |
| bom_category_mapping | 7 | 8 | 48 kB | 0 |
| categories_master | 5 | 5 | 40 kB | 0 |
| cost_element_rate_history | 9 | 0 | 16 kB | 1 |
| cost_element_usage_stats | 8 | 0 | None | 0 |
| cost_elements_backup | 7 | 8 | 8192 bytes | 0 |
| cost_elements_master | 17 | 18 | 144 kB | 1 |
| cost_override_log | 10 | 0 | 32 kB | 1 |
| customer_ship_to_locations | 16 | 4 | 80 kB | 1 |
| customers | 12 | 4 | 80 kB | 0 |
| inventory | 13 | 14 | 72 kB | 2 |
| inventory_by_tags | 6 | 0 | None | 0 |
| locations_master | 22 | 14 | 96 kB | 1 |
| masters_audit_log | 13 | 18 | 144 kB | 0 |
| material_tags | 2 | 12 | 56 kB | 2 |
| material_tags_view | 8 | 0 | None | 0 |
| material_writeoffs | 15 | 1 | 128 kB | 1 |
| materials | 17 | 9 | 112 kB | 3 |
| oil_cake_inventory | 8 | 6 | 40 kB | 1 |
| oil_cake_sale_allocations | 9 | 0 | 8192 bytes | 2 |
| oil_cake_sales | 14 | 0 | 16 kB | 0 |
| opening_balances | 13 | 0 | 56 kB | 1 |
| outbound_summary | 12 | 0 | None | 0 |
| package_sizes_master | 10 | 3 | 40 kB | 0 |
| production_units | 6 | 1 | 40 kB | 0 |
| products | 6 | 2 | 24 kB | 0 |
| purchase_details_view | 20 | 0 | None | 0 |
| purchase_items | 13 | 9 | 56 kB | 2 |
| purchases | 20 | 9 | 96 kB | 2 |
| purchases_backup | 13 | 9 | 8192 bytes | 0 |
| recipes | 7 | 0 | 24 kB | 1 |
| sales_by_ship_to_location | 7 | 0 | None | 0 |
| seed_batch_tracking | 5 | 4 | 40 kB | 0 |
| serial_number_tracking | 6 | 7 | 40 kB | 2 |
| sku_batch_traceability | 12 | 0 | None | 0 |
| sku_bom_details | 8 | 2 | 64 kB | 2 |
| sku_bom_master | 9 | 1 | 64 kB | 1 |
| sku_cost_overrides | 11 | 0 | 24 kB | 2 |
| sku_expiry_tracking | 11 | 3 | 104 kB | 3 |
| sku_inventory | 14 | 2 | 120 kB | 3 |
| sku_master | 15 | 3 | 88 kB | 0 |
| sku_material_consumption | 10 | 8 | 48 kB | 2 |
| sku_mrp_history | 9 | 2 | 80 kB | 1 |
| sku_oil_allocation | 9 | 4 | 40 kB | 1 |
| sku_outbound | 30 | 2 | 160 kB | 4 |
| sku_outbound_items | 17 | 2 | 88 kB | 2 |
| sku_production | 28 | 4 | 96 kB | 2 |
| stock_by_location | 11 | 0 | None | 0 |
| subcategories_master | 8 | 18 | 56 kB | 1 |
| suppliers | 11 | 4 | 80 kB | 0 |
| system_configuration | 7 | 7 | 48 kB | 0 |
| tags | 5 | 12 | 56 kB | 0 |
| uom_master | 10 | 3 | 72 kB | 0 |
| v_active_materials | 17 | 0 | None | 0 |
| v_active_suppliers | 11 | 0 | None | 0 |
| v_cost_elements_by_activity | 13 | 0 | None | 0 |
| v_current_sku_bom | 17 | 0 | None | 0 |
| v_materials_at_risk | 1 | 0 | None | 0 |
| v_sku_current_mrp | 12 | 0 | None | 0 |
| v_sku_expiry_status | 14 | 0 | None | 0 |
| v_sku_oil_traceability | 12 | 0 | None | 0 |
| v_sku_production_summary | 19 | 0 | None | 0 |
| v_sku_production_summary_enhanced | 26 | 0 | None | 0 |
| v_uom_transport_groups | 4 | 0 | None | 0 |
| v_writeoff_details | 22 | 0 | None | 0 |
| v_writeoff_impact_current | 8 | 0 | None | 0 |
| v_writeoff_trends | 11 | 0 | None | 0 |
| writeoff_impact_tracking | 17 | 3 | 48 kB | 0 |
| writeoff_monthly_summary | 16 | 1 | 56 kB | 0 |
| writeoff_reasons | 7 | 10 | 40 kB | 0 |
| year_end_closing | 18 | 0 | 40 kB | 1 |
| yield_ranges | 7 | 0 | 8192 bytes | 0 |

## Detailed Table Definitions

### available_oil_types

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| oil_type | character varying(50) | Yes |  |  |

---

### batch

**Statistics:**
- Rows: 6
- Total Size: 88 kB
- Table Size: 8192 bytes
- Indexes Size: 80 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| batch_id | integer(32,0) | No | nextval('batch_batch_id_seq... | Primary Key |
| batch_code | character varying(50) | No |  |  |
| recipe_id | integer(32,0) | Yes |  | FK → recipes.recipe_id |
| oil_type | character varying(50) | No |  |  |
| seed_quantity_before_drying | numeric(10,2) | Yes |  |  |
| seed_quantity_after_drying | numeric(10,2) | Yes |  |  |
| drying_loss | numeric(10,2) | Yes |  |  |
| oil_yield | numeric(10,2) | Yes |  |  |
| oil_yield_percent | numeric(5,2) | Yes |  |  |
| oil_cake_yield | numeric(10,2) | Yes |  |  |
| oil_cake_yield_percent | numeric(5,2) | Yes |  |  |
| production_date | integer(32,0) | Yes |  |  |
| sludge_yield | numeric(10,2) | Yes |  |  |
| sludge_yield_percent | numeric(5,2) | Yes |  |  |
| labor_hours | numeric(10,2) | Yes |  |  |
| labor_cost | numeric(10,2) | Yes |  |  |
| electricity_units | numeric(10,2) | Yes |  |  |
| electricity_cost | numeric(10,2) | Yes |  |  |
| total_overhead_cost | numeric(10,2) | Yes |  |  |
| total_production_cost | numeric(10,2) | Yes |  |  |
| net_oil_cost | numeric(10,2) | Yes |  |  |
| oil_cost_per_kg | numeric(10,2) | Yes |  |  |
| cake_estimated_rate | numeric(10,2) | Yes |  |  |
| cake_actual_rate | numeric(10,2) | Yes |  |  |
| sludge_estimated_rate | numeric(10,2) | Yes |  |  |
| sludge_actual_rate | numeric(10,2) | Yes |  |  |
| cake_sold_quantity | numeric(10,2) | Yes | 0 |  |
| sludge_sold_quantity | numeric(10,2) | Yes | 0 |  |
| traceable_code | character varying(50) | Yes |  |  |
| seed_purchase_code | character varying(50) | Yes |  |  |
| seed_material_id | integer(32,0) | Yes |  | FK → materials.material_id |

**Indexes:**
- `idx_batch_production_date` on (production_date)
- UNIQUE `batch_traceable_code_key` on (traceable_code)
- UNIQUE `batch_batch_code_key` on (batch_code)
- `idx_batch_oil_type` on (oil_type)
- UNIQUE `batch_pkey` on (batch_id)

**Check Constraints:**
- `2200_17322_4_not_null`: oil_type IS NOT NULL
- `check_traceable_format`: ((traceable_code)::text !~~ 'BATCH-%'::text)
- `2200_17322_1_not_null`: batch_id IS NOT NULL
- `2200_17322_2_not_null`: batch_code IS NOT NULL

**Triggers:**
- `check_batch_dates`: BEFORE UPDATE
- `check_batch_dates`: BEFORE INSERT

---

### batch_cost_details

**Statistics:**
- Rows: 0
- Total Size: 48 kB
- Table Size: 0 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| cost_detail_id | integer(32,0) | No | nextval('batch_cost_details... | Primary Key |
| batch_id | integer(32,0) | No |  | FK → batch.batch_id |
| cost_element | character varying(100) | No |  |  |
| master_rate | numeric(10,2) | Yes |  |  |
| override_rate | numeric(10,2) | Yes |  |  |
| quantity | numeric(10,2) | Yes |  |  |
| total_cost | numeric(10,2) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- `idx_batch_cost_details_batch_id` on (batch_id)
- UNIQUE `batch_cost_details_pkey` on (cost_detail_id)

**Check Constraints:**
- `2200_31971_2_not_null`: batch_id IS NOT NULL
- `2200_31971_1_not_null`: cost_detail_id IS NOT NULL
- `2200_31971_3_not_null`: cost_element IS NOT NULL

---

### batch_cost_details_backup

**Statistics:**
- Rows: 7
- Total Size: 8192 bytes
- Table Size: 8192 bytes
- Indexes Size: 0 bytes

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| cost_detail_id | integer(32,0) | Yes |  |  |
| batch_id | integer(32,0) | Yes |  |  |
| cost_element | character varying(100) | Yes |  |  |
| master_rate | numeric(10,2) | Yes |  |  |
| override_rate | numeric(10,2) | Yes |  |  |
| quantity | numeric(10,2) | Yes |  |  |
| total_cost | numeric(10,2) | Yes |  |  |
| created_at | timestamp without time zone | Yes |  |  |

---

### batch_cost_summary

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| batch_id | integer(32,0) | Yes |  |  |
| batch_code | character varying(50) | Yes |  |  |
| oil_type | character varying(50) | Yes |  |  |
| production_date | integer(32,0) | Yes |  |  |
| oil_yield | numeric(10,2) | Yes |  |  |
| original_cost | numeric(10,2) | Yes |  |  |
| extended_costs | numeric | Yes |  |  |
| total_cost_with_extended | numeric | Yes |  |  |
| net_oil_cost | numeric(10,2) | Yes |  |  |
| oil_cost_per_kg | numeric(10,2) | Yes |  |  |
| time_tracking_entries | bigint(64,0) | Yes |  |  |
| total_tracked_hours | numeric | Yes |  |  |

---

### batch_extended_costs

**Statistics:**
- Rows: 54
- Total Size: 112 kB
- Table Size: 24 kB
- Indexes Size: 48 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| cost_id | integer(32,0) | No | nextval('batch_extended_cos... | Primary Key |
| batch_id | integer(32,0) | Yes |  | FK → batch.batch_id |
| element_id | integer(32,0) | Yes |  | FK → cost_elements_master.element_id |
| element_name | character varying(100) | Yes |  |  |
| quantity_or_hours | numeric(10,2) | Yes |  |  |
| rate_used | numeric(10,2) | Yes |  |  |
| total_cost | numeric(10,2) | Yes |  |  |
| is_applied | boolean | Yes | true |  |
| override_reason | text | Yes |  |  |
| created_by | character varying(100) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- UNIQUE `batch_extended_costs_pkey` on (cost_id)
- `idx_batch_extended_costs_element` on (element_id)
- `idx_batch_extended_costs_batch` on (batch_id)

**Check Constraints:**
- `2200_22435_1_not_null`: cost_id IS NOT NULL

---

### batch_summary

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| batch_id | integer(32,0) | Yes |  |  |
| batch_code | character varying(50) | Yes |  |  |
| oil_type | character varying(50) | Yes |  |  |
| production_date | integer(32,0) | Yes |  |  |
| seed_quantity_after_drying | numeric(10,2) | Yes |  |  |
| oil_yield | numeric(10,2) | Yes |  |  |
| oil_yield_percent | numeric(5,2) | Yes |  |  |
| oil_cake_yield | numeric(10,2) | Yes |  |  |
| oil_cake_yield_percent | numeric(5,2) | Yes |  |  |
| sludge_yield | numeric(10,2) | Yes |  |  |
| total_production_cost | numeric(10,2) | Yes |  |  |
| net_oil_cost | numeric(10,2) | Yes |  |  |
| oil_cost_per_kg | numeric(10,2) | Yes |  |  |
| cake_estimated_rate | numeric(10,2) | Yes |  |  |
| sludge_estimated_rate | numeric(10,2) | Yes |  |  |
| cake_stock_remaining | numeric(10,2) | Yes |  |  |

---

### batch_time_tracking

**Statistics:**
- Rows: 6
- Total Size: 64 kB
- Table Size: 8192 bytes
- Indexes Size: 48 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tracking_id | integer(32,0) | No | nextval('batch_time_trackin... | Primary Key |
| batch_id | integer(32,0) | Yes |  | FK → batch.batch_id |
| process_type | character varying(50) | Yes |  |  |
| start_datetime | timestamp without time zone | No |  |  |
| end_datetime | timestamp without time zone | Yes |  |  |
| total_hours | numeric(5,2) | Yes |  |  |
| rounded_hours | integer(32,0) | Yes |  |  |
| operator_name | character varying(100) | Yes |  |  |
| notes | text | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- `idx_batch_time_tracking_date` on (start_datetime)
- UNIQUE `batch_time_tracking_pkey` on (tracking_id)
- `idx_batch_time_tracking_batch` on (batch_id)

**Check Constraints:**
- `2200_22420_1_not_null`: tracking_id IS NOT NULL
- `2200_22420_4_not_null`: start_datetime IS NOT NULL

---

### blend_batch_components

**Statistics:**
- Rows: 4
- Total Size: 56 kB
- Table Size: 8192 bytes
- Indexes Size: 48 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| component_id | integer(32,0) | No | nextval('blend_batch_compon... | Primary Key |
| blend_id | integer(32,0) | Yes |  | FK → blend_batches.blend_id |
| oil_type | character varying(50) | No |  |  |
| source_type | character varying(20) | No |  |  |
| source_batch_id | integer(32,0) | Yes |  |  |
| source_batch_code | character varying(100) | Yes |  |  |
| source_inventory_id | integer(32,0) | Yes |  |  |
| quantity_used | numeric(10,2) | No |  |  |
| percentage | numeric(5,2) | No |  |  |
| cost_per_unit | numeric(10,2) | No |  |  |
| traceable_code | character varying(100) | Yes |  |  |

**Indexes:**
- `idx_blend_components_blend` on (blend_id)
- UNIQUE `blend_batch_components_pkey` on (component_id)
- `idx_blend_components_source` on (source_batch_id)

**Check Constraints:**
- `2200_22167_8_not_null`: quantity_used IS NOT NULL
- `2200_22167_1_not_null`: component_id IS NOT NULL
- `2200_22167_3_not_null`: oil_type IS NOT NULL
- `2200_22167_4_not_null`: source_type IS NOT NULL
- `2200_22167_9_not_null`: percentage IS NOT NULL
- `2200_22167_10_not_null`: cost_per_unit IS NOT NULL

---

### blend_batches

**Statistics:**
- Rows: 2
- Total Size: 72 kB
- Table Size: 8192 bytes
- Indexes Size: 64 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| blend_id | integer(32,0) | No | nextval('blend_batches_blen... | Primary Key |
| blend_code | character varying(100) | No |  |  |
| blend_description | character varying(100) | Yes |  |  |
| blend_date | integer(32,0) | No |  |  |
| total_quantity | numeric(10,2) | No |  |  |
| weighted_avg_cost | numeric(10,2) | No |  |  |
| traceable_code | character varying(100) | Yes |  |  |
| created_by | character varying(100) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| result_oil_type | character varying(50) | Yes |  |  |

**Indexes:**
- UNIQUE `blend_batches_blend_code_key` on (blend_code)
- `idx_blend_batches_code` on (blend_code)
- UNIQUE `blend_batches_pkey` on (blend_id)
- `idx_blend_batches_date` on (blend_date)

**Check Constraints:**
- `2200_22157_2_not_null`: blend_code IS NOT NULL
- `2200_22157_4_not_null`: blend_date IS NOT NULL
- `2200_22157_6_not_null`: weighted_avg_cost IS NOT NULL
- `2200_22157_5_not_null`: total_quantity IS NOT NULL
- `2200_22157_1_not_null`: blend_id IS NOT NULL

---

### bom_category_mapping

**Statistics:**
- Rows: 8
- Total Size: 48 kB
- Table Size: 8192 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| mapping_id | integer(32,0) | No | nextval('bom_category_mappi... | Primary Key |
| bom_category | character varying(50) | No |  |  |
| material_categories | ARRAY | Yes |  |  |
| keywords | ARRAY | Yes |  |  |
| display_order | integer(32,0) | Yes | 0 |  |
| is_active | boolean | Yes | true |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- UNIQUE `bom_category_mapping_bom_category_key` on (bom_category)
- UNIQUE `bom_category_mapping_pkey` on (mapping_id)

**Check Constraints:**
- `2200_38203_1_not_null`: mapping_id IS NOT NULL
- `2200_38203_2_not_null`: bom_category IS NOT NULL

---

### categories_master

**Statistics:**
- Rows: 5
- Total Size: 40 kB
- Table Size: 8192 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| category_id | integer(32,0) | No | nextval('categories_master_... | Primary Key |
| category_name | character varying(50) | No |  |  |
| requires_subcategory | boolean | Yes | false |  |
| is_active | boolean | Yes | true |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- UNIQUE `categories_master_pkey` on (category_id)
- UNIQUE `categories_master_category_name_key` on (category_name)

**Check Constraints:**
- `2200_36877_1_not_null`: category_id IS NOT NULL
- `2200_36877_2_not_null`: category_name IS NOT NULL

---

### cost_element_rate_history

**Statistics:**
- Rows: 0
- Total Size: 16 kB
- Table Size: 0 bytes
- Indexes Size: 8192 bytes

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| history_id | integer(32,0) | No | nextval('cost_element_rate_... | Primary Key |
| element_id | integer(32,0) | Yes |  | FK → cost_elements_master.element_id |
| old_rate | numeric(10,2) | Yes |  |  |
| new_rate | numeric(10,2) | Yes |  |  |
| effective_from | date | Yes |  |  |
| effective_to | date | Yes |  |  |
| changed_by | character varying(100) | Yes |  |  |
| change_reason | text | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- UNIQUE `cost_element_rate_history_pkey` on (history_id)

**Check Constraints:**
- `2200_22471_1_not_null`: history_id IS NOT NULL

---

### cost_element_usage_stats

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| element_id | integer(32,0) | Yes |  |  |
| element_name | character varying(100) | Yes |  |  |
| category | character varying(50) | Yes |  |  |
| default_rate | numeric(10,2) | Yes |  |  |
| times_used | bigint(64,0) | Yes |  |  |
| avg_rate_used | numeric | Yes |  |  |
| total_cost_incurred | numeric | Yes |  |  |
| override_count | bigint(64,0) | Yes |  |  |

---

### cost_elements_backup

**Statistics:**
- Rows: 8
- Total Size: 8192 bytes
- Table Size: 8192 bytes
- Indexes Size: 0 bytes

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| element_id | integer(32,0) | Yes |  |  |
| element_name | character varying(255) | Yes |  |  |
| category | character varying(50) | Yes |  |  |
| unit_type | character varying(50) | Yes |  |  |
| default_rate | numeric(10,2) | Yes |  |  |
| gst_rate | numeric(5,2) | Yes |  |  |
| calculation_method | character varying(50) | Yes |  |  |

---

### cost_elements_master

**Statistics:**
- Rows: 18
- Total Size: 144 kB
- Table Size: 8192 bytes
- Indexes Size: 96 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| element_id | integer(32,0) | No | nextval('cost_elements_mast... | Primary Key |
| element_name | character varying(100) | No |  |  |
| category | character varying(50) | Yes |  |  |
| unit_type | character varying(50) | Yes |  |  |
| default_rate | numeric(10,2) | No |  |  |
| calculation_method | character varying(50) | Yes |  |  |
| is_optional | boolean | Yes | false |  |
| applicable_to | character varying(50) | Yes |  |  |
| display_order | integer(32,0) | Yes |  |  |
| is_active | boolean | Yes | true |  |
| notes | text | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| created_by | character varying(100) | Yes |  |  |
| activity | character varying(50) | Yes |  |  |
| module_specific | character varying(100) | Yes |  |  |
| package_size_id | integer(32,0) | Yes |  | FK → package_sizes_master.size_id |

**Indexes:**
- `idx_cost_elements_activity` on (activity)
- `idx_cost_elements_module_specific` on (module_specific)
- UNIQUE `cost_elements_master_element_name_key` on (element_name)
- `idx_cost_elements_category` on (category)
- `idx_cost_elements_active` on (is_active,applicable_to)
- UNIQUE `cost_elements_master_pkey` on (element_id)

**Check Constraints:**
- `2200_22405_2_not_null`: element_name IS NOT NULL
- `2200_22405_5_not_null`: default_rate IS NOT NULL
- `2200_22405_1_not_null`: element_id IS NOT NULL

**Triggers:**
- `update_cost_elements_updated_at`: BEFORE UPDATE

---

### cost_override_log

**Statistics:**
- Rows: 0
- Total Size: 32 kB
- Table Size: 0 bytes
- Indexes Size: 24 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| log_id | integer(32,0) | No | nextval('cost_override_log_... | Primary Key |
| module_name | character varying(50) | Yes |  |  |
| record_id | integer(32,0) | Yes |  |  |
| element_id | integer(32,0) | Yes |  | FK → cost_elements_master.element_id |
| element_name | character varying(100) | Yes |  |  |
| original_rate | numeric(10,2) | Yes |  |  |
| override_rate | numeric(10,2) | Yes |  |  |
| reason | text | Yes |  |  |
| overridden_by | character varying(100) | Yes |  |  |
| override_datetime | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- `idx_cost_override_date` on (override_datetime)
- `idx_cost_override_module` on (module_name,record_id)
- UNIQUE `cost_override_log_pkey` on (log_id)

**Check Constraints:**
- `2200_22456_1_not_null`: log_id IS NOT NULL

---

### customer_ship_to_locations

**Statistics:**
- Rows: 4
- Total Size: 80 kB
- Table Size: 8192 bytes
- Indexes Size: 64 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| ship_to_id | integer(32,0) | No | nextval('customer_ship_to_l... | Primary Key |
| customer_id | integer(32,0) | No |  | FK → customers.customer_id |
| location_code | character varying(20) | No |  |  |
| location_name | character varying(255) | No |  |  |
| address_line1 | character varying(255) | Yes |  |  |
| address_line2 | character varying(255) | Yes |  |  |
| city | character varying(100) | Yes |  |  |
| state | character varying(50) | Yes |  |  |
| pincode | character varying(10) | Yes |  |  |
| contact_person | character varying(100) | Yes |  |  |
| contact_phone | character varying(15) | Yes |  |  |
| gstin | character varying(15) | Yes |  |  |
| is_default | boolean | Yes | false |  |
| is_active | boolean | Yes | true |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| created_by | character varying(100) | Yes |  |  |

**Indexes:**
- `idx_ship_to_active` on (is_active)
- UNIQUE `customer_ship_to_locations_pkey` on (ship_to_id)
- UNIQUE `customer_ship_to_locations_location_code_key` on (location_code)
- `idx_ship_to_customer` on (customer_id)

**Check Constraints:**
- `2200_55243_1_not_null`: ship_to_id IS NOT NULL
- `2200_55243_3_not_null`: location_code IS NOT NULL
- `2200_55243_4_not_null`: location_name IS NOT NULL
- `2200_55243_2_not_null`: customer_id IS NOT NULL

---

### customers

**Statistics:**
- Rows: 4
- Total Size: 80 kB
- Table Size: 8192 bytes
- Indexes Size: 64 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| customer_id | integer(32,0) | No | nextval('customers_customer... | Primary Key |
| customer_code | character varying(10) | No |  |  |
| customer_name | character varying(255) | No |  |  |
| customer_type | character varying(50) | Yes |  |  |
| gst_number | character varying(15) | Yes |  |  |
| pan_number | character varying(10) | Yes |  |  |
| contact_person | character varying(100) | Yes |  |  |
| contact_phone | character varying(15) | Yes |  |  |
| contact_email | character varying(100) | Yes |  |  |
| is_active | boolean | Yes | true |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| created_by | character varying(100) | Yes |  |  |

**Indexes:**
- UNIQUE `customers_customer_code_key` on (customer_code)
- UNIQUE `customers_pkey` on (customer_id)
- `idx_customers_code` on (customer_code)
- `idx_customers_active` on (is_active)

**Check Constraints:**
- `2200_55025_3_not_null`: customer_name IS NOT NULL
- `2200_55025_1_not_null`: customer_id IS NOT NULL
- `2200_55025_2_not_null`: customer_code IS NOT NULL

---

### inventory

**Statistics:**
- Rows: 14
- Total Size: 72 kB
- Table Size: 8192 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| inventory_id | integer(32,0) | No | nextval('inventory_inventor... | Primary Key |
| material_id | integer(32,0) | Yes |  | FK → materials.material_id |
| product_id | integer(32,0) | Yes |  | FK → products.product_id |
| opening_stock | numeric(10,2) | Yes | 0 |  |
| purchases | numeric(10,2) | Yes | 0 |  |
| consumption | numeric(10,2) | Yes | 0 |  |
| closing_stock | numeric(10,2) | Yes | 0 |  |
| weighted_avg_cost | numeric(10,2) | Yes | 0 |  |
| last_updated | integer(32,0) | Yes |  |  |
| oil_type | character varying(50) | Yes |  |  |
| is_bulk_oil | boolean | Yes | false |  |
| source_type | character varying(50) | Yes |  |  |
| source_reference_id | integer(32,0) | Yes |  |  |

**Indexes:**
- `idx_inventory_oil_type` on (oil_type)
- UNIQUE `inventory_pkey` on (inventory_id)

**Check Constraints:**
- `2200_17336_1_not_null`: inventory_id IS NOT NULL

---

### inventory_by_tags

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tag_name | character varying(100) | Yes |  |  |
| tag_category | character varying(50) | Yes |  |  |
| material_count | bigint(64,0) | Yes |  |  |
| total_quantity | numeric | Yes |  |  |
| total_value | numeric | Yes |  |  |
| units | text | Yes |  |  |

---

### locations_master

**Statistics:**
- Rows: 14
- Total Size: 96 kB
- Table Size: 8192 bytes
- Indexes Size: 80 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| location_id | integer(32,0) | No | nextval('locations_master_l... | Primary Key |
| location_code | character varying(10) | No |  |  |
| location_name | character varying(255) | No |  |  |
| location_type | character varying(20) | No |  |  |
| ownership | character varying(20) | No |  |  |
| customer_id | integer(32,0) | Yes |  | FK → customers.customer_id |
| address_line1 | character varying(255) | Yes |  |  |
| address_line2 | character varying(255) | Yes |  |  |
| city | character varying(100) | Yes |  |  |
| state | character varying(50) | Yes |  |  |
| pincode | character varying(10) | Yes |  |  |
| is_production_unit | boolean | Yes | false |  |
| is_sales_point | boolean | Yes | false |  |
| is_default | boolean | Yes | false |  |
| is_active | boolean | Yes | true |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| created_by | character varying(100) | Yes |  |  |
| notes | text | Yes |  |  |
| contact_person | character varying(100) | Yes |  |  |
| contact_phone | character varying(20) | Yes |  |  |
| contact_email | character varying(100) | Yes |  |  |

**Indexes:**
- `idx_locations_customer` on (customer_id)
- `idx_locations_ownership` on (ownership)
- `idx_locations_type` on (location_type)
- UNIQUE `locations_master_location_code_key` on (location_code)
- UNIQUE `locations_master_pkey` on (location_id)

**Check Constraints:**
- `2200_55040_1_not_null`: location_id IS NOT NULL
- `check_third_party_customer`: ((((ownership)::text = 'third_party'::text) AND (customer_id IS NOT NULL)) OR ((ownership)::text = 'own'::text))
- `locations_master_location_type_check`: ((location_type)::text = ANY ((ARRAY['factory'::character varying, 'warehouse'::character varying, 'customer'::character varying])::text[]))
- `locations_master_ownership_check`: ((ownership)::text = ANY ((ARRAY['own'::character varying, 'third_party'::character varying])::text[]))
- `2200_55040_4_not_null`: location_type IS NOT NULL
- `2200_55040_3_not_null`: location_name IS NOT NULL
- `2200_55040_2_not_null`: location_code IS NOT NULL
- `2200_55040_5_not_null`: ownership IS NOT NULL

---

### masters_audit_log

**Statistics:**
- Rows: 18
- Total Size: 144 kB
- Table Size: 16 kB
- Indexes Size: 96 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| audit_id | integer(32,0) | No | nextval('masters_audit_log_... | Primary Key |
| table_name | character varying(50) | No |  |  |
| record_id | integer(32,0) | No |  |  |
| action | character varying(20) | No |  |  |
| old_values | jsonb | Yes |  |  |
| new_values | jsonb | Yes |  |  |
| changed_fields | ARRAY | Yes |  |  |
| changed_by | character varying(100) | Yes |  |  |
| changed_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| ip_address | character varying(45) | Yes |  |  |
| user_agent | text | Yes |  |  |
| reason | text | Yes |  |  |
| session_id | character varying(100) | Yes |  |  |

**Indexes:**
- `idx_audit_action` on (action)
- `idx_audit_session` on (session_id)
- `idx_audit_user` on (changed_by)
- UNIQUE `masters_audit_log_pkey` on (audit_id)
- `idx_audit_date` on (changed_atDESC)
- `idx_audit_table_record` on (table_name,record_id)

**Check Constraints:**
- `2200_29150_1_not_null`: audit_id IS NOT NULL
- `2200_29150_4_not_null`: action IS NOT NULL
- `2200_29150_3_not_null`: record_id IS NOT NULL
- `2200_29150_2_not_null`: table_name IS NOT NULL

---

### material_tags

**Statistics:**
- Rows: 12
- Total Size: 56 kB
- Table Size: 8192 bytes
- Indexes Size: 48 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| material_id | integer(32,0) | No |  | FK → materials.material_id |
| tag_id | integer(32,0) | No |  | FK → tags.tag_id |

**Indexes:**
- UNIQUE `material_tags_pkey` on (material_id,tag_id)
- `idx_material_tags_material_id` on (material_id)
- `idx_material_tags_tag_id` on (tag_id)

**Check Constraints:**
- `2200_20205_1_not_null`: material_id IS NOT NULL
- `2200_20205_2_not_null`: tag_id IS NOT NULL

---

### material_tags_view

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| material_id | integer(32,0) | Yes |  |  |
| material_name | character varying(255) | Yes |  |  |
| category | character varying(50) | Yes |  |  |
| unit | character varying(50) | Yes |  |  |
| current_cost | numeric(10,2) | Yes |  |  |
| supplier_name | character varying(255) | Yes |  |  |
| tags | text | Yes |  |  |
| tag_array | ARRAY | Yes |  |  |

---

### material_writeoffs

**Statistics:**
- Rows: 1
- Total Size: 128 kB
- Table Size: 8192 bytes
- Indexes Size: 112 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| writeoff_id | integer(32,0) | No | nextval('material_writeoffs... | Primary Key |
| material_id | integer(32,0) | Yes |  | FK → materials.material_id |
| writeoff_date | integer(32,0) | No |  |  |
| quantity | numeric(10,2) | No |  |  |
| weighted_avg_cost | numeric(10,2) | No |  |  |
| total_cost | numeric(10,2) | No |  |  |
| scrap_value | numeric(10,2) | Yes | 0 |  |
| net_loss | numeric(10,2) | No |  |  |
| reason_code | character varying(50) | Yes |  |  |
| reason_description | text | Yes |  |  |
| reference_type | character varying(50) | Yes |  |  |
| reference_id | integer(32,0) | Yes |  |  |
| notes | text | Yes |  |  |
| created_by | character varying(255) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- `idx_material_writeoffs_date` on (writeoff_dateDESC)
- `idx_material_writeoffs_material` on (material_id)
- `idx_material_writeoffs_reason` on (reason_code)
- `idx_writeoffs_reference` on (reference_type,reference_id)
- `idx_writeoffs_date` on (writeoff_date)
- `idx_writeoffs_material_id` on (material_id)
- UNIQUE `material_writeoffs_pkey` on (writeoff_id)

**Check Constraints:**
- `2200_18571_8_not_null`: net_loss IS NOT NULL
- `2200_18571_3_not_null`: writeoff_date IS NOT NULL
- `2200_18571_4_not_null`: quantity IS NOT NULL
- `2200_18571_5_not_null`: weighted_avg_cost IS NOT NULL
- `2200_18571_6_not_null`: total_cost IS NOT NULL
- `2200_18571_1_not_null`: writeoff_id IS NOT NULL

---

### materials

**Statistics:**
- Rows: 9
- Total Size: 112 kB
- Table Size: 8192 bytes
- Indexes Size: 64 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| material_id | integer(32,0) | No | nextval('materials_material... | Primary Key |
| material_name | character varying(255) | No |  |  |
| category | character varying(50) | Yes |  |  |
| unit | character varying(50) | No |  | FK → uom_master.uom_code |
| current_cost | numeric(10,2) | No |  |  |
| gst_rate | numeric(5,2) | Yes | 5.00 |  |
| density | numeric(5,2) | Yes | 0.91 |  |
| last_updated | integer(32,0) | No |  |  |
| notes | text | Yes |  |  |
| supplier_id | integer(32,0) | Yes |  | FK → suppliers.supplier_id |
| short_code | character varying(6) | Yes |  |  |
| material_type | character varying(20) | Yes |  |  |
| is_active | boolean | Yes | true |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| subcategory_id | integer(32,0) | Yes |  | FK → subcategories_master.subcategory_id |
| produces_oil_type | character varying(50) | Yes |  |  |

**Indexes:**
- UNIQUE `materials_short_code_key` on (short_code)
- `idx_materials_active` on (is_active)
- UNIQUE `materials_pkey` on (material_id)
- `idx_materials_supplier_id` on (supplier_id)

**Check Constraints:**
- `check_material_short_code`: ((short_code)::text ~ '^[A-Z]{1,3}-[A-Z]{1,2}$'::text)
- `2200_17269_8_not_null`: last_updated IS NOT NULL
- `2200_17269_5_not_null`: current_cost IS NOT NULL
- `2200_17269_2_not_null`: material_name IS NOT NULL
- `2200_17269_1_not_null`: material_id IS NOT NULL
- `2200_17269_4_not_null`: unit IS NOT NULL

**Triggers:**
- `update_materials_updated_at`: BEFORE UPDATE

---

### oil_cake_inventory

**Statistics:**
- Rows: 6
- Total Size: 40 kB
- Table Size: 8192 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| cake_inventory_id | integer(32,0) | No | nextval('oil_cake_inventory... | Primary Key |
| batch_id | integer(32,0) | Yes |  | FK → batch.batch_id |
| oil_type | character varying(50) | Yes |  |  |
| quantity_produced | numeric(10,2) | Yes |  |  |
| quantity_remaining | numeric(10,2) | Yes |  |  |
| estimated_rate | numeric(10,2) | Yes |  |  |
| production_date | integer(32,0) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- UNIQUE `oil_cake_inventory_pkey` on (cake_inventory_id)
- `idx_oil_cake_inventory_batch_id` on (batch_id)

**Check Constraints:**
- `2200_18735_1_not_null`: cake_inventory_id IS NOT NULL

---

### oil_cake_sale_allocations

**Statistics:**
- Rows: 0
- Total Size: 8192 bytes
- Table Size: 0 bytes
- Indexes Size: 8192 bytes

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| allocation_id | integer(32,0) | No | nextval('oil_cake_sale_allo... | Primary Key |
| sale_id | integer(32,0) | Yes |  | FK → oil_cake_sales.sale_id |
| batch_id | integer(32,0) | Yes |  | FK → batch.batch_id |
| quantity_allocated | numeric(10,2) | Yes |  |  |
| original_estimate_rate | numeric(10,2) | Yes |  |  |
| actual_sale_rate | numeric(10,2) | Yes |  |  |
| cost_adjustment_per_kg | numeric(10,2) | Yes |  |  |
| oil_cost_adjustment | numeric(10,2) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- UNIQUE `oil_cake_sale_allocations_pkey` on (allocation_id)

**Check Constraints:**
- `2200_18759_1_not_null`: allocation_id IS NOT NULL

---

### oil_cake_sales

**Statistics:**
- Rows: 0
- Total Size: 16 kB
- Table Size: 0 bytes
- Indexes Size: 8192 bytes

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| sale_id | integer(32,0) | No | nextval('oil_cake_sales_sal... | Primary Key |
| sale_date | integer(32,0) | No |  |  |
| invoice_number | character varying(100) | Yes |  |  |
| buyer_name | character varying(255) | Yes |  |  |
| oil_type | character varying(50) | Yes |  |  |
| grade | character varying(20) | Yes |  |  |
| quantity_sold | numeric(10,2) | Yes |  |  |
| sale_rate | numeric(10,2) | Yes |  |  |
| total_amount | numeric(10,2) | Yes |  |  |
| transport_cost | numeric(10,2) | Yes | 0 |  |
| net_rate | numeric(10,2) | Yes |  |  |
| notes | text | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| packing_cost | numeric(10,2) | Yes | 0 |  |

**Indexes:**
- UNIQUE `oil_cake_sales_pkey` on (sale_id)

**Check Constraints:**
- `2200_18748_1_not_null`: sale_id IS NOT NULL
- `2200_18748_2_not_null`: sale_date IS NOT NULL

---

### opening_balances

**Statistics:**
- Rows: 0
- Total Size: 56 kB
- Table Size: 0 bytes
- Indexes Size: 48 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| balance_id | integer(32,0) | No | nextval('opening_balances_b... | Primary Key |
| material_id | integer(32,0) | Yes |  | FK → materials.material_id |
| balance_date | integer(32,0) | No |  |  |
| quantity | numeric(10,2) | No | 0 |  |
| rate_per_unit | numeric(10,2) | No | 0 |  |
| total_value | numeric(12,2) | Yes |  |  |
| entry_type | character varying(20) | Yes | 'initial'::character varying |  |
| financial_year | character varying(7) | Yes |  |  |
| notes | text | Yes |  |  |
| entered_by | character varying(100) | Yes |  |  |
| entered_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| is_processed | boolean | Yes | false |  |
| processed_at | timestamp without time zone | Yes |  |  |

**Indexes:**
- `idx_opening_balances_processed` on (is_processed)
- `idx_opening_balances_fy` on (financial_year)
- UNIQUE `opening_balances_pkey` on (balance_id)
- UNIQUE `unique_material_balance_date` on (material_id,balance_date)
- `idx_opening_balances_material` on (material_id)
- `idx_opening_balances_date` on (balance_date)

**Check Constraints:**
- `2200_29128_3_not_null`: balance_date IS NOT NULL
- `2200_29128_5_not_null`: rate_per_unit IS NOT NULL
- `2200_29128_1_not_null`: balance_id IS NOT NULL
- `2200_29128_4_not_null`: quantity IS NOT NULL

---

### outbound_summary

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| outbound_id | integer(32,0) | Yes |  |  |
| outbound_code | character varying(50) | Yes |  |  |
| outbound_date | integer(32,0) | Yes |  |  |
| transaction_type | character varying(20) | Yes |  |  |
| from_location | character varying(255) | Yes |  |  |
| destination | character varying | Yes |  |  |
| sku_count | bigint(64,0) | Yes |  |  |
| total_units | bigint(64,0) | Yes |  |  |
| total_value | numeric | Yes |  |  |
| transport_cost | numeric(10,2) | Yes |  |  |
| status | character varying(20) | Yes |  |  |
| created_at | timestamp without time zone | Yes |  |  |

---

### package_sizes_master

**Statistics:**
- Rows: 3
- Total Size: 40 kB
- Table Size: 8192 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| size_id | integer(32,0) | No | nextval('package_sizes_mast... | Primary Key |
| size_code | character varying(20) | No |  |  |
| size_name | character varying(50) | No |  |  |
| size_in_ml | integer(32,0) | No |  |  |
| size_in_liters | numeric(5,3) | No |  |  |
| display_order | integer(32,0) | Yes | 0 |  |
| is_active | boolean | Yes | true |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| created_by | character varying(100) | Yes |  |  |

**Indexes:**
- UNIQUE `package_sizes_master_pkey` on (size_id)
- UNIQUE `package_sizes_master_size_code_key` on (size_code)

**Check Constraints:**
- `2200_44669_1_not_null`: size_id IS NOT NULL
- `2200_44669_5_not_null`: size_in_liters IS NOT NULL
- `2200_44669_4_not_null`: size_in_ml IS NOT NULL
- `2200_44669_3_not_null`: size_name IS NOT NULL
- `2200_44669_2_not_null`: size_code IS NOT NULL

**Triggers:**
- `update_package_sizes_updated_at`: BEFORE UPDATE

---

### production_units

**Statistics:**
- Rows: 1
- Total Size: 40 kB
- Table Size: 8192 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| unit_id | integer(32,0) | No | nextval('production_units_u... | Primary Key |
| unit_name | character varying(100) | No |  |  |
| short_code | character varying(3) | No |  |  |
| location | character varying(255) | Yes |  |  |
| is_own_unit | boolean | Yes | false |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- UNIQUE `production_units_pkey` on (unit_id)
- UNIQUE `production_units_short_code_key` on (short_code)

**Check Constraints:**
- `check_unit_short_code`: ((short_code)::text ~ '^[A-Z]{1,3}$'::text)
- `2200_22016_1_not_null`: unit_id IS NOT NULL
- `2200_22016_3_not_null`: short_code IS NOT NULL
- `2200_22016_2_not_null`: unit_name IS NOT NULL

---

### products

**Statistics:**
- Rows: 2
- Total Size: 24 kB
- Table Size: 8192 bytes
- Indexes Size: 16 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| product_id | integer(32,0) | No | nextval('products_product_i... | Primary Key |
| product_name | character varying(255) | No |  |  |
| oil_type | character varying(50) | Yes |  |  |
| package_size | character varying(50) | Yes |  |  |
| density | numeric(5,2) | Yes | 0.91 |  |
| weight | numeric(10,2) | Yes |  |  |

**Indexes:**
- UNIQUE `products_pkey` on (product_id)

**Check Constraints:**
- `2200_17289_1_not_null`: product_id IS NOT NULL
- `2200_17289_2_not_null`: product_name IS NOT NULL

---

### purchase_details_view

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| purchase_id | integer(32,0) | Yes |  |  |
| invoice_ref | character varying(50) | Yes |  |  |
| purchase_date | integer(32,0) | Yes |  |  |
| supplier_name | character varying(255) | Yes |  |  |
| transport_cost | numeric(10,2) | Yes |  |  |
| handling_charges | numeric(10,2) | Yes |  |  |
| subtotal | numeric(10,2) | Yes |  |  |
| total_gst_amount | numeric(10,2) | Yes |  |  |
| total_cost | numeric(10,2) | Yes |  |  |
| item_id | integer(32,0) | Yes |  |  |
| material_name | character varying(255) | Yes |  |  |
| unit | character varying(50) | Yes |  |  |
| quantity | numeric(10,2) | Yes |  |  |
| rate | numeric(10,2) | Yes |  |  |
| amount | numeric(10,2) | Yes |  |  |
| gst_rate | numeric(5,2) | Yes |  |  |
| gst_amount | numeric(10,2) | Yes |  |  |
| item_transport | numeric(10,2) | Yes |  |  |
| item_handling | numeric(10,2) | Yes |  |  |
| landed_cost_per_unit | numeric(10,2) | Yes |  |  |

---

### purchase_items

**Statistics:**
- Rows: 9
- Total Size: 56 kB
- Table Size: 8192 bytes
- Indexes Size: 48 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| item_id | integer(32,0) | No | nextval('purchase_items_ite... | Primary Key |
| purchase_id | integer(32,0) | Yes |  | FK → purchases.purchase_id |
| material_id | integer(32,0) | Yes |  | FK → materials.material_id |
| quantity | numeric(10,2) | No |  |  |
| rate | numeric(10,2) | No |  |  |
| amount | numeric(10,2) | No |  |  |
| gst_rate | numeric(5,2) | No |  |  |
| gst_amount | numeric(10,2) | No |  |  |
| transport_charges | numeric(10,2) | Yes | 0 |  |
| handling_charges | numeric(10,2) | Yes | 0 |  |
| total_amount | numeric(10,2) | No |  |  |
| landed_cost_per_unit | numeric(10,2) | No |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- `idx_purchase_items_material_id` on (material_id)
- UNIQUE `purchase_items_pkey` on (item_id)
- `idx_purchase_items_purchase_id` on (purchase_id)

**Check Constraints:**
- `2200_20221_4_not_null`: quantity IS NOT NULL
- `2200_20221_1_not_null`: item_id IS NOT NULL
- `2200_20221_5_not_null`: rate IS NOT NULL
- `2200_20221_7_not_null`: gst_rate IS NOT NULL
- `2200_20221_8_not_null`: gst_amount IS NOT NULL
- `2200_20221_11_not_null`: total_amount IS NOT NULL
- `2200_20221_12_not_null`: landed_cost_per_unit IS NOT NULL
- `2200_20221_6_not_null`: amount IS NOT NULL

---

### purchases

**Statistics:**
- Rows: 9
- Total Size: 96 kB
- Table Size: 8192 bytes
- Indexes Size: 80 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| purchase_id | integer(32,0) | No | nextval('purchases_purchase... | Primary Key |
| material_id | integer(32,0) | Yes |  | FK → materials.material_id |
| quantity | numeric(10,2) | Yes |  |  |
| cost_per_unit | numeric(10,2) | Yes |  |  |
| gst_rate | numeric(5,2) | Yes |  |  |
| invoice_ref | character varying(50) | Yes |  |  |
| purchase_date | integer(32,0) | Yes |  |  |
| supplier_name | character varying(255) | Yes |  |  |
| batch_number | character varying(100) | Yes |  |  |
| transport_cost | numeric(10,2) | Yes | 0 |  |
| loading_charges | numeric(10,2) | Yes | 0 |  |
| total_cost | numeric(10,2) | Yes |  |  |
| landed_cost_per_unit | numeric(10,2) | Yes |  |  |
| supplier_id | integer(32,0) | Yes |  | FK → suppliers.supplier_id |
| subtotal | numeric(10,2) | Yes |  |  |
| total_gst_amount | numeric(10,2) | Yes |  |  |
| edited_by | character varying(255) | Yes |  |  |
| edited_at | timestamp without time zone | Yes |  |  |
| status | character varying(20) | Yes | 'active'::character varying |  |
| traceable_code | character varying(50) | Yes |  |  |

**Indexes:**
- `idx_purchases_supplier_name` on (supplier_name)
- `idx_purchases_purchase_date` on (purchase_date)
- `idx_purchases_batch_number` on (batch_number)
- UNIQUE `purchases_traceable_code_key` on (traceable_code)
- UNIQUE `purchases_pkey` on (purchase_id)

**Check Constraints:**
- `2200_17310_1_not_null`: purchase_id IS NOT NULL

---

### purchases_backup

**Statistics:**
- Rows: 9
- Total Size: 8192 bytes
- Table Size: 8192 bytes
- Indexes Size: 0 bytes

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| purchase_id | integer(32,0) | Yes |  |  |
| material_id | integer(32,0) | Yes |  |  |
| quantity | numeric(10,2) | Yes |  |  |
| cost_per_unit | numeric(10,2) | Yes |  |  |
| gst_rate | numeric(5,2) | Yes |  |  |
| invoice_ref | character varying(50) | Yes |  |  |
| purchase_date | integer(32,0) | Yes |  |  |
| supplier_name | character varying(255) | Yes |  |  |
| batch_number | character varying(100) | Yes |  |  |
| transport_cost | numeric(10,2) | Yes |  |  |
| loading_charges | numeric(10,2) | Yes |  |  |
| total_cost | numeric(10,2) | Yes |  |  |
| landed_cost_per_unit | numeric(10,2) | Yes |  |  |

---

### recipes

**Statistics:**
- Rows: 0
- Total Size: 24 kB
- Table Size: 8192 bytes
- Indexes Size: 16 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| recipe_id | integer(32,0) | No | nextval('recipes_recipe_id_... | Primary Key |
| recipe_name | character varying(255) | No |  |  |
| type | character varying(50) | Yes |  |  |
| oil_type | character varying(50) | Yes |  |  |
| material_id | integer(32,0) | Yes |  | FK → materials.material_id |
| quantity | numeric(10,2) | Yes |  |  |
| expected_yield | numeric(5,4) | Yes |  |  |

**Indexes:**
- UNIQUE `recipes_pkey` on (recipe_id)

**Check Constraints:**
- `2200_17297_1_not_null`: recipe_id IS NOT NULL
- `2200_17297_2_not_null`: recipe_name IS NOT NULL
- `recipes_type_check`: ((type)::text = ANY ((ARRAY['Batch'::character varying, 'SKU'::character varying])::text[]))

---

### sales_by_ship_to_location

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| customer_name | character varying(255) | Yes |  |  |
| ship_to_location | character varying(255) | Yes |  |  |
| sku_code | character varying(50) | Yes |  |  |
| product_name | character varying(100) | Yes |  |  |
| total_quantity | bigint(64,0) | Yes |  |  |
| total_value | numeric | Yes |  |  |
| shipment_count | bigint(64,0) | Yes |  |  |

---

### seed_batch_tracking

**Statistics:**
- Rows: 4
- Total Size: 40 kB
- Table Size: 8192 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| seed_purchase_code | character varying(100) | No |  | Primary Key |
| material_id | integer(32,0) | Yes |  |  |
| last_batch_serial | integer(32,0) | Yes | 0 |  |
| last_updated | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- `idx_seed_batch_tracking_material` on (material_id)
- UNIQUE `seed_batch_tracking_pkey` on (seed_purchase_code)

**Check Constraints:**
- `2200_33151_1_not_null`: seed_purchase_code IS NOT NULL

---

### serial_number_tracking

**Statistics:**
- Rows: 7
- Total Size: 40 kB
- Table Size: 8192 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer(32,0) | No | nextval('serial_number_trac... | Primary Key |
| material_id | integer(32,0) | Yes |  | FK → materials.material_id |
| supplier_id | integer(32,0) | Yes |  | FK → suppliers.supplier_id |
| financial_year | character varying(7) | Yes |  |  |
| current_serial | integer(32,0) | Yes | 0 |  |
| last_updated | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- UNIQUE `serial_number_tracking_pkey` on (id)
- UNIQUE `serial_number_tracking_material_id_supplier_id_financial_ye_key` on (material_id,supplier_id,financial_year)

**Check Constraints:**
- `2200_22032_1_not_null`: id IS NOT NULL

---

### sku_batch_traceability

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| outbound_code | character varying(50) | Yes |  |  |
| outbound_date | integer(32,0) | Yes |  |  |
| transaction_type | character varying(20) | Yes |  |  |
| from_location | character varying(255) | Yes |  |  |
| destination | character varying | Yes |  |  |
| sku_code | character varying(50) | Yes |  |  |
| product_name | character varying(100) | Yes |  |  |
| sku_production_code | text | Yes |  |  |
| quantity | integer(32,0) | Yes |  |  |
| expiry_date | text | Yes |  |  |
| mrp | numeric | Yes |  |  |
| production_cost | numeric | Yes |  |  |

---

### sku_bom_details

**Statistics:**
- Rows: 2
- Total Size: 64 kB
- Table Size: 8192 bytes
- Indexes Size: 48 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| detail_id | integer(32,0) | No | nextval('sku_bom_details_de... | Primary Key |
| bom_id | integer(32,0) | No |  | FK → sku_bom_master.bom_id |
| material_id | integer(32,0) | No |  | FK → materials.material_id |
| material_category | character varying(50) | No |  |  |
| quantity_per_unit | numeric(10,4) | No | 1 |  |
| is_shared | boolean | Yes | false |  |
| applicable_sizes | ARRAY | Yes |  |  |
| notes | text | Yes |  |  |

**Indexes:**
- `idx_bom_details_material` on (material_id)
- `idx_bom_details_bom` on (bom_id)
- UNIQUE `sku_bom_details_pkey` on (detail_id)

**Check Constraints:**
- `2200_26417_3_not_null`: material_id IS NOT NULL
- `2200_26417_4_not_null`: material_category IS NOT NULL
- `2200_26417_2_not_null`: bom_id IS NOT NULL
- `2200_26417_1_not_null`: detail_id IS NOT NULL
- `sku_bom_details_quantity_per_unit_check`: (quantity_per_unit > (0)::numeric)
- `2200_26417_5_not_null`: quantity_per_unit IS NOT NULL

---

### sku_bom_master

**Statistics:**
- Rows: 1
- Total Size: 64 kB
- Table Size: 8192 bytes
- Indexes Size: 48 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| bom_id | integer(32,0) | No | nextval('sku_bom_master_bom... | Primary Key |
| sku_id | integer(32,0) | No |  | FK → sku_master.sku_id |
| version_number | integer(32,0) | No |  |  |
| effective_from | integer(32,0) | No |  |  |
| effective_to | integer(32,0) | Yes |  |  |
| is_current | boolean | Yes | true |  |
| notes | text | Yes |  |  |
| created_by | character varying(100) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- UNIQUE `sku_bom_master_pkey` on (bom_id)
- UNIQUE `sku_bom_master_sku_id_version_number_key` on (sku_id,version_number)
- `idx_bom_current` on (is_current=true)

**Check Constraints:**
- `2200_26398_2_not_null`: sku_id IS NOT NULL
- `sku_bom_master_version_number_check`: (version_number > 0)
- `2200_26398_4_not_null`: effective_from IS NOT NULL
- `2200_26398_3_not_null`: version_number IS NOT NULL
- `2200_26398_1_not_null`: bom_id IS NOT NULL

---

### sku_cost_overrides

**Statistics:**
- Rows: 0
- Total Size: 24 kB
- Table Size: 0 bytes
- Indexes Size: 16 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| override_id | integer(32,0) | No | nextval('sku_cost_overrides... | Primary Key |
| production_id | integer(32,0) | No |  | FK → sku_production.production_id |
| element_id | integer(32,0) | Yes |  | FK → cost_elements_master.element_id |
| element_name | character varying(100) | No |  |  |
| original_rate | numeric(10,2) | No |  |  |
| override_rate | numeric(10,2) | No |  |  |
| quantity | numeric(10,2) | No |  |  |
| reason | text | No |  |  |
| approved_by | character varying(100) | Yes |  |  |
| created_by | character varying(100) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- `idx_cost_override_production` on (production_id)
- UNIQUE `sku_cost_overrides_pkey` on (override_id)

**Check Constraints:**
- `2200_26513_8_not_null`: reason IS NOT NULL
- `2200_26513_7_not_null`: quantity IS NOT NULL
- `2200_26513_6_not_null`: override_rate IS NOT NULL
- `2200_26513_5_not_null`: original_rate IS NOT NULL
- `2200_26513_4_not_null`: element_name IS NOT NULL
- `2200_26513_2_not_null`: production_id IS NOT NULL
- `2200_26513_1_not_null`: override_id IS NOT NULL

---

### sku_expiry_tracking

**Statistics:**
- Rows: 3
- Total Size: 104 kB
- Table Size: 8192 bytes
- Indexes Size: 96 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tracking_id | integer(32,0) | No | nextval('sku_expiry_trackin... | Primary Key |
| production_id | integer(32,0) | No |  | FK → sku_production.production_id |
| sku_id | integer(32,0) | No |  | FK → sku_master.sku_id |
| production_date | integer(32,0) | No |  |  |
| expiry_date | integer(32,0) | No |  |  |
| quantity_produced | numeric(10,2) | No |  |  |
| quantity_remaining | numeric(10,2) | No |  |  |
| status | character varying(50) | Yes | 'active'::character varying |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| location_id | integer(32,0) | Yes |  | FK → locations_master.location_id |

**Indexes:**
- UNIQUE `sku_expiry_tracking_pkey` on (tracking_id)
- `idx_expiry_tracking_location` on (location_id)
- `idx_expiry_tracking_production` on (production_id)
- `idx_expiry_tracking_expiry` on (expiry_date)
- `idx_expiry_tracking_status` on (status)
- `idx_expiry_tracking_sku` on (sku_id)

**Check Constraints:**
- `2200_27849_2_not_null`: production_id IS NOT NULL
- `chk_expiry_valid`: (expiry_date > production_date)
- `2200_27849_4_not_null`: production_date IS NOT NULL
- `chk_quantity_valid`: ((quantity_remaining >= (0)::numeric) AND (quantity_remaining <= quantity_produced))
- `chk_status_valid`: ((status)::text = ANY ((ARRAY['active'::character varying, 'near_expiry'::character varying, 'expired'::character varying, 'consumed'::character varying])::text[]))
- `2200_27849_6_not_null`: quantity_produced IS NOT NULL
- `2200_27849_7_not_null`: quantity_remaining IS NOT NULL
- `2200_27849_5_not_null`: expiry_date IS NOT NULL
- `2200_27849_1_not_null`: tracking_id IS NOT NULL
- `2200_27849_3_not_null`: sku_id IS NOT NULL

---

### sku_inventory

**Statistics:**
- Rows: 2
- Total Size: 120 kB
- Table Size: 8192 bytes
- Indexes Size: 112 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| inventory_id | integer(32,0) | No | nextval('sku_inventory_inve... | Primary Key |
| sku_id | integer(32,0) | Yes |  | FK → sku_master.sku_id |
| production_id | integer(32,0) | Yes |  | FK → sku_production.production_id |
| quantity_available | numeric(10,2) | No | 0 |  |
| expiry_date | integer(32,0) | Yes |  |  |
| mrp | numeric(10,2) | Yes |  |  |
| location | character varying(100) | Yes |  |  |
| batch_code | character varying(50) | Yes |  |  |
| status | character varying(20) | Yes | 'active'::character varying |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| location_id | integer(32,0) | Yes |  | FK → locations_master.location_id |
| quantity_allocated | numeric(10,2) | Yes | 0 |  |
| last_updated | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- `idx_sku_inventory_sku` on (sku_id)
- `idx_sku_inventory_production` on (production_id)
- `idx_sku_inventory_expiry` on (expiry_date)
- `idx_sku_inventory_location` on (location_id)
- UNIQUE `unique_sku_location` on (sku_id,location_id)
- `idx_sku_inventory_status` on (status)
- UNIQUE `sku_inventory_pkey` on (inventory_id)

**Check Constraints:**
- `2200_27803_4_not_null`: quantity_available IS NOT NULL
- `2200_27803_1_not_null`: inventory_id IS NOT NULL

---

### sku_master

**Statistics:**
- Rows: 3
- Total Size: 88 kB
- Table Size: 8192 bytes
- Indexes Size: 80 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| sku_id | integer(32,0) | No | nextval('sku_master_sku_id_... | Primary Key |
| sku_code | character varying(50) | No |  |  |
| product_name | character varying(100) | No |  |  |
| oil_type | character varying(50) | No |  |  |
| package_size | character varying(20) | No |  |  |
| bottle_type | character varying(50) | Yes | 'PET'::character varying |  |
| density | numeric(5,3) | No | 0.91 |  |
| is_active | boolean | Yes | true |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| created_by | character varying(100) | Yes |  |  |
| mrp_current | numeric(10,2) | Yes |  |  |
| shelf_life_months | integer(32,0) | Yes |  |  |
| mrp_effective_date | integer(32,0) | Yes |  |  |
| updated_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| packaged_weight_kg | numeric(10,4) | Yes |  |  |

**Indexes:**
- `idx_sku_oil_type` on (oil_type)
- UNIQUE `sku_master_pkey` on (sku_id)
- `idx_sku_active` on (is_active)
- `idx_sku_package_size` on (package_size)
- UNIQUE `sku_master_sku_code_key` on (sku_code)

**Check Constraints:**
- `sku_master_density_check`: ((density >= 0.8) AND (density <= 1.0))
- `2200_26383_1_not_null`: sku_id IS NOT NULL
- `2200_26383_2_not_null`: sku_code IS NOT NULL
- `2200_26383_3_not_null`: product_name IS NOT NULL
- `2200_26383_4_not_null`: oil_type IS NOT NULL
- `2200_26383_5_not_null`: package_size IS NOT NULL
- `2200_26383_7_not_null`: density IS NOT NULL
- `chk_mrp_positive`: ((mrp_current IS NULL) OR (mrp_current > (0)::numeric))
- `chk_shelf_life_valid`: ((shelf_life_months IS NULL) OR ((shelf_life_months >= 1) AND (shelf_life_months <= 60)))
- `sku_master_package_size_check`: ((package_size)::text = ANY ((ARRAY['500ml'::character varying, '1L'::character varying, '5L'::character varying])::text[]))

**Triggers:**
- `trg_mrp_history_update`: BEFORE UPDATE

---

### sku_material_consumption

**Statistics:**
- Rows: 8
- Total Size: 48 kB
- Table Size: 8192 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| consumption_id | integer(32,0) | No | nextval('sku_material_consu... | Primary Key |
| production_id | integer(32,0) | No |  | FK → sku_production.production_id |
| material_id | integer(32,0) | No |  | FK → materials.material_id |
| planned_quantity | numeric(10,4) | No |  |  |
| actual_quantity | numeric(10,4) | No |  |  |
| variance_quantity | numeric(10,4) | Yes |  |  |
| material_cost_per_unit | numeric(10,2) | No |  |  |
| total_cost | numeric(10,2) | No |  |  |
| notes | text | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- `idx_material_consumption_production` on (production_id)
- UNIQUE `sku_material_consumption_pkey` on (consumption_id)

**Check Constraints:**
- `2200_26487_8_not_null`: total_cost IS NOT NULL
- `sku_material_consumption_actual_quantity_check`: (actual_quantity >= (0)::numeric)
- `sku_material_consumption_planned_quantity_check`: (planned_quantity >= (0)::numeric)
- `sku_material_consumption_total_cost_check`: (total_cost >= (0)::numeric)
- `2200_26487_4_not_null`: planned_quantity IS NOT NULL
- `2200_26487_5_not_null`: actual_quantity IS NOT NULL
- `2200_26487_7_not_null`: material_cost_per_unit IS NOT NULL
- `2200_26487_1_not_null`: consumption_id IS NOT NULL
- `2200_26487_2_not_null`: production_id IS NOT NULL
- `2200_26487_3_not_null`: material_id IS NOT NULL
- `sku_material_consumption_material_cost_per_unit_check`: (material_cost_per_unit >= (0)::numeric)

**Triggers:**
- `calculate_variance_trigger`: BEFORE INSERT
- `calculate_variance_trigger`: BEFORE UPDATE

---

### sku_mrp_history

**Statistics:**
- Rows: 2
- Total Size: 80 kB
- Table Size: 8192 bytes
- Indexes Size: 64 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| mrp_id | integer(32,0) | No | nextval('sku_mrp_history_mr... | Primary Key |
| sku_id | integer(32,0) | No |  | FK → sku_master.sku_id |
| mrp_amount | numeric(10,2) | No |  |  |
| effective_from | integer(32,0) | No |  |  |
| effective_to | integer(32,0) | Yes |  |  |
| changed_by | character varying(100) | Yes |  |  |
| change_reason | text | Yes |  |  |
| is_current | boolean | Yes | false |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- UNIQUE `sku_mrp_history_pkey` on (mrp_id)
- `idx_mrp_history_dates` on (effective_from,effective_to)
- `idx_mrp_history_current` on (is_current=true)
- `idx_mrp_history_sku` on (sku_id)

**Check Constraints:**
- `chk_date_validity`: ((effective_to IS NULL) OR (effective_to > effective_from))
- `chk_mrp_history_positive`: (mrp_amount > (0)::numeric)
- `2200_27828_4_not_null`: effective_from IS NOT NULL
- `2200_27828_3_not_null`: mrp_amount IS NOT NULL
- `2200_27828_2_not_null`: sku_id IS NOT NULL
- `2200_27828_1_not_null`: mrp_id IS NOT NULL

---

### sku_oil_allocation

**Statistics:**
- Rows: 4
- Total Size: 40 kB
- Table Size: 8192 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| allocation_id | integer(32,0) | No | nextval('sku_oil_allocation... | Primary Key |
| production_id | integer(32,0) | No |  | FK → sku_production.production_id |
| source_type | character varying(20) | No |  |  |
| source_id | integer(32,0) | No |  |  |
| source_traceable_code | character varying(50) | No |  |  |
| quantity_allocated | numeric(10,2) | No |  |  |
| oil_cost_per_kg | numeric(10,2) | No |  |  |
| allocation_cost | numeric(10,2) | No |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- `idx_oil_allocation_production` on (production_id)
- UNIQUE `sku_oil_allocation_pkey` on (allocation_id)

**Check Constraints:**
- `2200_26470_6_not_null`: quantity_allocated IS NOT NULL
- `2200_26470_8_not_null`: allocation_cost IS NOT NULL
- `2200_26470_7_not_null`: oil_cost_per_kg IS NOT NULL
- `2200_26470_5_not_null`: source_traceable_code IS NOT NULL
- `2200_26470_4_not_null`: source_id IS NOT NULL
- `2200_26470_3_not_null`: source_type IS NOT NULL
- `2200_26470_2_not_null`: production_id IS NOT NULL
- `2200_26470_1_not_null`: allocation_id IS NOT NULL
- `sku_oil_allocation_source_type_check`: ((source_type)::text = ANY ((ARRAY['batch'::character varying, 'blend'::character varying])::text[]))
- `sku_oil_allocation_quantity_allocated_check`: (quantity_allocated > (0)::numeric)
- `sku_oil_allocation_oil_cost_per_kg_check`: (oil_cost_per_kg >= (0)::numeric)
- `sku_oil_allocation_allocation_cost_check`: (allocation_cost >= (0)::numeric)

---

### sku_outbound

**Statistics:**
- Rows: 2
- Total Size: 160 kB
- Table Size: 8192 bytes
- Indexes Size: 144 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| outbound_id | integer(32,0) | No | nextval('sku_outbound_outbo... | Primary Key |
| outbound_code | character varying(50) | No |  |  |
| transaction_type | character varying(20) | No |  |  |
| from_location_id | integer(32,0) | No |  | FK → locations_master.location_id |
| to_location_id | integer(32,0) | Yes |  | FK → locations_master.location_id |
| customer_id | integer(32,0) | Yes |  | FK → customers.customer_id |
| customer_po_number | character varying(50) | Yes |  |  |
| invoice_number | character varying(50) | Yes |  |  |
| eway_bill_number | character varying(20) | Yes |  |  |
| outbound_date | integer(32,0) | No |  |  |
| dispatch_date | integer(32,0) | Yes |  |  |
| transport_mode | character varying(20) | Yes |  |  |
| transport_vendor | character varying(255) | Yes |  |  |
| vehicle_number | character varying(20) | Yes |  |  |
| lr_number | character varying(50) | Yes |  |  |
| transport_cost | numeric(10,2) | Yes | 0 |  |
| status | character varying(20) | Yes | 'draft'::character varying |  |
| notes | text | Yes |  |  |
| created_by | character varying(100) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| ship_to_location_id | integer(32,0) | Yes |  | FK → customer_ship_to_locations.ship_to_id |
| handling_cost | numeric(10,2) | Yes | 0 |  |
| total_shipment_weight_kg | numeric(10,2) | Yes |  |  |
| stn_number | character varying(50) | Yes |  |  |
| stn_date | integer(32,0) | Yes |  |  |
| shipment_id | character varying(50) | Yes |  |  |
| subtotal | numeric(12,2) | Yes |  |  |
| total_gst_amount | numeric(10,2) | Yes |  |  |
| grand_total | numeric(12,2) | Yes |  |  |

**Indexes:**
- `idx_outbound_ship_to` on (ship_to_location_id)
- `idx_outbound_customer` on (customer_id)
- `idx_outbound_type` on (transaction_type)
- `idx_outbound_status` on (status)
- `idx_outbound_date` on (outbound_date)
- `idx_outbound_to_location` on (to_location_id)
- `idx_outbound_from_location` on (from_location_id)
- UNIQUE `sku_outbound_outbound_code_key` on (outbound_code)
- UNIQUE `sku_outbound_pkey` on (outbound_id)

**Check Constraints:**
- `2200_55089_4_not_null`: from_location_id IS NOT NULL
- `sku_outbound_transaction_type_check`: ((transaction_type)::text = ANY ((ARRAY['transfer'::character varying, 'sales'::character varying])::text[]))
- `sku_outbound_status_check`: ((status)::text = ANY ((ARRAY['draft'::character varying, 'confirmed'::character varying, 'dispatched'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[]))
- `2200_55089_1_not_null`: outbound_id IS NOT NULL
- `2200_55089_10_not_null`: outbound_date IS NOT NULL
- `2200_55089_2_not_null`: outbound_code IS NOT NULL
- `2200_55089_3_not_null`: transaction_type IS NOT NULL

---

### sku_outbound_items

**Statistics:**
- Rows: 2
- Total Size: 88 kB
- Table Size: 8192 bytes
- Indexes Size: 72 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| item_id | integer(32,0) | No | nextval('sku_outbound_items... | Primary Key |
| outbound_id | integer(32,0) | Yes |  | FK → sku_outbound.outbound_id |
| sku_id | integer(32,0) | No |  | FK → sku_master.sku_id |
| quantity_ordered | integer(32,0) | No |  |  |
| quantity_shipped | integer(32,0) | Yes |  |  |
| allocation_data | jsonb | No |  |  |
| unit_price | numeric(10,2) | Yes |  |  |
| line_total | numeric(12,2) | Yes |  |  |
| notes | text | Yes |  |  |
| item_weight_kg | numeric(10,3) | Yes |  |  |
| transport_cost_per_unit | numeric(10,2) | Yes |  |  |
| transport_cost_per_kg | numeric(10,4) | Yes |  |  |
| handling_cost_per_unit | numeric(10,2) | Yes |  |  |
| handling_cost_per_kg | numeric(10,4) | Yes |  |  |
| gst_rate | numeric(5,2) | Yes |  |  |
| base_price | numeric(10,2) | Yes |  |  |
| gst_amount | numeric(10,2) | Yes |  |  |

**Indexes:**
- UNIQUE `sku_outbound_items_pkey` on (item_id)
- `idx_outbound_items_outbound` on (outbound_id)
- `idx_outbound_items_allocation` on (allocation_data)
- `idx_outbound_items_sku` on (sku_id)

**Check Constraints:**
- `2200_55127_6_not_null`: allocation_data IS NOT NULL
- `2200_55127_1_not_null`: item_id IS NOT NULL
- `2200_55127_3_not_null`: sku_id IS NOT NULL
- `2200_55127_4_not_null`: quantity_ordered IS NOT NULL

---

### sku_production

**Statistics:**
- Rows: 4
- Total Size: 96 kB
- Table Size: 8192 bytes
- Indexes Size: 80 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| production_id | integer(32,0) | No | nextval('sku_production_pro... | Primary Key |
| production_code | character varying(50) | No |  |  |
| traceable_code | character varying(10) | No |  |  |
| sku_id | integer(32,0) | No |  | FK → sku_master.sku_id |
| bom_id | integer(32,0) | No |  | FK → sku_bom_master.bom_id |
| production_date | integer(32,0) | No |  |  |
| packing_date | integer(32,0) | No |  |  |
| total_oil_quantity | numeric(10,2) | No |  |  |
| weighted_oil_cost | numeric(10,2) | No |  |  |
| bottles_planned | integer(32,0) | No |  |  |
| bottles_produced | integer(32,0) | No |  |  |
| bottles_rejected | integer(32,0) | Yes | 0 |  |
| oil_cost_total | numeric(10,2) | Yes |  |  |
| material_cost_total | numeric(10,2) | Yes |  |  |
| labor_cost_total | numeric(10,2) | Yes |  |  |
| overhead_cost_total | numeric(10,2) | Yes | 0 |  |
| total_production_cost | numeric(10,2) | No |  |  |
| cost_per_bottle | numeric(10,2) | No |  |  |
| production_status | character varying(20) | Yes | 'completed'::character varying |  |
| operator_name | character varying(100) | Yes |  |  |
| shift_number | integer(32,0) | Yes |  |  |
| production_line | character varying(20) | Yes |  |  |
| quality_check_by | character varying(100) | Yes |  |  |
| notes | text | Yes |  |  |
| created_by | character varying(100) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| expiry_date | integer(32,0) | Yes |  |  |
| mrp_at_production | numeric(10,2) | Yes |  |  |

**Indexes:**
- UNIQUE `sku_production_production_code_key` on (production_code)
- UNIQUE `sku_production_pkey` on (production_id)
- UNIQUE `sku_production_traceable_code_key` on (traceable_code)
- `idx_sku_production_date` on (production_dateDESC)
- `idx_sku_production_sku` on (sku_id)

**Check Constraints:**
- `2200_26439_17_not_null`: total_production_cost IS NOT NULL
- `2200_26439_9_not_null`: weighted_oil_cost IS NOT NULL
- `2200_26439_8_not_null`: total_oil_quantity IS NOT NULL
- `2200_26439_7_not_null`: packing_date IS NOT NULL
- `2200_26439_6_not_null`: production_date IS NOT NULL
- `2200_26439_5_not_null`: bom_id IS NOT NULL
- `2200_26439_4_not_null`: sku_id IS NOT NULL
- `2200_26439_3_not_null`: traceable_code IS NOT NULL
- `2200_26439_2_not_null`: production_code IS NOT NULL
- `2200_26439_1_not_null`: production_id IS NOT NULL
- `2200_26439_18_not_null`: cost_per_bottle IS NOT NULL
- `sku_production_weighted_oil_cost_check`: (weighted_oil_cost >= (0)::numeric)
- `sku_production_total_oil_quantity_check`: (total_oil_quantity > (0)::numeric)
- `sku_production_bottles_produced_check`: (bottles_produced > 0)
- `sku_production_bottles_planned_check`: (bottles_planned > 0)
- `2200_26439_11_not_null`: bottles_produced IS NOT NULL
- `2200_26439_10_not_null`: bottles_planned IS NOT NULL

---

### stock_by_location

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| location_id | integer(32,0) | Yes |  |  |
| location_name | character varying(255) | Yes |  |  |
| location_type | character varying(20) | Yes |  |  |
| ownership | character varying(20) | Yes |  |  |
| sku_id | integer(32,0) | Yes |  |  |
| sku_code | character varying(50) | Yes |  |  |
| product_name | character varying(100) | Yes |  |  |
| package_size | character varying(20) | Yes |  |  |
| quantity_available | numeric(10,2) | Yes |  |  |
| quantity_allocated | numeric(10,2) | Yes |  |  |
| last_updated | timestamp without time zone | Yes |  |  |

---

### subcategories_master

**Statistics:**
- Rows: 18
- Total Size: 56 kB
- Table Size: 8192 bytes
- Indexes Size: 48 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| subcategory_id | integer(32,0) | No | nextval('subcategories_mast... | Primary Key |
| category_id | integer(32,0) | Yes |  | FK → categories_master.category_id |
| subcategory_name | character varying(100) | No |  |  |
| subcategory_code | character varying(20) | No |  |  |
| oil_type | character varying(50) | Yes |  |  |
| is_active | boolean | Yes | true |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| gst_rate | numeric(5,2) | Yes |  |  |

**Indexes:**
- UNIQUE `subcategories_master_subcategory_code_key` on (subcategory_code)
- UNIQUE `subcategories_master_pkey` on (subcategory_id)
- UNIQUE `subcategories_master_category_id_subcategory_name_key` on (category_id,subcategory_name)

**Check Constraints:**
- `2200_36909_1_not_null`: subcategory_id IS NOT NULL
- `2200_36909_4_not_null`: subcategory_code IS NOT NULL
- `2200_36909_3_not_null`: subcategory_name IS NOT NULL

---

### suppliers

**Statistics:**
- Rows: 4
- Total Size: 80 kB
- Table Size: 8192 bytes
- Indexes Size: 64 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| supplier_id | integer(32,0) | No | nextval('suppliers_supplier... | Primary Key |
| supplier_name | character varying(255) | No |  |  |
| contact_person | character varying(255) | Yes |  |  |
| phone | character varying(50) | Yes |  |  |
| email | character varying(255) | Yes |  |  |
| address | text | Yes |  |  |
| gst_number | character varying(50) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| short_code | character varying(3) | Yes |  |  |
| is_active | boolean | Yes | true |  |

**Indexes:**
- UNIQUE `suppliers_supplier_name_key` on (supplier_name)
- `idx_suppliers_active` on (is_active)
- UNIQUE `suppliers_pkey` on (supplier_id)
- UNIQUE `suppliers_short_code_key` on (short_code)

**Check Constraints:**
- `2200_18488_2_not_null`: supplier_name IS NOT NULL
- `2200_18488_1_not_null`: supplier_id IS NOT NULL
- `check_supplier_short_code`: ((short_code)::text ~ '^[A-Z]{3}$'::text)

**Triggers:**
- `update_suppliers_updated_at`: BEFORE UPDATE

---

### system_configuration

**Statistics:**
- Rows: 7
- Total Size: 48 kB
- Table Size: 8192 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| config_id | integer(32,0) | No | nextval('system_configurati... | Primary Key |
| config_key | character varying(50) | No |  |  |
| config_value | text | Yes |  |  |
| config_type | character varying(20) | Yes |  |  |
| description | text | Yes |  |  |
| updated_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| updated_by | character varying(100) | Yes |  |  |

**Indexes:**
- UNIQUE `system_configuration_pkey` on (config_id)
- UNIQUE `system_configuration_config_key_key` on (config_key)

**Check Constraints:**
- `2200_29116_1_not_null`: config_id IS NOT NULL
- `2200_29116_2_not_null`: config_key IS NOT NULL

---

### tags

**Statistics:**
- Rows: 12
- Total Size: 56 kB
- Table Size: 8192 bytes
- Indexes Size: 48 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tag_id | integer(32,0) | No | nextval('tags_tag_id_seq'::... | Primary Key |
| tag_name | character varying(100) | No |  |  |
| tag_category | character varying(50) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| is_active | boolean | Yes | true |  |

**Indexes:**
- UNIQUE `tags_pkey` on (tag_id)
- UNIQUE `tags_tag_name_key` on (tag_name)
- `idx_tags_active` on (is_active)

**Check Constraints:**
- `2200_20196_2_not_null`: tag_name IS NOT NULL
- `2200_20196_1_not_null`: tag_id IS NOT NULL

**Triggers:**
- `update_tags_updated_at`: BEFORE UPDATE

---

### uom_master

**Statistics:**
- Rows: 3
- Total Size: 72 kB
- Table Size: 8192 bytes
- Indexes Size: 64 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| uom_id | integer(32,0) | No | nextval('uom_master_uom_id_... | Primary Key |
| uom_code | character varying(10) | No |  |  |
| uom_name | character varying(50) | No |  |  |
| uom_symbol | character varying(10) | No |  |  |
| uom_category | character varying(20) | No |  |  |
| display_order | integer(32,0) | Yes | 999 |  |
| is_active | boolean | Yes | true |  |
| is_system | boolean | Yes | false |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- UNIQUE `uom_master_uom_code_key` on (uom_code)
- UNIQUE `uom_master_pkey` on (uom_id)
- `idx_uom_code` on (uom_code)
- `idx_uom_active` on (is_active)

**Check Constraints:**
- `2200_44541_1_not_null`: uom_id IS NOT NULL
- `uom_category_check`: ((uom_category)::text = ANY ((ARRAY['Weight'::character varying, 'Count'::character varying, 'Volume'::character varying, 'Other'::character varying])::text[]))
- `2200_44541_2_not_null`: uom_code IS NOT NULL
- `2200_44541_3_not_null`: uom_name IS NOT NULL
- `2200_44541_4_not_null`: uom_symbol IS NOT NULL
- `2200_44541_5_not_null`: uom_category IS NOT NULL

---

### v_active_materials

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| material_id | integer(32,0) | Yes |  |  |
| material_name | character varying(255) | Yes |  |  |
| category | character varying(50) | Yes |  |  |
| unit | character varying(50) | Yes |  |  |
| current_cost | numeric(10,2) | Yes |  |  |
| gst_rate | numeric(5,2) | Yes |  |  |
| density | numeric(5,2) | Yes |  |  |
| last_updated | integer(32,0) | Yes |  |  |
| notes | text | Yes |  |  |
| supplier_id | integer(32,0) | Yes |  |  |
| short_code | character varying(6) | Yes |  |  |
| material_type | character varying(20) | Yes |  |  |
| is_active | boolean | Yes |  |  |
| created_at | timestamp without time zone | Yes |  |  |
| updated_at | timestamp without time zone | Yes |  |  |
| supplier_name | character varying(255) | Yes |  |  |
| supplier_short_code | character varying(3) | Yes |  |  |

---

### v_active_suppliers

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| supplier_id | integer(32,0) | Yes |  |  |
| supplier_name | character varying(255) | Yes |  |  |
| contact_person | character varying(255) | Yes |  |  |
| phone | character varying(50) | Yes |  |  |
| email | character varying(255) | Yes |  |  |
| gst_number | character varying(50) | Yes |  |  |
| short_code | character varying(3) | Yes |  |  |
| is_active | boolean | Yes |  |  |
| active_material_count | bigint(64,0) | Yes |  |  |
| created_at | timestamp without time zone | Yes |  |  |
| updated_at | timestamp without time zone | Yes |  |  |

---

### v_cost_elements_by_activity

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| element_id | integer(32,0) | Yes |  |  |
| element_name | character varying(100) | Yes |  |  |
| category | character varying(50) | Yes |  |  |
| activity | character varying(50) | Yes |  |  |
| module_specific | character varying(100) | Yes |  |  |
| unit_type | character varying(50) | Yes |  |  |
| default_rate | numeric(10,2) | Yes |  |  |
| calculation_method | character varying(50) | Yes |  |  |
| is_optional | boolean | Yes |  |  |
| applicable_to | character varying(50) | Yes |  |  |
| display_order | integer(32,0) | Yes |  |  |
| is_active | boolean | Yes |  |  |
| activity_order | integer(32,0) | Yes |  |  |

---

### v_current_sku_bom

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| sku_id | integer(32,0) | Yes |  |  |
| sku_code | character varying(50) | Yes |  |  |
| product_name | character varying(100) | Yes |  |  |
| oil_type | character varying(50) | Yes |  |  |
| package_size | character varying(20) | Yes |  |  |
| bom_id | integer(32,0) | Yes |  |  |
| version_number | integer(32,0) | Yes |  |  |
| effective_from | integer(32,0) | Yes |  |  |
| material_id | integer(32,0) | Yes |  |  |
| material_name | character varying(255) | Yes |  |  |
| short_code | character varying(6) | Yes |  |  |
| material_category | character varying(50) | Yes |  |  |
| quantity_per_unit | numeric(10,4) | Yes |  |  |
| is_shared | boolean | Yes |  |  |
| applicable_sizes | ARRAY | Yes |  |  |
| material_unit_cost | numeric(10,2) | Yes |  |  |
| material_total_cost | numeric | Yes |  |  |

---

### v_materials_at_risk

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| note | text | Yes |  |  |

---

### v_sku_current_mrp

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| sku_id | integer(32,0) | Yes |  |  |
| sku_code | character varying(50) | Yes |  |  |
| product_name | character varying(100) | Yes |  |  |
| oil_type | character varying(50) | Yes |  |  |
| package_size | character varying(20) | Yes |  |  |
| mrp_current | numeric(10,2) | Yes |  |  |
| shelf_life_months | integer(32,0) | Yes |  |  |
| latest_mrp_from_history | numeric(10,2) | Yes |  |  |
| effective_from | integer(32,0) | Yes |  |  |
| changed_by | character varying(100) | Yes |  |  |
| change_reason | text | Yes |  |  |
| is_active | boolean | Yes |  |  |

---

### v_sku_expiry_status

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tracking_id | integer(32,0) | Yes |  |  |
| production_id | integer(32,0) | Yes |  |  |
| production_code | character varying(50) | Yes |  |  |
| traceable_code | character varying(10) | Yes |  |  |
| sku_code | character varying(50) | Yes |  |  |
| product_name | character varying(100) | Yes |  |  |
| package_size | character varying(20) | Yes |  |  |
| production_date | integer(32,0) | Yes |  |  |
| expiry_date | integer(32,0) | Yes |  |  |
| quantity_produced | numeric(10,2) | Yes |  |  |
| quantity_remaining | numeric(10,2) | Yes |  |  |
| status | character varying(50) | Yes |  |  |
| days_to_expiry | integer(32,0) | Yes |  |  |
| urgency_level | character varying | Yes |  |  |

---

### v_sku_oil_traceability

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| production_code | character varying(50) | Yes |  |  |
| sku_traceable_code | character varying(10) | Yes |  |  |
| product_name | character varying(100) | Yes |  |  |
| sku_oil_type | character varying(50) | Yes |  |  |
| source_type | character varying(20) | Yes |  |  |
| oil_traceable_code | character varying(50) | Yes |  |  |
| quantity_allocated | numeric(10,2) | Yes |  |  |
| oil_cost_per_kg | numeric(10,2) | Yes |  |  |
| allocation_cost | numeric(10,2) | Yes |  |  |
| oil_source_name | character varying | Yes |  |  |
| oil_production_date | integer(32,0) | Yes |  |  |
| source_code | character varying | Yes |  |  |

---

### v_sku_production_summary

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| production_id | integer(32,0) | Yes |  |  |
| production_code | character varying(50) | Yes |  |  |
| traceable_code | character varying(10) | Yes |  |  |
| production_date | integer(32,0) | Yes |  |  |
| packing_date | integer(32,0) | Yes |  |  |
| sku_code | character varying(50) | Yes |  |  |
| product_name | character varying(100) | Yes |  |  |
| oil_type | character varying(50) | Yes |  |  |
| package_size | character varying(20) | Yes |  |  |
| bottles_produced | integer(32,0) | Yes |  |  |
| total_oil_quantity | numeric(10,2) | Yes |  |  |
| oil_cost_total | numeric(10,2) | Yes |  |  |
| material_cost_total | numeric(10,2) | Yes |  |  |
| labor_cost_total | numeric(10,2) | Yes |  |  |
| total_production_cost | numeric(10,2) | Yes |  |  |
| cost_per_bottle | numeric(10,2) | Yes |  |  |
| production_status | character varying(20) | Yes |  |  |
| operator_name | character varying(100) | Yes |  |  |
| created_at | timestamp without time zone | Yes |  |  |

---

### v_sku_production_summary_enhanced

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| production_id | integer(32,0) | Yes |  |  |
| production_code | character varying(50) | Yes |  |  |
| traceable_code | character varying(10) | Yes |  |  |
| production_date | integer(32,0) | Yes |  |  |
| packing_date | integer(32,0) | Yes |  |  |
| expiry_date | integer(32,0) | Yes |  |  |
| mrp_at_production | numeric(10,2) | Yes |  |  |
| sku_code | character varying(50) | Yes |  |  |
| product_name | character varying(100) | Yes |  |  |
| oil_type | character varying(50) | Yes |  |  |
| package_size | character varying(20) | Yes |  |  |
| shelf_life_months | integer(32,0) | Yes |  |  |
| current_mrp | numeric(10,2) | Yes |  |  |
| bottles_planned | integer(32,0) | Yes |  |  |
| bottles_produced | integer(32,0) | Yes |  |  |
| total_oil_quantity | numeric(10,2) | Yes |  |  |
| oil_cost_total | numeric(10,2) | Yes |  |  |
| material_cost_total | numeric(10,2) | Yes |  |  |
| labor_cost_total | numeric(10,2) | Yes |  |  |
| total_production_cost | numeric(10,2) | Yes |  |  |
| cost_per_bottle | numeric(10,2) | Yes |  |  |
| operator_name | character varying(100) | Yes |  |  |
| shift_number | integer(32,0) | Yes |  |  |
| created_at | timestamp without time zone | Yes |  |  |
| days_to_expiry | integer(32,0) | Yes |  |  |
| expiry_status | character varying | Yes |  |  |

---

### v_uom_transport_groups

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| uom_code | character varying(10) | Yes |  |  |
| uom_name | character varying(50) | Yes |  |  |
| transport_group | text | Yes |  |  |
| display_order | integer(32,0) | Yes |  |  |

---

### v_writeoff_details

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| writeoff_id | integer(32,0) | Yes |  |  |
| writeoff_date | integer(32,0) | Yes |  |  |
| writeoff_date_display | text | Yes |  |  |
| material_id | integer(32,0) | Yes |  |  |
| material_name | character varying(255) | Yes |  |  |
| material_category | character varying(50) | Yes |  |  |
| unit | character varying(50) | Yes |  |  |
| quantity | numeric(10,2) | Yes |  |  |
| weighted_avg_cost | numeric(10,2) | Yes |  |  |
| total_cost | numeric(10,2) | Yes |  |  |
| scrap_value | numeric(10,2) | Yes |  |  |
| net_loss | numeric(10,2) | Yes |  |  |
| reason_code | character varying(50) | Yes |  |  |
| reason_description | character varying(255) | Yes |  |  |
| reason_category | character varying(50) | Yes |  |  |
| tracking_column | text | Yes |  |  |
| reference_type | character varying(50) | Yes |  |  |
| reference_id | integer(32,0) | Yes |  |  |
| notes | text | Yes |  |  |
| created_by | character varying(255) | Yes |  |  |
| created_at | timestamp without time zone | Yes |  |  |
| days_since_writeoff | interval | Yes |  |  |

---

### v_writeoff_impact_current

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tracking_id | integer(32,0) | Yes |  |  |
| calculation_date | integer(32,0) | Yes |  |  |
| calculation_date_display | text | Yes |  |  |
| total_writeoffs_value | numeric(12,2) | Yes |  |  |
| total_oil_produced_kg | numeric(12,2) | Yes |  |  |
| impact_per_kg | numeric(10,4) | Yes |  |  |
| writeoff_percentage | numeric(5,2) | Yes |  |  |
| created_at | timestamp without time zone | Yes |  |  |

---

### v_writeoff_trends

**Statistics:**
- Rows: N/A
- Total Size: N/A
- Table Size: N/A
- Indexes Size: N/A

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| month_year | integer(32,0) | Yes |  |  |
| month_display | text | Yes |  |  |
| month_writeoffs | numeric(12,2) | Yes |  |  |
| month_oil_production | numeric(12,2) | Yes |  |  |
| month_impact_per_kg | numeric(10,4) | Yes |  |  |
| cumulative_impact_per_kg | numeric(10,4) | Yes |  |  |
| month_writeoff_count | integer(32,0) | Yes |  |  |
| top_writeoff_reason | character varying(50) | Yes |  |  |
| top_reason_value | numeric(12,2) | Yes |  |  |
| prev_month_writeoffs | numeric | Yes |  |  |
| month_change_percent | numeric | Yes |  |  |

---

### writeoff_impact_tracking

**Statistics:**
- Rows: 3
- Total Size: 48 kB
- Table Size: 8192 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tracking_id | integer(32,0) | No | nextval('writeoff_impact_tr... | Primary Key |
| calculation_date | integer(32,0) | No |  |  |
| total_writeoffs_value | numeric(12,2) | Yes | 0 |  |
| total_oil_produced_kg | numeric(12,2) | Yes | 0 |  |
| impact_per_kg | numeric(10,4) | Yes | 0 |  |
| writeoff_percentage | numeric(5,2) | Yes | 0 |  |
| material_writeoffs | numeric(12,2) | Yes | 0 |  |
| oilcake_writeoffs | numeric(12,2) | Yes | 0 |  |
| sludge_writeoffs | numeric(12,2) | Yes | 0 |  |
| sku_writeoffs | numeric(12,2) | Yes | 0 |  |
| damage_writeoffs | numeric(12,2) | Yes | 0 |  |
| expiry_writeoffs | numeric(12,2) | Yes | 0 |  |
| quality_writeoffs | numeric(12,2) | Yes | 0 |  |
| process_loss_writeoffs | numeric(12,2) | Yes | 0 |  |
| other_writeoffs | numeric(12,2) | Yes | 0 |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| notes | text | Yes |  |  |

**Indexes:**
- `idx_writeoff_impact_date` on (calculation_dateDESC)
- UNIQUE `writeoff_impact_tracking_pkey` on (tracking_id)

**Check Constraints:**
- `2200_47769_1_not_null`: tracking_id IS NOT NULL
- `2200_47769_2_not_null`: calculation_date IS NOT NULL

---

### writeoff_monthly_summary

**Statistics:**
- Rows: 1
- Total Size: 56 kB
- Table Size: 8192 bytes
- Indexes Size: 48 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| summary_id | integer(32,0) | No | nextval('writeoff_monthly_s... | Primary Key |
| month_year | integer(32,0) | No |  |  |
| month_writeoffs | numeric(12,2) | Yes | 0 |  |
| month_oil_production | numeric(12,2) | Yes | 0 |  |
| month_writeoff_count | integer(32,0) | Yes | 0 |  |
| month_impact_per_kg | numeric(10,4) | Yes | 0 |  |
| cumulative_writeoffs | numeric(12,2) | Yes | 0 |  |
| cumulative_production | numeric(12,2) | Yes | 0 |  |
| cumulative_impact_per_kg | numeric(10,4) | Yes | 0 |  |
| month_material_writeoffs | numeric(12,2) | Yes | 0 |  |
| month_oilcake_writeoffs | numeric(12,2) | Yes | 0 |  |
| month_sludge_writeoffs | numeric(12,2) | Yes | 0 |  |
| top_writeoff_reason | character varying(50) | Yes |  |  |
| top_reason_count | integer(32,0) | Yes |  |  |
| top_reason_value | numeric(12,2) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- UNIQUE `unique_month_year` on (month_year)
- UNIQUE `writeoff_monthly_summary_pkey` on (summary_id)
- `idx_writeoff_monthly_year` on (month_yearDESC)

**Check Constraints:**
- `2200_47792_2_not_null`: month_year IS NOT NULL
- `2200_47792_1_not_null`: summary_id IS NOT NULL

---

### writeoff_reasons

**Statistics:**
- Rows: 10
- Total Size: 40 kB
- Table Size: 8192 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| reason_code | character varying(50) | No |  | Primary Key |
| reason_description | character varying(255) | Yes |  |  |
| category | character varying(50) | Yes |  |  |
| is_active | boolean | Yes | true |  |
| created_by | character varying(100) | Yes |  |  |
| created_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| updated_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |

**Indexes:**
- `idx_writeoff_reasons_active` on (is_active)
- UNIQUE `writeoff_reasons_pkey` on (reason_code)

**Check Constraints:**
- `2200_18589_1_not_null`: reason_code IS NOT NULL

**Triggers:**
- `update_writeoff_reasons_updated_at`: BEFORE UPDATE

---

### year_end_closing

**Statistics:**
- Rows: 0
- Total Size: 40 kB
- Table Size: 0 bytes
- Indexes Size: 32 kB

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| closing_id | integer(32,0) | No | nextval('year_end_closing_c... | Primary Key |
| financial_year | character varying(7) | No |  |  |
| closing_date | integer(32,0) | No |  |  |
| material_id | integer(32,0) | Yes |  | FK → materials.material_id |
| material_name | character varying(255) | Yes |  |  |
| category | character varying(50) | Yes |  |  |
| unit | character varying(50) | Yes |  |  |
| closing_quantity | numeric(10,2) | Yes |  |  |
| weighted_avg_cost | numeric(10,2) | Yes |  |  |
| closing_value | numeric(12,2) | Yes |  |  |
| carried_forward | boolean | Yes | false |  |
| new_year_opening_id | integer(32,0) | Yes |  |  |
| closed_by | character varying(100) | Yes |  |  |
| closed_at | timestamp without time zone | Yes | CURRENT_TIMESTAMP |  |
| reopened_by | character varying(100) | Yes |  |  |
| reopened_at | timestamp without time zone | Yes |  |  |
| status | character varying(20) | Yes | 'closed'::character varying |  |
| notes | text | Yes |  |  |

**Indexes:**
- `idx_year_end_material` on (material_id)
- `idx_year_end_status` on (status)
- `idx_year_end_fy` on (financial_year)
- UNIQUE `year_end_closing_pkey` on (closing_id)

**Check Constraints:**
- `2200_29160_2_not_null`: financial_year IS NOT NULL
- `2200_29160_3_not_null`: closing_date IS NOT NULL
- `2200_29160_1_not_null`: closing_id IS NOT NULL

---

### yield_ranges

**Statistics:**
- Rows: 0
- Total Size: 8192 bytes
- Table Size: 0 bytes
- Indexes Size: 8192 bytes

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| yield_id | integer(32,0) | No | nextval('yield_ranges_yield... | Primary Key |
| oil_type | character varying(50) | Yes |  |  |
| product_type | character varying(20) | Yes |  |  |
| min_yield_percent | numeric(5,2) | Yes |  |  |
| max_yield_percent | numeric(5,2) | Yes |  |  |
| avg_yield_percent | numeric(5,2) | Yes |  |  |
| active | boolean | Yes | true |  |

**Indexes:**
- UNIQUE `yield_ranges_pkey` on (yield_id)

**Check Constraints:**
- `2200_18781_1_not_null`: yield_id IS NOT NULL

---

