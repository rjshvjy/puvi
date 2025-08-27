# Code-Table Usage Report

Generated: 2025-08-27 01:45:39.768032

## Summary
- Tables found in code: 337
- Backend files scanned: 24
- Frontend files scanned: 38

## Table Usage by Module

### app
Tables used: allow_headers, batch, batches, completed_with_errors, datetime, db_utils, endpoints, errors, expose_headers, features, flask, flask_cors, global, json_sort_keys, masters, materials, methods, modules, options, origins, productions, purchases, sales, sequence_sync_status, sku_master, sku_production, skus, statistics, status, success, suppliers, supports_credentials, system_configuration, total_modules, transactions

### batch_production
Tables used: available_oil_types, batch, batch_extended_costs, batches, cost_details, cost_elements, cost_elements_master, database, db_utils, decimal, drying_loss, existing, flask, frontend, inventory, material, materials, oil_cake_inventory, oil_cake_rate_master, oil_types, production_date, purchase_items, purchases, rates, seeds, success, time, total_batches, utils

### blending
Tables used: available_types, batch, batch_code, batches, blend_batch_components, blend_batches, blends, categories_master, components, database, datetime, db_utils, decimal, flask, grouped_batches, inventory, issues, materials, mixed_oil_types, oil_types, oil_yield, outsourced, previous, purchases, source, subcategories_master, subcategory_name, success, total_blends, utils

### config
Tables used: settings

### cost_management
Tables used: activities, actual_hours, batch, batch_extended_costs, batch_time_tracking, batches_with_warnings, billed_hours, cost, cost_element_rate_history, cost_element_usage_stats, cost_elements, cost_elements_master, cost_override_log, costs, database, datetime, days, db_utils, decimal, existing, extended_costs, failed_updates, flask, has_warnings, hours, in, notes, parameters, report_period_days, rounded_hours, saved_costs, success, successful_updates, the, time_costs, total_batches_with_warnings, total_costs, total_elements, total_extended_costs, total_hours, total_overrides, total_uses, updates, usage_stats, utils, warnings

### date_utils
Tables used: a, datetime, html, various

### db_utils
Tables used: batch, batch_cost_details, batch_extended_costs, batch_time_tracking, blend_batch_components, blend_batches, bom_category_mapping, categories_master, config, cost_element_rate_history, cost_elements_master, cost_override_log, errors, fixed_sequences, inventory, masters_audit_log, material_writeoffs, materials, oil_cake_inventory, oil_cake_sale_allocations, oil_cake_sales, opening_balances, package_sizes_master, production_units, products, purchase_items, purchases, recipes, sku_bom_details, sku_bom_master, sku_cost_overrides, sku_expiry_tracking, sku_inventory, sku_master, sku_material_consumption, sku_mrp_history, sku_oil_allocation, sku_production, subcategories_master, suppliers, system_configuration, tags, the, uom_master, year_end_closing, yield_ranges

### expiry_utils
Tables used: allocations, current_date, datetime, dateutil, decimal, different, existing, expiry, production, sku_expiry_tracking, sku_master, sku_production, success, this, utils

### inventory_utils
Tables used: datetime, decimal, existing, inventory

### masters_common
Tables used: address, batch_extended_costs, bom_category_mapping, categories, categories_master, consumables, cost_elements, cost_elements_master, cost_override_log, database, datetime, db_utils, decimal, decimal_places, dependencies, fields, has_dependencies, keywords, litres, masters_audit_log, material_categories, material_tags, material_writeoffs, materials, notes, numbers, options, purchase_items, purchases, query, readonly_fields, sales, special_validations, subcategories, subcategories_master, suppliers, tags, total_dependent_records, uom_master, utilities, writeoff_reasons

### masters_crud
Tables used: an, batch, blend_batches, categories, categories_master, changes, configuration_status, configured_materials, cost_elements, csv, cur, datetime, db_utils, decimal, decimal_places, dependencies, entity_type, errors, fields, flask, has_dependencies, high_confidence_suggestions, if, include_dependencies, inventory, issues, last_updated, low_confidence_suggestions, mapped_materials, master_types, masters_common, material, materials, medium_confidence_suggestions, modules, oil_products, oil_subcategory, oil_to_product, options, orphaned_oil_types, pages, product, products, query, recommendations, record, records, request, results, search_fields, searchable_fields, seed_configurations, seed_to_oil, seed_varieties, seeds, sku_master, statistics, status, subcategories, subcategories_master, subcategory, subcategory_code, success, suggestions, the, total_issues, total_materials, total_oil_products, total_seed_varieties, total_skus, unmapped_oil_products, unmapped_seed_varieties, utils, yes

### material_sales
Tables used: age_days, allocations, batch, batches, byproduct_types, cake_details, db_utils, decimal, flask, gunny_bags, inventory, inventory_items, material_sales, net, nos, notes, oil_cake_inventory, oil_cake_sale_allocations, oil_cake_sales, oil_types, oldest_stock_days, sales, sludge_details, success, total_cost_adjustments, total_sales, unique_buyers, utils

### material_writeoff
Tables used: actual, age_days, alerts, batch, batches, bottles, byproduct_writeoffs, byproducts, categories, categories_master, database, db_utils, finished_products, flask, impact, inventory, inventory_items, items, material_writeoffs, materials, monthly, net_loss, notes, oil, oil_cake_inventory, oil_types, oldest_stock_days, reasons, recent_writeoffs, remaining, sku, sku_inventory, sku_master, sku_production, success, top_reasons, total_loss, total_net_loss, total_writeoffs, trends, unique_materials, unique_reasons, utils, writeoff_impact_tracking, writeoff_monthly_summary, writeoff_reasons, writeoffs

### opening_balance
Tables used: allow_backdated_entries, batch, batches, configurations, csv, datetime, db_utils, decimal, entries, error_details, errors, existing, flask, has_transactions, inventory, masters_audit_log, material_writeoffs, materials, notes, opening, opening_balances, purchases, request, serial_number_tracking, set, statistics, status, success, suppliers, system, system_configuration, total_entries, transaction_counts, utils, writeoffs, year_end_closing

### package_sizes
Tables used: cost, cost_elements_master, datetime, db_utils, decimal, display, existing, flask, in, options, package, package_sizes, package_sizes_master, query, size_in_liters, sku_master, success, updates, validation

### purchase
Tables used: categories_master, db_utils, decimal, first, flask, handling_charges, inventory, inventory_utils, items, material, material_name, material_tags, materials, purchase, purchase_items, purchases, seeds, subcategories_master, subcategory, success, suppliers, tags, total_purchases, traceable_codes, transport_charges, unique_materials, unique_suppliers, utils

