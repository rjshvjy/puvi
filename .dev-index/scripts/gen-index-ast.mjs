// .dev-index/scripts/gen-index-ast.mjs
// ENHANCED DEVELOPMENT INDEX GENERATOR
// Purpose: Comprehensive codebase analysis for debugging and development
// This version includes all original functionality plus enhanced debugging capabilities

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs';
import path from 'path';
import { globby } from 'globby';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
process.chdir(REPO_ROOT);

// Configuration
const GLOBS = [
  'puvi-frontend/puvi-frontend-main/src/*.{js,jsx}',
  'puvi-frontend/puvi-frontend-main/src/**/*.{js,jsx}',
  'puvi-frontend/puvi-frontend-main/src/modules/**/*.{js,jsx}',
  'puvi-frontend/puvi-frontend-main/src/components/**/*.{js,jsx}',
  'puvi-frontend/puvi-frontend-main/src/services/**/*.{js,jsx}',
  'puvi-backend/puvi-backend-main/modules/**/*.py',
  'puvi-backend/puvi-backend-main/utils/**/*.py',
  'puvi-backend/puvi-backend-main/*.py',
  '!**/node_modules/**',
  '!**/build/**',
  '!**/dist/**'
];

const MAX_FILE_SIZE_KB = 500;
const MAX_FILES = 1000;

// Enhanced index structure
const index = {
  version: "2.0",
  generatedAt: new Date().toISOString(),
  filesScanned: 0,
  jsFilesScanned: 0,
  pyFilesScanned: 0,
  
  // Original sections (preserved for compatibility)
  routes: [],
  imports: [],
  exports: [],
  components: [],
  tags: [],
  
  // Enhanced sections for debugging
  hardcodedValues: [],      // Hardcoded arrays, objects, constants
  databaseQueries: [],       // SQL queries with line numbers
  tableReferences: [],       // Database tables and where they're used
  functionSignatures: [],    // Function names, parameters, line numbers
  stateManagement: [],       // React hooks usage
  missingEndpoints: [],      // Frontend API calls without backend routes
  apiEndpoints: {},          // Routes grouped by module/blueprint
  configValues: [],          // Configuration constants
  errorHandling: [],         // Try-catch blocks and error handling
  lineNumbers: {}            // Key definitions with line numbers
};

// Helper functions
const isProbablyBinary = (buf) => {
  let nonText = 0;
  const len = Math.min(buf.length, 1024);
  for (let i = 0; i < len; i++) {
    const c = buf[i];
    if (c === 9 || c === 10 || c === 13) continue;
    if (c < 32 || c > 126) nonText++;
  }
  return len > 0 && nonText / len > 0.3;
};

const readTextFile = (file) => {
  try {
    const fullPath = path.resolve(REPO_ROOT, file);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile() || stat.size > MAX_FILE_SIZE_KB * 1024) return null;
    const buf = fs.readFileSync(fullPath);
    if (isProbablyBinary(buf)) return null;
    return buf.toString('utf8');
  } catch (err) {
    return null;
  }
};

const parseAst = (code) =>
  parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'decorators-legacy', 'typescript', 'dynamicImport'],
    errorRecovery: true
  });

