/* ============================================================
   Riverospay · Organizador (actualización — NO es versión final)
   Frontend vanilla JS. Toda la info vive en el servidor.
   ============================================================ */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $all = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ICONS = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/></svg>',
  trabajo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  estudio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5z"/></svg>',
  historial: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12.5l2 2 4-4.5"/><circle cx="12" cy="12" r="9"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></svg>'
};

const STATE = {
  user: null,
  socket: null,
  viewMode: 'empleado',   // 'empleado' | 'jefe-historial' | 'jefe-ver'
  activeTab: null,
  trabajo: { lugares: [], turnos: [] },
  estudio: [],
  actividades: [],
  eventos: [],
  historial: [],
  notificaciones: [],
  jefeView: null,          // { empleadoId, empleadoUsername, activeSubTab, lugares, turnos, materias, actividades, eventos }
  pendingRequest: null
};

/* ---------- helpers ---------- */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
function diaOptions() {
  return DIAS.map(d => `<option value="${d}">${d}</option>`).join('');
}
function formatFecha(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' +
         d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
function emptyCardHTML(tag, message, iconKey = 'home') {
  return `<div class="empty-card">
    <div class="empty-icon">${ICONS[iconKey] || ICONS.home}</div>
    <span class="empty-tag">${tag}</span>
    <h2>VACÍO</h2>
    <p class="muted">${message}</p>
  </div>`;
}
function targetEmpleadoId() {
  return STATE.viewMode === 'jefe-ver' ? STATE.jefeView.empleadoId : STATE.user.id;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

const api = {
  async _handle(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Error de red.');
    return data;
  },
  get(url) { return fetch(url).then(this._handle); },
  post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(this._handle);
  },
  patch(url, body) {
    return fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(this._handle);
  },
  delete(url, body) {
    return fetch(url, {
      method: 'DELETE',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    }).then(this._handle);
  }
};

/* ---------- navegación entre pantallas ---------- */
function showScreen(id) {
  $all('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
}

/* ---------- MODAL genérico ---------- */
function openModal(title, bodyHtml) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  $('#modal-overlay').classList.add('open');
  $('#modal').classList.add('open');
}
function closeModal() {
  $('#modal-overlay').classList.remove('open');
  $('#modal').classList.remove('open');
}

/* ---------- DRAWER ---------- */
function openDrawer() { $('#drawer').classList.add('open'); $('#drawer-overlay').classList.add('open'); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer-overlay').classList.remove('open'); }

function configurarMenuPorRol() {
  if (STATE.user.role === 'empleado') {
    $('#drawer-compartir').classList.remove('hidden');
    $('#drawer-notificaciones').classList.remove('hidden');
    $('#drawer-verificar').classList.add('hidden');
    $('#tabbar').classList.remove('hidden');
  } else if (STATE.user.role === 'jefe') {
    $('#drawer-verificar').classList.remove('hidden');
    $('#drawer-compartir').classList.add('hidden');
    $('#drawer-notificaciones').classList.add('hidden');
    $('#tabbar').classList.add('hidden');
  }
}

/* ---------- SPLASH ---------- */
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
}

/* ---------- AUTH ---------- */
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
      const user = await api.post('/api/auth/login', { username, password: pass });
      localStorage.setItem('riverospay_last_user', user.username);
      afterAuth(user);
    } catch (ex) { err.textContent = ex.message; }
  });
}

function afterAuth(user) {
  STATE.user = user;
  setupSocket();
  proceedAfterLogin();
}

function proceedAfterLogin() {
  if (!STATE.user.role) {
    $('#role-error').textContent = '';
    showScreen('screen-role');
  } else {
    enterApp();
  }
}

/* ---------- CÓDIGO DE RECUPERACIÓN (una sola vez, tras crear la cuenta) ---------- */
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

/* ---------- RECUPERAR CONTRASEÑA ---------- */
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

/* ---------- CONFIGURAR NOMBRE (parte del alta, y editable luego desde el perfil) ---------- */
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

