#!/usr/bin/env node
// Dependency Matrix Generator for PUVI
// Analyzes cross-module dependencies and identifies migration opportunities

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.resolve(__dirname, 'project_index.json');

// Load project index
if (!fs.existsSync(INDEX_PATH)) {
  console.error('❌ project_index.json not found. Run gen-index-ast.mjs first.');
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));

// Extract module name from file path
function extractModuleName(filePath) {
  const patterns = [
    /modules\/([^\/]+)\.py/,
    /modules\/([^\/]+)\//,
    /src\/modules\/([^\/]+)\//
  ];
  
  for (const pattern of patterns) {
    const match = filePath.match(pattern);
    if (match) return match[1].replace(/_/g, '-');
  }
  return 'unknown';
}

// Analyze hardcoded patterns
function categorizeHardcodedValue(value, file, line) {
  const categories = {
    'oil_types': {
      pattern: /(?:Groundnut|Coconut|Sesame|Sunflower|Palm)/i,
      suggestedTable: 'oil_types table or materials.oil_type',
      priority: 'HIGH'
    },
    'gst_rates': {
      pattern: /(?:gst|GST).*?[=:]\s*(?:5|12|18)|(?:5|12|18).*?(?:gst|GST)/i,
      suggestedTable: 'materials.gst_rate or cost_elements_master',
      priority: 'HIGH'
    },
    'density_values': {
      pattern: /density.*?[=:]\s*0\.9[0-9]|0\.9[0-9].*?density/i,
      suggestedTable: 'materials.density or sku_master.density',
      priority: 'MEDIUM'
    },
    'package_sizes': {
      pattern: /(?:500ml|1L|5L|15L|15KG)/,
      suggestedTable: 'sku_master.package_size',
      priority: 'MEDIUM'
    },
    'cost_rates': {
      pattern: /(?:rate|cost|charge).*?[=:]\s*\d+(?:\.\d+)?/i,
      suggestedTable: 'cost_elements_master',
      priority: 'HIGH'
    },
    'writeoff_reasons': {
      pattern: /(?:Expired|Damaged|Contaminated|Quality)/i,
      suggestedTable: 'writeoff_reasons',
      priority: 'LOW'
    }
  };
  
  for (const [category, config] of Object.entries(categories)) {
    if (config.pattern.test(value)) {
      return {
        category,
        suggestedTable: config.suggestedTable,
        priority: config.priority,
        value: value.substring(0, 100)
      };
    }
  }
  
  return null;
}

// Generate migration steps
function generateMigrationSteps(category, occurrences) {
  const steps = [];
  const modules = [...new Set(occurrences.map(o => o.module))];
  
  switch(category) {
    case 'oil_types':
      steps.push('1. Check if oil_types table exists, else use materials.oil_type column');
      steps.push('2. Create /api/config/oil_types endpoint in masters_crud.py');
      steps.push('3. Update frontend services/configService.js to fetch oil types');
      steps.push(`4. Replace hardcoded arrays in: ${modules.join(', ')}`);
      steps.push('5. Test oil type dropdown in all affected modules');
      break;
      
    case 'gst_rates':
      steps.push('1. Verify materials.gst_rate column exists and is populated');
      steps.push('2. Add GST_RATE entries to cost_elements_master if needed');
      steps.push('3. Create /api/config/gst_rates endpoint');
      steps.push(`4. Update calculations in: ${modules.join(', ')}`);
      steps.push('5. Verify GST calculations in purchase and sales modules');
      break;
      
    case 'density_values':
      steps.push('1. Check materials.density and sku_master.density columns');
      steps.push('2. Set default density in materials table');
      steps.push('3. Create getDensity(material_id) utility function');
      steps.push(`4. Replace hardcoded 0.91 in: ${modules.join(', ')}`);
      break;
      
    case 'package_sizes':
      steps.push('1. Extract unique values from sku_master.package_size');
      steps.push('2. Create /api/config/package_sizes endpoint');
      steps.push('3. Update SKU creation forms to use dynamic list');
      steps.push(`4. Update dropdowns in: ${modules.join(', ')}`);
      break;
      
    case 'cost_rates':
      steps.push('1. Audit all rates and add to cost_elements_master');
      steps.push('2. Use activity and module_specific columns for context');
      steps.push('3. Create getCostRate(element, activity) helper');
      steps.push(`4. Replace hardcoded rates in: ${modules.join(', ')}`);
      steps.push('5. Add cost override capability for exceptions');
      break;
  }
  
  return steps;
}

