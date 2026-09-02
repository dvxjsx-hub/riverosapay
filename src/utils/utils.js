const crypto = require('crypto');

// Hash simple (no es para producción, pero evita guardar contraseñas en texto plano)
function hashPassword(pw) {
  return crypto.createHash('sha256').update('riverospay_salt_' + pw).digest('hex');
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

// Nuevo sistema de acceso: usuario de 3 a 15 letras.
// Se permite escribir mayúsculas en la interfaz; el backend lo normaliza a minúsculas.
const USERNAME_REGEX = /^[A-Za-z]{3,15}$/;

// Nueva clave: exactamente 4 dígitos numéricos.
const PASSWORD_REGEX = /^\d{4}$/;

// Compatibilidad temporal con cuentas antiguas durante la migración.
const LEGACY_USERNAME_REGEX = /^[a-z]{5,10}$/;
const LEGACY_PASSWORD_REGEX = /^[A-Za-z0-9]{6,12}$/;

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
  hashPassword, newId, newShareCode, newFriendCode,
  USERNAME_REGEX, PASSWORD_REGEX,
  LEGACY_USERNAME_REGEX, LEGACY_PASSWORD_REGEX,
  hashRecoveryCode, newRecoveryCode
};
