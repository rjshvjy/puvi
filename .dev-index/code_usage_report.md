# Code-Table Usage Report

Generated: 2025-08-30 07:10:54.855567

## Summary
- Tables found in code: 368
- Backend files scanned: 27
- Frontend files scanned: 40

## Table Usage by Module

### app
Tables used: allow_headers, batch, batches, completed_with_errors, customers, datetime, db_utils, endpoints, errors, expose_headers, features, flask, flask_cors, global, json_sort_keys, locations, locations_master, masters, materials, methods, modules, options, origins, outbounds, productions, purchases, sales, sequence_sync_status, sku_master, sku_outbound, sku_production, skus, statistics, status, success, suppliers, supports_credentials, system_configuration, total_modules, transactions

### batch_production
Tables used: available_oil_types, batch, batch_extended_costs, batches, cost_details, cost_elements, cost_elements_master, database, db_utils, decimal, drying_loss, existing, flask, frontend, inventory, material, materials, oil_cake_inventory, oil_cake_rate_master, oil_types, production_date, purchase_items, purchases, rates, seeds, success, time, total_batches, utils

### blending
Tables used: available_types, batch, batch_code, batches, blend_batch_components, blend_batches, blends, categories_master, components, database, datetime, db_utils, decimal, flask, grouped_batches, inventory, issues, materials, mixed_oil_types, oil_types, oil_yield, outsourced, previous, purchases, source, subcategories_master, subcategory_name, success, total_blends, utils

### config
Tables used: settings

### cost_management
Tables used: activities, actual_hours, batch, batch_extended_costs, batch_time_tracking, batches_with_warnings, billed_hours, cost, cost_element_rate_history, cost_element_usage_stats, cost_elements, cost_elements_master, cost_override_log, costs, database, datetime, days, db_utils, decimal, existing, extended_costs, failed_updates, flask, has_warnings, hours, in, notes, parameters, report_period_days, rounded_hours, saved_costs, success, successful_updates, the, time_costs, total_batches_with_warnings, total_costs, total_elements, total_extended_costs, total_hours, total_overrides, total_uses, updates, usage_stats, utils, warnings

### customers
Tables used: address, an, args, customer_ship_to_locations, customers, db_utils, errors, flask, operation, query, ship_to_locations, sku_outbound, success, total_transactions, utils

### date_utils
Tables used: a, datetime, html, various

### db_utils
Tables used: batch, batch_cost_details, batch_extended_costs, batch_time_tracking, blend_batch_components, blend_batches, bom_category_mapping, categories_master, config, cost_element_rate_history, cost_elements_master, cost_override_log, errors, fixed_sequences, inventory, masters_audit_log, material_writeoffs, materials, oil_cake_inventory, oil_cake_sale_allocations, oil_cake_sales, opening_balances, package_sizes_master, production_units, products, purchase_items, purchases, recipes, sku_bom_details, sku_bom_master, sku_cost_overrides, sku_expiry_tracking, sku_inventory, sku_master, sku_material_consumption, sku_mrp_history, sku_oil_allocation, sku_production, subcategories_master, suppliers, system_configuration, tags, the, uom_master, year_end_closing, yield_ranges

### expiry_utils
Tables used: allocations, current_date, datetime, dateutil, decimal, different, existing, expiry, production, sku_expiry_tracking, sku_master, sku_production, success, this, utils

### inventory_utils
Tables used: datetime, decimal, existing, inventory

### locations
Tables used: address, an, args, capabilities, customers, db_utils, decimal, dependencies, details, errors, flask, has_dependencies, location, locations, locations_master, notes, operation, outbound_transactions, ownership, query, sku_expiry_tracking, sku_inventory, sku_outbound, success, utils

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

### sku_outbound
Tables used: allocations, available, available_batches, base, cancelled, cost_elements, customer_ship_to_locations, customers, datetime, db_utils, decimal, documentation_charges, expiry, expiry_status, flask, items, loading_charges, location, locations_master, margin_analysis, movements, notes, other_charges, outbounds, parameters, quantity_needed, reference_documents, remaining, sales, set, sku_details, sku_expiry_tracking, sku_inventory, sku_master, sku_outbound, sku_outbound_items, sku_production, source, status, success, total_units, transaction_type, unloading_charges, utils

