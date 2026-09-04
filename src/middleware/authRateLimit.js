const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_IP = 30;
const MAX_ATTEMPTS_PER_ACCOUNT = 10;
const MAX_FAILURES_BEFORE_LOCK = 5;
const LOCK_MS = 15 * 60 * 1000;

const ipBuckets = new Map();
const accountBuckets = new Map();

function ahora() {
  return Date.now();
}

function limpiar(bucket, now) {
  bucket.attempts = bucket.attempts.filter(ts => now - ts < WINDOW_MS);
  if (bucket.lockedUntil && bucket.lockedUntil <= now) {
    bucket.lockedUntil = 0;
    bucket.failures = 0;
  }
}

function obtener(bucketMap, key, now) {
  let bucket = bucketMap.get(key);
  if (!bucket) {
    bucket = { attempts: [], failures: 0, lockedUntil: 0 };
    bucketMap.set(key, bucket);
  }
  limpiar(bucket, now);
  return bucket;
}

function claveCuenta(req) {
  const username = String((req.body && req.body.username) || '').trim().toLowerCase();
  return username ? `${req.ip}|${username}` : null;
}

function loginRateLimit(req, res, next) {
  const now = ahora();
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const ipBucket = obtener(ipBuckets, ip, now);
  const accountKey = claveCuenta(req);
  const accountBucket = accountKey ? obtener(accountBuckets, accountKey, now) : null;

  if (ipBucket.lockedUntil > now || (accountBucket && accountBucket.lockedUntil > now)) {
    const retryAfter = Math.max(
      1,
      Math.ceil((Math.max(ipBucket.lockedUntil || 0, accountBucket?.lockedUntil || 0) - now) / 1000)
    );
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Demasiados intentos. Inténtalo de nuevo más tarde.' });
  }

  if (ipBucket.attempts.length >= MAX_ATTEMPTS_PER_IP || (accountBucket && accountBucket.attempts.length >= MAX_ATTEMPTS_PER_ACCOUNT)) {
    const retryAfter = Math.max(1, Math.ceil(WINDOW_MS / 1000));
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Demasiados intentos. Inténtalo de nuevo más tarde.' });
  }

  ipBucket.attempts.push(now);
  if (accountBucket) accountBucket.attempts.push(now);

  req.authRateLimit = {
    registrarFallo() {
      ipBucket.failures += 1;
      if (accountBucket) accountBucket.failures += 1;
      if (ipBucket.failures >= MAX_FAILURES_BEFORE_LOCK) ipBucket.lockedUntil = ahora() + LOCK_MS;
      if (accountBucket && accountBucket.failures >= MAX_FAILURES_BEFORE_LOCK) accountBucket.lockedUntil = ahora() + LOCK_MS;
    },
    registrarExito() {
      ipBucket.failures = 0;
      ipBucket.lockedUntil = 0;
      if (accountBucket) {
        accountBucket.failures = 0;
        accountBucket.lockedUntil = 0;
      }
    }
  };

  next();
}

module.exports = { loginRateLimit };
