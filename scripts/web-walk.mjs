// Open the app in a real browser, signed in, and save a screenshot of one
// screen. This is the eyes of the daily product walkthrough
// (plan/self-iteration-loop.md): without it the loop can only read the DOM,
// and half the yardstick (long German lines overflowing, a cover clipped, a
// control under the tab bar) is only visible as pixels.
//
// Why Chrome over CDP rather than the Browser pane: a hidden pane composites
// no frames and lays out at 0x0, and nothing in an unattended run can show
// it. Why no puppeteer: neither puppeteer nor playwright is installed here,
// and Node 22 has a global WebSocket, so CDP needs no dependency at all.
//
// Clicks go through Input.dispatchMouseEvent and keys through
// Input.dispatchKeyEvent because react-native-web's Pressable ignores
// element.click() and its TextInputs ignore a DOM value assignment — both
// need trusted events.
//
// Usage (the backend must already be up: python scripts/dev_stack.py up):
//   node scripts/web-walk.mjs --route /plaza --out ../walkthroughs/2026-11-16
//   node scripts/web-walk.mjs --route /tasks --no-signin --viewport 390x844

import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const DEBUG_PORT = 9222;

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const next = process.argv[index + 1];
  return next && !next.startsWith('--') ? next : true;
}

const options = {
  base: arg('base', 'http://localhost:8083'),
  route: arg('route', '/plaza'),
  out: arg('out', path.join(os.tmpdir(), 'postervia-walk')),
  viewport: arg('viewport', '390x844'),
  lang: arg('lang', 'en-US'),
  signin: arg('no-signin') ? false : true,
  envFile: arg('env-file', '../novaku-backend/.devstack/env'),
  keep: Boolean(arg('keep')),
};

// Git Bash rewrites an argument that starts with a slash into a Windows path
// (`/plaza` arrives as `E:/Git/Git/plaza`), so a route may be given without
// the leading slash: --route plaza, --route settings/event-reminders.
if (typeof options.route === 'string') {
  const mangled = options.route.match(/^[A-Za-z]:[\\/].*?[\\/]([^\\/]+(?:[\\/][^\\/]+)*)$/);
  if (mangled) options.route = `/${mangled[1].replace(/\\/g, '/')}`;
  if (!options.route.startsWith('/')) options.route = `/${options.route}`;
}

const [width, height] = options.viewport.split('x').map(Number);

async function readDevCredentials() {
  const text = await readFile(options.envFile, 'utf8');
  const values = Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => line.includes('=') && !line.startsWith('#'))
      .map((line) => {
        const at = line.indexOf('=');
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
      }),
  );
  return { email: values.DEVSTACK_USER_EMAIL, password: values.DEVSTACK_USER_PASSWORD };
}

async function waitFor(check, { timeout = 60000, every = 400, what = 'condition' } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const result = await check();
    if (result) return result;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, every));
  }
}

async function startChrome(profileDir) {
  const child = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${profileDir}`,
      `--lang=${options.lang}`,
      `--accept-lang=${options.lang}`,
      `--window-size=${width},${height}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=Translate',
      'about:blank',
    ],
    { stdio: 'ignore', detached: false },
  );
  const target = await waitFor(
    async () => {
      try {
        const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
        const pages = (await response.json()).filter((page) => page.type === 'page');
        return pages[0]?.webSocketDebuggerUrl ?? null;
      } catch {
        return null;
      }
    },
    { timeout: 30000, what: 'chrome devtools' },
  );
  return { child, target };
}

function connect(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let nextId = 1;
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result);
  });
  const send = (method, params = {}) =>
    ready.then(
      () =>
        new Promise((resolve, reject) => {
          const id = nextId++;
          pending.set(id, { resolve, reject });
          socket.send(JSON.stringify({ id, method, params }));
        }),
    );
  return { send, close: () => socket.close() };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result?.value;
}

async function centreOf(cdp, selectorExpression) {
  return evaluate(
    cdp,
    `(() => {
      const node = ${selectorExpression};
      if (!node) return null;
      const box = node.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) return null;
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    })()`,
  );
}

async function click(cdp, selectorExpression, what) {
  const point = await waitFor(() => centreOf(cdp, selectorExpression), { what });
  // Hit-test before clicking. A control covered by a scrim or a sibling layer
  // looks fine in a screenshot and silently swallows every click, which is a
  // finding in its own right — so say what is on top rather than time out
  // later on a symptom.
  const blocker = await evaluate(
    cdp,
    `(() => {
      const target = ${selectorExpression};
      const hit = document.elementFromPoint(${point.x}, ${point.y});
      if (!target || !hit) return 'nothing at the point';
      if (hit === target || target.contains(hit) || hit.contains(target)) return null;
      return (hit.tagName + (hit.getAttribute('data-testid') ? '[' + hit.getAttribute('data-testid') + ']' : '')
        + ' ' + (hit.className || '')).trim().slice(0, 120);
    })()`,
  );
  if (blocker) console.error(`web-walk: ${what} hit-tests to ${blocker}`);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp.send('Input.dispatchMouseEvent', {
      type,
      x: point.x,
      y: point.y,
      button: 'left',
      clickCount: 1,
      buttons: type === 'mousePressed' ? 1 : 0,
    });
  }
}