/* ---------- PERFIL DE USUARIO (tocando el avatar) ---------- */
function openPerfil() {
  const rolTexto = STATE.user.role === 'jefe' ? 'JEFE' : 'EMPLEADO';
  openModal('Tu perfil', `
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;">
      <div class="empty-icon" style="width:76px;height:76px;">
        <svg viewBox="0 0 24 24" fill="currentColor" style="width:40px;height:40px;"><circle cx="12" cy="8.2" r="4"/><path d="M4 20c0-4.4 4-6.6 8-6.6s8 2.2 8 6.6"/></svg>
      </div>
      <h2 style="margin:6px 0 0;font-size:19px;">${escapeHtml(nombreMostrado())}</h2>
      <span class="chip">${rolTexto}</span>
    </div>
    <div class="detail-row"><span>ID</span><span>${escapeHtml(STATE.user.username)}</span></div>
    ${!STATE.user.nombreCompleto ? `<button class="btn-secondary" onclick="renderNombreFormulario('perfil')">Configurar nombre</button>` : ''}
    <button class="btn-ghost-danger" style="width:100%;margin-top:10px;" onclick="pedirConfirmacionEliminarCuenta()">Eliminar cuenta</button>
  `);
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

/* ---------- INFORMACIÓN ---------- */
function openInformacion() {
  openModal('Información', `
    <div style="text-align:center;display:flex;flex-direction:column;gap:6px;padding:8px 0;">
      <img src="img/icon-192.png" alt="" style="width:64px;height:64px;border-radius:16px;margin:0 auto 10px;">
      <p style="margin:0;font-weight:700;color:var(--green-900);">Desarrollado por riverojsx</p>
      <p class="muted" style="margin:0;">Versión 1.0 BETA</p>
    </div>
  `);
}

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

/* ---------- ¿ERES ESTUDIANTE? (solo EMPLEADO, antes de configurar nombre) ---------- */
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

/* ---------- ¿RECIBIR NOTIFICACIONES? (último paso del asistente) ---------- */
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

/* ---------- SOCKET.IO ---------- */
function setupSocket() {
  if (STATE.socket) return;
  STATE.socket = io();
  STATE.socket.on('connect', registerSocketRoom);

  STATE.socket.on('trabajo:update', (data) => {
    if (STATE.user.role === 'empleado') {
      STATE.trabajo = data;
      if (STATE.activeTab === 'trabajo') renderTrabajo();
    } else if (STATE.viewMode === 'jefe-ver' && STATE.jefeView) {
      STATE.jefeView.lugares = data.lugares;
      STATE.jefeView.turnos = data.turnos;
      renderJefeView();
    }
  });

  STATE.socket.on('estudio:update', (data) => {
    if (STATE.user.role === 'empleado') {
      STATE.estudio = data.materias;
      STATE.actividades = data.actividades;
      if (STATE.activeTab === 'estudio') renderEstudio();
    } else if (STATE.viewMode === 'jefe-ver' && STATE.jefeView) {
      STATE.jefeView.materias = data.materias;
      STATE.jefeView.actividades = data.actividades;
      renderJefeView();
    }
  });

  STATE.socket.on('evento:update', (data) => {
    if (STATE.user.role === 'empleado') {
      STATE.eventos = data;
      if (STATE.activeTab === 'evento') renderEventos();
    } else if (STATE.viewMode === 'jefe-ver' && STATE.jefeView) {
      STATE.jefeView.eventos = data;
      renderJefeView();
    }
  });

  STATE.socket.on('join:request', (solicitud) => {
    if (STATE.user.role !== 'empleado') return;
    STATE.notificaciones = [solicitud, ...(STATE.notificaciones || [])];
    updateNotifBadge();
    if (STATE.user.recibirNotificaciones !== false) showRequestCard(solicitud);
  });

  STATE.socket.on('notificaciones:update', () => {
    if (STATE.user.role === 'empleado') loadNotificaciones();
  });

  STATE.socket.on('join:result', (payload) => {
    if (STATE.user.role === 'jefe') handleJoinResult(payload);
  });
}

function registerSocketRoom() {
  if (!STATE.user || !STATE.socket) return;
  if (STATE.user.role === 'empleado') STATE.socket.emit('register-empleado', { empleadoId: STATE.user.id });
  else if (STATE.user.role === 'jefe') STATE.socket.emit('register-jefe', { jefeId: STATE.user.id });
}

/* ---------- ENTRAR A LA APP ---------- */
function enterApp() {
  actualizarHeaderUsuario();
  configurarMenuPorRol();
  showScreen('screen-app');

  if (STATE.user.role === 'empleado') {
    STATE.viewMode = 'empleado';
    $('#tab-estudio').classList.toggle('hidden', STATE.user.esEstudiante === false);
    $all('.tab').forEach(b => b.classList.remove('active'));
    STATE.activeTab = null;
    renderHome();
    checkPendingRequests();
  } else {
    STATE.viewMode = 'jefe-historial';
    STATE.jefeView = null;
    loadHistorial();
  }
}

async function checkPendingRequests() {
  try {
    await loadNotificaciones();
    if (STATE.user.recibirNotificaciones === false) return; // prefirió no recibir avisos emergentes
    const pendiente = (STATE.notificaciones || []).find(n => n.estado === 'pendiente');
    if (pendiente) showRequestCard(pendiente);
  } catch (ex) { /* silencioso */ }
}

function renderHome() {
  $('#content').innerHTML = `
    <div class="empty-card">
      <div class="empty-icon">${ICONS.home}</div>
      <h2 style="font-size:20px;">Bienvenido</h2>
      <p class="muted">Elige Trabajo, Estudio o Evento arriba para continuar.</p>
    </div>`;
}

/* ---------- TABS ---------- */
function setupTabs() {
  $all('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      $all('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.activeTab = btn.dataset.tab;
      if (btn.dataset.tab === 'trabajo') loadTrabajo();
      else if (btn.dataset.tab === 'estudio') loadEstudio();
      else if (btn.dataset.tab === 'evento') loadEventos();
    });
  });
}

/* ================= TRABAJO ================= */
async function loadTrabajo() {
  STATE.trabajo = await api.get(`/api/trabajo/${STATE.user.id}`);
  renderTrabajo();
}

function trabajoListHTML(data) {
  return data.lugares.map(lug => {
    const turnos = data.turnos
      .filter(t => t.lugarId === lug.id)
      .sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || a.horaInicio.localeCompare(b.horaInicio));
    return `<section class="lugar-block">
      <h2 class="lugar-title">${escapeHtml(lug.nombre)}</h2>
      <div class="turno-list">${turnos.map(turnoCardHTML).join('')}</div>
    </section>`;
  }).join('');
}

function turnoCardHTML(t) {
  const estado = t.eliminacionPendiente
    ? `<span class="turno-estado pendiente">Eliminación pendiente</span>`
    : `<span class="turno-estado">${t.pagado ? 'Pagado' : 'No pagado'}</span>`;
  return `<button class="turno-card ${t.pagado ? 'pagado' : ''}" onclick="openTurnoDetail('${t.id}')">
    <span class="turno-dia">${t.dia.slice(0, 3)}</span>
    <span class="turno-hora">${t.horaInicio} – ${t.horaFin}</span>
    ${estado}
  </button>`;
}

function renderTrabajo() {
  const addBtn = `<button class="btn-add" onclick="openAddTrabajo()">${ICONS.plus} Añadir trabajo</button>`;
  const list = STATE.trabajo.lugares.length
    ? trabajoListHTML(STATE.trabajo)
    : emptyCardHTML('TRABAJO', 'Prototipo · sin datos aún', 'trabajo');
  $('#content').innerHTML = addBtn + list;
}

