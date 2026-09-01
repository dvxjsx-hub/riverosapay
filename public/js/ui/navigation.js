/* ============================================================
   Riverospay · NAVEGACION: pantallas, modal, drawer, menú por modo
   Tanda 6: menú principal y control de contexto.
   ============================================================ */

function showScreen(id) {
  $all('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
}

function openModal(title, bodyHtml) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  $('#modal-overlay').classList.add('open');
  $('#modal').classList.add('open');
  setTimeout(() => {
    const first = $('#modal-body').querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
    if (first) first.focus({ preventScroll: true });
  }, 50);
}
function closeModal() {
  $('#modal-overlay').classList.remove('open');
  $('#modal').classList.remove('open');
}

function openDrawer() { $('#drawer').classList.add('open'); $('#drawer-overlay').classList.add('open'); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer-overlay').classList.remove('open'); }

function prepararDrawerOrganizador() {
  const drawer = $('#drawer');
  if (!drawer || $('#drawer-organizador')) return;
  const item = document.createElement('button');
  item.className = 'drawer-item';
  item.id = 'drawer-organizador';
  item.innerHTML = `${ICONS.home} Organizador`;
  const referencia = $('#drawer-amistades') || $('#drawer-notificaciones') || $('#drawer-informacion');
  drawer.insertBefore(item, referencia);
  item.addEventListener('click', abrirOrganizador);
}

function abrirOrganizador() {
  closeDrawer();

  if (modoActualUsuario() === 'jefe') {
    STATE.viewMode = 'jefe-historial';
    STATE.jefeView = null;
    if (typeof loadHistorial === 'function') loadHistorial();
    return;
  }

  STATE.viewMode = 'empleado';
  STATE.activeTab = null;
  $all('.tab').forEach(b => b.classList.remove('active'));
  $('#content').innerHTML = `
    <div class="empty-card" style="text-align:center;">
      <div class="empty-icon">${ICONS.home}</div>
      <h2 style="font-size:20px;margin:6px 0;">Organizador</h2>
      <p class="muted">Selecciona qué quieres organizar.</p>
      <div style="display:grid;gap:10px;margin-top:18px;">
        <button class="btn-primary" type="button" onclick="seleccionarOrganizador('trabajo')">Trabajo</button>
        <button class="btn-secondary" type="button" onclick="seleccionarOrganizador('estudio')">Estudio</button>
        <button class="btn-secondary" type="button" onclick="seleccionarOrganizador('evento')">Evento</button>
      </div>
    </div>`;
}

function seleccionarOrganizador(tab) {
  if (modoActualUsuario() !== 'empleado') return;
  const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (!btn) return;
  $all('.tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  STATE.activeTab = tab;
  if (tab === 'trabajo') loadTrabajo();
  else if (tab === 'estudio') loadEstudio();
  else if (tab === 'evento') loadEventos();
}

function configurarMenuPorRol() {
  prepararDrawerOrganizador();
  $('#drawer-compartir').classList.add('hidden');
  $('#drawer-verificar').classList.add('hidden');
  $('#drawer-notificaciones').classList.remove('hidden');
  $('#drawer-informacion').innerHTML = `${$('#drawer-informacion').querySelector('svg').outerHTML} Información app`;
  $('#tabbar').classList.toggle('hidden', modoActualUsuario() === 'jefe');
}