### sku_production
Tables used: above, allocations, available_oil, batch, batches, blend_batch_components, blend_batches, categories, cost_elements_master, costcapture, created_at, current_date, database, datetime, days, db_utils, decimal, expiry_details, expiry_status, expiry_tracking_status, flask, from_history, frontend, inventory, items, material_requirements, materials, mrp_history, notes, oil, oil_allocations, oil_sources, package_sizes_master, packing_costs, product_details, production_details, productions, purchases, same, shelf_life_months, sku_bom_details, sku_bom_master, sku_cost_overrides, sku_expiry_tracking, sku_inventory, sku_master, sku_material_consumption, sku_mrp_history, sku_oil_allocation, sku_production, status, success, suppliers, traceability, utils

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
- Used by modules: locations, masters_common, customers
- Files: 3

### age_days
- Used by modules: material_writeoff, material_sales
- Files: 2

### alerts
- Used by modules: material_writeoff, writeoff_analytics
- Files: 2

### allocations
- Used by modules: expiry_utils, sku_outbound, material_sales, sku_production
- Files: 4

### allow_backdated_entries
- Used by modules: opening_balance
- Files: 1

### allow_headers
- Used by modules: app
- Files: 1

### an
- Used by modules: masters_crud, sku_management, locations, customers
- Files: 4
- Functions using this table:
  - update_customer in puvi-backend/puvi-backend-main/modules/customers.py
  - update_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - update_record in puvi-backend/puvi-backend-main/modules/masters_crud.py
  - update_subcategory in puvi-backend/puvi-backend-main/modules/masters_crud.py
  - update_location in puvi-backend/puvi-backend-main/modules/locations.py

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

### args
- Used by modules: locations, customers
- Files: 2
- Functions using this table:
  - validate_customer_data in puvi-backend/puvi-backend-main/modules/customers.py
  - validate_location_data in puvi-backend/puvi-backend-main/modules/locations.py

### available
- Used by modules: sku_outbound
- Files: 1
- Functions using this table:
  - create_outbound in puvi-backend/puvi-backend-main/modules/sku_outbound.py

### available_batches
- Used by modules: sku_outbound
- Files: 1

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

### base
- Used by modules: sku_outbound
- Files: 1
- Functions using this table:
  - calculate_gst_amount in puvi-backend/puvi-backend-main/modules/sku_outbound.py

### batch
- Used by modules: db_utils, app, opening_balance, traceability, writeoff_analytics, masters_crud, material_sales, blending, material_writeoff, cost_management, batch_production, sku_production
- Files: 14
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - get_next_batch_serial in puvi-backend/puvi-backend-main/utils/traceability.py
  - generate_batch_code in puvi-backend/puvi-backend-main/utils/traceability.py
  - generate_batch_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py
  - get_system_status in puvi-backend/puvi-backend-main/modules/opening_balance.py
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
- Used by modules: db_utils, cost_management, masters_common, batch_production
- Files: 4
- Functions using this table:
  - save_time_tracking in puvi-backend/puvi-backend-main/modules/cost_management.py
  - calculate_batch_costs in puvi-backend/puvi-backend-main/modules/cost_management.py
  - save_batch_costs in puvi-backend/puvi-backend-main/modules/cost_management.py
  - get_validation_report in puvi-backend/puvi-backend-main/modules/cost_management.py
  - get_batch_cost_summary in puvi-backend/puvi-backend-main/modules/cost_management.py
  - ... and 3 more

### batch_time_tracking
- Used by modules: db_utils, cost_management
- Files: 2
- Functions using this table:
  - save_time_tracking in puvi-backend/puvi-backend-main/modules/cost_management.py
  - calculate_batch_costs in puvi-backend/puvi-backend-main/modules/cost_management.py
  - get_batch_cost_summary in puvi-backend/puvi-backend-main/modules/cost_management.py

### batches
- Used by modules: app, opening_balance, material_sales, blending, material_writeoff, batch_production, sku_production
- Files: 7
- Functions using this table:
  - get_material_sales_inventory in puvi-backend/puvi-backend-main/modules/material_sales.py
  - allocate_oil_for_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - get_oilcake_for_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_sludge_for_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py

### batches_with_warnings
- Used by modules: cost_management
- Files: 1

### billed_hours
- Used by modules: cost_management
- Files: 1

### blend_batch_components
- Used by modules: db_utils, sku_production, blending
- Files: 3
- Functions using this table:
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py
  - create_blend in puvi-backend/puvi-backend-main/modules/blending.py
  - get_blend_history in puvi-backend/puvi-backend-main/modules/blending.py
  - get_production_summary_report in puvi-backend/puvi-backend-main/modules/sku_production.py
  - create_production_plan in puvi-backend/puvi-backend-main/modules/sku_production.py
  - ... and 1 more

