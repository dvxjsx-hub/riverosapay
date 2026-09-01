/* ============================================================
   Riverospay · AMISTADES
   Personas reales agregadas mediante su código de amistad.
   La relación se guarda en MongoDB a través del backend.
   ============================================================ */

async function openAmistades() {
  openModal('Amistades', `
    <div id="amistades-content" style="display:flex;flex-direction:column;gap:14px;">
      <p class="muted" style="text-align:center;margin:0;">Cargando tus amistades…</p>
    </div>
  `);

  try {
    await cargarAmistades();
  } catch (ex) {
    const el = $('#amistades-content');
    if (el) el.innerHTML = `<p class="field-error">${escapeHtml(ex.message)}</p>`;
  }
}

async function cargarAmistades() {
  const data = await api.get(`/api/amistades/${STATE.user.id}`);
  STATE.amistades = data.amistades || [];
  STATE.user.codigoAmistad = data.codigoAmistad || STATE.user.codigoAmistad || null;

  const el = $('#amistades-content');
  if (!el) return;

  const codigo = STATE.user.codigoAmistad || '--------';
  const lista = STATE.amistades.length
    ? STATE.amistades.map(a => `
        <div style="display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md);padding:12px 13px;">
          <span style="width:42px;height:42px;border-radius:50%;background:var(--green-100);color:var(--green-800);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;flex:none;">${escapeHtml((a.nombreCompleto || a.username || '?').slice(0, 1).toUpperCase())}</span>
          <div style="display:flex;flex-direction:column;gap:3px;min-width:0;">
            <b style="font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(a.nombreCompleto || a.username)}</b>
            <span class="muted" style="font-size:12px;">ID: ${escapeHtml(a.username)}</span>
          </div>
        </div>
      `).join('')
    : `<div class="empty-card" style="padding:26px 16px;"><div class="empty-icon">${ICONS.plus}</div><h3 style="margin:0;">Aún no tienes amistades</h3><p class="muted" style="margin:0;">Agrega personas usando su código de amistad.</p></div>`;

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:5px;background:var(--green-100);border:1px solid #C8E8D2;border-radius:var(--radius-md);padding:15px;text-align:center;">
      <span class="muted" style="font-size:12px;">Tu código de amistad</span>
      <strong style="font-family:var(--font-display);font-size:27px;letter-spacing:.12em;color:var(--green-900);">${escapeHtml(codigo)}</strong>
      <button class="btn-secondary" style="width:auto;padding:8px 14px;margin-top:3px;" type="button" onclick="copiarTexto('${escapeHtml(codigo)}')">Copiar código</button>
      <small class="muted">Comparte este código para que otra persona pueda agregarte.</small>
    </div>

    <button class="btn-primary" style="width:100%;" type="button" onclick="abrirAgregarAmistad()">
      ${ICONS.plus} Añadir amistad
    </button>

    <div style="display:flex;flex-direction:column;gap:8px;">${lista}</div>
  `;
}

function abrirAgregarAmistad() {
  openModal('Añadir amistad', `
    <p class="muted" style="margin-top:0;">Ingresa el código de amistad de una persona registrada en Riverospay.</p>
    <label>Código de amistad
      <input id="f-amistad-code" type="text" inputmode="numeric" maxlength="8" placeholder="00000000" autocomplete="off">
    </label>
    <p class="field-error" id="f-amistad-error"></p>
    <button class="btn-primary" id="f-amistad-btn" type="button" onclick="enviarAgregarAmistad()">Añadir amistad</button>
  `);
  $('#f-amistad-code').focus();
}

async function enviarAgregarAmistad() {
  const input = $('#f-amistad-code');
  const err = $('#f-amistad-error');
  const btn = $('#f-amistad-btn');
  const codigo = input.value.trim();
  if (!/^\d{8}$/.test(codigo)) {
    err.textContent = 'El código debe tener 8 dígitos.';
    return;
  }
  err.textContent = '';
  btn.disabled = true;
  try {
    const data = await api.post('/api/amistades/agregar', { userId: STATE.user.id, codigo });
    toast(`${data.amistad.nombreCompleto || data.amistad.username} ahora es tu amistad.`);
    await cargarAmistades();
  } catch (ex) {
    btn.disabled = false;
    err.textContent = ex.message;
  }
}
