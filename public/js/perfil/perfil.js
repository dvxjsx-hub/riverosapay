/* ============================================================
   Riverospay · PERFIL Y ONBOARDING: nombre, modo, estudiante, notificaciones, eliminar cuenta
   ============================================================ */

function mostrarConfigurarNombre() {
  renderNombreEleccion();
  showScreen('screen-nombre');
}

function renderNombreEleccion() {
  $('#nombre-content').innerHTML = `
    <h1>¿Quieres configurar tu nombre?</h1>
    <p class="muted" style="margin:0 0 18px;">Se mostrará arriba del menú en vez de tu usuario.</p>
    <div class="choice-row">
      <button class="btn-secondary" id="nombre-omitir">Omitir</button>
      <button class="btn-primary" id="nombre-si">Sí</button>
    </div>
  `;
  $('#nombre-omitir').addEventListener('click', () => mostrarRecibirNotificaciones());
  $('#nombre-si').addEventListener('click', () => renderNombreFormulario());
}

function renderNombreFormulario(modo) {
  const esPerfil = modo === 'perfil';
  const html = `
    <h1>Ingresa tu nombre y apellido</h1>
    <p class="muted" style="margin:0 0 18px;">Un nombre y un apellido separados por un solo espacio. Ej: Carlos Rivero</p>
    <label>Nombre y apellido<input id="f-nombre-completo" type="text" placeholder="Carlos Rivero"></label>
    <p class="field-error" id="f-nombre-error"></p>
    <button class="btn-primary" id="nombre-guardar">Guardar</button>
    ${esPerfil ? '' : '<button class="link-btn" id="nombre-omitir-2">Omitir</button>'}
  `;
  if (esPerfil) { $('#modal-title').textContent = 'Configurar nombre'; $('#modal-body').innerHTML = html; }
  else { $('#nombre-content').innerHTML = html; }

  $('#nombre-guardar').addEventListener('click', () => guardarNombre(esPerfil));
  const omitirBtn = $('#nombre-omitir-2');
  if (omitirBtn) omitirBtn.addEventListener('click', () => mostrarRecibirNotificaciones());
}

async function guardarNombre(esPerfil) {
  const valor = $('#f-nombre-completo').value.trim();
  const err = $('#f-nombre-error');
  try {
    const user = await api.post('/api/auth/nombre', { userId: STATE.user.id, nombreCompleto: valor });
    STATE.user = user;
    if (esPerfil) {
      closeModal();
      actualizarHeaderUsuario();
      toast('Nombre guardado');
    } else {
      mostrarRecibirNotificaciones();
    }
  } catch (ex) { err.textContent = ex.message; }
}

function nombreMostrado() {
  return (STATE.user.nombreCompleto || STATE.user.username).toUpperCase();
}
function actualizarHeaderUsuario() {
  $('#app-username').textContent = nombreMostrado();
}

function openPerfil() {
  const modo = modoActualUsuario();
  const modoTexto = modo === 'jefe' ? 'MODO JEFE' : 'MODO EMPLEADO';
  const siguienteModo = modo === 'jefe' ? 'empleado' : 'jefe';
  const siguienteTexto = siguienteModo === 'jefe' ? 'Cambiar a modo jefe' : 'Cambiar a modo empleado';

  openModal('Tu perfil', `
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;">
      <div class="empty-icon" style="width:76px;height:76px;">
        <svg viewBox="0 0 24 24" fill="currentColor" style="width:40px;height:40px;"><circle cx="12" cy="8.2" r="4"/><path d="M4 20c0-4.4 4-6.6 8-6.6s8 2.2 8 6.6"/></svg>
      </div>
      <h2 style="margin:6px 0 0;font-size:19px;">${escapeHtml(nombreMostrado())}</h2>
      <span class="chip">${modoTexto}</span>
    </div>
    <div class="detail-row"><span>ID</span><span>${escapeHtml(STATE.user.username)}</span></div>
    ${!STATE.user.nombreCompleto ? `<button class="btn-secondary" onclick="renderNombreFormulario('perfil')">Configurar nombre</button>` : ''}
    <button class="btn-secondary" style="width:100%;margin-top:10px;" onclick="cambiarModoCuenta('${siguienteModo}')">${siguienteTexto}</button>
    <button class="btn-ghost-danger" style="width:100%;margin-top:10px;" onclick="pedirConfirmacionEliminarCuenta()">Eliminar cuenta</button>
  `);
}