### blend_batches
- Used by modules: masters_crud, db_utils, sku_production, blending
- Files: 4
- Functions using this table:
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py
  - create_blend in puvi-backend/puvi-backend-main/modules/blending.py
  - get_blend_history in puvi-backend/puvi-backend-main/modules/blending.py
  - get_production_summary_report in puvi-backend/puvi-backend-main/modules/sku_production.py
  - create_production_plan in puvi-backend/puvi-backend-main/modules/sku_production.py
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
- Used by modules: db_utils, masters_common, system_config
- Files: 3
- Functions using this table:
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py
  - get_config in puvi-backend/puvi-backend-main/modules/system_config.py
  - get_bom_categories in puvi-backend/puvi-backend-main/modules/system_config.py
  - get_bom_materials in puvi-backend/puvi-backend-main/modules/system_config.py

### bom_details
- Used by modules: sku_management
- Files: 1

### bottle_types
- Used by modules: system_config
- Files: 1

### bottles
- Used by modules: material_writeoff, system_config, sku_management
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

### cancelled
- Used by modules: sku_outbound
- Files: 1
- Functions using this table:
  - update_outbound_status in puvi-backend/puvi-backend-main/modules/sku_outbound.py

### capabilities
- Used by modules: locations
- Files: 1

### caps
- Used by modules: system_config, sku_management
- Files: 2

### categories
- Used by modules: system_config, masters_common, sku_management, masters_crud, material_writeoff, sku_production
- Files: 11

### categories_master
- Used by modules: db_utils, masters_common, masters_crud, purchase, blending, material_writeoff
- Files: 6
- Functions using this table:
  - get_oil_types_for_blending in puvi-backend/puvi-backend-main/modules/blending.py
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py
  - create_material in puvi-backend/puvi-backend-main/modules/purchase.py
  - get_unified_writeoff_inventory in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_categories in puvi-backend/puvi-backend-main/modules/masters_crud.py
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
  - bulk_update_cost_elements in puvi-backend/puvi-backend-main/modules/cost_management.py
  - update_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - bulk_update_package_sizes in puvi-backend/puvi-backend-main/modules/package_sizes.py

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
- Used by modules: system_config, masters_common, sku_outbound, masters_crud, cost_management, batch_production
- Files: 26

### cost_elements_master
- Used by modules: db_utils, system_config, masters_common, sku_management, package_sizes, cost_management, batch_production, sku_production
- Files: 8
- Functions using this table:
  - get_cost_elements_master in puvi-backend/puvi-backend-main/modules/cost_management.py
  - get_cost_elements_by_stage in puvi-backend/puvi-backend-main/modules/cost_management.py
  - get_cost_elements_by_activity in puvi-backend/puvi-backend-main/modules/cost_management.py
  - populate_activities in puvi-backend/puvi-backend-main/modules/cost_management.py
  - calculate_batch_costs in puvi-backend/puvi-backend-main/modules/cost_management.py
  - ... and 19 more

### cost_override_log
- Used by modules: db_utils, cost_management, masters_common
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
- Used by modules: masters_crud, opening_balance
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
- Used by modules: expiry_utils, sku_production
- Files: 2
- Functions using this table:
  - check_near_expiry_items in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - get_expiry_alert_summary in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py

### customer_ship_to_locations
- Used by modules: sku_outbound, customers
- Files: 2
- Functions using this table:
  - get_outbound_history in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - get_outbound_details in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - trace_batch in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - generate_ship_to_code in puvi-backend/puvi-backend-main/modules/customers.py
  - get_customers in puvi-backend/puvi-backend-main/modules/customers.py
  - ... and 4 more

### customers
- Used by modules: locations, app, sku_outbound, customers
- Files: 14
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - get_outbound_history in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - get_outbound_details in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - trace_batch in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - get_sales_summary in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - ... and 15 more

### database
- Used by modules: system_config, traceability, masters_common, blending, material_writeoff, cost_management, batch_production, sku_production
- Files: 8
- Functions using this table:
  - generate_batch_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py
  - get_oil_types_for_blending in puvi-backend/puvi-backend-main/modules/blending.py
  - create_blend in puvi-backend/puvi-backend-main/modules/blending.py
  - calculate_batch_costs in puvi-backend/puvi-backend-main/modules/cost_management.py
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - ... and 8 more

### date
- Used by modules: traceability
- Files: 1
- Functions using this table:
  - get_financial_year in puvi-backend/puvi-backend-main/utils/traceability.py

### datetime
- Used by modules: app, opening_balance, traceability, masters_common, sku_outbound, sku_management, masters_crud, expiry_utils, cost_management, package_sizes, blending, date_utils, inventory_utils, sku_production
- Files: 14
- Functions using this table:
  - calculate_expiry_date in puvi-backend/puvi-backend-main/utils/expiry_utils.py

