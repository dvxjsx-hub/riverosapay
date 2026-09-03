function adminEstilo() {
  /* Los estilos del panel de administrador viven en css/style.css,
     usando los mismos tokens (--green-900, --radius-md, etc.) que
     el resto de la app. Esta función se conserva por compatibilidad. */
}

function asegurarPantallaAdmin() {
  let screen = document.getElementById('screen-admin');
  if (screen) return screen;
  screen = document.createElement('section');
  screen.id = 'screen-admin';
  screen.className = 'screen';
  screen.innerHTML = `
    <div class="admin-top">
      <img src="img/inicio.jpg" alt="">
      <div class="admin-top-text">
        <span class="admin-title">ADMINISTRADOR</span>
        <span class="admin-subtitle">Riverosapay · panel interno</span>
      </div>
    </div>
    <main class="admin-body">
      <div class="admin-head">
        <h1>Cuentas</h1>
        <p class="admin-sub">Usuarios registrados en Riverosapay</p>
      </div>
      <div id="admin-cuentas" class="admin-list"></div>
      <button id="admin-logout" class="admin-logout" type="button">Cerrar sesión</button>
    </main>
  `;
  document.querySelector('.phone').appendChild(screen);
  document.getElementById('admin-logout').addEventListener('click', cerrarAdmin);
  return screen;
}

function formatAdminDate(iso) {
  if (!iso) return 'Fecha no registrada';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Fecha no registrada';
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

async function cargarCuentasAdmin() {
  const cont = document.getElementById('admin-cuentas');
  if (!cont) return;
  cont.innerHTML = '<div class="admin-empty">Cargando cuentas...</div>';
  try {
    const data = await api.get('/api/admin/cuentas');
    const cuentas = data.cuentas || [];
    if (!cuentas.length) {
      cont.innerHTML = '<div class="admin-empty">No hay cuentas registradas.</div>';
      return;
    }
    cont.innerHTML = cuentas.map(u => {
      const inicial = escapeHtml((u.nombreCompleto || u.username || '?').trim().slice(0, 1).toUpperCase());
      return `
      <article class="admin-account">
        <span class="admin-avatar">${inicial}</span>
        <div class="admin-account-body">
          <div class="admin-account-name">${escapeHtml(u.nombreCompleto || 'Sin nombre configurado')}</div>
          <div class="admin-account-meta">@${escapeHtml(u.username)} · ID ${escapeHtml(u.id)}<br>Creada: ${formatAdminDate(u.createdAt)}<br>Última conexión: ${formatAdminDate(u.lastLoginAt)}</div>
          <div class="admin-badges">
            <span class="admin-badge ${u.recoveryConfigured ? 'ok' : 'warn'}">${u.recoveryConfigured ? 'Recuperación configurada' : 'Sin recuperación'}</span>
          </div>
        </div>
        <button class="admin-delete-btn" type="button" data-admin-delete="${escapeHtml(u.id)}" aria-label="Eliminar cuenta">${ICONS.trash}</button>
      </article>
    `;
    }).join('');
    cont.querySelectorAll('[data-admin-delete]').forEach(btn => {
      btn.addEventListener('click', () => eliminarCuentaAdmin(btn.dataset.adminDelete));
    });
  } catch (ex) {
    cont.innerHTML = `<div class="admin-empty">${escapeHtml(ex.message)}</div>`;
  }
}

async function eliminarCuentaAdmin(userId) {
  const ok = window.confirm('¿Eliminar esta cuenta permanentemente? También se eliminarán sus datos asociados.');
  if (!ok) return;
  try {
    await api.delete(`/api/admin/cuentas/${encodeURIComponent(userId)}`);
    toast('Cuenta eliminada');
    await cargarCuentasAdmin();
  } catch (ex) {
    toast(ex.message);
  }
}

async function cerrarAdmin() {
  try { await api.post('/api/auth/logout', {}); } catch (_) {}
  showScreen('screen-auth');
  setAuthMode('login');
  $('#log-pass').value = '';
  setTimeout(() => $('#log-user')?.focus({ preventScroll: true }), 80);
}

function enterAdmin() {
  adminEstilo();
  asegurarPantallaAdmin();
  showScreen('screen-admin');
  cargarCuentasAdmin();
}