async function typeText(cdp, text) {
  // Input.insertText, not dispatchKeyEvent: a keyDown carrying only `text`
  // reaches the page but produces no input event, so a react-native-web
  // TextInput stays empty and the form submits blank.
  await cdp.send('Input.insertText', { text });
}

// react-native-web renders testID as data-testid, which is the only handle
// here that does not move when copy, locale or layout changes.
const byTestId = (id) => `document.querySelector('[data-testid=${JSON.stringify(id)}]')`;

// The plaza welcome sheet (D-188) has no testID on its button, so reach it
// through the body text it does have.
const PLAZA_WELCOME_OK = `(() => {
  const body = ${byTestId('plaza-welcome.body')};
  if (!body) return null;
  let root = body;
  for (let step = 0; step < 6 && root.parentElement; step += 1) root = root.parentElement;
  const buttons = [...root.querySelectorAll('[role="button"]')];
  return buttons[buttons.length - 1] || null;
})()`;

async function main() {
  const profileDir = path.join(os.tmpdir(), `postervia-walk-profile-${process.pid}`);
  await mkdir(options.out, { recursive: true });
  const { child, target } = await startChrome(profileDir);
  const cdp = connect(target);

  try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 3,
      mobile: true,
    });

    if (options.signin) {
      const { email, password } = await readDevCredentials();
      if (!email || !password) throw new Error(`no dev credentials in ${options.envFile}`);
      // On the web there is no sign-in page: /login lands on the wall and
      // opens the sheet over it (D-151), so the wait is for the sheet's own
      // field, and the signed-in check cannot be "we left /login".
      await cdp.send('Page.navigate', { url: `${options.base}/login` });
      await waitFor(() => centreOf(cdp, byTestId('auth.login.email')), {
        timeout: 180000,
        what: 'the sign-in sheet (the first bundle can take two minutes)',
      });
      // A first visit also raises the plaza welcome sheet, and with both open
      // the welcome one wins every hit test over the sign-in form even though
      // it paints underneath. Dismiss it the way a reader would.
      if (await evaluate(cdp, `Boolean(${byTestId('plaza-welcome.body')})`)) {
        await click(cdp, PLAZA_WELCOME_OK, 'the plaza welcome button');
        await waitFor(
          async () => !(await evaluate(cdp, `Boolean(${byTestId('plaza-welcome.body')})`)),
          { timeout: 15000, what: 'the plaza welcome sheet to close' },
        );
      }

      await click(cdp, byTestId('auth.login.email'), 'the email field');
      const focused = await evaluate(
        cdp,
        `(document.activeElement && (document.activeElement.getAttribute('data-testid')
          || document.activeElement.tagName)) || 'none'`,
      );
      if (focused !== 'auth.login.email') {
        throw new Error(`clicking the email field focused ${focused} instead`);
      }
      await typeText(cdp, email);
      await click(cdp, byTestId('auth.login.password'), 'the password field');
      await typeText(cdp, password);
      await click(cdp, byTestId('auth.login.submit'), 'the sign-in button');
      await waitFor(
        async () => !(await evaluate(cdp, `Boolean(${byTestId('auth.sheet')})`)),
        { timeout: 60000, what: 'the sign-in sheet to close' },
      );
    }

    await cdp.send('Page.navigate', { url: `${options.base}${options.route}` });
    await waitFor(
      async () => (await evaluate(cdp, 'document.body.innerText.trim().length')) > 40,
      { timeout: 120000, what: `content on ${options.route}` },
    );
    // One more beat so images and fonts land before the shutter.
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const slug = options.route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const imagePath = path.join(options.out, `${slug}.png`);
    await writeFile(imagePath, Buffer.from(shot.data, 'base64'));

    const text = await evaluate(cdp, 'document.body.innerText');
    await writeFile(path.join(options.out, `${slug}.txt`), text ?? '', 'utf8');

    // Named controls go into the run's own output, so a selector that stops
    // matching can be fixed from the report instead of another debug round.
    const controls = await evaluate(
      cdp,
      `JSON.stringify({
        inputs: [...document.querySelectorAll('input, textarea')].map((element) => ({
          type: element.type, placeholder: element.placeholder,
          label: element.getAttribute('aria-label'),
        })),
        buttons: [...document.querySelectorAll('button, [role="button"], div[tabindex]')]
          .map((element) => (element.innerText || element.getAttribute('aria-label') || '').trim())
          .filter(Boolean).slice(0, 25),
      })`,
    );

    console.log(
      JSON.stringify(
        {
          route: options.route,
          signedIn: options.signin,
          pathname: await evaluate(cdp, 'location.pathname'),
          screenshot: imagePath,
          textChars: (text ?? '').length,
          controls: controls ? JSON.parse(controls) : null,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    // A failed walk still has to leave evidence, or the loop records "it did
    // not work" with nothing to look at.
    try {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(path.join(options.out, 'error.png'), Buffer.from(shot.data, 'base64'));
      const text = await evaluate(cdp, 'document.body.innerText');
      await writeFile(path.join(options.out, 'error.txt'), text ?? '', 'utf8');
      console.error(`web-walk: evidence in ${options.out} (error.png, error.txt)`);
    } catch {
      // The page may be gone; the original error is what matters.
    }
    throw error;
  } finally {
    cdp.close();
    child.kill();
    if (!options.keep && existsSync(profileDir)) {
      await rm(profileDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

main().catch((error) => {
  console.error(`web-walk failed: ${error.message}`);
  process.exit(1);
});
