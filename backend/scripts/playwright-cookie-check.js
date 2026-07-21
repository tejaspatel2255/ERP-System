/**
 * playwright-cookie-check.js
 *
 * Headless browser cross-site cookie verification for ERP Nexus.
 * Verifies that SameSite=None cookies are correctly set AND sent back
 * on a cross-site /api/auth/refresh request — something a raw Node
 * fetch script cannot test (it never enforces SameSite rules).
 *
 * Usage:
 *   npx playwright test backend/scripts/playwright-cookie-check.js
 *   -- or --
 *   node backend/scripts/playwright-cookie-check.js   (this file self-runs)
 */

import { chromium } from 'playwright';

const FRONTEND_URL = 'https://erp-system-frontend-black.vercel.app';
const BACKEND_URL  = 'https://erp-backend-7wr4.onrender.com';
const API_BASE     = `${BACKEND_URL}/api`;

// Admin credentials (read-only test — no state mutation)
const ADMIN_EMAIL    = 'admin@erp.com';
const ADMIN_PASSWORD = 'Admin@123';

const PASS = (msg) => console.log(`  ✅ PASS: ${msg}`);
const FAIL = (msg) => { console.error(`  ❌ FAIL: ${msg}`); process.exitCode = 1; };
const INFO = (msg) => console.log(`  ℹ️  ${msg}`);

