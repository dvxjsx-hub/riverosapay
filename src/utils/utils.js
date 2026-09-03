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
  hashPassword, newId, newShareCode, newFriendCode,
  USERNAME_REGEX, PASSWORD_REGEX,
  hashRecoveryCode, newRecoveryCode
};