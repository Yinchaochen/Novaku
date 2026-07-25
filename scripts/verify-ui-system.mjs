import fs from 'node:fs';
import path from 'node:path';

const appRoot = process.cwd();
const manifestPath = path.join(appRoot, 'ui-system', 'manifest.json');

const failures = [];

function fail(message) {
  failures.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(appRoot, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

function assertFile(relativePath, owner) {
  if (!exists(relativePath)) {
    fail(`${owner} references missing file: ${relativePath}`);
  }
}

function routeToFile(routePath) {
  if (routePath === '/dev') return 'app/dev/index.tsx';
  if (!routePath.startsWith('/dev/')) return null;
  return `app/dev/${routePath.slice('/dev/'.length)}.tsx`;
}

if (!exists('ui-system/manifest.json')) {
  fail('Missing ui-system/manifest.json');
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (const [name, entry] of Object.entries(manifest.foundations ?? {})) {
    if (entry.path) assertFile(entry.path, `foundation:${name}`);
    for (const referencedPath of entry.paths ?? []) assertFile(referencedPath, `foundation:${name}`);
  }

  for (const primitive of manifest.blessed_primitives ?? []) {
    assertFile(primitive.path, `primitive:${primitive.name}`);
  }

  for (const recipe of manifest.current_recipes ?? []) {
    assertFile(recipe.path, `recipe:${recipe.name}`);
  }

  const routes = manifest.verification_surfaces?.routes ?? [];
  for (const route of routes) {
    const routeFile = routeToFile(route.path);
    if (!routeFile) {
      fail(`Unsupported verification route path: ${route.path}`);
      continue;
    }
    assertFile(routeFile, `verification route:${route.path}`);
  }

  const primitiveNames = new Set((manifest.blessed_primitives ?? []).map((primitive) => primitive.name));
  for (const required of ['SurfaceCard', 'ListRow', 'StateBlock', 'Screen']) {
    if (!primitiveNames.has(required)) fail(`Manifest missing blessed primitive: ${required}`);
  }

  const recipeNames = new Set((manifest.current_recipes ?? []).map((recipe) => recipe.name));
  if (!recipeNames.has('OdysseyTaskLineCard')) {
    fail('Manifest missing extracted recipe: OdysseyTaskLineCard');
  }

  const routePaths = new Set(routes.map((route) => route.path));
  if (!routePaths.has('/dev/ui-system')) {
    fail('Manifest missing verification route: /dev/ui-system');
  }

  const commands = new Set(manifest.verification_surfaces?.commands ?? []);
  if (!commands.has('npm run verify:ui')) {
    fail('Manifest verification commands must include npm run verify:ui');
  }
}

if (exists('app/(tabs)/tasks.tsx')) {
  const tasks = read('app/(tabs)/tasks.tsx');
  for (const pattern of ['function TaskLineCard(', 'styles.lineCard']) {
    if (tasks.includes(pattern)) {
      fail(`Odyssey task line recipe regressed into tasks.tsx: ${pattern}`);
    }
  }
}

if (exists('components/recipes/OdysseyTaskLineCard.tsx')) {
  const recipe = read('components/recipes/OdysseyTaskLineCard.tsx');
  if (!recipe.includes('<SurfaceCard')) {
    fail('OdysseyTaskLineCard must keep a static SurfaceCard shell');
  }
}

// Ratchet: tab-bar clearance has a single source (theme/layout.ts
// getTabBarHeight). A literal three-digit paddingBottom in a tab screen means
// someone re-guessed the geometry. No screens are exempt: social.tsx moved to
// <Screen tabBar> with AUTH-CITY-001, retiring its allowlist entry.
const TAB_BAR_RATCHET_ALLOWLIST = new Set();
const tabsDir = path.join(appRoot, 'app', '(tabs)');
if (fs.existsSync(tabsDir)) {
  for (const file of fs.readdirSync(tabsDir).filter((name) => name.endsWith('.tsx'))) {
    const rel = `app/(tabs)/${file}`;
    if (TAB_BAR_RATCHET_ALLOWLIST.has(rel)) continue;
    const match = read(rel).match(/paddingBottom:\s*1\d\d\b/);
    if (match) {
      fail(`${rel} hard-codes tab-bar clearance (${match[0]}); use getTabBarHeight from theme/layout.ts`);
    }
  }
}

// Ratchet: Pressable callback styles lose their output on native (nativewind
// v4 css-interop, upstream nativewind#1105/#1781; see
// docs/MOBILE_PLATFORM_GOTCHAS.md 坑 #7). Shell/layout styles must be attached
// statically; a `({ pressed }) => ...` callback may only gate press feedback
// (opacity/transform) behind `pressed`. Anything the callback returns at rest
// is a violation.
const CALLBACK_STYLE_ALLOWLIST = new Set([
  'app/dev/pressable-probe.tsx', // intentional broken specimen for on-device probing
]);
const FEEDBACK_KEYS = new Set(['opacity', 'transform']);
const SCAN_DIRS = ['app', 'components', 'features'];

function* walkTsx(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkTsx(full);
    else if (entry.name.endsWith('.tsx')) yield full;
  }
}

function scanBalanced(text, start, open, close) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    else if (text[i] === close) { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of body) {
    if ('([{'.includes(char)) depth++;
    if (')]}'.includes(char)) depth--;
    if (char === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

for (const scanDir of SCAN_DIRS) {
  const absDir = path.join(appRoot, scanDir);
  if (!fs.existsSync(absDir)) continue;
  for (const file of walkTsx(absDir)) {
    const rel = path.relative(appRoot, file).replaceAll('\\', '/');
    if (CALLBACK_STYLE_ALLOWLIST.has(rel)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const callbackRe = /style=\{\(\{\s*pressed[^}]*\}\)\s*=>/g;
    let match;
    while ((match = callbackRe.exec(text)) !== null) {
      const line = text.slice(0, match.index).split('\n').length;
      const afterArrow = match.index + match[0].length;
      const rest = text.slice(afterArrow).trimStart();
      const bodyStart = afterArrow + (text.slice(afterArrow).length - rest.length);
      let body = '';
      if (rest[0] === '(') body = text.slice(bodyStart + 1, scanBalanced(text, bodyStart, '(', ')'));
      else if (rest[0] === '[') body = text.slice(bodyStart, scanBalanced(text, bodyStart, '[', ']') + 1);
      else if (rest[0] === '{') body = text.slice(bodyStart, scanBalanced(text, bodyStart, '{', '}') + 1);
      body = body.trim();

      const inner = body.startsWith('[') || body.startsWith('{') ? body.slice(1, -1) : body;
      const restingParts = splitTopLevel(inner).filter((part) => part.trim() && !/\bpressed\b/.test(part));
      const offending = restingParts.filter((part) => {
        const keyMatches = [...part.matchAll(/(^|[\s{,])(\w+):/g)].map((k) => k[2]);
        if (keyMatches.length > 0) return keyMatches.some((key) => !FEEDBACK_KEYS.has(key));
        return true; // styles.x refs / variables / prop passthrough at rest = essential styles in callback
      });
      if (offending.length > 0) {
        fail(
          `${rel}:${line} Pressable callback style carries resting styles (native drops them, GOTCHAS 坑 #7): ` +
          offending.map((part) => part.trim().slice(0, 40)).join(' | '),
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error('UI system verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('UI system verification passed.');
