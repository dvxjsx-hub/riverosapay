/* ============================================================
   Riverospay · ENTRADA A LA APP Y HOME
   ============================================================ */

function enterApp() {
  actualizarHeaderUsuario();
  configurarMenuPorRol();
  showScreen('screen-app');

  const modo = modoActualUsuario();

  if (modo === 'empleado') {
    STATE.viewMode = 'empleado';
    $('#tab-estudio').classList.toggle('hidden', STATE.user.esEstudiante === false);
    $all('.tab').forEach(b => b.classList.remove('active'));
    STATE.activeTab = null;
    renderHome();
    checkPendingRequests();
  } else {
    STATE.viewMode = 'jefe-historial';
    STATE.jefeView = null;
    loadHistorial();
  }
}

async function checkPendingRequests() {
  try {
    await loadNotificaciones();
    if (STATE.user.recibirNotificaciones === false) return;
    const pendiente = (STATE.notificaciones || []).find(n => n.estado === 'pendiente');
    if (pendiente) showRequestCard(pendiente);
  } catch (ex) { /* silencioso */ }
}

function renderHome() {
  $('#content').innerHTML = `
    <div class="empty-card">
      <div class="empty-icon">${ICONS.home}</div>
      <h2 style="font-size:20px;">Bienvenido</h2>
      <p class="muted">Elige Trabajo, Estudio o Evento arriba para continuar.</p>
    </div>`;
}

function setupTabs() {
  $all('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      $all('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.activeTab = btn.dataset.tab;
      if (btn.dataset.tab === 'trabajo') loadTrabajo();
      else if (btn.dataset.tab === 'estudio') loadEstudio();
      else if (btn.dataset.tab === 'evento') loadEventos();
    });
  });
}
