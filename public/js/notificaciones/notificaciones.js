/* ============================================================
   Riverosapay · NOTIFICACIONES
   Las notificaciones se separan por modo: EMPLEADO / BOSS.
   ============================================================ */

function modoDestinoNotificacion(n) {
  if (n && (n.modoDestino === 'jefe' || n.modoDestino === 'empleado')) return n.modoDestino;
  if (n && (n.tipo === 'jefe_asignado_trabajo' || n.tipo === 'trabajo_eliminacion_solicitada')) return 'jefe';
  return 'empleado';
}
function notificacionesDelModoActual() { return (STATE.notificaciones || []).filter(n => modoDestinoNotificacion(n) === modoActualUsuario()); }
function updateNotifBadge() { const hayAlgoPendiente = notificacionesDelModoActual().some(n => (n.tipo === 'solicitud' && n.estado === 'pendiente') || (n.tipo !== 'solicitud' && !n.leida)); const dot = $('#notif-dot'); if (dot) dot.classList.toggle('hidden', !hayAlgoPendiente); }
async function loadNotificaciones() { STATE.notificaciones = await api.get(`/api/notificaciones/${STATE.user.id}`); updateNotifBadge(); return STATE.notificaciones; }
function notifTextoHTML(n) {
  const nombre = n.empleadoNombre || n.empleadoUsername || n.jefeUsername || n.solicitanteUsername || n.amigoUsername || 'Usuario';
  if (n.tipo === 'solicitud') return `<b>${escapeHtml(n.jefeUsername || 'BOSS')}</b> quiere verificar tu información.`;
  if (n.tipo === 'amistad_solicitud') return `<b>${escapeHtml(n.solicitanteNombre || n.solicitanteUsername || 'Usuario')}</b> quiere agregarte como amistad. Abre Amistades para aceptar o rechazar.`;
  if (n.tipo === 'amistad_aceptada') return `<b>${escapeHtml(n.amigoNombre || n.amigoUsername || 'Usuario')}</b> aceptó tu solicitud de amistad.`;
  if (n.tipo === 'amistad_rechazada') return `<b>${escapeHtml(n.amigoNombre || n.amigoUsername || 'Usuario')}</b> rechazó tu solicitud de amistad.`;
  if (n.tipo === 'amistad_eliminada') return `<b>${escapeHtml(n.amigoNombre || n.amigoUsername || 'Usuario')}</b> eliminó la amistad.`;
  if (n.tipo === 'jefe_asignado_trabajo') return `<b>${escapeHtml(nombre)}</b> te asignó como BOSS en "${escapeHtml(n.lugar || 'un trabajo')}"${n.fechaTrabajo ? ` para el ${escapeHtml(n.fechaTrabajo)}` : ''}.`;
  if (n.tipo === 'trabajo_eliminacion_solicitada') return `<b>${escapeHtml(nombre)}</b> solicita eliminar el trabajo "${escapeHtml(n.lugar || '')}". Entra al trabajo para confirmar o rechazar.`;
  if (n.tipo === 'trabajo_añadido') return `<b>${escapeHtml(n.jefeUsername || 'Tu BOSS')}</b> añadió un nuevo trabajo "${escapeHtml(n.lugar || '')}".`;
  if (n.tipo === 'trabajo_pagado') return `<b>${escapeHtml(n.jefeUsername || 'Tu BOSS')}</b> pagó/abonó tu trabajo "${escapeHtml(n.lugar || '')}".`;
  if (n.tipo === 'jefe_configurado') return `<b>${escapeHtml(n.jefeUsername || 'BOSS')}</b> ha sido configurado.`;
  if (n.tipo === 'trabajo_eliminado') return `<b>${escapeHtml(n.jefeUsername || 'Tu BOSS')}</b> eliminó el trabajo "${escapeHtml(n.lugar || '')}".`;
  if (n.tipo === 'trabajo_eliminacion_rechazada') return `<b>${escapeHtml(n.jefeUsername || 'Tu BOSS')}</b> rechazó tu solicitud para eliminar un trabajo.`;
  return escapeHtml(nombre);
}
async function openNotificaciones() {
  try {
    await loadNotificaciones(); renderNotificacionesModal();
    const visibles = notificacionesDelModoActual();
    const huboSinLeer = visibles.some(n => n.tipo !== 'solicitud' && !n.leida);
    if (huboSinLeer) {
      await api.post(`/api/notificaciones/${STATE.user.id}/marcar-leidas`, { modo: modoActualUsuario() });
      const modo = modoActualUsuario(); STATE.notificaciones.forEach(n => { if (modoDestinoNotificacion(n) === modo && n.tipo !== 'solicitud') n.leida = true; });
      updateNotifBadge();
    }
  } catch (ex) { toast(ex.message); }
}
function renderNotificacionesModal() {
  const list = notificacionesDelModoActual(); const modoTitulo = modoActualUsuario() === 'jefe' ? 'BOSS' : 'EMPLEADO';
  const html = list.length ? list.map(n => `<div class="notif-row"><span class="notif-text">${notifTextoHTML(n)}</span><span class="notif-fecha">${formatFecha(n.fecha)}</span>${n.tipo === 'amistad_solicitud' ? '<div class="notif-actions"><button class="btn-primary" type="button" onclick="closeModal();openAmistades();">Ver solicitud</button></div>' : ''}</div>`).join('') : emptyCardHTML('NOTIFICACIONES · ' + modoTitulo, 'No tienes notificaciones por ahora.', 'historial');
  openModal('Notificaciones · ' + modoTitulo, html);
}
