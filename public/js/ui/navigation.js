/* ============================================================
   Riverosapay · NAVEGACION: pantallas, modal, drawer, menú por modo.
   ============================================================ */
let modalFocusTimer = null;

function showScreen(id) { $all('.screen').forEach(s => s.classList.remove('active')); const screen = $('#' + id); if (screen) screen.classList.add('active'); }

function openModal(title, bodyHtml) {
  clearTimeout(modalFocusTimer);
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  $('#modal-overlay').classList.add('open');
  $('#modal').classList.add('open');

  // En móviles, un foco programado puede llegar después del toque del usuario
  // y robar el teclado al campo que acaba de seleccionar. Solo enfocamos
  // automáticamente si el usuario todavía no ha interactuado con otro control.
  modalFocusTimer = setTimeout(() => {
    if (!$('#modal').classList.contains('open')) return;
    const active = document.activeElement;
    if (active && active !== document.body && active !== document.documentElement) return;
    const first = $('#modal-body').querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
    if (first) first.focus({ preventScroll: true });
  }, 80);
}

function closeModal() {
  clearTimeout(modalFocusTimer);
  modalFocusTimer = null;
  $('#modal-overlay').classList.remove('open');
  $('#modal').classList.remove('open');
  if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
}

function openDrawer() { $('#drawer').classList.add('open'); $('#drawer-overlay').classList.add('open'); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer-overlay').classList.remove('open'); }

function prepararDrawerOrganizador() {
  const drawer = $('#drawer'); if (!drawer || $('#drawer-organizador')) return;
  const item = document.createElement('button'); item.className = 'drawer-item'; item.id = 'drawer-organizador'; item.innerHTML = `${ICONS.home} Organizador`;
  const referencia = $('#drawer-amistades') || $('#drawer-notificaciones') || $('#drawer-informacion'); drawer.insertBefore(item, referencia); item.addEventListener('click', abrirOrganizador);
}

function prepararDrawerAmistades() {
  const drawer = $('#drawer'); if (!drawer || $('#drawer-amistades')) return;
  const item = document.createElement('button'); item.className = 'drawer-item'; item.id = 'drawer-amistades'; item.innerHTML = `${ICONS.users || ICONS.plus} Amistades`;
  const referencia = $('#drawer-notificaciones') || $('#drawer-configuracion') || $('#drawer-informacion'); drawer.insertBefore(item, referencia); item.addEventListener('click', () => { closeDrawer(); openAmistades(); });
}

function abrirOrganizador() {
  closeDrawer();
  if (modoActualUsuario() === 'jefe') { STATE.viewMode = 'jefe-historial'; STATE.jefeView = null; if (typeof loadHistorial === 'function') loadHistorial(); return; }
  STATE.viewMode = 'empleado'; STATE.activeTab = null; $all('.tab').forEach(b => b.classList.remove('active'));
  $('#content').innerHTML = `<div class="empty-card" style="text-align:center;"><div class="empty-icon">${ICONS.home}</div><h2 style="font-size:20px;margin:6px 0;">Organizador</h2><p class="muted">Selecciona qué quieres organizar.</p><div style="display:grid;gap:10px;margin-top:18px;"><button class="btn-primary" type="button" onclick="seleccionarOrganizador('trabajo')">Trabajo</button><button class="btn-secondary" type="button" onclick="seleccionarOrganizador('estudio')">Estudio</button><button class="btn-secondary" type="button" onclick="seleccionarOrganizador('evento')">Evento</button></div></div>`;
}
function seleccionarOrganizador(tab) { if (modoActualUsuario() !== 'empleado') return; const btn = document.querySelector(`.tab[data-tab="${tab}"]`); if (!btn) return; $all('.tab').forEach(b => b.classList.remove('active')); btn.classList.add('active'); STATE.activeTab = tab; if (tab === 'trabajo') loadTrabajo(); else if (tab === 'estudio') loadEstudio(); else if (tab === 'evento') loadEventos(); }
function configurarMenuPorRol() { prepararDrawerOrganizador(); prepararDrawerAmistades(); $('#drawer-compartir').classList.add('hidden'); $('#drawer-verificar').classList.add('hidden'); $('#drawer-notificaciones').classList.remove('hidden'); $('#drawer-informacion').innerHTML = `${$('#drawer-informacion').querySelector('svg').outerHTML} Información app`; $('#tabbar').classList.toggle('hidden', modoActualUsuario() === 'jefe'); }