async function cambiarModoCuenta(modo) {
  try {
    const user = await api.post('/api/auth/cambiar-modo', { userId: STATE.user.id, modo });
    STATE.user = user;
    closeModal();

    // Cambiar de modo también cambia la sala Socket.IO. Reconectamos para no
    // conservar la sala del modo anterior.
    if (STATE.socket) {
      STATE.socket.disconnect();
      STATE.socket = null;
    }
    setupSocket();
    enterApp();
    toast(modo === 'jefe' ? 'Ahora estás en modo jefe' : 'Ahora estás en modo empleado');
  } catch (ex) {
    toast(ex.message || 'No se pudo cambiar el modo.');
  }
}

function pedirConfirmacionEliminarCuenta() {
  $('#modal-title').textContent = 'Eliminar cuenta';
  $('#modal-body').innerHTML = `
    <div class="notice-box">
      <b>¿Estás seguro?</b> Esta acción no se puede deshacer. Se borra tu cuenta y todo lo que hayas guardado (trabajo, estudio, eventos, verificaciones).
    </div>
    <label>Confirma tu contraseña<input id="f-del-pass" type="password" autocomplete="current-password"></label>
    <p class="field-error" id="f-del-error"></p>
    <div class="notif-actions">
      <button class="btn-secondary" onclick="openPerfil()">Cancelar</button>
      <button class="btn-ghost-danger" onclick="confirmarEliminarCuenta()">Sí, eliminar mi cuenta</button>
    </div>
  `;
}

async function confirmarEliminarCuenta() {
  const password = $('#f-del-pass').value;
  const err = $('#f-del-error');
  try {
    await api.post('/api/auth/eliminar-cuenta', { userId: STATE.user.id, password });
    localStorage.removeItem('riverospay_last_user');
    toast('Cuenta eliminada');
    setTimeout(() => location.reload(), 600);
  } catch (ex) { err.textContent = ex.message; }
}

function openInformacion() {
  openModal('Información', `
    <div style="text-align:center;display:flex;flex-direction:column;gap:6px;padding:8px 0;">
      <img src="img/icon-192.png" alt="" style="width:64px;height:64px;border-radius:16px;margin:0 auto 10px;">
      <p style="margin:0;font-weight:700;color:var(--green-900);">Desarrollado por riverojsx</p>
      <p class="muted" style="margin:0;">Versión 1.0 BETA</p>
    </div>
  `);
}

// Se conserva para compatibilidad con el HTML de la versión anterior, pero ya
// no se ejecuta durante el alta: las cuentas nuevas no eligen un rol.
function setupRoleCards() {
  $all('.role-card').forEach(card => {
    card.addEventListener('click', async () => {
      try {
        const user = await api.post('/api/auth/role', { userId: STATE.user.id, role: card.dataset.role });
        STATE.user = user;
        registerSocketRoom();
        if (user.role === 'empleado') mostrarEresEstudiante();
        else mostrarConfigurarNombre();
      } catch (ex) { $('#role-error').textContent = ex.message; }
    });
  });
}

function mostrarEresEstudiante() {
  $('#nombre-content').innerHTML = `
    <h1>¿Eres estudiante?</h1>
    <p class="muted" style="margin:0 0 18px;">Así sabemos si mostrarte la pestaña de Estudio.</p>
    <div class="choice-row">
      <button class="btn-secondary" id="estudiante-omitir">Omitir</button>
      <button class="btn-primary" id="estudiante-si">Sí</button>
    </div>
  `;
  showScreen('screen-nombre');
  $('#estudiante-omitir').addEventListener('click', () => guardarEsEstudiante(false));
  $('#estudiante-si').addEventListener('click', () => guardarEsEstudiante(true));
}

async function guardarEsEstudiante(valor) {
  try {
    const user = await api.post('/api/auth/preferencias', { userId: STATE.user.id, esEstudiante: valor });
    STATE.user = user;
  } catch (ex) { /* si falla igual seguimos, no bloquea el alta */ }
  mostrarConfigurarNombre();
}

function mostrarRecibirNotificaciones() {
  $('#nombre-content').innerHTML = `
    <h1>¿Quieres recibir notificaciones?</h1>
    <p class="muted" style="margin:0 0 18px;">Avisos cuando tu jefe verifique, añada o pague un trabajo.</p>
    <div class="choice-row">
      <button class="btn-secondary" id="notif-no">No</button>
      <button class="btn-primary" id="notif-si">Sí</button>
    </div>
  `;
  showScreen('screen-nombre');
  $('#notif-no').addEventListener('click', () => guardarNotificaciones(false));
  $('#notif-si').addEventListener('click', () => guardarNotificaciones(true));
}

async function guardarNotificaciones(valor) {
  try {
    const user = await api.post('/api/auth/preferencias', { userId: STATE.user.id, recibirNotificaciones: valor });
    STATE.user = user;
  } catch (ex) { /* si falla igual seguimos, no bloquea el alta */ }
  enterApp();
}
