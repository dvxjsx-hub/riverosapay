/* ============================================================
   Riverospay · EVENTOS
   Extraído de app.js (refactor de estructura, sin cambios de lógica)
   ============================================================ */

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