async function run() {
  console.log('\n🎭 ERP Nexus — Playwright Headless Cookie Verification');
  console.log(`   Frontend : ${FRONTEND_URL}`);
  console.log(`   Backend  : ${BACKEND_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    // Treat the frontend and backend as different sites — this is the real cross-site scenario
    baseURL: FRONTEND_URL,
    ignoreHTTPSErrors: false,
  });
  const page = await context.newPage();

  // ─── Step 1: Load the frontend ───────────────────────────────────────────
  console.log('--- Step 1: Load Frontend ---');
  const response = await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (response.ok()) {
    PASS(`Frontend loaded (HTTP ${response.status()})`);
  } else {
    FAIL(`Frontend returned HTTP ${response.status()}`);
  }

  // ─── Step 2: Login via API directly (POST from browser context) ──────────
  console.log('\n--- Step 2: Login via API (browser fetch from frontend origin) ---');

  const loginResult = await page.evaluate(async ({ apiBase, email, password }) => {
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',   // ← tells the browser to store the Set-Cookie response
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      return { status: res.status, ok: res.ok, body };
    } catch (e) {
      return { error: e.message };
    }
  }, { apiBase: API_BASE, email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

  if (loginResult.error) {
    FAIL(`Login fetch threw: ${loginResult.error}`);
    await browser.close();
    return;
  }

  if (loginResult.status === 200 && loginResult.body?.success) {
    PASS(`Login returned 200 OK — accessToken received`);
  } else {
    FAIL(`Login returned HTTP ${loginResult.status}: ${JSON.stringify(loginResult.body)}`);
    await browser.close();
    return;
  }

  const accessToken = loginResult.body.accessToken;
  INFO(`Access token (first 20 chars): ${accessToken?.slice(0, 20)}...`);

  // ─── Step 3: Inspect the refreshToken cookie ─────────────────────────────
  console.log('\n--- Step 3: Inspect refreshToken Cookie ---');

  // Cookies are stored on the BACKEND domain since that's where Set-Cookie came from
  const cookies = await context.cookies(`${BACKEND_URL}`);
  const rtCookie = cookies.find(c => c.name === 'refreshToken');

  if (!rtCookie) {
    FAIL(`refreshToken cookie NOT found in browser context for ${BACKEND_URL}`);
    INFO(`All cookies visible: ${JSON.stringify(cookies.map(c => c.name))}`);
  } else {
    PASS(`refreshToken cookie IS present in browser cookie jar`);
    INFO(`  httpOnly : ${rtCookie.httpOnly}`);
    INFO(`  secure   : ${rtCookie.secure}`);
    INFO(`  sameSite : ${rtCookie.sameSite}`);

    rtCookie.httpOnly  ? PASS('httpOnly = true')   : FAIL('httpOnly is NOT true');
    rtCookie.secure    ? PASS('secure = true')     : FAIL('secure is NOT true (required for SameSite=None)');

    const ss = (rtCookie.sameSite || '').toLowerCase();
    if (ss === 'none') {
      PASS(`sameSite = None  (cookie will be sent on cross-site requests ✓)`);
    } else if (ss === 'strict') {
      FAIL(`sameSite = Strict  — cookie will be WITHHELD on cross-site requests! Fix not deployed yet.`);
    } else if (ss === 'lax') {
      FAIL(`sameSite = Lax  — cross-site POSTs will not include cookie. Is NODE_ENV=production on Render?`);
    } else {
      INFO(`sameSite = "${rtCookie.sameSite}" (unexpected value — treating as warning)`);
    }
  }

  // ─── Step 4: Simulate access-token expiry & call /refresh ────────────────
  console.log('\n--- Step 4: Token Refresh via Browser (cross-site fetch + cookie) ---');

  // We deliberately do NOT pass the access token — we only rely on the cookie
  const refreshResult = await page.evaluate(async ({ apiBase }) => {
    try {
      const res = await fetch(`${apiBase}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',   // ← browser must send the cross-site cookie here
        body: JSON.stringify({}),
      });
      const body = await res.json();
      // Also capture what the browser sent in the Cookie header via a trick:
      // we can't read request headers from JS, but the response tells us if it worked
      return { status: res.status, ok: res.ok, body };
    } catch (e) {
      return { error: e.message };
    }
  }, { apiBase: API_BASE });

  if (refreshResult.error) {
    FAIL(`Refresh fetch threw: ${refreshResult.error}`);
  } else if (refreshResult.status === 200 && refreshResult.body?.accessToken) {
    PASS(`/auth/refresh returned 200 — new accessToken issued`);
    PASS(`Browser sent the cross-site cookie correctly (SameSite=None is working ✓)`);
    INFO(`New token (first 20 chars): ${refreshResult.body.accessToken?.slice(0, 20)}...`);
  } else if (refreshResult.status === 400 && refreshResult.body?.message?.includes('required')) {
    FAIL(`/auth/refresh got 400 "Refresh token is required" — browser did NOT send the cookie cross-site`);
    FAIL(`This means SameSite is still Strict/Lax in the live deployment. Check Render NODE_ENV env var.`);
  } else {
    FAIL(`/auth/refresh returned HTTP ${refreshResult.status}: ${JSON.stringify(refreshResult.body)}`);
  }

  // ─── Step 5: Verify a protected endpoint works with the new token ────────
  console.log('\n--- Step 5: Protected Endpoint with new Access Token ---');
  // We use the new token from the refresh (if available), else fall back to original
  const tokenForProtected = refreshResult.body?.accessToken || accessToken;

  const protectedResult = await page.evaluate(async ({ apiBase, token }) => {
    try {
      const res = await fetch(`${apiBase}/dashboard/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
      });
      return { status: res.status, ok: res.ok };
    } catch (e) {
      return { error: e.message };
    }
  }, { apiBase: API_BASE, token: tokenForProtected });

  if (protectedResult.error) {
    FAIL(`Protected endpoint fetch threw: ${protectedResult.error}`);
  } else if (protectedResult.status === 200) {
    PASS(`/dashboard/summary returned 200 — session is fully functional after refresh`);
  } else {
    FAIL(`/dashboard/summary returned HTTP ${protectedResult.status}`);
  }

  await browser.close();

  // ─── Final summary ────────────────────────────────────────────────────────
  const passed = process.exitCode !== 1;
  console.log('\n==========================================');
  if (passed) {
    console.log('🎉 ALL CHECKS PASSED — SameSite=None is working correctly in production.');
  } else {
    console.log('💥 ONE OR MORE CHECKS FAILED — see ❌ lines above.');
  }
  console.log('==========================================\n');
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
