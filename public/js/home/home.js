/* ============================================================
   Riverosapay · ENTRADA A LA APP Y HOME
   Inicio = resumen rápido y útil para cada modo.
   ============================================================ */

function instalarEstiloHomeEmpleado() {
  if (document.getElementById('riverosapay-home-style')) return;
  const style = document.createElement('style');
  style.id = 'riverosapay-home-style';
  style.textContent = `
    .home-dashboard{padding:4px 0 28px;animation:homeIn .25s ease both}
    @keyframes homeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
    .home-welcome{padding:4px 2px 18px}
    .home-eyebrow,.home-section-label{display:block;color:var(--green-700);font-family:var(--font-display);font-size:10.5px;font-weight:800;letter-spacing:.08em}
    .home-welcome h2{margin:3px 0;color:var(--green-900);font-family:var(--font-display);font-size:23px;line-height:1.2;font-weight:700}
    .home-welcome p{margin:0;font-size:13px;line-height:1.45}
    .home-section-label{margin:2px 2px 7px}
    .home-schedule-card,.home-money-card,.home-payments-card,.home-empty-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md);box-shadow:var(--shadow-card)}
    .home-schedule-card{padding:4px 13px}
    .home-schedule-title{padding:10px 1px 7px;font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--green-900)}
    .home-schedule-row{display:flex;align-items:center;gap:10px;padding:10px 1px;border-top:1px solid var(--line)}
    .home-schedule-icon,.home-payment-icon{width:34px;height:34px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--green-100);font-size:17px}
    .home-schedule-main,.home-payment-main{min-width:0;display:flex;flex-direction:column;gap:2px}
    .home-schedule-main strong,.home-payment-main strong{font-size:13.5px;line-height:1.25}
    .home-schedule-main span,.home-payment-main span{font-size:11.5px;line-height:1.3}
    .home-more{padding:7px 1px 10px;color:var(--ink-soft);font-size:11.5px}
    .home-money-card{padding:15px 16px 13px;background:var(--green-900);border-color:var(--green-900);color:#fff}
    .home-money-head{display:flex;justify-content:space-between;align-items:center;gap:12px}
    .home-money-head div{display:flex;flex-direction:column;gap:2px;min-width:0}
    .home-money-head .muted{color:rgba(255,255,255,.7);font-size:11.5px}
    .home-money-head strong{font-family:var(--font-display);font-size:25px;line-height:1.2;font-weight:700;overflow-wrap:anywhere}
    .home-money-icon{width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:18px}
    .home-money-meta{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.13);font-size:11.5px;color:rgba(255,255,255,.68)}
    .home-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:17px 2px 7px}
    .home-section-head>span{font-family:var(--font-display);font-size:13.5px;font-weight:700;color:var(--ink)}
    .home-link{border:none;background:none;padding:4px 0;color:var(--green-700);font-size:11.5px;font-weight:700;cursor:pointer}
    .home-payments-card{padding:2px 13px}
    .home-payment-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}
    .home-payment-row:last-child{border-bottom:none}
    .home-payment-main{flex:1}
    .home-payment-amount{font-family:var(--font-display);font-size:13px;color:var(--green-700);white-space:nowrap}
    .home-empty-card{display:flex;align-items:center;gap:11px;padding:13px}
    .home-empty-card>span{width:34px;height:34px;border-radius:10px;background:var(--green-100);display:flex;align-items:center;justify-content:center}
    .home-empty-card>div{display:flex;flex-direction:column;gap:2px}
    .home-empty-card strong{font-size:13px}
    .home-empty-card small{font-size:11.5px}
    .home-dashboard .home-section-label + .home-schedule-card{margin-bottom:17px}
    @media(max-width:360px){.home-welcome h2{font-size:21px}.home-money-head strong{font-size:22px}.home-dashboard{padding-bottom:22px}}
  `;
  document.head.appendChild(style);
}