### sku_management
Tables used: an, applicable_sizes, bom, bom_details, bottles, caps, categories, columns, completed, cost_elements_master, datetime, db_utils, decimal, dependencies, errors, existing, flask, in, labels, materials, mrp, multiple, notes, pages, production_stats, productions, query, shelf_life_months, sku_bom_details, sku_bom_master, sku_master, sku_mrp_history, sku_production, skus, success, total_bottles, total_productions, updates, utils, versions, yes

### sku_production
Tables used: above, allocations, available_oil, batch, batches, blend_batch_components, blend_batches, categories, cost_elements_master, costcapture, created_at, current_date, database, datetime, days, db_utils, decimal, expiry_details, expiry_status, expiry_tracking_status, flask, from_history, frontend, inventory, items, material_requirements, materials, mrp_history, notes, oil, oil_allocations, oil_sources, package_sizes_master, packing_costs, product_details, production_details, productions, purchases, same, shelf_life_months, sku_bom_details, sku_bom_master, sku_cost_overrides, sku_expiry_tracking, sku_master, sku_material_consumption, sku_mrp_history, sku_oil_allocation, sku_production, status, success, suppliers, traceability, utils

### system_config
Tables used: available_oil_types, bom_categories, bom_category_mapping, bottle_types, bottles, caps, categories, cost_elements, cost_elements_master, database, db_utils, density_values, flask, gst_rates, keywords, labels, labor_rates, material_categories, materials, oil_types, package_sizes, rates, reasons, sku, sku_master, success, suppliers, units, uom, uom_master, values, writeoff_reasons

### traceability
Tables used: any, april, batch, codes, cos, database, date, datetime, existing, gns, materials, mus, production_units, same, seed, seed_batch_tracking, serial_number_tracking, ses, set, source, supplier, suppliers, the, this, user

### validation
Tables used: decimal, javascript

### writeoff_analytics
Tables used: alerts, batch, batch_details, calculate_writeoff_impact, current, db_utils, decimal, flask, impact, material_details, material_writeoffs, materials, month_writeoffs, net_loss, notes, prev_month_writeoffs, process_loss, recent_writeoffs, statistics, success, timestamps, top_reasons, total_events, total_loss, total_writeoffs, trends, utils, v_writeoff_trends, view, witness, writeoff_analytics, writeoff_details, writeoff_impact_tracking, writeoff_monthly_summary, writeoff_reasons, writeoffs, ytd_writeoffs

### wsgi
Tables used: app

## Detailed Table Usage

### a
- Used by modules: date_utils
- Files: 1
- Functions using this table:
  - get_month_year in puvi-backend/puvi-backend-main/utils/date_utils.py

### above
- Used by modules: sku_production
- Files: 1
- Functions using this table:
  - get_production_summary_report in puvi-backend/puvi-backend-main/modules/sku_production.py

### activities
- Used by modules: cost_management
- Files: 1
- Functions using this table:
  - populate_activities in puvi-backend/puvi-backend-main/modules/cost_management.py

### actual
- Used by modules: material_writeoff
- Files: 1
- Functions using this table:
  - get_unified_writeoff_inventory in puvi-backend/puvi-backend-main/modules/material_writeoff.py

### actual_hours
- Used by modules: cost_management
- Files: 1

### address
- Used by modules: masters_common
- Files: 1

### age_days
- Used by modules: material_writeoff, material_sales
- Files: 2

### alerts
- Used by modules: material_writeoff, writeoff_analytics
- Files: 2

### allocations
- Used by modules: sku_production, material_sales, expiry_utils
- Files: 3

### allow_backdated_entries
- Used by modules: opening_balance
- Files: 1

### allow_headers
- Used by modules: app
- Files: 1

### an
- Used by modules: masters_crud, sku_management
- Files: 2
- Functions using this table:
  - update_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - update_record in puvi-backend/puvi-backend-main/modules/masters_crud.py
  - update_subcategory in puvi-backend/puvi-backend-main/modules/masters_crud.py

### any
- Used by modules: traceability
- Files: 1
- Functions using this table:
  - extract_oil_type_from_code in puvi-backend/puvi-backend-main/utils/traceability.py

### app
- Used by modules: wsgi
- Files: 1

### applicable_sizes
- Used by modules: sku_management
- Files: 1

### april
- Used by modules: traceability
- Files: 1
- Functions using this table:
  - get_financial_year in puvi-backend/puvi-backend-main/utils/traceability.py

### available_oil
- Used by modules: sku_production
- Files: 1
- Functions using this table:
  - allocate_oil_for_production in puvi-backend/puvi-backend-main/modules/sku_production.py

### available_oil_types
- Used by modules: system_config, batch_production
- Files: 2
- Functions using this table:
  - get_oil_types in puvi-backend/puvi-backend-main/modules/batch_production.py
  - get_config in puvi-backend/puvi-backend-main/modules/system_config.py

### available_types
- Used by modules: blending
- Files: 1

### batch
- Used by modules: opening_balance, traceability, db_utils, writeoff_analytics, sku_production, batch_production, cost_management, blending, material_sales, masters_crud, app, material_writeoff
- Files: 14
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - get_oil_types in puvi-backend/puvi-backend-main/modules/batch_production.py
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - get_batch_history in puvi-backend/puvi-backend-main/modules/batch_production.py
  - get_unified_writeoff_inventory in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - ... and 23 more

### batch_code
- Used by modules: blending
- Files: 1
- Functions using this table:
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py

### batch_cost_details
- Used by modules: db_utils
- Files: 1

### batch_details
- Used by modules: writeoff_analytics
- Files: 1

### batch_extended_costs
- Used by modules: masters_common, db_utils, batch_production, cost_management
- Files: 4
- Functions using this table:
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - save_time_tracking in puvi-backend/puvi-backend-main/modules/cost_management.py
  - calculate_batch_costs in puvi-backend/puvi-backend-main/modules/cost_management.py
  - save_batch_costs in puvi-backend/puvi-backend-main/modules/cost_management.py
  - get_validation_report in puvi-backend/puvi-backend-main/modules/cost_management.py
  - ... and 3 more

### batch_time_tracking
- Used by modules: db_utils, cost_management
- Files: 2
- Functions using this table:
  - save_time_tracking in puvi-backend/puvi-backend-main/modules/cost_management.py
  - calculate_batch_costs in puvi-backend/puvi-backend-main/modules/cost_management.py
  - get_batch_cost_summary in puvi-backend/puvi-backend-main/modules/cost_management.py

### batches
- Used by modules: opening_balance, sku_production, batch_production, blending, material_sales, app, material_writeoff
- Files: 7
- Functions using this table:
  - get_oilcake_for_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_sludge_for_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_material_sales_inventory in puvi-backend/puvi-backend-main/modules/material_sales.py
  - allocate_oil_for_production in puvi-backend/puvi-backend-main/modules/sku_production.py

### batches_with_warnings
- Used by modules: cost_management
- Files: 1

### billed_hours
- Used by modules: cost_management
- Files: 1

