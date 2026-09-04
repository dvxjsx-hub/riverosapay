const crypto = require('crypto');
const argon2 = require('argon2');

// S2: las contraseñas nuevas se almacenan con Argon2id.
// Los hashes SHA-256 antiguos se mantienen temporalmente para migrarlos
// automáticamente cuando el usuario inicia sesión correctamente.
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
};

async function hashPassword(pw) {
  return argon2.hash(String(pw), ARGON2_OPTIONS);
}

function hashLegacyPassword(pw) {
  return crypto.createHash('sha256').update('riverospay_salt_' + String(pw)).digest('hex');
}

function isArgon2Hash(hash) {
  return typeof hash === 'string' && hash.startsWith('$argon2');
}

async function verifyPassword(pw, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return { valid: false, legacy: false };

  if (isArgon2Hash(storedHash)) {
    try {
      return { valid: await argon2.verify(storedHash, String(pw)), legacy: false };
    } catch {
      return { valid: false, legacy: false };
    }
  }

  // Compatibilidad con cuentas creadas antes de S2.
  const actual = Buffer.from(hashLegacyPassword(pw), 'utf8');
  const esperado = Buffer.from(storedHash, 'utf8');
  const valid = actual.length === esperado.length && crypto.timingSafeEqual(actual, esperado);
  return { valid, legacy: valid };
}

function newId(prefix) {
  return prefix + '_' + crypto.randomBytes(6).toString('hex');
}

// Código de amistad: 8 dígitos, único y fijo por cuenta.
// Sustituye al antiguo código de compartir jefe↔empleado.
function newFriendCode(db) {
  let code;
  do {
    code = String(Math.floor(10000000 + Math.random() * 90000000));
  } while (db.users.some(u => u.codigoAmistad === code));
  return code;
}

// Compatibilidad temporal con cuentas antiguas.
function newShareCode(db) {
  let code;
  do {
    code = String(Math.floor(10000000 + Math.random() * 90000000));
  } while (db.users.some(u => u.shareCode === code));
  return code;
}

// Reglas de LOGIN: usuario de 3-15 letras y clave normal de exactamente 6 dígitos.
const USERNAME_REGEX = /^[a-z]{3,15}$/;
const PASSWORD_REGEX = /^\d{6}$/;

// hash del código de recuperación (sal distinta a la de la contraseña)
function hashRecoveryCode(code) {
  return crypto.createHash('sha256').update('riverospay_recovery_salt_' + code.toUpperCase()).digest('hex');
}

// código de recuperación tipo XXXX-XXXX-XXXX (sin 0/O/1/I para evitar confusiones al copiarlo a mano)
function newRecoveryCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const grupo = () => Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
  return `${grupo()}-${grupo()}-${grupo()}`;
}

module.exports = {
  hashPassword, verifyPassword, newId, newShareCode, newFriendCode,
  USERNAME_REGEX, PASSWORD_REGEX,
  hashRecoveryCode, newRecoveryCode
};