// Generate dependency matrix
function generateDependencyMatrix() {
  const matrix = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    summary: {
      totalTables: 0,
      sharedTables: 0,
      hardcodedCategories: 0,
      migrationOpportunities: 0
    },
    sharedTables: {},
    hardcodedValues: {},
    crossModuleDependencies: [],
    migrationOpportunities: [],
    riskAssessment: {
      high: [],
      medium: [],
      low: []
    }
  };
  
  // 1. Analyze table usage across modules
  index.tableReferences?.forEach(tableRef => {
    const table = tableRef.name;
    if (!matrix.sharedTables[table]) {
      matrix.sharedTables[table] = {
        usedBy: [],
        fileCount: 0,
        operations: {}
      };
    }
    
    const modules = new Set();
    tableRef.files.forEach(file => {
      const module = extractModuleName(file);
      modules.add(module);
      matrix.sharedTables[table].fileCount++;
      
      if (!matrix.sharedTables[table].operations[module]) {
        matrix.sharedTables[table].operations[module] = {
          files: [],
          queryCount: 0
        };
      }
      matrix.sharedTables[table].operations[module].files.push(file);
    });
    
    matrix.sharedTables[table].usedBy = [...modules];
  });
  
  // 2. Analyze hardcoded values
  index.hardcodedValues?.forEach(item => {
    if (!item.value) return;
    
    const categorized = categorizeHardcodedValue(item.value, item.file, item.line);
    if (categorized) {
      const { category, suggestedTable, priority } = categorized;
      
      if (!matrix.hardcodedValues[category]) {
        matrix.hardcodedValues[category] = {
          occurrences: [],
          suggestedTable,
          priority,
          modules: new Set()
        };
      }
      
      const module = extractModuleName(item.file);
      matrix.hardcodedValues[category].occurrences.push({
        module,
        file: item.file,
        line: item.line,
        value: item.value.substring(0, 50)
      });
      matrix.hardcodedValues[category].modules.add(module);
    }
  });
  
  // Convert Sets to arrays
  Object.values(matrix.hardcodedValues).forEach(category => {
    category.modules = [...category.modules];
  });
  
  // 3. Generate migration opportunities
  Object.entries(matrix.hardcodedValues).forEach(([category, data]) => {
    if (data.occurrences.length > 1) {
      const opportunity = {
        category,
        priority: data.priority,
        currentState: `Hardcoded in ${data.occurrences.length} locations across ${data.modules.length} modules`,
        suggestedMigration: data.suggestedTable,
        affectedModules: data.modules,
        occurrenceCount: data.occurrences.length,
        estimatedEffort: data.occurrences.length > 10 ? 'HIGH' : 
                        data.occurrences.length > 5 ? 'MEDIUM' : 'LOW',
        migrationSteps: generateMigrationSteps(category, data.occurrences)
      };
      
      matrix.migrationOpportunities.push(opportunity);
      
      // Add to risk assessment
      if (data.priority === 'HIGH') {
        matrix.riskAssessment.high.push(category);
      } else if (data.priority === 'MEDIUM') {
        matrix.riskAssessment.medium.push(category);
      } else {
        matrix.riskAssessment.low.push(category);
      }
    }
  });
  
  // 4. Identify cross-module dependencies
  Object.entries(matrix.sharedTables).forEach(([table, info]) => {
    if (info.usedBy.length > 1) {
      const risk = info.usedBy.length > 3 ? 'HIGH' : 
                  info.usedBy.length > 2 ? 'MEDIUM' : 'LOW';
      
      matrix.crossModuleDependencies.push({
        table,
        sharedBy: info.usedBy,
        moduleCount: info.usedBy.length,
        fileCount: info.fileCount,
        risk,
        recommendation: risk === 'HIGH' ? 
          `⚠️ CRITICAL: Changes require coordination across ${info.usedBy.length} modules` :
          `Changes will affect ${info.usedBy.join(', ')}`
      });
    }
  });
  
  // Sort by risk
  matrix.crossModuleDependencies.sort((a, b) => {
    const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return riskOrder[a.risk] - riskOrder[b.risk];
  });
  
  matrix.migrationOpportunities.sort((a, b) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  // Update summary
  matrix.summary.totalTables = Object.keys(matrix.sharedTables).length;
  matrix.summary.sharedTables = matrix.crossModuleDependencies.length;
  matrix.summary.hardcodedCategories = Object.keys(matrix.hardcodedValues).length;
  matrix.summary.migrationOpportunities = matrix.migrationOpportunities.length;
  
  return matrix;
}

