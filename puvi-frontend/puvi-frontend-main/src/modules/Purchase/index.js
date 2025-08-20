// File Path: puvi-frontend/puvi-frontend-main/src/modules/Purchase/index.js
// Purchase Module with Category/Subcategory Support for Dynamic Oil Types
// Enhanced with material creation form and category validation

import React, { useState, useEffect } from 'react';
import api, { purchaseAPI, mastersAPI } from '../../services/api';
import './Purchase.css';

const Purchase = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  
  // NEW: Material creation form state
  const [newMaterial, setNewMaterial] = useState({
    material_name: '',
    supplier_id: '',
    category: '',
    subcategory_id: null,
    unit: 'kg',
    current_cost: '',
    gst_rate: '5',
    density: '0.91',
    short_code: ''
  });
  
  const [invoiceData, setInvoiceData] = useState({
    supplier_id: '',
    invoice_ref: '',
    purchase_date: new Date().toISOString().split('T')[0],
    transport_cost: '0',
    handling_charges: '0'
  });
  
  const [items, setItems] = useState([{
    material_id: '',
    quantity: '',
    rate: '',
    gst_rate: '',
    transport_charges: '0',
    handling_charges: '0'
  }]);
  
  const [uomGroups, setUomGroups] = useState({
    kg: { percentage: 100, items: [] },
    L: { percentage: 0, items: [] },
    Nos: { percentage: 0, items: [] }
  });
  
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
    fetchCategories(); // NEW: Fetch categories on load
  }, []);

  // NEW: Fetch categories from API  
  const fetchCategories = async () => {
    try {
      let data;
      
      // Use the masters API to get categories
      if (api?.masters?.getCategories) {
        console.log('Using api.masters.getCategories');
        data = await api.masters.getCategories();
      } else {
        // Direct fetch as fallback
        console.log('Using direct fetch for categories');
        const url = 'https://puvi-backend.onrender.com/api/categories';
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        data = await res.json();
      }
      
      console.log('Categories response:', data);
      
      if (data?.success || data?.categories) {
        setCategories(data.categories || data.data || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // NEW: Fetch subcategories for a specific category
  const fetchSubcategories = async (categoryId) => {
    try {
      let data;
      
      // Use the masters API to get subcategories
      if (api?.masters?.getSubcategories) {
        console.log('Using api.masters.getSubcategories');
        data = await api.masters.getSubcategories(categoryId);
      } else {
        // Direct fetch as fallback
        console.log('Using direct fetch for subcategories');
        const url = `https://puvi-backend.onrender.com/api/subcategories?category_id=${categoryId}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        data = await res.json();
      }
      
      if (data?.success || data?.subcategories) {
        setSubcategories(data.subcategories || []);
      }
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      let response;
      
      // Use purchase API to get suppliers
      if (api?.purchase?.getSuppliers) {
        console.log('Using api.purchase.getSuppliers');
        response = await api.purchase.getSuppliers();
      } else if (purchaseAPI?.getSuppliers) {
        console.log('Using purchaseAPI.getSuppliers');
        response = await purchaseAPI.getSuppliers();
      } else {
        // Direct fetch as fallback
        console.log('Using direct fetch for suppliers');
        const url = 'https://puvi-backend.onrender.com/api/suppliers';
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        response = await res.json();
      }
      
      console.log('Suppliers response:', response);
      
      if (response) {
        setSuppliers(response.suppliers || []);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setMessage(`Error loading suppliers: ${error.message}`);
    }
  };

  const fetchMaterialsForSupplier = async (supplierId) => {
    try {
      let response;
      
      // Use purchase API to get materials
      if (api?.purchase?.getMaterials) {
        console.log('Using api.purchase.getMaterials');
        response = await api.purchase.getMaterials({ supplier_id: supplierId });
      } else if (purchaseAPI?.getMaterials) {
        console.log('Using purchaseAPI.getMaterials');
        response = await purchaseAPI.getMaterials({ supplier_id: supplierId });
      } else {
        // Direct fetch as fallback
        console.log('Using direct fetch for materials');
        const url = `https://puvi-backend.onrender.com/api/materials?supplier_id=${supplierId}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        response = await res.json();
      }
      
      console.log('Materials response:', response);
      
      if (response) {
        setMaterials(response.materials || []);
      }
    } catch (error) {
      console.error('Error loading materials:', error);
      setMessage(`Error loading materials: ${error.message}`);
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      let response;
      
      // Direct fetch for purchase history as it's not in the API exports
      const url = 'https://puvi-backend.onrender.com/api/purchase_history?limit=20';
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      response = await res.json();
      
      if (response) {
        setPurchaseHistory(response.purchases || []);
      }
    } catch (error) {
      setMessage(`Error loading purchase history: ${error.message}`);
    }
  };

  const handleSupplierChange = (e) => {
    const supplierId = e.target.value;
    setSelectedSupplier(supplierId);
    setInvoiceData({ ...invoiceData, supplier_id: supplierId });
    
    // Update new material form supplier too
    setNewMaterial({ ...newMaterial, supplier_id: supplierId });
    
    // Reset items when supplier changes
    setItems([{
      material_id: '',
      quantity: '',
      rate: '',
      gst_rate: '',
      transport_charges: '0',
      handling_charges: '0'
    }]);
    
    // Clear materials first, then fetch if supplier selected
    setMaterials([]);
    
    if (supplierId) {
      fetchMaterialsForSupplier(supplierId);
    }
  };

  // NEW: Handle category change in material form
  const handleCategoryChange = async (categoryName) => {
    setNewMaterial({ 
      ...newMaterial, 
      category: categoryName,
      subcategory_id: null // Reset subcategory when category changes
    });
    
    // Check if this category requires subcategory
    const category = categories.find(c => c.category_name === categoryName);
    if (category && category.requires_subcategory) {
      await fetchSubcategories(category.category_id);
    } else {
      setSubcategories([]); // Clear subcategories if not required
    }
  };

  // NEW: Create new material
  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    
    // Validation
    const category = categories.find(c => c.category_name === newMaterial.category);
    if (category && category.requires_subcategory && !newMaterial.subcategory_id) {
      setMessage(`❌ Category "${newMaterial.category}" requires a subcategory selection`);
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      let data;
      
      // Try to create material through API (POST /api/materials)
      // The purchase module doesn't have a createMaterial method, so we use direct fetch
      const url = 'https://puvi-backend.onrender.com/api/materials';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaterial)
      });
      data = await res.json();
      
      if (data?.success) {
        setMessage(`✅ Material "${newMaterial.material_name}" created successfully!`);
        
        // Refresh materials list
        if (selectedSupplier) {
          await fetchMaterialsForSupplier(selectedSupplier);
        }
        
        // Reset form
        setNewMaterial({
          material_name: '',
          supplier_id: selectedSupplier,
          category: '',
          subcategory_id: null,
          unit: 'kg',
          current_cost: '',
          gst_rate: '5',
          density: '0.91',
          short_code: ''
        });
        setSubcategories([]);
        setShowMaterialForm(false);
      } else {
        setMessage(`❌ Error: ${data?.error || 'Failed to create material'}`);
      }
    } catch (error) {
      setMessage(`❌ Error creating material: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData({ ...invoiceData, [name]: value });
    
    // Trigger allocation when transport or handling charges change
    if (name === 'transport_cost' || name === 'handling_charges') {
      setTimeout(() => allocateCharges(), 100);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto-fill GST rate when material is selected
    if (field === 'material_id') {
      const material = materials.find(m => m.material_id === parseInt(value));
      if (material) {
        newItems[index].rate = material.current_cost.toString();
        newItems[index].gst_rate = material.gst_rate.toString();
      }
    }
    
    setItems(newItems);
    
    // Trigger allocation when quantity or material changes
    if (field === 'material_id' || field === 'quantity') {
      setTimeout(() => allocateCharges(), 100);
    }
  };

  const addItem = () => {
    setItems([...items, {
      material_id: '',
      quantity: '',
      rate: '',
      gst_rate: '',
      transport_charges: '0',
      handling_charges: '0'
    }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      // Recalculate after removing
      setTimeout(() => allocateCharges(), 100);
    }
  };

  const getMaterialUnit = (materialId) => {
    const material = materials.find(m => m.material_id === parseInt(materialId));
    return material ? material.unit : '';
  };

  // ENHANCED: Get material display with oil type
  const getMaterialDisplay = (material) => {
    let display = material.material_name;
    if (material.short_code) {
      display += ` (${material.short_code})`;
    }
    // Show oil type for Oil category materials
    if (material.oil_type) {
      display += ` [${material.oil_type}]`;
    }
    return display;
  };

  const allocateCharges = () => {
    // Group items by UOM
    const groups = { kg: [], L: [], Nos: [] };
    
    items.forEach((item, index) => {
      if (item.material_id && item.quantity) {
        const unit = getMaterialUnit(item.material_id);
        const groupKey = unit === 'kg' ? 'kg' : unit === 'L' || unit === 'Liters' ? 'L' : 'Nos';
        groups[groupKey].push({ index, quantity: parseFloat(item.quantity) || 0 });
      }
    });

    // Calculate allocations
    const transportTotal = parseFloat(invoiceData.transport_cost) || 0;
    const handlingTotal = parseFloat(invoiceData.handling_charges) || 0;

    const newItems = [...items];

    Object.keys(groups).forEach(groupKey => {
      const groupItems = groups[groupKey];
      const groupPercentage = uomGroups[groupKey].percentage / 100;
      const groupTransport = transportTotal * groupPercentage;
      const groupHandling = handlingTotal * groupPercentage;
      
      const totalQuantity = groupItems.reduce((sum, item) => sum + item.quantity, 0);
      
      groupItems.forEach(({ index, quantity }) => {
        if (totalQuantity > 0) {
          const proportion = quantity / totalQuantity;
          newItems[index].transport_charges = (groupTransport * proportion).toFixed(2);
          newItems[index].handling_charges = (groupHandling * proportion).toFixed(2);
        }
      });
    });

    setItems(newItems);
  };

  const handleGroupPercentageChange = (group, value) => {
    const newPercentage = parseFloat(value) || 0;
    const newGroups = { ...uomGroups };
    newGroups[group].percentage = newPercentage;
    
    // Calculate total percentage
    const total = Object.values(newGroups).reduce((sum, g) => sum + g.percentage, 0);
    
    if (total <= 100) {
      setUomGroups(newGroups);
      // Recalculate allocation when percentage changes
      setTimeout(() => allocateCharges(), 100);
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalGst = 0;
    let totalAllocatedTransport = 0;
    let totalAllocatedHandling = 0;

    items.forEach(item => {
      if (item.quantity && item.rate) {
        const amount = parseFloat(item.quantity) * parseFloat(item.rate);
        const itemTransport = parseFloat(item.transport_charges) || 0;
        const itemHandling = parseFloat(item.handling_charges) || 0;
        const taxableAmount = amount + itemTransport + itemHandling;
        const gstAmount = taxableAmount * (parseFloat(item.gst_rate) || 0) / 100;
        
        subtotal += amount;
        totalGst += gstAmount;
        totalAllocatedTransport += itemTransport;
        totalAllocatedHandling += itemHandling;
      }
    });

    const transportCost = parseFloat(invoiceData.transport_cost) || 0;
    const handlingCharges = parseFloat(invoiceData.handling_charges) || 0;
    
    const grandTotal = subtotal + totalGst + transportCost + handlingCharges;

    return {
      subtotal: subtotal.toFixed(2),
      totalGst: totalGst.toFixed(2),
      transportCost: transportCost.toFixed(2),
      handlingCharges: handlingCharges.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      totalAllocatedTransport: totalAllocatedTransport.toFixed(2),
      totalAllocatedHandling: totalAllocatedHandling.toFixed(2)
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!invoiceData.supplier_id || !invoiceData.invoice_ref) {
      setMessage('Please select supplier and enter invoice reference');
      return;
    }

    const validItems = items.filter(item => 
      item.material_id && item.quantity && item.rate
    );

    if (validItems.length === 0) {
      setMessage('Please add at least one item with quantity and rate');
      return;
    }

    // Validate transport and handling allocation
    const totals = calculateTotals();
    const transportCost = parseFloat(invoiceData.transport_cost) || 0;
    const handlingCharges = parseFloat(invoiceData.handling_charges) || 0;
    const allocatedTransport = parseFloat(totals.totalAllocatedTransport) || 0;
    const allocatedHandling = parseFloat(totals.totalAllocatedHandling) || 0;
    
    // Check if there's a mismatch in allocation (tolerance of 0.01 for rounding)
    if (transportCost > 0 && Math.abs(transportCost - allocatedTransport) > 0.01) {
      setMessage(`❌ Transport cost allocation mismatch! 
Total Transport: ₹${transportCost.toFixed(2)} 
Allocated to items: ₹${allocatedTransport.toFixed(2)}
Please ensure UOM allocation totals 100% and all items have proper units.`);
      return;
    }
    
    if (handlingCharges > 0 && Math.abs(handlingCharges - allocatedHandling) > 0.01) {
      setMessage(`❌ Handling charges allocation mismatch! 
Total Handling: ₹${handlingCharges.toFixed(2)} 
Allocated to items: ₹${allocatedHandling.toFixed(2)}
Please ensure UOM allocation totals 100% and all items have proper units.`);
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const payload = {
        ...invoiceData,
        items: validItems.map(item => ({
          material_id: parseInt(item.material_id),
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate),
          gst_rate: parseFloat(item.gst_rate),
          transport_charges: parseFloat(item.transport_charges),
          handling_charges: parseFloat(item.handling_charges)
        }))
      };

      let response;
      
      // Use purchaseAPI.create if available
      if (api?.purchase?.create) {
        response = await api.purchase.create(payload);
      } else if (purchaseAPI?.create) {
        response = await purchaseAPI.create(payload);
      } else {
        // Direct fetch as fallback
        const url = 'https://puvi-backend.onrender.com/api/add_purchase';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        response = await res.json();
      }
      
      if (response && response.traceable_codes) {
        setMessage(`✅ Purchase recorded successfully! 
Invoice: ${response.invoice_ref}
Total: ₹${response.total_cost}
Items: ${response.items_count}
Traceable Codes: ${response.traceable_codes.join(', ')}`);
      } else if (response) {
        setMessage(`✅ Purchase recorded successfully! 
Invoice: ${response.invoice_ref}
Total: ₹${response.total_cost}
Items: ${response.items_count}`);
      }
      
      // Reset form
      setInvoiceData({
        supplier_id: '',
        invoice_ref: '',
        purchase_date: new Date().toISOString().split('T')[0],
        transport_cost: '0',
        handling_charges: '0'
      });
      setItems([{
        material_id: '',
        quantity: '',
        rate: '',
        gst_rate: '',
        transport_charges: '0',
        handling_charges: '0'
      }]);
      setSelectedSupplier('');
      
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();
  const totalPercentage = Object.values(uomGroups).reduce((sum, g) => sum + g.percentage, 0);

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  // Check if current category requires subcategory
  const currentCategoryRequiresSubcategory = () => {
    const category = categories.find(c => c.category_name === newMaterial.category);
    return category && category.requires_subcategory;
  };

  return (
    <div className="purchase-module">
      <div className="module-header">
        <h2 className="module-title">Purchase Entry – Multi Item</h2>
        <div className="header-actions">
          <button 
            className="btn-secondary"
            onClick={() => setShowMaterialForm(!showMaterialForm)}
            disabled={!selectedSupplier}
            title={!selectedSupplier ? "Select a supplier first" : "Create new material"}
          >
            {showMaterialForm ? 'Hide Material Form' : '+ New Material'}
          </button>
          <button 
            className="btn-secondary"
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory && purchaseHistory.length === 0) {
                fetchPurchaseHistory();
              }
            }}
          >
            {showHistory ? 'Hide History' : 'View History'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* NEW: Material Creation Form */}
      {showMaterialForm && selectedSupplier && (
        <div className="form-card material-form">
          <h3 className="section-title">Create New Material</h3>
          <form onSubmit={handleCreateMaterial} className="material-creation-form">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Material Name *</label>
                <input
                  type="text"
                  value={newMaterial.material_name}
                  onChange={(e) => setNewMaterial({...newMaterial, material_name: e.target.value})}
                  required
                  className="form-control"
                  placeholder="e.g., Groundnut Oil Premium"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  value={newMaterial.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  required
                  className="form-control"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.category_id} value={cat.category_name}>
                      {cat.category_name}
                      {cat.requires_subcategory && ' (requires subcategory)'}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Show subcategory dropdown if category requires it */}
              {currentCategoryRequiresSubcategory() && (
                <div className="form-group">
                  <label className="form-label">Subcategory *</label>
                  <select
                    value={newMaterial.subcategory_id || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, subcategory_id: parseInt(e.target.value)})}
                    required
                    className="form-control"
                  >
                    <option value="">Select Subcategory</option>
                    {subcategories.map(subcat => (
                      <option key={subcat.subcategory_id} value={subcat.subcategory_id}>
                        {subcat.subcategory_name}
                        {subcat.oil_type && ` (Oil Type: ${subcat.oil_type})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Unit *</label>
                <select
                  value={newMaterial.unit}
                  onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                  required
                  className="form-control"
                >
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="Nos">Nos</option>
                  <option value="Pcs">Pcs</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Current Cost (₹) *</label>
                <input
                  type="number"
                  value={newMaterial.current_cost}
                  onChange={(e) => setNewMaterial({...newMaterial, current_cost: e.target.value})}
                  required
                  step="0.01"
                  className="form-control"
                  placeholder="0.00"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">GST Rate (%) *</label>
                <select
                  value={newMaterial.gst_rate}
                  onChange={(e) => setNewMaterial({...newMaterial, gst_rate: e.target.value})}
                  required
                  className="form-control"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Density</label>
                <input
                  type="number"
                  value={newMaterial.density}
                  onChange={(e) => setNewMaterial({...newMaterial, density: e.target.value})}
                  step="0.01"
                  className="form-control"
                  placeholder="0.91"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Short Code</label>
                <input
                  type="text"
                  value={newMaterial.short_code}
                  onChange={(e) => setNewMaterial({...newMaterial, short_code: e.target.value})}
                  maxLength="6"
                  className="form-control"
                  placeholder="Auto-generated if empty"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Material'}
              </button>
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setShowMaterialForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!showHistory ? (
        <form onSubmit={handleSubmit} className="purchase-form">
          {/* Invoice Details Section */}
          <div className="form-card">
            <h3 className="section-title">Invoice Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Supplier *</label>
                <select 
                  value={selectedSupplier}
                  onChange={handleSupplierChange}
                  required
                  className="form-control"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.supplier_id} value={supplier.supplier_id}>
                      {supplier.supplier_name} 
                      {supplier.short_code && ` (${supplier.short_code})`}
                      {` - ${supplier.material_count} materials`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Invoice Reference *</label>
                <input
                  type="text"
                  name="invoice_ref"
                  value={invoiceData.invoice_ref}
                  onChange={handleInvoiceChange}
                  required
                  className="form-control"
                  placeholder="Enter invoice number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Purchase Date *</label>
                <input
                  type="date"
                  name="purchase_date"
                  value={invoiceData.purchase_date}
                  onChange={handleInvoiceChange}
                  required
                  className="form-control"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="form-card">
            <div className="section-header">
              <h3 className="section-title">Items</h3>
              <button type="button" onClick={addItem} className="btn-primary">
                + Add Item
              </button>
            </div>

            <div className="items-table-container">
              <table className="items-table" style={{ minWidth: '1450px', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '350px' }}>Material</th>
                    <th style={{ minWidth: '100px' }}>Quantity</th>
                    <th style={{ minWidth: '60px' }}>Unit</th>
                    <th style={{ minWidth: '100px' }}>Rate</th>
                    <th style={{ minWidth: '120px' }}>Amount</th>
                    <th style={{ minWidth: '80px' }}>GST %</th>
                    <th style={{ minWidth: '120px' }}>GST Amt</th>
                    <th style={{ minWidth: '100px' }}>Transport</th>
                    <th style={{ minWidth: '100px' }}>Handling</th>
                    <th style={{ minWidth: '120px' }}>Total</th>
                    <th style={{ minWidth: '50px' }} aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
                    const taxableAmount = amount + (parseFloat(item.transport_charges) || 0) + (parseFloat(item.handling_charges) || 0);
                    const gstAmount = taxableAmount * (parseFloat(item.gst_rate) || 0) / 100;
                    const total = taxableAmount + gstAmount;
                    
                    return (
                      <tr key={index}>
                        <td>
                          <select
                            value={item.material_id}
                            onChange={(e) => handleItemChange(index, 'material_id', e.target.value)}
                            disabled={!selectedSupplier}
                            className="form-control material-select"
                            style={{ minWidth: '340px' }}
                            title={item.material_id ? materials.find(m => m.material_id === parseInt(item.material_id))?.material_name : 'Select Material'}
                          >
                            <option value="">Select Material</option>
                            {materials.map(material => (
                              <option key={material.material_id} value={material.material_id} title={material.material_name}>
                                {getMaterialDisplay(material)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            step="0.01"
                            className="form-control text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="unit-cell">{getMaterialUnit(item.material_id) || '-'}</td>
                        <td>
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            step="0.01"
                            className="form-control text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="amount-cell">₹{amount.toFixed(2)}</td>
                        <td>
                          <input
                            type="number"
                            value={item.gst_rate}
                            onChange={(e) => handleItemChange(index, 'gst_rate', e.target.value)}
                            step="0.1"
                            className="form-control text-center"
                            placeholder="0"
                          />
                        </td>
                        <td className="amount-cell">₹{gstAmount.toFixed(2)}</td>
                        <td>
                          <input
                            type="number"
                            value={item.transport_charges}
                            onChange={(e) => handleItemChange(index, 'transport_charges', e.target.value)}
                            step="0.01"
                            className="form-control text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.handling_charges}
                            onChange={(e) => handleItemChange(index, 'handling_charges', e.target.value)}
                            step="0.01"
                            className="form-control text-right"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="total-cell">₹{total.toFixed(2)}</td>
                        <td className="action-cell">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="btn-remove"
                              aria-label="Remove item"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transport & Handling Charges Section */}
          <div className="form-card">
            <h3 className="section-title">Transport & Handling Charges</h3>
            <div className="form-grid-2col">
              <div className="form-group">
                <label className="form-label">Total Transport Cost (₹)</label>
                <input
                  type="number"
                  name="transport_cost"
                  value={invoiceData.transport_cost}
                  onChange={handleInvoiceChange}
                  step="0.01"
                  className="form-control"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Total Handling Charges (₹)</label>
                <input
                  type="number"
                  name="handling_charges"
                  value={invoiceData.handling_charges}
                  onChange={handleInvoiceChange}
                  step="0.01"
                  className="form-control"
                />
              </div>
            </div>

            {(parseFloat(invoiceData.transport_cost) > 0 || parseFloat(invoiceData.handling_charges) > 0) && (
              <div className="allocation-settings">
                <h4 className="subsection-title">UOM Group Allocation</h4>
                
                <div className="uom-help-text">
                  <span className="uom-help-icon">💡</span>
                  <div className="uom-help-content">
                    <strong>How to use UOM Group Allocation:</strong>
                    <ul>
                      <li>Distribute transport & handling costs across different unit types</li>
                      <li>Weight (kg): For seed/grain materials - default 100% allocation</li>
                      <li>Volume (L): For liquid materials like oil - set if you have liquid items</li>
                      <li>Count (Nos): For packed items/tools - set if you have count-based items</li>
                      <li><strong>⚠️ Total must equal 100% or costs will be lost!</strong></li>
                      <li>Costs are allocated proportionally within each group based on quantity</li>
                    </ul>
                  </div>
                </div>
                
                {/* Allocation Mismatch Warning */}
                {(() => {
                  const transportCost = parseFloat(invoiceData.transport_cost) || 0;
                  const handlingCharges = parseFloat(invoiceData.handling_charges) || 0;
                  const allocatedTransport = parseFloat(totals.totalAllocatedTransport) || 0;
                  const allocatedHandling = parseFloat(totals.totalAllocatedHandling) || 0;
                  
                  const hasTransportMismatch = transportCost > 0 && Math.abs(transportCost - allocatedTransport) > 0.01;
                  const hasHandlingMismatch = handlingCharges > 0 && Math.abs(handlingCharges - allocatedHandling) > 0.01;
                  
                  if (hasTransportMismatch || hasHandlingMismatch) {
                    return (
                      <div className="allocation-warning">
                        <span className="warning-icon">⚠️</span>
                        <div className="warning-content">
                          <strong>Cost Allocation Mismatch!</strong>
                          {hasTransportMismatch && (
                            <div>Transport: ₹{transportCost.toFixed(2)} entered but only ₹{allocatedTransport.toFixed(2)} allocated to items</div>
                          )}
                          {hasHandlingMismatch && (
                            <div>Handling: ₹{handlingCharges.toFixed(2)} entered but only ₹{allocatedHandling.toFixed(2)} allocated to items</div>
                          )}
                          <div><strong>Fix this before saving or costs will be lost!</strong></div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="uom-groups">
                  <div className="uom-group">
                    <label className="uom-label">Weight (kg)</label>
                    <div className="input-group">
                      <input
                        type="number"
                        value={uomGroups.kg.percentage}
                        onChange={(e) => handleGroupPercentageChange('kg', e.target.value)}
                        min="0"
                        max="100"
                        step="1"
                      />
                      <span className="input-addon">%</span>
                    </div>
                  </div>
                  
                  <div className="uom-group">
                    <label className="uom-label">Volume (L)</label>
                    <div className="input-group">
                      <input
                        type="number"
                        value={uomGroups.L.percentage}
                        onChange={(e) => handleGroupPercentageChange('L', e.target.value)}
                        min="0"
                        max="100"
                        step="1"
                      />
                      <span className="input-addon">%</span>
                    </div>
                  </div>
                  
                  <div className="uom-group">
                    <label className="uom-label">Count (Nos)</label>
                    <div className="input-group">
                      <input
                        type="number"
                        value={uomGroups.Nos.percentage}
                        onChange={(e) => handleGroupPercentageChange('Nos', e.target.value)}
                        min="0"
                        max="100"
                        step="1"
                      />
                      <span className="input-addon">%</span>
                    </div>
                  </div>
                  
                  <div className={`total-percentage ${totalPercentage === 100 ? 'success' : 'error'}`}>
                    Total: {totalPercentage}%
                  </div>
                  
                  <button
                    type="button"
                    onClick={allocateCharges}
                    className="btn-secondary"
                    style={{ marginLeft: 'auto' }}
                  >
                    Recalculate Allocation
                  </button>
                </div>
                
                {totalPercentage !== 100 && (
                  <div className="error-text">
                    ⚠️ Total allocation must equal 100%. Currently: {totalPercentage}%
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary Section */}
          <div className="form-card summary-card">
            <h3 className="section-title">Summary</h3>
            <div className="summary-grid">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal}</span>
              </div>
              <div className="summary-row">
                <span>Total GST:</span>
                <span>₹{totals.totalGst}</span>
              </div>
              <div className="summary-row">
                <span>Transport Cost:</span>
                <span>₹{totals.transportCost}</span>
              </div>
              <div className="summary-row">
                <span>Handling Charges:</span>
                <span>₹{totals.handlingCharges}</span>
              </div>
              <div className="summary-row grand-total">
                <span>Grand Total:</span>
                <span>₹{totals.grandTotal}</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Saving Purchase...' : 'Save Purchase'}
            </button>
          </div>
        </form>
      ) : (
        <div className="purchase-history">
          <div className="form-card">
            <h3 className="section-title">Purchase History</h3>
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th>Supplier</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Traceable Code</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseHistory.map((purchase) => (
                    <tr key={purchase.purchase_id}>
                      <td>{formatDate(purchase.purchase_date)}</td>
                      <td>{purchase.invoice_ref}</td>
                      <td>{purchase.supplier_name}</td>
                      <td>{purchase.item_count}</td>
                      <td>₹{purchase.total_cost.toFixed(2)}</td>
                      <td className="traceable-code">
                        {purchase.traceable_code || '-'}
                      </td>
                      <td>
                        <button className="btn-view">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchase;
