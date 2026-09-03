const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { USERNAME_REGEX, PASSWORD_REGEX } = require('../src/utils/utils');

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function post(baseUrl, pathName, data, cookie) {
  const body = JSON.stringify(data);
  const headers = {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body)
  };
  if (cookie) headers.cookie = cookie;
  return request(`${baseUrl}${pathName}`, { method: 'POST', headers, body });
}

function cookieFrom(response) {
  const value = response.headers['set-cookie'];
  return Array.isArray(value) && value.length ? value[0].split(';')[0] : null;
}

function waitForHealth(baseUrl, child, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    let lastError = null;
    const poll = async () => {
      if (Date.now() - started > timeoutMs) {
        reject(lastError || new Error('El servidor no respondió al health check.'));
        return;
      }
      if (child.exitCode !== null) {
        reject(new Error(`El servidor terminó inesperadamente con código ${child.exitCode}.`));
        return;
      }
      try {
        const response = await request(`${baseUrl}/api/health`);
        if (response.status === 200) return resolve(response);
        lastError = new Error(`Health check respondió ${response.status}.`);
      } catch (error) { lastError = error; }
      setTimeout(poll, 250);
    };
    poll();
  });
}

function spawnServer(extraEnv = {}) {
  const port = 3100 + Math.floor(Math.random() * 500);
  const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'riverosapay-test-'));
  const dbPath = path.join(dbDir, 'db.json');
  const child = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(port), MONGODB_URI: '', DB_PATH: dbPath, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const base = `http://127.0.0.1:${port}`;
  return { child, base, dbPath, dbDir };
}

function stopServer(server) {
  if (server.child.exitCode === null) server.child.kill('SIGTERM');
  fs.rmSync(server.dbDir, { recursive: true, force: true });
}

test('reglas de usuario y clave normal', () => {
  assert.equal(USERNAME_REGEX.test('abc'), true);
  assert.equal(USERNAME_REGEX.test('rivero'), true);
  assert.equal(USERNAME_REGEX.test('abcdefghijkl'), true);
  assert.equal(USERNAME_REGEX.test('abcdefghijklmno'), true);
  assert.equal(USERNAME_REGEX.test('ab'), false);
  assert.equal(USERNAME_REGEX.test('abcdefghijklmnop'), false);
  assert.equal(USERNAME_REGEX.test('RIVERO'), false, 'La normalización a minúsculas ocurre antes de validar.');
  assert.equal(USERNAME_REGEX.test('riv1ro'), false);
  assert.equal(USERNAME_REGEX.test('rivero-jsx'), false);
  assert.equal(PASSWORD_REGEX.test('123456'), true);
  assert.equal(PASSWORD_REGEX.test('12345'), false);
  assert.equal(PASSWORD_REGEX.test('1234567'), false);
  assert.equal(PASSWORD_REGEX.test('12a456'), false);
});

test('registro, duplicado y login normal con usuario escrito en mayúsculas', async t => {
  const server = spawnServer();
  t.after(() => stopServer(server));
  await waitForHealth(server.base, server.child);

  const registered = await post(server.base, '/api/auth/register', { username: 'RiveroJSX', password: '123456' });
  assert.equal(registered.status, 200);
  const created = JSON.parse(registered.body);
  assert.equal(created.username, 'riverojsx');
  assert.ok(created.recoveryCode);
  assert.match(created.recoveryCode, /^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){2}$/);

  const duplicate = await post(server.base, '/api/auth/register', { username: 'RIVEROjsx', password: '654321' });
  assert.equal(duplicate.status, 409);

  const wrongKey = await post(server.base, '/api/auth/login', { username: 'RIVEROJSX', password: '123457' });
  assert.equal(wrongKey.status, 401);

  const login = await post(server.base, '/api/auth/login', { username: 'RIVEROJSX', password: '123456' });
  assert.equal(login.status, 200);
  const logged = JSON.parse(login.body);
  assert.equal(logged.username, 'riverojsx');
  assert.ok(cookieFrom(login));
});

test('Admin acepta exactamente 12 dígitos y no confunde claves normales', async t => {
  const server = spawnServer({ ADMIN_ID: 'admin', ADMIN_PASSWORD: '123456789012' });
  t.after(() => stopServer(server));
  await waitForHealth(server.base, server.child);

  const adminLogin = await post(server.base, '/api/auth/login', { username: 'ADMIN', password: '123456789012' });
  assert.equal(adminLogin.status, 200);
  assert.equal(JSON.parse(adminLogin.body).tipo, 'admin');
  assert.ok(cookieFrom(adminLogin));

  const tooShort = await post(server.base, '/api/auth/login', { username: 'ADMIN', password: '123456' });
  assert.equal(tooShort.status, 401);

  const tooLong = await post(server.base, '/api/auth/login', { username: 'ADMIN', password: '1234567890123' });
  assert.equal(tooLong.status, 401);
});

test('health check y contenido público', async t => {
  const server = spawnServer();
  t.after(() => stopServer(server));
  const health = await waitForHealth(server.base, server.child);
  assert.equal(health.status, 200);
  const parsed = JSON.parse(health.body);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.app, 'riverosapay');
  const index = await request(`${server.base}/`);
  assert.equal(index.status, 200);
  assert.match(index.body, /Riverosapay/i);
});
