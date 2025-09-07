# Table Usage Issues

Generated: 2025-09-07 13:27:48.774904

## ⚠️ Orphaned Tables
These tables exist in database but are not used in any code:

- batch_cost_details_backup
- cost_elements_backup
- purchases_backup

## ❌ Phantom References
These tables are referenced in code but don't exist in database:

- a
  Files: puvi-backend/puvi-backend-main/utils/date_utils.py
- above
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- activecustomers
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- activities
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- actual
  Files: puvi-backend/puvi-backend-main/modules/material_writeoff.py
- actual_hours
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- address
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py, puvi-backend/puvi-backend-main/modules/customers.py, puvi-backend/puvi-backend-main/modules/locations.py
- age_days
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- alerts
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- allocations
  Files: puvi-backend/puvi-backend-main/utils/expiry_utils.py, puvi-backend/puvi-backend-main/modules/material_sales.py, puvi-backend/puvi-backend-main/modules/sku_production.py and 1 more
- allow_backdated_entries
  Files: puvi-backend/puvi-backend-main/modules/opening_balance.py
- allow_headers
  Files: puvi-backend/puvi-backend-main/app.py
- an
  Files: puvi-backend/puvi-backend-main/modules/customers.py, puvi-backend/puvi-backend-main/modules/sku_management.py, puvi-backend/puvi-backend-main/modules/masters_crud.py and 1 more
- any
  Files: puvi-backend/puvi-backend-main/utils/traceability.py
- app
  Files: puvi-backend/puvi-backend-main/wsgi.py
- april
  Files: puvi-backend/puvi-backend-main/utils/traceability.py
- args
  Files: puvi-backend/puvi-backend-main/modules/customers.py, puvi-backend/puvi-backend-main/modules/locations.py
- audit
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- available
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- available_batches
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- available_oil
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- available_oil_types
  Files: puvi-backend/puvi-backend-main/modules/batch_production.py, puvi-backend/puvi-backend-main/modules/system_config.py
- available_types
  Files: puvi-backend/puvi-backend-main/modules/blending.py
- base
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- batch_activities
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- batch_code
  Files: puvi-backend/puvi-backend-main/modules/blending.py
- batch_details
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- batches
  Files: puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/modules/opening_balance.py, puvi-backend/puvi-backend-main/modules/material_sales.py and 4 more
- batches_with_warnings
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- billed_hours
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- blends
  Files: puvi-backend/puvi-backend-main/modules/blending.py
- bom_categories
  Files: puvi-backend/puvi-backend-main/modules/system_config.py
- bottle_types
  Files: puvi-backend/puvi-backend-main/modules/system_config.py
- bottles
  Files: puvi-backend/puvi-backend-main/modules/system_config.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- byproduct_types
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py, puvi-frontend/puvi-frontend-main/src/services/api/index.js
- byproduct_writeoffs
  Files: puvi-backend/puvi-backend-main/modules/material_writeoff.py
- byproducts
  Files: puvi-backend/puvi-backend-main/modules/material_writeoff.py
- cake_details
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py
- calculate_writeoff_impact
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- cancelled
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- capabilities
  Files: puvi-backend/puvi-backend-main/modules/locations.py
- caps
  Files: puvi-backend/puvi-backend-main/modules/system_config.py
- categories
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py, puvi-backend/puvi-backend-main/modules/masters_common.py, puvi-backend/puvi-backend-main/modules/system_config.py and 7 more
- codes
  Files: puvi-backend/puvi-backend-main/utils/traceability.py
- completed
  Files: puvi-backend/puvi-backend-main/modules/sku_management.py
- completed_with_errors
  Files: puvi-backend/puvi-backend-main/app.py
- components
  Files: puvi-backend/puvi-backend-main/modules/blending.py
- config
  Files: puvi-backend/puvi-backend-main/db_utils.py, puvi-frontend/puvi-frontend-main/src/services/configService.js, puvi-frontend/puvi-frontend-main/src/services/api/index.js and 21 more