### dateutil
- Used by modules: expiry_utils
- Files: 1

### days
- Used by modules: cost_management, sku_production
- Files: 2

### db_utils
- Used by modules: locations, app, opening_balance, system_config, customers, writeoff_analytics, masters_common, sku_outbound, sku_management, masters_crud, package_sizes, material_sales, purchase, blending, material_writeoff, cost_management, batch_production, sku_production
- Files: 18

### decimal
- Used by modules: locations, opening_balance, writeoff_analytics, masters_common, sku_outbound, validation, sku_management, masters_crud, expiry_utils, package_sizes, material_sales, purchase, blending, cost_management, inventory_utils, batch_production, sku_production
- Files: 17

### decimal_places
- Used by modules: masters_crud, masters_common
- Files: 2

### density_values
- Used by modules: system_config
- Files: 1

### dependencies
- Used by modules: masters_crud, masters_common, locations, sku_management
- Files: 4

### details
- Used by modules: locations
- Files: 1

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

### documentation_charges
- Used by modules: sku_outbound
- Files: 1

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
- Used by modules: db_utils, app, opening_balance, customers, sku_management, masters_crud, locations
- Files: 7

### existing
- Used by modules: opening_balance, traceability, sku_management, expiry_utils, package_sizes, cost_management, inventory_utils, batch_production
- Files: 8
- Functions using this table:
  - update_inventory in puvi-backend/puvi-backend-main/inventory_utils.py
  - get_next_batch_serial in puvi-backend/puvi-backend-main/utils/traceability.py
  - update_expiry_tracking in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - save_opening_balances in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - import_opening_balances in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - ... and 5 more

### expiry
- Used by modules: expiry_utils, sku_outbound
- Files: 2
- Functions using this table:
  - update_expiry_tracking in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - create_outbound in puvi-backend/puvi-backend-main/modules/sku_outbound.py

### expiry_details
- Used by modules: sku_production
- Files: 1

### expiry_status
- Used by modules: sku_outbound, sku_production
- Files: 2

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
- Used by modules: masters_crud, masters_common
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
- Used by modules: locations, app, opening_balance, system_config, customers, writeoff_analytics, sku_outbound, sku_management, masters_crud, package_sizes, material_sales, purchase, blending, material_writeoff, cost_management, batch_production, sku_production
- Files: 17

### flask_cors
- Used by modules: app
- Files: 1

### from_history
- Used by modules: sku_production
- Files: 1

### frontend
- Used by modules: batch_production, sku_production
- Files: 2
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py

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
- Used by modules: masters_crud, masters_common, locations
- Files: 3

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
  - refresh_writeoff_metrics in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
  - add_sku_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_oilcake_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - add_sludge_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - ... and 1 more

### in
- Used by modules: cost_management, package_sizes, sku_management
- Files: 3
- Functions using this table:
  - bulk_update_cost_elements in puvi-backend/puvi-backend-main/modules/cost_management.py
  - bulk_update_package_sizes in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - bulk_update_skus in puvi-backend/puvi-backend-main/modules/sku_management.py

### include_dependencies
- Used by modules: masters_crud
- Files: 1

### inventory
- Used by modules: db_utils, opening_balance, masters_crud, material_sales, purchase, blending, material_writeoff, inventory_utils, batch_production, sku_production
- Files: 12
- Functions using this table:
  - update_inventory in puvi-backend/puvi-backend-main/inventory_utils.py
  - initialize_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - close_financial_year in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - add_material_sale in puvi-backend/puvi-backend-main/modules/material_sales.py
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py
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
- Used by modules: material_writeoff, sku_outbound, purchase, sku_production
- Files: 4
- Functions using this table:
  - create_outbound in puvi-backend/puvi-backend-main/modules/sku_outbound.py

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

### loading_charges
- Used by modules: sku_outbound
- Files: 1

### location
- Used by modules: sku_outbound, locations
- Files: 2
- Functions using this table:
  - update_expiry_tracking_location in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - check_location_dependencies in puvi-backend/puvi-backend-main/modules/locations.py

### locations
- Used by modules: app, locations
- Files: 10

### locations_master
- Used by modules: app, sku_outbound, locations
- Files: 3
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - create_outbound in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - get_outbound_history in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - get_outbound_details in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - trace_batch in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - ... and 10 more

### low_confidence_suggestions
- Used by modules: masters_crud
- Files: 1

### mapped_materials
- Used by modules: masters_crud
- Files: 1

