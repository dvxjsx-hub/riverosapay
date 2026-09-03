/* ============================================================
   Riverospay · TRABAJO
   Bloque 5: trabajos personales, jefe fijo y pagos compartidos
   ============================================================ */

const TRABAJO_VISTAS = { HORARIOS: 'horarios', FINALIZADOS: 'finalizados' };
let trabajoVistaActual = TRABAJO_VISTAS.HORARIOS;
let trabajoFiltroJefe = null;
let trabajoFiltroPago = 'todos';
let trabajoModoBorrado = false;

function fechaLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function loadTrabajo() {
  STATE.trabajo = await api.get(`/api/trabajo/${STATE.user.id}`);
  renderTrabajo();
}

function trabajoFechaReal(t) {
  if (!t.fecha) return null;
  const d = new Date(`${t.fecha}T${t.horaFin || '23:59'}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function trabajoEstaFinalizado(t) {
  const fin = trabajoFechaReal(t);
  return !!fin && fin.getTime() <= Date.now();
}

function formatearFechaTrabajo(fecha) {
  const d = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(d.getTime())) return fecha;
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }).format(d).replace(/^./, c => c.toUpperCase());
}

function trabajosVisibles(data) {
  let turnos = (data.turnos || []).filter(t => {
    const finalizado = trabajoEstaFinalizado(t);
    return trabajoVistaActual === TRABAJO_VISTAS.FINALIZADOS ? finalizado : !finalizado;
  });
  if (trabajoFiltroJefe) turnos = turnos.filter(t => t.jefeAsignadoId === trabajoFiltroJefe);
  if (trabajoVistaActual === TRABAJO_VISTAS.FINALIZADOS && trabajoFiltroPago !== 'todos') {
    turnos = turnos.filter(t => trabajoFiltroPago === 'pagados' ? !!t.pagado : !t.pagado);
  }
  return turnos.sort((a, b) => (a.fecha || '9999-99-99').localeCompare(b.fecha || '9999-99-99') || (a.horaInicio || '').localeCompare(b.horaInicio || ''));
}

function nombreJefePorId(id) {
  if (!id) return null;
  const amigos = STATE.amistades || [];
  const a = amigos.find(x => x.id === id);
  return a ? (a.nombreCompleto || a.username) : null;
}

function trabajoListHTML(data) {
  const turnos = trabajosVisibles(data);
  if (!turnos.length) {
    const texto = trabajoVistaActual === TRABAJO_VISTAS.HORARIOS ? 'No tienes trabajos próximos.' : 'No tienes trabajos finalizados con este filtro.';
    return `<div class="empty-card compact"><div class="empty-icon">${ICONS.plus}</div><h3>${texto}</h3><p class="muted">Usa el botón + para gestionar tus trabajos.</p></div>`;
  }
  const grupos = new Map();
  turnos.forEach(t => { const key = t.fecha || `legacy-${t.dia || 'sin-fecha'}`; if (!grupos.has(key)) grupos.set(key, []); grupos.get(key).push(t); });
  return Array.from(grupos.entries()).map(([fecha, lista]) => {
    const titulo = fecha.startsWith('legacy-') ? (fecha.replace('legacy-', '') || 'Sin fecha') : formatearFechaTrabajo(fecha);
    return `<section class="trabajo-fecha-group"><h2 class="trabajo-fecha-title">${escapeHtml(titulo)}</h2><div class="turno-list">${lista.map(turnoCardHTML).join('')}</div></section>`;
  }).join('');
}

function turnoCardHTML(t) {
  const data = STATE.viewMode === 'jefe-ver' ? STATE.jefeView : STATE.trabajo;
  const lugar = (data && data.lugares || []).find(l => l.id === t.lugarId);
  const nombre = lugar ? lugar.nombre : 'Trabajo';
  const estado = t.eliminacionPendiente ? `<span class="turno-estado pendiente">Pendiente</span>` : (trabajoVistaActual === TRABAJO_VISTAS.FINALIZADOS ? `<span class="turno-estado ${t.pagado ? 'pagado-label' : ''}">${t.pagado ? 'Pagado' : 'No pagado'}</span>` : '');
  return `<button class="turno-card turno-card-modern ${t.pagado ? 'pagado' : ''}" onclick="${trabajoModoBorrado ? `pedirConfirmacionEliminar('${t.id}')` : `openTurnoDetail('${t.id}')`}">
    <span class="turno-card-main"><strong>${escapeHtml(nombre)}</strong><span class="turno-hora">${escapeHtml(t.horaInicio)} – ${escapeHtml(t.horaFin)}</span></span>
    ${estado}<span class="turno-info-icon">ⓘ</span>
  </button>`;
}

function renderTrabajo() {
  const selector = `<button class="trabajo-vista-selector" style="width:100%;display:flex;justify-content:space-between;align-items:center;background:rgba(21,92,49,.08);border:1.5px solid var(--line);border-radius:var(--radius-md);padding:14px 16px;color:var(--green-900);font-family:var(--font-display);font-weight:700;font-size:15px;cursor:pointer;" type="button" onclick="abrirSelectorTrabajo()"><span>${trabajoVistaActual === TRABAJO_VISTAS.HORARIOS ? 'Horarios' : 'Finalizados'}</span><span>⌄</span></button>`;
  const acciones = `<button class="trabajo-plus" style="width:56px;height:56px;border-radius:50%;border:none;background:var(--green-700);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-card);cursor:pointer;" type="button" onclick="abrirAccionesTrabajo()" aria-label="Acciones de trabajo">${ICONS.plus}</button>`;
  const resumen = trabajoVistaActual === TRABAJO_VISTAS.FINALIZADOS ? `<div class="muted" style="font-size:12px;text-align:center;">${trabajoFiltroPago === 'todos' ? 'Todos los estados de pago' : trabajoFiltroPago === 'pagados' ? 'Solo pagados' : 'Solo no pagados'}</div>` : '';
  $('#content').innerHTML = `<div>${selector}</div>${resumen}${trabajoListHTML(STATE.trabajo)}<div style="display:flex;justify-content:flex-end;margin-top:auto;padding-top:4px;">${acciones}</div>`;
}

function abrirSelectorTrabajo() {
  openModal('Trabajo', `<button class="btn-primary" type="button" onclick="cambiarVistaTrabajo('horarios')">Horarios</button><button class="btn-secondary" type="button" onclick="cambiarVistaTrabajo('finalizados')">Finalizados</button>`);
}

function cambiarVistaTrabajo(vista) {
  trabajoVistaActual = vista;
  trabajoFiltroJefe = null;
  trabajoFiltroPago = 'todos';
  trabajoModoBorrado = false;
  closeModal();
  if (STATE.viewMode === 'jefe-ver' && typeof renderJefeView === 'function') {
    renderJefeView();
  } else {
    renderTrabajo();
  }
}

function abrirAccionesTrabajo() {
  const opciones = trabajoVistaActual === TRABAJO_VISTAS.HORARIOS
    ? `<button class="btn-primary" type="button" onclick="openAddTrabajo()">${ICONS.plus} Añadir trabajo</button><button class="btn-secondary" type="button" onclick="abrirFiltroJefe()">Filtrar por jefe</button><button class="btn-ghost-danger" style="width:100%;margin-top:8px;" type="button" onclick="activarBorradoTrabajo()">Borrar trabajo</button>`
    : `<button class="btn-secondary" type="button" onclick="abrirFiltroPago()">Filtrar pago</button><button class="btn-secondary" type="button" onclick="abrirFiltroJefe(true)">Filtrar por jefe</button><button class="btn-ghost-danger" style="width:100%;margin-top:8px;" type="button" onclick="activarBorradoTrabajo()">Borrar trabajo</button>`;
  openModal('Acciones de trabajo', opciones);
}

async function openAddTrabajo() {
  const esJefeAgregando = STATE.viewMode === 'jefe-ver';
  let amistadSelectHtml = '';
  if (!esJefeAgregando) {
    try {
      const data = await api.get(`/api/amistades/${STATE.user.id}`);
      STATE.amistades = data.amistades || [];
      const opciones = STATE.amistades.map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.nombreCompleto || a.username)}</option>`).join('');
      amistadSelectHtml = `<label>Jefe (amistad)<select id="f-trabajo-jefe"><option value="">Sin jefe · Trabajo personal</option>${opciones}</select></label><p class="field-hint">El jefe queda fijado al crear el trabajo. Si eliges “Sin jefe”, será un trabajo personal.</p>`;
    } catch (ex) { amistadSelectHtml = '<p class="field-hint">No se pudieron cargar tus amistades.</p>'; }
  }
  openModal('Añadir trabajo', `<label>Lugar<input id="f-trabajo-lugar" type="text" placeholder="Ej. Manga - Fontana" required></label><label>Fecha<input id="f-trabajo-fecha" type="date" required></label><div class="row-2"><label>Hora inicio<input id="f-trabajo-hi" type="time" required></label><label>Hora fin<input id="f-trabajo-hf" type="time" required></label></div><label>Descripción (opcional)<textarea id="f-trabajo-desc" placeholder="Notas sobre este trabajo..."></textarea>${amistadSelectHtml}<p class="field-error" id="f-trabajo-error"></p><button class="btn-primary" onclick="submitTrabajo()">Guardar trabajo</button>`);
  const fecha = $('#f-trabajo-fecha');
  if (fecha) fecha.value = fechaLocalISO();
}