async function openAddTrabajo() {
  const esJefeAgregando = STATE.viewMode === 'jefe-ver';
  let jefeSelectHtml = '';
  if (!esJefeAgregando) {
    try {
      const jefes = await api.get(`/api/mis-jefes/${STATE.user.id}`);
      STATE.misJefes = jefes;
      const opciones = jefes.map(j => `<option value="${j.jefeId}">${escapeHtml(j.jefeUsername)}</option>`).join('');
      jefeSelectHtml = `
        <label>¿Añadir jefe?
          <select id="f-trabajo-jefe">
            <option value="">No añadir jefe</option>
            ${opciones}
          </select>
        </label>
        <p class="field-hint">Se puede cambiar después desde el detalle del trabajo.</p>`;
    } catch (ex) { /* si falla, simplemente no se ofrece la opción */ }
  }
  openModal('Añadir trabajo', `
    <label>Lugar<input id="f-trabajo-lugar" type="text" placeholder="Ej. Supermercado Éxito" required></label>
    <label>Día<select id="f-trabajo-dia">${diaOptions()}</select></label>
    <div class="row-2">
      <label>Hora inicio<input id="f-trabajo-hi" type="time" required></label>
      <label>Hora fin<input id="f-trabajo-hf" type="time" required></label>
    </div>
    <label>Descripción (opcional)<textarea id="f-trabajo-desc" placeholder="Notas sobre este turno..."></textarea></label>
    ${jefeSelectHtml}
    <p class="field-error" id="f-trabajo-error"></p>
    <button class="btn-primary" onclick="submitTrabajo()">Guardar trabajo</button>
  `);
}

async function submitTrabajo() {
  const lugar = $('#f-trabajo-lugar').value.trim();
  const dia = $('#f-trabajo-dia').value;
  const hi = $('#f-trabajo-hi').value;
  const hf = $('#f-trabajo-hf').value;
  const desc = $('#f-trabajo-desc').value.trim();
  const err = $('#f-trabajo-error');
  if (!lugar || !hi || !hf) { err.textContent = 'Completa lugar y horario.'; return; }
  const esJefe = STATE.viewMode === 'jefe-ver';
  const selectJefe = $('#f-trabajo-jefe');
  try {
    await api.post(`/api/trabajo/${targetEmpleadoId()}/turnos`, {
      lugar, dia, horaInicio: hi, horaFin: hf, descripcion: desc,
      jefeAsignadoId: selectJefe ? (selectJefe.value || null) : null,
      actorJefeId: esJefe ? STATE.user.id : undefined,
      actorJefeUsername: esJefe ? STATE.user.username : undefined
    });
    closeModal();
    toast('Trabajo añadido');
    if (STATE.viewMode === 'jefe-ver') { await refrescarJefeTrabajo(); renderJefeView(); }
    else await loadTrabajo();
  } catch (ex) { err.textContent = ex.message; }
}

// Solo el JEFE puede marcar pagado/no pagado y poner el valor del día.
// El EMPLEADO ve su estado en modo lectura, pero sí puede cambiar el jefe asignado y pedir eliminarlo.
function openTurnoDetail(turnoId) {
  const isJefe = STATE.viewMode === 'jefe-ver';
  const data = isJefe ? STATE.jefeView : STATE.trabajo;
  const turno = data.turnos.find(t => t.id === turnoId);
  if (!turno) return;
  const lugar = data.lugares.find(l => l.id === turno.lugarId);

  const valorHtml = isJefe
    ? `<label>Valor del día (opcional)<input id="f-valor" type="number" min="0" step="0.01" value="${turno.valor ?? ''}" placeholder="0.00"></label>
       <button class="btn-secondary" onclick="guardarValor('${turno.id}')">Guardar valor</button>`
    : (turno.valor !== null && turno.valor !== undefined
        ? `<div class="detail-row"><span>Valor</span><span>$${turno.valor}</span></div>`
        : '');

  const estadoHtml = isJefe
    ? `<div class="toggle-pagado">
         <button class="${!turno.pagado ? 'active no' : ''}" onclick="setPagado('${turno.id}', false)">Día no pagado</button>
         <button class="${turno.pagado ? 'active si' : ''}" onclick="setPagado('${turno.id}', true)">Día pagado</button>
       </div>`
    : `<div class="detail-row"><span>Estado</span><span>${turno.pagado ? 'Pagado' : 'No pagado'}</span></div>`;

  let jefeAsignadoHtml = '';
  if (!isJefe) {
    jefeAsignadoHtml = `<div class="detail-row"><span>Jefe asignado</span><span>${turno.jefeAsignadoId ? 'Sí' : 'Ninguno'}
      <button class="link-btn" style="margin:0 0 0 6px;padding:0;font-size:12px;" onclick="abrirCambiarJefe('${turno.id}')">Cambiar</button></span></div>`;
  }

  let pendienteHtml = '';
  if (turno.eliminacionPendiente) {
    pendienteHtml = isJefe
      ? `<div class="notice-box" style="text-align:left;">
           <b>El empleado pidió eliminar este trabajo.</b>
           <div class="notif-actions" style="margin-top:10px;">
             <button class="btn-ghost-danger" onclick="rechazarEliminacionPendiente('${turno.id}')">Rechazar</button>
             <button class="btn-primary" onclick="confirmarEliminacionPendiente('${turno.id}')">Confirmar eliminación</button>
           </div>
         </div>`
      : `<div class="notice-box">Solicitaste eliminar este trabajo — esperando confirmación de tu jefe.</div>`;
  }

  const eliminarHtml = !turno.eliminacionPendiente
    ? `<button class="btn-ghost-danger" style="width:100%;" onclick="pedirConfirmacionEliminar('${turno.id}')">Eliminar trabajo</button>`
    : '';

  openModal('Detalle del trabajo', `
    <div class="detail-row"><span>Lugar</span><span>${escapeHtml(lugar ? lugar.nombre : '—')}</span></div>
    <div class="detail-row"><span>Día</span><span>${turno.dia}</span></div>
    <div class="detail-row"><span>Hora</span><span>${turno.horaInicio} – ${turno.horaFin}</span></div>
    <div>
      <p class="muted" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;margin:0 0 6px;">Descripción</p>
      <p style="margin:0;font-size:14px;">${turno.descripcion ? escapeHtml(turno.descripcion) : 'Sin descripción.'}</p>
    </div>
    ${jefeAsignadoHtml}
    ${valorHtml}
    ${estadoHtml}
    ${pendienteHtml}
    ${eliminarHtml}
  `);
}

