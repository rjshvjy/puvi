// .dev-index/scripts/gen-index-ast.mjs
// COMPREHENSIVE VERSION - Handles all React patterns in your codebase

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs';
import path from 'path';
import { globby } from 'globby';
import { fileURLToPath } from 'url';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..');
process.chdir(REPO_ROOT);

console.log('Working directory:', process.cwd());

// Include all possible React file locations and patterns
const GLOBS = [
  // Main React app files
  'puvi-frontend/puvi-frontend-main/src/*.{js,jsx}',
  'puvi-frontend/puvi-frontend-main/src/**/*.{js,jsx}',
  
  // Module components (your main components)
  'puvi-frontend/puvi-frontend-main/src/modules/**/*.{js,jsx}',
  'puvi-frontend/puvi-frontend-main/src/modules/**/index.{js,jsx}',
  
  // Reusable components
  'puvi-frontend/puvi-frontend-main/src/components/**/*.{js,jsx}',
  
  // Services (contain API exports but not components)
  'puvi-frontend/puvi-frontend-main/src/services/**/*.{js,jsx}',
  
  // Python backend files
  'puvi-backend/puvi-backend-main/modules/**/*.py',
  'puvi-backend/puvi-backend-main/utils/**/*.py',
  'puvi-backend/puvi-backend-main/*.py',
  
  // Exclusions
  '!**/node_modules/**',
  '!**/build/**',
  '!**/dist/**',
  '!**/.git/**',
  '!**/venv/**',
  '!**/__pycache__/**',
  '!**/*.test.js',
  '!**/*.spec.js'
];

const MAX_FILE_SIZE_KB = 500;
const MAX_FILES = 1000;

// Helpers
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
    if (!stat.isFile()) return null;
    if (stat.size > MAX_FILE_SIZE_KB * 1024) {
      console.log(`  Skipping large file (${Math.round(stat.size/1024)}KB): ${file}`);
      return null;
    }
    const buf = fs.readFileSync(fullPath);
    if (isProbablyBinary(buf)) {
      console.log(`  Skipping binary file: ${file}`);
      return null;
    }
    return buf.toString('utf8');
  } catch (err) {
    console.log(`  Error reading ${file}: ${err.message}`);
    return null;
  }
};

const parseAst = (code) =>
  parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'decorators-legacy', 'typescript', 'dynamicImport'],
    errorRecovery: true
  });

const collectTags = (code, file) => {
  const out = [];
  const lines = code.split('\n').slice(0, 500);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\/\/\s*@([a-zA-Z]+):\s*(.+)$/);
    if (m) out.push({ tag: `@${m[1]}: ${m[2]}`, file, line: i + 1 });
  }
  return out;
};

// Check if a name is likely a React component
const isLikelyComponent = (name) => {
  return name && /^[A-Z]/.test(name) && !name.includes('_');
};

// Extract component name from file path for index.js files
const getComponentFromPath = (filePath) => {
  const parts = filePath.split('/');
  // For module index files like modules/Purchase/index.js
  if (filePath.includes('/modules/') && filePath.endsWith('/index.js')) {
    const moduleIndex = parts.indexOf('modules');
    if (moduleIndex !== -1 && parts[moduleIndex + 1]) {
      return parts[moduleIndex + 1];
    }
  }
  // For component files
  const fileName = path.basename(filePath, path.extname(filePath));
  if (fileName !== 'index' && isLikelyComponent(fileName)) {
    return fileName;
  }
  return null;
};

// Build index
console.log('Starting index generation...');
console.log('Searching for files with patterns:', GLOBS);

const startTime = Date.now();

const files = await globby(GLOBS, { 
  cwd: REPO_ROOT,
  gitignore: true,
  absolute: false,
  onlyFiles: true
});

console.log(`Found ${files.length} files to process`);

// Debug: Show file type breakdown
const jsFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.jsx'));
const pyFiles = files.filter(f => f.endsWith('.py'));
const moduleFiles = jsFiles.filter(f => f.includes('/modules/'));
const componentFiles = jsFiles.filter(f => f.includes('/components/'));

console.log(`- JavaScript/React files: ${jsFiles.length}`);
console.log(`  - Module files: ${moduleFiles.length}`);
console.log(`  - Component files: ${componentFiles.length}`);
console.log(`- Python files: ${pyFiles.length}`);

if (jsFiles.length === 0) {
  console.warn('WARNING: No JavaScript/React files found!');
  console.warn('Check if path exists: puvi-frontend/puvi-frontend-main/src/');
}