async function submitTrabajo() {
  const lugar = $('#f-trabajo-lugar').value.trim();
  const fecha = $('#f-trabajo-fecha').value;
  const hi = $('#f-trabajo-hi').value;
  const hf = $('#f-trabajo-hf').value;
  const desc = $('#f-trabajo-desc').value.trim();
  const err = $('#f-trabajo-error');
  if (!lugar || !fecha || !hi || !hf) { err.textContent = 'Completa lugar, fecha y horario.'; return; }
  const inicio = new Date(`${fecha}T${hi}`);
  const fin = new Date(`${fecha}T${hf}`);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio) { err.textContent = 'La hora final debe ser posterior a la hora inicial.'; return; }
  const esJefe = STATE.viewMode === 'jefe-ver';
  const selectJefe = $('#f-trabajo-jefe');
  try {
    await api.post(`/api/trabajo/${targetEmpleadoId()}/turnos`, { lugar, fecha, dia: new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(new Date(`${fecha}T12:00:00`)), horaInicio: hi, horaFin: hf, descripcion: desc, jefeAsignadoId: selectJefe ? (selectJefe.value || null) : null, actorJefeId: esJefe ? STATE.user.id : undefined, actorJefeUsername: esJefe ? STATE.user.username : undefined });
    closeModal(); toast('Trabajo añadido');
    if (STATE.viewMode === 'jefe-ver') { await refrescarJefeTrabajo(); renderJefeView(); } else await loadTrabajo();
  } catch (ex) { err.textContent = ex.message; }
}