async function abrirCambiarJefe(turnoId) {
  try {
    const jefes = await api.get(`/api/mis-jefes/${STATE.user.id}`);
    const opciones = jefes.map(j => `<option value="${j.jefeId}">${escapeHtml(j.jefeUsername)}</option>`).join('');
    $('#modal-title').textContent = 'Cambiar jefe asignado';
    $('#modal-body').innerHTML = `
      <label>Jefe
        <select id="f-cambiar-jefe">
          <option value="">Ninguno</option>
          ${opciones}
        </select>
      </label>
      <p class="field-error" id="f-cambiar-jefe-error"></p>
      <button class="btn-primary" onclick="guardarCambioJefe('${turnoId}')">Guardar</button>
      <button class="link-btn" onclick="openTurnoDetail('${turnoId}')">Cancelar</button>
    `;
  } catch (ex) { toast(ex.message); }
}

async function guardarCambioJefe(turnoId) {
  const valor = $('#f-cambiar-jefe').value;
  try {
    await api.patch(`/api/trabajo/turnos/${turnoId}`, { jefeAsignadoId: valor || null });
    toast('Jefe actualizado');
    await loadTrabajo();
    openTurnoDetail(turnoId);
  } catch (ex) { $('#f-cambiar-jefe-error').textContent = ex.message; }
}

function pedirConfirmacionEliminar(turnoId) {
  const isJefe = STATE.viewMode === 'jefe-ver';
  const data = isJefe ? STATE.jefeView : STATE.trabajo;
  const turno = data.turnos.find(t => t.id === turnoId);
  const avisoExtra = (!isJefe && turno && !turno.pagado && turno.jefeAsignadoId)
    ? '<p class="muted" style="font-size:12.5px;">Como no está pagado y tiene un jefe asignado, tu jefe tendrá que confirmarlo.</p>'
    : '';
  $('#modal-title').textContent = 'Eliminar trabajo';
  $('#modal-body').innerHTML = `
    <p style="margin:0;">¿Estás seguro de que quieres eliminar este trabajo? Esta acción no se puede deshacer.</p>
    ${avisoExtra}
    <div class="notif-actions">
      <button class="btn-secondary" onclick="openTurnoDetail('${turnoId}')">Cancelar</button>
      <button class="btn-ghost-danger" onclick="eliminarTrabajoDefinitivo('${turnoId}')">Sí, eliminar</button>
    </div>
  `;
}

async function eliminarTrabajoDefinitivo(turnoId) {
  const isJefe = STATE.viewMode === 'jefe-ver';
  try {
    const body = isJefe
      ? { actorRole: 'jefe', jefeId: STATE.user.id, actorJefeUsername: STATE.user.username }
      : { actorRole: 'empleado' };
    const data = await api.delete(`/api/trabajo/turnos/${turnoId}`, body);
    closeModal();
    if (data.pendiente) toast('Se envió la solicitud a tu jefe para confirmar.');
    else toast('Trabajo eliminado');
    if (isJefe) { await refrescarJefeTrabajo(); renderJefeView(); }
    else await loadTrabajo();
  } catch (ex) { toast(ex.message); }
}

async function confirmarEliminacionPendiente(turnoId) {
  try {
    await api.post(`/api/trabajo/turnos/${turnoId}/confirmar-eliminacion`, { jefeId: STATE.user.id, jefeUsername: STATE.user.username });
    closeModal();
    toast('Trabajo eliminado');
    await refrescarJefeTrabajo();
    renderJefeView();
  } catch (ex) { toast(ex.message); }
}

async function rechazarEliminacionPendiente(turnoId) {
  try {
    await api.post(`/api/trabajo/turnos/${turnoId}/rechazar-eliminacion`, { jefeId: STATE.user.id, jefeUsername: STATE.user.username });
    toast('Solicitud rechazada');
    await refrescarJefeTrabajo();
    openTurnoDetail(turnoId);
  } catch (ex) { toast(ex.message); }
}

async function setPagado(turnoId, pagado) {
  try {
    await api.patch(`/api/trabajo/turnos/${turnoId}`, { pagado, actorJefeUsername: STATE.user.username });
    toast(pagado ? 'Marcado como pagado' : 'Marcado como no pagado');
    await refrescarJefeTrabajo();
    openTurnoDetail(turnoId);
  } catch (ex) { toast(ex.message); }
}

async function guardarValor(turnoId) {
  const raw = $('#f-valor').value;
  try {
    await api.patch(`/api/trabajo/turnos/${turnoId}`, { valor: raw === '' ? null : Number(raw) });
    toast('Valor guardado');
    await refrescarJefeTrabajo();
    openTurnoDetail(turnoId);
  } catch (ex) { toast(ex.message); }
}

/* ================= ESTUDIO ================= */
function estudioGridHTML(materias, editable) {
  return DIAS.map(dia => {
    const items = materias.filter(m => m.dia === dia);
    return `<div class="day-block">
      <div class="day-head">
        <span class="day-name">${dia}</span>
        ${editable ? `<button class="day-add" onclick="openAddMateria('${dia}')">${ICONS.plus}</button>` : ''}
      </div>
      ${items.length
        ? items.map(m => `<div class="materia-row"><span class="materia-nombre">${escapeHtml(m.nombre)}</span><span class="materia-hora">${m.horaInicio} – ${m.horaFin}</span></div>`).join('')
        : `<p class="day-empty">Sin clases</p>`}
    </div>`;
  }).join('');
}

async function loadEstudio() {
  STATE.estudio = await api.get(`/api/estudio/${STATE.user.id}`);
  renderEstudio();
}

function renderEstudio() {
  const btnPendientes = `<button class="btn-add" onclick="openPendientes()">${ICONS.estudio} Actividades pendientes</button>`;
  $('#content').innerHTML = btnPendientes + estudioGridHTML(STATE.estudio, true);
}