### blend_batch_components
- Used by modules: sku_production, db_utils, blending
- Files: 3
- Functions using this table:
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py
  - create_blend in puvi-backend/puvi-backend-main/modules/blending.py
  - get_blend_history in puvi-backend/puvi-backend-main/modules/blending.py
  - get_production_summary_report in puvi-backend/puvi-backend-main/modules/sku_production.py
  - create_production_plan in puvi-backend/puvi-backend-main/modules/sku_production.py
  - ... and 1 more

### blend_batches
- Used by modules: sku_production, db_utils, masters_crud, blending
- Files: 4
- Functions using this table:
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py
  - create_blend in puvi-backend/puvi-backend-main/modules/blending.py
  - get_blend_history in puvi-backend/puvi-backend-main/modules/blending.py
  - get_oil_products in puvi-backend/puvi-backend-main/modules/masters_crud.py
  - get_production_summary_report in puvi-backend/puvi-backend-main/modules/sku_production.py
  - ... and 2 more

### blends
- Used by modules: blending
- Files: 1

### bom
- Used by modules: sku_management
- Files: 1
- Functions using this table:
  - create_or_update_bom in puvi-backend/puvi-backend-main/modules/sku_management.py
  - get_cost_preview in puvi-backend/puvi-backend-main/modules/sku_management.py

### bom_categories
- Used by modules: system_config
- Files: 1

### bom_category_mapping
- Used by modules: masters_common, system_config, db_utils
- Files: 3
- Functions using this table:
  - get_config in puvi-backend/puvi-backend-main/modules/system_config.py
  - get_bom_categories in puvi-backend/puvi-backend-main/modules/system_config.py
  - get_bom_materials in puvi-backend/puvi-backend-main/modules/system_config.py
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py

### bom_details
- Used by modules: sku_management
- Files: 1

### bottle_types
- Used by modules: system_config
- Files: 1

### bottles
- Used by modules: system_config, material_writeoff, sku_management
- Files: 3

### byproduct_types
- Used by modules: material_sales
- Files: 2

### byproduct_writeoffs
- Used by modules: material_writeoff
- Files: 1

### byproducts
- Used by modules: material_writeoff
- Files: 1

### cake_details
- Used by modules: material_sales
- Files: 1

### calculate_writeoff_impact
- Used by modules: writeoff_analytics
- Files: 1
- Functions using this table:
  - get_writeoff_impact in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py

### caps
- Used by modules: system_config, sku_management
- Files: 2

### categories
- Used by modules: masters_common, sku_production, masters_crud, system_config, sku_management, material_writeoff
- Files: 11

### categories_master
- Used by modules: masters_common, db_utils, purchase, masters_crud, blending, material_writeoff
- Files: 6
- Functions using this table:
  - get_unified_writeoff_inventory in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - create_material in puvi-backend/puvi-backend-main/modules/purchase.py
  - get_oil_types_for_blending in puvi-backend/puvi-backend-main/modules/blending.py
  - get_categories in puvi-backend/puvi-backend-main/modules/masters_crud.py
  - get_subcategories in puvi-backend/puvi-backend-main/modules/masters_crud.py
  - ... and 9 more

### changes
- Used by modules: masters_crud
- Files: 1

### codes
- Used by modules: traceability
- Files: 1
- Functions using this table:
  - generate_batch_code in puvi-backend/puvi-backend-main/utils/traceability.py

### columns
- Used by modules: sku_management
- Files: 1

### completed
- Used by modules: sku_management
- Files: 1
- Functions using this table:
  - bulk_update_skus in puvi-backend/puvi-backend-main/modules/sku_management.py

### completed_with_errors
- Used by modules: app
- Files: 1

### components
- Used by modules: blending
- Files: 1

### config
- Used by modules: db_utils
- Files: 24

### configuration_status
- Used by modules: masters_crud
- Files: 1

### configurations
- Used by modules: opening_balance
- Files: 1
- Functions using this table:
  - configure_system in puvi-backend/puvi-backend-main/modules/opening_balance.py

### configured_materials
- Used by modules: masters_crud
- Files: 1

### consumables
- Used by modules: masters_common
- Files: 1

### cos
- Used by modules: traceability
- Files: 1

### cost
- Used by modules: cost_management, package_sizes
- Files: 2
- Functions using this table:
  - update_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - bulk_update_package_sizes in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - bulk_update_cost_elements in puvi-backend/puvi-backend-main/modules/cost_management.py

### cost_details
- Used by modules: batch_production
- Files: 1

### cost_element_rate_history
- Used by modules: db_utils, cost_management
- Files: 2
- Functions using this table:
  - bulk_update_cost_elements in puvi-backend/puvi-backend-main/modules/cost_management.py
  - get_rate_history in puvi-backend/puvi-backend-main/modules/cost_management.py

### cost_element_usage_stats
- Used by modules: cost_management
- Files: 1
- Functions using this table:
  - get_usage_stats in puvi-backend/puvi-backend-main/modules/cost_management.py

### cost_elements
- Used by modules: masters_common, masters_crud, batch_production, cost_management, system_config
- Files: 25

### cost_elements_master
- Used by modules: masters_common, db_utils, sku_production, cost_management, batch_production, package_sizes, system_config, sku_management
- Files: 8
- Functions using this table:
  - get_cost_elements_for_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - get_package_sizes in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - get_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - create_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - update_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - ... and 19 more

### cost_override_log
- Used by modules: masters_common, db_utils, cost_management
- Files: 3
- Functions using this table:
  - save_batch_costs in puvi-backend/puvi-backend-main/modules/cost_management.py

### costcapture
- Used by modules: sku_production
- Files: 1
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py

### costs
- Used by modules: cost_management
- Files: 1

### created_at
- Used by modules: sku_production
- Files: 1
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py

### csv
- Used by modules: opening_balance, masters_crud
- Files: 2
- Functions using this table:
  - import_opening_balances in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - export_to_csv in puvi-backend/puvi-backend-main/modules/masters_crud.py
  - import_from_csv in puvi-backend/puvi-backend-main/modules/masters_crud.py

### cur
- Used by modules: masters_crud
- Files: 1
- Functions using this table:
  - apply_single_oil_suggestion in puvi-backend/puvi-backend-main/modules/masters_crud.py

### current
- Used by modules: writeoff_analytics
- Files: 1
- Functions using this table:
  - refresh_writeoff_metrics in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py

### current_date
- Used by modules: sku_production, expiry_utils
- Files: 2
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - check_near_expiry_items in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - get_expiry_alert_summary in puvi-backend/puvi-backend-main/utils/expiry_utils.py

### database
- Used by modules: masters_common, traceability, sku_production, cost_management, batch_production, blending, system_config, material_writeoff
- Files: 8
- Functions using this table:
  - get_oil_cake_rates in puvi-backend/puvi-backend-main/modules/batch_production.py
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - get_unified_writeoff_inventory in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_oil_types_for_blending in puvi-backend/puvi-backend-main/modules/blending.py
  - create_blend in puvi-backend/puvi-backend-main/modules/blending.py
  - ... and 8 more