async function abrirFiltroJefe() {
  try {
    const data = await api.get(`/api/amistades/${STATE.user.id}`);
    STATE.amistades = data.amistades || [];
    const fuente = STATE.viewMode === 'jefe-ver' ? (STATE.jefeView || { turnos: [] }) : (STATE.trabajo || { turnos: [] });
    const ids = new Set((fuente.turnos || []).map(t => t.jefeAsignadoId).filter(Boolean));
    const jefes = STATE.amistades.filter(a => ids.has(a.id));
    if (!jefes.length) { openModal('Filtrar por jefe', '<p class="muted">No hay jefes registrados en tus trabajos.</p><button class="btn-secondary" onclick="closeModal()">Cerrar</button>'); return; }
    openModal('Selecciona un jefe', `<button class="btn-secondary" type="button" onclick="aplicarFiltroJefe(null)">Todos los jefes</button>${jefes.map(j => `<button class="btn-secondary" style="margin-top:8px;" type="button" onclick="aplicarFiltroJefe('${j.id}')">${escapeHtml(j.nombreCompleto || j.username)}</button>`).join('')}`);
  } catch (ex) { toast(ex.message); }
}

function aplicarFiltroJefe(id) { trabajoFiltroJefe = id || null; closeModal(); if (STATE.viewMode === 'jefe-ver' && typeof renderJefeView === 'function') renderJefeView(); else renderTrabajo(); }