- configuration_status
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- configurations
  Files: puvi-backend/puvi-backend-main/modules/opening_balance.py
- configured_materials
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- cos
  Files: puvi-backend/puvi-backend-main/utils/traceability.py
- cost
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py, puvi-backend/puvi-backend-main/modules/package_sizes.py
- cost_details
  Files: puvi-backend/puvi-backend-main/modules/batch_production.py
- cost_element_usage_stats
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- cost_elements
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py, puvi-backend/puvi-backend-main/modules/batch_production.py, puvi-backend/puvi-backend-main/modules/masters_common.py and 22 more
- costcapture
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- costs
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py, puvi-backend/puvi-backend-main/modules/sku_outbound.py
- created_at
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- csv
  Files: puvi-backend/puvi-backend-main/modules/opening_balance.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- current
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- current_date
  Files: puvi-backend/puvi-backend-main/utils/expiry_utils.py, puvi-backend/puvi-backend-main/modules/sku_production.py
- database
  Files: puvi-backend/puvi-backend-main/utils/traceability.py, puvi-backend/puvi-backend-main/modules/blending.py, puvi-backend/puvi-backend-main/modules/cost_management.py and 6 more
- date
  Files: puvi-backend/puvi-backend-main/utils/traceability.py
- datetime
  Files: puvi-backend/puvi-backend-main/inventory_utils.py, puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/utils/traceability.py and 11 more
- dateutil
  Files: puvi-backend/puvi-backend-main/utils/expiry_utils.py
- days
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py, puvi-backend/puvi-backend-main/modules/sku_production.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- db_utils
  Files: puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/modules/opening_balance.py, puvi-backend/puvi-backend-main/modules/material_sales.py and 15 more
- decimal
  Files: puvi-backend/puvi-backend-main/inventory_utils.py, puvi-backend/puvi-backend-main/utils/validation.py, puvi-backend/puvi-backend-main/utils/expiry_utils.py and 14 more
- decimal_places
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- delivery_location_type
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- density_values
  Files: puvi-backend/puvi-backend-main/modules/system_config.py
- dependencies
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py, puvi-backend/puvi-backend-main/modules/sku_management.py, puvi-backend/puvi-backend-main/modules/masters_crud.py and 1 more
- details
  Files: puvi-backend/puvi-backend-main/modules/locations.py
- display
  Files: puvi-backend/puvi-backend-main/modules/package_sizes.py
- drying_loss
  Files: puvi-backend/puvi-backend-main/modules/batch_production.py
- endpoints
  Files: puvi-backend/puvi-backend-main/app.py
- entries
  Files: puvi-backend/puvi-backend-main/modules/opening_balance.py
- error_details
  Files: puvi-backend/puvi-backend-main/modules/opening_balance.py
- errors
  Files: puvi-backend/puvi-backend-main/db_utils.py, puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/modules/opening_balance.py and 4 more
- existing
  Files: puvi-backend/puvi-backend-main/inventory_utils.py, puvi-backend/puvi-backend-main/utils/traceability.py, puvi-backend/puvi-backend-main/utils/expiry_utils.py and 4 more
- expiry
  Files: puvi-backend/puvi-backend-main/utils/expiry_utils.py, puvi-backend/puvi-backend-main/modules/sku_outbound.py
- expiry_details
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- expiry_status
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py, puvi-backend/puvi-backend-main/modules/sku_outbound.py
- expiry_tracking_status
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- expose_headers
  Files: puvi-backend/puvi-backend-main/app.py
- extended_costs
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- failed_updates
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- features
  Files: puvi-backend/puvi-backend-main/app.py
- fields
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- finished_products
  Files: puvi-backend/puvi-backend-main/modules/material_writeoff.py
- first
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py, puvi-backend/puvi-backend-main/modules/purchase.py
- fixed_sequences
  Files: puvi-backend/puvi-backend-main/db_utils.py