### date
- Used by modules: traceability
- Files: 1
- Functions using this table:
  - get_financial_year in puvi-backend/puvi-backend-main/utils/traceability.py

### datetime
- Used by modules: opening_balance, masters_common, date_utils, traceability, sku_production, cost_management, masters_crud, blending, package_sizes, inventory_utils, expiry_utils, sku_management, app
- Files: 13
- Functions using this table:
  - calculate_expiry_date in puvi-backend/puvi-backend-main/utils/expiry_utils.py

### dateutil
- Used by modules: expiry_utils
- Files: 1

### days
- Used by modules: sku_production, cost_management
- Files: 2

### db_utils
- Used by modules: opening_balance, masters_common, writeoff_analytics, purchase, sku_production, batch_production, cost_management, blending, package_sizes, material_sales, masters_crud, system_config, sku_management, app, material_writeoff
- Files: 15

### decimal
- Used by modules: opening_balance, masters_common, writeoff_analytics, purchase, validation, sku_production, batch_production, cost_management, blending, package_sizes, inventory_utils, material_sales, masters_crud, expiry_utils, sku_management
- Files: 15

### decimal_places
- Used by modules: masters_common, masters_crud
- Files: 2

### density_values
- Used by modules: system_config
- Files: 1

### dependencies
- Used by modules: masters_common, masters_crud, sku_management
- Files: 3

### different
- Used by modules: expiry_utils
- Files: 1
- Functions using this table:
  - get_fefo_allocation in puvi-backend/puvi-backend-main/utils/expiry_utils.py

### display
- Used by modules: package_sizes
- Files: 1
- Functions using this table:
  - bulk_update_package_sizes in puvi-backend/puvi-backend-main/modules/package_sizes.py

### drying_loss
- Used by modules: batch_production
- Files: 1

### endpoints
- Used by modules: app
- Files: 1

### entity_type
- Used by modules: masters_crud
- Files: 1

### entries
- Used by modules: opening_balance
- Files: 1

### error_details
- Used by modules: opening_balance
- Files: 1

### errors
- Used by modules: opening_balance, db_utils, masters_crud, sku_management, app
- Files: 5

### existing
- Used by modules: opening_balance, traceability, batch_production, cost_management, package_sizes, inventory_utils, expiry_utils, sku_management
- Files: 8
- Functions using this table:
  - update_inventory in puvi-backend/puvi-backend-main/inventory_utils.py
  - get_oil_types in puvi-backend/puvi-backend-main/modules/batch_production.py
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - create_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - save_opening_balances in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - ... and 5 more

### expiry
- Used by modules: expiry_utils
- Files: 1
- Functions using this table:
  - update_expiry_tracking in puvi-backend/puvi-backend-main/utils/expiry_utils.py

### expiry_details
- Used by modules: sku_production
- Files: 1

### expiry_status
- Used by modules: sku_production
- Files: 1

### expiry_tracking_status
- Used by modules: sku_production
- Files: 1

### expose_headers
- Used by modules: app
- Files: 1

### extended_costs
- Used by modules: cost_management
- Files: 1

### failed_updates
- Used by modules: cost_management
- Files: 1

### features
- Used by modules: app
- Files: 1

### fields
- Used by modules: masters_common, masters_crud
- Files: 2

### finished_products
- Used by modules: material_writeoff
- Files: 1

### first
- Used by modules: purchase
- Files: 1
- Functions using this table:
  - create_material in puvi-backend/puvi-backend-main/modules/purchase.py

### fixed_sequences
- Used by modules: db_utils
- Files: 1

### flask
- Used by modules: opening_balance, writeoff_analytics, purchase, sku_production, batch_production, cost_management, blending, package_sizes, material_sales, masters_crud, system_config, sku_management, app, material_writeoff
- Files: 14

### flask_cors
- Used by modules: app
- Files: 1

### from_history
- Used by modules: sku_production
- Files: 1

### frontend
- Used by modules: sku_production, batch_production
- Files: 2
- Functions using this table:
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py

### global
- Used by modules: app
- Files: 1
- Functions using this table:
  - manual_sync_sequences in puvi-backend/puvi-backend-main/app.py

### gns
- Used by modules: traceability
- Files: 1

### grouped_batches
- Used by modules: blending
- Files: 1

### gst_rates
- Used by modules: system_config
- Files: 1

### gunny_bags
- Used by modules: material_sales
- Files: 1

### handling_charges
- Used by modules: purchase
- Files: 1

### has_dependencies
- Used by modules: masters_common, masters_crud
- Files: 2

### has_transactions
- Used by modules: opening_balance
- Files: 1

### has_warnings
- Used by modules: cost_management
- Files: 1

### high_confidence_suggestions
- Used by modules: masters_crud
- Files: 1

### hours
- Used by modules: cost_management
- Files: 1

### html
- Used by modules: date_utils
- Files: 1
- Functions using this table:
  - date_to_day_number in puvi-backend/puvi-backend-main/utils/date_utils.py
  - parse_date in puvi-backend/puvi-backend-main/utils/date_utils.py

### if
- Used by modules: masters_crud
- Files: 1
- Functions using this table:
  - update_record in puvi-backend/puvi-backend-main/modules/masters_crud.py

### impact
- Used by modules: material_writeoff, writeoff_analytics
- Files: 2
- Functions using this table:
  - add_sku_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_oilcake_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_sludge_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - refresh_writeoff_metrics in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - ... and 1 more

### in
- Used by modules: cost_management, sku_management, package_sizes
- Files: 3
- Functions using this table:
  - bulk_update_package_sizes in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - bulk_update_skus in puvi-backend/puvi-backend-main/modules/sku_management.py
  - bulk_update_cost_elements in puvi-backend/puvi-backend-main/modules/cost_management.py

### include_dependencies
- Used by modules: masters_crud
- Files: 1

### inventory
- Used by modules: opening_balance, db_utils, purchase, sku_production, batch_production, masters_crud, blending, material_sales, inventory_utils, material_writeoff
- Files: 12
- Functions using this table:
  - update_inventory in puvi-backend/puvi-backend-main/inventory_utils.py
  - get_seeds_for_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - get_inventory_for_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_unified_writeoff_inventory in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - ... and 9 more

### inventory_items
- Used by modules: material_writeoff, material_sales
- Files: 2

### inventory_utils
- Used by modules: purchase
- Files: 1

### issues
- Used by modules: masters_crud, blending
- Files: 2
- Functions using this table:
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py

### items
- Used by modules: sku_production, material_writeoff, purchase
- Files: 3

### javascript
- Used by modules: validation
- Files: 1
- Functions using this table:
  - safe_decimal in puvi-backend/puvi-backend-main/utils/validation.py
  - safe_float in puvi-backend/puvi-backend-main/utils/validation.py

