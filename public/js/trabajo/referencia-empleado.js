/* Riverosapay · trabajos personalizados con BOSS de referencia */
(function () {
  function instalar() {
    if (window.__riverosapayReferenciaEmpleado) return;
    if (typeof window.openAddTrabajo !== 'function' || typeof window.openTurnoDetail !== 'function') {
      setTimeout(instalar, 0);
      return;
    }
    window.__riverosapayReferenciaEmpleado = true;

    const openAddTrabajoBase = window.openAddTrabajo;
    const submitTrabajoBase = window.submitTrabajo;
    const openTurnoDetailBase = window.openTurnoDetail;

    window.mostrarJefeReferenciaEmpleado = function (valor) {
      const wrap = $('#f-trabajo-jefe-ref-wrap');
      if (wrap) wrap.style.display = valor === '__referencia__' ? '' : 'none';
      const input = $('#f-trabajo-jefe-ref');
      if (input) input.required = valor === '__referencia__';
    };

    window.openAddTrabajo = async function () {
      if (STATE.viewMode === 'jefe-ver') return openAddTrabajoBase();
      try {
        const data = await api.get(`/api/amistades/${STATE.user.id}`);
        STATE.amistades = data.amistades || [];
        const opciones = STATE.amistades.map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.nombreCompleto || a.username)}</option>`).join('');
        const selector = `<label>BOSS<select id="f-trabajo-jefe" onchange="mostrarJefeReferenciaEmpleado(this.value)"><option value="">Sin BOSS · Trabajo personal</option><option value="__referencia__">Personalizado · BOSS de referencia</option>${opciones}</select></label><div id="f-trabajo-jefe-ref-wrap" style="display:none;"><label>Nombre de referencia<input id="f-trabajo-jefe-ref" type="text" maxlength="80" placeholder="Ej. Carlos Rivero"></label><p class="field-hint">Este BOSS es solo una referencia. El pago lo registras tú mismo.</p></div><p class="field-hint">El BOSS de una amistad queda fijado al crear el trabajo.</p>`;
        openModal('Añadir trabajo', `<label>Lugar<input id="f-trabajo-lugar" type="text" placeholder="Ej. Manga - Fontana" required></label><label>Fecha<input id="f-trabajo-fecha" type="date" required></label><div class="row-2"><label>Hora inicio<input id="f-trabajo-hi" type="time" required></label><label>Hora fin<input id="f-trabajo-hf" type="time" required></label></div><label>Descripción (opcional)<textarea id="f-trabajo-desc" placeholder="Notas sobre este trabajo..."></textarea>${selector}<p class="field-error" id="f-trabajo-error"></p><button class="btn-primary" onclick="submitTrabajo()">Guardar trabajo</button>`);
        const fecha = $('#f-trabajo-fecha');
        if (fecha) fecha.value = fechaLocalISO();
      } catch (ex) {
        openAddTrabajoBase();
      }
    };

    window.submitTrabajo = async function () {
      if (STATE.viewMode === 'jefe-ver') return submitTrabajoBase();
      const selectJefe = $('#f-trabajo-jefe');
      if (!selectJefe || selectJefe.value !== '__referencia__') return submitTrabajoBase();

      const lugar = $('#f-trabajo-lugar').value.trim();
      const fecha = $('#f-trabajo-fecha').value;
      const hi = $('#f-trabajo-hi').value;
      const hf = $('#f-trabajo-hf').value;
      const desc = $('#f-trabajo-desc').value.trim();
      const referencia = $('#f-trabajo-jefe-ref').value.trim();
      const err = $('#f-trabajo-error');
      if (!lugar || !fecha || !hi || !hf) { err.textContent = 'Completa lugar, fecha y horario.'; return; }
      if (!referencia) { err.textContent = 'Indica el nombre de referencia del BOSS.'; return; }
      if (referencia.length > 80) { err.textContent = 'El nombre de referencia no puede superar 80 caracteres.'; return; }
      const inicio = new Date(`${fecha}T${hi}`);
      const fin = new Date(`${fecha}T${hf}`);
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio) { err.textContent = 'La hora final debe ser posterior a la hora inicial.'; return; }

      try {
        const data = await api.post(`/api/trabajo/${targetEmpleadoId()}/turnos`, {
          lugar,
          fecha,
          dia: new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(new Date(`${fecha}T12:00:00`)),
          horaInicio: hi,
          horaFin: hf,
          descripcion: desc,
          jefeAsignadoId: null
        });
        await api.patch(`/api/trabajo/turnos/${data.turno.id}/pago-empleado`, { jefeReferenciaNombre: referencia });
        closeModal();
        toast('Trabajo personalizado añadido');
        await loadTrabajo();
      } catch (ex) {
        err.textContent = ex.message;
      }
    };

    window.openTurnoDetail = function (turnoId) {
      if (STATE.viewMode === 'jefe-ver') return openTurnoDetailBase(turnoId);
      const data = STATE.trabajo;
      const turno = data && (data.turnos || []).find(t => t.id === turnoId);
      if (!turno || turno.jefeAsignadoId || !turno.jefeReferenciaNombre) return openTurnoDetailBase(turnoId);

      const lugar = (data.lugares || []).find(l => l.id === turno.lugarId);
      const valorActual = turno.valor !== null && turno.valor !== undefined ? turno.valor : '';
      const finalizado = trabajoEstaFinalizado(turno) || turno.finalizado === true;
      const editable = !finalizado && turno.congelado !== true;
      const pagoHtml = editable
        ? `<label>Valor del pago<input id="f-valor-empleado" type="number" min="0" step="0.01" value="${valorActual}" placeholder="0.00"></label><label style="display:flex;align-items:center;gap:10px;cursor:pointer;"><input id="f-pagado-empleado" type="checkbox" ${turno.pagado ? 'checked' : ''}> Marcar como pagado</label><button class="btn-secondary" onclick="guardarPagoEmpleado('${turno.id}')">Guardar pago</button><p class="field-hint">Puedes registrar y modificar tú mismo el valor y el estado del pago.</p>`
        : `<div class="detail-row"><span>Pago</span><span>${valorActual === '' ? 'Sin registrar' : dineroCO(valorActual)} · ${turno.pagado ? 'Pagado' : 'No pagado'}</span><div class="notice-box">${turno.congelado === true ? 'Trabajo congelado. Ya no admite cambios.' : 'El trabajo ya finalizó. El pago ya no puede ser editado.'}</div>`;

      openModal('Detalle del trabajo', `<div class="detail-row"><span>Lugar</span><span>${escapeHtml(lugar ? lugar.nombre : '—')}</span></div><div class="detail-row"><span>Fecha</span><span>${turno.fecha ? escapeHtml(formatearFechaTrabajo(turno.fecha)) : escapeHtml(turno.dia || '—')}</span></div><div class="detail-row"><span>Hora</span><span>${escapeHtml(turno.horaInicio)} – ${escapeHtml(turno.horaFin)}</span></div><div><p class="muted" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;margin:0 0 6px;">Descripción</p><p style="margin:0;font-size:14px;">${turno.descripcion ? escapeHtml(turno.descripcion) : 'Sin descripción.'}</p></div><div class="detail-row"><span>BOSS de referencia</span><span>${escapeHtml(turno.jefeReferenciaNombre)}</span></div>${pagoHtml}<div class="detail-row"><span>Estado</span><span>${turno.pagado ? 'Pagado' : 'No pagado'}</span></div><button class="btn-ghost-danger" style="width:100%;" onclick="pedirConfirmacionEliminar('${turno.id}')">Eliminar trabajo</button>`);
    };
  }
  instalar();
})();
