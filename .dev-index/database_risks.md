# Database Dependency Risk Report

Generated: 2025-09-08 14:41:12.500585

## Tables with High Foreign Key Dependencies

### ⚠️ sku_outbound (4 foreign keys)
- ship_to_location_id → customer_ship_to_locations.ship_to_id (DELETE: NO ACTION, UPDATE: NO ACTION)
- from_location_id → locations_master.location_id (DELETE: NO ACTION, UPDATE: NO ACTION)
- to_location_id → locations_master.location_id (DELETE: NO ACTION, UPDATE: NO ACTION)
- customer_id → customers.customer_id (DELETE: NO ACTION, UPDATE: NO ACTION)

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
Foreign keys without indexes: material_id, product_id

### materials
Foreign keys without indexes: unit, subcategory_id

### oil_cake_sale_allocations
Foreign keys without indexes: sale_id, batch_id

### purchases
Foreign keys without indexes: supplier_id, material_id

### recipes
Foreign keys without indexes: material_id

### sku_cost_overrides
Foreign keys without indexes: element_id

### sku_material_consumption
Foreign keys without indexes: material_id

### sku_production
Foreign keys without indexes: bom_id

## Large Tables (Performance Considerations)

