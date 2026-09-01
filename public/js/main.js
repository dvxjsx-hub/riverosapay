/* ============================================================
   Riverospay · ARRANQUE: wiring de drawer/perfil/modal + bootstrap DOMContentLoaded
   ============================================================ */

function cargarModuloAmistades() {
  return new Promise((resolve, reject) => {
    if (typeof openAmistades === 'function') return resolve();
    const script = document.createElement('script');
    script.src = 'js/amistades/amistades.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar el módulo de amistades.'));
    document.head.appendChild(script);
  });
}

function prepararDrawerAmistades() {
  const drawer = $('#drawer');
  if (!drawer) return;

  // Compartir/Verificar son parte del sistema anterior y ya no se muestran.
  $('#drawer-compartir')?.classList.add('hidden');
  $('#drawer-verificar')?.classList.add('hidden');

  let item = $('#drawer-amistades');
  if (!item) {
    item = document.createElement('button');
    item.className = 'drawer-item';
    item.id = 'drawer-amistades';
    item.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.8 19c.7-3.2 2.5-4.8 5.2-4.8s4.5 1.6 5.2 4.8"/><path d="M14.5 14.8c2.8.1 4.7 1.4 5.3 4.2"/>
      </svg>
      Amistades
    `;
    const referencia = $('#drawer-notificaciones') || $('#drawer-informacion');
    drawer.insertBefore(item, referencia);
  }
}

function setupDrawer() {
  prepararDrawerAmistades();

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

  $('#drawer-amistades').addEventListener('click', () => {
    closeDrawer();
    openAmistades();
  });

  // Compartir y Verificar pertenecen al flujo antiguo y quedan fuera del menú.
  $('#drawer-compartir').classList.add('hidden');
  $('#drawer-verificar').classList.add('hidden');
  $('#drawer-notificaciones').addEventListener('click', () => { closeDrawer(); openNotificaciones(); });
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
    STATE.amistades = [];
    STATE.notificaciones = [];
    STATE.jefeView = null;
    STATE.pendingRequest = null;
    STATE.onboardingPending = false;

    showScreen('screen-auth');
    setAuthMode('login');
    const lastUser = localStorage.getItem('riverospay_last_user');
    if (lastUser) $('#log-user').value = lastUser;
    $('#log-pass').value = '';
    setTimeout(() => $('#log-user')?.focus({ preventScroll: true }), 80);
  });
}

function setupPerfil() {
  $('#btn-perfil').addEventListener('click', openPerfil);
}

function setupModal() {
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-overlay').addEventListener('click', closeModal);
}

// En la vista de un jefe, él mismo no necesita estar en su propia lista de
// amistades para aparecer como el jefe asignado de un trabajo.
function nombreJefePorId(id) {
  if (!id) return null;
  if (STATE.viewMode === 'jefe-ver' && STATE.user && id === STATE.user.id) {
    return STATE.user.nombreCompleto || STATE.user.username;
  }
  const amigos = STATE.amistades || [];
  const a = amigos.find(x => x.id === id);
  return a ? (a.nombreCompleto || a.username) : null;
}

document.addEventListener('DOMContentLoaded', async () => {
  setupAuth();
  try {
    await cargarModuloAmistades();
  } catch (ex) {
    console.error(ex);
  }
  setupDrawer();
  setupPerfil();
  setupTabs();
  setupModal();
  setupRequestCard();
  initSplash();
});