### json_sort_keys
- Used by modules: app
- Files: 1

### keywords
- Used by modules: masters_common, system_config
- Files: 2

### labels
- Used by modules: system_config, sku_management
- Files: 2

### labor_rates
- Used by modules: system_config
- Files: 1

### last_updated
- Used by modules: masters_crud
- Files: 1
- Functions using this table:
  - update_record in puvi-backend/puvi-backend-main/modules/masters_crud.py

### litres
- Used by modules: masters_common
- Files: 1

### low_confidence_suggestions
- Used by modules: masters_crud
- Files: 1

### mapped_materials
- Used by modules: masters_crud
- Files: 1

### master_types
- Used by modules: masters_crud
- Files: 1

### masters
- Used by modules: app
- Files: 43

### masters_audit_log
- Used by modules: opening_balance, masters_common, db_utils
- Files: 3
- Functions using this table:
  - initialize_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - close_financial_year in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - log_audit in puvi-backend/puvi-backend-main/modules/masters_common.py

### masters_common
- Used by modules: masters_crud
- Files: 1

### material
- Used by modules: masters_crud, batch_production, purchase
- Files: 3
- Functions using this table:
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - add_purchase in puvi-backend/puvi-backend-main/modules/purchase.py
  - apply_oil_suggestions in puvi-backend/puvi-backend-main/modules/masters_crud.py

### material_categories
- Used by modules: masters_common, system_config
- Files: 2

### material_details
- Used by modules: writeoff_analytics
- Files: 1

### material_name
- Used by modules: purchase
- Files: 1

### material_requirements
- Used by modules: sku_production
- Files: 1

### material_sales
- Used by modules: material_sales
- Files: 1

### material_tags
- Used by modules: masters_common, purchase
- Files: 2
- Functions using this table:
  - get_materials in puvi-backend/puvi-backend-main/modules/purchase.py
  - create_material in puvi-backend/puvi-backend-main/modules/purchase.py
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py

### material_writeoffs
- Used by modules: opening_balance, masters_common, db_utils, writeoff_analytics, material_writeoff
- Files: 5
- Functions using this table:
  - add_sku_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_writeoff_history in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_oilcake_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_sludge_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - ... and 7 more

### materials
- Used by modules: opening_balance, masters_common, traceability, db_utils, writeoff_analytics, purchase, sku_production, batch_production, masters_crud, blending, system_config, sku_management, app, material_writeoff
- Files: 27
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - get_seeds_for_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - get_inventory_for_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_unified_writeoff_inventory in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - ... and 36 more

### medium_confidence_suggestions
- Used by modules: masters_crud
- Files: 1

### methods
- Used by modules: app
- Files: 1

### mixed_oil_types
- Used by modules: blending
- Files: 1

### modules
- Used by modules: app, masters_crud
- Files: 2

### month_writeoffs
- Used by modules: writeoff_analytics
- Files: 1

### monthly
- Used by modules: material_writeoff
- Files: 1
- Functions using this table:
  - add_sku_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_oilcake_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_sludge_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - refresh_writeoff_metrics in puvi-backend/puvi-backend-main/modules/material_writeoff.py

### mrp
- Used by modules: sku_management
- Files: 1
- Functions using this table:
  - bulk_update_skus in puvi-backend/puvi-backend-main/modules/sku_management.py

### mrp_history
- Used by modules: sku_production
- Files: 1

### multiple
- Used by modules: sku_management
- Files: 1
- Functions using this table:
  - bulk_update_skus in puvi-backend/puvi-backend-main/modules/sku_management.py

### mus
- Used by modules: traceability
- Files: 1

### net
- Used by modules: material_sales
- Files: 1
- Functions using this table:
  - add_material_sale in puvi-backend/puvi-backend-main/modules/material_sales.py

### net_loss
- Used by modules: material_writeoff, writeoff_analytics
- Files: 2

### nos
- Used by modules: material_sales
- Files: 1

### notes
- Used by modules: opening_balance, masters_common, writeoff_analytics, sku_production, cost_management, material_sales, sku_management, material_writeoff
- Files: 8

### numbers
- Used by modules: masters_common
- Files: 1

### oil
- Used by modules: sku_production, material_writeoff
- Files: 9
- Functions using this table:
  - add_oilcake_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - extract_variety_code_from_oil_source in puvi-backend/puvi-backend-main/modules/sku_production.py

### oil_allocations
- Used by modules: sku_production
- Files: 1

### oil_cake_inventory
- Used by modules: material_writeoff, db_utils, batch_production, material_sales
- Files: 5
- Functions using this table:
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - get_unified_writeoff_inventory in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_oilcake_for_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_oilcake_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_material_sales_inventory in puvi-backend/puvi-backend-main/modules/material_sales.py
  - ... and 1 more

### oil_cake_rate_master
- Used by modules: batch_production
- Files: 1
- Functions using this table:
  - get_oil_cake_rates in puvi-backend/puvi-backend-main/modules/batch_production.py

### oil_cake_sale_allocations
- Used by modules: db_utils, material_sales
- Files: 2
- Functions using this table:
  - add_material_sale in puvi-backend/puvi-backend-main/modules/material_sales.py
  - get_material_sales_history in puvi-backend/puvi-backend-main/modules/material_sales.py

### oil_cake_sales
- Used by modules: db_utils, material_sales
- Files: 3
- Functions using this table:
  - add_material_sale in puvi-backend/puvi-backend-main/modules/material_sales.py
  - get_material_sales_history in puvi-backend/puvi-backend-main/modules/material_sales.py

### oil_products
- Used by modules: masters_crud
- Files: 1

### oil_sources
- Used by modules: sku_production
- Files: 1

### oil_subcategory
- Used by modules: masters_crud
- Files: 1

### oil_to_product
- Used by modules: masters_crud
- Files: 1
- Functions using this table:
  - get_production_flow in puvi-backend/puvi-backend-main/modules/masters_crud.py

### oil_types
- Used by modules: batch_production, blending, material_sales, system_config, material_writeoff
- Files: 7

### oil_yield
- Used by modules: blending
- Files: 1
- Functions using this table:
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py

### oldest_stock_days
- Used by modules: material_writeoff, material_sales
- Files: 2

### opening
- Used by modules: opening_balance
- Files: 1
- Functions using this table:
  - save_opening_balances in puvi-backend/puvi-backend-main/modules/opening_balance.py

### opening_balances
- Used by modules: opening_balance, db_utils
- Files: 2
- Functions using this table:
  - get_system_status in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - get_materials_for_opening in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - save_opening_balances in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - initialize_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - close_financial_year in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - ... and 2 more

### options
- Used by modules: masters_common, app, masters_crud, package_sizes
- Files: 4

### origins
- Used by modules: app
- Files: 1

### orphaned_oil_types
- Used by modules: masters_crud
- Files: 1

### outsourced
- Used by modules: blending
- Files: 1
- Functions using this table:
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py

