/* ============================================================
   Riverospay · ARRANQUE: wiring de drawer/perfil/modal + bootstrap DOMContentLoaded
   ============================================================ */

function setupDrawer() {
  $('#btn-menu').addEventListener('click', openDrawer);
  $('#drawer-overlay').addEventListener('click', closeDrawer);

  $('#drawer-inicio').addEventListener('click', () => {
    closeDrawer();
    if (modoActualUsuario() === 'empleado') {
      $all('.tab').forEach(b => b.classList.remove('active'));
      STATE.activeTab = null;
      renderHome();
    } else {
      STATE.viewMode = 'jefe-historial';
      STATE.jefeView = null;
      renderHistorial();
    }
  });

  // Compartir deja de usarse en la nueva arquitectura de amistades.
  $('#drawer-compartir').classList.add('hidden');
  $('#drawer-compartir').addEventListener('click', () => { closeDrawer(); });
  $('#drawer-notificaciones').addEventListener('click', () => { closeDrawer(); openNotificaciones(); });
  $('#drawer-verificar').addEventListener('click', () => { closeDrawer(); openVerificar(); });
  $('#drawer-informacion').addEventListener('click', () => { closeDrawer(); openInformacion(); });

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
    STATE.onboardingPending = false;

    showScreen('screen-auth');
    setAuthMode('login');
    const lastUser = localStorage.getItem('riverospay_last_user');
    if (lastUser) $('#log-user').value = lastUser;
    $('#log-pass').value = '';
  });
}

function setupPerfil() {
  $('#btn-perfil').addEventListener('click', openPerfil);
}

function setupModal() {
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-overlay').addEventListener('click', closeModal);
}

document.addEventListener('DOMContentLoaded', () => {
  setupAuth();
  // setupRoleCards() ya no participa en el alta de cuentas nuevas.
  setupDrawer();
  setupPerfil();
  setupTabs();
  setupModal();
  setupRequestCard();
  initSplash();
});
