// Production Entry Component for SKU Management
// File Path: puvi-frontend/src/modules/SKUManagement/components/ProductionEntry.js

import React, { useState, useEffect } from 'react';

const ProductionEntry = () => {
  const [step, setStep] = useState(1);
  const [skuList, setSKUList] = useState([]);
  const [oilSources, setOilSources] = useState([]);
  const [productionData, setProductionData] = useState({
    sku_id: '',
    production_date: new Date().toISOString().split('T')[0],
    bottles_planned: '',
    oil_required: 0,
    oil_allocations: [],
    bottles_produced: '',
    operator_name: '',
    shift_number: 1,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSKUs();
    fetchOilSources();
  }, []);

  const fetchSKUs = async () => {
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/sku/master?is_active=true');
      if (!response.ok) throw new Error('Failed to fetch SKUs');
      const data = await response.json();
      setSKUList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setMessage({ type: 'error', text: 'Failed to load SKUs' });
      setSKUList([]);
    }
  };

  const fetchOilSources = async () => {
    try {
      // Fetch batches
      const batchResponse = await fetch('https://puvi-backend.onrender.com/api/batch');
      const batches = batchResponse.ok ? await batchResponse.json() : [];
      
      // Fetch blends
      const blendResponse = await fetch('https://puvi-backend.onrender.com/api/blending');
      const blends = blendResponse.ok ? await blendResponse.json() : [];
      
      // Combine sources
      const sources = [
        ...(Array.isArray(batches) ? batches.map(b => ({
          id: b.batch_id,
          type: 'batch',
          code: b.batch_code || `Batch ${b.batch_id}`,
          oil_type: b.oil_type || 'Unknown',
          available: b.oil_quantity_remaining || 0,
          cost_per_kg: b.oil_cost_per_kg || 0,
          traceable_code: b.traceable_code || ''
        })) : []),
        ...(Array.isArray(blends) ? blends.map(b => ({
          id: b.blend_id,
          type: 'blend',
          code: b.blend_code || `Blend ${b.blend_id}`,
          oil_type: b.blend_description || 'Blend',
          available: b.quantity_remaining || 0,
          cost_per_kg: b.weighted_avg_cost || 0,
          traceable_code: b.traceable_code || ''
        })) : [])
      ];
      
      setOilSources(sources.filter(s => s.available > 0));
    } catch (error) {
      console.error('Error fetching oil sources:', error);
      setOilSources([]);
    }
  };

  const handleSKUChange = (e) => {
    const skuId = e.target.value;
    setProductionData(prev => ({ ...prev, sku_id: skuId }));
    
    if (skuId) {
      const sku = skuList.find(s => s.sku_id === parseInt(skuId));
      if (sku && prev.bottles_planned) {
        const oilRequired = calculateOilRequired(sku, prev.bottles_planned);
        setProductionData(prev => ({ ...prev, oil_required: oilRequired }));
      }
    }
  };

  const handleBottlesPlannedChange = (e) => {
    const bottles = e.target.value;
    setProductionData(prev => ({ ...prev, bottles_planned: bottles }));
    
    if (productionData.sku_id && bottles) {
      const sku = skuList.find(s => s.sku_id === parseInt(productionData.sku_id));
      if (sku) {
        const oilRequired = calculateOilRequired(sku, bottles);
        setProductionData(prev => ({ ...prev, oil_required: oilRequired }));
      }
    }
  };

  const calculateOilRequired = (sku, bottles) => {
    if (!sku || !bottles) return 0;
    
    // Extract liter value from package_size (e.g., "1L" -> 1, "500ml" -> 0.5)
    let liters = 1;
    const packageSize = sku.package_size || '1L';
    
    if (packageSize.includes('ml')) {
      liters = parseFloat(packageSize) / 1000;
    } else if (packageSize.includes('L')) {
      liters = parseFloat(packageSize);
    }
    
    const density = sku.density || 0.91;
    return (liters * density * parseInt(bottles)).toFixed(2);
  };

  const handleCheckAvailability = async () => {
    if (!productionData.sku_id || !productionData.bottles_planned) {
      setMessage({ type: 'error', text: 'Please select SKU and enter planned quantity' });
      return;
    }
    
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/sku/production/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku_id: parseInt(productionData.sku_id),
          bottles_planned: parseInt(productionData.bottles_planned),
          production_date: Math.floor(new Date(productionData.production_date).getTime() / 1000)
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.oil_available) {
          setMessage({ type: 'success', text: 'Oil available! Proceed to allocation.' });
          setStep(2);
        } else {
          setMessage({ type: 'error', text: 'Insufficient oil available' });
        }
      } else {
        throw new Error('Failed to check availability');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleAddAllocation = () => {
    setProductionData(prev => ({
      ...prev,
      oil_allocations: [...prev.oil_allocations, { source_id: '', quantity: '' }]
    }));
  };

  const handleAllocationChange = (index, field, value) => {
    const updated = [...productionData.oil_allocations];
    updated[index][field] = value;
    setProductionData(prev => ({ ...prev, oil_allocations: updated }));
  };

  const handleRemoveAllocation = (index) => {
    setProductionData(prev => ({
      ...prev,
      oil_allocations: prev.oil_allocations.filter((_, i) => i !== index)
    }));
  };

  const handleAllocateOil = async () => {
    const totalAllocated = productionData.oil_allocations.reduce(
      (sum, alloc) => sum + parseFloat(alloc.quantity || 0), 0
    );
    
    if (Math.abs(totalAllocated - productionData.oil_required) > 0.01) {
      setMessage({ 
        type: 'error', 
        text: `Total allocated (${totalAllocated}kg) must equal required (${productionData.oil_required}kg)` 
      });
      return;
    }
    
    try {
      const allocations = productionData.oil_allocations.map(alloc => {
        const source = oilSources.find(s => s.id === parseInt(alloc.source_id));
        return {
          source_type: source.type,
          source_id: source.id,
          quantity: parseFloat(alloc.quantity)
        };
      });
      
      const response = await fetch('https://puvi-backend.onrender.com/api/sku/production/allocate-oil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku_id: parseInt(productionData.sku_id),
          bottles_planned: parseInt(productionData.bottles_planned),
          allocations
        })
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Oil allocated successfully!' });
        setStep(3);
      } else {
        throw new Error('Failed to allocate oil');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleSaveProduction = async () => {
    if (!productionData.bottles_produced || !productionData.operator_name) {
      setMessage({ type: 'error', text: 'Please enter actual production and operator name' });
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        sku_id: parseInt(productionData.sku_id),
        production_date: Math.floor(new Date(productionData.production_date).getTime() / 1000),
        packing_date: Math.floor(new Date().getTime() / 1000),
        bottles_planned: parseInt(productionData.bottles_planned),
        bottles_produced: parseInt(productionData.bottles_produced),
        oil_allocations: productionData.oil_allocations.map(alloc => {
          const source = oilSources.find(s => s.id === parseInt(alloc.source_id));
          return {
            source_type: source.type,
            source_id: source.id,
            quantity: parseFloat(alloc.quantity),
            oil_cost_per_kg: source.cost_per_kg
          };
        }),
        operator_name: productionData.operator_name,
        shift_number: parseInt(productionData.shift_number),
        notes: productionData.notes
      };
      
      const response = await fetch('https://puvi-backend.onrender.com/api/sku/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const result = await response.json();
        setMessage({ 
          type: 'success', 
          text: `Production saved! Code: ${result.production_code}, Traceable: ${result.traceable_code}` 
        });
        handleReset();
      } else {
        throw new Error('Failed to save production');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setProductionData({
      sku_id: '',
      production_date: new Date().toISOString().split('T')[0],
      bottles_planned: '',
      oil_required: 0,
      oil_allocations: [],
      bottles_produced: '',
      operator_name: '',
      shift_number: 1,
      notes: ''
    });
  };

  return (
    <div className="production-entry">
      <div className="steps-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Planning</div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Oil Allocation</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Production Entry</div>
      </div>
      
      {message.text && (
        <div className={`alert ${message.type}`}>
          {message.text}
        </div>
      )}
      
      {step === 1 && (
        <div className="planning-step">
          <h3>SKU Selection</h3>
          <div className="form-group">
            <label>Select SKU *</label>
            <select value={productionData.sku_id} onChange={handleSKUChange}>
              <option value="">-- Select SKU --</option>
              {skuList.map(sku => (
                <option key={sku.sku_id} value={sku.sku_id}>
                  {sku.sku_code} - {sku.product_name}
                </option>
              ))}
            </select>
          </div>
          
          <h3>Production Planning</h3>
          <div className="form-group">
            <label>Bottles Planned *</label>
            <input 
              type="number"
              value={productionData.bottles_planned}
              onChange={handleBottlesPlannedChange}
              min="1"
            />
          </div>
          
          <div className="form-group">
            <label>Production Date *</label>
            <input 
              type="date"
              value={productionData.production_date}
              onChange={(e) => setProductionData(prev => ({ ...prev, production_date: e.target.value }))}
            />
          </div>
          
          {productionData.oil_required > 0 && (
            <div className="oil-requirement">
              <p><strong>Oil Required:</strong> {productionData.oil_required} kg</p>
            </div>
          )}
          
          <div className="action-buttons">
            <button 
              className="btn-primary"
              onClick={handleCheckAvailability}
              disabled={!productionData.sku_id || !productionData.bottles_planned}
            >
              Check Oil Availability
            </button>
            <button className="btn-secondary" onClick={handleReset}>
              Reset
            </button>
          </div>
        </div>
      )}
      
      {step === 2 && (
        <div className="allocation-step">
          <h3>Oil Allocation</h3>
          <p><strong>Required:</strong> {productionData.oil_required} kg</p>
          
          <button className="btn-primary" onClick={handleAddAllocation}>
            Add Oil Source
          </button>
          
          {productionData.oil_allocations.map((alloc, index) => (
            <div key={index} className="allocation-row">
              <select 
                value={alloc.source_id}
                onChange={(e) => handleAllocationChange(index, 'source_id', e.target.value)}
              >
                <option value="">-- Select Source --</option>
                {oilSources.map(source => (
                  <option key={`${source.type}-${source.id}`} value={source.id}>
                    {source.code} - {source.oil_type} ({source.available}kg available)
                  </option>
                ))}
              </select>
              
              <input 
                type="number"
                placeholder="Quantity (kg)"
                value={alloc.quantity}
                onChange={(e) => handleAllocationChange(index, 'quantity', e.target.value)}
                step="0.01"
                min="0"
              />
              
              <button 
                className="btn-danger"
                onClick={() => handleRemoveAllocation(index)}
              >
                Remove
              </button>
            </div>
          ))}
          
          <div className="allocation-summary">
            <p>
              <strong>Total Allocated:</strong> {
                productionData.oil_allocations.reduce(
                  (sum, alloc) => sum + parseFloat(alloc.quantity || 0), 0
                ).toFixed(2)
              } kg
            </p>
          </div>
          
          <div className="action-buttons">
            <button 
              className="btn-success"
              onClick={handleAllocateOil}
              disabled={productionData.oil_allocations.length === 0}
            >
              Confirm Allocation
            </button>
            <button className="btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
          </div>
        </div>
      )}
      
      {step === 3 && (
        <div className="entry-step">
          <h3>Production Entry</h3>
          
          <div className="form-group">
            <label>Actual Bottles Produced *</label>
            <input 
              type="number"
              value={productionData.bottles_produced}
              onChange={(e) => setProductionData(prev => ({ ...prev, bottles_produced: e.target.value }))}
              min="0"
            />
          </div>
          
          <div className="form-group">
            <label>Operator Name *</label>
            <input 
              type="text"
              value={productionData.operator_name}
              onChange={(e) => setProductionData(prev => ({ ...prev, operator_name: e.target.value }))}
            />
          </div>
          
          <div className="form-group">
            <label>Shift Number</label>
            <select 
              value={productionData.shift_number}
              onChange={(e) => setProductionData(prev => ({ ...prev, shift_number: e.target.value }))}
            >
              <option value="1">Shift 1</option>
              <option value="2">Shift 2</option>
              <option value="3">Shift 3</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Notes</label>
            <textarea 
              value={productionData.notes}
              onChange={(e) => setProductionData(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
            />
          </div>
          
          <div className="action-buttons">
            <button 
              className="btn-success"
              onClick={handleSaveProduction}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Production'}
            </button>
            <button className="btn-secondary" onClick={() => setStep(2)}>
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionEntry;