- flask
  Files: puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/modules/opening_balance.py, puvi-backend/puvi-backend-main/modules/material_sales.py and 14 more
- flask_cors
  Files: puvi-backend/puvi-backend-main/app.py
- for
  Files: puvi-backend/puvi-backend-main/modules/sku_management.py
- from_history
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- frontend
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py, puvi-backend/puvi-backend-main/modules/batch_production.py
- global
  Files: puvi-backend/puvi-backend-main/app.py
- gns
  Files: puvi-backend/puvi-backend-main/utils/traceability.py
- grouped_batches
  Files: puvi-backend/puvi-backend-main/modules/blending.py
- gst
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- gst_rates
  Files: puvi-backend/puvi-backend-main/modules/system_config.py
- gst_status
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- gunny_bags
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py
- handling_charges
  Files: puvi-backend/puvi-backend-main/modules/purchase.py
- has_dependencies
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py, puvi-backend/puvi-backend-main/modules/masters_crud.py, puvi-backend/puvi-backend-main/modules/locations.py
- has_transactions
  Files: puvi-backend/puvi-backend-main/modules/opening_balance.py
- has_warnings
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- high_confidence_suggestions
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- hours
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- html
  Files: puvi-backend/puvi-backend-main/utils/date_utils.py
- if
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- impact
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- in
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py, puvi-backend/puvi-backend-main/modules/package_sizes.py, puvi-backend/puvi-backend-main/modules/sku_management.py and 1 more
- include_dependencies
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- inclusive
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- inventory_items
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- inventory_utils
  Files: puvi-backend/puvi-backend-main/modules/purchase.py
- is
  Files: puvi-backend/puvi-backend-main/modules/sku_management.py
- issues
  Files: puvi-backend/puvi-backend-main/modules/blending.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- items
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py, puvi-backend/puvi-backend-main/modules/sku_outbound.py, puvi-backend/puvi-backend-main/modules/purchase.py and 1 more
- javascript
  Files: puvi-backend/puvi-backend-main/utils/validation.py
- json_sort_keys
  Files: puvi-backend/puvi-backend-main/app.py
- keywords
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py, puvi-backend/puvi-backend-main/modules/system_config.py
- labels
  Files: puvi-backend/puvi-backend-main/modules/system_config.py
- labor_rates
  Files: puvi-backend/puvi-backend-main/modules/system_config.py
- last_updated
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- litres
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py
- location
  Files: puvi-backend/puvi-backend-main/utils/expiry_utils.py, puvi-backend/puvi-backend-main/modules/sku_outbound.py, puvi-backend/puvi-backend-main/modules/locations.py
- locations
  Files: puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/modules/sku_outbound.py, puvi-backend/puvi-backend-main/modules/locations.py and 8 more
- logistics_costs
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- low_confidence_suggestions
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- mapped_materials
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- margin_analysis
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- master_types
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- masters
  Files: puvi-backend/puvi-backend-main/app.py, puvi-frontend/puvi-frontend-main/src/index.js, puvi-frontend/puvi-frontend-main/src/index.js and 42 more
- masters_common
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- material
  Files: puvi-backend/puvi-backend-main/modules/batch_production.py, puvi-backend/puvi-backend-main/modules/purchase.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- material_categories
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py, puvi-backend/puvi-backend-main/modules/system_config.py
- material_details
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- material_name
  Files: puvi-backend/puvi-backend-main/modules/purchase.py
- material_requirements
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- material_sales
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py
- medium_confidence_suggestions
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- methods
  Files: puvi-backend/puvi-backend-main/app.py
- missing_activities
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- missing_costs
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- mixed_oil_types
  Files: puvi-backend/puvi-backend-main/modules/blending.py
- modules
  Files: puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- month_writeoffs
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- monthly
  Files: puvi-backend/puvi-backend-main/modules/material_writeoff.py
- movements
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- mrp_history
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- mus
  Files: puvi-backend/puvi-backend-main/utils/traceability.py
- net
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py
- net_loss
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- new_location_id
  Files: puvi-backend/puvi-backend-main/utils/expiry_utils.py
