// File Path: puvi-frontend/src/modules/SKUManagement/components/ProductionEntry.js
// SKU Production Entry Component - CORRECTED VERSION
// Matches actual backend API endpoints and database structure
// Version: 1.1 (Simplified - No cartons in production)

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const ProductionEntry = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState('planning'); // planning, allocated, ready
  
  // Master data
  const [skus, setSkus] = useState([]);
  
  // Form data
  const [formData, setFormData] = useState({
    sku_id: '',
    bottles_planned: '',
    bottles_produced: '',
    production_date: new Date().toISOString().split('T')[0],
    packing_date: new Date().toISOString().split('T')[0],
    operator_name: '',
    shift_number: 1,
    production_line: 'Line-1',
    notes: ''
  });
  
  // Selected SKU details
  const [selectedSKU, setSelectedSKU] = useState(null);
  
  // Production plan response
  const [productionPlan, setProductionPlan] = useState(null);
  
  // Oil allocation response
  const [oilAllocations, setOilAllocations] = useState(null);
  
  // Cost preview
  const [costPreview, setCostPreview] = useState({
    oil_cost: 0,
    material_cost: 0,
    labor_cost: 0,
    total_cost: 0,
    cost_per_bottle: 0
  });
  
  // Load SKUs on mount
  useEffect(() => {
    fetchSKUs();
  }, []);
  
  // Fetch SKUs with BOM configured
  const fetchSKUs = async () => {
    try {
      const response = await api.get('/api/sku/master?is_active=true');
      if (response.data.success) {
        // Filter only SKUs with BOM configured
        const skusWithBOM = response.data.skus.filter(sku => sku.current_bom_version > 0);
        setSkus(skusWithBOM);
      }
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setMessage('❌ Error loading SKUs');
    }
  };
  
  // Handle SKU selection
  const handleSKUSelect = (skuId) => {
    if (!skuId) {
      setSelectedSKU(null);
      setProductionPlan(null);
      setOilAllocations(null);
      setStep('planning');
      return;
    }
    
    const sku = skus.find(s => s.sku_id === parseInt(skuId));
    setSelectedSKU(sku);
    
    // Reset to planning step when SKU changes
    setStep('planning');
    setProductionPlan(null);
    setOilAllocations(null);
  };
  
  // Step 1: Create Production Plan
  const handleProductionPlan = async () => {
    if (!selectedSKU || !formData.bottles_planned) {
      setMessage('❌ Please select SKU and enter planned quantity');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const response = await api.post('/api/sku/production/plan', {
        sku_id: selectedSKU.sku_id,
        bottles_planned: parseInt(formData.bottles_planned),
        production_date: formData.production_date
      });
      
      if (response.data.success) {
        setProductionPlan(response.data.plan);
        setMessage(`✅ Production plan created!
Oil Required: ${response.data.plan.oil_required.toFixed(2)} kg
Available Oil: ${response.data.plan.available_oil.length} sources`);
        setStep('allocated');
        
        // Automatically allocate oil
        await handleOilAllocation(response.data.plan);
      } else {
        setMessage(`❌ Error: ${response.data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Step 2: Allocate Oil
  const handleOilAllocation = async (plan) => {
    setLoading(true);
    
    try {
      const response = await api.post('/api/sku/production/allocate-oil', {
        sku_id: selectedSKU.sku_id,
        quantity_required: plan.oil_required,
        oil_type: selectedSKU.oil_type
      });
      
      if (response.data.success) {
        setOilAllocations(response.data);
        
        // Calculate cost preview
        updateCostPreview(response.data);
        
        setStep('ready');
        setMessage('✅ Oil allocated successfully! Ready for production.');
      } else {
        setMessage(`❌ Error: ${response.data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error allocating oil: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Update cost preview
  const updateCostPreview = async (allocations) => {
    if (!selectedSKU || !formData.bottles_planned) return;
    
    try {
      const response = await api.post('/api/sku/cost-preview', {
        sku_id: selectedSKU.sku_id,
        quantity: parseInt(formData.bottles_produced || formData.bottles_planned),
        oil_cost_per_kg: allocations.weighted_oil_cost
      });
      
      if (response.data.success) {
        const preview = response.data.cost_preview;
        setCostPreview({
          oil_cost: preview.oil_requirement.total_cost,
          material_cost: preview.material_cost.total,
          labor_cost: preview.labor_cost.total,
          total_cost: preview.summary.total_production_cost,
          cost_per_bottle: preview.summary.cost_per_bottle
        });
      }
    } catch (error) {
      console.error('Error calculating cost preview:', error);
    }
  };
  
  // Handle form change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If bottles_produced changes, update cost preview
    if (name === 'bottles_produced' && oilAllocations) {
      updateCostPreview(oilAllocations);
    }
  };
  
  // Step 3: Submit Production
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step !== 'ready') {
      setMessage('❌ Please complete planning and allocation first');
      return;
    }
    
    if (!formData.bottles_produced) {
      setMessage('❌ Please enter actual bottles produced');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const submissionData = {
        sku_id: selectedSKU.sku_id,
        bottles_planned: parseInt(formData.bottles_planned),
        bottles_produced: parseInt(formData.bottles_produced),
        production_date: formData.production_date,
        packing_date: formData.packing_date,
        oil_allocations: oilAllocations.allocations.map(a => ({
          source_type: a.source_type,
          source_id: a.source_id,
          traceable_code: a.traceable_code,
          quantity_allocated: a.quantity_allocated,
          oil_cost_per_kg: a.oil_cost_per_kg,
          allocation_cost: a.allocation_cost || (a.quantity_allocated * a.oil_cost_per_kg)
        })),
        operator_name: formData.operator_name,
        shift_number: parseInt(formData.shift_number),
        production_line: formData.production_line,
        notes: formData.notes,
        created_by: 'Production User'
      };
      
      const response = await api.post('/api/sku/production', submissionData);
      
      if (response.data.success) {
        setMessage(`✅ Production recorded successfully!
Production Code: ${response.data.production_code}
Traceable Code: ${response.data.traceable_code}
Total Cost: ₹${response.data.cost_summary.total_cost.toFixed(2)}
Cost per Bottle: ₹${response.data.cost_summary.cost_per_bottle.toFixed(2)}`);
        
        // Reset form
        resetForm();
      } else {
        setMessage(`❌ Error: ${response.data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      sku_id: '',
      bottles_planned: '',
      bottles_produced: '',
      production_date: new Date().toISOString().split('T')[0],
      packing_date: new Date().toISOString().split('T')[0],
      operator_name: '',
      shift_number: 1,
      production_line: 'Line-1',
      notes: ''
    });
    setSelectedSKU(null);
    setProductionPlan(null);
    setOilAllocations(null);
    setCostPreview({
      oil_cost: 0,
      material_cost: 0,
      labor_cost: 0,
      total_cost: 0,
      cost_per_bottle: 0
    });
    setStep('planning');
  };
  
  // Format date for display (DD-MM-YYYY)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  
  // Extract variety codes from traceable code
  const extractVarietyCodes = (traceableCode) => {
    if (!traceableCode) return '';
    
    const parts = traceableCode.split('-');
    if (parts.length === 4) {
      // Single variety: GNO-K-05082025-PUV
      return parts[1];
    } else if (parts.length === 3) {
      // Blend: GNOKU-07082025-PUV
      // Extract variety codes (remove first 3 chars for oil type)
      const firstPart = parts[0];
      if (firstPart.length > 3) {
        return firstPart.substring(3);
      }
    }
    return '';
  };
  
  return (
    <div className="production-entry-container">
      <form onSubmit={handleSubmit} className="production-form">
        
        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step ${step === 'planning' ? 'active' : step !== 'planning' ? 'completed' : ''}`}>
            1. Planning
          </div>
          <div className={`step ${step === 'allocated' ? 'active' : step === 'ready' ? 'completed' : ''}`}>
            2. Oil Allocation
          </div>
          <div className={`step ${step === 'ready' ? 'active' : ''}`}>
            3. Production Entry
          </div>
        </div>
        
        {/* SKU Selection Section */}
        <div className="form-section">
          <h3>SKU Selection</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Select SKU *</label>
              <select
                name="sku_id"
                value={formData.sku_id}
                onChange={(e) => {
                  handleInputChange(e);
                  handleSKUSelect(e.target.value);
                }}
                required
                disabled={loading || step !== 'planning'}
              >
                <option value="">-- Select SKU --</option>
                {skus.map(sku => (
                  <option key={sku.sku_id} value={sku.sku_id}>
                    {sku.product_name} ({sku.package_size})
                  </option>
                ))}
              </select>
            </div>
            
            {selectedSKU && (
              <div className="sku-details">
                <span>Oil Type: <strong>{selectedSKU.oil_type}</strong></span>
                <span>Density: <strong>{selectedSKU.density} kg/L</strong></span>
                <span>BOM Version: <strong>v{selectedSKU.current_bom_version}</strong></span>
              </div>
            )}
          </div>
        </div>
        
        {/* Production Planning Section */}
        <div className="form-section">
          <h3>Production Planning</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Bottles Planned *</label>
              <input
                type="number"
                name="bottles_planned"
                value={formData.bottles_planned}
                onChange={handleInputChange}
                min="1"
                required
                disabled={loading || !selectedSKU || step !== 'planning'}
              />
            </div>
            
            <div className="form-group">
              <label>Production Date *</label>
              <input
                type="date"
                name="production_date"
                value={formData.production_date}
                onChange={handleInputChange}
                required
                disabled={loading || step !== 'planning'}
              />
            </div>
            
            <div className="form-group">
              <label>Action</label>
              <button
                type="button"
                onClick={handleProductionPlan}
                disabled={loading || !selectedSKU || !formData.bottles_planned || step !== 'planning'}
                className="button-primary"
              >
                Check Oil Availability
              </button>
            </div>
          </div>
          
          {productionPlan && (
            <div className="plan-summary">
              <div className="summary-item">
                <span>Oil Required:</span>
                <strong>{productionPlan.oil_required.toFixed(2)} kg</strong>
              </div>
              <div className="summary-item">
                <span>Available Sources:</span>
                <strong>{productionPlan.available_oil.length}</strong>
              </div>
              <div className="summary-item">
                <span>Total Available:</span>
                <strong>{productionPlan.total_available.toFixed(2)} kg</strong>
              </div>
            </div>
          )}
        </div>
        
        {/* Oil Allocation Section */}
        {oilAllocations && (
          <div className="form-section">
            <h3>Oil Allocation (FIFO)</h3>
            <div className="allocation-table">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Type</th>
                    <th>Traceable Code</th>
                    <th>Varieties</th>
                    <th>Allocated</th>
                    <th>Rate/kg</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {oilAllocations.allocations.map((allocation, index) => (
                    <tr key={index}>
                      <td>{allocation.source_type === 'batch' ? 'Batch' : 'Blend'} #{allocation.source_id}</td>
                      <td>{allocation.source_type}</td>
                      <td className="code-cell">{allocation.traceable_code}</td>
                      <td><strong>{extractVarietyCodes(allocation.traceable_code)}</strong></td>
                      <td>{allocation.quantity_allocated.toFixed(2)} kg</td>
                      <td>₹{allocation.oil_cost_per_kg.toFixed(2)}</td>
                      <td>₹{(allocation.quantity_allocated * allocation.oil_cost_per_kg).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4"><strong>Total</strong></td>
                    <td><strong>{oilAllocations.total_quantity.toFixed(2)} kg</strong></td>
                    <td><strong>₹{oilAllocations.weighted_oil_cost.toFixed(2)}</strong></td>
                    <td><strong>₹{oilAllocations.total_oil_cost.toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
        
        {/* Production Entry Section */}
        {step === 'ready' && (
          <>
            <div className="form-section">
              <h3>Production Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Bottles Produced *</label>
                  <input
                    type="number"
                    name="bottles_produced"
                    value={formData.bottles_produced}
                    onChange={handleInputChange}
                    min="1"
                    max={formData.bottles_planned}
                    required
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Packing Date *</label>
                  <input
                    type="date"
                    name="packing_date"
                    value={formData.packing_date}
                    onChange={handleInputChange}
                    min={formData.production_date}
                    required
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Shift</label>
                  <select
                    name="shift_number"
                    value={formData.shift_number}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value={1}>Shift 1</option>
                    <option value={2}>Shift 2</option>
                    <option value={3}>Shift 3</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Operator Name</label>
                  <input
                    type="text"
                    name="operator_name"
                    value={formData.operator_name}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Production Line</label>
                  <input
                    type="text"
                    name="production_line"
                    value={formData.production_line}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* Cost Preview Section */}
            {costPreview.total_cost > 0 && (
              <div className="form-section cost-preview">
                <h3>Cost Preview</h3>
                <div className="cost-breakdown">
                  <div className="cost-item">
                    <span>Oil Cost:</span>
                    <span>₹{costPreview.oil_cost.toFixed(2)}</span>
                  </div>
                  <div className="cost-item">
                    <span>Material Cost (Bottle, Cap, Label):</span>
                    <span>₹{costPreview.material_cost.toFixed(2)}</span>
                  </div>
                  <div className="cost-item">
                    <span>Labor Cost:</span>
                    <span>₹{costPreview.labor_cost.toFixed(2)}</span>
                  </div>
                  <div className="cost-item total">
                    <span>Total Production Cost:</span>
                    <span>₹{costPreview.total_cost.toFixed(2)}</span>
                  </div>
                  <div className="cost-item highlight">
                    <span>Cost per Bottle:</span>
                    <span>₹{costPreview.cost_per_bottle.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Messages */}
        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : message.includes('⚠️') ? 'warning' : 'error'}`}>
            <pre>{message}</pre>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="form-actions">
          <button 
            type="button" 
            onClick={resetForm}
            className="button-secondary"
            disabled={loading}
          >
            Reset
          </button>
          
          {step === 'ready' && (
            <button 
              type="submit" 
              className="submit-button"
              disabled={loading || !formData.bottles_produced}
            >
              {loading ? 'Recording...' : 'Record Production'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ProductionEntry;
