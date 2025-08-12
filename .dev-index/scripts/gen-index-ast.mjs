// .dev-index/scripts/gen-index-ast.mjs
// FIXED VERSION - Handles working directory correctly

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs';
import path from 'path';
import { globby } from 'globby';
import { fileURLToPath } from 'url';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRITICAL FIX: Get repo root (go up 2 levels from scripts folder)
const REPO_ROOT = path.resolve(__dirname, '..', '..');
process.chdir(REPO_ROOT); // Change to repo root for glob patterns

console.log('Working directory:', process.cwd());
console.log('Script directory:', __dirname);

// ---- Configure what to scan (relative to REPO ROOT) ----
const GLOBS = [
  'puvi-frontend/src/**/*.{js,jsx}',
  'puvi-backend/modules/**/*.py',
  'puvi-backend/utils/**/*.py',
  '!**/node_modules/**',
  '!**/build/**',
  '!**/dist/**',
  '!**/.git/**',
  '!**/venv/**',
  '!**/__pycache__/**'
];

// Safety limits
const MAX_FILE_SIZE_KB = 500;
const MAX_FILES = 1000;

// -------- Helpers --------
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
    plugins: ['jsx', 'classProperties', 'decorators-legacy'],
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

// -------- Build index --------
console.log('Starting index generation...');
console.log('Searching for files with patterns:', GLOBS);

const startTime = Date.now();

// Search for files from repo root
const files = await globby(GLOBS, { 
  cwd: REPO_ROOT,
  gitignore: true,
  absolute: false,
  onlyFiles: true
});

console.log(`Found ${files.length} files to process`);

if (files.length === 0) {
  console.error('ERROR: No files found! Check if the paths exist:');
  console.error('- puvi-frontend/src/');
  console.error('- puvi-backend/modules/');
  console.error('- puvi-backend/utils/');
  process.exit(1);
}

if (files.length > MAX_FILES) {
  console.log(`WARNING: Too many files (${files.length}), limiting to first ${MAX_FILES}`);
  files.length = MAX_FILES;
}

const index = {
  generatedAt: new Date().toISOString(),
  filesScanned: 0,
  routes: [],
  imports: [],
  exports: [],
  components: [],
  tags: []
};

const importMap = new Map();
let filesProcessed = 0;

for (const file of files) {
  // Progress indicator
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

  // Python files - simple pattern matching
  if (file.endsWith('.py')) {
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
      // Python exports (def statements at module level)
      if (line.match(/^def\s+(\w+)/)) {
        const funcMatch = line.match(/^def\s+(\w+)/);
        if (funcMatch) {
          index.exports.push({ name: funcMatch[1], file });
        }
      }
    }
    continue;
  }

  // JavaScript/JSX files - AST parsing
  if (!file.endsWith('.js') && !file.endsWith('.jsx')) {
    continue;
  }

  let ast;
  try {
    ast = parseAst(code);
  } catch (err) {
    console.log(`  Parse error in ${file}: ${err.message}`);
    continue;
  }

  try {
    traverse(ast, {
      ImportDeclaration(p) {
        const from = p.node.source?.value;
        if (!from) return;
        if (!importMap.has(from)) importMap.set(from, new Set());
        importMap.get(from).add(file);
      },

      ExportNamedDeclaration(p) {
        const d = p.node.declaration;
        if (d?.id?.name) {
          index.exports.push({ name: d.id.name, file });
        } else if (d?.declarations) {
          d.declarations.forEach((decl) => {
            const name = decl.id?.name;
            if (name) index.exports.push({ name, file });
          });
        }
      },

      ExportDefaultDeclaration(p) {
        const d = p.node.declaration;
        if (d?.type === 'FunctionDeclaration' && d.id?.name) {
          if (/^[A-Z]/.test(d.id.name)) {
            index.components.push({ name: d.id.name, file });
          }
        } else if (d?.type === 'Identifier' && d.name) {
          if (/^[A-Z]/.test(d.name)) {
            index.components.push({ name: d.name, file });
          }
        }
      },

      // API route patterns
      CallExpression(p) {
        const c = p.node.callee;
        if (
          c?.type === 'MemberExpression' &&
          c.property?.type === 'Identifier' &&
          ['get', 'post', 'put', 'patch', 'delete'].includes(c.property.name)
        ) {
          const args = p.node.arguments || [];
          const first = args[0];
          if (first?.type === 'StringLiteral') {
            index.routes.push({
              method: c.property.name.toUpperCase(),
              path: first.value,
              file
            });
          }
        }
      }
    });
  } catch (err) {
    console.log(`  Traverse error in ${file}: ${err.message}`);
  }
}

// Flatten imports map
index.imports = [...importMap.entries()].map(([from, usedInSet]) => ({
  from,
  usedIn: [...usedInSet]
}));

// ---- Write output ----
// Write to .dev-index folder at repo root
const outPath = path.resolve(REPO_ROOT, '.dev-index', 'project_index.json');

console.log('\n=== Summary ===');
console.log(`Files processed: ${filesProcessed}`);
console.log(`Routes found: ${index.routes.length}`);
console.log(`Components found: ${index.components.length}`);
console.log(`Exports found: ${index.exports.length}`);
console.log(`Time taken: ${Math.round((Date.now() - startTime) / 1000)}s`);

fs.writeFileSync(outPath, JSON.stringify(index, null, 2));
console.log(`\nWrote ${outPath}`);
console.log(`File size: ${fs.statSync(outPath).size} bytes`);
