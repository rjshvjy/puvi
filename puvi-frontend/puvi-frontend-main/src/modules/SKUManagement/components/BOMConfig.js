// BOM Configuration Component for SKU Management with MRP & Shelf Life
// File Path: puvi-frontend/src/modules/SKUManagement/components/BOMConfig.js
// Updated: Fixed display issues and added weight field

import React, { useState, useEffect } from 'react';

const BOMConfig = () => {
  const [skuList, setSKUList] = useState([]);
  const [selectedSKU, setSelectedSKU] = useState('');
  const [selectedSKUData, setSelectedSKUData] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [bomDetails, setBomDetails] = useState([]);
  const [currentBOM, setCurrentBOM] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [bomHistory, setBomHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentMRP, setCurrentMRP] = useState(null);
  const [mrpHistory, setMrpHistory] = useState([]);
  
  // State for dynamic BOM categories
  const [bomCategories, setBomCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    fetchSKUs();
    fetchMaterials();
    fetchBOMCategories();
  }, []);

  // Fetch BOM categories from database
  const fetchBOMCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/config/bom_categories');
      if (!response.ok) throw new Error('Failed to fetch BOM categories');
      const data = await response.json();
      
      if (data.success && data.categories) {
        setBomCategories(data.categories);
      } else {
        // Fallback if no categories configured
        setBomCategories([
          { value: 'Other', label: 'Other' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching BOM categories:', error);
      setMessage({ type: 'warning', text: 'Using default categories. Configure BOM categories in Masters.' });
      // Fallback categories
      setBomCategories([
        { value: 'Other', label: 'Other' }
      ]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchSKUs = async () => {
    try {
      const response = await fetch('https://puvi-backend.onrender.com/api/sku/master?is_active=true');
      if (!response.ok) throw new Error('Failed to fetch SKUs');
      const data = await response.json();
      
      // Handle both wrapped and unwrapped responses
      const skuData = data.skus || data || [];
      setSKUList(Array.isArray(skuData) ? skuData : []);
      
      if (skuData.length === 0) {
        setMessage({ type: 'warning', text: 'No active SKUs found. Please configure SKUs first.' });
      }
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      setMessage({ type: 'error', text: 'Failed to fetch SKUs' });
      setSKUList([]);
    }
  };

  // Fetch materials with optional BOM category filter
  const fetchMaterials = async (bomCategory = null) => {
    try {
      let url = 'https://puvi-backend.onrender.com/api/config/bom_materials';
      if (bomCategory) {
        url += `?bom_category=${encodeURIComponent(bomCategory)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        // Fallback to old endpoint if new one fails
        const fallbackResponse = await fetch('https://puvi-backend.onrender.com/api/materials?category=Packaging');
        if (!fallbackResponse.ok) throw new Error('Failed to fetch materials');
        const fallbackData = await fallbackResponse.json();
        const materialsList = fallbackData.materials || fallbackData || [];
        setMaterials(Array.isArray(materialsList) ? materialsList : []);
        return;
      }
      
      const data = await response.json();
      const materialsList = data.materials || data || [];
      setMaterials(Array.isArray(materialsList) ? materialsList : []);
      
      if (materialsList.length === 0) {
        setMessage({ type: 'info', text: 'No packing materials found. Please add materials first.' });
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMessage({ type: 'error', text: 'Failed to fetch materials' });
      setMaterials([]);
    }
  };

  const fetchCurrentMRP = async (skuId) => {
    try {
      const response = await fetch(`https://puvi-backend.onrender.com/api/sku/current-mrp/${skuId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.current_mrp) {
          setCurrentMRP(data.current_mrp);
        }
      }
    } catch (error) {
      console.error('Error fetching current MRP:', error);
    }
  };

  const fetchMRPHistory = async (skuId) => {
    try {
      const response = await fetch(`https://puvi-backend.onrender.com/api/sku/mrp-history/${skuId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.mrp_history) {
          setMrpHistory(data.mrp_history);
        }
      }
    } catch (error) {
      console.error('Error fetching MRP history:', error);
    }
  };

  const fetchBOM = async (skuId) => {
    try {
      const response = await fetch(`https://puvi-backend.onrender.com/api/sku/bom/${skuId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Handle wrapped response
        if (data.success && data.bom) {
          setCurrentBOM(data.bom);
          setBomDetails(data.bom.details || []);
          
          // Fetch BOM history if available
          if (data.history) {
            setBomHistory(data.history);
          }
        } else {
          setCurrentBOM(null);
          setBomDetails([]);
          setMessage({ type: 'info', text: 'No BOM configured for this SKU yet.' });
        }
      } else if (response.status === 404) {
        // No BOM exists yet
        setCurrentBOM(null);
        setBomDetails([]);
        setMessage({ type: 'info', text: 'No BOM configured for this SKU. Create a new one below.' });
      } else {
        throw new Error('Failed to fetch BOM');
      }
    } catch (error) {
      console.error('Error fetching BOM:', error);
      setMessage({ type: 'error', text: 'Failed to fetch BOM' });
      setCurrentBOM(null);
      setBomDetails([]);
    }
  };

  const handleSKUChange = (e) => {
    const skuId = e.target.value;
    setSelectedSKU(skuId);
    
    if (skuId) {
      const sku = skuList.find(s => s.sku_id === parseInt(skuId));
      setSelectedSKUData(sku);
      fetchBOM(skuId);
      fetchCurrentMRP(skuId);
      fetchMRPHistory(skuId);
    } else {
      setSelectedSKUData(null);
      setCurrentBOM(null);
      setBomDetails([]);
      setBomHistory([]);
      setCurrentMRP(null);
      setMrpHistory([]);
    }
  };

  const handleAddMaterial = () => {
    setBomDetails([...bomDetails, {
      material_id: '',
      material_category: '',
      quantity_per_unit: 1,
      is_shared: false,
      applicable_sizes: [],
      notes: '',
      // Cost tracking fields
      unit_cost: 0,
      total_cost: 0
    }]);
  };

  const handleMaterialChange = (index, field, value) => {
    const updated = [...bomDetails];
    updated[index][field] = value;
    
    if (field === 'material_id' && value) {
      const material = materials.find(m => m.material_id === parseInt(value));
      if (material) {
        // Update cost fields - Use correct field names
        const unitCost = material.rate || material.cost_per_unit || material.current_cost || 0;
        updated[index].unit_cost = unitCost;
        updated[index].total_cost = unitCost * updated[index].quantity_per_unit;
        
        // Let user manually set category - no auto-detect
        if (!updated[index].material_category) {
          updated[index].material_category = 'Other';
        }
      }
    }
    
    // Recalculate total cost if quantity changes
    if (field === 'quantity_per_unit') {
      const material = materials.find(m => m.material_id === parseInt(updated[index].material_id));
      if (material) {
        const unitCost = material.rate || material.cost_per_unit || material.current_cost || 0;
        updated[index].unit_cost = unitCost;
        updated[index].total_cost = unitCost * parseFloat(value || 0);
      }
    }
    
    setBomDetails(updated);
  };

  const handleRemoveMaterial = (index) => {
    setBomDetails(bomDetails.filter((_, i) => i !== index));
  };

  const validateBOM = () => {
    // Check for duplicate materials
    const materialIds = bomDetails.map(item => item.material_id).filter(id => id);
    const uniqueIds = new Set(materialIds);
    if (materialIds.length !== uniqueIds.size) {
      setMessage({ type: 'error', text: 'Duplicate materials found. Each material should be added only once.' });
      return false;
    }
    
    // Check for missing required fields
    for (const item of bomDetails) {
      if (!item.material_id) {
        setMessage({ type: 'error', text: 'Please select a material for all items' });
        return false;
      }
      if (!item.quantity_per_unit || item.quantity_per_unit <= 0) {
        setMessage({ type: 'error', text: 'Please enter valid quantity for all materials' });
        return false;
      }
    }
    
    return true;
  };

  const handleSaveBOM = async () => {
    if (!selectedSKU) {
      setMessage({ type: 'error', text: 'Please select an SKU' });
      return;
    }
    
    if (bomDetails.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one material' });
      return;
    }
    
    if (!validateBOM()) {
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        sku_id: parseInt(selectedSKU),
        bom_details: bomDetails.map(item => ({
          material_id: parseInt(item.material_id),
          material_category: item.material_category || 'Other',
          quantity_per_unit: parseFloat(item.quantity_per_unit),
          is_shared: item.is_shared || false,
          applicable_sizes: item.applicable_sizes || [],
          notes: item.notes || ''
        })),
        notes: `BOM for ${selectedSKUData ? selectedSKUData.sku_code : 'SKU'}`,
        effective_date: new Date().toISOString().split('T')[0]
      };
      
      const url = currentBOM 
        ? `https://puvi-backend.onrender.com/api/sku/bom/${currentBOM.bom_id}`
        : 'https://puvi-backend.onrender.com/api/sku/bom';
      
      const method = currentBOM ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setMessage({ 
          type: 'success', 
          text: currentBOM ? 'BOM updated successfully' : 'BOM created successfully' 
        });
        fetchBOM(selectedSKU); // Refresh BOM data
      } else {
        throw new Error(data.error || 'Failed to save BOM');
      }
    } catch (error) {
      console.error('Error saving BOM:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save BOM' });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCost = () => {
    return bomDetails.reduce((total, item) => {
      const material = materials.find(m => m.material_id === parseInt(item.material_id));
      if (material) {
        const unitCost = material.rate || material.cost_per_unit || material.current_cost || 0;
        return total + (unitCost * parseFloat(item.quantity_per_unit || 0));
      }
      return total;
    }, 0);
  };

  const calculateCostBreakdown = () => {
    const breakdown = {};
    let total = 0;
    
    // Group costs by category dynamically
    bomDetails.forEach(item => {
      const material = materials.find(m => m.material_id === parseInt(item.material_id));
      if (material) {
        const unitCost = material.rate || material.cost_per_unit || material.current_cost || 0;
        const cost = unitCost * parseFloat(item.quantity_per_unit || 0);
        const category = item.material_category || 'Other';
        
        if (!breakdown[category]) {
          breakdown[category] = 0;
        }
        breakdown[category] += cost;
        total += cost;
      }
    });
    
    breakdown.total = total;
    return breakdown;
  };

  return (
    <div className="bom-config">
      <h2>BOM Configuration</h2>
      
      {message.text && (
        <div className={`alert ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <div className="form-section">
        <div className="form-group">
          <label>Select SKU:</label>
          <select value={selectedSKU} onChange={handleSKUChange}>
            <option value="">-- Select SKU --</option>
            {skuList.map(sku => (
              <option key={sku.sku_id} value={sku.sku_id}>
                {sku.sku_code} - {sku.product_name} ({sku.oil_type})
              </option>
            ))}
          </select>
        </div>
        
        {selectedSKU && selectedSKUData && (
          <>
            <div className="sku-info">
              <h4>SKU Details</h4>
              <div className="info-grid">
                <div>
                  <p><strong>Product:</strong> {selectedSKUData.product_name}</p>
                  <p><strong>Oil Type:</strong> {selectedSKUData.oil_type}</p>
                  <p><strong>Package Size:</strong> {selectedSKUData.package_size}</p>
                  <p><strong>Status:</strong> {selectedSKUData.is_active ? 'Active' : 'Inactive'}</p>
                </div>
                <div>
                  <p><strong>Current MRP:</strong> <span className="highlight-mrp">₹{selectedSKUData.mrp_current || 'Not set'}</span></p>
                  <p><strong>Shelf Life:</strong> {selectedSKUData.shelf_life_months ? `${selectedSKUData.shelf_life_months} months` : 'Not set'}</p>
                  <p><strong>MRP Effective:</strong> {selectedSKUData.mrp_effective_date || 'N/A'}</p>
                  <p><strong>Density:</strong> {selectedSKUData.density ? `${selectedSKUData.density} kg/L` : 'Not set'}</p>
                  <p><strong>Weight:</strong> {selectedSKUData.packaged_weight_kg ? `${parseFloat(selectedSKUData.packaged_weight_kg).toFixed(3)} kg` : 'Not set'}</p>
                </div>
              </div>
            </div>

            {/* MRP History Summary */}
            {mrpHistory.length > 0 && (
              <div className="mrp-history-summary">
                <p className="mrp-info">
                  <strong>MRP Changes:</strong> {mrpHistory.length} revision(s) | 
                  Last changed by: {mrpHistory[0]?.changed_by || 'N/A'}
                </p>
              </div>
            )}

            {currentBOM && (
              <div className="bom-info">
                <p><strong>Current BOM Version:</strong> {currentBOM.version || 1}</p>
                <p><strong>Effective Date:</strong> {currentBOM.effective_date || 'N/A'}</p>
                <p><strong>Last Updated:</strong> {currentBOM.updated_at ? new Date(currentBOM.updated_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            )}
            
            <div className="materials-section">
              <h3>Materials Configuration</h3>
              <button className="btn-primary" onClick={handleAddMaterial}>
                Add Material
              </button>
              
              <table className="materials-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Category</th>
                    <th>Quantity/Unit</th>
                    <th>Unit Cost (₹)</th>
                    <th>Total Cost (₹)</th>
                    <th>Shared</th>
                    <th>Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bomDetails.map((item, index) => {
                    const material = materials.find(m => m.material_id === parseInt(item.material_id));
                    const unitCost = material ? (material.rate || material.cost_per_unit || material.current_cost || 0) : 0;
                    const totalCost = unitCost * parseFloat(item.quantity_per_unit || 0);
                    
                    return (
                      <tr key={index}>
                        <td>
                          <select 
                            value={item.material_id}
                            onChange={(e) => handleMaterialChange(index, 'material_id', e.target.value)}
                          >
                            <option value="">-- Select Material --</option>
                            {materials.map(mat => (
                              <option key={mat.material_id} value={mat.material_id}>
                                {mat.material_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select 
                            value={item.material_category}
                            onChange={(e) => handleMaterialChange(index, 'material_category', e.target.value)}
                            disabled={loadingCategories}
                          >
                            <option value="">-- Select --</option>
                            {bomCategories.map(cat => (
                              <option key={cat.value} value={cat.value}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input 
                            type="number"
                            value={item.quantity_per_unit}
                            onChange={(e) => handleMaterialChange(index, 'quantity_per_unit', e.target.value)}
                            min="0"
                            step="0.001"
                            style={{ width: '100px' }}
                          />
                        </td>
                        <td>{unitCost.toFixed(2)}</td>
                        <td><strong>{totalCost.toFixed(2)}</strong></td>
                        <td>
                          <input 
                            type="checkbox"
                            checked={item.is_shared}
                            onChange={(e) => handleMaterialChange(index, 'is_shared', e.target.checked)}
                            title="Check if this material is shared between multiple SKU sizes"
                          />
                        </td>
                        <td>
                          <input 
                            type="text"
                            value={item.notes}
                            onChange={(e) => handleMaterialChange(index, 'notes', e.target.value)}
                            placeholder="Notes"
                            style={{ width: '150px' }}
                          />
                        </td>
                        <td>
                          <button 
                            className="btn-danger"
                            onClick={() => handleRemoveMaterial(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {bomDetails.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'right' }}>
                        <strong>Total Material Cost per Unit:</strong>
                      </td>
                      <td><strong>₹{calculateTotalCost().toFixed(2)}</strong></td>
                      <td colSpan="3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            
            {bomDetails.length > 0 && (
              <>
                <div className="cost-breakdown">
                  <h4>Cost Breakdown</h4>
                  {(() => {
                    const breakdown = calculateCostBreakdown();
                    return (
                      <table className="breakdown-table">
                        <tbody>
                          {Object.entries(breakdown).filter(([key]) => key !== 'total' && breakdown[key] > 0).map(([category, cost]) => (
                            <tr key={category}>
                              <td>{category} Cost:</td>
                              <td>₹{cost.toFixed(2)}</td>
                              <td>{breakdown.total > 0 ? `(${((cost/breakdown.total)*100).toFixed(1)}%)` : ''}</td>
                            </tr>
                          ))}
                          <tr className="total-row">
                            <td><strong>Total BOM Cost:</strong></td>
                            <td><strong>₹{breakdown.total.toFixed(2)}</strong></td>
                            <td><strong>(100%)</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    );
                  })()}
                </div>

                <div className="action-buttons">
                  <button 
                    className="btn-success"
                    onClick={handleSaveBOM}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : (currentBOM ? 'Update BOM' : 'Create BOM')}
                  </button>
                  
                  {bomHistory.length > 0 && (
                    <button 
                      className="btn-secondary"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      {showHistory ? 'Hide History' : 'Show History'}
                    </button>
                  )}
                </div>
              </>
            )}
            
            {showHistory && bomHistory.length > 0 && (
              <div className="bom-history">
                <h4>BOM Version History</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Effective Date</th>
                      <th>Total Cost</th>
                      <th>Created By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomHistory.map((version, index) => (
                      <tr key={index}>
                        <td>{version.version}</td>
                        <td>{version.effective_date}</td>
                        <td>₹{version.total_cost}</td>
                        <td>{version.created_by || 'System'}</td>
                        <td>
                          <button 
                            className="btn-link"
                            onClick={() => console.log('View version', version)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .highlight-mrp {
          color: #4CAF50;
          font-size: 1.2em;
          font-weight: bold;
        }

        .mrp-history-summary {
          background: #f0f8ff;
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
        }

        .mrp-info {
          margin: 0;
          color: #2196F3;
        }
      `}</style>
    </div>
  );
};

export default BOMConfig;
