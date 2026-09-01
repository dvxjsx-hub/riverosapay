/* ============================================================
   Riverospay · AUTENTICACION: splash, login/registro, recuperar contraseña
   ============================================================ */

function initSplash() { setTimeout(goToAuth, 2200); }

function goToAuth() {
  showScreen('screen-auth');
  const lastUser = localStorage.getItem('riverospay_last_user');
  if (lastUser) {
    setAuthMode('login');
    $('#log-user').value = lastUser;
  } else {
    setAuthMode('register');
  }
  setTimeout(() => {
    const campo = lastUser ? $('#log-user') : $('#reg-user');
    campo?.focus({ preventScroll: true });
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
}

function setupAuth() {
  $('#auth-toggle').addEventListener('click', () => setAuthMode($('#auth-toggle').dataset.next));

  $('#auth-reset').addEventListener('click', () => {
    localStorage.removeItem('riverospay_last_user');
    $('#form-register').reset();
    $('#form-login').reset();
    setAuthMode('register');
    setTimeout(() => $('#reg-user')?.focus({ preventScroll: true }), 50);
  });

  $('#auth-olvide').addEventListener('click', (e) => {
    e.preventDefault();
    abrirRecuperarContrasena();
  });

  $('#form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#reg-user').value.trim();
    const pass = $('#reg-pass').value;
    const pass2 = $('#reg-pass2').value;
    const err = $('#reg-error');
    if (!/^[a-z]{5,10}$/.test(username)) {
      err.textContent = 'El usuario debe tener de 5 a 10 letras minúsculas, sin números ni símbolos.';
      return;
    }
    if (!/^[A-Za-z0-9]{6,12}$/.test(pass)) {
      err.textContent = 'La contraseña debe tener de 6 a 12 caracteres (letras y números).';
      return;
    }
    if (pass !== pass2) { err.textContent = 'Las contraseñas no coinciden.'; return; }
    err.textContent = '';
    try {
      const user = await api.post('/api/auth/register', { username, password: pass });
      localStorage.setItem('riverospay_last_user', user.username);
      STATE.user = user;
      STATE.onboardingPending = true;
      setupSocket();
      mostrarCodigoRecuperacion(user.recoveryCode);
    } catch (ex) { err.textContent = ex.message; }
  });

  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('#log-user').value.trim();
    const pass = $('#log-pass').value;
    const err = $('#log-error');
    try {
      const auth = await api.post('/api/auth/login', { username, password: pass });
      if (auth?.tipo === 'admin') {
        localStorage.removeItem('riverospay_last_user');
        if (typeof enterAdmin === 'function') enterAdmin();
        else err.textContent = 'No se pudo cargar el panel de administración.';
        return;
      }
      localStorage.setItem('riverospay_last_user', auth.username);
      afterAuth(auth);
    } catch (ex) { err.textContent = ex.message; }
  });
}

function afterAuth(user) {
  STATE.user = user;
  STATE.onboardingPending = false;
  setupSocket();
  proceedAfterLogin();
}

function proceedAfterLogin() {
  if (STATE.onboardingPending) {
    STATE.onboardingPending = false;
    mostrarEresEstudiante();
    return;
  }
  enterApp();
}

function mostrarCodigoRecuperacion(code) {
  $('#recovery-content').innerHTML = `
    <h1>Guarda tu código de recuperación</h1>
    <p class="muted" style="margin:0 0 18px;">Es la única forma de recuperar tu cuenta si olvidas la contraseña. No lo vamos a volver a mostrar.</p>
    <div class="share-code">${code}</div>
    <button class="btn-secondary" style="margin-top:14px;" onclick="copiarTexto('${code}')">Copiar código</button>
    <label class="check-row" style="margin-top:18px;">
      <input type="checkbox" id="recovery-check">
      Ya guardé mi código de recuperación en un lugar seguro.
    </label>
    <button class="btn-primary" id="recovery-continuar" disabled style="margin-top:14px;">Continuar</button>
  `;
  $('#recovery-check').addEventListener('change', (e) => {
    $('#recovery-continuar').disabled = !e.target.checked;
  });
  $('#recovery-continuar').addEventListener('click', proceedAfterLogin);
  showScreen('screen-recovery');
}

function copiarTexto(texto) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(() => toast('Copiado')).catch(() => toast('Copia manualmente: ' + texto));
  } else {
    toast('Copia manualmente: ' + texto);
  }
}

function abrirRecuperarContrasena() {
  openModal('Recuperar contraseña', `
    <label>Usuario<input id="f-rec-user" type="text" autocomplete="username"></label>
    <label>Código de recuperación<input id="f-rec-code" type="text" placeholder="XXXX-XXXX-XXXX"></label>
    <label>Nueva contraseña<input id="f-rec-pass" type="password" placeholder="6 a 12 caracteres" minlength="6" maxlength="12"></label>
    <p class="field-error" id="f-rec-error"></p>
    <button class="btn-primary" onclick="enviarRecuperacion()">Restablecer contraseña</button>
  `);
}

async function enviarRecuperacion() {
  const username = $('#f-rec-user').value.trim();
  const recoveryCode = $('#f-rec-code').value.trim();
  const newPassword = $('#f-rec-pass').value;
  const err = $('#f-rec-error');
  if (!/^[A-Za-z0-9]{6,12}$/.test(newPassword)) {
    err.textContent = 'La nueva contraseña debe tener de 6 a 12 caracteres (letras y números).';
    return;
  }
  try {
    await api.post('/api/auth/recuperar', { username, recoveryCode, newPassword });
    closeModal();
    toast('Contraseña actualizada. Ya puedes iniciar sesión.');
    setAuthMode('login');
    $('#log-user').value = username;
  } catch (ex) { err.textContent = ex.message; }
}
