// Production Entry Component for SKU Management
// File Path: puvi-frontend/src/modules/SKUManagement/components/ProductionEntry.js

import React, { useState, useEffect } from 'react';

const ProductionEntry = () => {
  const [step, setStep] = useState(1);
  const [skuList, setSKUList] = useState([]);
  const [oilSources, setOilSources] = useState([]);
  const [bomDetails, setBomDetails] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [laborRates, setLaborRates] = useState([]);
  const [oilType, setOilType] = useState('');
  const [selectedSKU, setSelectedSKU] = useState(null);
  
  const [productionData, setProductionData] = useState({
    sku_id: '',
    production_date: new Date().toISOString().split('T')[0],
    bottles_planned: '',
    oil_required: 0,
    oil_allocations: [],
    bottles_produced: '',
    operator_name: '',
    shift_number: 1,
    notes: '',
    // Cost fields
    oil_cost_total: 0,
    material_cost_total: 0,
    labor_cost_total: 0,
    total_production_cost: 0,
    labor_hours: 0,
    labor_rate: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingOilSources, setLoadingOilSources] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch SKUs on component mount
  useEffect(() => {
    fetchSKUs();
    fetchMaterials();
    fetchLaborRates();
  }, []);

  // Update oil type when SKU is selected
  useEffect(() => {
    if (productionData.sku_id && skuList.length > 0) {
      const selected = skuList.find(s => s.sku_id === parseInt(productionData.sku_id));
      if (selected) {
        setSelectedSKU(selected);
        setOilType(selected.oil_type);
        fetchBOMDetails(selected.sku_id);
      }
    }
  }, [productionData.sku_id, skuList]);

  // Fetch oil sources when oil type is set
  useEffect(() => {
    if (oilType) {
      fetchOilSources();
    }
  }, [oilType]);

  const fetchSKUs = async () => {
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/sku/master?is_active=true');
      if (!response.ok) throw new Error('Failed to fetch SKUs');
      const data = await response.json();
      
      // FIX: Access data.skus instead of expecting plain array
      setSKUList(data.skus || []);
      
      if (data.skus && data.skus.length === 0) {
        setMessage({ type: 'warning', text: 'No active SKUs found. Please configure SKUs first.' });
      }
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setMessage({ type: 'error', text: 'Failed to load SKUs' });
      setSKUList([]);
    }
  };

  const fetchOilSources = async () => {
    if (!oilType) return;
    
    setLoadingOilSources(true);
    try {
      // FIX: Use correct unified endpoint with oil_type parameter
      const response = await fetch(`https://puvi-backend.onrender.com/api/batches_for_oil_type?oil_type=${encodeURIComponent(oilType)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch oil sources: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Invalid response');
      }

      // Access data.batches (combined list of extraction batches and blends)
      const sources = (data.batches || []).filter(s => s.available_quantity > 0);

      // Map to expected format with correct source_type mapping
      const mappedSources = sources.map(source => ({
        id: source.batch_id,
        type: source.source_type === 'extraction' ? 'batch' : 
              source.source_type === 'blended' ? 'blend' : 
              source.source_type,
        code: source.batch_code || `Source ${source.batch_id}`,
        oil_type: source.oil_type || oilType,
        available: source.available_quantity || 0,
        cost_per_kg: source.cost_per_kg || 0,
        traceable_code: source.traceable_code || ''
      }));

      setOilSources(mappedSources);
      
      if (mappedSources.length === 0) {
        setMessage({ 
          type: 'warning', 
          text: `No ${oilType} oil available. Please check batch production or blending modules.` 
        });
      }
    } catch (error) {
      console.error('Error fetching oil sources:', error);
      setOilSources([]);
      setMessage({ 
        type: 'error', 
        text: 'Failed to load oil sources. Some features may be limited.' 
      });
    } finally {
      setLoadingOilSources(false);
    }
  };

  const fetchBOMDetails = async (skuId) => {
    try {
      const response = await fetch(`https://puvi-backend.onrender.com/api/sku/bom/${skuId}`);
      if (!response.ok) {
        console.warn('No BOM configured for this SKU');
        setBomDetails([]);
        return;
      }
      
      const data = await response.json();
      if (data.success && data.bom && data.bom.details) {
        setBomDetails(data.bom.details);
      } else {
        setBomDetails([]);
      }
    } catch (error) {
      console.error('Error fetching BOM:', error);
      setBomDetails([]);
    }
  };

  const fetchMaterials = async () => {
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/materials?category=Packing');
      if (!response.ok) throw new Error('Failed to fetch materials');
      const data = await response.json();
      setMaterials(data.materials || data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMaterials([]);
    }
  };

  const fetchLaborRates = async () => {
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/cost_elements/master');
      if (!response.ok) throw new Error('Failed to fetch labor rates');
      const data = await response.json();
      
      // Filter for labor category costs
      const laborElements = (data.elements || data || []).filter(
        e => e.category === 'Labor' || e.element_name?.includes('Packaging')
      );
      
      setLaborRates(laborElements);
      
      // Set default labor rate if available
      if (laborElements.length > 0) {
        const packagingLabor = laborElements.find(e => e.element_name?.includes('Packaging')) || laborElements[0];
        setProductionData(prev => ({
          ...prev,
          labor_rate: packagingLabor.default_rate || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching labor rates:', error);
      setLaborRates([]);
    }
  };

  const calculateOilRequired = (bottlesPlanned) => {
    if (!selectedSKU || !bottlesPlanned) return 0;
    
    // Extract package size (e.g., "1L" -> 1, "500ml" -> 0.5, "5L" -> 5)
    const packageSize = selectedSKU.package_size || '1L';
    let liters = 1;
    
    if (packageSize.includes('ml')) {
      liters = parseFloat(packageSize) / 1000;
    } else if (packageSize.includes('L')) {
      liters = parseFloat(packageSize);
    }
    
    // Convert to kg (oil density = 0.91 kg/L for groundnut oil)
    const oilDensity = 0.91;
    return bottlesPlanned * liters * oilDensity;
  };

  const calculateMaterialCost = () => {
    if (!bomDetails.length || !productionData.bottles_planned) return 0;
    
    let totalMaterialCost = 0;
    
    bomDetails.forEach(item => {
      const material = materials.find(m => m.material_id === item.material_id);
      if (material) {
        const quantityNeeded = item.quantity_per_unit * productionData.bottles_planned;
        const cost = quantityNeeded * (material.rate || material.cost_per_unit || 0);
        totalMaterialCost += cost;
      }
    });
    
    return totalMaterialCost;
  };

  const calculateOilCost = () => {
    let totalOilCost = 0;
    
    productionData.oil_allocations.forEach(allocation => {
      const source = oilSources.find(s => s.id === allocation.source_id);
      if (source) {
        totalOilCost += allocation.quantity * source.cost_per_kg;
      }
    });
    
    return totalOilCost;
  };

  const calculateLaborCost = () => {
    const hours = productionData.labor_hours || 0;
    const rate = productionData.labor_rate || 0;
    return hours * rate;
  };

  const updateTotalCosts = () => {
    const oilCost = calculateOilCost();
    const materialCost = calculateMaterialCost();
    const laborCost = calculateLaborCost();
    const totalCost = oilCost + materialCost + laborCost;
    
    setProductionData(prev => ({
      ...prev,
      oil_cost_total: oilCost,
      material_cost_total: materialCost,
      labor_cost_total: laborCost,
      total_production_cost: totalCost
    }));
  };

  const handleCheckAvailability = async () => {
    if (!productionData.sku_id) {
      setMessage({ type: 'error', text: 'Please select an SKU' });
      return;
    }
    
    if (!productionData.bottles_planned || productionData.bottles_planned <= 0) {
      setMessage({ type: 'error', text: 'Please enter bottles planned' });
      return;
    }
    
    const oilRequired = calculateOilRequired(productionData.bottles_planned);
    setProductionData(prev => ({ ...prev, oil_required: oilRequired }));
    
    // Check if enough oil is available
    const totalAvailable = oilSources.reduce((sum, source) => sum + source.available, 0);
    
    if (totalAvailable < oilRequired) {
      setMessage({ 
        type: 'error', 
        text: `Insufficient oil. Required: ${oilRequired.toFixed(2)} kg, Available: ${totalAvailable.toFixed(2)} kg` 
      });
      return;
    }
    
    // Initialize oil allocations
    const allocations = [];
    let remainingRequired = oilRequired;
    
    for (const source of oilSources) {
      if (remainingRequired <= 0) break;
      
      const allocation = Math.min(source.available, remainingRequired);
      if (allocation > 0) {
        allocations.push({
          source_id: source.id,
          source_type: source.type,
          source_code: source.code,
          quantity: allocation,
          traceable_code: source.traceable_code
        });
        remainingRequired -= allocation;
      }
    }
    
    setProductionData(prev => ({ 
      ...prev, 
      oil_allocations: allocations 
    }));
    
    // Calculate initial costs
    updateTotalCosts();
    
    setMessage({ type: 'success', text: 'Oil availability checked. Please review allocation.' });
    setStep(2);
  };

  const handleAllocateOil = () => {
    if (productionData.oil_allocations.length === 0) {
      setMessage({ type: 'error', text: 'No oil allocations made' });
      return;
    }
    
    // Update costs after any manual allocation changes
    updateTotalCosts();
    
    setMessage({ type: 'success', text: 'Oil allocated successfully. Proceed to production entry.' });
    setStep(3);
  };

  const handleSaveProduction = async () => {
    if (!productionData.bottles_produced || !productionData.operator_name) {
      setMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }
    
    setLoading(true);
    try {
      // Final cost calculation
      updateTotalCosts();
      
      const payload = {
        ...productionData,
        production_date: productionData.production_date,
        oil_cost_total: productionData.oil_cost_total,
        material_cost_total: productionData.material_cost_total,
        labor_cost_total: productionData.labor_cost_total,
        total_production_cost: productionData.total_production_cost
      };
      
      const response = await fetch('https://puvi-backend.onrender.com/api/sku/production/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Failed to save production');
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to save production');
      }
      
      setMessage({ type: 'success', text: 'Production saved successfully!' });
      
      // Reset form after 2 seconds
      setTimeout(() => {
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
          notes: '',
          oil_cost_total: 0,
          material_cost_total: 0,
          labor_cost_total: 0,
          total_production_cost: 0,
          labor_hours: 0,
          labor_rate: productionData.labor_rate
        });
        setOilSources([]);
      }, 2000);
    } catch (error) {
      console.error('Error saving production:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save production' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="production-entry">
      <h2>Production Entry</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <div className="step-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Plan Production</div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Allocate Oil</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Enter Production</div>
      </div>
      
      {step === 1 && (
        <div className="step-content">
          <h3>Step 1: Plan Production</h3>
          
          <div className="form-group">
            <label>Select SKU *</label>
            <select 
              value={productionData.sku_id}
              onChange={(e) => setProductionData(prev => ({ ...prev, sku_id: e.target.value }))}
            >
              <option value="">- Select SKU -</option>
              {skuList.map(sku => (
                <option key={sku.sku_id} value={sku.sku_id}>
                  {sku.sku_code} - {sku.product_name} ({sku.oil_type})
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Production Date *</label>
            <input 
              type="date"
              value={productionData.production_date}
              onChange={(e) => setProductionData(prev => ({ ...prev, production_date: e.target.value }))}
            />
          </div>
          
          <div className="form-group">
            <label>Bottles Planned *</label>
            <input 
              type="number"
              value={productionData.bottles_planned}
              onChange={(e) => {
                const bottles = parseInt(e.target.value) || 0;
                setProductionData(prev => ({ ...prev, bottles_planned: bottles }));
              }}
              min="1"
            />
          </div>
          
          {productionData.bottles_planned > 0 && selectedSKU && (
            <div className="oil-requirement">
              <p>Oil Required: {calculateOilRequired(productionData.bottles_planned).toFixed(2)} kg</p>
              <p>Package Size: {selectedSKU.package_size}</p>
            </div>
          )}
          
          <button 
            className="btn-primary"
            onClick={handleCheckAvailability}
            disabled={!productionData.sku_id || !productionData.bottles_planned || loadingOilSources}
          >
            {loadingOilSources ? 'Loading Oil Sources...' : 'Check Oil Availability'}
          </button>
        </div>
      )}
      
      {step === 2 && (
        <div className="step-content">
          <h3>Step 2: Oil Allocation</h3>
          
          <div className="allocation-summary">
            <p><strong>Oil Required:</strong> {productionData.oil_required.toFixed(2)} kg</p>
            <p><strong>Bottles Planned:</strong> {productionData.bottles_planned}</p>
          </div>
          
          <h4>Oil Sources Allocation</h4>
          <table className="allocation-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Type</th>
                <th>Available (kg)</th>
                <th>Cost/kg</th>
                <th>Allocated (kg)</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {productionData.oil_allocations.map((allocation, index) => {
                const source = oilSources.find(s => s.id === allocation.source_id);
                return (
                  <tr key={index}>
                    <td>{allocation.source_code}</td>
                    <td>{allocation.source_type}</td>
                    <td>{source?.available.toFixed(2)}</td>
                    <td>₹{source?.cost_per_kg.toFixed(2)}</td>
                    <td>
                      <input 
                        type="number"
                        value={allocation.quantity}
                        onChange={(e) => {
                          const newAllocations = [...productionData.oil_allocations];
                          newAllocations[index].quantity = parseFloat(e.target.value) || 0;
                          setProductionData(prev => ({ ...prev, oil_allocations: newAllocations }));
                        }}
                        min="0"
                        max={source?.available}
                        step="0.01"
                      />
                    </td>
                    <td>₹{(allocation.quantity * (source?.cost_per_kg || 0)).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4"><strong>Total</strong></td>
                <td><strong>{productionData.oil_allocations.reduce((sum, a) => sum + a.quantity, 0).toFixed(2)}</strong></td>
                <td><strong>₹{calculateOilCost().toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <div className="cost-summary">
            <h4>Estimated Production Costs</h4>
            <table>
              <tbody>
                <tr>
                  <td>Oil Cost:</td>
                  <td>₹{calculateOilCost().toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Material Cost (BOM):</td>
                  <td>₹{calculateMaterialCost().toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Labor Cost (Est. 2 hrs):</td>
                  <td>₹{(2 * productionData.labor_rate).toFixed(2)}</td>
                </tr>
                <tr className="total-row">
                  <td><strong>Total Estimated Cost:</strong></td>
                  <td><strong>₹{(calculateOilCost() + calculateMaterialCost() + (2 * productionData.labor_rate)).toFixed(2)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="action-buttons">
            <button className="btn-primary" onClick={handleAllocateOil}>
              Confirm Allocation
            </button>
            <button className="btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
          </div>
        </div>
      )}
      
      {step === 3 && (
        <div className="step-content">
          <h3>Step 3: Enter Production Details</h3>
          
          <div className="form-group">
            <label>Bottles Produced *</label>
            <input 
              type="number"
              value={productionData.bottles_produced}
              onChange={(e) => setProductionData(prev => ({ ...prev, bottles_produced: e.target.value }))}
              min="0"
              placeholder={`Planned: ${productionData.bottles_planned}`}
            />
          </div>
          
          <div className="form-group">
            <label>Actual Labor Hours *</label>
            <input 
              type="number"
              value={productionData.labor_hours}
              onChange={(e) => {
                const hours = parseFloat(e.target.value) || 0;
                setProductionData(prev => ({ ...prev, labor_hours: hours }));
                updateTotalCosts();
              }}
              min="0"
              step="0.5"
            />
          </div>
          
          <div className="form-group">
            <label>Labor Rate (₹/hr)</label>
            <select 
              value={productionData.labor_rate}
              onChange={(e) => {
                setProductionData(prev => ({ ...prev, labor_rate: parseFloat(e.target.value) }));
                updateTotalCosts();
              }}
            >
              {laborRates.map(rate => (
                <option key={rate.element_id} value={rate.default_rate}>
                  {rate.element_name} - ₹{rate.default_rate}/hr
                </option>
              ))}
              <option value={productionData.labor_rate}>Custom - ₹{productionData.labor_rate}/hr</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Operator Name *</label>
            <input 
              type="text"
              value={productionData.operator_name}
              onChange={(e) => setProductionData(prev => ({ ...prev, operator_name: e.target.value }))}
              placeholder="Enter operator name"
            />
          </div>
          
          <div className="form-group">
            <label>Shift Number</label>
            <select 
              value={productionData.shift_number}
              onChange={(e) => setProductionData(prev => ({ ...prev, shift_number: e.target.value }))}
            >
              <option value="1">Shift 1 (Morning)</option>
              <option value="2">Shift 2 (Afternoon)</option>
              <option value="3">Shift 3 (Night)</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Notes</label>
            <textarea 
              value={productionData.notes}
              onChange={(e) => setProductionData(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
              placeholder="Any additional notes or observations"
            />
          </div>
          
          <div className="cost-summary final">
            <h4>Final Production Costs</h4>
            <table>
              <tbody>
                <tr>
                  <td>Oil Cost:</td>
                  <td>₹{productionData.oil_cost_total.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Material Cost:</td>
                  <td>₹{productionData.material_cost_total.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Labor Cost ({productionData.labor_hours} hrs × ₹{productionData.labor_rate}):</td>
                  <td>₹{productionData.labor_cost_total.toFixed(2)}</td>
                </tr>
                <tr className="total-row">
                  <td><strong>Total Production Cost:</strong></td>
                  <td><strong>₹{productionData.total_production_cost.toFixed(2)}</strong></td>
                </tr>
                {productionData.bottles_produced > 0 && (
                  <tr>
                    <td>Cost per Bottle:</td>
                    <td>₹{(productionData.total_production_cost / productionData.bottles_produced).toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
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
