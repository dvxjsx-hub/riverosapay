/* ============================================================
   Riverospay · TRABAJOS CONGELADOS
   Gestión exclusiva del BOSS: descongelar y ocultar en historial.
   ============================================================ */
(function () {
  let ocultarTrabajosCongelados = false;

  const trabajosVisiblesBase = window.trabajosVisibles;
  const abrirAccionesTrabajoBase = window.abrirAccionesTrabajo;

  window.trabajosVisibles = function (data) {
    let turnos = trabajosVisiblesBase(data);
    if (STATE.viewMode === 'jefe-ver' && ocultarTrabajosCongelados) {
      turnos = turnos.filter(t => t.congelado !== true);
    }
    return turnos;
  };

  function renderJefeTrabajo() {
    if (typeof renderJefeView === 'function') renderJefeView();
    else if (typeof renderTrabajo === 'function') renderTrabajo();
  }

  window.abrirAccionesTrabajo = function () {
    if (STATE.viewMode !== 'jefe-ver') {
      return abrirAccionesTrabajoBase();
    }

    const opciones = trabajoVistaActual === TRABAJO_VISTAS.HORARIOS
      ? `<button class="btn-primary" type="button" onclick="openAddTrabajo()">${ICONS.plus} Añadir trabajo</button>
         <button class="btn-secondary" type="button" onclick="abrirFiltroJefe()">Filtrar por BOSS</button>
         <button class="btn-secondary" type="button" onclick="abrirTrabajosCongelados()">Trabajos congelados</button>
         <button class="btn-ghost-danger" style="width:100%;margin-top:8px;" type="button" onclick="activarBorradoTrabajo()">Borrar trabajo</button>`
      : `<button class="btn-secondary" type="button" onclick="abrirFiltroPago()">Filtrar pago</button>
         <button class="btn-secondary" type="button" onclick="abrirFiltroJefe(true)">Filtrar por BOSS</button>
         <button class="btn-secondary" type="button" onclick="abrirTrabajosCongelados()">Trabajos congelados</button>
         <button class="btn-ghost-danger" style="width:100%;margin-top:8px;" type="button" onclick="activarBorradoTrabajo()">Borrar trabajo</button>`;

    openModal('Opciones de trabajo', opciones);
  };

  window.abrirTrabajosCongelados = function () {
    const data = STATE.jefeView || { turnos: [], lugares: [] };
    const congelados = (data.turnos || []).filter(t => t.congelado === true);

    const ocultarTexto = ocultarTrabajosCongelados
      ? 'Mostrar trabajos congelados en el historial'
      : 'Ocultar trabajos congelados del historial';

    const toggle = `<button class="btn-secondary" type="button" onclick="alternarOcultarTrabajosCongelados()">${ocultarTexto}</button>`;

    if (!congelados.length) {
      openModal('Trabajos congelados', `<p class="muted">No tienes trabajos congelados actualmente.</p>${toggle}<button class="btn-secondary" style="margin-top:8px;" type="button" onclick="closeModal()">Cerrar</button>`);
      return;
    }

    const filas = congelados.map(t => {
      const lugar = (data.lugares || []).find(l => l.id === t.lugarId);
      const nombre = lugar ? lugar.nombre : 'Trabajo';
      const fecha = t.fecha ? formatearFechaTrabajo(t.fecha) : 'Sin fecha';
      const pago = t.pagado ? 'Pagado' : 'No pagado';
      return `<div style="border-top:1px solid var(--line);padding:10px 0;">
        <div style="font-weight:700;color:var(--green-900);">${escapeHtml(nombre)}</div>
        <div class="muted" style="font-size:11px;margin-top:2px;">${escapeHtml(fecha)} · ${escapeHtml(t.horaInicio || '')}–${escapeHtml(t.horaFin || '')} · ${pago}</div>
        <button class="btn-secondary" style="width:100%;margin-top:7px;" type="button" onclick="pedirDescongelarTrabajo('${t.id}')">Descongelar trabajo</button>
      </div>`;
    }).join('');

    openModal('Trabajos congelados', `<p class="field-hint" style="margin-top:0;">Estos trabajos están protegidos. Descongélalos para volver a permitir cambios administrativos, incluida su eliminación por el BOSS.</p>${filas}${toggle}<button class="btn-secondary" style="margin-top:8px;" type="button" onclick="closeModal()">Cerrar</button>`);
  };

  window.alternarOcultarTrabajosCongelados = function () {
    ocultarTrabajosCongelados = !ocultarTrabajosCongelados;
    closeModal();
    renderJefeTrabajo();
    toast(ocultarTrabajosCongelados ? 'Trabajos congelados ocultos del historial' : 'Trabajos congelados visibles en el historial');
  };

  window.pedirDescongelarTrabajo = function (turnoId) {
    openModal('Descongelar trabajo', `<p style="margin:0 0 10px;">¿Quieres descongelar este trabajo?</p><p class="muted" style="margin:0;">Seguirá apareciendo como trabajo finalizado, pero volverá a admitir las acciones permitidas. Después podrás eliminarlo desde el modo BOSS.</p><div class="notif-actions" style="display:flex;gap:8px;margin-top:16px;"><button class="btn-secondary" type="button" onclick="abrirTrabajosCongelados()">Cancelar</button><button class="btn-primary" type="button" onclick="descongelarTrabajo('${turnoId}')">Descongelar</button></div>`);
  };

  window.descongelarTrabajo = async function (turnoId) {
    try {
      await api.post(`/api/trabajo/turnos/${encodeURIComponent(turnoId)}/descongelar`, {});
      toast('Trabajo descongelado');
      closeModal();
      await refrescarJefeTrabajo();
      renderJefeTrabajo();
    } catch (ex) {
      toast(ex.message);
    }
  };

  const congelarTrabajoBase = window.congelarTrabajo;
  window.congelarTrabajo = function (turnoId) {
    openModal('Congelar trabajo', `<p style="margin:0 0 12px;">Esta acción protegerá el trabajo contra cambios.</p><p class="muted" style="margin:0;">El trabajo quedará congelado y no podrá editarse ni eliminarse mientras esté protegido. El BOSS podrá descongelarlo posteriormente desde “Trabajos congelados”.</p><div class="notif-actions" style="display:flex;gap:8px;margin-top:16px;"><button class="btn-secondary" type="button" onclick="closeModal()">Cancelar</button><button class="btn-primary" type="button" onclick="confirmarCongelacionTrabajo('${turnoId}')">Confirmar</button></div>`);
  };

  // Evita que el módulo quede inutilizado si otra parte reemplaza la función original.
  window.__riverosapayTrabajosCongelados = true;
})();