### package
- Used by modules: package_sizes
- Files: 1
- Functions using this table:
  - create_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - update_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - delete_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - bulk_update_package_sizes in puvi-backend/puvi-backend-main/modules/package_sizes.py

### package_sizes
- Used by modules: system_config, package_sizes
- Files: 2

### package_sizes_master
- Used by modules: sku_production, db_utils, package_sizes
- Files: 3
- Functions using this table:
  - get_package_sizes in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - get_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - create_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - update_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - delete_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - ... and 5 more

### packing_costs
- Used by modules: sku_production
- Files: 1

### pages
- Used by modules: masters_crud, sku_management
- Files: 2

### parameters
- Used by modules: cost_management
- Files: 1
- Functions using this table:
  - get_validation_report in puvi-backend/puvi-backend-main/modules/cost_management.py

### prev_month_writeoffs
- Used by modules: writeoff_analytics
- Files: 1

### previous
- Used by modules: blending
- Files: 1
- Functions using this table:
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py

### process_loss
- Used by modules: writeoff_analytics
- Files: 1

### product
- Used by modules: masters_crud
- Files: 1
- Functions using this table:
  - validate_oil_configuration in puvi-backend/puvi-backend-main/modules/masters_crud.py

### product_details
- Used by modules: sku_production
- Files: 1

### production
- Used by modules: expiry_utils
- Files: 1
- Functions using this table:
  - calculate_expiry_date in puvi-backend/puvi-backend-main/utils/expiry_utils.py

### production_date
- Used by modules: batch_production
- Files: 1

### production_details
- Used by modules: sku_production
- Files: 1

### production_stats
- Used by modules: sku_management
- Files: 1

### production_units
- Used by modules: traceability, db_utils
- Files: 2
- Functions using this table:
  - generate_batch_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py
  - generate_batch_traceable_code_alternative in puvi-backend/puvi-backend-main/utils/traceability.py
  - generate_blend_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py

### productions
- Used by modules: sku_production, app, sku_management
- Files: 3

### products
- Used by modules: db_utils, masters_crud
- Files: 2

### purchase
- Used by modules: purchase
- Files: 1
- Functions using this table:
  - add_purchase in puvi-backend/puvi-backend-main/modules/purchase.py

### purchase_items
- Used by modules: masters_common, db_utils, batch_production, purchase
- Files: 4
- Functions using this table:
  - get_seeds_for_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - add_purchase in puvi-backend/puvi-backend-main/modules/purchase.py
  - get_purchase_history in puvi-backend/puvi-backend-main/modules/purchase.py
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py

### purchases
- Used by modules: opening_balance, masters_common, db_utils, purchase, sku_production, batch_production, blending, app
- Files: 12
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - get_seeds_for_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - get_system_status in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - initialize_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - ... and 4 more

### query
- Used by modules: masters_common, masters_crud, sku_management, package_sizes
- Files: 4
- Functions using this table:
  - update_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - update_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - bulk_update_skus in puvi-backend/puvi-backend-main/modules/sku_management.py
  - update_record in puvi-backend/puvi-backend-main/modules/masters_crud.py
  - update_subcategory in puvi-backend/puvi-backend-main/modules/masters_crud.py
  - ... and 2 more

### rates
- Used by modules: system_config, batch_production
- Files: 2

### readonly_fields
- Used by modules: masters_common
- Files: 1

### reasons
- Used by modules: system_config, material_writeoff
- Files: 2

### recent_writeoffs
- Used by modules: material_writeoff, writeoff_analytics
- Files: 2

### recipes
- Used by modules: db_utils
- Files: 1

### recommendations
- Used by modules: masters_crud
- Files: 1

### record
- Used by modules: masters_crud
- Files: 1
- Functions using this table:
  - create_record in puvi-backend/puvi-backend-main/modules/masters_crud.py

### records
- Used by modules: masters_crud
- Files: 1

### remaining
- Used by modules: material_writeoff
- Files: 1
- Functions using this table:
  - add_sku_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py

### report_period_days
- Used by modules: cost_management
- Files: 1

### request
- Used by modules: opening_balance, masters_crud
- Files: 2
- Functions using this table:
  - import_opening_balances in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - import_from_csv in puvi-backend/puvi-backend-main/modules/masters_crud.py

### results
- Used by modules: masters_crud
- Files: 1

### rounded_hours
- Used by modules: cost_management
- Files: 1

### sales
- Used by modules: masters_common, app, material_sales
- Files: 3

### same
- Used by modules: traceability, sku_production
- Files: 2
- Functions using this table:
  - get_production_summary_report in puvi-backend/puvi-backend-main/modules/sku_production.py
  - get_next_batch_serial in puvi-backend/puvi-backend-main/utils/traceability.py
  - generate_batch_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py

### saved_costs
- Used by modules: cost_management
- Files: 1

### search_fields
- Used by modules: masters_crud
- Files: 1

### searchable_fields
- Used by modules: masters_crud
- Files: 1

### seed
- Used by modules: traceability
- Files: 1
- Functions using this table:
  - get_next_batch_serial in puvi-backend/puvi-backend-main/utils/traceability.py
  - generate_batch_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py
  - generate_batch_traceable_code_alternative in puvi-backend/puvi-backend-main/utils/traceability.py

### seed_batch_tracking
- Used by modules: traceability
- Files: 1
- Functions using this table:
  - get_next_batch_serial in puvi-backend/puvi-backend-main/utils/traceability.py

### seed_configurations
- Used by modules: masters_crud
- Files: 1

### seed_to_oil
- Used by modules: masters_crud
- Files: 1
- Functions using this table:
  - get_production_flow in puvi-backend/puvi-backend-main/modules/masters_crud.py

### seed_varieties
- Used by modules: masters_crud
- Files: 1

### seeds
- Used by modules: masters_crud, batch_production, purchase
- Files: 3

### sequence_sync_status
- Used by modules: app
- Files: 1

### serial_number_tracking
- Used by modules: opening_balance, traceability
- Files: 2
- Functions using this table:
  - close_financial_year in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - get_next_serial in puvi-backend/puvi-backend-main/utils/traceability.py

### ses
- Used by modules: traceability
- Files: 1

### set
- Used by modules: opening_balance, traceability
- Files: 2
- Functions using this table:
  - configure_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - initialize_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - get_next_serial in puvi-backend/puvi-backend-main/utils/traceability.py
  - get_next_batch_serial in puvi-backend/puvi-backend-main/utils/traceability.py

### settings
- Used by modules: config
- Files: 1

### shelf_life_months
- Used by modules: sku_production, sku_management
- Files: 2

### size_in_liters
- Used by modules: package_sizes
- Files: 1
- Functions using this table:
  - update_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py

### sku
- Used by modules: system_config, material_writeoff
- Files: 45
- Functions using this table:
  - add_sku_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_config in puvi-backend/puvi-backend-main/modules/system_config.py