function openAddMateria(dia) {
  openModal(`Añadir materia · ${dia}`, `
    <label>Materia<input id="f-mat-nombre" type="text" placeholder="Ej. Cálculo II" required></label>
    <div class="row-2">
      <label>Hora inicio<input id="f-mat-hi" type="time" required></label>
      <label>Hora fin<input id="f-mat-hf" type="time" required></label>
    </div>
    <p class="field-error" id="f-mat-error"></p>
    <button class="btn-primary" onclick="submitMateria('${dia}')">Guardar materia</button>
  `);
}

async function submitMateria(dia) {
  const nombre = $('#f-mat-nombre').value.trim();
  const hi = $('#f-mat-hi').value;
  const hf = $('#f-mat-hf').value;
  const err = $('#f-mat-error');
  if (!nombre || !hi || !hf) { err.textContent = 'Completa materia y horario.'; return; }
  try {
    await api.post(`/api/estudio/${STATE.user.id}`, { dia, nombre, horaInicio: hi, horaFin: hf });
    closeModal();
    toast('Materia añadida');
    loadEstudio();
  } catch (ex) { err.textContent = ex.message; }
}

/* ---- actividades pendientes (con menú desplegable de día) ---- */
async function openPendientes() {
  const isJefe = STATE.viewMode === 'jefe-ver';
  let actividades;
  if (isJefe) {
    actividades = STATE.jefeView.actividades || [];
  } else {
    actividades = await api.get(`/api/estudio/${STATE.user.id}/actividades`);
    STATE.actividades = actividades;
  }
  renderPendientesModal(actividades, !isJefe);
}

function renderPendientesModal(actividades, editable) {
  const addForm = editable ? `
    <div style="display:flex;flex-direction:column;gap:10px;padding-bottom:14px;border-bottom:1px dashed var(--line);">
      <label>Actividad<input id="f-act-nombre" type="text" placeholder="Ej. Entregar informe"></label>
      <label>Día relacionado
        <select id="f-act-dia">
          <option value="">Sin día específico</option>
          ${diaOptions()}
        </select>
      </label>
      <label>Nota (opcional)<input id="f-act-nota" type="text" placeholder="Detalles cortos..."></label>
      <p class="field-error" id="f-act-error"></p>
      <button class="btn-primary" onclick="submitActividad()">Añadir actividad</button>
    </div>` : '';
  const lista = actividades.length
    ? actividades.map(a => `
      <div class="actividad-row ${a.hecha ? 'hecha' : ''}">
        <input type="checkbox" ${a.hecha ? 'checked' : ''} ${editable ? `onchange="toggleActividad('${a.id}', this.checked)"` : 'disabled'}>
        <div class="actividad-info">
          <div class="actividad-nombre">${escapeHtml(a.nombre)}</div>
          <div class="actividad-meta">${[a.dia, a.nota].filter(Boolean).map(escapeHtml).join(' · ') || '—'}</div>
        </div>
        ${editable ? `<button class="actividad-del" onclick="eliminarActividad('${a.id}')">${ICONS.trash}</button>` : ''}
      </div>`).join('')
    : emptyCardHTML('ESTUDIO', editable ? 'Aún no hay actividades pendientes.' : 'Este empleado no tiene actividades pendientes.', 'estudio');
  openModal('Actividades pendientes', addForm + lista);
}

async function submitActividad() {
  const nombre = $('#f-act-nombre').value.trim();
  const dia = $('#f-act-dia').value;
  const nota = $('#f-act-nota').value.trim();
  const err = $('#f-act-error');
  if (!nombre) { err.textContent = 'Escribe el nombre de la actividad.'; return; }
  try {
    await api.post(`/api/estudio/${STATE.user.id}/actividades`, { nombre, dia, nota });
    toast('Actividad añadida');
    openPendientes();
  } catch (ex) { err.textContent = ex.message; }
}

async function toggleActividad(id, hecha) {
  try {
    await api.patch(`/api/estudio/actividades/${id}`, { hecha });
    openPendientes();
  } catch (ex) { toast(ex.message); }
}

async function eliminarActividad(id) {
  try {
    await api.delete(`/api/estudio/actividades/${id}`);
    toast('Actividad eliminada');
    openPendientes();
  } catch (ex) { toast(ex.message); }
}

/* ================= EVENTO ================= */
function eventosListHTML(list, editable) {
  const addBtn = editable ? `<button class="btn-add" onclick="openAddEvento()">${ICONS.plus} Añadir evento</button>` : '';
  if (!list.length) {
    return addBtn + emptyCardHTML('EVENTO', editable ? 'Prototipo · sin datos aún' : 'Este empleado aún no ha añadido eventos.', 'estudio');
  }
  const cards = list.map(e => `
    <button class="evento-card" onclick="openEventoDetail('${e.id}')">
      <span class="evento-lugar">${escapeHtml(e.lugar)}</span>
      <div class="evento-meta">
        <span class="chip">${e.dia}</span>
        <span class="chip">${e.hora}</span>
        ${e.gastoMonto ? `<span class="chip gasto">Gasto: $${e.gastoMonto}</span>` : ''}
      </div>
    </button>`).join('');
  return addBtn + cards;
}

// trabajos del empleado que NO están asignados a este jefe: se muestran como referencia
// de solo lectura (lugar y horario) dentro de Evento, tal como se pidió.
function trabajosAjenosComoEventosHTML(d) {
  const ajenos = d.turnos.filter(t => t.jefeAsignadoId !== STATE.user.id);
  if (!ajenos.length) return '';
  const cards = ajenos.map(t => {
    const lug = d.lugares.find(l => l.id === t.lugarId);
    return `<div class="evento-card" style="cursor:default;">
      <span class="evento-lugar">${escapeHtml(lug ? lug.nombre : '—')}</span>
      <div class="evento-meta">
        <span class="chip">${t.dia}</span>
        <span class="chip">${t.horaInicio} – ${t.horaFin}</span>
        <span class="chip gasto">Trabajo</span>
      </div>
    </div>`;
  }).join('');
  return `<p class="field-hint" style="margin:6px 0 -2px;">Trabajos del empleado sin tu supervisión (solo lugar y horario):</p>` + cards;
}