### margin_analysis
- Used by modules: sku_outbound
- Files: 1

### master_types
- Used by modules: masters_crud
- Files: 1

### masters
- Used by modules: app
- Files: 43

### masters_audit_log
- Used by modules: db_utils, masters_common, opening_balance
- Files: 3
- Functions using this table:
  - initialize_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - close_financial_year in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - log_audit in puvi-backend/puvi-backend-main/modules/masters_common.py

### masters_common
- Used by modules: masters_crud
- Files: 1

### material
- Used by modules: masters_crud, purchase, batch_production
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
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py
  - get_materials in puvi-backend/puvi-backend-main/modules/purchase.py
  - create_material in puvi-backend/puvi-backend-main/modules/purchase.py

### material_writeoffs
- Used by modules: db_utils, opening_balance, writeoff_analytics, masters_common, material_writeoff
- Files: 5
- Functions using this table:
  - get_system_status in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - initialize_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - get_writeoff_dashboard in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
  - get_writeoff_report in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py
  - ... and 7 more

### materials
- Used by modules: db_utils, app, opening_balance, system_config, traceability, writeoff_analytics, masters_common, sku_management, masters_crud, purchase, blending, material_writeoff, batch_production, sku_production
- Files: 27
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - generate_purchase_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py
  - generate_batch_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py
  - generate_batch_traceable_code_alternative in puvi-backend/puvi-backend-main/utils/traceability.py
  - get_materials_for_opening in puvi-backend/puvi-backend-main/modules/opening_balance.py
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
- Used by modules: masters_crud, app
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

### movements
- Used by modules: sku_outbound
- Files: 1

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
- Used by modules: opening_balance, writeoff_analytics, masters_common, sku_outbound, sku_management, material_sales, locations, material_writeoff, cost_management, sku_production
- Files: 10

### numbers
- Used by modules: masters_common
- Files: 1

### oil
- Used by modules: material_writeoff, sku_production
- Files: 9
- Functions using this table:
  - extract_variety_code_from_oil_source in puvi-backend/puvi-backend-main/modules/sku_production.py
  - add_oilcake_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py

### oil_allocations
- Used by modules: sku_production
- Files: 1

### oil_cake_inventory
- Used by modules: material_writeoff, db_utils, material_sales, batch_production
- Files: 5
- Functions using this table:
  - get_material_sales_inventory in puvi-backend/puvi-backend-main/modules/material_sales.py
  - add_material_sale in puvi-backend/puvi-backend-main/modules/material_sales.py
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - get_unified_writeoff_inventory in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_oilcake_for_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py
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
- Used by modules: system_config, material_sales, blending, material_writeoff, batch_production
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
- Used by modules: db_utils, opening_balance
- Files: 2
- Functions using this table:
  - get_system_status in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - get_materials_for_opening in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - save_opening_balances in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - initialize_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - close_financial_year in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - ... and 2 more

### operation
- Used by modules: locations, customers
- Files: 2
- Functions using this table:
  - validate_customer_data in puvi-backend/puvi-backend-main/modules/customers.py
  - validate_location_data in puvi-backend/puvi-backend-main/modules/locations.py

### options
- Used by modules: masters_crud, app, masters_common, package_sizes
- Files: 4

### origins
- Used by modules: app
- Files: 1

### orphaned_oil_types
- Used by modules: masters_crud
- Files: 1

### other_charges
- Used by modules: sku_outbound
- Files: 1

### outbound_transactions
- Used by modules: locations
- Files: 1

### outbounds
- Used by modules: app, sku_outbound
- Files: 2

### outsourced
- Used by modules: blending
- Files: 1
- Functions using this table:
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py

### ownership
- Used by modules: locations
- Files: 1

### package
- Used by modules: package_sizes
- Files: 1
- Functions using this table:
  - create_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - update_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - delete_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - bulk_update_package_sizes in puvi-backend/puvi-backend-main/modules/package_sizes.py

### package_sizes
- Used by modules: package_sizes, system_config
- Files: 2

### package_sizes_master
- Used by modules: db_utils, package_sizes, sku_production
- Files: 3
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - create_production_plan in puvi-backend/puvi-backend-main/modules/sku_production.py
  - get_package_sizes in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - get_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - create_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - ... and 5 more

### packing_costs
- Used by modules: sku_production
- Files: 1

### pages
- Used by modules: masters_crud, sku_management
- Files: 2

### parameters
- Used by modules: cost_management, sku_outbound
- Files: 2
- Functions using this table:
  - get_validation_report in puvi-backend/puvi-backend-main/modules/cost_management.py
  - get_sales_summary in puvi-backend/puvi-backend-main/modules/sku_outbound.py

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
- Used by modules: sku_management, app, sku_production
- Files: 3

