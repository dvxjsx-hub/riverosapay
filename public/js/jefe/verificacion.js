/* ============================================================
   Riverospay · MODO JEFE
   Los trabajos llegan por amistad + asignación de jefe.
   ============================================================ */

async function loadHistorial() {
  STATE.historial = await api.get(`/api/trabajo/jefe/${STATE.user.id}`);
  if (STATE.viewMode === 'jefe-historial') renderHistorial();
}

function renderHistorial() {
  if (!STATE.historial.length) {
    $('#content').innerHTML = emptyCardHTML('MODO JEFE', 'Aún no tienes trabajos asignados.', 'historial');
    return;
  }
  const cards = STATE.historial.map(l => `
    <button class="historial-card" onclick="abrirDesdeHistorial('${l.empleadoId}')">
      <span class="historial-avatar">${escapeHtml((l.empleadoNombre || l.empleadoUsername || '?').slice(0, 1).toUpperCase())}</span>
      <span class="historial-info">
        <div class="historial-nombre">${escapeHtml(l.empleadoNombre || l.empleadoUsername)}</div>
        <div class="historial-fecha">${l.turnos.length} trabajo${l.turnos.length === 1 ? '' : 's'} asignado${l.turnos.length === 1 ? '' : 's'}</div>
      </span>
    </button>`).join('');
  $('#content').innerHTML = cards;
}

async function abrirDesdeHistorial(empleadoId) {
  const found = (STATE.historial || []).find(l => l.empleadoId === empleadoId);
  STATE.jefeView = {
    empleadoId,
    empleadoUsername: (found && (found.empleadoNombre || found.empleadoUsername)) || 'Empleado',
    lugares: found ? (found.lugares || []) : [],
    turnos: found ? (found.turnos || []) : [],
    materias: [], actividades: [], eventos: [],
    activeSubTab: 'trabajo'
  };
  STATE.viewMode = 'jefe-ver';
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
    if (tab === 'trabajo') await refrescarJefeTrabajo();
    else if (tab === 'estudio') {
      const d = await api.get(`/api/verificar/estudio/${STATE.jefeView.empleadoId}?jefeId=${STATE.user.id}`);
      STATE.jefeView.materias = d.materias; STATE.jefeView.actividades = d.actividades;
    } else if (tab === 'evento') STATE.jefeView.eventos = await api.get(`/api/verificar/evento/${STATE.jefeView.empleadoId}?jefeId=${STATE.user.id}`);
    renderJefeView();
  } catch (ex) { toast(ex.message); }
}

function renderJefeView() {
  const d = STATE.jefeView;
  const sub = d.activeSubTab;
  const mostrarEstudio = d.esEstudiante !== false;
  const subtabsHtml = `<div class="subtabs"><button class="subtab ${sub === 'trabajo' ? 'active' : ''}" onclick="cambiarSubTabJefe('trabajo')">Trabajo</button>${mostrarEstudio ? `<button class="subtab ${sub === 'estudio' ? 'active' : ''}" onclick="cambiarSubTabJefe('estudio')">Estudio</button>` : ''}<button class="subtab ${sub === 'evento' ? 'active' : ''}" onclick="cambiarSubTabJefe('evento')">Evento</button></div>`;
  let body = '';
  if (sub === 'trabajo') {
    const propios = trabajoDelJefeFiltrado(d);
    body = propios.lugares.length ? trabajoListHTML(propios) : emptyCardHTML('TRABAJO', 'No tienes trabajos asignados de este usuario.', 'trabajo');
  } else if (sub === 'estudio') {
    const btnPendientes = `<button class="btn-add" onclick="openPendientes()">${ICONS.estudio} Ver actividades pendientes</button>`;
    body = estudioGridHTML(d.materias || [], false) + btnPendientes;
  } else {
    body = eventosListHTML(d.eventos || [], false) + trabajosAjenosComoEventosHTML(d);
  }
  $('#content').innerHTML = `<div class="view-head"><button class="view-back" onclick="volverAHistorial()">${ICONS.back}</button><span class="view-title">${escapeHtml(d.empleadoUsername)}</span></div>${subtabsHtml}${body}`;
}

function volverAHistorial() {
  STATE.viewMode = 'jefe-historial';
  STATE.jefeView = null;
  loadHistorial();
}
