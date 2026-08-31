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

  // Cerrar sesión: solo termina la sesión local. No borra datos del servidor/MongoDB.
  $('#drawer-logout').addEventListener('click', () => {
    closeDrawer();
    if (STATE.socket) {
      STATE.socket.disconnect();
      STATE.socket = null;
    }

    STATE.user = null;
    STATE.viewMode = 'empleado';
    STATE.activeTab = null;
    STATE.trabajo = { lugares: [], turnos: [] };
    STATE.estudio = [];
    STATE.actividades = [];
    STATE.eventos = [];
    STATE.historial = [];
    STATE.notificaciones = [];
    STATE.jefeView = null;
    STATE.pendingRequest = null;

    // Se conserva riverospay_last_user para que el usuario pueda volver a entrar
    // cómodamente. Los datos de la cuenta siguen íntegros en MongoDB.
    showScreen('screen-auth');
    setAuthMode('login');
    const lastUser = localStorage.getItem('riverospay_last_user');
    if (lastUser) $('#log-user').value = lastUser;
    $('#log-pass').value = '';
  });
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