### products
- Used by modules: masters_crud, db_utils
- Files: 2

### purchase
- Used by modules: purchase
- Files: 1
- Functions using this table:
  - add_purchase in puvi-backend/puvi-backend-main/modules/purchase.py

### purchase_items
- Used by modules: db_utils, masters_common, purchase, batch_production
- Files: 4
- Functions using this table:
  - get_seeds_for_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - add_batch in puvi-backend/puvi-backend-main/modules/batch_production.py
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py
  - add_purchase in puvi-backend/puvi-backend-main/modules/purchase.py
  - get_purchase_history in puvi-backend/puvi-backend-main/modules/purchase.py

### purchases
- Used by modules: db_utils, app, opening_balance, masters_common, purchase, blending, batch_production, sku_production
- Files: 12
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - get_system_status in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - initialize_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py
  - get_production_summary_report in puvi-backend/puvi-backend-main/modules/sku_production.py
  - ... and 4 more

### quantity_needed
- Used by modules: sku_outbound
- Files: 1

### query
- Used by modules: customers, masters_common, sku_management, masters_crud, package_sizes, locations
- Files: 6
- Functions using this table:
  - update_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py
  - soft_delete_record in puvi-backend/puvi-backend-main/modules/masters_common.py
  - restore_record in puvi-backend/puvi-backend-main/modules/masters_common.py
  - update_customer in puvi-backend/puvi-backend-main/modules/customers.py
  - update_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - ... and 4 more

### rates
- Used by modules: system_config, batch_production
- Files: 2

### readonly_fields
- Used by modules: masters_common
- Files: 1

### reasons
- Used by modules: material_writeoff, system_config
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

### reference_documents
- Used by modules: sku_outbound
- Files: 1

### remaining
- Used by modules: material_writeoff, sku_outbound
- Files: 2
- Functions using this table:
  - update_expiry_tracking_quantity in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - add_sku_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py

### report_period_days
- Used by modules: cost_management
- Files: 1

### request
- Used by modules: masters_crud, opening_balance
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
- Used by modules: app, masters_common, sku_outbound, material_sales
- Files: 4

### same
- Used by modules: traceability, sku_production
- Files: 2
- Functions using this table:
  - get_next_batch_serial in puvi-backend/puvi-backend-main/utils/traceability.py
  - generate_batch_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py
  - get_production_summary_report in puvi-backend/puvi-backend-main/modules/sku_production.py

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
- Used by modules: masters_crud, purchase, batch_production
- Files: 3

### sequence_sync_status
- Used by modules: app
- Files: 1

### serial_number_tracking
- Used by modules: traceability, opening_balance
- Files: 2
- Functions using this table:
  - get_next_serial in puvi-backend/puvi-backend-main/utils/traceability.py
  - close_financial_year in puvi-backend/puvi-backend-main/modules/opening_balance.py

### ses
- Used by modules: traceability
- Files: 1

### set
- Used by modules: traceability, sku_outbound, opening_balance
- Files: 3
- Functions using this table:
  - get_next_serial in puvi-backend/puvi-backend-main/utils/traceability.py
  - get_next_batch_serial in puvi-backend/puvi-backend-main/utils/traceability.py
  - configure_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - initialize_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - add_inventory_atomic in puvi-backend/puvi-backend-main/modules/sku_outbound.py

### settings
- Used by modules: config
- Files: 1

### shelf_life_months
- Used by modules: sku_management, sku_production
- Files: 2

### ship_to_locations
- Used by modules: customers
- Files: 1

### size_in_liters
- Used by modules: package_sizes
- Files: 1
- Functions using this table:
  - update_package_size in puvi-backend/puvi-backend-main/modules/package_sizes.py

### sku
- Used by modules: material_writeoff, system_config
- Files: 53
- Functions using this table:
  - get_config in puvi-backend/puvi-backend-main/modules/system_config.py
  - add_sku_writeoff in puvi-backend/puvi-backend-main/modules/material_writeoff.py

### sku_bom_details
- Used by modules: sku_management, db_utils, sku_production
- Files: 3
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - create_production_plan in puvi-backend/puvi-backend-main/modules/sku_production.py
  - delete_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - get_sku_bom in puvi-backend/puvi-backend-main/modules/sku_management.py
  - create_or_update_bom in puvi-backend/puvi-backend-main/modules/sku_management.py
  - ... and 1 more

