/* ============================================================
   riverosapay · AUTENTICACION: splash, login/registro y migración
   ============================================================ */

function initSplash() { setTimeout(goToAuth, 2200); }

function goToAuth() {
  showScreen('screen-auth');
  const lastUser = localStorage.getItem('riverospay_last_user');
  if (lastUser) { setAuthMode('login'); $('#log-user').value = lastUser; }
  else setAuthMode('register');
  setTimeout(() => { const campo = lastUser ? $('#log-user') : $('#reg-user'); campo?.focus({ preventScroll: true }); }, 80);
}

function setAuthMode(mode) {
  const isLogin = mode === 'login';
  $('#form-register').classList.toggle('hidden', isLogin);
  $('#form-login').classList.toggle('hidden', !isLogin);
  $('#auth-title').textContent = isLogin ? 'Iniciar sesión' : 'Crear usuario';
  $('#auth-sub').textContent = isLogin ? '' : '';
  $('#auth-toggle').textContent = isLogin ? 'Crear nueva cuenta' : '¿Ya tienes cuenta? Iniciar sesión';
  $('#auth-toggle').dataset.next = isLogin ? 'register' : 'login';
  $('#reg-error').textContent = '';
  $('#log-error').textContent = '';
  const reset = $('#auth-reset'); if (reset) reset.remove();
  const legacy = $('#auth-legacy');
  if (legacy) legacy.classList.toggle('hidden', !isLogin || localStorage.getItem('riverosapay_migrated_' + ($('#log-user')?.value || '').trim().toLowerCase()) === '1');
}

function cargarModuloAdmin() {
  return new Promise((resolve, reject) => {
    if (typeof enterAdmin === 'function') return resolve();
    const script = document.createElement('script');
    script.src = 'js/admin/admin.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar el módulo de administración.'));
    document.head.appendChild(script);
  });
}

function prepararCampoUsuario(campo) {
  if (!campo) return;
  campo.maxLength = 15;
  campo.addEventListener('input', () => {
    const limpio = campo.value.replace(/[^A-Za-z]/g, '');
    if (campo.value !== limpio) campo.value = limpio;
  });
}

function prepararCampoClave(campo) {
  if (!campo) return;
  campo.inputMode = 'numeric';
  campo.maxLength = 4;
  campo.minLength = 4;
  campo.addEventListener('input', () => {
    const limpio = campo.value.replace(/\D/g, '').slice(0, 4);
    if (campo.value !== limpio) campo.value = limpio;
  });
}

function ocultarAccesoUsuarioViejo(username) {
  const key = 'riverosapay_migrated_' + (username || '').trim().toLowerCase();
  if (username) localStorage.setItem(key, '1');
  $('#auth-legacy')?.classList.add('hidden');
}

function setupAuth() {
  prepararCampoUsuario($('#reg-user'));
  prepararCampoUsuario($('#log-user'));
  prepararCampoClave($('#reg-pass'));
  prepararCampoClave($('#reg-pass2'));
  prepararCampoClave($('#log-pass'));

  // Opción temporal únicamente para cuentas que todavía no han migrado.
  if (!$('#auth-legacy')) {
    const legacy = document.createElement('button');
    legacy.id = 'auth-legacy'; legacy.type = 'button'; legacy.className = 'link-btn ghost';
    legacy.textContent = '¿USUARIO VIEJO?';
    $('#auth-toggle').insertAdjacentElement('afterend', legacy);
    legacy.addEventListener('click', () => abrirLoginUsuarioViejo());
  }

  $('#auth-toggle').addEventListener('click', () => setAuthMode($('#auth-toggle').dataset.next));
  $('#log-user').addEventListener('input', () => {
    const username = $('#log-user').value.trim().toLowerCase();
    const legacy = $('#auth-legacy');
    if (legacy) legacy.classList.toggle('hidden', !username || localStorage.getItem('riverosapay_migrated_' + username) === '1');
  });
  $('#auth-olvide').addEventListener('click', (e) => { e.preventDefault(); abrirRecuperarContrasena(); });

  $('#form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#reg-user').value.trim().toLowerCase(), pass = $('#reg-pass').value, pass2 = $('#reg-pass2').value, err = $('#reg-error');
    if (!/^[A-Za-z]{3,15}$/.test(username)) { err.textContent = 'El usuario debe tener de 3 a 15 letras, sin números ni símbolos.'; return; }
    if (!/^\d{4}$/.test(pass)) { err.textContent = 'La clave debe tener exactamente 4 dígitos.'; return; }
    if (pass !== pass2) { err.textContent = 'Las claves no coinciden.'; return; }
    err.textContent = '';
    try {
      const user = await api.post('/api/auth/register', { username, password: pass });
      localStorage.setItem('riverospay_last_user', user.username);
      ocultarAccesoUsuarioViejo(user.username);
      STATE.user = user; STATE.onboardingPending = true; setupSocket(); mostrarCodigoRecuperacion(user.recoveryCode);
    } catch (ex) { err.textContent = ex.message; }
  });

  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#log-user').value.trim().toLowerCase(), pass = $('#log-pass').value, err = $('#log-error');
    try {
      const auth = await api.post('/api/auth/login', { username, password: pass });
      if (auth?.tipo === 'admin') {
        localStorage.removeItem('riverospay_last_user');
        await cargarModuloAdmin();
        enterAdmin();
        return;
      }
      localStorage.setItem('riverospay_last_user', auth.username);
      ocultarAccesoUsuarioViejo(auth.username);
      afterAuth(auth);
    } catch (ex) { err.textContent = ex.message; }
  });
}

