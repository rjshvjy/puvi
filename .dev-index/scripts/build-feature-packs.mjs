#!/usr/bin/env node
// Feature Pack Generator for PUVI
// Generates single-file bundles per feature with dependency analysis

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.resolve(__dirname, 'project_index.json');
const MATRIX_PATH = path.resolve(__dirname, 'dependency-matrix.json');
const PACKS_DIR = path.resolve(__dirname, 'packs');

// Ensure packs directory exists
if (!fs.existsSync(PACKS_DIR)) {
  fs.mkdirSync(PACKS_DIR, { recursive: true });
}

// Load project index
const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));

// Load dependency matrix if available
let dependencyMatrix = {};
if (fs.existsSync(MATRIX_PATH)) {
  dependencyMatrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
}

// Feature detection patterns
const FEATURE_PATTERNS = {
  backend: /puvi-backend.*\/modules\/([^\/]+)\.py/,
  frontend: /puvi-frontend.*\/modules\/([^\/]+)/,
  api: /\/api\/([^\/]+)/
};

// Feature name mappings
const FEATURE_MAPPINGS = {
  'sku': 'sku',
  'skumanagement': 'sku',
  'masters': 'masters',
  'mastersmanagement': 'masters',
  'batch': 'batch-production',
  'batchproduction': 'batch-production',
  'purchase': 'purchases',
  'blending': 'oil-blending',
  'writeoff': 'material-writeoff',
  'sales': 'material-sales',
  'cost': 'cost-management',
  'opening': 'opening-balance'
};

// Discover features from routes
function discoverFeatures() {
  const features = new Map();
  
  // Group by API endpoint prefix
  index.routes.forEach(route => {
    const match = route.path?.match(FEATURE_PATTERNS.api);
    if (match) {
      const feature = match[1].replace(/_/g, '-');
      if (!features.has(feature)) {
        features.set(feature, {
          name: feature,
          backend: new Set(),
          frontend: new Set(),
          services: new Set(),
          routes: [],
          tables: new Set()
        });
      }
      features.get(feature).routes.push(route);
      
      if (route.file) {
        features.get(feature).backend.add(route.file);
      }
    }
  });
  
  // Map frontend components
  index.components.forEach(comp => {
    const match = comp.file?.match(FEATURE_PATTERNS.frontend);
    if (match) {
      const feature = match[1].toLowerCase().replace(/management$/, '');
      const mappedFeature = mapFeatureName(feature);
      if (features.has(mappedFeature)) {
        features.get(mappedFeature).frontend.add(comp.file);
      }
    }
  });
  
  // Map table usage
  index.tableReferences?.forEach(tableRef => {
    tableRef.files.forEach(file => {
      features.forEach((feature, name) => {
        if ([...feature.backend, ...feature.frontend].some(f => f === file)) {
          feature.tables.add(tableRef.name);
        }
      });
    });
  });
  
  return features;
}

// Map feature names
function mapFeatureName(name) {
  return FEATURE_MAPPINGS[name.toLowerCase()] || name;
}

// Extract module name from file path
function extractModuleName(filePath) {
  const patterns = [
    /modules\/([^\/]+)\.py/,
    /modules\/([^\/]+)\//,
    /src\/modules\/([^\/]+)\//
  ];
  
  for (const pattern of patterns) {
    const match = filePath.match(pattern);
    if (match) return match[1];
  }
  return 'unknown';
}

// Read file safely
function readFileSafe(filePath) {
  try {
    const fullPath = path.resolve(REPO_ROOT, filePath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      if (stats.size > 150000) { // Skip files >150KB
        return `[File too large: ${(stats.size / 1024).toFixed(1)}KB]`;
      }
      return fs.readFileSync(fullPath, 'utf8');
    }
    return null;
  } catch (err) {
    return null;
  }
}

// Analyze cascading effects
function analyzeCascadingEffects(feature) {
  const effects = [];
  const criticalTables = ['materials', 'cost_elements_master', 'suppliers', 'inventory'];
  
  feature.tables.forEach(table => {
    if (criticalTables.includes(table)) {
      const tableInfo = dependencyMatrix.sharedTables?.[table];
      if (tableInfo?.usedBy?.length > 1) {
        const otherModules = tableInfo.usedBy.filter(m => m !== feature.name);
        effects.push({
          table,
          sharedWith: otherModules,
          risk: otherModules.length > 2 ? 'HIGH' : 'MEDIUM'
        });
      }
    }
  });
  
  return effects;
}