### sku_bom_master
- Used by modules: sku_management, db_utils, sku_production
- Files: 3
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - create_production_plan in puvi-backend/puvi-backend-main/modules/sku_production.py
  - get_sku_master_list in puvi-backend/puvi-backend-main/modules/sku_management.py
  - get_single_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - delete_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - ... and 5 more

### sku_cost_overrides
- Used by modules: db_utils, sku_production
- Files: 2
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py

### sku_details
- Used by modules: sku_outbound
- Files: 1

### sku_expiry_tracking
- Used by modules: db_utils, sku_outbound, expiry_utils, locations, sku_production
- Files: 5
- Functions using this table:
  - check_near_expiry_items in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - update_expiry_tracking in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - get_fefo_allocation in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - get_expiry_alert_summary in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - get_production_history in puvi-backend/puvi-backend-main/modules/sku_production.py
  - ... and 4 more

### sku_inventory
- Used by modules: db_utils, sku_outbound, locations, material_writeoff, sku_production
- Files: 5
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - check_sku_availability in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - deplete_inventory_atomic in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - add_inventory_atomic in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - get_unified_writeoff_inventory in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - ... and 5 more

### sku_master
- Used by modules: db_utils, app, system_config, sku_outbound, sku_management, masters_crud, expiry_utils, package_sizes, material_writeoff, sku_production
- Files: 10
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - check_near_expiry_items in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - get_current_mrp in puvi-backend/puvi-backend-main/modules/sku_production.py
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - get_production_history in puvi-backend/puvi-backend-main/modules/sku_production.py
  - ... and 26 more

### sku_material_consumption
- Used by modules: db_utils, sku_production
- Files: 2
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - get_production_summary_report in puvi-backend/puvi-backend-main/modules/sku_production.py

### sku_mrp_history
- Used by modules: sku_management, db_utils, sku_production
- Files: 3
- Functions using this table:
  - get_mrp_history in puvi-backend/puvi-backend-main/modules/sku_production.py
  - get_current_mrp in puvi-backend/puvi-backend-main/modules/sku_production.py
  - create_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - update_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - delete_sku in puvi-backend/puvi-backend-main/modules/sku_management.py
  - ... and 1 more

### sku_oil_allocation
- Used by modules: db_utils, sku_production
- Files: 2
- Functions using this table:
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - get_production_summary_report in puvi-backend/puvi-backend-main/modules/sku_production.py
  - create_production_plan in puvi-backend/puvi-backend-main/modules/sku_production.py
  - allocate_oil_for_production in puvi-backend/puvi-backend-main/modules/sku_production.py

### sku_outbound
- Used by modules: locations, app, sku_outbound, customers
- Files: 4
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - generate_outbound_code in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - create_outbound in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - get_outbound_history in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - get_outbound_details in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - ... and 7 more

### sku_outbound_items
- Used by modules: sku_outbound
- Files: 1
- Functions using this table:
  - create_outbound in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - get_outbound_history in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - get_outbound_details in puvi-backend/puvi-backend-main/modules/sku_outbound.py
  - trace_batch in puvi-backend/puvi-backend-main/modules/sku_outbound.py

### sku_production
- Used by modules: db_utils, app, sku_outbound, sku_management, expiry_utils, material_writeoff, sku_production
- Files: 7
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - check_near_expiry_items in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - get_fefo_allocation in puvi-backend/puvi-backend-main/utils/expiry_utils.py
  - create_sku_production in puvi-backend/puvi-backend-main/modules/sku_production.py
  - get_production_history in puvi-backend/puvi-backend-main/modules/sku_production.py
  - ... and 9 more

### skus
- Used by modules: app, sku_management
- Files: 2

### sludge_details
- Used by modules: material_sales
- Files: 1

### source
- Used by modules: traceability, sku_outbound, blending
- Files: 3
- Functions using this table:
  - generate_blend_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py
  - create_blend in puvi-backend/puvi-backend-main/modules/blending.py
  - create_outbound in puvi-backend/puvi-backend-main/modules/sku_outbound.py

### special_validations
- Used by modules: masters_common
- Files: 1

### statistics
- Used by modules: masters_crud, app, writeoff_analytics, opening_balance
- Files: 4

### status
- Used by modules: app, opening_balance, sku_outbound, masters_crud, sku_production
- Files: 5
- Functions using this table:
  - update_outbound_status in puvi-backend/puvi-backend-main/modules/sku_outbound.py

### subcategories
- Used by modules: masters_crud, masters_common
- Files: 7

