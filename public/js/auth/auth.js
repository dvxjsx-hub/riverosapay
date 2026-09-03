/* ============================================================
   Riverosapay · AUTENTICACION: splash, login/registro, recuperar contraseña
   ============================================================ */

const CLAVE_USUARIO_REGEX = /^\d{6}$/;

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

  // El login es compartido con Admin: NO poner maxlength aquí.
  const login = $('#log-pass');
  if (login) {
    login.inputMode = 'numeric';
    login.pattern = '[0-9]+';
    login.removeAttribute('maxlength');
    login.removeAttribute('minlength');
    login.placeholder = '6 dígitos';
    instalarVisorClave6(login);
  }
}

function initSplash() { setTimeout(goToAuth, 2200); }

function goToAuth() {
  showScreen('screen-auth');
  const lastUser = localStorage.getItem('riverospay_last_user');
  if (lastUser) { setAuthMode('login'); $('#log-user').value = lastUser; }
  else setAuthMode('register');
  configurarCamposClave6();

  // No robar el foco al usuario durante la transición a login/registro.
  setTimeout(() => {
    const campo = lastUser ? $('#log-user') : $('#reg-user');
    if (!campo) return;
    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement) return;
    if (!$('#screen-auth').classList.contains('active')) return;
    campo.focus({ preventScroll: true });
  }, 80);
}

function setAuthMode(mode) {
  const isLogin = mode === 'login';
  $('#form-register').classList.toggle('hidden', isLogin);
  $('#form-login').classList.toggle('hidden', !isLogin);
  $('#auth-title').textContent = isLogin ? 'Iniciar sesión' : 'Crear usuario';
  $('#auth-sub').textContent = isLogin ? 'Ingresa tus datos guardados en el servidor' : 'Configura tu acceso al organizador';
  $('#auth-toggle').textContent = isLogin ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Iniciar sesión';
  $('#auth-toggle').dataset.next = isLogin ? 'register' : 'login';
  $('#reg-error').textContent = '';
  $('#log-error').textContent = '';
  setTimeout(configurarCamposClave6, 0);
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
  $('#auth-olvide').addEventListener('click', (e) => { e.preventDefault(); abrirRecuperarContrasena(); });

  $('#form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#reg-user').value.trim(), pass = $('#reg-pass').value, pass2 = $('#reg-pass2').value, err = $('#reg-error');
    if (!/^[a-z]{5,10}$/.test(username)) { err.textContent = 'El usuario debe tener de 5 a 10 letras minúsculas, sin números ni símbolos.'; return; }
    if (!CLAVE_USUARIO_REGEX.test(pass)) { err.textContent = 'La clave debe tener exactamente 6 dígitos.'; return; }
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
    const username = $('#log-user').value.trim(), pass = $('#log-pass').value, err = $('#log-error');
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
  const username = $('#f-rec-user').value.trim(), recoveryCode = $('#f-rec-code').value.trim(), newPassword = $('#f-rec-pass').value, err = $('#f-rec-error');
  if (!CLAVE_USUARIO_REGEX.test(newPassword)) { err.textContent = 'La nueva clave debe tener exactamente 6 dígitos.'; return; }
  try {
    await api.post('/api/auth/recuperar', { username, recoveryCode, newPassword });
    closeModal(); toast('Clave actualizada. Ya puedes iniciar sesión.'); setAuthMode('login'); $('#log-user').value = username;
  } catch (ex) { err.textContent = ex.message; }
}
