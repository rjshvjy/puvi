// File Path: puvi-frontend/puvi-frontend-main/src/modules/SKUOutbound/OutboundEntry.js
// SKU Outbound Entry Component - Handles creation of outbound transactions
// Supports: Internal Transfers, Third Party Transfers, and Sales
// Features: FEFO/FIFO batch allocation, GST calculation, multi-step workflow
// Version: 2.1 - Added transfer-specific document fields (STN, Shipment ID)

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './OutboundEntry.css';

const OutboundEntry = () => {
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Master data
  const [locations, setLocations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [skus, setSKUs] = useState([]);
  const [shipToLocations, setShipToLocations] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  
  // Form data - UPDATED: Added transfer-specific fields
  const [outboundData, setOutboundData] = useState({
    transaction_type: 'transfer',
    from_location_id: '',
    to_location_id: '',
    customer_id: '',
    ship_to_location_id: '',
    outbound_date: new Date().toISOString().split('T')[0],
    dispatch_date: '',
    customer_po_number: '',
    invoice_number: '',
    eway_bill_number: '',
    stn_number: '',        // NEW: Stock Transfer Note Number
    stn_date: '',          // NEW: Stock Transfer Note Date
    shipment_id: '',       // NEW: Shipment/Tracking ID
    transport_mode: '',
    transport_vendor: '',
    vehicle_number: '',
    lr_number: '',
    transport_cost: '0',
    handling_cost: '0',
    notes: '',
    created_by: 'User'
  });

  // Line items
  const [items, setItems] = useState([{
    sku_id: '',
    quantity_ordered: '',
    allocations: [],
    unit_price: '',
    gst_rate: '',
    notes: ''
  }]);

  // Allocation strategy
  const [allocationStrategy, setAllocationStrategy] = useState('fefo');
  const [manualAllocations, setManualAllocations] = useState({});
  
  // Weight-based cost allocation preview
  const [costAllocationPreview, setCostAllocationPreview] = useState([]);

  // Load master data on mount
  useEffect(() => {
    fetchMasterData();
  }, []);

  // Load ship-to locations when customer changes
  useEffect(() => {
    if (outboundData.customer_id) {
      fetchShipToLocations(outboundData.customer_id);
    } else {
      setShipToLocations([]);
    }
  }, [outboundData.customer_id]);

  // Determine transaction behavior based on location ownership
  useEffect(() => {
    if (outboundData.to_location_id) {
      const location = locations.find(l => l.location_id === parseInt(outboundData.to_location_id));
      if (location) {
        // Auto-determine if this is internal or third-party transfer
        if (location.ownership === 'third_party' && location.customer_id) {
          setOutboundData(prev => ({
            ...prev,
            customer_id: location.customer_id.toString()
          }));
        }
      }
    }
  }, [outboundData.to_location_id, locations]);

  // Calculate weight-based cost allocation when items or costs change
  useEffect(() => {
    calculateCostAllocation();
  }, [items, outboundData.transport_cost, outboundData.handling_cost, skus]);

  const fetchMasterData = async () => {
    try {
      // Fetch locations
      const locResponse = await api.locations.dropdown();
      if (locResponse.success) {
        // Sort locations to prioritize production factory
        const sortedLocations = (locResponse.locations || []).sort((a, b) => {
          // First priority: is_production_unit (factories where production happens)
          if (a.is_production_unit && !b.is_production_unit) return -1;
          if (!a.is_production_unit && b.is_production_unit) return 1;
          
          // Second priority: is_default flag
          if (a.is_default && !b.is_default) return -1;
          if (!a.is_default && b.is_default) return 1;
          
          // Third priority: location_type (factory > warehouse > customer)
          const typeOrder = { 'factory': 1, 'warehouse': 2, 'customer': 3 };
          const aOrder = typeOrder[a.location_type] || 4;
          const bOrder = typeOrder[b.location_type] || 4;
          if (aOrder !== bOrder) return aOrder - bOrder;
          
          // Finally, alphabetical by name
          return a.location_name.localeCompare(b.location_name);
        });
        
        setLocations(sortedLocations);
        
        // Auto-select the production factory as default if no location is selected
        if (sortedLocations.length > 0 && !outboundData.from_location_id) {
          const defaultLocation = sortedLocations.find(loc => 
            loc.location_type === 'factory' && 
            loc.is_production_unit && 
            loc.ownership === 'own'
          ) || sortedLocations[0];
          
          setOutboundData(prev => ({
            ...prev,
            from_location_id: defaultLocation.location_id
          }));
        }
      }

      // Fetch customers
      const custResponse = await api.customers.dropdown();
      if (custResponse.success) {
        setCustomers(custResponse.customers || []);
      }

      // Fetch SKUs
      const skuResponse = await api.sku.getMasterList({ is_active: true });
      if (skuResponse.success) {
        setSKUs(skuResponse.skus || []);
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
      setMessage({ type: 'error', text: 'Failed to load master data' });
    }
  };

  const fetchShipToLocations = async (customerId) => {
    try {
      const response = await api.customers.getShipTo(customerId);
      if (response.success) {
        setShipToLocations(response.ship_to_locations || []);
      }
    } catch (error) {
      console.error('Error fetching ship-to locations:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOutboundData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto-fill GST rate when SKU is selected for sales
    if (field === 'sku_id' && outboundData.transaction_type === 'sales') {
      const sku = skus.find(s => s.sku_id === parseInt(value));
      if (sku) {
        newItems[index].gst_rate = sku.gst_rate || '5';
      }
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, {
      sku_id: '',
      quantity_ordered: '',
      allocations: [],
      unit_price: '',
      gst_rate: '',
      notes: ''
    }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Calculate weight-based cost allocation
  const calculateCostAllocation = () => {
    const validItems = items.filter(item => item.sku_id && item.quantity_ordered);
    if (validItems.length === 0 || skus.length === 0) {
      setCostAllocationPreview([]);
      return;
    }

    let totalWeight = 0;
    const itemWeights = [];

    // Calculate total weight
    validItems.forEach(item => {
      const sku = skus.find(s => s.sku_id === parseInt(item.sku_id));
      if (sku) {
        const weight = (sku.packaged_weight_kg || 1.0) * parseFloat(item.quantity_ordered || 0);
        itemWeights.push({
          sku_id: item.sku_id,
          sku_code: sku.sku_code,
          product_name: sku.product_name,
          quantity: parseFloat(item.quantity_ordered || 0),
          unit_weight: sku.packaged_weight_kg || 1.0,
          total_weight: weight
        });
        totalWeight += weight;
      }
    });

    // Calculate cost allocation
    const transportCost = parseFloat(outboundData.transport_cost) || 0;
    const handlingCost = parseFloat(outboundData.handling_cost) || 0;
    
    const allocation = itemWeights.map(item => ({
      ...item,
      weight_percentage: totalWeight > 0 ? ((item.total_weight / totalWeight) * 100).toFixed(2) : 0,
      transport_allocated: totalWeight > 0 ? ((item.total_weight / totalWeight) * transportCost).toFixed(2) : 0,
      handling_allocated: totalWeight > 0 ? ((item.total_weight / totalWeight) * handlingCost).toFixed(2) : 0,
      transport_per_kg: totalWeight > 0 ? (transportCost / totalWeight).toFixed(2) : 0,
      handling_per_kg: totalWeight > 0 ? (handlingCost / totalWeight).toFixed(2) : 0
    }));

    setCostAllocationPreview(allocation);
  };

  const checkAvailability = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      // Validate required fields
      if (!outboundData.from_location_id) {
        throw new Error('Please select source location');
      }
      
      const validItems = items.filter(item => item.sku_id && item.quantity_ordered);
      if (validItems.length === 0) {
        throw new Error('Please add at least one item with quantity');
      }

      // Check availability for each item
      const availabilityPromises = validItems.map(item => 
        api.skuOutbound.checkAvailability({
          sku_id: parseInt(item.sku_id),
          quantity_needed: parseInt(item.quantity_ordered),
          from_location_id: parseInt(outboundData.from_location_id)
        })
      );

      const results = await Promise.all(availabilityPromises);
      
      // Check if all items have sufficient inventory
      const insufficientItems = results.filter(r => !r.success);
      if (insufficientItems.length > 0) {
        const shortage = insufficientItems[0];
        throw new Error(`Insufficient inventory. Available: ${shortage.total_available}, Required: ${shortage.quantity_needed}`);
      }

      // Store available batches for allocation
      const batchData = {};
      results.forEach((result, index) => {
        const itemIndex = items.findIndex(item => 
          item.sku_id === validItems[index].sku_id && 
          item.quantity_ordered === validItems[index].quantity_ordered
        );
        if (itemIndex !== -1) {
          batchData[itemIndex] = result.available_batches;
        }
      });
      setAvailableBatches(batchData);

      // Auto-allocate based on strategy
      const updatedItems = [...items];
      Object.keys(batchData).forEach(itemIndex => {
        const allocations = allocateBatches(
          batchData[itemIndex],
          parseInt(items[itemIndex].quantity_ordered),
          allocationStrategy
        );
        updatedItems[itemIndex].allocations = allocations;
      });
      setItems(updatedItems);

      setMessage({ type: 'success', text: 'Inventory available. Please review allocations.' });
      setCurrentStep(2);
      
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const allocateBatches = (batches, quantityNeeded, strategy) => {
    let sortedBatches = [...batches];
    
    // Sort based on strategy
    switch (strategy) {
      case 'fefo':
        sortedBatches.sort((a, b) => {
          const dateA = parseDate(a.expiry_date);
          const dateB = parseDate(b.expiry_date);
          return dateA - dateB;
        });
        break;
      case 'fifo':
        sortedBatches.sort((a, b) => a.tracking_id - b.tracking_id);
        break;
      case 'manual':
        // Use manual allocations
        return Object.keys(manualAllocations).map(trackingId => {
          const batch = batches.find(b => b.tracking_id === parseInt(trackingId));
          return {
            ...batch,
            quantity: manualAllocations[trackingId]
          };
        }).filter(a => a.quantity > 0);
      default:
        break;
    }

    // Allocate quantities
    const allocations = [];
    let remaining = quantityNeeded;
    
    for (const batch of sortedBatches) {
      if (remaining <= 0) break;
      
      const allocQty = Math.min(remaining, batch.quantity_remaining);
      if (allocQty > 0) {
        allocations.push({
          tracking_id: batch.tracking_id,
          production_id: batch.production_id,
          production_code: batch.production_code,
          sku_traceable_code: batch.sku_traceable_code,
          quantity: allocQty,
          expiry_date: batch.expiry_date,
          mrp: batch.mrp,
          production_cost: batch.production_cost
        });
        remaining -= allocQty;
      }
    }
    
    return allocations;
  };

  const updateManualAllocation = (itemIndex, trackingId, quantity) => {
    setManualAllocations(prev => ({
      ...prev,
      [`${itemIndex}_${trackingId}`]: Math.min(
        parseFloat(quantity) || 0,
        availableBatches[itemIndex]?.find(b => b.tracking_id === trackingId)?.quantity_remaining || 0
      )
    }));
  };

  const applyManualAllocations = () => {
    const updatedItems = [...items];
    
    Object.keys(availableBatches).forEach(itemIndex => {
      const allocations = [];
      const batches = availableBatches[itemIndex];
      
      batches.forEach(batch => {
        const allocKey = `${itemIndex}_${batch.tracking_id}`;
        const quantity = manualAllocations[allocKey] || 0;
        
        if (quantity > 0) {
          allocations.push({
            tracking_id: batch.tracking_id,
            production_id: batch.production_id,
            production_code: batch.production_code,
            sku_traceable_code: batch.sku_traceable_code,
            quantity: quantity,
            expiry_date: batch.expiry_date,
            mrp: batch.mrp,
            production_cost: batch.production_cost
          });
        }
      });
      
      updatedItems[itemIndex].allocations = allocations;
    });
    
    setItems(updatedItems);
    setMessage({ type: 'success', text: 'Manual allocations applied' });
  };

  const createOutbound = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      // Validate required fields
      if (!outboundData.from_location_id) {
        throw new Error('Please select source location');
      }
      
      if (outboundData.transaction_type === 'transfer' && !outboundData.to_location_id) {
        throw new Error('Please select destination location');
      }
      
      if (outboundData.transaction_type === 'sales' && !outboundData.customer_id) {
        throw new Error('Please select customer');
      }

      // Prepare items with allocations
      const validItems = items.filter(item => 
        item.sku_id && item.quantity_ordered && item.allocations.length > 0
      );
      
      if (validItems.length === 0) {
        throw new Error('No valid items with allocations');
      }

      // Prepare payload - includes all fields from outboundData
      const payload = {
        ...outboundData,
        outbound_date: formatDateForAPI(outboundData.outbound_date),
        dispatch_date: outboundData.dispatch_date ? formatDateForAPI(outboundData.dispatch_date) : null,
        stn_date: outboundData.stn_date ? formatDateForAPI(outboundData.stn_date) : null,
        transport_cost: parseFloat(outboundData.transport_cost) || 0,
        handling_cost: parseFloat(outboundData.handling_cost) || 0,
        items: validItems.map(item => ({
          sku_id: parseInt(item.sku_id),
          quantity_ordered: parseInt(item.quantity_ordered),
          allocations: item.allocations,
          unit_price: outboundData.transaction_type === 'sales' ? parseFloat(item.unit_price) || 0 : null,
          gst_rate: outboundData.transaction_type === 'sales' ? parseFloat(item.gst_rate) || 0 : null,
          allocation_strategy: allocationStrategy,
          notes: item.notes
        }))
      };

      // Remove undefined fields
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined || payload[key] === '') {
          delete payload[key];
        }
      });

      const response = await api.skuOutbound.create(payload);
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: `Outbound created successfully! Code: ${response.outbound_code}` 
        });
        
        // Reset form after 2 seconds
        setTimeout(() => {
          resetForm();
        }, 2000);
      } else {
        throw new Error(response.error || 'Failed to create outbound');
      }
      
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setOutboundData({
      transaction_type: 'transfer',
      from_location_id: '',
      to_location_id: '',
      customer_id: '',
      ship_to_location_id: '',
      outbound_date: new Date().toISOString().split('T')[0],
      dispatch_date: '',
      customer_po_number: '',
      invoice_number: '',
      eway_bill_number: '',
      stn_number: '',        // RESET: Stock Transfer Note Number
      stn_date: '',          // RESET: Stock Transfer Note Date
      shipment_id: '',       // RESET: Shipment/Tracking ID
      transport_mode: '',
      transport_vendor: '',
      vehicle_number: '',
      lr_number: '',
      transport_cost: '0',
      handling_cost: '0',
      notes: '',
      created_by: 'User'
    });
    setItems([{
      sku_id: '',
      quantity_ordered: '',
      allocations: [],
      unit_price: '',
      gst_rate: '',
      notes: ''
    }]);
    setAvailableBatches([]);
    setManualAllocations({});
    setCostAllocationPreview([]);
    setMessage({ type: '', text: '' });
  };

  // Utility functions
  const formatDateForAPI = (dateStr) => {
    // Convert YYYY-MM-DD to DD-MM-YYYY
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  const formatDateForDisplay = (dateStr) => {
    // Display as DD-MM-YYYY
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date('9999-12-31');
    // Parse DD-MM-YYYY to Date object
    const [day, month, year] = dateStr.split('-');
    return new Date(year, month - 1, day);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalGst = 0;

    if (outboundData.transaction_type === 'sales') {
      items.forEach(item => {
        if (item.quantity_ordered && item.unit_price) {
          const amount = parseFloat(item.quantity_ordered) * parseFloat(item.unit_price);
          const gstAmount = amount * (parseFloat(item.gst_rate) || 0) / 100;
          subtotal += amount;
          totalGst += gstAmount;
        }
      });
    }

    const transportCost = parseFloat(outboundData.transport_cost) || 0;
    const handlingCost = parseFloat(outboundData.handling_cost) || 0;
    const totalCostElements = transportCost + handlingCost;
    const grandTotal = subtotal + totalGst + totalCostElements;

    return {
      subtotal: subtotal.toFixed(2),
      totalGst: totalGst.toFixed(2),
      totalCostElements: totalCostElements.toFixed(2),
      grandTotal: grandTotal.toFixed(2)
    };
  };

  const totals = calculateTotals();

  // Render cost allocation preview
  const renderCostAllocationPreview = () => {
    if (costAllocationPreview.length === 0) return null;

    const totalTransport = parseFloat(outboundData.transport_cost) || 0;
    const totalHandling = parseFloat(outboundData.handling_cost) || 0;
    const totalWeight = costAllocationPreview.reduce((sum, item) => sum + item.total_weight, 0);

    return (
      <div className="cost-allocation-preview">
        <h4>Weight-Based Cost Allocation Preview</h4>
        <div className="allocation-summary">
          <span>Total Shipment Weight: {totalWeight.toFixed(2)} kg</span>
          <span> | Transport Cost/kg: ₹{totalWeight > 0 ? (totalTransport / totalWeight).toFixed(2) : '0.00'}</span>
          <span> | Handling Cost/kg: ₹{totalWeight > 0 ? (totalHandling / totalWeight).toFixed(2) : '0.00'}</span>
        </div>
        <table className="allocation-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Qty</th>
              <th>Weight (kg)</th>
              <th>Weight %</th>
              <th>Transport Allocated</th>
              <th>Handling Allocated</th>
            </tr>
          </thead>
          <tbody>
            {costAllocationPreview.map((item, index) => (
              <tr key={index}>
                <td>{item.sku_code}</td>
                <td>{item.quantity}</td>
                <td>{item.total_weight.toFixed(2)}</td>
                <td>{item.weight_percentage}%</td>
                <td>₹{item.transport_allocated}</td>
                <td>₹{item.handling_allocated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="outbound-entry">
      <div className="entry-header">
        <h2>New Outbound Entry</h2>
        <div className="step-indicator">
          <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Basic Details</span>
          </div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Batch Allocation</span>
          </div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Review & Submit</span>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {currentStep === 1 && (
        <div className="step-content">
          <div className="form-section">
            <h3>Transaction Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Transaction Type *</label>
                <select
                  name="transaction_type"
                  value={outboundData.transaction_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="transfer">Transfer</option>
                  <option value="sales">Sales</option>
                </select>
              </div>

              <div className="form-group">
                <label>From Location *</label>
                <select
                  name="from_location_id"
                  value={outboundData.from_location_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Location</option>
                  {locations.filter(l => l.ownership === 'own').map(loc => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.location_name} ({loc.location_code})
                    </option>
                  ))}
                </select>
              </div>

              {outboundData.transaction_type === 'transfer' && (
                <div className="form-group">
                  <label>To Location *</label>
                  <select
                    name="to_location_id"
                    value={outboundData.to_location_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Location</option>
                    
                    {/* Own Locations (Warehouse) */}
                    {locations
                      .filter(l => l.location_id !== parseInt(outboundData.from_location_id) && l.ownership === 'own')
                      .length > 0 && (
                      <optgroup label="Own Locations">
                        {locations
                          .filter(l => l.location_id !== parseInt(outboundData.from_location_id) && l.ownership === 'own')
                          .map(loc => (
                            <option key={loc.location_id} value={loc.location_id}>
                              {loc.location_name} ({loc.location_code})
                            </option>
                          ))}
                      </optgroup>
                    )}
                    
                    {/* Group third-party locations by customer */}
                    {(() => {
                      const thirdPartyLocs = locations.filter(
                        l => l.location_id !== parseInt(outboundData.from_location_id) && l.ownership === 'third_party'
                      );
                      
                      // Extract unique customer names
                      const customerGroups = {};
                      thirdPartyLocs.forEach(loc => {
                        // Extract customer name from location name (e.g., "Amazon FC DEL" -> "Amazon")
                        const customerName = loc.location_name.split(' ')[0];
                        if (!customerGroups[customerName]) {
                          customerGroups[customerName] = [];
                        }
                        customerGroups[customerName].push(loc);
                      });
                      
                      // Render grouped options
                      return Object.keys(customerGroups).sort().map(customer => (
                        <optgroup key={customer} label={`${customer} Locations`}>
                          {customerGroups[customer].map(loc => (
                            <option key={loc.location_id} value={loc.location_id}>
                              {loc.location_name.replace(customer + ' ', '')} ({loc.location_code})
                            </option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                  </select>
                </div>
              )}

              {outboundData.transaction_type === 'sales' && (
                <>
                  <div className="form-group">
                    <label>Customer *</label>
                    <select
                      name="customer_id"
                      value={outboundData.customer_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Customer</option>
                      {customers.map(cust => (
                        <option key={cust.customer_id} value={cust.customer_id}>
                          {cust.customer_name} ({cust.customer_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {shipToLocations.length > 0 && (
                    <div className="form-group">
                      <label>Ship To Location</label>
                      <select
                        name="ship_to_location_id"
                        value={outboundData.ship_to_location_id}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Ship To</option>
                        {shipToLocations.map(loc => (
                          <option key={loc.ship_to_id} value={loc.ship_to_id}>
                            {loc.location_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="form-group">
                <label>Outbound Date *</label>
                <input
                  type="date"
                  name="outbound_date"
                  value={outboundData.outbound_date}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Dispatch Date</label>
                <input
                  type="date"
                  name="dispatch_date"
                  value={outboundData.dispatch_date}
                  onChange={handleInputChange}
                  min={outboundData.outbound_date}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Reference Documents</h3>
            <div className="form-grid">
              {/* Sales-Specific Documents */}
              {outboundData.transaction_type === 'sales' && (
                <>
                  <div className="form-group">
                    <label>Customer PO Number</label>
                    <input
                      type="text"
                      name="customer_po_number"
                      value={outboundData.customer_po_number}
                      onChange={handleInputChange}
                      placeholder="PO-XXXX"
                    />
                  </div>

                  <div className="form-group">
                    <label>Invoice Number</label>
                    <input
                      type="text"
                      name="invoice_number"
                      value={outboundData.invoice_number}
                      onChange={handleInputChange}
                      placeholder="INV-XXXX"
                    />
                  </div>
                </>
              )}

              {/* Transfer-Specific Documents */}
              {outboundData.transaction_type === 'transfer' && (
                <>
                  <div className="form-group">
                    <label>Stock Transfer Note Number</label>
                    <input
                      type="text"
                      name="stn_number"
                      value={outboundData.stn_number}
                      onChange={handleInputChange}
                      placeholder="STN-XXXX"
                      maxLength="50"
                    />
                  </div>

                  <div className="form-group">
                    <label>STN Date</label>
                    <input
                      type="date"
                      name="stn_date"
                      value={outboundData.stn_date}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Shipment ID</label>
                    <input
                      type="text"
                      name="shipment_id"
                      value={outboundData.shipment_id}
                      onChange={handleInputChange}
                      placeholder="e.g., FBA15GHJKL2 for Amazon"
                      maxLength="50"
                    />
                  </div>
                </>
              )}

              {/* Common Document - Always Show */}
              <div className="form-group">
                <label>E-Way Bill Number</label>
                <input
                  type="text"
                  name="eway_bill_number"
                  value={outboundData.eway_bill_number}
                  onChange={handleInputChange}
                  maxLength="20"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h3>Items</h3>
              <button type="button" onClick={addItem} className="btn-add">
                + Add Item
              </button>
            </div>

            <div className="items-table">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Quantity</th>
                    {outboundData.transaction_type === 'sales' && (
                      <>
                        <th>Unit Price</th>
                        <th>GST %</th>
                        <th>Amount</th>
                      </>
                    )}
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const amount = outboundData.transaction_type === 'sales' ? 
                      (parseFloat(item.quantity_ordered) || 0) * (parseFloat(item.unit_price) || 0) : 0;
                    const gstAmount = amount * (parseFloat(item.gst_rate) || 0) / 100;
                    
                    return (
                      <tr key={index}>
                        <td>
                          <select
                            value={item.sku_id}
                            onChange={(e) => handleItemChange(index, 'sku_id', e.target.value)}
                            required
                          >
                            <option value="">Select SKU</option>
                            {skus.map(sku => (
                              <option key={sku.sku_id} value={sku.sku_id}>
                                {sku.sku_code} - {sku.product_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.quantity_ordered}
                            onChange={(e) => handleItemChange(index, 'quantity_ordered', e.target.value)}
                            min="1"
                            required
                          />
                        </td>
                        {outboundData.transaction_type === 'sales' && (
                          <>
                            <td>
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                step="0.01"
                                min="0"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.gst_rate}
                                onChange={(e) => handleItemChange(index, 'gst_rate', e.target.value)}
                                step="0.1"
                                min="0"
                                max="28"
                              />
                            </td>
                            <td>₹{(amount + gstAmount).toFixed(2)}</td>
                          </>
                        )}
                        <td>
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                            placeholder="Optional notes"
                          />
                        </td>
                        <td>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="btn-remove"
                            >
                              ×
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

          <div className="form-section">
            <h3>Transport Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Transport Mode</label>
                <select
                  name="transport_mode"
                  value={outboundData.transport_mode}
                  onChange={handleInputChange}
                >
                  <option value="">Select Mode</option>
                  <option value="road">Road</option>
                  <option value="rail">Rail</option>
                  <option value="air">Air</option>
                  <option value="ship">Ship</option>
                </select>
              </div>

              <div className="form-group">
                <label>Transport Vendor</label>
                <input
                  type="text"
                  name="transport_vendor"
                  value={outboundData.transport_vendor}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Vehicle Number</label>
                <input
                  type="text"
                  name="vehicle_number"
                  value={outboundData.vehicle_number}
                  onChange={handleInputChange}
                  maxLength="20"
                />
              </div>

              <div className="form-group">
                <label>LR Number</label>
                <input
                  type="text"
                  name="lr_number"
                  value={outboundData.lr_number}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Shipment Costs</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Transport Cost (₹)</label>
                <input
                  type="number"
                  name="transport_cost"
                  value={outboundData.transport_cost}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Handling Cost (₹)</label>
                <input
                  type="number"
                  name="handling_cost"
                  value={outboundData.handling_cost}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            
            {/* Show cost allocation preview */}
            {renderCostAllocationPreview()}
          </div>

          <div className="form-section">
            <label>Notes</label>
            <textarea
              name="notes"
              value={outboundData.notes}
              onChange={handleInputChange}
              rows="3"
              placeholder="Any additional notes..."
            />
          </div>

          {outboundData.transaction_type === 'sales' && (
            <div className="summary-section">
              <h3>Summary</h3>
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
                  <span>Shipment Costs:</span>
                  <span>₹{totals.totalCostElements}</span>
                </div>
                <div className="summary-row grand-total">
                  <span>Grand Total:</span>
                  <span>₹{totals.grandTotal}</span>
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={checkAvailability}
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Checking...' : 'Check Availability & Proceed'}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary">
              Reset
            </button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="step-content">
          <h3>Batch Allocation</h3>
          
          <div className="allocation-strategy">
            <label>Allocation Strategy:</label>
            <select value={allocationStrategy} onChange={(e) => setAllocationStrategy(e.target.value)}>
              <option value="fefo">FEFO (First Expiry First Out)</option>
              <option value="fifo">FIFO (First In First Out)</option>
              <option value="manual">Manual Selection</option>
            </select>
          </div>

          {allocationStrategy === 'manual' && (
            <div className="manual-allocation">
              {Object.keys(availableBatches).map(itemIndex => {
                const item = items[itemIndex];
                const sku = skus.find(s => s.sku_id === parseInt(item.sku_id));
                const batches = availableBatches[itemIndex];
                
                return (
                  <div key={itemIndex} className="item-allocation">
                    <h4>{sku?.sku_code} - {sku?.product_name} (Qty: {item.quantity_ordered})</h4>
                    <table className="batch-table">
                      <thead>
                        <tr>
                          <th>Batch Code</th>
                          <th>Traceable Code</th>
                          <th>Available</th>
                          <th>Expiry Date</th>
                          <th>Days to Expiry</th>
                          <th>Allocate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map(batch => (
                          <tr key={batch.tracking_id}>
                            <td>{batch.production_code}</td>
                            <td>{batch.sku_traceable_code}</td>
                            <td>{batch.quantity_remaining}</td>
                            <td>{formatDateForDisplay(batch.expiry_date)}</td>
                            <td className={`expiry-${batch.expiry_status}`}>
                              {batch.days_to_expiry} days
                            </td>
                            <td>
                              <input
                                type="number"
                                value={manualAllocations[`${itemIndex}_${batch.tracking_id}`] || ''}
                                onChange={(e) => updateManualAllocation(itemIndex, batch.tracking_id, e.target.value)}
                                min="0"
                                max={batch.quantity_remaining}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              <button type="button" onClick={applyManualAllocations} className="btn-secondary">
                Apply Manual Allocations
              </button>
            </div>
          )}

          <div className="allocation-summary">
            <h4>Current Allocations</h4>
            {items.map((item, index) => {
              if (!item.allocations || item.allocations.length === 0) return null;
              
              const sku = skus.find(s => s.sku_id === parseInt(item.sku_id));
              const totalAllocated = item.allocations.reduce((sum, a) => sum + a.quantity, 0);
              
              return (
                <div key={index} className="item-summary">
                  <h5>{sku?.sku_code} - {sku?.product_name}</h5>
                  <p>Required: {item.quantity_ordered} | Allocated: {totalAllocated}</p>
                  <table className="allocation-table">
                    <thead>
                      <tr>
                        <th>Batch</th>
                        <th>Quantity</th>
                        <th>Expiry</th>
                        <th>MRP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.allocations.map((alloc, allocIndex) => (
                        <tr key={allocIndex}>
                          <td>{alloc.sku_traceable_code}</td>
                          <td>{alloc.quantity}</td>
                          <td>{formatDateForDisplay(alloc.expiry_date)}</td>
                          <td>₹{alloc.mrp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setCurrentStep(3)} className="btn-primary">
              Review & Submit
            </button>
            <button type="button" onClick={() => setCurrentStep(1)} className="btn-secondary">
              Back
            </button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="step-content">
          <h3>Review & Confirm</h3>
          
          <div className="review-section">
            <h4>Transaction Details</h4>
            <div className="review-grid">
              <div className="review-item">
                <label>Type:</label>
                <span>{outboundData.transaction_type === 'transfer' ? 'Transfer' : 'Sales'}</span>
              </div>
              <div className="review-item">
                <label>From:</label>
                <span>{locations.find(l => l.location_id === parseInt(outboundData.from_location_id))?.location_name}</span>
              </div>
              {outboundData.transaction_type === 'transfer' && (
                <div className="review-item">
                  <label>To:</label>
                  <span>{locations.find(l => l.location_id === parseInt(outboundData.to_location_id))?.location_name}</span>
                </div>
              )}
              {outboundData.transaction_type === 'sales' && (
                <div className="review-item">
                  <label>Customer:</label>
                  <span>{customers.find(c => c.customer_id === parseInt(outboundData.customer_id))?.customer_name}</span>
                </div>
              )}
              <div className="review-item">
                <label>Date:</label>
                <span>{formatDateForAPI(outboundData.outbound_date)}</span>
              </div>
            </div>
          </div>

          <div className="review-section">
            <h4>Items</h4>
            <table className="review-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Weight (kg)</th>
                  <th>Batches Allocated</th>
                  {outboundData.transaction_type === 'sales' && (
                    <>
                      <th>Unit Price</th>
                      <th>GST</th>
                      <th>Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.filter(item => item.sku_id && item.quantity_ordered).map((item, index) => {
                  const sku = skus.find(s => s.sku_id === parseInt(item.sku_id));
                  const amount = parseFloat(item.quantity_ordered) * parseFloat(item.unit_price || 0);
                  const gstAmount = amount * parseFloat(item.gst_rate || 0) / 100;
                  const itemWeight = (sku?.packaged_weight_kg || 1.0) * parseFloat(item.quantity_ordered);
                  
                  return (
                    <tr key={index}>
                      <td>{sku?.sku_code} - {sku?.product_name}</td>
                      <td>{item.quantity_ordered}</td>
                      <td>{itemWeight.toFixed(2)}</td>
                      <td>{item.allocations.length} batch(es)</td>
                      {outboundData.transaction_type === 'sales' && (
                        <>
                          <td>₹{item.unit_price}</td>
                          <td>{item.gst_rate}%</td>
                          <td>₹{(amount + gstAmount).toFixed(2)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Show cost allocation summary */}
          {renderCostAllocationPreview()}

          {outboundData.transaction_type === 'sales' && (
            <div className="review-section">
              <h4>Financial Summary</h4>
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
                  <span>Shipment Costs:</span>
                  <span>₹{totals.totalCostElements}</span>
                </div>
                <div className="summary-row grand-total">
                  <span>Grand Total:</span>
                  <span>₹{totals.grandTotal}</span>
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={createOutbound}
              className="btn-success"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Outbound'}
            </button>
            <button type="button" onClick={() => setCurrentStep(2)} className="btn-secondary">
              Back to Allocation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutboundEntry;
