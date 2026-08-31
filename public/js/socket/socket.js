/* ============================================================
   Riverospay · SOCKET.IO: conexion en tiempo real
   Extraído de app.js (refactor de estructura, sin cambios de lógica)
   ============================================================ */

/* ---------- SOCKET.IO ---------- */
function setupSocket() {
  if (STATE.socket) return;
  STATE.socket = io();
  STATE.socket.on('connect', registerSocketRoom);

  STATE.socket.on('trabajo:update', (data) => {
    if (STATE.user.role === 'empleado') {
      STATE.trabajo = data;
      if (STATE.activeTab === 'trabajo') renderTrabajo();
    } else if (STATE.viewMode === 'jefe-ver' && STATE.jefeView) {
      STATE.jefeView.lugares = data.lugares;
      STATE.jefeView.turnos = data.turnos;
      renderJefeView();
    }
  });

  STATE.socket.on('estudio:update', (data) => {
    if (STATE.user.role === 'empleado') {
      STATE.estudio = data.materias;
      STATE.actividades = data.actividades;
      if (STATE.activeTab === 'estudio') renderEstudio();
    } else if (STATE.viewMode === 'jefe-ver' && STATE.jefeView) {
      STATE.jefeView.materias = data.materias;
      STATE.jefeView.actividades = data.actividades;
      renderJefeView();
    }
  });

  STATE.socket.on('evento:update', (data) => {
    if (STATE.user.role === 'empleado') {
      STATE.eventos = data;
      if (STATE.activeTab === 'evento') renderEventos();
    } else if (STATE.viewMode === 'jefe-ver' && STATE.jefeView) {
      STATE.jefeView.eventos = data;
      renderJefeView();
    }
  });

  STATE.socket.on('join:request', (solicitud) => {
    if (STATE.user.role !== 'empleado') return;
    STATE.notificaciones = [solicitud, ...(STATE.notificaciones || [])];
    updateNotifBadge();
    if (STATE.user.recibirNotificaciones !== false) showRequestCard(solicitud);
  });

  STATE.socket.on('notificaciones:update', () => {
    if (STATE.user.role === 'empleado') loadNotificaciones();
  });

  STATE.socket.on('join:result', (payload) => {
    if (STATE.user.role === 'jefe') handleJoinResult(payload);
  });
}

function registerSocketRoom() {
  if (!STATE.user || !STATE.socket) return;
  if (STATE.user.role === 'empleado') STATE.socket.emit('register-empleado', { empleadoId: STATE.user.id });
  else if (STATE.user.role === 'jefe') STATE.socket.emit('register-jefe', { jefeId: STATE.user.id });
}
