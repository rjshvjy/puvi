// .dev-index/scripts/gen-index-ast.mjs
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import fs from 'fs';
import { globby } from 'globby';

const GLOBS = [
  'src/**/*.{js,jsx,ts,tsx}',
  'server/**/*.{js,ts,tsx}',
  'backend/**/*.{js,ts,tsx}',
  'apps/**/*.{js,ts,tsx}',
  'puvi-frontend/**/*.{js,jsx,ts,tsx}',
  'puvi-backend/**/*.{js,ts,tsx}'
];

const files = await globby(GLOBS, { gitignore: true });

const index = {
  generatedAt: new Date().toISOString(),
  routes: [],      // Express-like: app.get('/x'), router.post('/y')
  nextApi: [],     // Next.js API: pages/api/**
  imports: [],     // from -> [usedIn...]
  exports: [],     // named exports
  components: [],  // default-exported React component functions
  tags: []         // //@module: SKU, //@feature: traceability, etc.
};

const importMap = new Map();

function parseAst(code) {
  return parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'decorators-legacy', 'typescript']
  });
}

function collectTags(code, file) {
  const out = [];
  code.split('\n').forEach((line, i) => {
    const m = line.match(/\/\/\s*@([a-zA-Z]+):\s*(.+)$/);
    if (m) out.push({ tag: `@${m[1]}: ${m[2]}`, file, line: i + 1 });
  });
  return out;
}

for (const file of files) {
  if (!fs.existsSync(file) || fs.lstatSync(file).isDirectory()) continue;
  const code = fs.readFileSync(file, 'utf8');
  index.tags.push(...collectTags(code, file));

  // Next.js API by path
  if (/pages\/api\//.test(file)) {
    const route = file.split('pages/api/')[1].replace(/\.(t|j)sx?$/, '');
    index.nextApi.push({ file, route: `/api/${route}` });
  }

  let ast;
  try { ast = parseAst(code); } catch { continue; }

  traverse(ast, {
    ImportDeclaration(p) {
      const from = p.node.source.value;
      if (!importMap.has(from)) importMap.set(from, new Set());
      importMap.get(from).add(file);
    },
    ExportNamedDeclaration(p) {
      const d = p.node.declaration;
      if (d && d.id?.name) index.exports.push({ name: d.id.name, file });
    },
    ExportDefaultDeclaration(p) {
      const d = p.node.declaration;
      if (d?.type === 'FunctionDeclaration' && d.id?.name) {
        index.components.push({ name: d.id.name, file });
      }
    },
    CallExpression(p) {
      const c = p.node.callee;
      if (c?.type === 'MemberExpression' &&
          c.property?.type === 'Identifier' &&
          ['get','post','put','patch','delete'].includes(c.property.name)) {
        const args = p.node.arguments;
        const method = c.property.name.toUpperCase();
        const firstArg = args[0];
        if (firstArg?.type === 'StringLiteral') {
          index.routes.push({ method, path: firstArg.value, file });
        }
      }
    }
  });
}

// Flatten imports
index.imports = [...importMap.entries()].map(([from, usedIn]) => ({
  from, usedIn: [...usedIn]
}));

fs.mkdirSync('dev', { recursive: true });
fs.writeFileSync('dev/project_index.json', JSON.stringify(index, null, 2));
console.log('Wrote dev/project_index.json');
