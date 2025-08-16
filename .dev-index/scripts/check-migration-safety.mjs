#!/usr/bin/env node
// Migration Safety Checker for PUVI
// Pre-flight check before database changes

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MATRIX_PATH = path.resolve(__dirname, 'dependency-matrix.json');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Load dependency matrix
function loadMatrix() {
  if (!fs.existsSync(MATRIX_PATH)) {
    console.error(`${colors.red}❌ dependency-matrix.json not found${colors.reset}`);
    console.log('Run: node build-dependency-matrix.mjs first');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
}

// Check migration safety
function checkMigrationSafety(targetTable, changeType, options = {}) {
  const matrix = loadMatrix();
  
  console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}   Migration Safety Check${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);
  
  console.log(`📋 **Table:** ${targetTable}`);
  console.log(`🔧 **Change Type:** ${changeType}`);
  console.log(`📅 **Date:** ${new Date().toISOString()}\n`);
  
  const tableInfo = matrix.sharedTables[targetTable];
  
  if (!tableInfo) {
    console.log(`${colors.green}✅ Table "${targetTable}" not found in shared tables${colors.reset}`);
    console.log('   This table appears to be isolated to a single module.');
    console.log('   Changes are likely safe but verify manually.\n');
    return { safe: true, risk: 'LOW' };
  }
  
  // Analyze impact
  const moduleCount = tableInfo.usedBy.length;
  const fileCount = tableInfo.fileCount || 0;
  
  console.log(`${colors.yellow}⚠️  Table is shared across ${moduleCount} modules:${colors.reset}`);
  tableInfo.usedBy.forEach(module => {
    const ops = tableInfo.operations[module];
    console.log(`   - ${module} (${ops?.files?.length || 0} files)`);
  });
  console.log('');
  
  // Risk assessment by change type
  let risk = 'LOW';
  let actions = [];
  
  switch(changeType.toUpperCase()) {
    case 'ADD_COLUMN':
      console.log(`${colors.green}✅ Adding columns is generally safe${colors.reset}\n`);
      actions.push('1. Add column with DEFAULT value or NULL allowed');
      actions.push('2. Update INSERT statements in affected modules:');
      tableInfo.usedBy.forEach(module => {
        actions.push(`   - ${module}: Check INSERT queries`);
      });
      actions.push('3. Update any SELECT * queries to handle new column');
      risk = 'LOW';
      break;
      
    case 'REMOVE_COLUMN':
    case 'DROP_COLUMN':
      console.log(`${colors.red}🔴 HIGH RISK: Removing columns will break queries${colors.reset}\n`);
      actions.push('1. Search for column usage in all modules:');
      tableInfo.usedBy.forEach(module => {
        actions.push(`   - ${module}: grep for column name`);
      });
      actions.push('2. Update all SELECT, INSERT, UPDATE queries');
      actions.push('3. Update any ORM models or mappings');
      actions.push('4. Consider adding deprecation period first');
      risk = 'HIGH';
      break;
      
    case 'RENAME_COLUMN':
      console.log(`${colors.red}🔴 HIGH RISK: Renaming will break all references${colors.reset}\n`);
      actions.push('1. Consider adding new column instead');
      actions.push('2. If must rename, update simultaneously:');
      tableInfo.usedBy.forEach(module => {
        actions.push(`   - ${module}: All column references`);
      });
      actions.push('3. Update any hardcoded column names');
      risk = 'HIGH';
      break;
      
    case 'RENAME_TABLE':
      console.log(`${colors.red}🔴 CRITICAL RISK: All modules will break!${colors.reset}\n`);
      actions.push('1. DO NOT proceed without full system update');
      actions.push('2. Required updates:');
      tableInfo.usedBy.forEach(module => {
        actions.push(`   - ${module}: ALL table references`);
      });
      actions.push('3. Update any views, stored procedures');
      actions.push('4. Update ORM configurations');
      actions.push('5. Consider using view for backward compatibility');
      risk = 'CRITICAL';
      break;
      
    case 'ADD_INDEX':
      console.log(`${colors.green}✅ Adding indexes is safe${colors.reset}\n`);
      actions.push('1. Add index during low-traffic period');
      actions.push('2. Monitor query performance');
      risk = 'LOW';
      break;
      
    case 'CHANGE_TYPE':
    case 'ALTER_TYPE':
      console.log(`${colors.yellow}⚠️  MEDIUM RISK: Type changes need validation${colors.reset}\n`);
      actions.push('1. Check data compatibility');
      actions.push('2. Update validation in:');
      tableInfo.usedBy.forEach(module => {
        actions.push(`   - ${module}: Input validation`);
      });
      actions.push('3. Test with existing data');
      risk = 'MEDIUM';
      break;
      
    case 'ADD_CONSTRAINT':
      console.log(`${colors.yellow}⚠️  MEDIUM RISK: Constraints affect writes${colors.reset}\n`);
      actions.push('1. Verify existing data meets constraint');
      actions.push('2. Update validation in:');
      tableInfo.usedBy.forEach(module => {
        actions.push(`   - ${module}: Form validation`);
      });
      risk = 'MEDIUM';
      break;
      
    default:
      console.log(`${colors.yellow}⚠️  Unknown change type: ${changeType}${colors.reset}\n`);
      actions.push('1. Analyze impact manually');
      actions.push('2. Check all dependent modules');
      risk = 'UNKNOWN';
  }
  
  // Print action items
  console.log(`${colors.blue}📝 Required Actions:${colors.reset}`);
  actions.forEach(action => console.log(action));
  console.log('');
  
  // Check for hardcoded values
  const hardcodedRefs = [];
  Object.entries(matrix.hardcodedValues || {}).forEach(([category, data]) => {
    if (category.toLowerCase().includes(targetTable.toLowerCase())) {
      hardcodedRefs.push({
        category,
        count: data.occurrences.length,
        modules: data.modules
      });
    }
  });
  
  if (hardcodedRefs.length > 0) {
    console.log(`${colors.yellow}⚠️  Related hardcoded values found:${colors.reset}`);
    hardcodedRefs.forEach(ref => {
      console.log(`   - ${ref.category}: ${ref.count} occurrences in ${ref.modules.join(', ')}`);
    });
    console.log('');
  }
  
  // Final recommendation
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}   Recommendation${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);
  
  if (risk === 'CRITICAL' || risk === 'HIGH') {
    console.log(`${colors.red}❌ NOT RECOMMENDED without careful planning${colors.reset}`);
    console.log('   Create a migration plan covering all modules');
    console.log('   Consider phased approach or backward compatibility');
  } else if (risk === 'MEDIUM') {
    console.log(`${colors.yellow}⚠️  PROCEED WITH CAUTION${colors.reset}`);
    console.log('   Follow the action items above');
    console.log('   Test thoroughly in development first');
  } else {
    console.log(`${colors.green}✅ SAFE TO PROCEED${colors.reset}`);
    console.log('   Follow standard deployment procedures');
  }
  
  console.log('');
  return { safe: risk === 'LOW', risk };
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node check-migration-safety.mjs <table> <change_type> [options]');
    console.log('');
    console.log('Change types:');
    console.log('  ADD_COLUMN     - Adding new column');
    console.log('  REMOVE_COLUMN  - Dropping a column');
    console.log('  RENAME_COLUMN  - Renaming a column');
    console.log('  RENAME_TABLE   - Renaming the table');
    console.log('  CHANGE_TYPE    - Altering column data type');
    console.log('  ADD_INDEX      - Adding an index');
    console.log('  ADD_CONSTRAINT - Adding a constraint');
    console.log('');
    console.log('Examples:');
    console.log('  node check-migration-safety.mjs materials ADD_COLUMN');
    console.log('  node check-migration-safety.mjs cost_elements_master RENAME_COLUMN');
    process.exit(0);
  }
  
  return {
    table: args[0],
    changeType: args[1],
    options: args.slice(2)
  };
}

// Main execution
const { table, changeType, options } = parseArgs();
checkMigrationSafety(table, changeType, options);
