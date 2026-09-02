/* ============================================================
   Riverosapay · ESTUDIO: horario y actividades pendientes
   ============================================================ */

function diaActualNombre() {
  return DIAS[new Date().getDay()];
}

function minutosHora(hora) {
  const [h, m] = String(hora || '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 9999;
}

function materiasOrdenadas(materias) {
  const hoy = diaActualNombre();
  const indiceHoy = DIAS.indexOf(hoy);
  const ahora = new Date();
  const minutoActual = ahora.getHours() * 60 + ahora.getMinutes();

  const indiceDia = dia => {
    const i = DIAS.indexOf(dia);
    if (i === indiceHoy) return 0;
    return (i - indiceHoy + DIAS.length) % DIAS.length;
  };

  return [...materias].sort((a, b) => {
    const da = indiceDia(a.dia);
    const db = indiceDia(b.dia);
    if (da !== db) return da - db;

    // En el día actual, las clases ya pasadas aparecen primero.
    if (a.dia === hoy && b.dia === hoy) {
      const aPasada = minutosHora(a.horaFin) <= minutoActual;
      const bPasada = minutosHora(b.horaFin) <= minutoActual;
      if (aPasada !== bPasada) return aPasada ? -1 : 1;
    }
    return minutosHora(a.horaInicio) - minutosHora(b.horaInicio);
  });
}

function estudioGridHTML(materias, editable) {
  const ordenadas = materiasOrdenadas(materias || []);
  const hoy = diaActualNombre();
  const diasOrdenados = [hoy, ...DIAS.filter(d => d !== hoy)];

  return diasOrdenados.map(dia => {
    const items = ordenadas.filter(m => m.dia === dia);
    return `<div class="day-block ${dia === hoy ? 'today' : ''}">
      <div class="day-head">
        <span class="day-name">${dia}${dia === hoy ? ' · HOY' : ''}</span>
        ${editable ? `<button class="day-add" onclick="openAddMateria('${dia}')" aria-label="Añadir materia">${ICONS.plus}</button>` : ''}
      </div>
      ${items.length
        ? items.map(m => `<div class="materia-row">
            <span class="materia-nombre">${escapeHtml(m.nombre)}</span>
            <span class="materia-hora">${m.horaInicio} – ${m.horaFin}</span>
            ${editable ? `<button class="actividad-del" onclick="openEditMateria('${m.id}')" title="Editar clase" aria-label="Editar clase">${ICONS.edit || '✎'}</button>` : ''}
          </div>`).join('')
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
  const btnEditar = `<button class="btn-add" onclick="openEditorEstudio()">${ICONS.edit || '✎'} Editar</button>`;
  $('#content').innerHTML = btnPendientes + btnEditar + estudioGridHTML(STATE.estudio, true);
}

function diaOptions(seleccionado = '') {
  return DIAS.map(d => `<option value="${d}" ${d === seleccionado ? 'selected' : ''}>${d}</option>`).join('');
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
  if (hi >= hf) { err.textContent = 'La hora de inicio debe ser anterior a la hora de fin.'; return; }
  try {
    await api.post(`/api/estudio/${STATE.user.id}`, { dia, nombre, horaInicio: hi, horaFin: hf });
    closeModal();
    toast('Materia añadida');
    loadEstudio();
  } catch (ex) { err.textContent = ex.message; }
}

function openEditorEstudio() {
  const materias = materiasOrdenadas(STATE.estudio || []);
  const lista = materias.length ? materias.map(m => `
    <div class="empty-card" style="padding:12px;margin-bottom:10px;">
      <label>Materia<input id="edit-nombre-${m.id}" value="${escapeHtml(m.nombre)}"></label>
      <label>Día<select id="edit-dia-${m.id}">${diaOptions(m.dia)}</select></label>
      <div class="row-2">
        <label>Inicio<input id="edit-hi-${m.id}" type="time" value="${m.horaInicio}"></label>
        <label>Fin<input id="edit-hf-${m.id}" type="time" value="${m.horaFin}"></label>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn-primary" onclick="guardarEdicionMateria('${m.id}')">Guardar</button>
        <button class="btn-ghost-danger" onclick="eliminarMateria('${m.id}')">Eliminar</button>
      </div>
    </div>`).join('') : '<p class="muted">Aún no tienes materias. Usa + en el día correspondiente para añadir una.</p>';
  openModal('Editar horario', `${lista}<button class="btn-secondary" onclick="closeModal()">Cerrar</button>`);
}

function openEditMateria(id) {
  const m = (STATE.estudio || []).find(x => x.id === id);
  if (!m) return;
  openModal('Editar materia', `
    <label>Materia<input id="edit-one-nombre" value="${escapeHtml(m.nombre)}"></label>
    <label>Día<select id="edit-one-dia">${diaOptions(m.dia)}</select></label>
    <div class="row-2">
      <label>Inicio<input id="edit-one-hi" type="time" value="${m.horaInicio}"></label>
      <label>Fin<input id="edit-one-hf" type="time" value="${m.horaFin}"></label>
    </div>
    <p class="field-error" id="edit-one-error"></p>
    <button class="btn-primary" onclick="guardarEdicionMateria('${m.id}', true)">Guardar cambios</button>
  `);
}

async function guardarEdicionMateria(id, cerrar = false) {
  const prefix = cerrar ? 'edit-one-' : `edit-`;
  const nombre = $(`#${prefix}nombre-${cerrar ? '' : id}`.replace(/-$/, '')).value.trim();
  const dia = $(`#${prefix}dia-${cerrar ? '' : id}`.replace(/-$/, '')).value;
  const hi = $(`#${prefix}hi-${cerrar ? '' : id}`.replace(/-$/, '')).value;
  const hf = $(`#${prefix}hf-${cerrar ? '' : id}`.replace(/-$/, '')).value;
  const err = cerrar ? $('#edit-one-error') : null;
  if (!nombre || !dia || !hi || !hf) { if (err) err.textContent = 'Completa todos los campos.'; else toast('Completa todos los campos.'); return; }
  if (hi >= hf) { if (err) err.textContent = 'La hora de inicio debe ser anterior a la hora de fin.'; else toast('La hora de inicio debe ser anterior a la hora de fin.'); return; }
  try {
    await api.patch(`/api/estudio/materias/${id}`, { dia, nombre, horaInicio: hi, horaFin: hf });
    STATE.estudio = (STATE.estudio || []).map(m => m.id === id ? { ...m, dia, nombre, horaInicio: hi, horaFin: hf } : m);
    toast('Materia actualizada');
    if (cerrar) closeModal(); else openEditorEstudio();
    renderEstudio();
  } catch (ex) { if (err) err.textContent = ex.message; else toast(ex.message); }
}

async function eliminarMateria(id) {
  const materia = (STATE.estudio || []).find(m => m.id === id);
  const nombre = materia ? materia.nombre : 'esta clase';
  if (!confirm(`¿Eliminar "${nombre}" del horario?\n\nEsta acción borrará la clase de forma permanente.`)) return;
  try {
    await api.delete(`/api/estudio/materias/${id}`);
    STATE.estudio = (STATE.estudio || []).filter(m => m.id !== id);
    closeModal();
    renderEstudio();
    toast('Clase eliminada');
  } catch (ex) { toast(ex.message); }
}

/* ---- actividades pendientes ---- */
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
        <select id="f-act-dia"><option value="">Sin día específico</option>${diaOptions()}</select>
      </label>
      <label>Nota (opcional)<input id="f-act-nota" type="text" placeholder="Detalles cortos..."></label>
      <p class="field-error" id="f-act-error"></p>
      <button class="btn-primary" onclick="submitActividad()">Añadir actividad</button>
    </div>` : '';
  const lista = actividades.length
    ? actividades.map(a => `
      <div class="actividad-row ${a.hecha ? 'hecha' : ''}">
        <input type="checkbox" ${a.hecha ? 'checked' : ''} ${editable ? `onchange="toggleActividad('${a.id}', this.checked)"` : 'disabled'}>
        <div class="actividad-info"><div class="actividad-nombre">${escapeHtml(a.nombre)}</div><div class="actividad-meta">${[a.dia, a.nota].filter(Boolean).map(escapeHtml).join(' · ') || '—'}</div></div>
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
  try { await api.post(`/api/estudio/${STATE.user.id}/actividades`, { nombre, dia, nota }); toast('Actividad añadida'); openPendientes(); }
  catch (ex) { err.textContent = ex.message; }
}

async function toggleActividad(id, hecha) {
  try { await api.patch(`/api/estudio/actividades/${id}`, { hecha }); openPendientes(); }
  catch (ex) { toast(ex.message); }
}

async function eliminarActividad(id) {
  try { await api.delete(`/api/estudio/actividades/${id}`); toast('Actividad eliminada'); openPendientes(); }
  catch (ex) { toast(ex.message); }
}
