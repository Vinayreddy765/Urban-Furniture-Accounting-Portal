const test = require('node:test');
const assert = require('node:assert/strict');

const baseUrl = process.env.API_URL || 'http://localhost:5000';
let adminToken;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}

test('health endpoint is available', async () => {
  const { response, body } = await request('/health');
  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
});

test('Administrator can log in', async () => {
  const { response, body } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ loginId: process.env.TEST_ADMIN_LOGIN || 'admin01', password: process.env.TEST_ADMIN_PASSWORD || 'Admin@12345' }),
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.user.role, 'Administrator');
  assert.ok(body.data.token);
  adminToken = body.data.token;
});

test('invalid login is rejected without field disclosure', async () => {
  const { response, body } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ loginId: 'unknown01', password: 'Wrong@12345' }),
  });
  assert.equal(response.status, 401);
  assert.equal(body.error.message, 'Invalid Login Id or Password');
});

test('protected endpoints reject missing authentication', async () => {
  const { response } = await request('/api/contacts');
  assert.equal(response.status, 401);
});

test('Administrator can read reports and Trial Balance remains balanced', async () => {
  assert.ok(adminToken, 'Administrator login must run before report checks');
  const query = '?from=2026-01-01&to=2026-12-31';
  for (const report of ['/api/reports/balance-sheet', '/api/reports/profit-loss', '/api/reports/budget', '/api/reports/trial-balance']) {
    const { response } = await request(`${report}${query}`, { token: adminToken });
    assert.equal(response.status, 200, report);
  }
  const { response, body } = await request(`/api/reports/trial-balance${query}`, { token: adminToken });
  assert.equal(response.status, 200);
  assert.ok(Math.abs(body.data.totalDebit - body.data.totalCredit) <= 0.005);
});