// Generate human-readable report
function generateReadableReport(matrix) {
  const lines = [];
  
  lines.push('# PUVI System - Dependency Analysis Report');
  lines.push('');
  lines.push(`**Generated:** ${matrix.generatedAt}`);
  lines.push(`**Version:** ${matrix.version}`);
  lines.push('');
  
  // Executive Summary
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`- **Total Tables:** ${matrix.summary.totalTables}`);
  lines.push(`- **Shared Tables:** ${matrix.summary.sharedTables} (cross-module dependencies)`);
  lines.push(`- **Hardcoded Categories:** ${matrix.summary.hardcodedCategories}`);
  lines.push(`- **Migration Opportunities:** ${matrix.summary.migrationOpportunities}`);
  lines.push('');
  
  // Risk Assessment
  lines.push('## Risk Assessment');
  lines.push('');
  if (matrix.riskAssessment.high.length > 0) {
    lines.push('### 🔴 HIGH Priority');
    matrix.riskAssessment.high.forEach(item => {
      lines.push(`- ${item}: Immediate migration recommended`);
    });
    lines.push('');
  }
  
  if (matrix.riskAssessment.medium.length > 0) {
    lines.push('### 🟡 MEDIUM Priority');
    matrix.riskAssessment.medium.forEach(item => {
      lines.push(`- ${item}: Schedule for next sprint`);
    });
    lines.push('');
  }
  
  if (matrix.riskAssessment.low.length > 0) {
    lines.push('### 🟢 LOW Priority');
    matrix.riskAssessment.low.forEach(item => {
      lines.push(`- ${item}: Can be addressed opportunistically`);
    });
    lines.push('');
  }
  
  // Critical Shared Tables
  lines.push('## Critical Shared Tables');
  lines.push('');
  lines.push('Tables used by multiple modules (changes have cascading effects):');
  lines.push('');
  
  matrix.crossModuleDependencies
    .filter(dep => dep.risk === 'HIGH' || dep.risk === 'MEDIUM')
    .forEach(dep => {
      lines.push(`### ${dep.table}`);
      lines.push(`- **Risk Level:** ${dep.risk}`);
      lines.push(`- **Shared By:** ${dep.sharedBy.join(', ')}`);
      lines.push(`- **File Count:** ${dep.fileCount}`);
      lines.push(`- **Recommendation:** ${dep.recommendation}`);
      lines.push('');
    });
  
  // Migration Opportunities
  lines.push('## Migration Opportunities');
  lines.push('');
  lines.push('Hardcoded values that should be moved to database:');
  lines.push('');
  
  matrix.migrationOpportunities.forEach((opp, index) => {
    lines.push(`### ${index + 1}. ${opp.category.toUpperCase().replace(/_/g, ' ')}`);
    lines.push('');
    lines.push(`**Priority:** ${opp.priority} | **Effort:** ${opp.estimatedEffort}`);
    lines.push('');
    lines.push(`**Current State:** ${opp.currentState}`);
    lines.push('');
    lines.push(`**Suggested Migration:** ${opp.suggestedMigration}`);
    lines.push('');
    lines.push(`**Affected Modules:** ${opp.affectedModules.join(', ')}`);
    lines.push('');
    lines.push('**Migration Steps:**');
    opp.migrationSteps.forEach(step => {
      lines.push(step);
    });
    lines.push('');
  });
  
  // Detailed Table Usage
  lines.push('## Appendix: Detailed Table Usage');
  lines.push('');
  
  Object.entries(matrix.sharedTables)
    .filter(([_, info]) => info.usedBy.length > 0)
    .sort((a, b) => b[1].usedBy.length - a[1].usedBy.length)
    .slice(0, 10)
    .forEach(([table, info]) => {
      lines.push(`- **${table}**: Used by ${info.usedBy.join(', ')} (${info.fileCount} files)`);
    });
  
  return lines.join('\n');
}

// Main execution
console.log('🔍 Analyzing dependencies...\n');
const startTime = Date.now();

const matrix = generateDependencyMatrix();

// Save JSON matrix
const matrixPath = path.resolve(__dirname, 'dependency-matrix.json');
fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));
console.log(`✓ Dependency matrix: dependency-matrix.json`);

// Save human-readable report
const report = generateReadableReport(matrix);
const reportPath = path.resolve(__dirname, 'DEPENDENCY-REPORT.md');
fs.writeFileSync(reportPath, report);
console.log(`✓ Analysis report: DEPENDENCY-REPORT.md`);

// Display summary
console.log('\n📊 Summary:');
console.log(`  - Shared tables: ${matrix.summary.sharedTables}`);
console.log(`  - Hardcoded categories: ${matrix.summary.hardcodedCategories}`);
console.log(`  - Migration opportunities: ${matrix.summary.migrationOpportunities}`);

if (matrix.riskAssessment.high.length > 0) {
  console.log(`\n⚠️  HIGH PRIORITY ISSUES: ${matrix.riskAssessment.high.join(', ')}`);
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n✅ Analysis complete in ${elapsed}s`);