### sku_bom_details
- Used by modules: sku_production, db_utils, sku_management
- Files: 3
- Functions using this table:
  - delete_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - get_sku_bom in puvi-backend/puvi-backend-main/modules/sku_management.py
  - create_or_update_bom in puvi-backend/puvi-backend-main/modules/sku_management.py
  - get_cost_preview in puvi-backend/puvi-backend-main/modules/sku_management.py
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - ... and 1 more

### sku_bom_master
- Used by modules: sku_production, db_utils, sku_management
- Files: 3
- Functions using this table:
  - get_sku_master_list in puvi-backend/puvi-backend-main/modules/sku_management.py
  - get_single_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - delete_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - get_sku_bom in puvi-backend/puvi-backend-main/modules/sku_management.py
  - create_or_update_bom in puvi-backend/puvi-backend-main/modules/sku_management.py
  - ... and 5 more

### sku_cost_overrides
- Used by modules: sku_production, db_utils
- Files: 2
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py

### sku_expiry_tracking
- Used by modules: sku_production, db_utils, expiry_utils
- Files: 3
- Functions using this table:
  - get_production_history in puvi-backend/puvi-backend-main/modules/sku_production.py
  - check_near_expiry_items in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - update_expiry_tracking in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - get_fefo_allocation in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - get_expiry_alert_summary in puvi-backend/puvi-backend-main/utils/expiry_utils.py

### sku_inventory
- Used by modules: db_utils, material_writeoff
- Files: 2
- Functions using this table:
  - get_unified_writeoff_inventory in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_sku_for_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_sku_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py

### sku_master
- Used by modules: db_utils, sku_production, masters_crud, package_sizes, expiry_utils, system_config, sku_management, app, material_writeoff
- Files: 9
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - get_unified_writeoff_inventory in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_sku_for_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_sku_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - delete_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - ... and 21 more

### sku_material_consumption
- Used by modules: sku_production, db_utils
- Files: 2
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - get_production_summary_report in puvi-backend/puvi-backend-main/modules/sku_production.py

### sku_mrp_history
- Used by modules: sku_production, db_utils, sku_management
- Files: 3
- Functions using this table:
  - create_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - update_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - delete_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - bulk_update_skus in puvi-backend/puvi-backend-main/modules/sku_management.py
  - get_mrp_history in puvi-backend/puvi-backend-main/modules/sku_production.py
  - ... and 1 more

### sku_oil_allocation
- Used by modules: sku_production, db_utils
- Files: 2
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - get_production_summary_report in puvi-backend/puvi-backend-main/modules/sku_production.py
  - create_production_plan in puvi-backend/puvi-backend-main/modules/sku_production.py
  - allocate_oil_for_production in puvi-backend/puvi-backend-main/modules/sku_production.py

### sku_production
- Used by modules: db_utils, sku_production, expiry_utils, sku_management, app, material_writeoff
- Files: 6
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - get_unified_writeoff_inventory in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_sku_for_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_sku_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_sku_master_list in puvi-backend/puvi-backend-main/modules/sku_management.py
  - ... and 7 more

### skus
- Used by modules: app, sku_management
- Files: 2

### sludge_details
- Used by modules: material_sales
- Files: 1

### source
- Used by modules: traceability, blending
- Files: 2
- Functions using this table:
  - create_blend in puvi-backend/puvi-backend-main/modules/blending.py
  - generate_blend_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py

### special_validations
- Used by modules: masters_common
- Files: 1

### statistics
- Used by modules: opening_balance, masters_crud, app, writeoff_analytics
- Files: 4

### status
- Used by modules: opening_balance, sku_production, app, masters_crud
- Files: 4

### subcategories
- Used by modules: masters_common, masters_crud
- Files: 7

### subcategories_master
- Used by modules: masters_common, db_utils, purchase, masters_crud, blending
- Files: 5
- Functions using this table:
  - get_materials in puvi-backend/puvi-backend-main/modules/purchase.py
  - create_material in puvi-backend/puvi-backend-main/modules/purchase.py
  - get_purchase_history in puvi-backend/puvi-backend-main/modules/purchase.py
  - get_oil_types_for_blending in puvi-backend/puvi-backend-main/modules/blending.py
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py
  - ... and 15 more

### subcategory
- Used by modules: masters_crud, purchase
- Files: 2
- Functions using this table:
  - create_material in puvi-backend/puvi-backend-main/modules/purchase.py
  - apply_oil_suggestions in puvi-backend/puvi-backend-main/modules/masters_crud.py

### subcategory_code
- Used by modules: masters_crud
- Files: 1

### subcategory_name
- Used by modules: blending
- Files: 1
- Functions using this table:
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py

### success
- Used by modules: opening_balance, writeoff_analytics, purchase, sku_production, batch_production, cost_management, blending, package_sizes, material_sales, masters_crud, expiry_utils, system_config, sku_management, app, material_writeoff
- Files: 15

### successful_updates
- Used by modules: cost_management
- Files: 1

### suggestions
- Used by modules: masters_crud
- Files: 1

### supplier
- Used by modules: traceability
- Files: 1
- Functions using this table:
  - generate_blend_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py

### suppliers
- Used by modules: opening_balance, masters_common, traceability, db_utils, purchase, sku_production, system_config, app
- Files: 13
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - get_materials_for_opening in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - download_template in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - get_materials in puvi-backend/puvi-backend-main/modules/purchase.py
  - add_purchase in puvi-backend/puvi-backend-main/modules/purchase.py
  - ... and 6 more

### supports_credentials
- Used by modules: app
- Files: 1

### system
- Used by modules: opening_balance
- Files: 3
- Functions using this table:
  - initialize_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - close_financial_year in puvi-backend/puvi-backend-main/modules/opening_balance.py

### system_configuration
- Used by modules: app, opening_balance, db_utils
- Files: 3
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - get_system_status in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - configure_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - save_opening_balances in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - initialize_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - ... and 2 more

### tags
- Used by modules: masters_common, db_utils, purchase
- Files: 3
- Functions using this table:
  - get_materials in puvi-backend/puvi-backend-main/modules/purchase.py
  - create_material in puvi-backend/puvi-backend-main/modules/purchase.py
  - get_tags in puvi-backend/puvi-backend-main/modules/purchase.py
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py

### the
- Used by modules: traceability, masters_crud, db_utils, cost_management
- Files: 4
- Functions using this table:
  - synchronize_all_sequences in puvi-backend/puvi-backend-main/db_utils.py
  - get_usage_stats in puvi-backend/puvi-backend-main/modules/cost_management.py
  - bulk_update_cost_elements in puvi-backend/puvi-backend-main/modules/cost_management.py
  - list_master_records in puvi-backend/puvi-backend-main/modules/masters_crud.py
  - get_next_batch_serial in puvi-backend/puvi-backend-main/utils/traceability.py
  - ... and 1 more