- nos
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py
- notes
  Files: puvi-backend/puvi-backend-main/modules/opening_balance.py, puvi-backend/puvi-backend-main/modules/material_sales.py, puvi-backend/puvi-backend-main/modules/cost_management.py and 6 more
- numbers
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py
- oil
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py, puvi-frontend/puvi-frontend-main/src/components/Masters/OilConfigurationDashboard.jsx and 6 more
- oil_allocations
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- oil_cake_rate_master
  Files: puvi-backend/puvi-backend-main/modules/batch_production.py
- oil_products
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- oil_sources
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- oil_subcategory
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- oil_to_product
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- oil_types
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py, puvi-backend/puvi-backend-main/modules/blending.py, puvi-backend/puvi-backend-main/modules/batch_production.py and 4 more
- oil_yield
  Files: puvi-backend/puvi-backend-main/modules/blending.py
- oldest_stock_days
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- opening
  Files: puvi-backend/puvi-backend-main/modules/opening_balance.py
- operation
  Files: puvi-backend/puvi-backend-main/modules/customers.py, puvi-backend/puvi-backend-main/modules/locations.py
- options
  Files: puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/modules/package_sizes.py, puvi-backend/puvi-backend-main/modules/masters_common.py and 1 more
- origins
  Files: puvi-backend/puvi-backend-main/app.py
- orphaned_oil_types
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- outbound_transactions
  Files: puvi-backend/puvi-backend-main/modules/locations.py
- outbounds
  Files: puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/modules/sku_outbound.py
- outsourced
  Files: puvi-backend/puvi-backend-main/modules/blending.py
- ownership
  Files: puvi-backend/puvi-backend-main/modules/locations.py
- package
  Files: puvi-backend/puvi-backend-main/modules/package_sizes.py, puvi-backend/puvi-backend-main/modules/sku_management.py
- package_sizes
  Files: puvi-backend/puvi-backend-main/modules/package_sizes.py, puvi-backend/puvi-backend-main/modules/system_config.py
- packaged
  Files: puvi-backend/puvi-backend-main/modules/sku_management.py
- packing_costs
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- pages
  Files: puvi-backend/puvi-backend-main/modules/sku_management.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- parameters
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py, puvi-backend/puvi-backend-main/modules/sku_outbound.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- pendingdeliveries
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- prev_month_writeoffs
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- previous
  Files: puvi-backend/puvi-backend-main/modules/blending.py
- process_loss
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- product
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- product_details
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- production
  Files: puvi-backend/puvi-backend-main/utils/expiry_utils.py
- production_date
  Files: puvi-backend/puvi-backend-main/modules/batch_production.py
- production_details
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- production_stats
  Files: puvi-backend/puvi-backend-main/modules/sku_management.py
- productions
  Files: puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/modules/sku_production.py, puvi-backend/puvi-backend-main/modules/sku_management.py
- purchase
  Files: puvi-backend/puvi-backend-main/modules/purchase.py
- quantity_needed
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- query
  Files: puvi-backend/puvi-backend-main/modules/package_sizes.py, puvi-backend/puvi-backend-main/modules/masters_common.py, puvi-backend/puvi-backend-main/modules/customers.py and 3 more
- r
  Files: puvi-backend/puvi-backend-main/app.py
- rate
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- rates
  Files: puvi-backend/puvi-backend-main/modules/batch_production.py, puvi-backend/puvi-backend-main/modules/system_config.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- readonly_fields
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py
- reasons
  Files: puvi-backend/puvi-backend-main/modules/system_config.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- recent_writeoffs
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- recommendations
  Files: puvi-backend/puvi-backend-main/modules/sku_management.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- record
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- records
  Files: puvi-backend/puvi-backend-main/utils/expiry_utils.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- reference_documents
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- remaining
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- report_period_days
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- request
  Files: puvi-backend/puvi-backend-main/modules/opening_balance.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- required_elements
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- results
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- rounded_hours
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- sales
  Files: puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/modules/material_sales.py, puvi-backend/puvi-backend-main/modules/sku_outbound.py and 1 more
