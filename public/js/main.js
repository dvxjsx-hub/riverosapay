/* ============================================================
   Riverospay · ARRANQUE: wiring de drawer/perfil/modal + bootstrap DOMContentLoaded
   Extraído de app.js (refactor de estructura, sin cambios de lógica)
   ============================================================ */

/* ================= DRAWER (wiring) ================= */
function setupDrawer() {
  $('#btn-menu').addEventListener('click', openDrawer);
  $('#drawer-overlay').addEventListener('click', closeDrawer);

  $('#drawer-inicio').addEventListener('click', () => {
    closeDrawer();
    if (STATE.user.role === 'empleado') {
      $all('.tab').forEach(b => b.classList.remove('active'));
      STATE.activeTab = null;
      renderHome();
    } else if (STATE.user.role === 'jefe') {
      STATE.viewMode = 'jefe-historial';
      STATE.jefeView = null;
      renderHistorial();
    }
  });

  $('#drawer-compartir').addEventListener('click', () => { closeDrawer(); openCompartir(); });
  $('#drawer-notificaciones').addEventListener('click', () => { closeDrawer(); openNotificaciones(); });
  $('#drawer-verificar').addEventListener('click', () => { closeDrawer(); openVerificar(); });
  $('#drawer-informacion').addEventListener('click', () => { closeDrawer(); openInformacion(); });
}

/* ================= PERFIL (wiring) ================= */
function setupPerfil() {
  $('#btn-perfil').addEventListener('click', openPerfil);
}

/* ================= MODAL (wiring) ================= */
function setupModal() {
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-overlay').addEventListener('click', closeModal);
}

/* ---------- ARRANQUE ---------- */
document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  setupRoleCards();
  setupDrawer();
  setupPerfil();
  setupTabs();
  setupModal();
  setupRequestCard();
  initSplash();
});
