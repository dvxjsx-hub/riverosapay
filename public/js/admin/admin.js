function adminEstilo() {
  if (document.getElementById('admin-style')) return;
  const style = document.createElement('style');
  style.id = 'admin-style';
  style.textContent = `
    #screen-admin{background:#fff;color:#15201A;overflow:hidden;}
    .admin-top{height:64px;min-height:64px;background:#155C31;color:#fff;display:flex;align-items:center;padding:0 20px;gap:12px;box-shadow:0 4px 14px rgba(15,61,36,.16);}
    .admin-top img{width:34px;height:34px;border-radius:10px;object-fit:cover;}
    .admin-title{font-family:var(--font-display);font-weight:700;font-size:15px;letter-spacing:.03em;}
    .admin-body{flex:1;min-height:0;overflow-y:auto;padding:22px 18px 34px;}
    .admin-body h1{font-family:var(--font-display);font-size:22px;margin:0 0 4px;color:#0F3D24;}
    .admin-sub{font-size:13px;color:#69746D;margin:0 0 18px;}
    .admin-account{border-bottom:1px solid #E7E3F0;padding:14px 2px;}
    .admin-account-name{font-weight:700;font-size:15px;}
    .admin-account-meta{font-size:12px;color:#69746D;line-height:1.55;margin-top:3px;}
    .admin-account button{margin-top:9px;background:#fff;color:#D64545;border:1px solid #F0CACA;border-radius:9px;padding:8px 11px;font-weight:600;cursor:pointer;}
    .admin-empty{padding:25px 2px;color:#69746D;font-size:13px;}
    .admin-logout{margin-top:24px;width:100%;padding:12px;background:#fff;color:#D64545;border:1px solid #F0CACA;border-radius:10px;font-weight:600;cursor:pointer;}
  `;
  document.head.appendChild(style);
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
      <span class="admin-title">ADMINISTRADOR</span>
    </div>
    <main class="admin-body">
      <h1>Cuentas</h1>
      <p class="admin-sub">Usuarios registrados en Riverospay</p>
      <div id="admin-cuentas"></div>
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
    cont.innerHTML = cuentas.map(u => `
      <article class="admin-account">
        <div class="admin-account-name">${escapeHtml(u.nombreCompleto || 'Sin nombre configurado')}</div>
        <div class="admin-account-meta">Usuario: ${escapeHtml(u.username)}<br>ID: ${escapeHtml(u.id)}<br>Creada: ${formatAdminDate(u.createdAt)}</div>
        <button type="button" data-admin-delete="${escapeHtml(u.id)}">Eliminar cuenta</button>
      </article>
    `).join('');
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
