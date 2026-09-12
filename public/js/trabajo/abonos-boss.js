/* ============================================================
   Riverosapay · ABONOS BOSS · TANDA 3
   Historial de abonos dentro del perfil del empleado.
   ============================================================ */
(function () {
  function formatoFecha(fecha) {
    if (!fecha) return 'Sin fecha';
    const partes = String(fecha).split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : String(fecha);
  }

  function dinero(valor) {
    return Number(valor || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  }

  function totalPagadoTrabajos(turnos) {
    return (turnos || []).reduce((total, turno) => {
      if (turno.pagado !== true) return total;
      const valor = Number(turno.valor);
      return total + (Number.isFinite(valor) ? valor : 0);
    }, 0);
  }

  async function cargarAbonos() {
    const d = STATE.jefeView;
    if (!d || !d.empleadoId || d.empleadoTipo === 'personal') return { abonos: [], totalAbonos: 0 };
    return api.get(`/api/abonos/jefe/${STATE.user.id}/empleado/${d.empleadoId}`);
  }

  function pintarBotonAbonos() {
    const subtabs = document.querySelector('.subtabs');
    const d = STATE.jefeView;
    if (!subtabs || !d || d.activeSubTab !== 'trabajo' || d.empleadoTipo === 'personal') return;

    let wrap = document.getElementById('selector-abonos-boss');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'selector-abonos-boss';
      wrap.style.cssText = 'display:flex;justify-content:flex-end;margin:10px 0 12px;';
      subtabs.insertAdjacentElement('afterend', wrap);
    }

    wrap.innerHTML = `<button id="btn-mostrar-abonos" type="button" class="btn-secondary" onclick="toggleAbonosBoss()">${d.abonosVisible ? 'Ocultar abonos' : 'Mostrar abonos'}</button>`;
  }

  function pintarPanelAbonos(data) {
    const d = STATE.jefeView;
    if (!d || d.activeSubTab !== 'trabajo' || !d.abonosVisible) return;

    const existing = document.getElementById('panel-abonos-boss');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'panel-abonos-boss';
    panel.style.cssText = 'margin:0 0 14px;';

    const lista = data.abonos || [];
    const totalAbonos = Number(data.totalAbonos || 0);
    const totalPagado = totalPagadoTrabajos(d.turnos);
    const totalCombinado = totalPagado + totalAbonos;

    panel.innerHTML = `
      <div class="card" style="padding:16px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <div>
            <div style="font-size:13px;opacity:.72;margin-bottom:4px;">Total de abonos</div>
            <div style="font-size:24px;font-weight:800;">${dinero(totalAbonos)}</div>
          </div>
          <button class="btn-secondary" type="button" onclick="abrirCrearAbono()">💰 Añadir abono</button>
        </div>
      </div>
      ${lista.length ? lista.map(a => `
        <div class="card" style="padding:15px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
            <div>
              <div style="font-weight:800;font-size:17px;">${dinero(a.valor)}</div>
              <div style="font-size:13px;opacity:.72;margin-top:3px;">${formatoFecha(a.fecha)}</div>
            </div>
            <button type="button" class="btn-secondary" onclick="eliminarAbonoBoss('${escapeHtml(a.id)}')">Eliminar</button>
          </div>
          ${a.descripcion ? `<div style="margin-top:10px;white-space:pre-wrap;">${escapeHtml(a.descripcion)}</div>` : ''}
        </div>`).join('') : emptyCardHTML('ABONOS', 'Aún no hay abonos registrados para este empleado.', 'trabajo')}
      <div class="card" style="padding:16px;margin-top:10px;">
        <div style="font-size:13px;opacity:.72;">Total pagado</div>
        <div style="font-size:20px;font-weight:800;margin:3px 0 10px;">${dinero(totalPagado)}</div>
        <div style="font-size:13px;opacity:.72;">Total pagado + abono</div>
        <div style="font-size:22px;font-weight:800;margin-top:3px;">${dinero(totalCombinado)}</div>
      </div>`;

    const boton = document.getElementById('btn-mostrar-abonos');
    if (boton) boton.parentElement.insertAdjacentElement('afterend', panel);
  }

  async function refrescarPanelAbonos() {
    const d = STATE.jefeView;
    if (!d || !d.empleadoId || d.empleadoTipo === 'personal' || !d.abonosVisible) return;
    try {
      const data = await cargarAbonos();
      d.abonosData = data;
      pintarPanelAbonos(data);
    } catch (ex) {
      toast(ex.message);
    }
  }

  function instalar() {
    if (window.__riverosapayAbonosBoss) return;
    if (typeof window.renderJefeView !== 'function') {
      setTimeout(instalar, 0);
      return;
    }
    window.__riverosapayAbonosBoss = true;

    const renderJefeViewBase = window.renderJefeView;

    window.toggleAbonosBoss = async function () {
      const d = STATE.jefeView;
      if (!d) return;
      d.abonosVisible = !d.abonosVisible;
      d.abonosData = null;
      renderJefeView();
    };

    window.abrirCrearAbono = function () {
      const d = STATE.jefeView;
      if (!d || !d.empleadoId || d.empleadoTipo === 'personal') return;

      const nombre = d.empleadoNombre || d.empleadoUsername || 'empleado';
      const hoy = typeof fechaLocalISO === 'function' ? fechaLocalISO() : new Date().toISOString().slice(0, 10);

      openModal('Añadir abono', `
        <p class="field-hint">Registrar un abono para <strong>${escapeHtml(nombre)}</strong>. Este abono es independiente de los trabajos.</p>
        <label>Valor del abono<input id="f-abono-valor" type="number" min="0.01" step="0.01" placeholder="Ej. 50000" required></label>
        <label>Fecha<input id="f-abono-fecha" type="date" value="${hoy}" required></label>
        <label>Descripción (opcional)<textarea id="f-abono-descripcion" maxlength="200" placeholder="Ej. Abono de la semana..."></textarea>
        <p class="field-error" id="f-abono-error"></p>
        <button class="btn-primary" type="button" onclick="guardarAbono()">Guardar abono</button>
      `);
    };

    window.guardarAbono = async function () {
      const d = STATE.jefeView;
      const err = $('#f-abono-error');
      if (!d || !d.empleadoId) return;

      const valor = $('#f-abono-valor')?.value;
      const fecha = $('#f-abono-fecha')?.value;
      const descripcion = $('#f-abono-descripcion')?.value.trim() || '';

      if (!valor || !Number.isFinite(Number(valor)) || Number(valor) <= 0) {
        err.textContent = 'El valor del abono debe ser mayor que cero.';
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) {
        err.textContent = 'Selecciona una fecha válida.';
        return;
      }
      if (descripcion.length > 200) {
        err.textContent = 'La descripción no puede superar 200 caracteres.';
        return;
      }

      try {
        await api.post('/api/abonos', { empleadoId: d.empleadoId, valor: Number(valor), fecha, descripcion });
        closeModal();
        toast('Abono guardado');
        d.abonosVisible = true;
        d.abonosData = null;
        renderJefeView();
      } catch (ex) {
        err.textContent = ex.message;
      }
    };

    window.eliminarAbonoBoss = async function (abonoId) {
      if (!confirm('¿Eliminar este abono? Esta acción no se puede deshacer.')) return;
      try {
        await api.delete(`/api/abonos/${abonoId}`);
        toast('Abono eliminado');
        const d = STATE.jefeView;
        if (d) d.abonosData = null;
        await refrescarPanelAbonos();
      } catch (ex) {
        toast(ex.message);
      }
    };

    window.renderJefeView = function () {
      renderJefeViewBase();
      const d = STATE.jefeView;
      if (!d || !d.empleadoId || d.empleadoTipo === 'personal') return;

      if (d.activeSubTab !== 'trabajo') {
        const selector = document.getElementById('selector-abonos-boss');
        const panel = document.getElementById('panel-abonos-boss');
        if (selector) selector.remove();
        if (panel) panel.remove();
        return;
      }

      if (d.abonosVisible === undefined) d.abonosVisible = false;
      pintarBotonAbonos();
      if (d.abonosVisible) {
        const data = d.abonosData || { abonos: [], totalAbonos: 0 };
        pintarPanelAbonos(data);
        if (!d.abonosData) refrescarPanelAbonos();
      } else {
        const panel = document.getElementById('panel-abonos-boss');
        if (panel) panel.remove();
      }
    };
  }

  instalar();
})();