// filtra el trabajo del empleado a solo lo que este jefe tiene asignado a su nombre
function trabajoDelJefeFiltrado(d) {
  const misTurnos = d.turnos.filter(t => t.jefeAsignadoId === STATE.user.id);
  const misLugarIds = new Set(misTurnos.map(t => t.lugarId));
  const misLugares = d.lugares.filter(l => misLugarIds.has(l.id));
  return { lugares: misLugares, turnos: misTurnos };
}

async function loadEventos() {
  STATE.eventos = await api.get(`/api/evento/${STATE.user.id}`);
  renderEventos();
}

function renderEventos() {
  $('#content').innerHTML = eventosListHTML(STATE.eventos, true);
}

function openAddEvento() {
  openModal('Añadir evento', `
    <label>Lugar<input id="f-evt-lugar" type="text" placeholder="Ej. Cancha Los Pinos" required></label>
    <div class="row-2">
      <label>Día<select id="f-evt-dia">${diaOptions()}</select></label>
      <label>Hora<input id="f-evt-hora" type="time" required></label>
    </div>
    <label style="flex-direction:row;align-items:center;gap:8px;text-transform:none;">
      <input type="checkbox" id="f-evt-tiene-gasto" style="width:auto;" onchange="toggleGastoFields()"> ¿Hubo algún gasto?
    </label>
    <div id="gasto-fields" class="hidden" style="display:flex;flex-direction:column;gap:10px;">
      <label>Monto gastado<input id="f-evt-monto" type="number" min="0" step="0.01" placeholder="0.00"></label>
      <label>¿En qué se gastó?<input id="f-evt-monto-desc" type="text" placeholder="Ej. Transporte"></label>
    </div>
    <label>Descripción<textarea id="f-evt-desc" placeholder="Detalles del evento..."></textarea></label>
    <p class="field-error" id="f-evt-error"></p>
    <button class="btn-primary" onclick="submitEvento()">Guardar evento</button>
  `);
}

function toggleGastoFields() {
  const checked = $('#f-evt-tiene-gasto').checked;
  $('#gasto-fields').classList.toggle('hidden', !checked);
}

async function submitEvento() {
  const lugar = $('#f-evt-lugar').value.trim();
  const dia = $('#f-evt-dia').value;
  const hora = $('#f-evt-hora').value;
  const tieneGasto = $('#f-evt-tiene-gasto').checked;
  const monto = tieneGasto ? $('#f-evt-monto').value : '';
  const montoDesc = tieneGasto ? $('#f-evt-monto-desc').value.trim() : '';
  const desc = $('#f-evt-desc').value.trim();
  const err = $('#f-evt-error');
  if (!lugar || !hora) { err.textContent = 'Completa lugar y hora.'; return; }
  try {
    await api.post(`/api/evento/${STATE.user.id}`, {
      lugar, dia, hora, gastoMonto: monto, gastoDescripcion: montoDesc, descripcion: desc
    });
    closeModal();
    toast('Evento añadido');
    loadEventos();
  } catch (ex) { err.textContent = ex.message; }
}

function openEventoDetail(id) {
  const isJefe = STATE.viewMode === 'jefe-ver';
  const list = isJefe ? (STATE.jefeView.eventos || []) : STATE.eventos;
  const e = list.find(x => x.id === id);
  if (!e) return;
  openModal('Detalle del evento', `
    <div class="detail-row"><span>Lugar</span><span>${escapeHtml(e.lugar)}</span></div>
    <div class="detail-row"><span>Día</span><span>${e.dia}</span></div>
    <div class="detail-row"><span>Hora</span><span>${e.hora}</span></div>
    ${e.gastoMonto ? `<div class="detail-row"><span>Gasto</span><span>$${e.gastoMonto}</span></div>
    <div class="detail-row"><span>¿En qué?</span><span>${escapeHtml(e.gastoDescripcion || '—')}</span></div>` : ''}
    <div>
      <p class="muted" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;margin:0 0 6px;">Descripción</p>
      <p style="margin:0;font-size:14px;">${e.descripcion ? escapeHtml(e.descripcion) : 'Sin descripción.'}</p>
    </div>
  `);
}

/* ================= COMPARTIR (empleado) ================= */
function openCompartir() {
  openModal('Compartir código', `
    <div class="share-code">${STATE.user.shareCode}</div>
    <p class="muted" style="font-size:12.5px;text-align:center;margin:0;">Comparte este código de 8 dígitos con tu jefe para que pueda verificarte en tiempo real.</p>
    <button class="btn-primary" onclick="copiarCodigo()">Copiar código</button>
  `);
}

function copiarCodigo() {
  const code = STATE.user.shareCode;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => toast('Código copiado')).catch(() => toast('Copia el código manualmente: ' + code));
  } else {
    toast('Copia el código manualmente: ' + code);
  }
}

/* ================= NOTIFICACIONES (empleado) ================= */
function updateNotifBadge() {
  const hayAlgoPendiente = (STATE.notificaciones || []).some(n =>
    (n.tipo === 'solicitud' && n.estado === 'pendiente') || (n.tipo !== 'solicitud' && !n.leida)
  );
  $('#notif-dot').classList.toggle('hidden', !hayAlgoPendiente);
}

async function loadNotificaciones() {
  STATE.notificaciones = await api.get(`/api/notificaciones/${STATE.user.id}`);
  updateNotifBadge();
  return STATE.notificaciones;
}

