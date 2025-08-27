# Database Dependency Risk Report

Generated: 2025-08-27 01:37:34.977054

## Tables with High Foreign Key Dependencies

## Tables with Missing Indexes

### batch
Foreign keys without indexes: recipe_id, seed_material_id

### cost_element_rate_history
Foreign keys without indexes: element_id

### cost_elements_master
Foreign keys without indexes: package_size_id

### cost_override_log
Foreign keys without indexes: element_id

### inventory
Foreign keys without indexes: material_id, product_id

### materials
Foreign keys without indexes: subcategory_id, unit

### oil_cake_sale_allocations
Foreign keys without indexes: sale_id, batch_id

### purchases
Foreign keys without indexes: material_id, supplier_id

### recipes
Foreign keys without indexes: material_id

### sku_cost_overrides
Foreign keys without indexes: element_id

### sku_material_consumption
Foreign keys without indexes: material_id

### sku_production
Foreign keys without indexes: bom_id

## Large Tables (Performance Considerations)