// Extract hardcoded values (arrays, objects, constants)
const findHardcodedValues = (code, file) => {
  const hardcoded = [];
  const lines = code.split('\n');
  
  lines.forEach((line, i) => {
    // Hardcoded arrays
    const arrayMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*\[(.*?)\]/);
    if (arrayMatch && arrayMatch[2].includes("'")) {
      const varName = arrayMatch[1];
      const values = arrayMatch[2].match(/'([^']+)'/g) || [];
      if (values.length > 0) {
        hardcoded.push({
          file,
          line: i + 1,
          type: 'array',
          name: varName,
          values: values.map(v => v.replace(/'/g, '')),
          code: line.trim().substring(0, 100)
        });
      }
    }
    
    // Hardcoded objects with rates/prices/config
    if (line.includes(': {') && (line.includes('rate') || line.includes('price') || line.includes('config'))) {
      hardcoded.push({
        file,
        line: i + 1,
        type: 'object',
        code: line.trim().substring(0, 100)
      });
    }
    
    // Hardcoded numbers (prices, rates, limits)
    const numberMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(\d+(?:\.\d+)?)/);
    if (numberMatch && (numberMatch[1].toLowerCase().includes('rate') || 
                       numberMatch[1].toLowerCase().includes('price') ||
                       numberMatch[1].toLowerCase().includes('limit'))) {
      hardcoded.push({
        file,
        line: i + 1,
        type: 'number',
        name: numberMatch[1],
        value: numberMatch[2],
        code: line.trim()
      });
    }
  });
  
  return hardcoded;
};

// Extract database queries and table references
const findDatabaseInfo = (code, file) => {
  const queries = [];
  const tables = new Set();
  const lines = code.split('\n');
  
  lines.forEach((line, i) => {
    if (!file.endsWith('.py')) return;
    
    // Find execute patterns
    if (line.includes('execute(') || line.includes('cur.execute(')) {
      let queryStart = i;
      let queryLines = [];
      let inQuery = true;
      
      // Collect multi-line queries
      for (let j = i; j < Math.min(i + 20, lines.length) && inQuery; j++) {
        queryLines.push(lines[j]);
        if (lines[j].includes('"""') && j > i) inQuery = false;
        if (lines[j].includes('")') && !lines[j].includes('("""')) inQuery = false;
      }
      
      const fullQuery = queryLines.join('\n');
      
      // Extract table names
      const tableMatches = fullQuery.match(/(?:FROM|JOIN|INTO|UPDATE|TABLE|CREATE TABLE|DROP TABLE)\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(\w+)/gi);
      if (tableMatches) {
        tableMatches.forEach(match => {
          const table = match.replace(/^(?:FROM|JOIN|INTO|UPDATE|TABLE|CREATE TABLE|DROP TABLE)(?:\s+IF\s+(?:NOT\s+)?EXISTS)?\s+/i, '');
          if (!table.match(/^(SELECT|WHERE|AND|OR|SET)$/i)) {
            tables.add(table);
          }
        });
      }
      
      // Determine query type
      let queryType = 'OTHER';
      if (fullQuery.includes('SELECT')) queryType = 'SELECT';
      else if (fullQuery.includes('INSERT')) queryType = 'INSERT';
      else if (fullQuery.includes('UPDATE')) queryType = 'UPDATE';
      else if (fullQuery.includes('DELETE')) queryType = 'DELETE';
      else if (fullQuery.includes('CREATE')) queryType = 'CREATE';
      
      queries.push({
        file,
        line: queryStart + 1,
        type: queryType,
        tables: Array.from(tables),
        preview: lines[i].trim().substring(0, 100)
      });
    }
  });
  
  return { queries, tables: Array.from(tables) };
};

