# Database Dependency Risk Report

Generated: 2025-09-11 10:55:05.546269

## Tables with High Foreign Key Dependencies

### ⚠️ purchases (5 foreign keys)
- replaces → purchases.purchase_id (DELETE: NO ACTION, UPDATE: NO ACTION)
- material_id → materials.material_id (DELETE: NO ACTION, UPDATE: NO ACTION)
- reversed_by → purchases.purchase_id (DELETE: NO ACTION, UPDATE: NO ACTION)
- supplier_id → suppliers.supplier_id (DELETE: NO ACTION, UPDATE: NO ACTION)
- reversal_of → purchases.purchase_id (DELETE: NO ACTION, UPDATE: NO ACTION)

### ⚠️ sku_outbound (4 foreign keys)
- customer_id → customers.customer_id (DELETE: NO ACTION, UPDATE: NO ACTION)
- ship_to_location_id → customer_ship_to_locations.ship_to_id (DELETE: NO ACTION, UPDATE: NO ACTION)
- to_location_id → locations_master.location_id (DELETE: NO ACTION, UPDATE: NO ACTION)
- from_location_id → locations_master.location_id (DELETE: NO ACTION, UPDATE: NO ACTION)

## Tables with Missing Indexes

### batch
Foreign keys without indexes: seed_material_id, recipe_id

### cost_element_rate_history
Foreign keys without indexes: element_id

### cost_elements_master
Foreign keys without indexes: package_size_id

### cost_override_log
Foreign keys without indexes: element_id

### inventory
Foreign keys without indexes: product_id, material_id

### material_writeoffs
Foreign keys without indexes: reversal_of, reversed_by

### materials
Foreign keys without indexes: subcategory_id, unit

### oil_cake_sale_allocations
Foreign keys without indexes: batch_id, sale_id

### purchase_return_items
Foreign keys without indexes: return_id, original_item_id

### purchase_returns
Foreign keys without indexes: original_purchase_id

### purchases
Foreign keys without indexes: replaces, material_id, reversed_by, supplier_id, reversal_of

### recipes
Foreign keys without indexes: material_id

### sku_cost_overrides
Foreign keys without indexes: element_id

### sku_material_consumption
Foreign keys without indexes: material_id

### sku_production
Foreign keys without indexes: bom_id

## Large Tables (Performance Considerations)