if (files.length === 0) {
  console.error('ERROR: No files found!');
  process.exit(1);
}

if (files.length > MAX_FILES) {
  console.log(`WARNING: Too many files (${files.length}), limiting to first ${MAX_FILES}`);
  files.length = MAX_FILES;
}

const index = {
  generatedAt: new Date().toISOString(),
  filesScanned: 0,
  jsFilesScanned: 0,
  pyFilesScanned: 0,
  routes: [],
  imports: [],
  exports: [],
  components: [],
  tags: []
};

const importMap = new Map();
const componentSet = new Set(); // Track unique components
let filesProcessed = 0;

for (const file of files) {
  if (filesProcessed % 50 === 0 && filesProcessed > 0) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`Progress: ${filesProcessed}/${files.length} files (${elapsed}s)`);
  }

  const code = readTextFile(file);
  if (!code) continue;
  
  filesProcessed++;
  index.filesScanned++;

  // Tags
  try {
    index.tags.push(...collectTags(code, file));
  } catch (err) {
    console.log(`  Tag error in ${file}: ${err.message}`);
  }

  // Python files
  if (file.endsWith('.py')) {
    index.pyFilesScanned++;
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Flask routes
      if (line.includes('@') && line.includes('.route(')) {
        const match = line.match(/@\w+\.route\(['"]([^'"]+)['"]/);
        if (match) {
          const methodMatch = lines[i].match(/methods=\[['"](\w+)['"]\]/);
          index.routes.push({
            method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
            path: match[1],
            file
          });
        }
      }
      // Python exports
      if (line.match(/^def\s+(\w+)/)) {
        const funcMatch = line.match(/^def\s+(\w+)/);
        if (funcMatch) {
          index.exports.push({ name: funcMatch[1], file });
        }
      }
    }
    continue;
  }

  // JavaScript/JSX files
  if (file.endsWith('.js') || file.endsWith('.jsx')) {
    index.jsFilesScanned++;
    
    // For your specific patterns:
    // 1. Module index files like modules/Purchase/index.js -> Component: Purchase
    // 2. Component files like components/Masters/MastersList.jsx -> Component: MastersList
    // 3. Main App.js -> Component: App
    
    let ast;
    try {
      ast = parseAst(code);
    } catch (err) {
      console.log(`  Parse error in ${file}: ${err.message}`);
      continue;
    }

    try {
      let foundInFile = [];
      
      traverse.default(ast, {
        // Import tracking
        ImportDeclaration(p) {
          const from = p.node.source?.value;
          if (!from) return;
          
          // Track imports
          if (!importMap.has(from)) importMap.set(from, new Set());
          importMap.get(from).add(file);
          
          // Check for React import (indicates this is likely a component file)
          if (from === 'react' || from === 'React') {
            // This file likely contains React components
          }
        },

        // Export default statements (most common in your codebase)
        ExportDefaultDeclaration(p) {
          const d = p.node.declaration;
          
          // export default ComponentName
          if (d?.type === 'Identifier' && isLikelyComponent(d.name)) {
            foundInFile.push({ name: d.name, file, type: 'default' });
          }
          // export default function ComponentName() {}
          else if (d?.type === 'FunctionDeclaration' && d.id?.name && isLikelyComponent(d.id.name)) {
            foundInFile.push({ name: d.id.name, file, type: 'default' });
          }
          // export default () => {} or export default function() {}
          else if (d?.type === 'ArrowFunctionExpression' || (d?.type === 'FunctionExpression' && !d.id)) {
            // Use filename or module name
            const componentName = getComponentFromPath(file);
            if (componentName) {
              foundInFile.push({ name: componentName, file, type: 'default' });
            }
          }
        },

        // Named exports
        ExportNamedDeclaration(p) {
          const d = p.node.declaration;
          if (d?.id?.name) {
            index.exports.push({ name: d.id.name, file });
            if (isLikelyComponent(d.id.name)) {
              foundInFile.push({ name: d.id.name, file, type: 'named' });
            }
          } else if (d?.declarations) {
            d.declarations.forEach((decl) => {
              const name = decl.id?.name;
              if (name) {
                index.exports.push({ name, file });
                if (isLikelyComponent(name)) {
                  foundInFile.push({ name, file, type: 'named' });
                }
              }
            });
          } else if (p.node.specifiers?.length) {
            p.node.specifiers.forEach((s) => {
              const name = s.exported?.name || s.local?.name;
              if (name) {
                index.exports.push({ name, file });
                if (isLikelyComponent(name)) {
                  foundInFile.push({ name, file, type: 'named' });
                }
              }
            });
          }
        },

        // Component patterns in your codebase
        // const ComponentName = () => { return <jsx> }
        VariableDeclarator(p) {
          const name = p.node.id?.name;
          if (name && isLikelyComponent(name)) {
            const init = p.node.init;
            
            // Arrow function or regular function
            if (init?.type === 'ArrowFunctionExpression' || init?.type === 'FunctionExpression') {
              // Check if it's in the main scope (not nested)
              const parent = p.parent;
              if (parent?.type === 'VariableDeclaration' && 
                  (parent.kind === 'const' || parent.kind === 'let')) {
                foundInFile.push({ name, file, type: 'const' });
              }
            }
            // React.memo, React.forwardRef, etc.
            else if (init?.type === 'CallExpression') {
              const callee = init.callee;
              if (callee?.type === 'MemberExpression' && 
                  callee.object?.name === 'React' &&
                  ['memo', 'forwardRef', 'lazy'].includes(callee.property?.name)) {
                foundInFile.push({ name, file, type: 'wrapped' });
              } else if (callee?.name && ['memo', 'forwardRef', 'lazy'].includes(callee.name)) {
                foundInFile.push({ name, file, type: 'wrapped' });
              }
            }
          }
        },

        // function ComponentName() { return <jsx> }
        FunctionDeclaration(p) {
          const name = p.node.id?.name;
          if (name && isLikelyComponent(name)) {
            // Check if it returns something (likely JSX)
            const hasReturn = p.node.body?.body?.some(stmt => 
              stmt.type === 'ReturnStatement' && stmt.argument
            );
            if (hasReturn || code.includes(`function ${name}`)) {
              foundInFile.push({ name, file, type: 'function' });
            }
          }
        },

        // API calls (for route detection in frontend)
        CallExpression(p) {
          const c = p.node.callee;
          
          // api.get(), api.post(), etc.
          if (c?.type === 'MemberExpression' && 
              c.property?.type === 'Identifier' &&
              ['get', 'post', 'put', 'patch', 'delete'].includes(c.property.name)) {
            const args = p.node.arguments || [];
            const first = args[0];
            
            // String literal paths
            if (first?.type === 'StringLiteral' && first.value.startsWith('/')) {
              index.routes.push({
                method: c.property.name.toUpperCase(),
                path: first.value,
                file,
                source: 'frontend'
              });
            }
            // Template literals (for dynamic paths)
            else if (first?.type === 'TemplateLiteral' && first.quasis[0]?.value?.raw?.startsWith('/')) {
              const pathBase = first.quasis[0].value.raw;
              index.routes.push({
                method: c.property.name.toUpperCase(),
                path: pathBase + '...',
                file,
                source: 'frontend'
              });
            }
          }
        }
      });

      // Add unique components to index
      if (foundInFile.length > 0) {
        console.log(`  Found components in ${file}: ${foundInFile.map(c => c.name).join(', ')}`);
        
        foundInFile.forEach(comp => {
          const key = `${comp.name}:${comp.file}`;
          if (!componentSet.has(key)) {
            componentSet.add(key);
            index.components.push({ name: comp.name, file: comp.file });
          }
        });
      }

    } catch (err) {
      console.log(`  Traverse error in ${file}: ${err.message}`);
    }
  }
}

// Flatten imports map
index.imports = [...importMap.entries()].map(([from, usedInSet]) => ({
  from,
  usedIn: [...usedInSet]
}));

// Write output
const outPath = path.resolve(REPO_ROOT, '.dev-index', 'project_index.json');

console.log('\n=== Summary ===');
console.log(`Files processed: ${filesProcessed}`);
console.log(`JavaScript files: ${index.jsFilesScanned}`);
console.log(`Python files: ${index.pyFilesScanned}`);
console.log(`Routes found: ${index.routes.length}`);
console.log(`Components found: ${index.components.length}`);
console.log(`Exports found: ${index.exports.length}`);
console.log(`Imports tracked: ${index.imports.length}`);
console.log(`Time taken: ${Math.round((Date.now() - startTime) / 1000)}s`);

// List all components found
if (index.components.length > 0) {
  console.log('\nComponents detected:');
  index.components.forEach(c => console.log(`  - ${c.name} (${c.file})`));
}

fs.writeFileSync(outPath, JSON.stringify(index, null, 2));
console.log(`\nWrote ${outPath}`);
console.log(`File size: ${fs.statSync(outPath).size} bytes`);
