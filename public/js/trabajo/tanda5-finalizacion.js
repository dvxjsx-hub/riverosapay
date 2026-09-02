/* ============================================================
   Riverosapay · TANDA 5 · FINALIZACIÓN EXPLÍCITA
   Se carga después de trabajo.js para añadir la acción sin
   reescribir el módulo estable completo.
   ============================================================ */

(function () {
  const detalleOriginal = window.openTurnoDetail;

  window.openTurnoDetail = function (turnoId) {
    if (typeof detalleOriginal === 'function') detalleOriginal(turnoId);

    const data = window.STATE && STATE.viewMode === 'jefe-ver' ? STATE.jefeView : STATE.trabajo;
    const turno = data && Array.isArray(data.turnos) ? data.turnos.find(t => t.id === turnoId) : null;
    if (!turno || turno.finalizado === true) return;

    const fin = typeof trabajoFechaReal === 'function' ? trabajoFechaReal(turno) : null;
    const yaPaso = !!fin && fin.getTime() <= Date.now();
    if (yaPaso) return;

    const body = document.getElementById('modal-body');
    if (!body || body.querySelector('[data-finalizar-trabajo]')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-primary';
    btn.dataset.finalizarTrabajo = 'true';
    btn.textContent = 'Finalizar trabajo';
    btn.style.width = '100%';
    btn.style.marginTop = '8px';
    btn.addEventListener('click', () => finalizarTrabajoTanda5(turnoId));
    body.appendChild(btn);
  };

  window.finalizarTrabajoTanda5 = async function (turnoId) {
    const body = document.getElementById('modal-body');
    const btn = body && body.querySelector('[data-finalizar-trabajo]');
    if (btn) { btn.disabled = true; btn.textContent = 'Finalizando…'; }

    try {
      await api.post(`/api/trabajo/turnos/${turnoId}/finalizar`, {});
      closeModal();
      toast('Trabajo finalizado');

      if (STATE.viewMode === 'jefe-ver') {
        await refrescarJefeTrabajo();
        renderJefeView();
      } else {
        await loadTrabajo();
      }
    } catch (ex) {
      if (btn) { btn.disabled = false; btn.textContent = 'Finalizar trabajo'; }
      toast(ex.message || 'No se pudo finalizar el trabajo.');
    }
  };
})();
