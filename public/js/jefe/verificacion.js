/* ============================================================
   Riverospay · PERFIL JEFE: verificar, historial, vista en tiempo real de un empleado
   Extraído de app.js (refactor de estructura, sin cambios de lógica)
   ============================================================ */

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
