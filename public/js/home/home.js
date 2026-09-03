/* ============================================================
   Riverospay · ENTRADA A LA APP Y HOME
   El INICIO es solo bienvenida. El contenido funcional vive en
   Organizador.
   ============================================================ */

function enterApp() {
  actualizarHeaderUsuario();
  configurarMenuPorRol();
  showScreen('screen-app');

  // Inicio limpio: nunca muestra Trabajo/Estudio/Evento directamente.
  $('#tabbar').classList.add('hidden');
  $all('.tab').forEach(b => b.classList.remove('active'));
  STATE.activeTab = null;
  STATE.viewMode = modoActualUsuario() === 'jefe' ? 'jefe-home' : 'empleado';
  STATE.jefeView = null;
  renderHome();
  if (modoActualUsuario() === 'empleado') checkPendingRequests();
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
  const modo = modoActualUsuario();
  const titulo = modo === 'jefe' ? 'Bienvenido, estás en modo BOSS' : 'Bienvenido, estás en modo EMPLEADO';
  $('#content').innerHTML = `
    <div class="empty-card" style="text-align:center;">
      <div class="empty-icon">${ICONS.home}</div>
      <h2 style="font-size:20px;margin:6px 0;">${titulo}</h2>
      <p class="muted">Selecciona <b>Organizador</b> en el menú para gestionar tu información.</p>
    </div>`;
}

function setupTabs() {
  $all('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      if (STATE.viewMode === 'jefe-ver') {
        if (btn.dataset.tab !== 'trabajo') {
          toast('En el perfil de un empleado solo puedes consultar Trabajo por ahora.');
          return;
        }
      }
      $all('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.activeTab = btn.dataset.tab;
      if (btn.dataset.tab === 'trabajo') loadTrabajo();
      else if (btn.dataset.tab === 'estudio') loadEstudio();
      else if (btn.dataset.tab === 'evento') loadEventos();
    });
  });
}

setInterval(() => {
  if (typeof trabajoEstaFinalizado === 'function' && typeof renderTrabajo === 'function' && STATE.activeTab === 'trabajo' && STATE.viewMode !== 'jefe-ver' && STATE.trabajo) {
    renderTrabajo();
  }
}, 30000);
