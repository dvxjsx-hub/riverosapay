/* ============================================================
   Riverospay · NOTIFICACIONES · Eliminación
   Permite borrar únicamente notificaciones propias.
   ============================================================ */
(function () {
  if (window.__riverosapayEliminarNotificaciones) return;
  window.__riverosapayEliminarNotificaciones = true;

  function instalar() {
    if (typeof window.renderNotificacionesModal !== 'function') {
      setTimeout(instalar, 0);
      return;
    }
    if (window.__riverosapayEliminarNotificacionesInstalado) return;
    window.__riverosapayEliminarNotificacionesInstalado = true;

    const renderBase = window.renderNotificacionesModal;

    window.renderNotificacionesModal = function () {
      renderBase();

      const visibles = typeof window.notificacionesDelModoActual === 'function'
        ? window.notificacionesDelModoActual()
        : [];
      const filas = document.querySelectorAll('#modal-body .notif-row');

      filas.forEach((fila, index) => {
        const notif = visibles[index];
        if (!notif || notif.tipo === 'solicitud' || notif.usuarioId !== STATE.user.id) return;
        if (fila.querySelector('[data-action="eliminar-notificacion"]')) return;

        const acciones = document.createElement('div');
        acciones.className = 'notif-actions';
        acciones.style.cssText = 'display:flex;justify-content:flex-end;margin-top:8px;';

        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'btn-ghost-danger';
        boton.dataset.action = 'eliminar-notificacion';
        boton.textContent = 'Eliminar';
        boton.addEventListener('click', function () {
          eliminarNotificacionUI(notif.id);
        });

        acciones.appendChild(boton);
        fila.appendChild(acciones);
      });
    };
  }

  window.eliminarNotificacionUI = async function (notificacionId) {
    try {
      if (!window.confirm('¿Eliminar esta notificación?')) return;
      await api.delete(`/api/notificaciones/${STATE.user.id}/${encodeURIComponent(notificacionId)}`);
      toast('Notificación eliminada');
      await loadNotificaciones();
      renderNotificacionesModal();
    } catch (ex) {
      toast(ex.message || 'No se pudo eliminar la notificación.');
    }
  };

  instalar();
})();
