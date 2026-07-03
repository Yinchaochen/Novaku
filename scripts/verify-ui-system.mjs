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

if (failures.length > 0) {
  console.error('UI system verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('UI system verification passed.');
