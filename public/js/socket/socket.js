/* ============================================================
   Riverospay · SOCKET.IO: conexion en tiempo real
   ============================================================ */

function setupSocket() {
  if (STATE.socket) return;
  STATE.socket = io();
  STATE.socket.on('connect', registerSocketRoom);

  STATE.socket.on('trabajo:update', (data) => {
    if (modoActualUsuario() === 'empleado') {
      STATE.trabajo = data;
      if (STATE.activeTab === 'trabajo') renderTrabajo();
    } else if (STATE.viewMode === 'jefe-ver' && STATE.jefeView) {
      STATE.jefeView.lugares = data.lugares;
      STATE.jefeView.turnos = data.turnos;
      renderJefeView();
    }
  });

  STATE.socket.on('estudio:update', (data) => {
    if (modoActualUsuario() === 'empleado') {
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
    if (modoActualUsuario() === 'empleado') {
      STATE.eventos = data;
      if (STATE.activeTab === 'evento') renderEventos();
    } else if (STATE.viewMode === 'jefe-ver' && STATE.jefeView) {
      STATE.jefeView.eventos = data;
      renderJefeView();
    }
  });

  STATE.socket.on('join:request', (solicitud) => {
    if (modoActualUsuario() !== 'empleado') return;
    STATE.notificaciones = [solicitud, ...(STATE.notificaciones || [])];
    updateNotifBadge();
    if (STATE.user.recibirNotificaciones !== false) showRequestCard(solicitud);
  });

  // Las notificaciones pertenecen a la misma cuenta, pero pueden llegar
  // mientras la cuenta esté en cualquiera de sus dos modos.
  STATE.socket.on('notificaciones:update', async () => {
    try {
      await loadNotificaciones();
    } catch (ex) {
      console.warn('[riverospay] No se pudieron actualizar las notificaciones en tiempo real.', ex);
    }
  });

  STATE.socket.on('join:result', (payload) => {
    if (modoActualUsuario() === 'jefe') handleJoinResult(payload);
  });
}

function registerSocketRoom() {
  if (!STATE.user || !STATE.socket) return;
  if (modoActualUsuario() === 'empleado') {
    STATE.socket.emit('register-empleado', { empleadoId: STATE.user.id });
  } else {
    STATE.socket.emit('register-jefe', { jefeId: STATE.user.id });
  }
}

// Carga después de todos los scripts clásicos de la página para que el
// complemento pueda extender Trabajo sin tocar el arranque de autenticación.
setTimeout(() => {
  const script = document.createElement('script');
  script.src = '/js/trabajo/tanda5-ui.js';
  script.async = true;
  document.head.appendChild(script);
}, 0);
