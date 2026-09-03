const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
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

function post(baseUrl, path, data) {
  const body = JSON.stringify(data);
  return request(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
    body
  });
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

test('reglas de usuario y clave normal', () => {
  assert.equal(USERNAME_REGEX.test('rivero'), true);
  assert.equal(USERNAME_REGEX.test('RIVERO'), false, 'La normalización a minúsculas ocurre antes de validar.');
  assert.equal(USERNAME_REGEX.test('riv1ro'), false);
  assert.equal(USERNAME_REGEX.test('abcd'), false);
  assert.equal(USERNAME_REGEX.test('abcdefghijk'), false);
  assert.equal(PASSWORD_REGEX.test('123456'), true);
  assert.equal(PASSWORD_REGEX.test('12345'), false);
  assert.equal(PASSWORD_REGEX.test('1234567'), false);
  assert.equal(PASSWORD_REGEX.test('12a456'), false);
});

test('flujo HTTP de login normal y rechazo de clave inválida', async t => {
  const port = 3100 + Math.floor(Math.random() * 500);
  const child = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(port), MONGODB_URI: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => { if (child.exitCode === null) child.kill('SIGTERM'); });
  const base = `http://127.0.0.1:${port}`;
  await waitForHealth(base, child);

  const invalid = await post(base, '/api/auth/login', { username: 'rivero', password: '12345' });
  assert.equal(invalid.status, 401);

  const missing = await post(base, '/api/auth/login', { username: 'noexiste', password: '123456' });
  assert.equal(missing.status, 401);
});

test('servidor expone health check y contenido público', async t => {
  const port = 3600 + Math.floor(Math.random() * 500);
  const child = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(port), MONGODB_URI: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => { if (child.exitCode === null) child.kill('SIGTERM'); });
  const base = `http://127.0.0.1:${port}`;
  const health = await waitForHealth(base, child);
  assert.equal(health.status, 200);
  const parsed = JSON.parse(health.body);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.app, 'riverosapay');
  const index = await request(`${base}/`);
  assert.equal(index.status, 200);
  assert.match(index.body, /Riverosapay/i);
});