function abrirFiltroPago() {
  openModal('Filtrar finalizados', `<button class="btn-primary" type="button" onclick="aplicarFiltroPago('todos')">Todos</button><button class="btn-secondary" style="margin-top:8px;" type="button" onclick="aplicarFiltroPago('pagados')">Pagados</button><button class="btn-secondary" style="margin-top:8px;" type="button" onclick="aplicarFiltroPago('no-pagados')">No pagados</button>`);
}

function aplicarFiltroPago(valor) { trabajoFiltroPago = valor; closeModal(); if (STATE.viewMode === 'jefe-ver' && typeof renderJefeView === 'function') renderJefeView(); else renderTrabajo(); }
function activarBorradoTrabajo() { closeModal(); trabajoModoBorrado = true; if (STATE.viewMode === 'jefe-ver' && typeof renderJefeView === 'function') renderJefeView(); else renderTrabajo(); toast('Selecciona el trabajo que quieres borrar.'); }

function openTurnoDetail(turnoId) {
  const isJefe = STATE.viewMode === 'jefe-ver';
  const data = isJefe ? STATE.jefeView : STATE.trabajo;
  const turno = data.turnos.find(t => t.id === turnoId);
  if (!turno) return;
  const lugar = data.lugares.find(l => l.id === turno.lugarId);
  const jefe = nombreJefePorId(turno.jefeAsignadoId);
  const esPersonal = !turno.jefeAsignadoId;
  const valorActual = turno.valor !== null && turno.valor !== undefined ? turno.valor : '';
  const finalizado = trabajoEstaFinalizado(turno) || turno.finalizado === true;

  let valorHtml;
  if (isJefe) {
    valorHtml = `<label>Valor del día (opcional)<input id="f-valor" type="number" min="0" step="0.01" value="${valorActual}" placeholder="0.00"></label><button class="btn-secondary" onclick="guardarValor('${turno.id}')">Guardar valor</button>`;
  } else if (esPersonal && !finalizado && turno.congelado !== true) {
    valorHtml = `<div class="detail-row"><span>Trabajo personal</span><span>Sin jefe</span></div><label>Valor del pago<input id="f-valor-empleado" type="number" min="0" step="0.01" value="${valorActual}" placeholder="0.00"></label><label style="display:flex;align-items:center;gap:10px;cursor:pointer;"><input id="f-pagado-empleado" type="checkbox" ${turno.pagado ? 'checked' : ''}> Marcar como pagado</label><button class="btn-secondary" onclick="guardarPagoEmpleado('${turno.id}')">Guardar pago</button><p class="field-hint">Este es un trabajo personal. Puedes registrar y llevar aquí tu propio pago.</p>`;
  } else if (esPersonal) {
    valorHtml = `<div class="detail-row"><span>Trabajo personal</span><span>Sin jefe</span></div><div class="detail-row"><span>Pago</span><span>${valorActual === '' ? 'Sin registrar' : dineroCO(valorActual)} · ${turno.pagado ? 'Pagado' : 'No pagado'}</span></div><div class="notice-box">${turno.congelado === true ? 'Trabajo congelado. Ya no admite cambios.' : 'El trabajo ya finalizó. El pago ya no puede ser editado.'}</div>`;
  } else {
    valorHtml = `<div class="detail-row"><span>Jefe</span><span>${escapeHtml(jefe || 'Jefe asignado')}</span></div><div class="detail-row"><span>Pago</span><span>${valorActual === '' ? 'Sin registrar' : dineroCO(valorActual)} · ${turno.pagado ? 'Pagado' : 'No pagado'}</span></div><div class="notice-box">Solo el BOSS asignado puede añadir o modificar el pago de este trabajo.</div>`;
  }

  const estadoHtml = isJefe ? `<div class="toggle-pagado"><button class="${!turno.pagado ? 'active no' : ''}" onclick="setPagado('${turno.id}', false)">Día no pagado</button><button class="${turno.pagado ? 'active si' : ''}" onclick="setPagado('${turno.id}', true)">Día pagado</button></div>` : `<div class="detail-row"><span>Estado</span><span>${turno.pagado ? 'Pagado' : 'No pagado'}</span></div>`;
  const jefeHtml = isJefe ? `<div class="detail-row"><span>Jefe</span><span>${escapeHtml(jefe || 'Sin jefe')}</span></div>` : '';
  const congeladoHtml = isJefe && trabajoVistaActual === TRABAJO_VISTAS.FINALIZADOS
    ? (turno.congelado === true
      ? `<div class="notice-box">Trabajo congelado. Ya no admite cambios.</div>`
      : `<button class="btn-secondary" style="width:100%;" onclick="congelarTrabajo('${turno.id}')">Congelar trabajo</button>`)
    : '';
  const eliminarHtml = !turno.eliminacionPendiente ? `<button class="btn-ghost-danger" style="width:100%;" onclick="pedirConfirmacionEliminar('${turno.id}')">Eliminar trabajo</button>` : `<div class="notice-box">Solicitud de eliminación pendiente.</div>`;
  openModal('Detalle del trabajo', `<div class="detail-row"><span>Lugar</span><span>${escapeHtml(lugar ? lugar.nombre : '—')}</span></div><div class="detail-row"><span>Fecha</span><span>${turno.fecha ? escapeHtml(formatearFechaTrabajo(turno.fecha)) : escapeHtml(turno.dia || '—')}</span></div><div class="detail-row"><span>Hora</span><span>${escapeHtml(turno.horaInicio)} – ${escapeHtml(turno.horaFin)}</span></div><div><p class="muted" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;margin:0 0 6px;">Descripción</p><p style="margin:0;font-size:14px;">${turno.descripcion ? escapeHtml(turno.descripcion) : 'Sin descripción.'}</p></div>${jefeHtml}${valorHtml}${estadoHtml}${congeladoHtml}${eliminarHtml}`);
}