function abrirLoginUsuarioViejo() {
  openModal('¿USUARIO VIEJO?', `<p class="muted">Usa aquí tu usuario y contraseña del sistema anterior. Después tendrás que crear tu nueva clave de 4 dígitos.</p><label>Usuario<input id="legacy-user" type="text" autocomplete="username"></label><label>Contraseña anterior<input id="legacy-pass" type="password" autocomplete="current-password"></label><p class="field-error" id="legacy-error"></p><button class="btn-primary" onclick="entrarUsuarioViejo()">Continuar</button>`);
}

async function entrarUsuarioViejo() {
  const username = $('#legacy-user').value.trim().toLowerCase();
  const password = $('#legacy-pass').value;
  const err = $('#legacy-error');
  try {
    const user = await api.post('/api/auth/login-legacy', { username, password });
    closeModal();
    localStorage.setItem('riverospay_last_user', user.username);
    STATE.user = user; STATE.onboardingPending = false; setupSocket();
    mostrarMigracionClave(user.username);
  } catch (ex) { err.textContent = ex.message; }
}

function mostrarMigracionClave(username) {
  openModal('Actualiza tu clave', `<p class="muted">Tu cuenta todavía usa el sistema anterior. Crea ahora tu nueva clave para continuar usando riverosapay.</p><label>Nueva clave<input id="migration-pass" type="password" inputmode="numeric" maxlength="4" minlength="4" autocomplete="new-password"></label><label>Confirmar clave<input id="migration-pass2" type="password" inputmode="numeric" maxlength="4" minlength="4" autocomplete="new-password"></label><p class="field-error" id="migration-error"></p><button class="btn-primary" onclick="migrarCuentaVieja()">Guardar nueva clave</button>`);
  prepararCampoClave($('#migration-pass'));
  prepararCampoClave($('#migration-pass2'));
}

async function migrarCuentaVieja() {
  const newPassword = $('#migration-pass').value;
  const confirmPassword = $('#migration-pass2').value;
  const err = $('#migration-error');
  if (!/^\d{4}$/.test(newPassword)) { err.textContent = 'La nueva clave debe tener exactamente 4 dígitos.'; return; }
  if (newPassword !== confirmPassword) { err.textContent = 'Las claves no coinciden.'; return; }
  try {
    const user = await api.post('/api/auth/migrar-clave', { newPassword, confirmPassword });
    ocultarAccesoUsuarioViejo(user.username);
    STATE.user = user;
    closeModal();
    toast('Cuenta actualizada. Ahora usarás tu nueva clave de 4 dígitos.');
    enterApp();
  } catch (ex) { err.textContent = ex.message; }
}

function afterAuth(user) { STATE.user = user; STATE.onboardingPending = false; setupSocket(); proceedAfterLogin(); }
function proceedAfterLogin() {
  if (STATE.onboardingPending) { STATE.onboardingPending = false; mostrarEresEstudiante(); return; }
  enterApp();
}

function mostrarCodigoRecuperacion(code) {
  $('#recovery-content').innerHTML = `<h1>Guarda tu código de recuperación</h1><p class="muted" style="margin:0 0 18px;">Es la única forma de recuperar tu cuenta si olvidas tu clave. Guárdalo en un lugar seguro.</p><div class="share-code">${code}</div><button class="btn-secondary" style="margin-top:14px;" onclick="copiarTexto('${code}')">Copiar código</button><label class="check-row" style="margin-top:18px;"><input type="checkbox" id="recovery-check">Ya guardé mi código de recuperación en un lugar seguro.</label><button class="btn-primary" id="recovery-continuar" disabled style="margin-top:14px;">Continuar</button>`;
  $('#recovery-check').addEventListener('change', (e) => { $('#recovery-continuar').disabled = !e.target.checked; });
  $('#recovery-continuar').addEventListener('click', proceedAfterLogin); showScreen('screen-recovery');
}

function copiarTexto(texto) {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(() => toast('Copiado')).catch(() => toast('Copia manualmente: ' + texto));
  else toast('Copia manualmente: ' + texto);
}

function abrirRecuperarContrasena() {
  openModal('Recuperar acceso', `<label>Usuario<input id="f-rec-user" type="text" autocomplete="username"></label><label>Código de recuperación<input id="f-rec-code" type="text" placeholder="XXXX-XXXX-XXXX"></label><label>Nueva clave<input id="f-rec-pass" type="password" inputmode="numeric" placeholder="4 dígitos" minlength="4" maxlength="4"></label><p class="field-error" id="f-rec-error"></p><button class="btn-primary" onclick="enviarRecuperacion()">Restablecer clave</button>`);
  prepararCampoUsuario($('#f-rec-user')); prepararCampoClave($('#f-rec-pass'));
}

async function enviarRecuperacion() {
  const username = $('#f-rec-user').value.trim().toLowerCase(), recoveryCode = $('#f-rec-code').value.trim(), newPassword = $('#f-rec-pass').value, err = $('#f-rec-error');
  if (!/^\d{4}$/.test(newPassword)) { err.textContent = 'La nueva clave debe tener exactamente 4 dígitos.'; return; }
  try {
    await api.post('/api/auth/recuperar', { username, recoveryCode, newPassword });
    ocultarAccesoUsuarioViejo(username);
    closeModal(); toast('Clave actualizada. Ya puedes iniciar sesión.'); setAuthMode('login'); $('#log-user').value = username;
  } catch (ex) { err.textContent = ex.message; }
}
