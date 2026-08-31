/* ============================================================
   Riverospay · COMPARTIR CODIGO Y NOTIFICACIONES (empleado)
   Extraído de app.js (refactor de estructura, sin cambios de lógica)
   ============================================================ */

/* ================= COMPARTIR (empleado) ================= */
function openCompartir() {
  openModal('Compartir código', `
    <div class="share-code">${STATE.user.shareCode}</div>
    <p class="muted" style="font-size:12.5px;text-align:center;margin:0;">Comparte este código de 8 dígitos con tu jefe para que pueda verificarte en tiempo real.</p>
    <button class="btn-primary" onclick="copiarCodigo()">Copiar código</button>
  `);
}

function copiarCodigo() {
  const code = STATE.user.shareCode;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => toast('Código copiado')).catch(() => toast('Copia el código manualmente: ' + code));
  } else {
    toast('Copia el código manualmente: ' + code);
  }
}

/* ================= NOTIFICACIONES (empleado) ================= */
function updateNotifBadge() {
  const hayAlgoPendiente = (STATE.notificaciones || []).some(n =>
    (n.tipo === 'solicitud' && n.estado === 'pendiente') || (n.tipo !== 'solicitud' && !n.leida)
  );
  $('#notif-dot').classList.toggle('hidden', !hayAlgoPendiente);
}

async function loadNotificaciones() {
  STATE.notificaciones = await api.get(`/api/notificaciones/${STATE.user.id}`);
  updateNotifBadge();
  return STATE.notificaciones;
}

function notifTextoHTML(n) {
  const jefe = `<b>${escapeHtml(n.jefeUsername || 'JEFE')}</b>`;
  if (n.tipo === 'solicitud') return `${jefe} quiere verificar tu información.`;
  if (n.tipo === 'trabajo_añadido') return `${jefe} añadió un nuevo trabajo "${escapeHtml(n.lugar || '')}"`;
  if (n.tipo === 'trabajo_pagado') return `${jefe} pagó/abonó tu trabajo "${escapeHtml(n.lugar || '')}"`;
  if (n.tipo === 'jefe_configurado') return `${jefe} ha sido configurado.`;
  if (n.tipo === 'trabajo_eliminado') return `${jefe} eliminó el trabajo "${escapeHtml(n.lugar || '')}"`;
  if (n.tipo === 'trabajo_eliminacion_rechazada') return `${jefe} rechazó tu solicitud para eliminar un trabajo.`;
  return jefe;
}

async function openNotificaciones() {
  try {
    await loadNotificaciones();
    renderNotificacionesModal();
    const huboSinLeer = STATE.notificaciones.some(n => n.tipo !== 'solicitud' && !n.leida);
    if (huboSinLeer) {
      await api.post(`/api/notificaciones/${STATE.user.id}/marcar-leidas`, {});
      STATE.notificaciones.forEach(n => { if (n.tipo !== 'solicitud') n.leida = true; });
      updateNotifBadge();
    }
  } catch (ex) { toast(ex.message); }
}

function renderNotificacionesModal() {
  const list = STATE.notificaciones || [];
  const html = list.length ? list.map(n => `
    <div class="notif-row">
      <span class="notif-text">${notifTextoHTML(n)}</span>
      <span class="notif-fecha">${formatFecha(n.fecha)}</span>
      ${n.tipo === 'solicitud' && n.estado === 'pendiente'
        ? `<div class="notif-actions">
             <button class="btn-ghost-danger" onclick="responderSolicitudId('${n.id}','rechazar')">Rechazar</button>
             <button class="btn-primary" onclick="responderSolicitudId('${n.id}','aceptar')">Aceptar</button>
           </div>`
        : (n.tipo === 'solicitud' ? `<span class="notif-badge ${n.estado}">Rechazada</span>` : '')}
    </div>`).join('') : emptyCardHTML('NOTIFICACIONES', 'No tienes notificaciones por ahora.', 'historial');
  openModal('Notificaciones', html);
}

async function responderSolicitudId(id, accion) {
  try {
    await api.post(`/api/join-requests/${id}/responder`, { accion });
    toast(accion === 'aceptar' ? 'Verificación aceptada' : 'Solicitud rechazada');
    if (STATE.pendingRequest && STATE.pendingRequest.id === id) hideRequestCard();
    await loadNotificaciones();
    renderNotificacionesModal();
  } catch (ex) { toast(ex.message); }
}

/* ================= SOLICITUD EN VIVO (empleado recibe) ================= */
function showRequestCard(solicitud) {
  STATE.pendingRequest = solicitud;
  $('#request-text').textContent = `${solicitud.jefeUsername} quiere verificar tu información en tiempo real.`;
  $('#request-overlay').classList.add('open');
  $('#request-card').classList.add('open');
}
function hideRequestCard() {
  $('#request-overlay').classList.remove('open');
  $('#request-card').classList.remove('open');
  STATE.pendingRequest = null;
}
function setupRequestCard() {
  $('#request-aceptar').addEventListener('click', () => responderSolicitud('aceptar'));
  $('#request-rechazar').addEventListener('click', () => responderSolicitud('rechazar'));
}
async function responderSolicitud(accion) {
  if (!STATE.pendingRequest) return;
  const id = STATE.pendingRequest.id;
  hideRequestCard();
  try {
    await api.post(`/api/join-requests/${id}/responder`, { accion });
    toast(accion === 'aceptar' ? 'Verificación aceptada' : 'Solicitud rechazada');
    await loadNotificaciones();
  } catch (ex) { toast(ex.message); }
}