async function guardarPagoEmpleado(turnoId) {
  const raw = $('#f-valor-empleado').value;
  const pagado = $('#f-pagado-empleado').checked;
  if (raw !== '' && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) { toast('El valor del trabajo no es válido.'); return; }
  try {
    await api.patch(`/api/trabajo/turnos/${turnoId}/pago-empleado`, { valor: raw === '' ? null : Number(raw), pagado });
    toast('Pago guardado');
    await loadTrabajo();
    openTurnoDetail(turnoId);
  } catch (ex) { toast(ex.message); }
}

function pedirConfirmacionEliminar(turnoId) {
  const isJefe = STATE.viewMode === 'jefe-ver';
  const data = isJefe ? STATE.jefeView : STATE.trabajo;
  const turno = data.turnos.find(t => t.id === turnoId);
  const avisoExtra = (!isJefe && turno && !turno.pagado && turno.jefeAsignadoId) ? '<p class="muted" style="font-size:12.5px;">Como no está pagado y tiene un jefe asignado, tu jefe tendrá que confirmarlo.</p>' : '';
  $('#modal-title').textContent = 'Eliminar trabajo';
  $('#modal-body').innerHTML = `<p style="margin:0;">¿Estás seguro de que quieres eliminar este trabajo?</p>${avisoExtra}<div class="notif-actions"><button class="btn-secondary" onclick="openTurnoDetail('${turnoId}')">Cancelar</button><button class="btn-ghost-danger" onclick="eliminarTrabajoDefinitivo('${turnoId}')">Sí, eliminar</button></div>`;
}

