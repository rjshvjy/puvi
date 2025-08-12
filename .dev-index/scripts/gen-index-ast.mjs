// .dev-index/scripts/gen-index-ast.mjs
// Generate a lightweight developer index for quick dependency & endpoint discovery.
// Runs in GitHub Actions (cloud-only). Output: .dev-index/project_index.json

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs';
import path from 'path';
import { globby } from 'globby';

// ---- Configure what to scan (adjust if your layout changes) ----
const GLOBS = [
  'src/**/*.{js,jsx,ts,tsx}',
  'server/**/*.{js,ts,tsx}',
  'backend/**/*.{js,ts,tsx}',
  'apps/**/*.{js,ts,tsx}',
  'puvi-frontend/**/*.{js,jsx,ts,tsx}',
  'puvi-backend/**/*.{js,ts,tsx}'
];

// Skip obviously huge or generated files
const MAX_FILE_SIZE_KB = 750; // safety cap

// -------- Helpers --------
const isProbablyBinary = (buf) => {
  // crude check: non-text ratio
  let nonText = 0;
  const len = Math.min(buf.length, 2048);
  for (let i = 0; i < len; i++) {
    const c = buf[i];
    if (c === 9 || c === 10 || c === 13) continue; // \t \n \r
    if (c < 32 || c > 126) nonText++;
  }
  return len > 0 && nonText / len > 0.3;
};

const readTextFile = (file) => {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) return null;
    if (stat.size > MAX_FILE_SIZE_KB * 1024) return null;
    const buf = fs.readFileSync(file);
    if (isProbablyBinary(buf)) return null;
    return buf.toString('utf8');
  } catch {
    return null;
  }
};

const parseAst = (code) =>
  parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'decorators-legacy', 'typescript']
  });

const collectTags = (code, file) => {
  const out = [];
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\/\/\s*@([a-zA-Z]+):\s*(.+)$/);
    if (m) out.push({ tag: `@${m[1]}: ${m[2]}`, file, line: i + 1 });
  }
  return out;
};

const toRouteFromNextApiPath = (file) =>
  '/api/' + file.split('pages/api/')[1].replace(/\.(t|j)sx?$/, '');

// -------- Build index --------
const files = await globby(GLOBS, { gitignore: true });

const index = {
  generatedAt: new Date().toISOString(),
  filesScanned: 0,
  routes: [],        // Express/Fastify-like (method, path, file)
  nextApi: [],       // Next.js API routes inferred from file path
  imports: [],       // { from, usedIn[] }
  exports: [],       // { name, file }
  components: [],    // { name, file }
  tags: []           // //@module: X, //@feature: Y, //@endpoint: ...
};

const importMap = new Map();

for (const file of files) {
  const code = readTextFile(file);
  if (!code) continue;
  index.filesScanned++;

  // Tags (cheap pass)
  index.tags.push(...collectTags(code, file));

  // Next.js API by path
  if (/\/pages\/api\//.test(file)) {
    index.nextApi.push({ file, route: toRouteFromNextApiPath(file) });
  }

  // AST pass
  let ast;
  try {
    ast = parseAst(code);
  } catch {
    continue; // skip unparsable files
  }

  traverse(ast, {
    // Imports
    ImportDeclaration(p) {
      const from = p.node.source?.value;
      if (!from) return;
      if (!importMap.has(from)) importMap.set(from, new Set());
      importMap.get(from).add(file);
    },

    // Named exports: export function foo() {}, export const bar = ...
    ExportNamedDeclaration(p) {
      const d = p.node.declaration;
      if (d?.id?.name) {
        index.exports.push({ name: d.id.name, file });
      } else if (d?.declarations) {
        // export const foo = ...
        d.declarations.forEach((decl) => {
          const name = decl.id?.name;
          if (name) index.exports.push({ name, file });
        });
      } else if (p.node.specifiers?.length) {
        // export { foo, bar }
        p.node.specifiers.forEach((s) => {
          const name = s.exported?.name || s.local?.name;
          if (name) index.exports.push({ name, file });
        });
      }
    },

    // Default export React components (heuristic)
    ExportDefaultDeclaration(p) {
      const d = p.node.declaration;
      if (d?.type === 'FunctionDeclaration' && d.id?.name) {
        // Only record PascalCase names as "components"
        if (/^[A-Z][A-Za-z0-9_]*$/.test(d.id.name)) {
          index.components.push({ name: d.id.name, file });
        }
      }
    },

    // Detect common HTTP route registrations: app.get('/x'), router.post('/y'), fastify.get('/z')
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
}

// Flatten imports map
index.imports = [...importMap.entries()].map(([from, usedInSet]) => ({
  from,
  usedIn: [...usedInSet]
}));

// ---- Write output ----
const outDir = '.dev-index';
const outPath = path.join(outDir, 'project_index.json');

// Ensure .dev-index folder exists on runner
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(outPath, JSON.stringify(index, null, 2));
console.log(`Wrote ${outPath}`);
