/* ============================================================
   Riverospay · TRABAJO: turnos, pago, jefe asignado, eliminacion
   Extraído de app.js (refactor de estructura, sin cambios de lógica)
   ============================================================ */

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
