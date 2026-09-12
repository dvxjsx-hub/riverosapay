/* ============================================================
   Riverospay · HELPERS GENERICOS (texto, fechas, toast, cliente API)
   Extraído de app.js (refactor de estructura, sin cambios de lógica)
   ============================================================ */

/* ---------- helpers ---------- */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}
function diaOptions() {
  return DIAS.map(d => `<option value="${d}">${d}</option>`).join('');
}
function formatFecha(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' +
         d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
function emptyCardHTML(tag, message, iconKey = 'home') {
  return `<div class="empty-card">
    <div class="empty-icon">${ICONS[iconKey] || ICONS.home}</div>
    <span class="empty-tag">${tag}</span>
    <h2>VACÍO</h2>
    <p class="muted">${message}</p>
  </div>`;
}
function targetEmpleadoId() {
  return STATE.viewMode === 'jefe-ver' ? STATE.jefeView.empleadoId : STATE.user.id;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- cliente API ----------
   Evita que una petición al backend deje una pantalla de carga
   indefinidamente. El resto de la aplicación conserva la misma API.
   ------------------------------------------------------------ */
const API_TIMEOUT_MS = 12000;

async function apiFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('La conexión tardó demasiado. Inténtalo de nuevo.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const api = {
  async _handle(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Error de red.');
    return data;
  },
  get(url) { return apiFetch(url).then(api._handle); },
  post(url, body) {
    return apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(api._handle);
  },
  patch(url, body) {
    return apiFetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(api._handle);
  },
  delete(url, body) {
    return apiFetch(url, {
      method: 'DELETE',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    }).then(api._handle);
  }
};