// Extract function signatures with parameters
const extractFunctionSignatures = (code, file) => {
  const signatures = [];
  const lines = code.split('\n');
  
  lines.forEach((line, i) => {
    // Python functions
    if (file.endsWith('.py')) {
      const funcMatch = line.match(/^def\s+(\w+)\s*\((.*?)\):/);
      if (funcMatch) {
        signatures.push({
          file,
          line: i + 1,
          name: funcMatch[1],
          params: funcMatch[2].trim(),
          type: 'python',
          isRoute: lines[i-1]?.includes('@') && lines[i-1]?.includes('.route(')
        });
      }
    }
    
    // JavaScript/React functions
    if (file.endsWith('.js') || file.endsWith('.jsx')) {
      // Arrow functions
      const arrowMatch = line.match(/(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\((.*?)\)\s*=>/);
      if (arrowMatch) {
        signatures.push({
          file,
          line: i + 1,
          name: arrowMatch[1],
          params: arrowMatch[2].trim(),
          type: 'arrow',
          isAsync: line.includes('async')
        });
      }
      
      // Regular functions
      const funcMatch = line.match(/(?:async\s+)?function\s+(\w+)\s*\((.*?)\)/);
      if (funcMatch) {
        signatures.push({
          file,
          line: i + 1,
          name: funcMatch[1],
          params: funcMatch[2].trim(),
          type: 'function',
          isAsync: line.includes('async')
        });
      }
    }
  });
  
  return signatures;
};

// Find React state management patterns
const findStateManagement = (ast, file) => {
  const stateUsage = [];
  
  try {
    traverse.default(ast, {
      CallExpression(p) {
        const callee = p.node.callee;
        
        // useState
        if (callee?.name === 'useState') {
          const parent = p.parent;
          if (parent?.type === 'VariableDeclarator' && parent.id?.type === 'ArrayPattern') {
            const [stateVar, setterVar] = parent.id.elements;
            if (stateVar?.name) {
              let initialValue = null;
              if (p.node.arguments[0]) {
                if (p.node.arguments[0].type === 'StringLiteral') {
                  initialValue = p.node.arguments[0].value;
                } else if (p.node.arguments[0].type === 'NumericLiteral') {
                  initialValue = p.node.arguments[0].value;
                } else if (p.node.arguments[0].type === 'ArrayExpression') {
                  initialValue = '[]';
                } else if (p.node.arguments[0].type === 'ObjectExpression') {
                  initialValue = '{}';
                }
              }
              
              stateUsage.push({
                file,
                line: p.node.loc?.start?.line,
                type: 'useState',
                name: stateVar.name,
                setter: setterVar?.name,
                initial: initialValue
              });
            }
          }
        }
        
        // Other hooks
        if (callee?.name?.startsWith('use')) {
          stateUsage.push({
            file,
            line: p.node.loc?.start?.line,
            type: callee.name,
            hook: callee.name
          });
        }
      }
    });
  } catch (err) {
    // Silent fail for AST traversal errors
  }
  
  return stateUsage;
};

// Extract routes with detailed information
const extractRoutesWithDetails = (code, file) => {
  const routes = [];
  const lines = code.split('\n');
  
  lines.forEach((line, i) => {
    // Python Flask routes
    if (file.endsWith('.py') && line.includes('@') && line.includes('.route(')) {
      const match = line.match(/@(\w+)\.route\(['"]([^'"]+)['"]/);
      if (match) {
        const methodMatch = line.match(/methods=\[['"](\w+)['"]\]/);
        
        // Find the function name on the next line
        let functionName = null;
        if (i + 1 < lines.length) {
          const funcMatch = lines[i + 1].match(/def\s+(\w+)\s*\(/);
          if (funcMatch) functionName = funcMatch[1];
        }
        
        routes.push({
          method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
          path: match[2],
          file,
          line: i + 1,
          blueprint: match[1],
          function: functionName,
          source: 'backend'
        });
      }
    }
    
    // Frontend API calls
    if ((file.endsWith('.js') || file.endsWith('.jsx'))) {
      // api.module.method pattern
      const apiMatch = line.match(/api\.(\w+)\.(\w+)\(['"]([^'"]+)['"]/);
      if (apiMatch) {
        routes.push({
          method: apiMatch[2].toUpperCase(),
          path: apiMatch[3],
          file,
          line: i + 1,
          module: apiMatch[1],
          source: 'frontend'
        });
      }
      
      // Direct fetch or axios calls
      const fetchMatch = line.match(/(?:fetch|axios)\(['"]([^'"]+)['"]/);
      if (fetchMatch && fetchMatch[1].startsWith('/')) {
        routes.push({
          method: 'GET',
          path: fetchMatch[1],
          file,
          line: i + 1,
          source: 'frontend'
        });
      }
    }
  });
  
  return routes;
};

// Find error handling patterns
const findErrorHandling = (code, file) => {
  const errorPatterns = [];
  const lines = code.split('\n');
  
  lines.forEach((line, i) => {
    // Try-catch blocks
    if (line.trim().startsWith('try')) {
      errorPatterns.push({
        file,
        line: i + 1,
        type: 'try-catch',
        code: line.trim()
      });
    }
    
    // Python exception handling
    if (file.endsWith('.py') && line.trim().startsWith('except')) {
      const exceptionMatch = line.match(/except\s+(\w+)?/);
      errorPatterns.push({
        file,
        line: i + 1,
        type: 'except',
        exception: exceptionMatch ? exceptionMatch[1] : 'generic',
        code: line.trim()
      });
    }
    
    // JavaScript catch blocks
    if ((file.endsWith('.js') || file.endsWith('.jsx')) && line.includes('catch')) {
      errorPatterns.push({
        file,
        line: i + 1,
        type: 'catch',
        code: line.trim()
      });
    }
  });
  
  return errorPatterns;
};

// Main processing
console.log('Starting enhanced index generation...');
console.log('Working directory:', process.cwd());
const startTime = Date.now();

const files = await globby(GLOBS, { 
  cwd: REPO_ROOT,
  gitignore: true,
  absolute: false,
  onlyFiles: true
});

console.log(`Found ${files.length} files to process`);

if (files.length === 0) {
  console.error('ERROR: No files found! Check your glob patterns and paths.');
  process.exit(1);
}

if (files.length > MAX_FILES) {
  console.log(`WARNING: Too many files (${files.length}), limiting to first ${MAX_FILES}`);
  files.length = MAX_FILES;
}

// Process each file
const importMap = new Map();
const componentSet = new Set();

for (const file of files) {
  if (index.filesScanned % 50 === 0 && index.filesScanned > 0) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`Progress: ${index.filesScanned}/${files.length} files (${elapsed}s)`);
  }
  
  const code = readTextFile(file);
  if (!code) continue;
  
  index.filesScanned++;
  
  // Extract hardcoded values
  const hardcoded = findHardcodedValues(code, file);
  if (hardcoded.length > 0) {
    index.hardcodedValues.push(...hardcoded);
  }
  
  // Extract database information
  if (file.endsWith('.py')) {
    index.pyFilesScanned++;
    const dbInfo = findDatabaseInfo(code, file);
    
    if (dbInfo.queries.length > 0) {
      index.databaseQueries.push(...dbInfo.queries);
    }
    
    dbInfo.tables.forEach(table => {
      let tableRef = index.tableReferences.find(t => t.name === table);
      if (!tableRef) {
        index.tableReferences.push({ name: table, files: [file] });
      } else if (!tableRef.files.includes(file)) {
        tableRef.files.push(file);
      }
    });
  }
  
  // Extract function signatures
  const signatures = extractFunctionSignatures(code, file);
  if (signatures.length > 0) {
    index.functionSignatures.push(...signatures);
  }
  
  // Extract routes with details
  const routes = extractRoutesWithDetails(code, file);
  if (routes.length > 0) {
    index.routes.push(...routes);
  }
  
  // Extract error handling
  const errorHandling = findErrorHandling(code, file);
  if (errorHandling.length > 0) {
    index.errorHandling.push(...errorHandling);
  }
  
  // JavaScript/React specific processing
  if (file.endsWith('.js') || file.endsWith('.jsx')) {
    index.jsFilesScanned++;
    
    try {
      const ast = parseAst(code);
      
      // Find state management
      const stateUsage = findStateManagement(ast, file);
      if (stateUsage.length > 0) {
        index.stateManagement.push(...stateUsage);
      }
      
      // Process AST for components, imports, exports
      traverse.default(ast, {
        // Import tracking
        ImportDeclaration(p) {
          const from = p.node.source?.value;
          if (from) {
            if (!importMap.has(from)) importMap.set(from, new Set());
            importMap.get(from).add(file);
          }
        },
        
        // Export tracking
        ExportNamedDeclaration(p) {
          if (p.node.declaration?.declarations) {
            p.node.declaration.declarations.forEach((d) => {
              const name = d.id?.name;
              if (name) {
                index.exports.push({ 
                  name, 
                  file,
                  line: p.node.loc?.start?.line 
                });
              }
            });
          } else if (p.node.specifiers?.length) {
            p.node.specifiers.forEach((s) => {
              const name = s.exported?.name || s.local?.name;
              if (name) {
                index.exports.push({ 
                  name, 
                  file,
                  line: p.node.loc?.start?.line 
                });
              }
            });
          }
        },
        
        // Component detection
        ExportDefaultDeclaration(p) {
          const d = p.node.declaration;
          let componentName = null;
          
          if (d?.type === 'Identifier') {
            componentName = d.name;
          } else if (d?.id?.name) {
            componentName = d.id.name;
          } else if (d?.type === 'ArrowFunctionExpression' || d?.type === 'FunctionDeclaration') {
            // Try to get name from file path
            const pathParts = file.split('/');
            const fileName = pathParts[pathParts.length - 1].replace(/\.(js|jsx)$/, '');
            if (fileName !== 'index' && /^[A-Z]/.test(fileName)) {
              componentName = fileName;
            }
          }
          
          if (componentName && /^[A-Z]/.test(componentName)) {
            const key = `${componentName}:${file}`;
            if (!componentSet.has(key)) {
              componentSet.add(key);
              index.components.push({ 
                name: componentName, 
                file,
                line: p.node.loc?.start?.line,
                type: 'default-export'
              });
            }
          }
        },
        
        // Named component detection
        VariableDeclarator(p) {
          const name = p.node.id?.name;
          if (name && /^[A-Z]/.test(name)) {
            const init = p.node.init;
            
            if (init?.type === 'ArrowFunctionExpression' || 
                init?.type === 'FunctionExpression' ||
                (init?.type === 'CallExpression' && 
                 (init.callee?.name === 'memo' || 
                  init.callee?.name === 'forwardRef' ||
                  (init.callee?.object?.name === 'React' && 
                   ['memo', 'forwardRef'].includes(init.callee?.property?.name))))) {
              
              const key = `${name}:${file}`;
              if (!componentSet.has(key)) {
                componentSet.add(key);
                index.components.push({ 
                  name, 
                  file,
                  line: p.node.loc?.start?.line,
                  type: 'const'
                });
              }
            }
          }
        }
      });
      
    } catch (err) {
      console.log(`  Parse error in ${file}: ${err.message}`);
    }
  }
}

// Convert import map to array
index.imports = [...importMap.entries()].map(([from, usedInSet]) => ({
  from,
  usedIn: [...usedInSet]
}));

// Post-processing: Find missing endpoints
const backendPaths = new Set(
  index.routes
    .filter(r => r.source === 'backend')
    .map(r => r.path)
);

index.missingEndpoints = index.routes
  .filter(r => r.source === 'frontend')
  .filter(r => !backendPaths.has(r.path))
  .map(r => ({
    path: r.path,
    method: r.method,
    calledFrom: r.file,
    line: r.line,
    module: r.module
  }));

// Group API endpoints by module
index.routes.forEach(route => {
  const moduleKey = route.blueprint || route.module || 'unknown';
  if (!index.apiEndpoints[moduleKey]) {
    index.apiEndpoints[moduleKey] = [];
  }
  index.apiEndpoints[moduleKey].push({
    method: route.method,
    path: route.path,
    file: route.file,
    line: route.line,
    function: route.function
  });
});

// Generate summary
const summary = {
  totalFiles: index.filesScanned,
  jsFiles: index.jsFilesScanned,
  pyFiles: index.pyFilesScanned,
  components: index.components.length,
  routes: index.routes.length,
  exports: index.exports.length,
  imports: index.imports.length,
  hardcodedValues: index.hardcodedValues.length,
  databaseQueries: index.databaseQueries.length,
  databaseTables: index.tableReferences.length,
  functions: index.functionSignatures.length,
  stateHooks: index.stateManagement.length,
  missingEndpoints: index.missingEndpoints.length,
  errorHandlers: index.errorHandling.length
};

index.summary = summary;

// Write output files
const outputDir = path.resolve(REPO_ROOT, '.dev-index');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Main index file
const mainOutputPath = path.resolve(outputDir, 'project_index.json');
fs.writeFileSync(mainOutputPath, JSON.stringify(index, null, 2));

// Optional: Write a separate detailed report
const reportPath = path.resolve(outputDir, 'project_report.json');
const report = {
  generatedAt: index.generatedAt,
  summary,
  issues: {
    missingEndpoints: index.missingEndpoints,
    hardcodedValues: index.hardcodedValues.filter(h => h.type === 'array' || h.type === 'object'),
    largeFiles: []
  },
  insights: {
    mostUsedTables: index.tableReferences
      .sort((a, b) => b.files.length - a.files.length)
      .slice(0, 10),
    componentsPerModule: {},
    apiCoverage: {
      total: index.routes.length,
      backend: index.routes.filter(r => r.source === 'backend').length,
      frontend: index.routes.filter(r => r.source === 'frontend').length,
      missing: index.missingEndpoints.length
    }
  }
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

// Display summary
console.log('\n' + '='.repeat(50));
console.log('     ENHANCED INDEX GENERATION COMPLETE');
console.log('='.repeat(50));

console.log('\n📊 SUMMARY:');
console.log(`   Files processed: ${summary.totalFiles}`);
console.log(`   ├─ JavaScript: ${summary.jsFiles}`);
console.log(`   └─ Python: ${summary.pyFiles}`);

console.log('\n🔍 DISCOVERIES:');
console.log(`   Components: ${summary.components}`);
console.log(`   API Routes: ${summary.routes}`);
console.log(`   Database Tables: ${summary.databaseTables}`);
console.log(`   Functions: ${summary.functions}`);
console.log(`   State Hooks: ${summary.stateHooks}`);

console.log('\n⚠️  POTENTIAL ISSUES:');
if (index.missingEndpoints.length > 0) {
  console.log(`   Missing Endpoints: ${index.missingEndpoints.length}`);
  index.missingEndpoints.slice(0, 3).forEach(e => {
    console.log(`     └─ ${e.method} ${e.path} (called from ${path.basename(e.calledFrom)}:${e.line})`);
  });
  if (index.missingEndpoints.length > 3) {
    console.log(`     └─ ... and ${index.missingEndpoints.length - 3} more`);
  }
}

if (index.hardcodedValues.length > 0) {
  console.log(`   Hardcoded Values: ${index.hardcodedValues.length}`);
  const arrays = index.hardcodedValues.filter(h => h.type === 'array').slice(0, 2);
  arrays.forEach(h => {
    console.log(`     └─ ${h.name || 'array'} in ${path.basename(h.file)}:${h.line}`);
  });
}

console.log('\n📁 OUTPUT FILES:');
console.log(`   Main Index: ${mainOutputPath}`);
console.log(`   Report: ${reportPath}`);
console.log(`   Size: ${Math.round(fs.statSync(mainOutputPath).size / 1024)}KB`);

console.log('\n✨ UNIQUE FEATURES:');
console.log('   • Line numbers for all detections');
console.log('   • Database table usage mapping');
console.log('   • Missing endpoint detection');
console.log('   • Hardcoded value identification');
console.log('   • Function signature extraction');
console.log('   • State management tracking');
console.log('   • Error handling patterns');

const elapsed = Math.round((Date.now() - startTime) / 1000);
console.log(`\n⏱️  Time taken: ${elapsed} seconds`);
console.log('\n✅ Index generation complete!');

// Exit with appropriate code
process.exit(index.missingEndpoints.length > 0 ? 1 : 0);
