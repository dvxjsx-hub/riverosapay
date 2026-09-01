/* ============================================================
   Riverospay · MODO BOSS
   Los trabajos llegan por amistad + asignación de BOSS.
   ============================================================ */

async function loadHistorial() {
  STATE.historial = await api.get(`/api/trabajo/jefe/${STATE.user.id}`);
  if (STATE.viewMode === 'jefe-historial') renderHistorial();
}

function renderHistorial() {
  if (!STATE.historial.length) {
    $('#content').innerHTML = emptyCardHTML('MODO BOSS', 'Aún no tienes trabajos asignados.', 'historial');
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
    activeSubTab: 'trabajo',
    // Un BOSS que está consultando a un empleado queda restringido a Trabajo.
    contextoRestringido: true
  };
  STATE.viewMode = 'jefe-ver';
  trabajoVistaActual = TRABAJO_VISTAS.HORARIOS;
  trabajoFiltroJefe = null;
  trabajoFiltroPago = 'todos';
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
  if (!STATE.jefeView) return;

  // Tanda 6: al consultar el perfil de un empleado, el BOSS solo puede
  // consultar Trabajo. Horarios/Finalizados no deben desbloquear Estudio ni Evento.
  if (STATE.jefeView.contextoRestringido && tab !== 'trabajo') {
    STATE.jefeView.activeSubTab = 'trabajo';
    await refrescarJefeTrabajo();
    renderJefeView();
    toast('En el perfil de un empleado solo puedes consultar Trabajo por ahora.');
    return;
  }

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
  const mostrarEstudio = d.contextoRestringido ? false : d.esEstudiante !== false;
  const mostrarEvento = d.contextoRestringido ? false : true;
  const subtabsHtml = `<div class="subtabs"><button class="subtab ${sub === 'trabajo' ? 'active' : ''}" onclick="cambiarSubTabJefe('trabajo')">Trabajo</button>${mostrarEstudio ? `<button class="subtab ${sub === 'estudio' ? 'active' : ''}" onclick="cambiarSubTabJefe('estudio')">Estudio</button>` : ''}${mostrarEvento ? `<button class="subtab ${sub === 'evento' ? 'active' : ''}" onclick="cambiarSubTabJefe('evento')">Evento</button>` : ''}</div>`;
  let body = '';
  if (sub === 'trabajo') {
    const selector = `<div style="margin-bottom:10px;"><button class="trabajo-vista-selector" style="width:100%;display:flex;justify-content:space-between;align-items:center;background:rgba(21,92,49,.08);border:1.5px solid var(--line);border-radius:var(--radius-md);padding:14px 16px;color:var(--green-900);font-family:var(--font-display);font-weight:700;font-size:15px;cursor:pointer;" type="button" onclick="abrirSelectorTrabajo()"><span>${trabajoVistaActual === TRABAJO_VISTAS.HORARIOS ? 'Horarios' : 'Finalizados'}</span><span>⌄</span></button></div>`;
    const propios = trabajoDelJefeFiltrado(d);
    body = selector + (propios.lugares.length ? trabajoListHTML(propios) : emptyCardHTML('TRABAJO', trabajoVistaActual === TRABAJO_VISTAS.FINALIZADOS ? 'No tienes trabajos finalizados asignados de este usuario.' : 'No tienes trabajos próximos asignados de este usuario.', 'trabajo'));
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
  trabajoVistaActual = TRABAJO_VISTAS.HORARIOS;
  trabajoFiltroJefe = null;
  trabajoFiltroPago = 'todos';
  trabajoModoBorrado = false;
  loadHistorial();
}
