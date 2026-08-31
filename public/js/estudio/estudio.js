/* ============================================================
   Riverospay · ESTUDIO: materias y actividades pendientes
   Extraído de app.js (refactor de estructura, sin cambios de lógica)
   ============================================================ */

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
        ? items.map(m => `<div class="materia-row">
            <span class="materia-nombre">${escapeHtml(m.nombre)}</span>
            <span class="materia-hora">${m.horaInicio} – ${m.horaFin}</span>
            ${editable ? `<button class="materia-del" onclick="eliminarMateria('${m.id}')" title="Eliminar clase" aria-label="Eliminar clase">${ICONS.trash}</button>` : ''}
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

async function eliminarMateria(id) {
  const materia = (STATE.estudio || []).find(m => m.id === id);
  const nombre = materia ? materia.nombre : 'esta clase';
  if (!confirm(`¿Eliminar "${nombre}" del horario?\n\nEsta acción borrará la clase de forma permanente.`)) return;

  try {
    await api.delete(`/api/estudio/materias/${id}`);
    STATE.estudio = (STATE.estudio || []).filter(m => m.id !== id);
    renderEstudio();
    toast('Clase eliminada');
  } catch (ex) {
    toast(ex.message);
  }
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