- same
  Files: puvi-backend/puvi-backend-main/utils/traceability.py, puvi-backend/puvi-backend-main/modules/sku_production.py
- saved_costs
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- search_fields
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- searchable_fields
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- seed
  Files: puvi-backend/puvi-backend-main/utils/traceability.py
- seed_configurations
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- seed_to_oil
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- seed_varieties
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- seeds
  Files: puvi-backend/puvi-backend-main/modules/batch_production.py, puvi-backend/puvi-backend-main/modules/purchase.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- sequence_sync_status
  Files: puvi-backend/puvi-backend-main/app.py
- ses
  Files: puvi-backend/puvi-backend-main/utils/traceability.py
- set
  Files: puvi-backend/puvi-backend-main/utils/traceability.py, puvi-backend/puvi-backend-main/modules/opening_balance.py, puvi-backend/puvi-backend-main/modules/sku_outbound.py
- settings
  Files: puvi-backend/puvi-backend-main/config.py
- shelf_life_months
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py, puvi-backend/puvi-backend-main/modules/sku_management.py
- ship_to_locations
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py, puvi-backend/puvi-backend-main/modules/customers.py
- size_in_liters
  Files: puvi-backend/puvi-backend-main/modules/package_sizes.py
- sku
  Files: puvi-backend/puvi-backend-main/modules/system_config.py, puvi-backend/puvi-backend-main/modules/sku_outbound.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py and 54 more
- sku_details
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- skus
  Files: puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/modules/sku_management.py
- sludge_details
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py
- source
  Files: puvi-backend/puvi-backend-main/utils/traceability.py, puvi-backend/puvi-backend-main/modules/blending.py, puvi-backend/puvi-backend-main/modules/sku_outbound.py
- special_validations
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py
- static
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py
- statistics
  Files: puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/modules/opening_balance.py, puvi-backend/puvi-backend-main/modules/writeoff_analytics.py and 1 more
- stats
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- status
  Files: puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/modules/opening_balance.py, puvi-backend/puvi-backend-main/modules/sku_production.py and 2 more
- subcategories
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py, puvi-backend/puvi-backend-main/modules/masters_crud.py, puvi-frontend/puvi-frontend-main/src/services/api/index.js and 4 more
- subcategory
  Files: puvi-backend/puvi-backend-main/modules/purchase.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- subcategory_code
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- subcategory_name
  Files: puvi-backend/puvi-backend-main/modules/blending.py
- success
  Files: puvi-backend/puvi-backend-main/app.py, puvi-backend/puvi-backend-main/utils/expiry_utils.py, puvi-backend/puvi-backend-main/modules/opening_balance.py and 15 more
- successful_updates
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- suggestions
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- supplier
  Files: puvi-backend/puvi-backend-main/utils/traceability.py
- supports_credentials
  Files: puvi-backend/puvi-backend-main/app.py
- system
  Files: puvi-backend/puvi-backend-main/modules/opening_balance.py, puvi-frontend/puvi-frontend-main/src/index.js, puvi-frontend/puvi-frontend-main/src/index.js
- the
  Files: puvi-backend/puvi-backend-main/db_utils.py, puvi-backend/puvi-backend-main/utils/traceability.py, puvi-backend/puvi-backend-main/modules/cost_management.py and 1 more
- this
  Files: puvi-backend/puvi-backend-main/utils/traceability.py, puvi-backend/puvi-backend-main/utils/expiry_utils.py
- time
  Files: puvi-backend/puvi-backend-main/modules/batch_production.py
- time_costs
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- timestamps
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- top_reasons
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- total_batches
  Files: puvi-backend/puvi-backend-main/modules/batch_production.py
- total_batches_with_warnings
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- total_blends
  Files: puvi-backend/puvi-backend-main/modules/blending.py
