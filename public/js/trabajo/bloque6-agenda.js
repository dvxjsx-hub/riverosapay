/* ============================================================
   Riverosapay · BLOQUE 6
   Permiso del empleado para que su BOSS vea Académicos y Eventos.
   Solo lectura: el BOSS nunca puede editar esta información.
   ============================================================ */
(function () {
  function instalar() {
    if (window.__riverosapayBloque6Agenda) return;
    if (typeof window.openAddTrabajo !== 'function' || typeof window.openTurnoDetail !== 'function' || typeof window.refrescarJefeTrabajo !== 'function') {
      setTimeout(instalar, 0);
      return;
    }
    window.__riverosapayBloque6Agenda = true;

    const openAddTrabajoBase = window.openAddTrabajo;
    const openTurnoDetailBase = window.openTurnoDetail;
    const refrescarJefeTrabajoBase = window.refrescarJefeTrabajo;
    const cambiarSubTabJefeBase = window.cambiarSubTabJefe;
    const renderJefeViewBase = window.renderJefeView;

    function switchHTML(id, activo, etiqueta, descripcion, esNuevo = false) {
      const accion = esNuevo ? `alternarPermisoAgendaNuevo(${!activo})` : `alternarPermisoAgenda('${id}', ${!activo})`;
      return `<button class="settings-item" type="button" onclick="${accion}" style="width:100%;text-align:left;">
        <span class="settings-icon" aria-hidden="true">◫</span>
        <span class="settings-label">${etiqueta}<span class="settings-value">${activo ? 'Sí' : 'No'}</span></span>
        <span class="theme-switch ${activo ? 'active' : ''}" id="agenda-toggle-${id}" role="switch" aria-label="${etiqueta}" aria-checked="${activo}"><span></span></span>
      </button>${descripcion ? `<p class="field-hint" style="margin-top:6px;">${descripcion}</p>` : ''}`;
    }

    function instalarToggleEnCrear() {
      const select = document.getElementById('f-trabajo-jefe');
      if (!select || document.getElementById('f-permiso-agenda')) return;
      const contenedor = document.createElement('div');
      contenedor.id = 'f-permiso-agenda';
      contenedor.style.marginTop = '10px';
      contenedor.innerHTML = switchHTML('nuevo', false, 'Permitir al BOSS ver mis Académicos y Eventos', 'Podrá consultar tu horario y tus eventos únicamente en modo lectura.', true);
      const referencia = select.closest('label')?.nextElementSibling;
      if (referencia) referencia.insertAdjacentElement('afterend', contenedor);
      else document.getElementById('modal-body')?.appendChild(contenedor);
      actualizarToggleCrear();
      select.addEventListener('change', actualizarToggleCrear);
    }

    function actualizarToggleCrear() {
      const select = document.getElementById('f-trabajo-jefe');
      const contenedor = document.getElementById('f-permiso-agenda');
      if (!select || !contenedor) return;
      const visible = Boolean(select.value);
      contenedor.style.display = visible ? '' : 'none';
      if (!visible) {
        const sw = document.getElementById('agenda-toggle-nuevo');
        if (sw) { sw.classList.remove('active'); sw.setAttribute('aria-checked', 'false'); }
        const val = contenedor.querySelector('.settings-value');
        if (val) val.textContent = 'No';
        window.__riverosapayPermisoAgendaNuevo = false;
      }
    }

    window.alternarPermisoAgendaNuevo = function (valor) {
      window.__riverosapayPermisoAgendaNuevo = Boolean(valor);
      const sw = document.getElementById('agenda-toggle-nuevo');
      const val = document.querySelector('#f-permiso-agenda .settings-value');
      if (sw) { sw.classList.toggle('active', window.__riverosapayPermisoAgendaNuevo); sw.setAttribute('aria-checked', String(window.__riverosapayPermisoAgendaNuevo)); }
      if (val) val.textContent = window.__riverosapayPermisoAgendaNuevo ? 'Sí' : 'No';
    };

    window.openAddTrabajo = async function () {
      window.__riverosapayPermisoAgendaNuevo = false;
      await openAddTrabajoBase();
      setTimeout(instalarToggleEnCrear, 0);
    };

    window.submitTrabajo = async function () {
      const lugar = document.getElementById('f-trabajo-lugar')?.value.trim();
      const fecha = document.getElementById('f-trabajo-fecha')?.value;
      const hi = document.getElementById('f-trabajo-hi')?.value;
      const hf = document.getElementById('f-trabajo-hf')?.value;
      const desc = document.getElementById('f-trabajo-desc')?.value.trim() || '';
      const err = document.getElementById('f-trabajo-error');
      const selectJefe = document.getElementById('f-trabajo-jefe');
      if (!lugar || !fecha || !hi || !hf) { if (err) err.textContent = 'Completa lugar, fecha y horario.'; return; }
      const inicio = new Date(`${fecha}T${hi}`);
      const fin = new Date(`${fecha}T${hf}`);
      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio) { if (err) err.textContent = 'La hora final debe ser posterior a la hora inicial.'; return; }
      const esJefe = STATE.viewMode === 'jefe-ver';
      const permiso = Boolean(!esJefe && selectJefe?.value && window.__riverosapayPermisoAgendaNuevo === true);
      try {
        await api.post(`/api/trabajo/${targetEmpleadoId()}/turnos`, {
          lugar, fecha,
          dia: new Intl.DateTimeFormat('es-CO', { weekday: 'long' }).format(new Date(`${fecha}T12:00:00`)),
          horaInicio: hi, horaFin: hf, descripcion,
          jefeAsignadoId: selectJefe ? (selectJefe.value || null) : null,
          puedeVerAgendaJefe: permiso,
          actorJefeId: esJefe ? STATE.user.id : undefined,
          actorJefeUsername: esJefe ? STATE.user.username : undefined
        });
        closeModal();
        toast('Trabajo añadido');
        if (STATE.viewMode === 'jefe-ver') { await refrescarJefeTrabajo(); renderJefeView(); }
        else await loadTrabajo();
      } catch (ex) { if (err) err.textContent = ex.message; }
    };

    window.openTurnoDetail = function (turnoId) {
      openTurnoDetailBase(turnoId);
      setTimeout(function () {
        const isJefe = STATE.viewMode === 'jefe-ver';
        if (isJefe) return;
        const data = STATE.trabajo;
        const turno = data && (data.turnos || []).find(t => t.id === turnoId);
        if (!turno || !turno.jefeAsignadoId) return;
        const body = document.getElementById('modal-body');
        if (!body || body.querySelector('[data-action="permiso-agenda"]')) return;
        const bloque = document.createElement('div');
        bloque.dataset.action = 'permiso-agenda';
        bloque.style.marginTop = '12px';
        bloque.innerHTML = switchHTML(turno.id, turno.puedeVerAgendaJefe === true, 'Permitir al BOSS ver mis Académicos y Eventos', 'El BOSS puede consultar tu horario y tus eventos, pero no puede editarlos.');
        const eliminar = body.querySelector('.btn-ghost-danger');
        if (eliminar) body.insertBefore(bloque, eliminar);
        else body.appendChild(bloque);
      }, 0);
    };

    window.alternarPermisoAgenda = async function (turnoId, valor) {
      try {
        await api.patch(`/api/trabajo/turnos/${turnoId}/permiso-agenda`, { puedeVerAgendaJefe: Boolean(valor) });
        toast(valor ? 'Acceso a Académicos y Eventos activado' : 'Acceso a Académicos y Eventos desactivado');
        await loadTrabajo();
        openTurnoDetail(turnoId);
      } catch (ex) { toast(ex.message); }
    };

    window.refrescarJefeTrabajo = async function () {
      await refrescarJefeTrabajoBase();
      if (!STATE.jefeView) return;
      const d = await api.get(`/api/verificar/datos/${STATE.jefeView.empleadoId}?jefeId=${STATE.user.id}`);
      STATE.jefeView.puedeVerAgenda = d.puedeVerAgenda === true;
      STATE.jefeView.esEstudiante = d.esEstudiante;
    };

    window.cambiarSubTabJefe = async function (tab) {
      if (!STATE.jefeView) return;
      if (tab !== 'trabajo' && STATE.jefeView.puedeVerAgenda !== true) {
        await refrescarJefeTrabajo();
        if (STATE.jefeView.puedeVerAgenda !== true) {
          toast('El empleado no ha permitido que veas sus Académicos y Eventos.');
          STATE.jefeView.activeSubTab = 'trabajo';
          renderJefeView();
          return;
        }
      }
      if (tab === 'trabajo') return cambiarSubTabJefeBase(tab);
      STATE.jefeView.activeSubTab = tab;
      try {
        if (tab === 'estudio') {
          const d = await api.get(`/api/verificar/estudio/${STATE.jefeView.empleadoId}?jefeId=${STATE.user.id}`);
          STATE.jefeView.materias = d.materias || [];
          STATE.jefeView.actividades = d.actividades || [];
        } else if (tab === 'evento') {
          STATE.jefeView.eventos = await api.get(`/api/verificar/evento/${STATE.jefeView.empleadoId}?jefeId=${STATE.user.id}`);
        }
        renderJefeView();
      } catch (ex) {
        toast(ex.message);
        STATE.jefeView.activeSubTab = 'trabajo';
        renderJefeView();
      }
    };

    window.renderJefeView = function () {
      const d = STATE.jefeView;
      if (!d) return renderJefeViewBase();
      const sub = d.activeSubTab;
      const mostrarAgenda = d.puedeVerAgenda === true;
      const subtabsHtml = `<div class="subtabs"><button class="subtab ${sub === 'trabajo' ? 'active' : ''}" onclick="cambiarSubTabJefe('trabajo')">Trabajo</button>${mostrarAgenda ? `<button class="subtab ${sub === 'estudio' ? 'active' : ''}" onclick="cambiarSubTabJefe('estudio')">Académicos</button><button class="subtab ${sub === 'evento' ? 'active' : ''}" onclick="cambiarSubTabJefe('evento')">Eventos</button>` : ''}</div>`;
      let body = '';
      if (sub === 'trabajo') {
        const selector = `<div style="margin-bottom:10px;"><button class="trabajo-vista-selector" style="width:100%;display:flex;justify-content:space-between;align-items:center;background:rgba(21,92,49,.08);border:1.5px solid var(--line);border-radius:var(--radius-md);padding:14px 16px;color:var(--green-900);font-family:var(--font-display);font-weight:700;font-size:15px;cursor:pointer;" type="button" onclick="abrirSelectorTrabajo()"><span>${trabajoVistaActual === TRABAJO_VISTAS.HORARIOS ? 'Horarios' : 'Finalizados'}</span><span>⌄</span></button></div>`;
        const propios = trabajoDelJefeFiltrado(d);
        body = selector + (propios.lugares.length ? trabajoListHTML(propios) : emptyCardHTML('TRABAJO', trabajoVistaActual === TRABAJO_VISTAS.FINALIZADOS ? 'No tienes trabajos finalizados asignados de este usuario.' : 'No tienes trabajos próximos asignados de este usuario.', 'trabajo'));
      } else if (sub === 'estudio') {
        const btnPendientes = `<button class="btn-add" onclick="openPendientes()">${ICONS.estudio} Ver actividades pendientes</button>`;
        body = `<div class="notice-box" style="margin-bottom:10px;">Horario académico en modo lectura. El BOSS no puede editarlo.</div>${estudioGridHTML(d.materias || [], false)}${btnPendientes}`;
      } else {
        body = `<div class="notice-box" style="margin-bottom:10px;">Eventos en modo lectura. El BOSS no puede editarlos.</div>${eventosListHTML(d.eventos || [], false)}${trabajosAjenosComoEventosHTML(d)}`;
      }
      $('#content').innerHTML = `<div class="view-head"><button class="view-back" onclick="volverAHistorial()">${ICONS.back}</button><span class="view-title">${escapeHtml(d.empleadoUsername)}</span></div>${subtabsHtml}${body}`;
    };
  }
  instalar();
})();
