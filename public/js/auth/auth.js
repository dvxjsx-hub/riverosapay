/* ============================================================
   Riverosapay · AUTENTICACION: splash, login/registro, recuperar contraseña
   ============================================================ */

const CLAVE_USUARIO_REGEX = /^\d{6}$/;
const CLAVE_ADMIN_REGEX = /^\d{12}$/;
const USERNAME_REGEX_FRONT = /^[a-z]{3,15}$/;

function instalarVisorClave6(campo) {
  if (!campo || campo.dataset.claveViewer === '1') return;
  campo.dataset.claveViewer = '1';
  const wrap = document.createElement('div');
  wrap.className = 'clave6-viewer';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<span></span><span></span><span></span><span></span><span></span><span></span>';
  campo.insertAdjacentElement('afterend', wrap);
  const actualizar = () => {
    const valor = campo.value || '';
    [...wrap.children].forEach((slot, i) => { slot.textContent = valor[i] ? '•' : ''; slot.classList.toggle('filled', !!valor[i]); });
  };
  campo.addEventListener('input', () => {
    campo.value = (campo.value || '').replace(/\D/g, '');
    actualizar();
  });
  actualizar();
}

function configurarCamposClave6() {
  ['#reg-pass', '#reg-pass2', '#f-rec-pass'].forEach(selector => {
    const campo = $(selector);
    if (!campo) return;
    campo.inputMode = 'numeric';
    campo.pattern = '[0-9]{6}';
    campo.minLength = 6;
    campo.maxLength = 6;
    campo.autocomplete = selector === '#f-rec-pass' ? 'new-password' : campo.autocomplete;
    campo.placeholder = '6 dígitos';
    instalarVisorClave6(campo);
  });

  const login = $('#log-pass');
  if (login) {
    login.type = 'text';
    login.inputMode = 'numeric';
    login.pattern = '[0-9]{6,12}';
    login.removeAttribute('maxlength');
    login.removeAttribute('minlength');
    login.autocomplete = 'off';
    login.placeholder = '6 dígitos';
    if (login.dataset.authDigitsConfigured !== '1') {
      login.dataset.authDigitsConfigured = '1';
      login.addEventListener('input', () => {
        login.value = (login.value || '').replace(/\D/g, '');
        actualizarVisorLoginClave(login);
      });
    }
    instalarVisorLoginClave(login);
    actualizarVisorLoginClave(login);
  }
}

function instalarVisorLoginClave(campo) {
  if (!campo || campo.dataset.loginClaveViewer === '1') return;
  campo.dataset.loginClaveViewer = '1';
  const wrap = document.createElement('div');
  wrap.className = 'clave6-viewer';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = '<span></span><span></span><span></span><span></span><span></span><span></span>';
  campo.insertAdjacentElement('afterend', wrap);
}

function actualizarVisorLoginClave(campo) {
  const wrap = campo?.nextElementSibling;
  if (!wrap || !wrap.classList.contains('clave6-viewer')) return;
  const valor = campo.value || '';
  [...wrap.children].forEach((slot, i) => {
    slot.textContent = valor[i] ? '•' : '';
    slot.classList.toggle('filled', !!valor[i]);
  });
}

function initSplash() { setTimeout(goToAuth, 2200); }

function goToAuth() {
  showScreen('screen-auth');
  const lastUser = localStorage.getItem('riverospay_last_user');
  if (lastUser) {
    setAuthMode('login');
    $('#log-user').value = lastUser;
    setLoginStep('key', { noFocus: true });
  } else {
    setAuthMode('register');
  }
  configurarCamposClave6();
  setTimeout(() => {
    const campo = lastUser ? $('#log-pass') : $('#reg-user');
    if (!campo) return;
    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement) return;
    if (!$('#screen-auth').classList.contains('active')) return;
    campo.focus({ preventScroll: true });
  }, 80);
}

function setLoginStep(step, opts) {
  const isKey = step === 'key';
  const userStep = $('#login-step-user');
  const keyStep = $('#login-step-key');
  const back = $('#login-step-back');
  userStep.classList.toggle('active', !isKey);
  keyStep.classList.toggle('active', isKey);
  $('#log-error').textContent = '';
  const usuario = $('#log-user');
  const clave = $('#log-pass');
  if (usuario) usuario.required = !isKey;
  if (clave) clave.required = isKey;
  const keyLabel = document.querySelector('label[for="log-pass"]');
  if (keyLabel) keyLabel.textContent = isKey ? `TIPO : Key para ${usuario?.value || ''}` : 'Key';
  if (keyStep && back) {
    keyStep.style.position = 'relative';
    keyStep.style.paddingTop = '46px';
    back.style.position = 'absolute';
    back.style.top = '0';
    back.style.left = '0';
    back.style.margin = '0';
    back.style.zIndex = '2';
  }
  if (opts && opts.noFocus) return;
  setTimeout(() => {
    const campo = isKey ? $('#log-pass') : $('#log-user');
    if (!campo) return;
    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement) return;
    if (!$('#screen-auth').classList.contains('active')) return;
    campo.focus({ preventScroll: true });
  }, 60);
}

