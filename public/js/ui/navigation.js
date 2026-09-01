/* ============================================================
   Riverospay · NAVEGACION: pantallas, modal, drawer, menu por modo
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
}
function closeModal() {
  $('#modal-overlay').classList.remove('open');
  $('#modal').classList.remove('open');
}

function openDrawer() { $('#drawer').classList.add('open'); $('#drawer-overlay').classList.add('open'); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer-overlay').classList.remove('open'); }

function configurarMenuPorRol() {
  // Desde la arquitectura de amistades, todas las cuentas tienen acceso a
  // Amistades y Notificaciones. La antigua Verificación queda fuera del menú.
  $('#drawer-compartir').classList.add('hidden');
  $('#drawer-verificar').classList.add('hidden');
  $('#drawer-notificaciones').classList.remove('hidden');
  $('#drawer-informacion').innerHTML = `${$('#drawer-informacion').querySelector('svg').outerHTML} Información app`;
  $('#tabbar').classList.toggle('hidden', modoActualUsuario() === 'jefe');
}
