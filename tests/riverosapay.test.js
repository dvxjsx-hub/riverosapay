const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { USERNAME_REGEX, PASSWORD_REGEX } = require('../src/utils/utils');

function request(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
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
        if (response.status === 200) {
          resolve(response);
          return;
        }
        lastError = new Error(`Health check respondió ${response.status}.`);
      } catch (error) {
        lastError = error;
      }
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

test('servidor expone health check y contenido público', async t => {
  const port = 3100 + Math.floor(Math.random() * 500);
  const child = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: String(port), MONGODB_URI: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  t.after(() => {
    if (child.exitCode === null) child.kill('SIGTERM');
  });

  const health = await waitForHealth(`http://127.0.0.1:${port}`, child);
  assert.equal(health.status, 200);
  const parsed = JSON.parse(health.body);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.app, 'riverosapay');

  const index = await request(`http://127.0.0.1:${port}/`);
  assert.equal(index.status, 200);
  assert.match(index.body, /Riverosapay/i);
});
