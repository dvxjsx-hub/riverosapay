/* ============================================================
   Riverosapay · AMISTADES
   Solicitudes: enviar → aceptar/rechazar → amistad.
   ============================================================ */

async function openAmistades() {
  openModal('Amistades', '<div id="amistades-content"><p class="muted" style="text-align:center;">Cargando tus amistades…</p></div>');
  try { await cargarAmistades(); } catch (ex) { const el = $('#amistades-content'); if (el) el.innerHTML = `<p class="field-error">${escapeHtml(ex.message)}</p>`; }
}

async function cargarAmistades() {
  const data = await api.get(`/api/amistades/${STATE.user.id}`);
  STATE.amistades = data.amistades || [];
  STATE.solicitudesAmistad = data.solicitudes || [];
  STATE.user.codigoAmistad = data.codigoAmistad || STATE.user.codigoAmistad || null;
  const el = $('#amistades-content'); if (!el) return;
  const codigo = STATE.user.codigoAmistad || '--------';
  const solicitudes = STATE.solicitudesAmistad.length ? `
    <section><h3 style="margin:0 0 8px;">Solicitudes recibidas</h3>
      <div style="display:flex;flex-direction:column;gap:8px;">${STATE.solicitudesAmistad.map(s => `
        <div style="padding:12px;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--surface);">
          <b>${escapeHtml(s.emisorUsername)}</b><div class="muted" style="font-size:12px;margin:3px 0 10px;">Quiere ser tu amistad.</div>
          <div style="display:flex;gap:8px;"><button class="btn-ghost-danger" type="button" onclick="responderSolicitudAmistad('${s.id}','rechazar')">Rechazar</button><button class="btn-primary" type="button" onclick="responderSolicitudAmistad('${s.id}','aceptar')">Aceptar</button></div>
        </div>`).join('')}</div>
    </section>` : '';
  const lista = STATE.amistades.length ? STATE.amistades.map(a => `
    <div style="display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md);padding:12px;">
      <span style="width:42px;height:42px;border-radius:50%;background:var(--green-100);color:var(--green-800);display:flex;align-items:center;justify-content:center;font-weight:700;">${escapeHtml((a.nombreCompleto || a.username || '?').slice(0,1).toUpperCase())}</span>
      <div style="flex:1;min-width:0;"><b>${escapeHtml(a.nombreCompleto || a.username)}</b><div class="muted" style="font-size:12px;">ID: ${escapeHtml(a.username)}</div></div>
      <button class="btn-ghost-danger" type="button" onclick="eliminarAmistad('${a.id}')">Eliminar</button>
    </div>`).join('') : '<div class="empty-card" style="padding:22px 16px;"><h3 style="margin:0;">Aún no tienes amistades</h3><p class="muted">Añade una persona usando su código de amistad.</p></div>';
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:5px;background:var(--green-100);border:1px solid #C8E8D2;border-radius:var(--radius-md);padding:15px;text-align:center;">
      <span class="muted" style="font-size:12px;">Tu código de amistad</span><strong style="font-size:27px;letter-spacing:.12em;color:var(--green-900);">${escapeHtml(codigo)}</strong>
      <button class="btn-secondary" style="width:auto;padding:8px 14px;" type="button" onclick="copiarTexto('${escapeHtml(codigo)}')">Copiar código</button>
      <small class="muted">Comparte este código para recibir solicitudes.</small>
    </div>
    <button class="btn-primary" style="width:100%;" type="button" onclick="abrirAgregarAmistad()">${ICONS.plus} Añadir amistad</button>
    ${solicitudes}<div style="display:flex;flex-direction:column;gap:8px;">${lista}</div>`;
}

function abrirAgregarAmistad() {
  openModal('Añadir amistad', `<p class="muted" style="margin-top:0;">Ingresa el código de amistad de una persona registrada.</p><label>Código de amistad<input id="f-amistad-code" type="text" inputmode="numeric" maxlength="8" placeholder="00000000" autocomplete="off"></label><p class="field-error" id="f-amistad-error"></p><button class="btn-primary" id="f-amistad-btn" type="button" onclick="enviarAgregarAmistad()">Enviar solicitud</button>`);
  $('#f-amistad-code').focus();
}

async function enviarAgregarAmistad() {
  const input = $('#f-amistad-code'), err = $('#f-amistad-error'), btn = $('#f-amistad-btn');
  const codigo = input.value.trim();
  if (!/^\d{8}$/.test(codigo)) { err.textContent = 'El código debe tener 8 dígitos.'; return; }
  err.textContent = ''; btn.disabled = true;
  try { await api.post('/api/amistades/agregar', { codigo }); toast('Solicitud de amistad enviada.'); closeModal(); await cargarAmistades(); }
  catch (ex) { btn.disabled = false; err.textContent = ex.message; }
}

async function responderSolicitudAmistad(id, accion) {
  try { await api.post(`/api/amistades/solicitudes/${id}/responder`, { accion }); toast(accion === 'aceptar' ? 'Amistad aceptada.' : 'Solicitud rechazada.'); await cargarAmistades(); }
  catch (ex) { toast(ex.message); }
}

async function eliminarAmistad(amistadId) {
  if (!confirm('¿Eliminar esta amistad?')) return;
  try { await api.post('/api/amistades/eliminar', { amistadId }); toast('Amistad eliminada.'); await cargarAmistades(); }
  catch (ex) { toast(ex.message); }
}
