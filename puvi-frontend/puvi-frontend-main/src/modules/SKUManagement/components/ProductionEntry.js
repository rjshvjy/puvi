// Production Entry Component for SKU Management with Enhanced Oil Allocation
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
  const [oilType, setOilType] = useState('');
  const [oilSubcategoryName, setOilSubcategoryName] = useState(''); // Store the subcategory name for API calls
  const [selectedSKU, setSelectedSKU] = useState(null);
  
  // MRP and Expiry related state
  const [currentMRP, setCurrentMRP] = useState(null);
  const [shelfLife, setShelfLife] = useState(null);
  const [expiryDate, setExpiryDate] = useState(null);
  const [daysToExpiry, setDaysToExpiry] = useState(null);
  const [expiryStatus, setExpiryStatus] = useState('normal');
  
  // Enhanced allocation state
  const [allocationStrategy, setAllocationStrategy] = useState('fifo');
  const [selectedBatches, setSelectedBatches] = useState(new Set());
  const [manualAllocations, setManualAllocations] = useState({});
  const [showAllocationAnalysis, setShowAllocationAnalysis] = useState(false);
  
  const [productionData, setProductionData] = useState({
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
    // Cost fields
    oil_cost_total: 0,
    material_cost_total: 0,
    labor_cost_total: 0,
    total_production_cost: 0,
    packing_rate_per_unit: 0, // Per-unit packing cost
    packing_element_name: '', // Name of the cost element
    // MRP and Expiry fields
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
  }, []);

  // Update oil type and fetch MRP/shelf life when SKU is selected
  useEffect(() => {
    if (productionData.sku_id && skuList.length > 0) {
      const selected = skuList.find(s => s.sku_id === parseInt(productionData.sku_id));
      if (selected) {
        setSelectedSKU(selected);
        setOilType(selected.oil_type);
        setOilSubcategoryName(selected.oil_subcategory_name || selected.oil_type);
        fetchBOMDetails(selected.sku_id);
        fetchSKUDetailsWithMRP(selected.sku_id);
        fetchPackingCostElement(selected.package_size); // Fetch packing cost for package size
      }
    }
  }, [productionData.sku_id, skuList]);

  // Fetch oil sources when oil subcategory name is set
  useEffect(() => {
    if (oilSubcategoryName) {
      fetchOilSources();
    }
  }, [oilSubcategoryName]);

  // Calculate expiry date when production date or shelf life changes
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

  // Fetch SKU details including MRP and shelf life
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
        // Fetch all subcategories to map oil_type to subcategory_name
        let subcategoriesMap = {};
        
        try {
          // Use the correct API endpoint to get all subcategories
          const subcategoriesResponse = await api.masters.getSubcategories();
          
          if (subcategoriesResponse.success && subcategoriesResponse.subcategories) {
            // Create a map of oil_type to subcategory_name for Oil category
            subcategoriesResponse.subcategories.forEach(sub => {
              if (sub.oil_type && sub.category_name === 'Oil') {
                subcategoriesMap[sub.oil_type] = sub.subcategory_name;
              }
            });
            console.log('Subcategory mapping:', subcategoriesMap);
          }
        } catch (error) {
          console.warn('Could not fetch subcategories, trying direct endpoint:', error);
          
          // If getSubcategories fails, try direct API call
          try {
            const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://puvi-backend.onrender.com'}/api/subcategories`);
            const data = await response.json();
            
            if (data.success && data.subcategories) {
              data.subcategories.forEach(sub => {
                if (sub.oil_type && sub.category_name === 'Oil') {
                  subcategoriesMap[sub.oil_type] = sub.subcategory_name;
                }
              });
              console.log('Subcategory mapping (direct):', subcategoriesMap);
            }
          } catch (directError) {
            console.error('Failed to fetch subcategories via direct call:', directError);
          }
        }
        
        // Enhance SKUs with subcategory_name
        const enhancedSKUs = response.skus.map(sku => {
          // Use the mapping if available, otherwise construct a default
          const mappedSubcategory = subcategoriesMap[sku.oil_type];
          return {
            ...sku,
            oil_subcategory_name: mappedSubcategory || `${sku.oil_type} Oil`
          };
        });
        
        setSKUList(enhancedSKUs);
        
        if (enhancedSKUs.length === 0) {
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
    if (!oilSubcategoryName) return;
    
    setLoadingOilSources(true);
    try {
      console.log('Fetching oil sources for subcategory:', oilSubcategoryName);
      
      // Use oil_subcategory_name for the API call
      const response = await api.blending.getBatchesForOilType(oilSubcategoryName);
      
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
          traceable_code: source.traceable_code || '',
          production_date: source.production_date || source.blend_date || null,
          age_days: source.age_days || 0
        }));

        setOilSources(mappedSources);
        
        if (mappedSources.length === 0) {
          setMessage({ 
            type: 'warning', 
            text: `No ${oilSubcategoryName} available. Please check batch production or blending modules.` 
          });
        }
      } else {
        setOilSources([]);
      }
    } catch (error) {
      console.error('Error fetching oil sources:', error);
      setOilSources([]);
      
      // Provide specific error message
      if (error.message && error.message.includes('not found')) {
        setMessage({ 
          type: 'error', 
          text: `Configuration issue: "${oilSubcategoryName}" not found in subcategories. Please check oil type configuration in Masters module.` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Failed to load oil sources. Some features may be limited.' 
        });
      }
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

  // Fetch packing cost element based on package size
  const fetchPackingCostElement = async (packageSize) => {
    if (!packageSize) return;
    
    try {
      const response = await api.costManagement.getCostElementsMaster();
      
      if (response.success && response.cost_elements) {
        // Find the packing labor cost element for this package size
        const packingElement = response.cost_elements.find(element => 
          element.element_name?.includes(`Packing Labour ${packageSize}`) &&
          element.calculation_method === 'per_unit' &&
          element.is_active
        );
        
        if (packingElement) {
          setProductionData(prev => ({
            ...prev,
            packing_rate_per_unit: packingElement.default_rate || 0,
            packing_element_name: packingElement.element_name
          }));
          console.log(`Found packing cost element: ${packingElement.element_name} @ ₹${packingElement.default_rate}/unit`);
        } else {
          // Try to find a general packing labor element
          const generalPacking = response.cost_elements.find(element => 
            element.element_name?.includes('Packing Labour') &&
            element.calculation_method === 'per_unit' &&
            element.is_active
          );
          
          if (generalPacking) {
            setProductionData(prev => ({
              ...prev,
              packing_rate_per_unit: generalPacking.default_rate || 0,
              packing_element_name: generalPacking.element_name
            }));
            console.log(`Using general packing element: ${generalPacking.element_name}`);
          } else {
            console.warn(`No packing cost element found for ${packageSize}`);
            setProductionData(prev => ({
              ...prev,
              packing_rate_per_unit: 0,
              packing_element_name: 'Not configured'
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching packing cost element:', error);
      setProductionData(prev => ({
        ...prev,
        packing_rate_per_unit: 0,
        packing_element_name: 'Error loading'
      }));
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
    // Packing cost is now per-unit based on package size
    // This will be fetched from cost elements master
    const bottlesProduced = productionData.bottles_produced || productionData.bottles_planned || 0;
    const packingRate = productionData.packing_rate_per_unit || 0;
    return bottlesProduced * packingRate;
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

  // Calculate age of batch in days
  const calculateBatchAge = (productionDate) => {
    if (!productionDate) return 0;
    const prodDate = new Date(productionDate);
    const today = new Date();
    const diffTime = Math.abs(today - prodDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Strategy-based allocation function
  const allocateOilByStrategy = (strategy, oilRequired, sources) => {
    let sortedSources = [...sources];
    
    switch(strategy) {
      case 'fifo':
        // Sort by production date (oldest first)
        sortedSources.sort((a, b) => {
          const dateA = new Date(a.production_date || '9999-12-31');
          const dateB = new Date(b.production_date || '9999-12-31');
          return dateA - dateB;
        });
        break;
      case 'fefo':
        // For FEFO, we'd need expiry dates - for now using age
        sortedSources.sort((a, b) => b.age_days - a.age_days);
        break;
      case 'lowest_cost':
        sortedSources.sort((a, b) => a.cost_per_kg - b.cost_per_kg);
        break;
      case 'highest_cost':
        sortedSources.sort((a, b) => b.cost_per_kg - a.cost_per_kg);
        break;
      case 'manual':
        // Return empty for manual selection
        return [];
      default:
        break;
    }
    
    // Auto-allocate based on sorted order
    const allocations = [];
    let remaining = oilRequired;
    
    for (const source of sortedSources) {
      if (remaining <= 0) break;
      const qty = Math.min(source.available, remaining);
      if (qty > 0) {
        allocations.push({
          source_id: source.id,
          source_type: source.type,
          source_code: source.code,
          quantity: qty,
          traceable_code: source.traceable_code
        });
        remaining -= qty;
      }
    }
    
    return allocations;
  };

  // Toggle batch selection
  const toggleBatchSelection = (sourceId) => {
    const newSelected = new Set(selectedBatches);
    if (newSelected.has(sourceId)) {
      newSelected.delete(sourceId);
      // Remove from manual allocations
      const newAllocations = { ...manualAllocations };
      delete newAllocations[sourceId];
      setManualAllocations(newAllocations);
    } else {
      newSelected.add(sourceId);
      // Add to manual allocations with 0 initial value
      setManualAllocations(prev => ({
        ...prev,
        [sourceId]: 0
      }));
    }
    setSelectedBatches(newSelected);
  };

  // Update manual allocation for a batch
  const updateManualAllocation = (sourceId, value) => {
    const source = oilSources.find(s => s.id === sourceId);
    const maxValue = source ? source.available : 0;
    const actualValue = Math.min(Math.max(0, parseFloat(value) || 0), maxValue);
    
    setManualAllocations(prev => ({
      ...prev,
      [sourceId]: actualValue
    }));
  };

  // Calculate weighted average cost
  const calculateWeightedCost = () => {
    let totalCost = 0;
    let totalQuantity = 0;
    
    productionData.oil_allocations.forEach(allocation => {
      const source = oilSources.find(s => s.id === allocation.source_id);
      if (source) {
        totalCost += allocation.quantity * source.cost_per_kg;
        totalQuantity += allocation.quantity;
      }
    });
    
    return totalQuantity > 0 ? (totalCost / totalQuantity) : 0;
  };

  // Get oldest batch used
  const getOldestBatch = () => {
    let oldestDate = null;
    let oldestCode = '';
    
    productionData.oil_allocations.forEach(allocation => {
      const source = oilSources.find(s => s.id === allocation.source_id);
      if (source && source.production_date) {
        const date = new Date(source.production_date);
        if (!oldestDate || date < oldestDate) {
          oldestDate = date;
          oldestCode = source.code;
        }
      }
    });
    
    return oldestCode ? `${oldestCode} (${calculateBatchAge(oldestDate)} days old)` : 'N/A';
  };

  // Compare to optimal cost allocation
  const calculateOptimalCost = () => {
    const optimalAllocations = allocateOilByStrategy('lowest_cost', productionData.oil_required, oilSources);
    let optimalCost = 0;
    
    optimalAllocations.forEach(allocation => {
      const source = oilSources.find(s => s.id === allocation.source_id);
      if (source) {
        optimalCost += allocation.quantity * source.cost_per_kg;
      }
    });
    
    const currentCost = calculateOilCost();
    const difference = currentCost - optimalCost;
    
    if (difference === 0) return 'Using optimal cost allocation';
    if (difference > 0) return `₹${difference.toFixed(2)} above optimal`;
    return `₹${Math.abs(difference).toFixed(2)} below optimal`;
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
    
    // Initialize allocations based on selected strategy
    const allocations = allocateOilByStrategy(allocationStrategy, oilRequired, oilSources);
    
    setProductionData(prev => ({ 
      ...prev, 
      oil_allocations: allocations 
    }));
    
    // For manual strategy, preselect batches that would be used in FIFO
    if (allocationStrategy === 'manual') {
      const fifoAllocations = allocateOilByStrategy('fifo', oilRequired, oilSources);
      const preselected = new Set(fifoAllocations.map(a => a.source_id));
      setSelectedBatches(preselected);
      
      const initialManual = {};
      fifoAllocations.forEach(alloc => {
        initialManual[alloc.source_id] = alloc.quantity;
      });
      setManualAllocations(initialManual);
    }
    
    updateTotalCosts();
    
    setMessage({ type: 'success', text: 'Oil availability checked. Please review allocation.' });
    setStep(2);
  };

  const handleStrategyChange = (e) => {
    const newStrategy = e.target.value;
    setAllocationStrategy(newStrategy);
    
    // Recalculate allocations based on new strategy
    if (newStrategy !== 'manual') {
      const allocations = allocateOilByStrategy(newStrategy, productionData.oil_required, oilSources);
      setProductionData(prev => ({ 
        ...prev, 
        oil_allocations: allocations 
      }));
      updateTotalCosts();
    }
  };

  const handleApplyManualAllocations = () => {
    const allocations = [];
    
    selectedBatches.forEach(sourceId => {
      const quantity = manualAllocations[sourceId] || 0;
      if (quantity > 0) {
        const source = oilSources.find(s => s.id === sourceId);
        if (source) {
          allocations.push({
            source_id: source.id,
            source_type: source.type,
            source_code: source.code,
            quantity: quantity,
            traceable_code: source.traceable_code
          });
        }
      }
    });
    
    setProductionData(prev => ({ 
      ...prev, 
      oil_allocations: allocations 
    }));
    updateTotalCosts();
    setShowAllocationAnalysis(true);
  };

  const handleAllocateOil = () => {
    if (productionData.oil_allocations.length === 0) {
      setMessage({ type: 'error', text: 'No oil allocations made' });
      return;
    }
    
    const totalAllocated = productionData.oil_allocations.reduce((sum, a) => sum + a.quantity, 0);
    if (totalAllocated < productionData.oil_required * 0.99) { // Allow 1% tolerance
      setMessage({ 
        type: 'error', 
        text: `Insufficient allocation. Required: ${productionData.oil_required.toFixed(2)} kg, Allocated: ${totalAllocated.toFixed(2)} kg` 
      });
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
    setAllocationStrategy('fifo');
    setSelectedBatches(new Set());
    setManualAllocations({});
    setShowAllocationAnalysis(false);
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
      packing_rate_per_unit: 0,
      packing_element_name: '',
      mrp_at_production: 0,
      expiry_date: null,
      shelf_life_months: null
    });
    setOilSources([]);
    setOilSubcategoryName('');
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
          
          {/* MRP and Shelf Life Display */}
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
          
          {/* Expiry Date Display */}
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
          
          {/* Allocation Strategy Selection */}
          <div className="allocation-strategy">
            <label>Allocation Strategy:</label>
            <select value={allocationStrategy} onChange={handleStrategyChange}>
              <option value="manual">Manual Selection</option>
              <option value="fifo">FIFO (First In First Out)</option>
              <option value="fefo">FEFO (First Expiry First Out)</option>
              <option value="lowest_cost">Lowest Cost First</option>
              <option value="highest_cost">Highest Cost First</option>
            </select>
          </div>
          
          {/* Manual Selection Table (shown only for manual strategy) */}
          {allocationStrategy === 'manual' && (
            <div className="available-sources">
              <h4>Available Oil Sources - Select and Allocate</h4>
              <table className="batch-selection-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Batch Code</th>
                    <th>Production Date</th>
                    <th>Available (kg)</th>
                    <th>Cost/kg</th>
                    <th>Age (days)</th>
                    <th>Allocate (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {oilSources.map(source => (
                    <tr key={source.id} className={selectedBatches.has(source.id) ? 'selected' : ''}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedBatches.has(source.id)}
                          onChange={() => toggleBatchSelection(source.id)}
                        />
                      </td>
                      <td>{source.code}</td>
                      <td>{source.production_date ? formatDateForDisplay(source.production_date) : 'N/A'}</td>
                      <td>{source.available.toFixed(2)}</td>
                      <td>₹{source.cost_per_kg.toFixed(2)}</td>
                      <td>{calculateBatchAge(source.production_date)}</td>
                      <td>
                        <input 
                          type="number"
                          disabled={!selectedBatches.has(source.id)}
                          value={manualAllocations[source.id] || ''}
                          onChange={(e) => updateManualAllocation(source.id, e.target.value)}
                          min="0"
                          max={source.available}
                          step="0.01"
                          style={{ width: '100px' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="6"><strong>Total Allocated</strong></td>
                    <td>
                      <strong>
                        {Object.values(manualAllocations).reduce((sum, val) => sum + (val || 0), 0).toFixed(2)} kg
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
              <button 
                className="btn-secondary" 
                onClick={handleApplyManualAllocations}
                style={{ marginTop: '10px' }}
              >
                Apply Manual Allocations
              </button>
            </div>
          )}
          
          {/* Current Allocation Table */}
          <h4>Current Oil Allocation</h4>
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
                          updateTotalCosts();
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
          
          {/* Allocation Impact Analysis */}
          {(showAllocationAnalysis || allocationStrategy !== 'manual') && productionData.oil_allocations.length > 0 && (
            <div className="allocation-summary" style={{ marginTop: '20px', backgroundColor: '#f0f8ff' }}>
              <h4>Allocation Impact Analysis</h4>
              <table>
                <tbody>
                  <tr>
                    <td>Weighted Average Cost:</td>
                    <td>₹{calculateWeightedCost().toFixed(2)}/kg</td>
                  </tr>
                  <tr>
                    <td>Oldest Batch Used:</td>
                    <td>{getOldestBatch()}</td>
                  </tr>
                  <tr>
                    <td>Cost Optimization:</td>
                    <td>{calculateOptimalCost()}</td>
                  </tr>
                  <tr>
                    <td>Total Oil Cost:</td>
                    <td>{formatUtils.currency(calculateOilCost())}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          
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
                  <td>Packing Cost (Est.):</td>
                  <td>{formatUtils.currency(productionData.bottles_planned * productionData.packing_rate_per_unit)}</td>
                </tr>
                <tr className="total-row">
                  <td><strong>Total Estimated Cost:</strong></td>
                  <td><strong>{formatUtils.currency(calculateOilCost() + calculateMaterialCost() + (productionData.bottles_planned * productionData.packing_rate_per_unit))}</strong></td>
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
            <label>Packing Cost Element</label>
            <div className="info-display">
              <strong>{productionData.packing_element_name || 'Not configured'}</strong>
              {productionData.packing_rate_per_unit > 0 && (
                <span style={{ marginLeft: '10px', color: '#666' }}>
                  ₹{productionData.packing_rate_per_unit.toFixed(2)} per bottle
                </span>
              )}
            </div>
          </div>
          
          <div className="form-group">
            <label>Total Packing Cost</label>
            <div className="info-display">
              <strong>
                ₹{(productionData.bottles_produced * productionData.packing_rate_per_unit).toFixed(2)}
              </strong>
              <span style={{ marginLeft: '10px', color: '#666' }}>
                ({productionData.bottles_produced || 0} bottles × ₹{productionData.packing_rate_per_unit.toFixed(2)})
              </span>
            </div>
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
                  <td>Packing Cost ({productionData.bottles_produced} bottles × ₹{productionData.packing_rate_per_unit.toFixed(2)}):</td>
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
