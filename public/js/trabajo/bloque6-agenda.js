/* ============================================================
   Riverosapay · BLOQUE 6
   Permiso general por BOSS para ver Académicos y Eventos.
   El permiso ya NO pertenece a un trabajo individual.
   ============================================================ */
(function () {
  function instalar() {
    if (window.__riverosapayBloque6Agenda) return;
    if (typeof window.renderTrabajo !== 'function' || typeof window.refrescarJefeTrabajo !== 'function' || typeof window.renderJefeView !== 'function') {
      setTimeout(instalar, 0);
      return;
    }
    window.__riverosapayBloque6Agenda = true;

    const renderTrabajoBase = window.renderTrabajo;
    const refrescarJefeTrabajoBase = window.refrescarJefeTrabajo;
    const cambiarSubTabJefeBase = window.cambiarSubTabJefe;
    const renderJefeViewBase = window.renderJefeView;

    function permisoHTML(jefe) {
      const nombre = escapeHtml(jefe.jefeUsername || 'BOSS');
      const activo = jefe.puedeVerAgenda === true;
      return `<button class="settings-item" type="button" onclick="alternarPermisoAgendaGeneral('${jefe.jefeId}', ${!activo})" style="width:100%;text-align:left;margin-top:8px;">
        <span class="settings-icon" aria-hidden="true">◫</span>
        <span class="settings-label">${nombre}<span class="settings-value">${activo ? 'Sí' : 'No'}</span></span>
        <span class="theme-switch ${activo ? 'active' : ''}" role="switch" aria-label="Permitir a ${nombre} ver Académicos y Eventos" aria-checked="${activo}"><span></span></span>
      </button>`;
    }

    window.abrirPermisoAgendaGeneral = async function () {
      try {
        const data = await api.get(`/api/mis-jefes/${STATE.user.id}`);
        const jefes = data || [];
        if (!jefes.length) {
          openModal('Académicos y Eventos', '<p class="muted">No tienes BOSS vinculados actualmente.</p><button class="btn-secondary" onclick="closeModal()">Cerrar</button>');
          return;
        }
        openModal('Académicos y Eventos', `<p class="field-hint">Permite a cada BOSS vinculado consultar tus Académicos y Eventos en modo lectura. Este permiso es general y no depende de un trabajo.</p>${jefes.map(permisoHTML).join('')}<button class="btn-secondary" style="margin-top:10px;width:100%;" onclick="closeModal()">Cerrar</button>`);
      } catch (ex) { toast(ex.message); }
    };

    window.alternarPermisoAgendaGeneral = async function (jefeId, valor) {
      try {
        await api.patch(`/api/verificar/agenda-permiso/${jefeId}`, { puedeVerAgenda: Boolean(valor) });
        toast(valor ? 'Acceso a Académicos y Eventos activado' : 'Acceso a Académicos y Eventos desactivado');
        closeModal();
        await loadTrabajo();
      } catch (ex) { toast(ex.message); }
    };

    window.renderTrabajo = function () {
      renderTrabajoBase();
      if (STATE.viewMode !== 'jefe-ver') {
        const selector = document.querySelector('.trabajo-vista-selector');
        if (!selector || document.getElementById('permiso-agenda-general')) return;
        const bloque = document.createElement('div');
        bloque.id = 'permiso-agenda-general';
        bloque.style.marginTop = '10px';
        bloque.innerHTML = `<button class="settings-item" type="button" onclick="abrirPermisoAgendaGeneral()" style="width:100%;text-align:left;">
          <span class="settings-icon" aria-hidden="true">◫</span>
          <span class="settings-label">Permitir al BOSS ver mis Académicos y Eventos<span class="settings-value">Gestionar</span></span>
        </button>`;
        selector.parentElement?.insertAdjacentElement('afterend', bloque);
      }
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
