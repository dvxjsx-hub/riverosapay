/* ============================================================
   Riverospay · MODO BOSS
   Organizador BOSS + consulta de trabajos asignados.
   ============================================================ */

async function loadHistorial() {
  STATE.historial = await api.get(`/api/trabajo/jefe/${STATE.user.id}`);
  if (STATE.viewMode === 'jefe-historial') renderHistorial();
}

function renderHistorial() {
  const cards = (STATE.historial || []).map(l => `
    <button class="historial-card" onclick="abrirDesdeHistorial('${l.empleadoId}')">
      <span class="historial-avatar">${escapeHtml((l.empleadoNombre || l.empleadoUsername || '?').slice(0, 1).toUpperCase())}</span>
      <span class="historial-info">
        <div class="historial-nombre">${escapeHtml(l.empleadoNombre || l.empleadoUsername)}</div>
        <div class="historial-fecha">${l.turnos.length} trabajo${l.turnos.length === 1 ? '' : 's'} asignado${l.turnos.length === 1 ? '' : 's'}${l.empleadoTipo === 'personal' ? ' · Personalizado' : ''}</div>
      </span>
    </button>`).join('');

  $('#content').innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
      <button class="trabajo-plus" style="width:56px;height:56px;border-radius:50%;border:none;background:var(--green-700);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);cursor:pointer;" type="button" onclick="openBossAddTrabajo()" aria-label="Añadir trabajo">${ICONS.plus}</button>
    </div>
    ${cards || emptyCardHTML('ORGANIZADOR BOSS', 'Aún no tienes trabajos asignados.', 'historial')}`;
}

async function openBossAddTrabajo() {
  let amistades = [];
  let personales = [];
  try {
    const [amistadesData, personalesData] = await Promise.all([
      api.get(`/api/amistades/${STATE.user.id}`),
      api.get(`/api/trabajo/jefe/${STATE.user.id}/personal`)
    ]);
    amistades = amistadesData.amistades || [];
    personales = personalesData.trabajadores || [];
  } catch (ex) { toast(ex.message); return; }

  const opcionesAmistad = amistades.map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.nombreCompleto || a.username)}</option>`).join('');
  const opcionesPersonal = personales.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.nombre)}</option>`).join('');
  const tieneAmistades = amistades.length > 0;
  const tienePersonales = personales.length > 0;

  openModal('Añadir trabajo', `
    <label>Tipo de empleado<select id="boss-f-trabajo-tipo" onchange="cambiarTipoEmpleadoBoss()">
      ${tieneAmistades ? '<option value="amistad">Amistad con cuenta</option>' : ''}
      <option value="personal">Personalizado</option>
    </select></label>
    <div id="boss-f-trabajo-amistad-wrap" style="${tieneAmistades ? '' : 'display:none;'}">
      <label>Enviar a amistad<select id="boss-f-trabajo-amigo">${opcionesAmistad}</select></label>
    </div>
    <div id="boss-f-trabajo-personal-wrap" style="display:none;">
      ${tienePersonales ? `<label>Trabajador personalizado<select id="boss-f-trabajo-personal" onchange="cambiarPersonalExistenteBoss()"><option value="__nuevo__">+ Nuevo trabajador personalizado</option>${opcionesPersonal}</select></label>` : ''}
      <div id="boss-f-trabajo-nombre-wrap">
        <label>Nombre de referencia<input id="boss-f-trabajo-nombre" type="text" maxlength="80" placeholder="Ej. Carlos" required></label>
      </div>
    </div>
    <label>Lugar<input id="boss-f-trabajo-lugar" type="text" placeholder="Ej. Manga - Fontana" required></label>
    <label>Fecha<input id="boss-f-trabajo-fecha" type="date" required></label>
    <div class="row-2"><label>Hora inicio<input id="boss-f-trabajo-hi" type="time" required></label><label>Hora fin<input id="boss-f-trabajo-hf" type="time" required></label></div>
    <label>Descripción (opcional)<textarea id="boss-f-trabajo-desc" placeholder="Notas sobre este trabajo..."></textarea>
    <p class="field-error" id="boss-f-trabajo-error"></p>
    <button class="btn-primary" id="boss-f-trabajo-submit" type="button" onclick="submitBossTrabajo()">Añadir trabajo</button>`);
  const fecha = $('#boss-f-trabajo-fecha');
  if (fecha && typeof fechaLocalISO === 'function') fecha.value = fechaLocalISO();
  cambiarTipoEmpleadoBoss();
}

function cambiarTipoEmpleadoBoss() {
  const tipo = $('#boss-f-trabajo-tipo')?.value || 'personal';
  const amistad = $('#boss-f-trabajo-amistad-wrap');
  const personal = $('#boss-f-trabajo-personal-wrap');
  if (!amistad || !personal) return;
  amistad.style.display = tipo === 'amistad' ? '' : 'none';
  personal.style.display = tipo === 'personal' ? '' : 'none';
  if (tipo === 'personal') cambiarPersonalExistenteBoss();
  const btn = $('#boss-f-trabajo-submit');
  if (btn) btn.textContent = tipo === 'amistad' ? 'Enviar trabajo' : 'Añadir trabajo personalizado';
}

function cambiarPersonalExistenteBoss() {
  const select = $('#boss-f-trabajo-personal');
  const nombreWrap = $('#boss-f-trabajo-nombre-wrap');
  if (!select || !nombreWrap) return;
  const esNuevo = select.value === '__nuevo__';
  nombreWrap.style.display = esNuevo ? '' : 'none';
}

async function submitBossTrabajo() {
  const tipo = $('#boss-f-trabajo-tipo')?.value || 'personal';
  const empleadoId = tipo === 'amistad' ? $('#boss-f-trabajo-amigo')?.value : null;
  const trabajadorId = tipo === 'personal' && $('#boss-f-trabajo-personal')?.value !== '__nuevo__' ? $('#boss-f-trabajo-personal')?.value : '';
  const nombre = tipo === 'personal' && !trabajadorId ? $('#boss-f-trabajo-nombre')?.value.trim() : '';
  const lugar = $('#boss-f-trabajo-lugar')?.value.trim();
  const fecha = $('#boss-f-trabajo-fecha')?.value;
  const hi = $('#boss-f-trabajo-hi')?.value;
  const hf = $('#boss-f-trabajo-hf')?.value;
  const descripcion = $('#boss-f-trabajo-desc')?.value.trim() || '';
  const err = $('#boss-f-trabajo-error');
  if ((tipo === 'amistad' && !empleadoId) || (tipo === 'personal' && !trabajadorId && !nombre) || !lugar || !fecha || !hi || !hf) {
    if (err) err.textContent = tipo === 'amistad' ? 'Completa amistad, lugar, fecha y horario.' : 'Selecciona un trabajador o escribe un nombre, además de lugar, fecha y horario.';
    return;
  }
  const inicio = new Date(`${fecha}T${hi}`); const fin = new Date(`${fecha}T${hf}`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio) { if (err) err.textContent = 'La hora final debe ser posterior a la hora inicial.'; return; }
  try {
    if (tipo === 'amistad') {
      await api.post(`/api/trabajo/jefe/${STATE.user.id}/solicitudes`, {
        empleadoId, lugar, fecha,
        dia: new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(new Date(`${fecha}T12:00:00`)),
        horaInicio: hi, horaFin: hf, descripcion
      });
      closeModal();
      toast('Trabajo enviado. Esperando aceptación.');
    } else {
      await api.post(`/api/trabajo/jefe/${STATE.user.id}/personal`, {
        trabajadorId, nombre, lugar, fecha,
        dia: new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(new Date(`${fecha}T12:00:00`)),
        horaInicio: hi, horaFin: hf, descripcion
      });
      closeModal();
      await loadHistorial();
      toast(trabajadorId ? 'Trabajo añadido al trabajador personalizado.' : 'Trabajador personalizado y trabajo añadidos.');
    }
  } catch (ex) { if (err) err.textContent = ex.message; }
}

async function abrirDesdeHistorial(empleadoId) {
  const found = (STATE.historial || []).find(l => l.empleadoId === empleadoId);
  STATE.jefeView = {
    empleadoId,
    empleadoUsername: (found && (found.empleadoNombre || found.empleadoUsername)) || 'Empleado',
    empleadoTipo: found ? (found.empleadoTipo || 'usuario') : 'usuario',
    lugares: found ? (found.lugares || []) : [],
    turnos: found ? (found.turnos || []) : [],
    materias: [], actividades: [], eventos: [],
    activeSubTab: 'trabajo', contextoRestringido: true
  };
  STATE.viewMode = 'jefe-ver';
  trabajoVistaActual = TRABAJO_VISTAS.HORARIOS;
  trabajoFiltroJefe = null;
  trabajoFiltroPago = 'todos';
  await cambiarSubTabJefe('trabajo');
}

async function refrescarJefeTrabajo() {
  if (!STATE.jefeView) return;
  let d;
  if (STATE.jefeView.empleadoTipo === 'personal') {
    d = await api.get(`/api/trabajo/jefe/${STATE.user.id}/personal/${STATE.jefeView.empleadoId}`);
    d.empleadoUsername = d.trabajador?.nombre || 'Empleado personalizado';
  } else {
    d = await api.get(`/api/verificar/datos/${STATE.jefeView.empleadoId}?jefeId=${STATE.user.id}`);
  }
  STATE.jefeView.lugares = d.lugares;
  STATE.jefeView.turnos = d.turnos;
  if (d.empleadoUsername) STATE.jefeView.empleadoUsername = d.empleadoUsername;
  STATE.jefeView.esEstudiante = d.esEstudiante;
}

async function cambiarSubTabJefe(tab) {
  if (!STATE.jefeView) return;
  if (STATE.jefeView.contextoRestringido && tab !== 'trabajo') {
    STATE.jefeView.activeSubTab = 'trabajo'; await refrescarJefeTrabajo(); renderJefeView(); toast('En el perfil de un empleado solo puedes consultar Trabajo por ahora.'); return;
  }
  STATE.jefeView.activeSubTab = tab;
  try {
    if (tab === 'trabajo') await refrescarJefeTrabajo();
    else if (tab === 'estudio') { const d = await api.get(`/api/verificar/estudio/${STATE.jefeView.empleadoId}?jefeId=${STATE.user.id}`); STATE.jefeView.materias = d.materias; STATE.jefeView.actividades = d.actividades; }
    else if (tab === 'evento') STATE.jefeView.eventos = await api.get(`/api/verificar/evento/${STATE.jefeView.empleadoId}?jefeId=${STATE.user.id}`);
    renderJefeView();
  } catch (ex) { toast(ex.message); }
}

function renderJefeView() {
  const d = STATE.jefeView; const sub = d.activeSubTab;
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
  STATE.viewMode = 'jefe-historial'; STATE.jefeView = null; trabajoVistaActual = TRABAJO_VISTAS.HORARIOS; trabajoFiltroJefe = null; trabajoFiltroPago = 'todos'; trabajoModoBorrado = false; loadHistorial();
}