function currentRegisterStep() {
  if ($('#reg-step-pass').classList.contains('active')) return 'pass';
  if ($('#reg-step-pass2').classList.contains('active')) return 'pass2';
  return 'user';
}

function setRegisterStep(step, opts) {
  $('#reg-step-user').classList.toggle('active', step === 'user');
  $('#reg-step-pass').classList.toggle('active', step === 'pass');
  $('#reg-step-pass2').classList.toggle('active', step === 'pass2');
  $('#reg-error').textContent = '';
  $('#reg-user').required = step === 'user';
  $('#reg-pass').required = step === 'pass';
  $('#reg-pass2').required = step === 'pass2';
  $('#reg-back').classList.toggle('hidden', step !== 'pass');
  $('#reg-next').classList.toggle('hidden', step === 'pass2');
  $('#reg-submit').classList.toggle('hidden', step !== 'pass2');
  if (opts && opts.noFocus) return;
  setTimeout(() => {
    const campo = step === 'user' ? $('#reg-user') : step === 'pass' ? $('#reg-pass') : $('#reg-pass2');
    if (!campo) return;
    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement) return;
    if (!$('#screen-auth').classList.contains('active')) return;
    campo.focus({ preventScroll: true });
  }, 60);
}

function setAuthMode(mode) {
  const isLogin = mode === 'login';
  $('#form-register').classList.toggle('hidden', isLogin);
  $('#form-login').classList.toggle('hidden', !isLogin);
  $('#auth-title').textContent = isLogin ? 'Iniciar sesión' : 'Crear usuario';
  $('#auth-sub').textContent = '';
  $('#auth-toggle').textContent = isLogin ? 'Crear nueva cuenta' : 'Iniciar sesión';
  $('#auth-toggle').dataset.next = isLogin ? 'register' : 'login';
  $('#auth-toggle').classList.remove('hidden');
  $('#auth-reset').classList.add('hidden');
  $('#auth-help').classList.remove('hidden');
  $('#reg-error').textContent = '';
  $('#log-error').textContent = '';
  if (isLogin) setLoginStep('user', { noFocus: true });
  else setRegisterStep('user', { noFocus: true });
  setTimeout(configurarCamposClave6, 0);
}

function abrirAyudaLogin() {
  openModal('Ayuda', `
    <button type="button" class="help-sheet-item" onclick="closeModal(); setAuthMode('login');">Iniciar sesión</button>
    <button type="button" class="help-sheet-item" onclick="closeModal(); abrirRecuperarContrasena();">Olvidé mi contraseña</button>
    <button type="button" class="help-sheet-item" onclick="closeModal(); setAuthMode('register');">Crear nueva cuenta</button>
    <button type="button" class="help-sheet-item" onclick="closeModal(); openInformacion();">Información</button>
  `);
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

function setupAuth() {
  configurarCamposClave6();
  $('#auth-toggle').addEventListener('click', () => setAuthMode($('#auth-toggle').dataset.next));
  $('#auth-reset').addEventListener('click', () => {
    localStorage.removeItem('riverospay_last_user');
    $('#form-register').reset(); $('#form-login').reset(); setAuthMode('register');
    setTimeout(() => {
      const campo = $('#reg-user');
      const active = document.activeElement;
      if (campo && (!active || active === document.body || active === document.documentElement)) campo.focus({ preventScroll: true });
    }, 50);
  });
  $('#auth-help').addEventListener('click', abrirAyudaLogin);
  $('#login-step-back').addEventListener('click', () => setLoginStep('user'));
  $('#reg-back').addEventListener('click', () => setRegisterStep(currentRegisterStep() === 'pass2' ? 'pass' : 'user'));

  $('#form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const step = currentRegisterStep(), err = $('#reg-error');
    if (step === 'user') {
      const username = $('#reg-user').value.trim().toLowerCase();
      $('#reg-user').value = username;
      if (!USERNAME_REGEX_FRONT.test(username)) { err.textContent = 'El usuario debe tener de 3 a 15 letras, sin números ni símbolos.'; return; }
      setRegisterStep('pass');
      return;
    }
    if (step === 'pass') {
      const pass = $('#reg-pass').value;
      if (!CLAVE_USUARIO_REGEX.test(pass)) { err.textContent = 'La clave debe tener exactamente 6 dígitos.'; return; }
      setRegisterStep('pass2');
      return;
    }
    const username = $('#reg-user').value.trim().toLowerCase(), pass = $('#reg-pass').value, pass2 = $('#reg-pass2').value;
    if (!CLAVE_USUARIO_REGEX.test(pass2)) { err.textContent = 'La clave debe tener exactamente 6 dígitos.'; return; }
    if (pass !== pass2) { err.textContent = 'Las claves no coinciden.'; return; }
    err.textContent = '';
    try {
      const user = await api.post('/api/auth/register', { username, password: pass });
      localStorage.setItem('riverospay_last_user', user.username);
      STATE.user = user; STATE.onboardingPending = true; setupSocket(); mostrarCodigoRecuperacion(user.recoveryCode);
    } catch (ex) { err.textContent = ex.message; }
  });

  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!$('#login-step-key').classList.contains('active')) {
      const username = $('#log-user').value.trim().toLowerCase();
      if (!username) { $('#log-user').focus({ preventScroll: true }); return; }
      $('#log-user').value = username;
      setLoginStep('key');
      return;
    }
    const username = $('#log-user').value.trim().toLowerCase(), pass = $('#log-pass').value, err = $('#log-error');
    if (!CLAVE_USUARIO_REGEX.test(pass) && !CLAVE_ADMIN_REGEX.test(pass)) {
      err.textContent = 'La clave debe tener 6 dígitos.';
      return;
    }
    try {
      const auth = await api.post('/api/auth/login', { username, password: pass });
      if (auth?.tipo === 'admin') {
        localStorage.removeItem('riverospay_last_user');
        await cargarModuloAdmin();
        enterAdmin();
        return;
      }
      localStorage.setItem('riverospay_last_user', auth.username);
      afterAuth(auth);
    } catch (ex) { err.textContent = ex.message; }
  });
}