function notifTextoHTML(n) {
  const jefe = `<b>${escapeHtml(n.jefeUsername || 'JEFE')}</b>`;
  if (n.tipo === 'solicitud') return `${jefe} quiere verificar tu información.`;
  if (n.tipo === 'trabajo_añadido') return `${jefe} añadió un nuevo trabajo "${escapeHtml(n.lugar || '')}"`;
  if (n.tipo === 'trabajo_pagado') return `${jefe} pagó/abonó tu trabajo "${escapeHtml(n.lugar || '')}"`;
  if (n.tipo === 'jefe_configurado') return `${jefe} ha sido configurado.`;
  if (n.tipo === 'trabajo_eliminado') return `${jefe} eliminó el trabajo "${escapeHtml(n.lugar || '')}"`;
  if (n.tipo === 'trabajo_eliminacion_rechazada') return `${jefe} rechazó tu solicitud para eliminar un trabajo.`;
  return jefe;
}

async function openNotificaciones() {
  try {
    await loadNotificaciones();
    renderNotificacionesModal();
    const huboSinLeer = STATE.notificaciones.some(n => n.tipo !== 'solicitud' && !n.leida);
    if (huboSinLeer) {
      await api.post(`/api/notificaciones/${STATE.user.id}/marcar-leidas`, {});
      STATE.notificaciones.forEach(n => { if (n.tipo !== 'solicitud') n.leida = true; });
      updateNotifBadge();
    }
  } catch (ex) { toast(ex.message); }
}

function renderNotificacionesModal() {
  const list = STATE.notificaciones || [];
  const html = list.length ? list.map(n => `
    <div class="notif-row">
      <span class="notif-text">${notifTextoHTML(n)}</span>
      <span class="notif-fecha">${formatFecha(n.fecha)}</span>
      ${n.tipo === 'solicitud' && n.estado === 'pendiente'
        ? `<div class="notif-actions">
             <button class="btn-ghost-danger" onclick="responderSolicitudId('${n.id}','rechazar')">Rechazar</button>
             <button class="btn-primary" onclick="responderSolicitudId('${n.id}','aceptar')">Aceptar</button>
           </div>`
        : (n.tipo === 'solicitud' ? `<span class="notif-badge ${n.estado}">Rechazada</span>` : '')}
    </div>`).join('') : emptyCardHTML('NOTIFICACIONES', 'No tienes notificaciones por ahora.', 'historial');
  openModal('Notificaciones', html);
}

async function responderSolicitudId(id, accion) {
  try {
    await api.post(`/api/join-requests/${id}/responder`, { accion });
    toast(accion === 'aceptar' ? 'Verificación aceptada' : 'Solicitud rechazada');
    if (STATE.pendingRequest && STATE.pendingRequest.id === id) hideRequestCard();
    await loadNotificaciones();
    renderNotificacionesModal();
  } catch (ex) { toast(ex.message); }
}

/* ================= SOLICITUD EN VIVO (empleado recibe) ================= */
function showRequestCard(solicitud) {
  STATE.pendingRequest = solicitud;
  $('#request-text').textContent = `${solicitud.jefeUsername} quiere verificar tu información en tiempo real.`;
  $('#request-overlay').classList.add('open');
  $('#request-card').classList.add('open');
}
function hideRequestCard() {
  $('#request-overlay').classList.remove('open');
  $('#request-card').classList.remove('open');
  STATE.pendingRequest = null;
}
function setupRequestCard() {
  $('#request-aceptar').addEventListener('click', () => responderSolicitud('aceptar'));
  $('#request-rechazar').addEventListener('click', () => responderSolicitud('rechazar'));
}
async function responderSolicitud(accion) {
  if (!STATE.pendingRequest) return;
  const id = STATE.pendingRequest.id;
  hideRequestCard();
  try {
    await api.post(`/api/join-requests/${id}/responder`, { accion });
    toast(accion === 'aceptar' ? 'Verificación aceptada' : 'Solicitud rechazada');
    await loadNotificaciones();
  } catch (ex) { toast(ex.message); }
}

/* ================= VERIFICAR (perfil JEFE) ================= */
function openVerificar() {
  openModal('Verificar código', `
    <label>Código de 8 dígitos<input id="f-verificar-code" type="text" inputmode="numeric" maxlength="8" placeholder="00000000"></label>
    <p class="field-error" id="f-verificar-error"></p>
    <button class="btn-primary" id="f-verificar-btn" onclick="enviarVerificacion()">Verificar</button>
    <p class="muted" id="f-verificar-status" style="font-size:12.5px;text-align:center;margin:0;"></p>
  `);
}

async function enviarVerificacion() {
  const code = $('#f-verificar-code').value.trim();
  const err = $('#f-verificar-error');
  if (code.length !== 8) { err.textContent = 'El código debe tener 8 dígitos.'; return; }
  err.textContent = '';
  try {
    $('#f-verificar-btn').disabled = true;
    await api.post('/api/verificar', { jefeId: STATE.user.id, jefeUsername: STATE.user.username, code });
    $('#f-verificar-status').textContent = 'Esperando que el empleado acepte…';
  } catch (ex) {
    $('#f-verificar-btn').disabled = false;
    err.textContent = ex.message;
  }
}

function handleJoinResult(payload) {
  const { solicitud, link } = payload;
  if (solicitud.estado === 'aceptado' && link) {
    closeModal();
    if (STATE.user.recibirNotificaciones !== false) toast('¡Verificación aceptada!');
    loadHistorial().then(() => abrirDesdeHistorial(link.empleadoId));
  } else {
    closeModal();
    if (STATE.user.recibirNotificaciones !== false) toast('El empleado rechazó la verificación.');
  }
}

/* ================= PERFIL JEFE: historial y vista en tiempo real ================= */
async function loadHistorial() {
  STATE.historial = await api.get(`/api/historial/${STATE.user.id}`);
  if (STATE.viewMode === 'jefe-historial') renderHistorial();
}

