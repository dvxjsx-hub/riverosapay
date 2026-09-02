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
    const abrirAccionesTrabajoBase = window.abrirAccionesTrabajo;
    const openAddTrabajoBase = window.openAddTrabajo;
    const abrirFiltroJefeBase = window.abrirFiltroJefe;
    const abrirCambiarJefeBase = window.abrirCambiarJefe;

    window.trabajoEstaFinalizado = function (turno) {
      if (turno && turno.finalizado === true) return true;
      return trabajoEstaFinalizadoBase(turno);
    };

    function reemplazarJefePorBoss() {
      const body = document.getElementById('modal-body');
      if (!body) return;
      body.innerHTML = body.innerHTML
        .replace(/>Jefe \(amistad\)</g, '>BOSS (amistad)')
        .replace(/>Jefe</g, '>BOSS<')
        .replace(/por jefe/g, 'por BOSS')
        .replace(/jefe asignado/g, 'BOSS asignado');
      const title = document.getElementById('modal-title');
      if (title) title.textContent = title.textContent.replace(/jefe/gi, 'BOSS');
    }

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

    window.abrirAccionesTrabajo = function () {
      abrirAccionesTrabajoBase();
      setTimeout(reemplazarJefePorBoss, 0);
    };

    window.openAddTrabajo = async function () {
      await openAddTrabajoBase();
      setTimeout(reemplazarJefePorBoss, 0);
    };

    window.abrirFiltroJefe = async function (soloFinalizados) {
      await abrirFiltroJefeBase(soloFinalizados);
      setTimeout(reemplazarJefePorBoss, 0);
    };

    window.abrirCambiarJefe = async function (turnoId) {
      await abrirCambiarJefeBase(turnoId);
      setTimeout(reemplazarJefePorBoss, 0);
    };
  }

  instalar();
})();