### this
- Used by modules: traceability, expiry_utils
- Files: 2
- Functions using this table:
  - get_next_batch_serial in puvi-backend/puvi-backend-main/utils/traceability.py
  - generate_batch_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py
  - get_fefo_allocation in puvi-backend/puvi-backend-main/utils/expiry_utils.py

### time
- Used by modules: batch_production
- Files: 1
- Functions using this table:
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py

### time_costs
- Used by modules: cost_management
- Files: 1

### timestamps
- Used by modules: writeoff_analytics
- Files: 1

### top_reasons
- Used by modules: material_writeoff, writeoff_analytics
- Files: 2

### total_batches
- Used by modules: batch_production
- Files: 1

### total_batches_with_warnings
- Used by modules: cost_management
- Files: 1

### total_blends
- Used by modules: blending
- Files: 1

### total_bottles
- Used by modules: sku_management
- Files: 1

### total_cost_adjustments
- Used by modules: material_sales
- Files: 1

### total_costs
- Used by modules: cost_management
- Files: 1

### total_dependent_records
- Used by modules: masters_common
- Files: 1

### total_elements
- Used by modules: cost_management
- Files: 1

### total_entries
- Used by modules: opening_balance
- Files: 1

### total_events
- Used by modules: writeoff_analytics
- Files: 1

### total_extended_costs
- Used by modules: cost_management
- Files: 1

### total_hours
- Used by modules: cost_management
- Files: 1

### total_issues
- Used by modules: masters_crud
- Files: 1

### total_loss
- Used by modules: material_writeoff, writeoff_analytics
- Files: 2

### total_materials
- Used by modules: masters_crud
- Files: 1

### total_modules
- Used by modules: app
- Files: 1

### total_net_loss
- Used by modules: material_writeoff
- Files: 1

### total_oil_products
- Used by modules: masters_crud
- Files: 1

### total_overrides
- Used by modules: cost_management
- Files: 1

### total_productions
- Used by modules: sku_management
- Files: 1

### total_purchases
- Used by modules: purchase
- Files: 1

### total_sales
- Used by modules: material_sales
- Files: 1

### total_seed_varieties
- Used by modules: masters_crud
- Files: 1

### total_skus
- Used by modules: masters_crud
- Files: 1

### total_uses
- Used by modules: cost_management
- Files: 1

### total_writeoffs
- Used by modules: material_writeoff, writeoff_analytics
- Files: 2

### traceability
- Used by modules: sku_production
- Files: 1
- Functions using this table:
  - extract_variety_code_from_oil_source in puvi-backend/puvi-backend-main/modules/sku_production.py

### traceable_codes
- Used by modules: purchase
- Files: 1

### transaction_counts
- Used by modules: opening_balance
- Files: 1

### transactions
- Used by modules: app
- Files: 1

### transport_charges
- Used by modules: purchase
- Files: 1

### trends
- Used by modules: material_writeoff, writeoff_analytics
- Files: 2

### unique_buyers
- Used by modules: material_sales
- Files: 1

### unique_materials
- Used by modules: material_writeoff, purchase
- Files: 2

### unique_reasons
- Used by modules: material_writeoff
- Files: 1

### unique_suppliers
- Used by modules: purchase
- Files: 1

### units
- Used by modules: system_config
- Files: 1

### unmapped_oil_products
- Used by modules: masters_crud
- Files: 1

### unmapped_seed_varieties
- Used by modules: masters_crud
- Files: 1

### uom
- Used by modules: system_config
- Files: 1
- Functions using this table:
  - get_material_units in puvi-backend/puvi-backend-main/modules/system_config.py

### uom_master
- Used by modules: masters_common, system_config, db_utils
- Files: 3
- Functions using this table:
  - get_config in puvi-backend/puvi-backend-main/modules/system_config.py
  - get_material_units in puvi-backend/puvi-backend-main/modules/system_config.py
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py
  - check_dependencies in puvi-backend/puvi-backend-main/modules/masters_common.py
  - validate_master_data in puvi-backend/puvi-backend-main/modules/masters_common.py
  - ... and 1 more

### updates
- Used by modules: cost_management, sku_management, package_sizes
- Files: 3

### usage_stats
- Used by modules: cost_management
- Files: 1

### user
- Used by modules: traceability
- Files: 1
- Functions using this table:
  - generate_batch_code in puvi-backend/puvi-backend-main/utils/traceability.py

### utilities
- Used by modules: masters_common
- Files: 1

### utils
- Used by modules: opening_balance, writeoff_analytics, purchase, sku_production, batch_production, cost_management, blending, material_sales, masters_crud, expiry_utils, sku_management, material_writeoff
- Files: 12

### v_writeoff_trends
- Used by modules: writeoff_analytics
- Files: 1
- Functions using this table:
  - get_writeoff_trends in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py

### validation
- Used by modules: package_sizes
- Files: 1
- Functions using this table:
  - validate_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py

### values
- Used by modules: system_config
- Files: 1

### various
- Used by modules: date_utils
- Files: 1
- Functions using this table:
  - parse_date in puvi-backend/puvi-backend-main/utils/date_utils.py

### versions
- Used by modules: sku_management
- Files: 1

### view
- Used by modules: writeoff_analytics
- Files: 1
- Functions using this table:
  - get_writeoff_trends in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py

### warnings
- Used by modules: cost_management
- Files: 1

### witness
- Used by modules: writeoff_analytics
- Files: 1

### writeoff_analytics
- Used by modules: writeoff_analytics
- Files: 1

### writeoff_details
- Used by modules: writeoff_analytics
- Files: 1

### writeoff_impact_tracking
- Used by modules: material_writeoff, writeoff_analytics
- Files: 2
- Functions using this table:
  - get_writeoff_impact in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_writeoff_dashboard in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_writeoff_impact in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
  - get_writeoff_dashboard in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py

### writeoff_monthly_summary
- Used by modules: material_writeoff, writeoff_analytics
- Files: 2
- Functions using this table:
  - get_writeoff_trends in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_writeoff_trends in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
  - get_writeoff_dashboard in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py

### writeoff_reasons
- Used by modules: masters_common, system_config, material_writeoff, writeoff_analytics
- Files: 6
- Functions using this table:
  - get_writeoff_reasons in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_writeoff_history in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_writeoff_dashboard in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_writeoff_dashboard in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
  - get_writeoff_report in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
  - ... and 3 more

### writeoffs
- Used by modules: opening_balance, material_writeoff, writeoff_analytics
- Files: 3

### year_end_closing
- Used by modules: opening_balance, db_utils
- Files: 2
- Functions using this table:
  - close_financial_year in puvi-backend/puvi-backend-main/modules/opening_balance.py

### yes
- Used by modules: masters_crud, sku_management
- Files: 2

### yield_ranges
- Used by modules: db_utils
- Files: 1

### ytd_writeoffs
- Used by modules: writeoff_analytics
- Files: 1

