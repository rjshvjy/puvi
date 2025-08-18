// Production Entry Component for SKU Management with MRP and Expiry
// File Path: puvi-frontend/puvi-frontend-main/src/modules/SKUManagement/components/ProductionEntry.js

import React, { useState, useEffect } from 'react';
import api, { skuDateUtils, expiryUtils, formatUtils } from '../../../services/api';

// Add the formatDateForDisplay function as an alias
const formatDateForDisplay = skuDateUtils.formatForDisplay;

const ProductionEntry = () => {
  const [step, setStep] = useState(1);
  const [skuList, setSKUList] = useState([]);
  const [oilSources, setOilSources] = useState([]);
  const [bomDetails, setBomDetails] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [laborRates, setLaborRates] = useState([]);
  const [oilType, setOilType] = useState('');
  const [selectedSKU, setSelectedSKU] = useState(null);
  
  // MRP and Expiry related state - NEW
  const [currentMRP, setCurrentMRP] = useState(null);
  const [shelfLife, setShelfLife] = useState(null);
  const [expiryDate, setExpiryDate] = useState(null);
  const [daysToExpiry, setDaysToExpiry] = useState(null);
  const [expiryStatus, setExpiryStatus] = useState('normal');
  
  const [productionData, setProductionData] = useState({
    sku_id: '',
    production_date: new Date().toISOString().split('T')[0],
    packing_date: new Date().toISOString().split('T')[0], // NEW - Required for v2.0
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
    labor_rate: 0,
    // MRP and Expiry fields - NEW
    mrp_at_production: 0,
    expiry_date: null,
    shelf_life_months: null
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingOilSources, setLoadingOilSources] = useState(false);
  const [loadingMRP, setLoadingMRP] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch SKUs on component mount
  useEffect(() => {
    fetchSKUs();
    fetchMaterials();
    fetchLaborRates();
  }, []);

  // Update oil type and fetch MRP/shelf life when SKU is selected
  useEffect(() => {
    if (productionData.sku_id && skuList.length > 0) {
      const selected = skuList.find(s => s.sku_id === parseInt(productionData.sku_id));
      if (selected) {
        setSelectedSKU(selected);
        setOilType(selected.oil_type);
        fetchBOMDetails(selected.sku_id);
        fetchSKUDetailsWithMRP(selected.sku_id); // NEW - Fetch MRP and shelf life
      }
    }
  }, [productionData.sku_id, skuList]);

  // Fetch oil sources when oil type is set
  useEffect(() => {
    if (oilType) {
      fetchOilSources();
    }
  }, [oilType]);

  // Calculate expiry date when production date or shelf life changes - NEW
  useEffect(() => {
    if (productionData.production_date && shelfLife) {
      const calculatedExpiry = skuDateUtils.calculateExpiryDate(
        productionData.production_date, 
        shelfLife
      );
      setExpiryDate(calculatedExpiry);
      
      // Calculate days to expiry
      const days = skuDateUtils.calculateDaysToExpiry(calculatedExpiry);
      setDaysToExpiry(days);
      
      // Get expiry status
      const status = expiryUtils.getStatus(days);
      setExpiryStatus(status);
      
      // Update production data with expiry
      setProductionData(prev => ({
        ...prev,
        expiry_date: calculatedExpiry,
        shelf_life_months: shelfLife
      }));
    }
  }, [productionData.production_date, shelfLife]);

  // NEW - Fetch SKU details including MRP and shelf life
  const fetchSKUDetailsWithMRP = async (skuId) => {
    setLoadingMRP(true);
    try {
      // Fetch SKU details for shelf life
      const skuDetailsResponse = await api.sku.getSKUDetails(skuId);
      if (skuDetailsResponse.success && skuDetailsResponse.sku) {
        const skuData = skuDetailsResponse.sku;
        setShelfLife(skuData.shelf_life_months);
        
        // If MRP is in SKU details, use it
        if (skuData.mrp_current) {
          setCurrentMRP(skuData.mrp_current);
          setProductionData(prev => ({
            ...prev,
            mrp_at_production: skuData.mrp_current
          }));
        }
      }
      
      // Also fetch current MRP from dedicated endpoint
      const mrpResponse = await api.sku.getCurrentMRP(skuId);
      if (mrpResponse.success && mrpResponse.current_mrp) {
        const mrpAmount = mrpResponse.current_mrp.mrp_amount || 0;
        setCurrentMRP(mrpAmount);
        setProductionData(prev => ({
          ...prev,
          mrp_at_production: mrpAmount
        }));
      }
    } catch (error) {
      console.error('Error fetching SKU details with MRP:', error);
      setMessage({ 
        type: 'warning', 
        text: 'Could not fetch MRP/shelf life. Some features may be limited.' 
      });
    } finally {
      setLoadingMRP(false);
    }
  };

  const fetchSKUs = async () => {
    try {
      const response = await api.sku.getMasterList({ is_active: true });
      
      if (response.success && response.skus) {
        setSKUList(response.skus);
        
        if (response.skus.length === 0) {
          setMessage({ type: 'warning', text: 'No active SKUs found. Please configure SKUs first.' });
        }
      } else {
        setSKUList([]);
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
      const response = await api.blending.getBatchesForOilType(oilType);
      
      if (response.success && response.batches) {
        const sources = response.batches.filter(s => s.available_quantity > 0);
        
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
      } else {
        setOilSources([]);
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
      const response = await api.sku.getBOM(skuId);
      if (response.success && response.bom && response.bom_details) {
        setBomDetails(response.bom_details);
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
      const response = await api.purchase.getMaterials({ category: 'Packing' });
      if (response.success) {
        setMaterials(response.materials || []);
      } else {
        setMaterials([]);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMaterials([]);
    }
  };

  const fetchLaborRates = async () => {
    try {
      const response = await api.costManagement.getCostElementsMaster();
      if (response.success) {
        const laborElements = (response.elements || []).filter(
          e => e.category === 'Labor' || e.element_name?.includes('Packaging')
        );
        
        setLaborRates(laborElements);
        
        if (laborElements.length > 0) {
          const packagingLabor = laborElements.find(e => e.element_name?.includes('Packaging')) || laborElements[0];
          setProductionData(prev => ({
            ...prev,
            labor_rate: packagingLabor.default_rate || 0
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching labor rates:', error);
      setLaborRates([]);
    }
  };

  const calculateOilRequired = (bottlesPlanned) => {
    if (!selectedSKU || !bottlesPlanned) return 0;
    
    const packageSize = selectedSKU.package_size || '1L';
    let liters = 1;
    
    if (packageSize.includes('ml')) {
      liters = parseFloat(packageSize) / 1000;
    } else if (packageSize.includes('L')) {
      liters = parseFloat(packageSize);
    }
    
    const oilDensity = selectedSKU.density || 0.91;
    return bottlesPlanned * liters * oilDensity;
  };

  const calculateMaterialCost = () => {
    if (!bomDetails.length || !productionData.bottles_planned) return 0;
    
    let totalMaterialCost = 0;
    
    bomDetails.forEach(item => {
      const material = materials.find(m => m.material_id === item.material_id);
      if (material) {
        const quantityNeeded = item.quantity_per_unit * productionData.bottles_planned;
        const cost = quantityNeeded * (material.current_cost || material.rate || material.cost_per_unit || 0);
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
    
    updateTotalCosts();
    
    setMessage({ type: 'success', text: 'Oil availability checked. Please review allocation.' });
    setStep(2);
  };

  const handleAllocateOil = () => {
    if (productionData.oil_allocations.length === 0) {
      setMessage({ type: 'error', text: 'No oil allocations made' });
      return;
    }
    
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
      updateTotalCosts();
      
      // Prepare payload for v2.0 endpoint
      const payload = {
        sku_id: parseInt(productionData.sku_id),
        production_date: productionData.production_date,
        packing_date: productionData.packing_date,
        bottles_planned: parseInt(productionData.bottles_planned),
        bottles_produced: parseInt(productionData.bottles_produced),
        oil_allocations: productionData.oil_allocations.map(alloc => ({
          source_id: alloc.source_id,
          source_type: alloc.source_type,
          quantity_allocated: alloc.quantity,
          source_traceable_code: alloc.traceable_code
        })),
        material_consumptions: bomDetails.map(item => ({
          material_id: item.material_id,
          planned_quantity: item.quantity_per_unit * productionData.bottles_planned,
          actual_quantity: item.quantity_per_unit * productionData.bottles_produced,
          material_cost_per_unit: materials.find(m => m.material_id === item.material_id)?.current_cost || 0,
          total_cost: 0 // Will be calculated by backend
        })),
        labor_hours: productionData.labor_hours,
        labor_rate: productionData.labor_rate,
        operator_name: productionData.operator_name,
        shift_number: productionData.shift_number,
        notes: productionData.notes
      };
      
      // Use new v2.0 endpoint
      const response = await api.sku.createProduction(payload);
      
      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: `Production saved successfully! Code: ${response.production_code}. 
                 MRP: ₹${response.mrp_at_production}, 
                 Expiry: ${formatDateForDisplay(response.expiry_date)}` 
        });
        
        // Reset form after 3 seconds
        setTimeout(() => {
          resetForm();
        }, 3000);
      } else {
        throw new Error(response.error || 'Failed to save production');
      }
    } catch (error) {
      console.error('Error saving production:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save production' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setProductionData({
      sku_id: '',
      production_date: new Date().toISOString().split('T')[0],
      packing_date: new Date().toISOString().split('T')[0],
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
      labor_rate: productionData.labor_rate,
      mrp_at_production: 0,
      expiry_date: null,
      shelf_life_months: null
    });
    setOilSources([]);
    setCurrentMRP(null);
    setShelfLife(null);
    setExpiryDate(null);
    setDaysToExpiry(null);
    setExpiryStatus('normal');
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
          
          {/* MRP and Shelf Life Display - NEW */}
          {selectedSKU && (
            <div className="sku-details-panel">
              <div className="detail-row">
                <label>Current MRP:</label>
                <span className="value">
                  {loadingMRP ? 'Loading...' : formatUtils.currency(currentMRP)}
                </span>
              </div>
              <div className="detail-row">
                <label>Shelf Life:</label>
                <span className="value">
                  {shelfLife ? `${shelfLife} months` : 'Not configured'}
                </span>
              </div>
            </div>
          )}
          
          <div className="form-group">
            <label>Production Date *</label>
            <input 
              type="date"
              value={productionData.production_date}
              onChange={(e) => setProductionData(prev => ({ 
                ...prev, 
                production_date: e.target.value,
                packing_date: e.target.value // Auto-update packing date
              }))}
            />
          </div>
          
          <div className="form-group">
            <label>Packing Date *</label>
            <input 
              type="date"
              value={productionData.packing_date}
              onChange={(e) => setProductionData(prev => ({ ...prev, packing_date: e.target.value }))}
              min={productionData.production_date}
            />
          </div>
          
          {/* Expiry Date Display - NEW */}
          {expiryDate && (
            <div className="expiry-info-panel">
              <div className="detail-row">
                <label>Expiry Date:</label>
                <span className="value">
                  {formatDateForDisplay(expiryDate)}
                </span>
              </div>
              <div className="detail-row">
                <label>Days to Expiry:</label>
                <span className={`value expiry-status-${expiryStatus}`}>
                  {daysToExpiry} days
                  <span className="status-badge" style={{
                    backgroundColor: expiryUtils.getStatusColor(expiryStatus),
                    marginLeft: '10px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    color: expiryStatus === 'warning' ? '#000' : '#fff'
                  }}>
                    {expiryStatus.toUpperCase()}
                  </span>
                </span>
              </div>
            </div>
          )}
          
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
              <p>Density: {selectedSKU.density || 0.91} kg/L</p>
            </div>
          )}
          
          <button 
            className="btn-primary"
            onClick={handleCheckAvailability}
            disabled={!productionData.sku_id || !productionData.bottles_planned || loadingOilSources || loadingMRP}
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
            <p><strong>MRP:</strong> {formatUtils.currency(currentMRP)}</p>
            <p><strong>Expiry Date:</strong> {formatDateForDisplay(expiryDate)}</p>
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
                    <td>{formatUtils.currency(source?.cost_per_kg)}</td>
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
                    <td>{formatUtils.currency(allocation.quantity * (source?.cost_per_kg || 0))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4"><strong>Total</strong></td>
                <td><strong>{productionData.oil_allocations.reduce((sum, a) => sum + a.quantity, 0).toFixed(2)}</strong></td>
                <td><strong>{formatUtils.currency(calculateOilCost())}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <div className="cost-summary">
            <h4>Estimated Production Costs</h4>
            <table>
              <tbody>
                <tr>
                  <td>Oil Cost:</td>
                  <td>{formatUtils.currency(calculateOilCost())}</td>
                </tr>
                <tr>
                  <td>Material Cost (BOM):</td>
                  <td>{formatUtils.currency(calculateMaterialCost())}</td>
                </tr>
                <tr>
                  <td>Labor Cost (Est. 2 hrs):</td>
                  <td>{formatUtils.currency(2 * productionData.labor_rate)}</td>
                </tr>
                <tr className="total-row">
                  <td><strong>Total Estimated Cost:</strong></td>
                  <td><strong>{formatUtils.currency(calculateOilCost() + calculateMaterialCost() + (2 * productionData.labor_rate))}</strong></td>
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
          
          {/* Production Info Panel - Enhanced */}
          <div className="production-info-panel">
            <div className="info-grid">
              <div className="info-item">
                <label>MRP at Production:</label>
                <span className="value">{formatUtils.currency(currentMRP)}</span>
              </div>
              <div className="info-item">
                <label>Expiry Date:</label>
                <span className="value">{formatDateForDisplay(expiryDate)}</span>
              </div>
              <div className="info-item">
                <label>Days to Expiry:</label>
                <span className="value">{daysToExpiry} days</span>
              </div>
              <div className="info-item">
                <label>Status:</label>
                <span className={`value expiry-status-${expiryStatus}`}>
                  {expiryStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          
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
                  <td>{formatUtils.currency(productionData.oil_cost_total)}</td>
                </tr>
                <tr>
                  <td>Material Cost:</td>
                  <td>{formatUtils.currency(productionData.material_cost_total)}</td>
                </tr>
                <tr>
                  <td>Labor Cost ({productionData.labor_hours} hrs × ₹{productionData.labor_rate}):</td>
                  <td>{formatUtils.currency(productionData.labor_cost_total)}</td>
                </tr>
                <tr className="total-row">
                  <td><strong>Total Production Cost:</strong></td>
                  <td><strong>{formatUtils.currency(productionData.total_production_cost)}</strong></td>
                </tr>
                {productionData.bottles_produced > 0 && (
                  <tr>
                    <td>Cost per Bottle:</td>
                    <td>{formatUtils.currency(productionData.total_production_cost / productionData.bottles_produced)}</td>
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
