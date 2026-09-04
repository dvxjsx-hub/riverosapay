/* ============================================================
   Riverosapay · PERFIL VERIFICADO · UI DEL PROPIO USUARIO
   Solo muestra la insignia al usuario cuando su cuenta está verificada.
   ============================================================ */
(function () {
  function esUsuarioVerificado() {
    return STATE && STATE.user && STATE.user.verificada === true;
  }

  function estilos() {
    if (document.getElementById('riverosapay-verificado-style')) return;
    const style = document.createElement('style');
    style.id = 'riverosapay-verificado-style';
    style.textContent = `
      .riverosapay-verified-badge {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:18px;
        height:18px;
        min-width:18px;
        border:0;
        border-radius:50%;
        background:#55A86F;
        color:#fff;
        font-family:Arial,sans-serif;
        font-size:12px;
        font-weight:800;
        line-height:1;
        padding:0;
        cursor:pointer;
        box-shadow:0 1px 4px rgba(0,0,0,.16);
      }
      .riverosapay-profile-name {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        gap:7px;
        flex-wrap:wrap;
      }
      .riverosapay-verified-message {
        margin-top:2px;
        font-size:12px;
        font-weight:600;
        color:#55A86F;
      }
      .riverosapay-header-verified {
        position:absolute;
        top:-3px;
        right:-3px;
        width:19px;
        height:19px;
        min-width:19px;
        z-index:2;
        pointer-events:none;
        border:2px solid var(--surface,#fff);
      }
      .riverosapay-header-verified-avatar {
        position:relative !important;
      }
      html[data-theme="dark"] .riverosapay-header-verified {
        border-color:var(--surface,#171C19);
      }
    `;
    document.head.appendChild(style);
  }

  function actualizarInsigniaHeader() {
    const avatar = document.getElementById('btn-perfil');
    if (!avatar) return;
    avatar.querySelector('.riverosapay-header-verified')?.remove();
    avatar.classList.remove('riverosapay-header-verified-avatar');
    if (!esUsuarioVerificado()) return;
    avatar.classList.add('riverosapay-header-verified-avatar');
    const badge = document.createElement('span');
    badge.className = 'riverosapay-verified-badge riverosapay-header-verified';
    badge.textContent = '✓';
    badge.title = 'Cuenta verificada';
    badge.setAttribute('aria-label', 'Cuenta verificada');
    avatar.appendChild(badge);
  }

  function actualizarPerfilAbierto() {
    if (!esUsuarioVerificado()) return;
    const body = document.getElementById('modal-body');
    if (!body || document.getElementById('riverosapay-profile-verified')) return;
    const nombre = body.querySelector('h2');
    if (!nombre) return;

    const linea = document.createElement('div');
    linea.id = 'riverosapay-profile-verified';
    linea.className = 'riverosapay-profile-name';
    while (nombre.firstChild) nombre.removeChild(nombre.firstChild);
    nombre.appendChild(document.createTextNode(nombreMostrado()));

    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'riverosapay-verified-badge';
    badge.textContent = '✓';
    badge.title = 'Cuenta verificada';
    badge.setAttribute('aria-label', 'Cuenta verificada');

    const mensaje = document.createElement('div');
    mensaje.className = 'riverosapay-verified-message hidden';
    mensaje.textContent = 'Eres usuario verificado.';

    badge.addEventListener('click', function (ev) {
      ev.stopPropagation();
      mensaje.classList.toggle('hidden');
    });

    linea.appendChild(badge);
    nombre.replaceWith(linea);
    const contenedor = linea.parentElement;
    if (contenedor) contenedor.appendChild(mensaje);
  }

  function instalar() {
    if (window.__riverosapayPerfilVerificado) return;
    if (typeof window.openPerfil !== 'function') {
      setTimeout(instalar, 0);
      return;
    }
    window.__riverosapayPerfilVerificado = true;
    estilos();

    const openPerfilBase = window.openPerfil;
    window.openPerfil = function (...args) {
      const resultado = openPerfilBase.apply(this, args);
      actualizarInsigniaHeader();
      setTimeout(actualizarPerfilAbierto, 0);
      return resultado;
    };

    if (typeof window.actualizarHeaderUsuario === 'function') {
      const actualizarHeaderBase = window.actualizarHeaderUsuario;
      window.actualizarHeaderUsuario = function (...args) {
        const resultado = actualizarHeaderBase.apply(this, args);
        actualizarInsigniaHeader();
        return resultado;
      };
    }

    actualizarInsigniaHeader();
  }

  instalar();
})();
