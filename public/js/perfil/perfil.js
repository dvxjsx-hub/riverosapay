/* ============================================================
   Riverospay · PERFIL Y CONFIGURACIÓN: nombre, modo, estudiante,
   recuperación y gestión de cuenta
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
  const modoTexto = modo === 'jefe' ? 'MODO BOSS' : 'MODO EMPLEADO';

  openModal('Tu perfil', `
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;">
      <div class="empty-icon" style="width:76px;height:76px;">
        <svg viewBox="0 0 24 24" fill="currentColor" style="width:40px;height:40px;"><circle cx="12" cy="8.2" r="4"/><path d="M4 20c0-4.4 3.6-6.6 8-6.6s8 2.2 8 6.6"/></svg>
      </div>
      <h2 style="margin:6px 0 0;font-size:19px;">${escapeHtml(nombreMostrado())}</h2>
      <button type="button" class="chip" style="border:0;cursor:pointer;font:inherit;" onclick="abrirSelectorModo()">${modoTexto}</button>
    </div>
    <div class="detail-row"><span>ID</span><span>${escapeHtml(STATE.user.username)}</span></div>
    <button class="btn-secondary" style="width:100%;margin-top:10px;" onclick="openConfiguracion()">Configuración</button>
  `);
}

function abrirSelectorModo() {
  const modoActual = modoActualUsuario();
  const siguienteModo = modoActual === 'jefe' ? 'empleado' : 'jefe';
  const siguienteTexto = siguienteModo === 'jefe' ? 'Modo BOSS' : 'Modo empleado';

  openModal('¿Quieres cambiar modo?', `
    <p class="muted" style="text-align:center;margin:0 0 18px;">Modo actual: <b>${modoActual === 'jefe' ? 'MODO BOSS' : 'MODO EMPLEADO'}</b></p>
    <button class="btn-primary" style="width:100%;" onclick="cambiarModoCuenta('${siguienteModo}')">${siguienteTexto}</button>
    <button class="link-btn" style="width:100%;margin-top:8px;" onclick="openPerfil()">Cancelar</button>
  `);
}

async function cambiarModoCuenta(modo) {
  try {
    const user = await api.post('/api/auth/cambiar-modo', { userId: STATE.user.id, modo });
    STATE.user = user;
    closeModal();
    if (STATE.socket) {
      STATE.socket.disconnect();
      STATE.socket = null;
    }
    setupSocket();
    enterApp();
    toast(modo === 'jefe' ? 'Ahora estás en MODO BOSS' : 'Ahora estás en MODO EMPLEADO');
  } catch (ex) {
    toast(ex.message || 'No se pudo cambiar el modo.');
  }
}

function openConfiguracion() {
  const esEmpleado = modoActualUsuario() === 'empleado';
  const estudianteTexto = STATE.user.esEstudiante === true ? 'Estudio activado' : 'Estudio desactivado';
  const nombre = STATE.user.nombreCompleto || 'No configurado';

  openModal('Configuración', `
    <div style="display:grid;gap:10px;">
      <div class="detail-row"><span>Usuario</span><span>${escapeHtml(STATE.user.username)}</span></div>
      <div class="detail-row"><span>Nombre</span><span>${escapeHtml(nombre)}</span></div>
      <button class="btn-secondary" style="width:100%;" onclick="renderNombreFormulario('perfil')">${STATE.user.nombreCompleto ? 'Cambiar nombre' : 'Configurar nombre'}</button>

      ${esEmpleado ? `
        <button class="btn-secondary" style="width:100%;" onclick="abrirSesionAcademica()">${estudianteTexto}</button>
      ` : `
        <div class="notice-box" style="margin:0;">La <b>Sesión académica</b> se configura desde MODO EMPLEADO.</div>
      `}

      <button class="btn-secondary" style="width:100%;" onclick="abrirCambiarClave()">Cambiar clave</button>
      <button class="btn-secondary" style="width:100%;" onclick="abrirCodigoRecuperacion()">Código de recuperación</button>
      <button class="btn-secondary" style="width:100%;" onclick="openInformacion()">Información de Riverosapay</button>
      <button class="btn-ghost-danger" style="width:100%;margin-top:4px;" onclick="pedirConfirmacionEliminarCuenta()">Eliminar cuenta</button>
    </div>
  `);
}

function abrirSesionAcademica() {
  const activo = STATE.user.esEstudiante === true;
  openModal('Sesión académica', `
    <p class="muted" style="margin:0 0 18px;text-align:center;">${activo ? 'Estudio está activo.' : 'Estudio está desactivado.'}</p>
    <button class="btn-primary" style="width:100%;" onclick="guardarPreferenciaEstudiante(${!activo})">${activo ? 'Desactivar Estudio' : 'Activar Estudio'}</button>
    <button class="link-btn" style="width:100%;margin-top:8px;" onclick="openConfiguracion()">Cancelar</button>
  `);
}

async function guardarPreferenciaEstudiante(valor) {
  try {
    const user = await api.post('/api/auth/preferencias', { userId: STATE.user.id, esEstudiante: valor });
    STATE.user = user;
    closeModal();
    enterApp();
    toast(valor ? 'Sesión académica activada' : 'Sesión académica desactivada');
  } catch (ex) { toast(ex.message || 'No se pudo actualizar la sesión académica.'); }
}

function abrirCambiarClave() {
  openModal('Cambiar clave', `
    <p class="muted" style="margin:0 0 16px;">Tu clave normal debe tener exactamente 6 dígitos.</p>
    <label>Clave actual<input id="f-clave-actual" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="current-password"></label>
    <label>Nueva clave<input id="f-clave-nueva" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password"></label>
    <label>Confirmar nueva clave<input id="f-clave-nueva2" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="new-password"></label>
    <p class="field-error" id="f-clave-error"></p>
    <button class="btn-primary" style="width:100%;" onclick="guardarCambioClave()">Cambiar clave</button>
  `);
}

async function guardarCambioClave() {
  const actual = $('#f-clave-actual').value;
  const nueva = $('#f-clave-nueva').value;
  const nueva2 = $('#f-clave-nueva2').value;
  const err = $('#f-clave-error');
  if (!/^\d{6}$/.test(actual) || !/^\d{6}$/.test(nueva)) { err.textContent = 'Las claves deben tener exactamente 6 dígitos.'; return; }
  if (nueva !== nueva2) { err.textContent = 'Las nuevas claves no coinciden.'; return; }
  try {
    const user = await api.post('/api/auth/cambiar-clave', { userId: STATE.user.id, passwordActual: actual, nuevaClave: nueva });
    STATE.user = user;
    closeModal();
    mostrarCodigoRecuperacion(user.recoveryCode, true);
  } catch (ex) { err.textContent = ex.message; }
}

async function abrirCodigoRecuperacion() {
  openModal('Código de recuperación', `
    <p class="muted" style="margin:0 0 16px;">Por seguridad, confirma tu usuario y tu clave. Se generará un código nuevo y el anterior quedará invalidado.</p>
    <label>Usuario<input id="f-rec-view-user" type="text" autocomplete="username" value="${escapeHtml(STATE.user.username)}"></label>
    <label>Clave actual<input id="f-rec-view-pass" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="current-password"></label>
    <p class="field-error" id="f-rec-view-error"></p>
    <button class="btn-primary" style="width:100%;" onclick="mostrarNuevoCodigoRecuperacion()">Mostrar código</button>
  `);
}

async function mostrarNuevoCodigoRecuperacion() {
  const username = $('#f-rec-view-user').value.trim();
  const password = $('#f-rec-view-pass').value;
  const err = $('#f-rec-view-error');
  try {
    const result = await api.post('/api/auth/codigo-recuperacion', { userId: STATE.user.id, username, password });
    mostrarCodigoRecuperacion(result.recoveryCode, true);
  } catch (ex) { err.textContent = ex.message; }
}

function mostrarCodigoRecuperacion(code, desdeConfiguracion = false) {
  $('#recovery-content').innerHTML = `<h1>Guarda tu código de recuperación</h1><p class="muted" style="margin:0 0 18px;">${desdeConfiguracion ? 'Este es tu nuevo código. El código anterior ya no es válido.' : 'Es la única forma de recuperar tu cuenta si olvidas la clave. No lo vamos a volver a mostrar.'}</p><div class="share-code">${escapeHtml(code)}</div><button class="btn-secondary" style="margin-top:14px;" onclick="copiarTexto('${String(code).replace(/'/g, "\\'")}')">Copiar código</button><label class="check-row" style="margin-top:18px;"><input type="checkbox" id="recovery-check">Ya guardé mi código de recuperación en un lugar seguro.</label><button class="btn-primary" id="recovery-continuar" disabled style="margin-top:14px;">Continuar</button>`;
  $('#recovery-check').addEventListener('change', (e) => { $('#recovery-continuar').disabled = !e.target.checked; });
  $('#recovery-continuar').addEventListener('click', () => { if (desdeConfiguracion) { showScreen('screen-app'); openConfiguracion(); } else proceedAfterLogin(); });
  showScreen('screen-recovery');
}

function copiarTexto(texto) {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(() => toast('Copiado')).catch(() => toast('Copia manualmente: ' + texto));
  else toast('Copia manualmente: ' + texto);
}

function pedirConfirmacionEliminarCuenta() {
  $('#modal-title').textContent = 'Eliminar cuenta';
  $('#modal-body').innerHTML = `
    <div class="notice-box">
      <b>¿Estás seguro?</b> Esta acción no se puede deshacer. Se borra tu cuenta y todo lo que hayas guardado (trabajo, estudio, eventos, verificaciones).
    </div>
    <label>Confirma tu clave<input id="f-del-pass" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password"></label>
    <p class="field-error" id="f-del-error"></p>
    <div class="notif-actions">
      <button class="btn-secondary" onclick="openConfiguracion()">Cancelar</button>
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
  openModal('Información de Riverosapay', `
    <div style="text-align:center;display:flex;flex-direction:column;gap:7px;padding:8px 0;">
      <img src="img/icon-192.png" alt="" style="width:64px;height:64px;border-radius:16px;margin:0 auto 10px;">
      <p style="margin:0;font-weight:700;color:var(--green-900);">Riverosapay</p>
      <p class="muted" style="margin:0;">prototipo desarrollado por riverojsx, organizador, versión beta</p>
    </div>
  `);
}

function instalarMenuConfiguracion() {
  const drawer = $('#drawer');
  if (!drawer || $('#drawer-configuracion')) return;
  const item = document.createElement('button');
  item.className = 'drawer-item';
  item.id = 'drawer-configuracion';
  item.innerHTML = `${ICONS.historial} Configuración`;
  const referencia = $('#drawer-informacion') || $('#drawer-logout');
  drawer.insertBefore(item, referencia);
  item.addEventListener('click', () => { closeDrawer(); openConfiguracion(); });
  if ($('#drawer-informacion')) $('#drawer-informacion').classList.add('hidden');
}

// La configuración pertenece al menú, no al avatar. Se instala cuando todos los módulos
// ya están presentes sin modificar el flujo de inicio de sesión.
setTimeout(instalarMenuConfiguracion, 0);

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
