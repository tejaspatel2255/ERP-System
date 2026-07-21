import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = process.env.API_BASE || `http://localhost:${process.env.PORT || 5000}/api`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@erp.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

const testUser = {
  name: 'SmokeTest User',
  email: `smoketest_${Date.now()}@erp.local`,
  password: 'SmokeTestPass123!'
};

let adminToken = '';
let testUserId = '';
let testUserToken = '';

console.log('🧪 Starting ERP Nexus Lightweight Smoke Test Suite...\n');
console.log(`Target API Base: ${API_BASE}`);

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function runSmokeTest() {
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message, responseData = null) {
    if (condition) {
      console.log(`  ✅ PASSED: ${message}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAILED: ${message}`);
      if (responseData) {
        console.error(`     Response: ${JSON.stringify(responseData)}`);
      }
      failedCount++;
    }
  }

  try {
    // Step 1: Register New User
    console.log('\n--- Step 1: User Self-Registration ---');
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: testUser
    });

    assert(
      regRes.status === 201 && regRes.data?.code === 'ACCOUNT_PENDING_APPROVAL',
      `Register user returns 201 with ACCOUNT_PENDING_APPROVAL status`,
      regRes
    );
    testUserId = regRes.data?.userId || regRes.data?.user?.id;

    // Step 2: Confirm Pending Login Attempt Rejected
    console.log('\n--- Step 2: Verify Login Restriction on Pending User ---');
    const loginPendingRes = await request('/auth/login', {
      method: 'POST',
      body: { email: testUser.email, password: testUser.password }
    });

    assert(
      loginPendingRes.status === 403 && loginPendingRes.data?.code === 'ACCOUNT_PENDING_APPROVAL',
      `Pending user login rejected with status 403 & code ACCOUNT_PENDING_APPROVAL`,
      loginPendingRes
    );

    // Step 3: Admin Login & User Approval
    console.log('\n--- Step 3: Admin Login & User Approval ---');
    let adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });

    if (adminLoginRes.status === 401 || adminLoginRes.status === 404) {
      console.log('  ℹ Admin login failed, seeding default admin account via /auth/seed...');
      await request('/auth/seed');
      adminLoginRes = await request('/auth/login', {
        method: 'POST',
        body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
      });
    }

    assert(adminLoginRes.status === 200 && adminLoginRes.data?.accessToken, `Admin login successful`, adminLoginRes);
    adminToken = adminLoginRes.data?.accessToken;

    if (testUserId && adminToken) {
      const approveRes = await request(`/users/${testUserId}/approve`, {
        method: 'PATCH',
        token: adminToken,
        body: { role_name: 'Admin' }
      });
      assert(approveRes.status === 200 && approveRes.data?.success, `Admin approved test user`, approveRes);
    }

    // Step 4: Approved User Login
    console.log('\n--- Step 4: Approved User Login ---');
    const userLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: testUser.email, password: testUser.password }
    });

    assert(userLoginRes.status === 200 && userLoginRes.data?.accessToken, `Approved user login successful`, userLoginRes);
    testUserToken = userLoginRes.data?.accessToken;

    // Step 5: Module GET Endpoints Audit
    console.log('\n--- Step 5: High-Risk Module Endpoints Health Check ---');
    const moduleEndpoints = [
      { name: 'Auth / Users', path: '/users' },
      { name: 'Dashboard', path: '/dashboard/summary' },
      { name: 'Sales Quotations', path: '/sales/quotations' },
      { name: 'Purchase Orders', path: '/purchase/orders' },
      { name: 'Store / Inventory', path: '/store/items' },
      { name: 'Production Work Orders', path: '/production/work-orders' },
      { name: 'Maintenance Assets', path: '/maintenance/assets' },
      { name: 'QA Tests', path: '/qa/tests' },
      { name: 'QC Raw Material', path: '/qc/raw-material' },
      { name: 'Dispatch Packing Slips', path: '/dispatch/packing-slips' },
      { name: 'HR Employees', path: '/hr/employees' },
      { name: 'Design Files', path: '/design/files' },
      { name: 'Settings Roles', path: '/roles' }
    ];

    for (const ep of moduleEndpoints) {
      const res = await request(ep.path, { token: testUserToken });
      const isValidStatus = res.status === 200 || res.status === 403; // 200 OK or 403 (if RBAC restricted)
      assert(
        isValidStatus && res.status !== 500 && res.status !== 404,
        `Module [${ep.name}] (${ep.path}) responded with status ${res.status} (No 404/500)`
      );
    }

    // Step 6: Cleanup Test User
    console.log('\n--- Step 6: Test Data Cleanup ---');
    if (testUserId && adminToken) {
      const cleanupRes = await request(`/users/${testUserId}/reject`, {
        method: 'DELETE',
        token: adminToken
      });
      assert(cleanupRes.status === 200, `Cleaned up and deleted test user (${testUser.email})`);
    }

    console.log(`\n==========================================`);
    console.log(`📊 Smoke Test Completed: ${passedCount} Passed, ${failedCount} Failed.`);
    console.log(`==========================================\n`);

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('\n❌ Smoke Test unexpected failure:', err);
    process.exit(1);
  }
}

runSmokeTest();
