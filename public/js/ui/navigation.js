/* ============================================================
   Riverospay · NAVEGACION: pantallas, modal, drawer, menu por rol
   Extraído de app.js (refactor de estructura, sin cambios de lógica)
   ============================================================ */

/* ---------- navegación entre pantallas ---------- */
function showScreen(id) {
  $all('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
}

/* ---------- MODAL genérico ---------- */
function openModal(title, bodyHtml) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  $('#modal-overlay').classList.add('open');
  $('#modal').classList.add('open');
}
function closeModal() {
  $('#modal-overlay').classList.remove('open');
  $('#modal').classList.remove('open');
}

/* ---------- DRAWER ---------- */
function openDrawer() { $('#drawer').classList.add('open'); $('#drawer-overlay').classList.add('open'); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer-overlay').classList.remove('open'); }

function configurarMenuPorRol() {
  if (STATE.user.role === 'empleado') {
    $('#drawer-compartir').classList.remove('hidden');
    $('#drawer-notificaciones').classList.remove('hidden');
    $('#drawer-verificar').classList.add('hidden');
    $('#tabbar').classList.remove('hidden');
  } else if (STATE.user.role === 'jefe') {
    $('#drawer-verificar').classList.remove('hidden');
    $('#drawer-compartir').classList.add('hidden');
    $('#drawer-notificaciones').classList.add('hidden');
    $('#tabbar').classList.add('hidden');
  }
}