async function eliminarTrabajoDefinitivo(turnoId) {
  const isJefe = STATE.viewMode === 'jefe-ver';
  try {
    const body = isJefe ? { actorRole: 'jefe', jefeId: STATE.user.id, actorJefeUsername: STATE.user.username } : { actorRole: 'empleado' };
    const data = await api.delete(`/api/trabajo/turnos/${turnoId}`, body);
    closeModal(); trabajoModoBorrado = false;
    if (data.pendiente) toast('Se envió la solicitud a tu jefe para confirmar.'); else toast('Trabajo eliminado');
    if (isJefe) { await refrescarJefeTrabajo(); renderJefeView(); } else await loadTrabajo();
  } catch (ex) { toast(ex.message); }
}

async function confirmarEliminacionPendiente(turnoId) {
  try { await api.post(`/api/trabajo/turnos/${turnoId}/confirmar-eliminacion`, { jefeId: STATE.user.id, jefeUsername: STATE.user.username }); closeModal(); toast('Trabajo eliminado'); await refrescarJefeTrabajo(); renderJefeView(); }
  catch (ex) { toast(ex.message); }
}

async function rechazarEliminacionPendiente(turnoId) {
  try { await api.post(`/api/trabajo/turnos/${turnoId}/rechazar-eliminacion`, { jefeId: STATE.user.id, jefeUsername: STATE.user.username }); toast('Solicitud rechazada'); await refrescarJefeTrabajo(); openTurnoDetail(turnoId); }
  catch (ex) { toast(ex.message); }
}

async function setPagado(turnoId, pagado) {
  try { await api.patch(`/api/trabajo/turnos/${turnoId}`, { pagado, actorJefeUsername: STATE.user.username }); toast(pagado ? 'Marcado como pagado' : 'Marcado como no pagado'); await refrescarJefeTrabajo(); openTurnoDetail(turnoId); }
  catch (ex) { toast(ex.message); }
}

async function guardarValor(turnoId) {
  const raw = $('#f-valor').value;
  try { await api.patch(`/api/trabajo/turnos/${turnoId}`, { valor: raw === '' ? null : Number(raw) }); toast('Valor guardado'); await refrescarJefeTrabajo(); openTurnoDetail(turnoId); }
  catch (ex) { toast(ex.message); }
}

/* ============================================================
   Bloque 5: funciones adicionales
   ============================================================ */

async function congelarTrabajo(turnoId) {
  openModal('Congelar trabajo', `<p style="margin:0 0 12px;">Esta acción es permanente.</p><p class="muted" style="margin:0;">Después de congelarlo, el trabajo y su pago ya no podrán editarse. No se puede descongelar.</p><div class="notif-actions" style="display:flex;gap:8px;margin-top:16px;"><button class="btn-secondary" type="button" onclick="closeModal()">Cancelar</button><button class="btn-primary" type="button" onclick="confirmarCongelacionTrabajo('${turnoId}')">Confirmar</button></div>`);
}

async function confirmarCongelacionTrabajo(turnoId) {
  try {
    await api.post(`/api/trabajo/turnos/${turnoId}/congelar`, {});
    toast('Trabajo congelado');
    await refrescarJefeTrabajo();
    openTurnoDetail(turnoId);
  } catch (ex) { toast(ex.message); }
}