function renderHistorial() {
  const addBtn = `<button class="btn-add" onclick="openVerificar()">${ICONS.historial} Verificar nuevo código</button>`;
  if (!STATE.historial.length) {
    $('#content').innerHTML = addBtn + emptyCardHTML('HISTORIAL', 'Aún no has verificado a ningún empleado.', 'historial');
    return;
  }
  const cards = STATE.historial.map(l => `
    <button class="historial-card" onclick="abrirDesdeHistorial('${l.empleadoId}')">
      <span class="historial-avatar">${escapeHtml((l.empleadoUsername || '?').slice(0, 1).toUpperCase())}</span>
      <span class="historial-info">
        <div class="historial-nombre">${escapeHtml(l.empleadoUsername)}</div>
        <div class="historial-fecha">Última verificación: ${formatFecha(l.fecha)}</div>
      </span>
    </button>`).join('');
  $('#content').innerHTML = addBtn + cards;
}

async function abrirDesdeHistorial(empleadoId) {
  const found = (STATE.historial || []).find(l => l.empleadoId === empleadoId);
  STATE.jefeView = {
    empleadoId,
    empleadoUsername: (found && found.empleadoUsername) || 'Empleado',
    lugares: [], turnos: [], materias: [], actividades: [], eventos: [],
    activeSubTab: 'trabajo'
  };
  STATE.viewMode = 'jefe-ver';
  STATE.socket.emit('jefe-ver-empleado', { jefeId: STATE.user.id, empleadoId });
  await cambiarSubTabJefe('trabajo');
}

async function refrescarJefeTrabajo() {
  if (!STATE.jefeView) return;
  const d = await api.get(`/api/verificar/datos/${STATE.jefeView.empleadoId}?jefeId=${STATE.user.id}`);
  STATE.jefeView.lugares = d.lugares;
  STATE.jefeView.turnos = d.turnos;
  if (d.empleadoUsername) STATE.jefeView.empleadoUsername = d.empleadoUsername;
  STATE.jefeView.esEstudiante = d.esEstudiante;
}

async function cambiarSubTabJefe(tab) {
  STATE.jefeView.activeSubTab = tab;
  try {
    if (tab === 'trabajo') {
      await refrescarJefeTrabajo();
    } else if (tab === 'estudio') {
      const d = await api.get(`/api/verificar/estudio/${STATE.jefeView.empleadoId}?jefeId=${STATE.user.id}`);
      STATE.jefeView.materias = d.materias;
      STATE.jefeView.actividades = d.actividades;
    } else if (tab === 'evento') {
      STATE.jefeView.eventos = await api.get(`/api/verificar/evento/${STATE.jefeView.empleadoId}?jefeId=${STATE.user.id}`);
    }
    renderJefeView();
  } catch (ex) { toast(ex.message); }
}

function renderJefeView() {
  const d = STATE.jefeView;
  const sub = d.activeSubTab;
  const mostrarEstudio = d.esEstudiante !== false;
  const subtabsHtml = `
    <div class="subtabs">
      <button class="subtab ${sub === 'trabajo' ? 'active' : ''}" onclick="cambiarSubTabJefe('trabajo')">Trabajo</button>
      ${mostrarEstudio ? `<button class="subtab ${sub === 'estudio' ? 'active' : ''}" onclick="cambiarSubTabJefe('estudio')">Estudio</button>` : ''}
      <button class="subtab ${sub === 'evento' ? 'active' : ''}" onclick="cambiarSubTabJefe('evento')">Evento</button>
    </div>`;

  let body = '';
  if (sub === 'trabajo') {
    const addBtn = `<button class="btn-add" onclick="openAddTrabajo()">${ICONS.plus} Añadir trabajo</button>`;
    const propios = trabajoDelJefeFiltrado(d);
    body = addBtn + (propios.lugares.length ? trabajoListHTML(propios) : emptyCardHTML('TRABAJO', 'Aún no tienes trabajos asignados de este empleado.', 'trabajo'));
  } else if (sub === 'estudio') {
    const btnPendientes = `<button class="btn-add" onclick="openPendientes()">${ICONS.estudio} Ver actividades pendientes</button>`;
    body = estudioGridHTML(d.materias || [], false) + btnPendientes;
  } else if (sub === 'evento') {
    body = eventosListHTML(d.eventos || [], false) + trabajosAjenosComoEventosHTML(d);
  }

  $('#content').innerHTML = `
    <div class="view-head">
      <button class="view-back" onclick="volverAHistorial()">${ICONS.back}</button>
      <span class="view-title">${escapeHtml(d.empleadoUsername)}</span>
    </div>
    ${subtabsHtml}
    ${body}`;
}

function volverAHistorial() {
  STATE.viewMode = 'jefe-historial';
  STATE.jefeView = null;
  renderHistorial();
}

/* ================= DRAWER (wiring) ================= */
function setupDrawer() {
  $('#btn-menu').addEventListener('click', openDrawer);
  $('#drawer-overlay').addEventListener('click', closeDrawer);

  $('#drawer-inicio').addEventListener('click', () => {
    closeDrawer();
    if (STATE.user.role === 'empleado') {
      $all('.tab').forEach(b => b.classList.remove('active'));
      STATE.activeTab = null;
      renderHome();
    } else if (STATE.user.role === 'jefe') {
      STATE.viewMode = 'jefe-historial';
      STATE.jefeView = null;
      renderHistorial();
    }
  });

  $('#drawer-compartir').addEventListener('click', () => { closeDrawer(); openCompartir(); });
  $('#drawer-notificaciones').addEventListener('click', () => { closeDrawer(); openNotificaciones(); });
  $('#drawer-verificar').addEventListener('click', () => { closeDrawer(); openVerificar(); });
  $('#drawer-informacion').addEventListener('click', () => { closeDrawer(); openInformacion(); });
}

/* ================= PERFIL (wiring) ================= */
function setupPerfil() {
  $('#btn-perfil').addEventListener('click', openPerfil);
}

/* ================= MODAL (wiring) ================= */
function setupModal() {
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-overlay').addEventListener('click', closeModal);
}

/* ---------- ARRANQUE ---------- */
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupRoleCards();
  setupDrawer();
  setupPerfil();
  setupTabs();
  setupModal();
  setupRequestCard();
  initSplash();
});
