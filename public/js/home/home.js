/* ============================================================
   Riverospay · ENTRADA A LA APP Y HOME
   Tanda 6: Inicio = selección de menú.
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
    <div class="empty-card" style="text-align:center;">
      <div class="empty-icon">${ICONS.home}</div>
      <h2 style="font-size:20px;margin:6px 0;">Selección de menú</h2>
      <p class="muted">Selecciona un menú para continuar.</p>
      <div style="display:grid;gap:10px;margin-top:18px;">
        <button class="btn-primary" type="button" onclick="seleccionarOrganizador('trabajo')">Trabajo</button>
        <button class="btn-secondary" type="button" onclick="seleccionarOrganizador('estudio')">Estudio</button>
        <button class="btn-secondary" type="button" onclick="seleccionarOrganizador('evento')">Evento</button>
      </div>
    </div>`;
}

function setupTabs() {
  $all('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      // Si alguna vista BOSS reutiliza las pestañas por error, nunca debe
      // abrir Estudio o Evento desde un contexto restringido.
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
