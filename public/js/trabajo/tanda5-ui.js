/* ============================================================
   Riverospay · TRABAJO · Tanda 5 UI
   Complemento seguro cargado después de los módulos principales.
   ============================================================ */
(function () {
  function instalar() {
    if (window.__riverosapayTanda5UI) return;
    if (typeof window.openTurnoDetail !== 'function' || typeof window.trabajoEstaFinalizado !== 'function') {
      setTimeout(instalar, 0);
      return;
    }

    window.__riverosapayTanda5UI = true;

    const trabajoEstaFinalizadoBase = window.trabajoEstaFinalizado;
    const openTurnoDetailBase = window.openTurnoDetail;

    window.trabajoEstaFinalizado = function (turno) {
      if (turno && turno.finalizado === true) return true;
      return trabajoEstaFinalizadoBase(turno);
    };

    function esTurnoFinalizado(turno) {
      return !!turno && window.trabajoEstaFinalizado(turno);
    }

    window.openTurnoDetail = function (turnoId) {
      openTurnoDetailBase(turnoId);
      setTimeout(function () {
        const isJefe = STATE.viewMode === 'jefe-ver';
        const data = isJefe ? STATE.jefeView : STATE.trabajo;
        const turno = data && (data.turnos || []).find(t => t.id === turnoId);
        if (!turno || esTurnoFinalizado(turno) || turno.eliminacionPendiente) return;

        const body = document.getElementById('modal-body');
        if (!body || body.querySelector('[data-action="finalizar-trabajo"]')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-secondary';
        btn.style.width = '100%';
        btn.style.marginTop = '8px';
        btn.dataset.action = 'finalizar-trabajo';
        btn.textContent = 'Finalizar trabajo';
        btn.addEventListener('click', function () {
          finalizarTrabajoUI(turnoId, isJefe);
        });

        const eliminar = body.querySelector('.btn-ghost-danger');
        if (eliminar) body.insertBefore(btn, eliminar);
        else body.appendChild(btn);
      }, 0);
    };

    async function finalizarTrabajoUI(turnoId, isJefe) {
      try {
        const ok = window.confirm('¿Marcar este trabajo como finalizado?');
        if (!ok) return;
        await api.post(`/api/trabajo/turnos/${turnoId}/finalizar`);
        closeModal();
        toast('Trabajo finalizado');
        trabajoModoBorrado = false;
        if (isJefe) {
          await refrescarJefeTrabajo();
          renderJefeView();
        } else {
          await loadTrabajo();
        }
      } catch (ex) {
        toast(ex.message || 'No se pudo finalizar el trabajo.');
      }
    }

    setTimeout(function () {
      if (typeof cargarModulo === 'function') {
        cargarModulo('eliminarNotificaciones').catch(err => console.error(err));
      }
    }, 0);
  }

  instalar();
})();