- total_bottles
  Files: puvi-backend/puvi-backend-main/modules/sku_management.py
- total_cost_adjustments
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py
- total_costs
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- total_dependent_records
  Files: puvi-backend/puvi-backend-main/modules/masters_common.py
- total_elements
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- total_entries
  Files: puvi-backend/puvi-backend-main/modules/opening_balance.py
- total_events
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- total_extended_costs
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- total_hours
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- total_issues
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- total_loss
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- total_materials
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- total_modules
  Files: puvi-backend/puvi-backend-main/app.py
- total_net_loss
  Files: puvi-backend/puvi-backend-main/modules/material_writeoff.py
- total_oil_products
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- total_overrides
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- total_productions
  Files: puvi-backend/puvi-backend-main/modules/sku_management.py
- total_purchases
  Files: puvi-backend/puvi-backend-main/modules/purchase.py
- total_sales
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py
- total_seed_varieties
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- total_skus
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- total_transactions
  Files: puvi-backend/puvi-backend-main/modules/customers.py
- total_units
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- total_uses
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- total_writeoffs
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- totalsales
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- totaltransfers
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- traceability
  Files: puvi-backend/puvi-backend-main/modules/sku_production.py
- traceable_codes
  Files: puvi-backend/puvi-backend-main/modules/purchase.py
- tracking
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- transaction_counts
  Files: puvi-backend/puvi-backend-main/modules/opening_balance.py
- transaction_type
  Files: puvi-backend/puvi-backend-main/modules/sku_outbound.py
- transactions
  Files: puvi-backend/puvi-backend-main/app.py
- transport_charges
  Files: puvi-backend/puvi-backend-main/modules/purchase.py
- trends
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- unique_buyers
  Files: puvi-backend/puvi-backend-main/modules/material_sales.py
- unique_materials
  Files: puvi-backend/puvi-backend-main/modules/purchase.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- unique_reasons
  Files: puvi-backend/puvi-backend-main/modules/material_writeoff.py
- unique_suppliers
  Files: puvi-backend/puvi-backend-main/modules/purchase.py
- units
  Files: puvi-backend/puvi-backend-main/modules/system_config.py
- unmapped_oil_products
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- unmapped_seed_varieties
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- uom
  Files: puvi-backend/puvi-backend-main/modules/system_config.py
- update_query
  Files: puvi-backend/puvi-backend-main/utils/expiry_utils.py
- updates
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py, puvi-backend/puvi-backend-main/modules/package_sizes.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- usage_stats
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py, puvi-backend/puvi-backend-main/modules/masters_crud.py
- user
  Files: puvi-backend/puvi-backend-main/utils/traceability.py
- utils
  Files: puvi-backend/puvi-backend-main/utils/expiry_utils.py, puvi-backend/puvi-backend-main/modules/opening_balance.py, puvi-backend/puvi-backend-main/modules/material_sales.py and 12 more
- v_writeoff_trends
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- validation
  Files: puvi-backend/puvi-backend-main/modules/package_sizes.py
- validation_issues
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- values
  Files: puvi-backend/puvi-backend-main/modules/system_config.py
- various
  Files: puvi-backend/puvi-backend-main/utils/date_utils.py
- view
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- warnings
  Files: puvi-backend/puvi-backend-main/modules/cost_management.py
- weight
  Files: puvi-backend/puvi-backend-main/modules/sku_management.py
- weight_updates
  Files: puvi-backend/puvi-backend-main/modules/sku_management.py
- with
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- witness
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- writeoff_analytics
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- writeoff_details
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
- writeoffs
  Files: puvi-backend/puvi-backend-main/modules/opening_balance.py, puvi-backend/puvi-backend-main/modules/writeoff_analytics.py, puvi-backend/puvi-backend-main/modules/material_writeoff.py
- yes
  Files: puvi-backend/puvi-backend-main/modules/masters_crud.py
- ytd_writeoffs
  Files: puvi-backend/puvi-backend-main/modules/writeoff_analytics.py