function afterAuth(user) { STATE.user = user; STATE.onboardingPending = false; setupSocket(); proceedAfterLogin(); }
function proceedAfterLogin() {
  if (STATE.onboardingPending) { STATE.onboardingPending = false; mostrarEresEstudiante(); return; }
  enterApp();
}

function mostrarCodigoRecuperacion(code) {
  $('#recovery-content').innerHTML = `<h1>Guarda tu código de recuperación</h1><p class="muted" style="margin:0 0 18px;">Es la única forma de recuperar tu cuenta si olvidas la clave. No lo vamos a volver a mostrar.</p><div class="share-code">${code}</div><button class="btn-secondary" style="margin-top:14px;" onclick="copiarTexto('${code}')">Copiar código</button><label class="check-row" style="margin-top:18px;"><input type="checkbox" id="recovery-check">Ya guardé mi código de recuperación en un lugar seguro.</label><button class="btn-primary" id="recovery-continuar" disabled style="margin-top:14px;">Continuar</button>`;
  $('#recovery-check').addEventListener('change', (e) => { $('#recovery-continuar').disabled = !e.target.checked; });
  $('#recovery-continuar').addEventListener('click', proceedAfterLogin); showScreen('screen-recovery');
}

function copiarTexto(texto) {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(() => toast('Copiado')).catch(() => toast('Copia manualmente: ' + texto));
  else toast('Copia manualmente: ' + texto);
}

function abrirRecuperarContrasena() {
  openModal('Recuperar contraseña', `<label>Usuario<input id="f-rec-user" type="text" autocomplete="username"></label><label>Código de recuperación<input id="f-rec-code" type="text" placeholder="XXXX-XXXX-XXXX"></label><label>Nueva clave<input id="f-rec-pass" type="password" placeholder="6 dígitos" inputmode="numeric" minlength="6" maxlength="6" pattern="[0-9]{6}"></label><p class="field-error" id="f-rec-error"></p><button class="btn-primary" onclick="enviarRecuperacion()">Restablecer clave</button>`);
  configurarCamposClave6();
}

async function enviarRecuperacion() {
  const username = $('#f-rec-user').value.trim().toLowerCase(), recoveryCode = $('#f-rec-code').value.trim(), newPassword = $('#f-rec-pass').value, err = $('#f-rec-error');
  if (!USERNAME_REGEX_FRONT.test(username)) { err.textContent = 'El usuario debe tener de 3 a 15 letras.'; return; }
  if (!CLAVE_USUARIO_REGEX.test(newPassword)) { err.textContent = 'La nueva clave debe tener exactamente 6 dígitos.'; return; }
  try {
    await api.post('/api/auth/recuperar', { username, recoveryCode, newPassword });
    closeModal(); toast('Clave actualizada. Ya puedes iniciar sesión.'); setAuthMode('login'); $('#log-user').value = username; setLoginStep('key');
  } catch (ex) { err.textContent = ex.message; }
}