// Generate pack for a feature
function generatePack(feature) {
  const lines = [];
  const processedFiles = new Set();
  const timestamp = new Date().toISOString();
  
  // Header
  lines.push(`# Feature Pack: ${feature.name.toUpperCase()}`);
  lines.push(`Generated: ${timestamp}`);
  lines.push(`Routes: ${feature.routes.length} | Tables: ${feature.tables.size} | Files: ${feature.backend.size + feature.frontend.size}`);
  lines.push('');
  
  // Table of Contents
  lines.push('## Table of Contents');
  lines.push('1. [API Endpoints](#api-endpoints)');
  lines.push('2. [Database Dependencies](#database-dependencies)');
  lines.push('3. [Backend Implementation](#backend-implementation)');
  lines.push('4. [API Service Layer](#api-service-layer)');
  lines.push('5. [Frontend Components](#frontend-components)');
  lines.push('6. [Data Flow & Integration](#data-flow--integration)');
  lines.push('');
  
  // API Endpoints
  lines.push('## API Endpoints');
  lines.push('```');
  const groupedRoutes = {};
  feature.routes.forEach(r => {
    const group = r.function || 'misc';
    if (!groupedRoutes[group]) groupedRoutes[group] = [];
    groupedRoutes[group].push(`${r.method.padEnd(6)} ${r.path}`);
  });
  
  Object.entries(groupedRoutes).forEach(([func, routes]) => {
    lines.push(`# ${func}`);
    routes.forEach(r => lines.push(r));
  });
  lines.push('```');
  lines.push('');
  
  // Database Dependencies
  lines.push('## Database Dependencies');
  
  if (feature.tables.size > 0) {
    lines.push('| Table | Shared With | Risk | Impact |');
    lines.push('|-------|-------------|------|--------|');
    
    [...feature.tables].sort().forEach(table => {
      const tableInfo = dependencyMatrix.sharedTables?.[table];
      if (tableInfo) {
        const otherModules = tableInfo.usedBy.filter(m => {
          const cleaned = m.replace(/_/g, '-');
          return cleaned !== feature.name;
        });
        const risk = otherModules.length > 2 ? '🔴 HIGH' : 
                     otherModules.length > 0 ? '🟡 MEDIUM' : '🟢 LOW';
        const impact = otherModules.length > 0 ? 
                      `Changes affect ${otherModules.length} other modules` : 
                      'Isolated to this module';
        lines.push(`| ${table} | ${otherModules.slice(0, 3).join(', ') || 'None'} | ${risk} | ${impact} |`);
      }
    });
  } else {
    lines.push('*No database tables directly referenced*');
  }
  lines.push('');
  
  // Check for hardcoded values
  const hardcodedInFeature = index.hardcodedValues?.filter(h => {
    return [...feature.backend, ...feature.frontend].some(f => h.file === f);
  });
  
  if (hardcodedInFeature?.length > 0) {
    lines.push('### ⚠️ Hardcoded Values Detected');
    hardcodedInFeature.slice(0, 5).forEach(h => {
      lines.push(`- \`${path.basename(h.file)}:${h.line}\` - ${h.type || 'value'}`);
    });
    if (hardcodedInFeature.length > 5) {
      lines.push(`- *... and ${hardcodedInFeature.length - 5} more*`);
    }
    lines.push('');
  }
  
  // Backend Implementation
  if (feature.backend.size > 0) {
    lines.push('## Backend Implementation');
    lines.push('');
    
    [...feature.backend].forEach(file => {
      if (processedFiles.has(file)) return;
      processedFiles.add(file);
      
      const content = readFileSafe(file);
      if (content && content !== '[File too large]') {
        lines.push(`### 📄 ${file}`);
        lines.push('```python');
        
        // For large files, include key sections only
        const contentLines = content.split('\n');
        if (contentLines.length > 300) {
          // Include imports and first few route definitions
          const imports = contentLines.slice(0, 50).join('\n');
          const routes = contentLines.filter(line => 
            line.includes('@') && line.includes('.route')
          ).slice(0, 10).join('\n...\n');
          
          lines.push(imports);
          lines.push('\n# ... [ABBREVIATED - Showing route definitions only] ...\n');
          lines.push(routes);
          lines.push(`\n# ... [${contentLines.length - 50} lines omitted] ...`);
        } else {
          lines.push(content);
        }
        lines.push('```');
        lines.push('');
      } else if (content === '[File too large]') {
        lines.push(`### 📄 ${file} [TOO LARGE - Key routes only]`);
        // Extract just route definitions
        const routesInFile = feature.routes.filter(r => r.file === file);
        if (routesInFile.length > 0) {
          lines.push('```python');
          routesInFile.forEach(r => {
            lines.push(`@${r.blueprint || 'app'}.route('${r.path}', methods=['${r.method}'])`);
            lines.push(`def ${r.function || 'handler'}():`);
            lines.push('    # Implementation here');
            lines.push('');
          });
          lines.push('```');
        }
        lines.push('');
      }
    });
  }
  
  // API Service Layer
  const apiFile = 'puvi-frontend/puvi-frontend-main/src/services/api/index.js';
  const apiContent = readFileSafe(apiFile);
  if (apiContent) {
    // Extract relevant API section
    const apiName = feature.name.replace(/-/g, '');
    const patterns = [
      new RegExp(`export const ${apiName}API[\\s\\S]*?^};`, 'gm'),
      new RegExp(`export const ${apiName}[\\s\\S]*?^};`, 'gm'),
      new RegExp(`// ${feature.name.toUpperCase()}[\\s\\S]*?^};`, 'gmi')
    ];
    
    let apiMatch = null;
    for (const pattern of patterns) {
      apiMatch = apiContent.match(pattern);
      if (apiMatch) break;
    }
    
    if (apiMatch) {
      lines.push('## API Service Layer');
      lines.push('```javascript');
      lines.push(apiMatch[0]);
      lines.push('```');
      lines.push('');
    }
  }
  
  // Frontend Components
  if (feature.frontend.size > 0) {
    lines.push('## Frontend Components');
    lines.push('');
    
    [...feature.frontend].sort().forEach(file => {
      if (processedFiles.has(file)) return;
      processedFiles.add(file);
      
      const content = readFileSafe(file);
      if (content) {
        lines.push(`### 📄 ${file}`);
        
        // Extract component metadata
        const hasUseState = content.includes('useState');
        const hasUseEffect = content.includes('useEffect');
        const hasAPI = content.includes('api.') || content.includes('API');
        
        lines.push(`*Features: ${[
          hasUseState && 'State Management',
          hasUseEffect && 'Side Effects',
          hasAPI && 'API Integration'
        ].filter(Boolean).join(', ') || 'Basic Component'}*`);
        lines.push('');
        
        lines.push('```javascript');
        const contentLines = content.split('\n');
        if (contentLines.length > 200) {
          // Show imports, main component definition, and key functions
          lines.push(contentLines.slice(0, 30).join('\n'));
          lines.push('\n// ... [Component implementation - showing key functions only] ...\n');
          
          // Extract key function names
          const functions = content.match(/const \w+ = .*=>/g) || [];
          functions.slice(0, 5).forEach(func => {
            lines.push(func + ' { /* ... */ }');
          });
          
          lines.push(`\n// ... [${contentLines.length - 30} lines total] ...`);
        } else {
          lines.push(content);
        }
        lines.push('```');
        lines.push('');
      }
    });
  }
  
  // Data Flow & Integration
  lines.push('## Data Flow & Integration');
  
  const cascadeEffects = analyzeCascadingEffects(feature);
  if (cascadeEffects.length > 0) {
    lines.push('### 🔗 Cascading Dependencies');
    cascadeEffects.forEach(effect => {
      lines.push(`- **${effect.table}** (${effect.risk} RISK)`);
      lines.push(`  - Shared with: ${effect.sharedWith.join(', ')}`);
      lines.push(`  - Impact: Changes will cascade to these modules`);
    });
  } else {
    lines.push('*No critical cross-module dependencies detected*');
  }
  lines.push('');
  
  // Integration points
  lines.push('### Integration Points');
  if (feature.name === 'purchases') {
    lines.push('- **Downstream**: Batch Production (material availability)');
    lines.push('- **Tables Modified**: inventory, purchases, purchase_items');
    lines.push('- **Cost Impact**: Updates weighted average costs');
  } else if (feature.name === 'batch-production') {
    lines.push('- **Upstream**: Purchase (materials), Opening Balance');
    lines.push('- **Downstream**: SKU Production, Blending');
    lines.push('- **Tables Modified**: batch, inventory, oil_cake_inventory');
  } else if (feature.name === 'sku') {
    lines.push('- **Upstream**: Batch Production (oil source)');
    lines.push('- **Downstream**: Sales, Reports');
    lines.push('- **Tables Modified**: sku_production, sku_oil_allocation');
  }
  lines.push('');
  
  // Footer
  lines.push('---');
  lines.push('*End of Feature Pack*');
  
  return lines.join('\n');
}

// Main execution
console.log('🚀 Building feature packs...\n');
const startTime = Date.now();

const features = discoverFeatures();
let packsGenerated = 0;
let totalSize = 0;

features.forEach((feature, name) => {
  if (feature.routes.length === 0) return;
  
  const packContent = generatePack(feature);
  const packPath = path.join(PACKS_DIR, `${name}.md`);
  
  fs.writeFileSync(packPath, packContent);
  const size = fs.statSync(packPath).size;
  totalSize += size;
  packsGenerated++;
  
  console.log(`  ✓ ${name}.md (${feature.routes.length} routes, ${(size / 1024).toFixed(1)}KB)`);
});

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n✅ Generated ${packsGenerated} feature packs`);
console.log(`📊 Total size: ${(totalSize / 1024).toFixed(1)}KB`);
console.log(`⏱️  Time: ${elapsed}s`);
console.log(`📁 Location: .dev-index/packs/`);