### subcategories_master
- Used by modules: db_utils, masters_common, masters_crud, purchase, blending
- Files: 5
- Functions using this table:
  - get_oil_types_for_blending in puvi-backend/puvi-backend-main/modules/blending.py
  - get_batches_for_oil_type in puvi-backend/puvi-backend-main/modules/blending.py
  - create_blend in puvi-backend/puvi-backend-main/modules/blending.py
  - get_blend_history in puvi-backend/puvi-backend-main/modules/blending.py
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py
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
- Used by modules: locations, app, opening_balance, system_config, customers, writeoff_analytics, sku_outbound, sku_management, masters_crud, expiry_utils, package_sizes, material_sales, purchase, blending, material_writeoff, cost_management, batch_production, sku_production
- Files: 18

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
- Used by modules: db_utils, app, opening_balance, system_config, traceability, masters_common, purchase, sku_production
- Files: 13
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - generate_purchase_traceable_code in puvi-backend/puvi-backend-main/utils/traceability.py
  - get_materials_for_opening in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - download_template in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - get_production_summary_report in puvi-backend/puvi-backend-main/modules/sku_production.py
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
- Used by modules: opening_balance, db_utils, app
- Files: 3
- Functions using this table:
  - system_info in puvi-backend/puvi-backend-main/app.py
  - get_system_status in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - configure_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - save_opening_balances in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - initialize_system in puvi-backend/puvi-backend-main/modules/opening_balance.py
  - ... and 2 more

### tags
- Used by modules: db_utils, masters_common, purchase
- Files: 3
- Functions using this table:
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py
  - get_materials in puvi-backend/puvi-backend-main/modules/purchase.py
  - create_material in puvi-backend/puvi-backend-main/modules/purchase.py
  - get_tags in puvi-backend/puvi-backend-main/modules/purchase.py

### the
- Used by modules: traceability, db_utils, cost_management, masters_crud
- Files: 4
- Functions using this table:
  - synchronize_all_sequences in puvi-backend/puvi-backend-main/db_utils.py
  - get_next_batch_serial in puvi-backend/puvi-backend-main/utils/traceability.py
  - extract_oil_type_from_code in puvi-backend/puvi-backend-main/utils/traceability.py
  - get_usage_stats in puvi-backend/puvi-backend-main/modules/cost_management.py
  - bulk_update_cost_elements in puvi-backend/puvi-backend-main/modules/cost_management.py
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

### total_transactions
- Used by modules: customers
- Files: 1

### total_units
- Used by modules: sku_outbound
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

### transaction_type
- Used by modules: sku_outbound
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

### unloading_charges
- Used by modules: sku_outbound
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
- Used by modules: db_utils, masters_common, system_config
- Files: 3
- Functions using this table:
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py
  - check_dependencies in puvi-backend/puvi-backend-main/modules/masters_common.py
  - validate_master_data in puvi-backend/puvi-backend-main/modules/masters_common.py
  - soft_delete_record in puvi-backend/puvi-backend-main/modules/masters_common.py
  - get_config in puvi-backend/puvi-backend-main/modules/system_config.py
  - ... and 1 more

### updates
- Used by modules: cost_management, package_sizes, sku_management
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
- Used by modules: locations, opening_balance, customers, writeoff_analytics, sku_outbound, sku_management, masters_crud, expiry_utils, material_sales, purchase, blending, material_writeoff, cost_management, batch_production, sku_production
- Files: 15

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
  - get_writeoff_impact in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
  - get_writeoff_dashboard in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
  - get_writeoff_impact in puvi-backend/puvi-backend-main/modules/material_writeoff.py
  - get_writeoff_dashboard in puvi-backend/puvi-backend-main/modules/material_writeoff.py

### writeoff_monthly_summary
- Used by modules: material_writeoff, writeoff_analytics
- Files: 2
- Functions using this table:
  - get_writeoff_trends in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
  - get_writeoff_dashboard in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
  - get_writeoff_trends in puvi-backend/puvi-backend-main/modules/material_writeoff.py

### writeoff_reasons
- Used by modules: material_writeoff, writeoff_analytics, masters_common, system_config
- Files: 6
- Functions using this table:
  - get_writeoff_dashboard in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
  - get_writeoff_report in puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
  - standardize_select_value in puvi-backend/puvi-backend-main/modules/masters_common.py
  - get_config in puvi-backend/puvi-backend-main/modules/system_config.py
  - get_writeoff_reasons in puvi-backend/puvi-backend-main/modules/system_config.py
  - ... and 3 more

### writeoffs
- Used by modules: material_writeoff, writeoff_analytics, opening_balance
- Files: 3

### year_end_closing
- Used by modules: db_utils, opening_balance
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

