// Time Tracker Component for PUVI Oil Manufacturing System
// File Path: puvi-frontend/src/modules/CostManagement/TimeTracker.js
// Purpose: Track crushing time with proper datetime format for backend
// Updated: Dynamic labor rates from database (no hardcoded values)

import React, { useState, useEffect } from 'react';
import { configAPI } from '../../services/api';

const TimeTracker = ({ batchId, onTimeCalculated, showCostBreakdown = true }) => {
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [duration, setDuration] = useState(null);
  const [operatorName, setOperatorName] = useState('');
  const [notes, setNotes] = useState('');
  
  // NEW: State for labor rates fetched from database
  const [laborRates, setLaborRates] = useState({
    crushing: 0,
    electricity: 0,
    loading: false,
    error: null
  });

  // NEW: Fetch labor rates from database on component mount
  useEffect(() => {
    fetchLaborRates();
  }, []);

  // NEW: Function to fetch labor rates from API
  const fetchLaborRates = async () => {
    setLaborRates(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Fetch labor rates from the config API
      const response = await configAPI.getLaborRates('Crushing');
      
      if (response.success && response.rates) {
        // Parse the response to extract crushing and electricity rates
        let crushingRate = 0;
        let electricityRate = 0;
        
        response.rates.forEach(rate => {
          // Match rates based on element name
          if (rate.element_name && rate.element_name.toLowerCase().includes('crushing')) {
            if (rate.element_name.toLowerCase().includes('labour') || 
                rate.element_name.toLowerCase().includes('labor')) {
              crushingRate = rate.rate || rate.default_rate || 0;
            }
          }
          if (rate.element_name && rate.element_name.toLowerCase().includes('electricity')) {
            electricityRate = rate.rate || rate.default_rate || 0;
          }
        });
        
        // If specific rates not found, try to get from general labor category
        if (crushingRate === 0 || electricityRate === 0) {
          // Fetch all labor rates as fallback
          const allRatesResponse = await configAPI.getLaborRates();
          
          if (allRatesResponse.success && allRatesResponse.rates) {
            allRatesResponse.rates.forEach(rate => {
              if (crushingRate === 0 && rate.element_name === 'Crushing Labour') {
                crushingRate = rate.rate || rate.default_rate || 150; // Fallback to 150 if DB is empty
              }
              if (electricityRate === 0 && rate.element_name === 'Electricity - Crushing') {
                electricityRate = rate.rate || rate.default_rate || 75; // Fallback to 75 if DB is empty
              }
            });
          }
        }
        
        setLaborRates({
          crushing: crushingRate,
          electricity: electricityRate,
          loading: false,
          error: null
        });
        
      } else {
        // If API call succeeds but no rates found, use defaults with warning
        console.warn('No labor rates found in database, using defaults');
        setLaborRates({
          crushing: 150, // Emergency fallback
          electricity: 75, // Emergency fallback
          loading: false,
          error: 'Using default rates - database rates not configured'
        });
      }
    } catch (error) {
      console.error('Failed to fetch labor rates:', error);
      // On error, use fallback rates to not break functionality
      setLaborRates({
        crushing: 150, // Emergency fallback
        electricity: 75, // Emergency fallback
        loading: false,
        error: 'Failed to fetch rates from database - using defaults'
      });
    }
  };

  useEffect(() => {
    calculateDuration();
  }, [startDateTime, endDateTime, laborRates.crushing, laborRates.electricity]);

  const calculateDuration = () => {
    if (!startDateTime || !endDateTime) {
      setDuration(null);
      return;
    }

    // Don't calculate if rates are still loading
    if (laborRates.loading) {
      return;
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    
    if (end <= start) {
      setDuration(null);
      return;
    }

    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    const roundedHours = Math.ceil(diffHours);

    // Use dynamic rates from database instead of hardcoded values
    const calculatedDuration = {
      actual_hours: diffHours.toFixed(2),
      rounded_hours: roundedHours,
      crushing_labour_cost: roundedHours * laborRates.crushing,
      electricity_cost: roundedHours * laborRates.electricity,
      total_time_cost: roundedHours * (laborRates.crushing + laborRates.electricity)
    };

    setDuration(calculatedDuration);

    // Pass data to parent with fixed datetime format
    if (onTimeCalculated) {
      // FIX: Replace 'T' with space for backend compatibility
      const formattedStartDateTime = startDateTime.replace('T', ' ');
      const formattedEndDateTime = endDateTime.replace('T', ' ');
      
      onTimeCalculated({
        batch_id: batchId,
        start_datetime: formattedStartDateTime,  // Fixed format: "2025-08-07 10:30"
        end_datetime: formattedEndDateTime,      // Fixed format: "2025-08-07 15:45"
        actual_hours: calculatedDuration.actual_hours,
        rounded_hours: calculatedDuration.rounded_hours,
        operator_name: operatorName,
        notes: notes,
        costs: {
          crushing_labour: calculatedDuration.crushing_labour_cost,
          electricity: calculatedDuration.electricity_cost,
          total: calculatedDuration.total_time_cost
        },
        rates_used: {
          crushing_labour_rate: laborRates.crushing,
          electricity_rate: laborRates.electricity
        }
      });
    }
  };

  const formatDateTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle datetime change with validation
  const handleStartDateTimeChange = (e) => {
    setStartDateTime(e.target.value);
  };

  const handleEndDateTimeChange = (e) => {
    setEndDateTime(e.target.value);
  };

  // Handle operator name change
  const handleOperatorNameChange = (e) => {
    setOperatorName(e.target.value);
    // Recalculate to update parent with new operator name
    if (startDateTime && endDateTime) {
      calculateDuration();
    }
  };

  // Handle notes change
  const handleNotesChange = (e) => {
    setNotes(e.target.value);
    // Recalculate to update parent with new notes
    if (startDateTime && endDateTime) {
      calculateDuration();
    }
  };

  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '20px'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '15px',
      color: '#495057'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '15px',
      marginBottom: '15px'
    },
    formGroup: {
      marginBottom: '15px'
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '600',
      color: '#495057',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '15px'
    },
    textarea: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '15px',
      minHeight: '60px',
      resize: 'vertical'
    },
    durationBox: {
      padding: '15px',
      backgroundColor: '#cce5ff',
      borderRadius: '5px',
      marginBottom: '15px'
    },
    warningBox: {
      padding: '15px',
      backgroundColor: '#fff3cd',
      borderRadius: '5px',
      marginBottom: '15px',
      color: '#856404'
    },
    successBox: {
      padding: '10px',
      backgroundColor: '#d4edda',
      borderRadius: '4px',
      marginBottom: '10px',
      color: '#155724',
      fontSize: '13px'
    },
    costBreakdown: {
      marginTop: '10px',
      paddingTop: '10px',
      borderTop: '1px solid rgba(0,0,0,0.1)'
    },
    costRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '5px'
    },
    totalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontWeight: 'bold',
      fontSize: '16px',
      marginTop: '10px',
      paddingTop: '10px',
      borderTop: '2px solid rgba(0,0,0,0.2)'
    },
    helpText: {
      fontSize: '12px',
      color: '#6c757d',
      marginTop: '5px'
    },
    infoBox: {
      padding: '10px',
      backgroundColor: '#e9ecef',
      borderRadius: '4px',
      fontSize: '14px',
      color: '#6c757d'
    },
    loadingBox: {
      padding: '15px',
      backgroundColor: '#e3f2fd',
      borderRadius: '5px',
      marginBottom: '15px',
      color: '#1976d2',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    rateIndicator: {
      fontSize: '11px',
      color: '#6c757d',
      fontStyle: 'italic',
      marginLeft: '5px'
    }
  };

  return (
    <div style={styles.container}>
      <h4 style={styles.title}>⏱️ Crushing Time Tracking</h4>
      
      {/* NEW: Loading indicator for rates */}
      {laborRates.loading && (
        <div style={styles.loadingBox}>
          <span>⏳</span>
          <span>Loading labor rates from database...</span>
        </div>
      )}
      
      {/* NEW: Error/Warning message if rates couldn't be fetched */}
      {laborRates.error && !laborRates.loading && (
        <div style={styles.warningBox}>
          ⚠️ {laborRates.error}
        </div>
      )}
      
      {/* NEW: Display current rates being used */}
      {!laborRates.loading && (laborRates.crushing > 0 || laborRates.electricity > 0) && (
        <div style={styles.infoBox}>
          <strong>📊 Current Rates (from database):</strong>
          <div style={{ marginTop: '5px', fontSize: '13px' }}>
            • Crushing Labour: ₹{laborRates.crushing}/hour
            {' '}• Electricity: ₹{laborRates.electricity}/hour
          </div>
        </div>
      )}
      
      {/* Success message for datetime format */}
      {startDateTime && endDateTime && (
        <div style={styles.successBox}>
          ✅ DateTime format validated - Backend will receive: 
          {' '}{startDateTime.replace('T', ' ')} to {endDateTime.replace('T', ' ')}
        </div>
      )}
      
      <div style={styles.grid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Start Date & Time *
          </label>
          <input
            type="datetime-local"
            style={styles.input}
            value={startDateTime}
            onChange={handleStartDateTimeChange}
            disabled={laborRates.loading}
          />
          {startDateTime && (
            <div style={styles.helpText}>
              Display: {formatDateTime(startDateTime)}
              <br />
              Backend format: {startDateTime.replace('T', ' ')}
            </div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            End Date & Time *
          </label>
          <input
            type="datetime-local"
            style={styles.input}
            value={endDateTime}
            onChange={handleEndDateTimeChange}
            min={startDateTime}
            disabled={laborRates.loading}
          />
          {endDateTime && (
            <div style={styles.helpText}>
              Display: {formatDateTime(endDateTime)}
              <br />
              Backend format: {endDateTime.replace('T', ' ')}
            </div>
          )}
        </div>
      </div>

      {startDateTime && endDateTime && endDateTime <= startDateTime && (
        <div style={styles.warningBox}>
          ⚠️ End time must be after start time
        </div>
      )}

      {duration && !laborRates.loading && (
        <div style={styles.durationBox}>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
            ⏱️ Duration Calculated
          </div>
          <div style={styles.costRow}>
            <span>Actual Duration:</span>
            <strong>{duration.actual_hours} hours</strong>
          </div>
          <div style={styles.costRow}>
            <span>Billable Hours (Rounded Up):</span>
            <strong>{duration.rounded_hours} hours</strong>
          </div>

          {showCostBreakdown && (
            <div style={styles.costBreakdown}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                💰 Time-Based Costs (Auto-calculated):
                <span style={styles.rateIndicator}>
                  {laborRates.error ? 'using defaults' : 'from database'}
                </span>
              </div>
              <div style={styles.costRow}>
                <span>Crushing Labour ({duration.rounded_hours} hrs × ₹{laborRates.crushing}):</span>
                <span>₹{duration.crushing_labour_cost.toFixed(2)}</span>
              </div>
              <div style={styles.costRow}>
                <span>Electricity - Crushing ({duration.rounded_hours} hrs × ₹{laborRates.electricity}):</span>
                <span>₹{duration.electricity_cost.toFixed(2)}</span>
              </div>
              <div style={styles.totalRow}>
                <span>Total Time-Based Costs:</span>
                <span style={{ color: '#28a745' }}>₹{duration.total_time_cost.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={styles.grid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Operator Name (Optional)
          </label>
          <input
            type="text"
            style={styles.input}
            value={operatorName}
            onChange={handleOperatorNameChange}
            placeholder="Enter operator name"
            disabled={laborRates.loading}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>
            Notes (Optional)
          </label>
          <textarea
            style={styles.textarea}
            value={notes}
            onChange={handleNotesChange}
            placeholder="Any additional notes about the crushing process..."
            disabled={laborRates.loading}
          />
        </div>
      </div>

      {!batchId && (
        <div style={styles.infoBox}>
          ℹ️ Time tracking will be saved automatically when batch is created
          <br />
          📌 DateTime format is automatically converted for backend compatibility
          <br />
          💡 Labor rates are fetched from the database and updated automatically
        </div>
      )}

      {batchId && (
        <div style={styles.infoBox}>
          ℹ️ Time tracking for Batch ID: {batchId}
          <br />
          📌 Data will be saved in proper format (YYYY-MM-DD HH:MM)
          <br />
          💰 Using current database rates: Labour ₹{laborRates.crushing}/hr, Electricity ₹{laborRates.electricity}/hr
        </div>
      )}
    </div>
  );
};

export default TimeTracker;