function enterApp() {
  actualizarHeaderUsuario();
  configurarMenuPorRol();
  showScreen('screen-app');

  marcarTabActiva('inicio');
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

function trabajoFinalizadoSinPagar(turno) {
  if (!turno || turno.pagado === true) return false;
  if (turno.finalizado === true) return true;
  if (!turno.fecha || !turno.horaFin) return false;
  return new Date(`${turno.fecha}T${turno.horaFin}`).getTime() <= Date.now();
}

async function cargarResumenPagosJefe() {
  if (modoActualUsuario() !== 'jefe' || !STATE.user) return;
  try {
    const empleados = await api.get(`/api/trabajo/jefe/${STATE.user.id}`);
    const pendientes = (empleados || []).reduce((total, empleado) => total + (empleado.turnos || []).filter(trabajoFinalizadoSinPagar).length, 0);
    const box = $('#home-pagos-pendientes');
    if (!box) return;
    box.innerHTML = pendientes > 0
      ? `<div class="empty-icon" style="font-size:30px;">💰</div><div style="font-weight:800;font-size:17px;">Tienes ${pendientes} trabajo${pendientes === 1 ? '' : 's'} finalizado${pendientes === 1 ? '' : 's'} sin pagar</div><button class="btn-primary" type="button" style="margin-top:10px;" onclick="verPagosPendientesJefe()">Ver</button>`
      : `<div class="muted" style="font-weight:700;">No tienes trabajos pendientes de pago.</div>`;
  } catch (ex) {
    const box = $('#home-pagos-pendientes');
    if (box) box.innerHTML = '';
  }
}

function nombreCortoUsuario() {
  const nombre = String(STATE.user?.nombreCompleto || STATE.user?.username || 'Usuario').trim();
  return nombre.split(/\s+/)[0] || 'Usuario';
}

function formatoHoraCorta(hora) {
  const partes = String(hora || '').split(':').map(Number);
  if (partes.length < 2 || !Number.isFinite(partes[0]) || !Number.isFinite(partes[1])) return String(hora || '');
  const minutos = String(partes[1]).padStart(2, '0');
  const periodo = partes[0] >= 12 ? 'PM' : 'AM';
  const h12 = partes[0] % 12 || 12;
  return `${h12}:${minutos} ${periodo}`;
}

function resumenHorarioHoy(materias) {
  const hoy = typeof diaActualNombre === 'function' ? diaActualNombre() : null;
  return (materias || [])
    .filter(m => m && m.dia === hoy)
    .sort((a, b) => minutosHora(a.horaInicio) - minutosHora(b.horaInicio));
}

function htmlHorarioHoy(materias) {
  const clases = resumenHorarioHoy(materias);
  if (!clases.length) {
    return `<div class="home-section-label">TU DÍA</div><div class="home-schedule-card"><div class="home-schedule-icon">✨</div><div><strong>No tienes clases hoy</strong><span class="muted">Tu horario está libre por ahora.</span></div></div>`;
  }

  const visibles = clases.slice(0, 3);
  const filas = visibles.map(m => `
    <div class="home-schedule-row">
      <div class="home-schedule-icon">📚</div>
      <div class="home-schedule-main"><strong>${escapeHtml(m.nombre || 'Clase')}</strong><span class="muted">${formatoHoraCorta(m.horaInicio)} — ${formatoHoraCorta(m.horaFin)}</span></div>
    </div>`).join('');

  return `<div class="home-section-label">TU DÍA</div><div class="home-schedule-card"><div class="home-schedule-title">Hoy tienes ${clases.length === 1 ? '1 clase' : `${clases.length} clases`}</div>${filas}${clases.length > 3 ? `<div class="home-more">+ ${clases.length - 3} más en tu horario</div>` : ''}</div>`;
}

async function cargarResumenAbonosEmpleado() {
  if (modoActualUsuario() !== 'empleado' || !STATE.user) return;
  const abonosBox = $('#home-abonos-empleado');
  const horarioBox = $('#home-horario-empleado');
  try {
    const [jefes, estudio] = await Promise.all([
      api.get(`/api/mis-jefes/${STATE.user.id}`),
      api.get(`/api/estudio/${STATE.user.id}`)
    ]);

    const vinculados = Array.isArray(jefes) ? jefes : [];
    const respuestas = await Promise.all(vinculados.map(async jefe => {
      try {
        return { jefe, data: await api.get(`/api/abonos/jefe/${jefe.jefeId}/empleado/${STATE.user.id}`) };
      } catch (ex) {
        return { jefe, data: { abonos: [], totalAbonos: 0 } };
      }
    }));

    const abonos = respuestas.flatMap(r => (r.data.abonos || []).map(a => ({ ...a, jefeNombre: r.jefe.jefeUsername || 'BOSS' })));
    abonos.sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')) || Number(b.createdAt || 0) - Number(a.createdAt || 0));
    const total = abonos.reduce((suma, abono) => suma + Number(abono.valor || 0), 0);

    if (horarioBox) horarioBox.innerHTML = htmlHorarioHoy(Array.isArray(estudio) ? estudio : []);
    if (!abonosBox) return;

    const recientes = abonos.slice(0, 3).map(a => `
      <div class="home-payment-row">
        <div class="home-payment-icon">💵</div>
        <div class="home-payment-main"><strong>Abono</strong><span class="muted">${escapeHtml(a.fecha || '')}${a.descripcion ? ` · ${escapeHtml(a.descripcion)}` : ''}</span></div>
        <strong class="home-payment-amount">+${dineroCO(a.valor)}</strong>
      </div>`).join('');

    abonosBox.innerHTML = `
      <div class="home-section-label">TUS ABONOS</div>
      <div class="home-money-card">
        <div class="home-money-head"><div><span class="muted">Total recibido</span><strong>${dineroCO(total)}</strong></div><span class="home-money-icon">💰</span></div>
        <div class="home-money-meta">${abonos.length} ${abonos.length === 1 ? 'abono registrado' : 'abonos registrados'}</div>
      </div>
      ${abonos.length ? `<div class="home-section-head"><span>Recientes</span><button type="button" class="home-link" onclick="abrirAbonosEmpleadoHome()">Ver todos →</button></div><div class="home-payments-card">${recientes}</div>` : `<div class="home-empty-card"><span>💵</span><div><strong>Aún no tienes abonos</strong><small class="muted">Cuando recibas uno aparecerá aquí.</small></div></div>`}`;
  } catch (ex) {
    if (horarioBox) horarioBox.innerHTML = `<div class="home-section-label">TU DÍA</div><div class="home-schedule-card"><div class="home-schedule-icon">📅</div><div><strong>No se pudo cargar el horario</strong><span class="muted">Puedes consultarlo desde Estudio.</span></div></div>`;
    if (abonosBox) abonosBox.innerHTML = `<div class="home-section-label">TUS ABONOS</div><div class="home-empty-card"><span>💵</span><div><strong>No se pudo cargar el resumen</strong><small class="muted">Inténtalo de nuevo en unos segundos.</small></div></div>`;
  }
}

async function abrirAbonosEmpleadoHome() {
  if (typeof loadTrabajo === 'function') {
    marcarTabActiva('trabajo');
    await loadTrabajo();
  }
}

async function verPagosPendientesJefe() {
  if (modoActualUsuario() !== 'jefe') return;
  marcarTabActiva('trabajo');
  STATE.jefeView = null;
  STATE.viewMode = 'jefe-historial';
  await loadHistorial();
}

function renderHome() {
  instalarEstiloHomeEmpleado();
  const modo = modoActualUsuario();
  const titulo = modo === 'jefe' ? 'Bienvenido, estás en modo BOSS' : 'Bienvenido, estás en modo EMPLEADO';
  const tituloHome = modo === 'jefe' ? '' : `
    <div class="home-welcome">
      <span class="home-eyebrow">INICIO</span>
      <h2>Hola, ${escapeHtml(nombreCortoUsuario())} 👋🏻</h2>
      <p class="muted">Estos son tus abonos y lo que tienes para hoy.</p>
    </div>`;

  $('#content').innerHTML = modo === 'jefe' ? `
    <div class="empty-card" style="text-align:center;">
      <div class="empty-icon">${ICONS.home}</div>
      <h2 style="font-size:20px;margin:6px 0;">${titulo}</h2>
    </div>
    <div id="home-pagos-pendientes" class="empty-card" style="text-align:center;margin-top:12px;min-height:0;padding:18px;"><div class="muted">Comprobando trabajos pendientes de pago...</div></div>` : `
    <div class="home-dashboard">
      ${tituloHome}
      <div id="home-horario-empleado"></div>
      <div id="home-abonos-empleado"><div class="muted">Comprobando tus abonos...</div></div>
    </div>`;

  if (modo === 'jefe') cargarResumenPagosJefe();
  else cargarResumenAbonosEmpleado();
}

function setupTabs() {
  $all('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (STATE.viewMode === 'jefe-ver') {
        if (tab !== 'trabajo' && tab !== 'inicio') {
          toast('En el perfil de un empleado solo puedes consultar Trabajo por ahora.');
          return;
        }
      }
      marcarTabActiva(tab);
      const esJefe = modoActualUsuario() === 'jefe';
      if (tab === 'inicio') {
        STATE.viewMode = esJefe ? 'jefe-home' : 'empleado';
        STATE.jefeView = null;
        renderHome();
      } else if (tab === 'trabajo') {
        if (esJefe) { STATE.viewMode = 'jefe-historial'; STATE.jefeView = null; loadHistorial(); }
        else loadTrabajo();
      } else if (tab === 'estudio') loadEstudio();
      else if (tab === 'evento') loadEventos();
      else if (tab === 'tesoreria') { if (esJefe && typeof abrirTesorero === 'function') abrirTesorero(); }
    });
  });
}

setInterval(() => {
  if (typeof trabajoEstaFinalizado === 'function' && typeof renderTrabajo === 'function' && STATE.activeTab === 'trabajo' && STATE.viewMode !== 'jefe-ver' && STATE.trabajo) renderTrabajo();
}, 30000);
