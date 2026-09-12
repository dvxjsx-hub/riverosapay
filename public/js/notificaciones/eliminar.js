/* Riverosapay · Notificaciones · gestión */
(function () {
  if (window.__riverosapayEliminarNotificaciones) return;
  window.__riverosapayEliminarNotificaciones = true;
  let modoSeleccion = false;
  const seleccionadas = new Set();
  function instalar() {
    if (typeof window.renderNotificacionesModal !== 'function') { setTimeout(instalar, 0); return; }
    if (window.__riverosapayEliminarNotificacionesInstalado) return;
    window.__riverosapayEliminarNotificacionesInstalado = true;
    const renderBase = window.renderNotificacionesModal;
    window.renderNotificacionesModal = function () { renderBase(); personalizarNotificaciones(); instalarControles(); decorarFilas(); };
  }
  function personalizarNotificaciones() {
    const titulo = document.querySelector('#modal-title');
    if (titulo) titulo.textContent = 'Notificaciones';
    const textos = document.querySelectorAll('#modal-body .notif-text');
    textos.forEach((contenedor) => {
      const walker = document.createTreeWalker(contenedor, NodeFilter.SHOW_TEXT);
      const nodos = [];
      let nodo;
      while ((nodo = walker.nextNode())) nodos.push(nodo);
      nodos.forEach((texto) => {
        if (!texto.nodeValue || !texto.nodeValue.includes('"')) return;
        const partes = texto.nodeValue.split(/("[^"]+")/g);
        if (partes.length < 2) return;
        const fragmento = document.createDocumentFragment();
        partes.forEach((parte) => {
          if (/^"[^"]+"$/.test(parte)) {
            const nombreTrabajo = document.createElement('span');
            nombreTrabajo.className = 'notif-work-name';
            nombreTrabajo.textContent = parte.slice(1, -1);
            fragmento.appendChild(nombreTrabajo);
          } else if (parte) {
            fragmento.appendChild(document.createTextNode(parte));
          }
        });
        texto.parentNode.replaceChild(fragmento, texto);
      });
    });
  }
  function puedeEliminar(notif) { return !!notif && notif.tipo !== 'solicitud' && notif.usuarioId === STATE.user.id; }
  function instalarControles() {
    const head = document.querySelector('#modal .modal-head');
    const close = document.querySelector('#modal-close');
    if (!head || !close) return;
    let boton = head.querySelector('[data-action="gestionar-notificaciones"]');
    if (!boton) {
      boton = document.createElement('button');
      boton.type = 'button'; boton.className = 'icon-btn small notif-manage-btn';
      boton.dataset.action = 'gestionar-notificaciones';
      boton.setAttribute('aria-label', 'Seleccionar notificaciones para eliminar');
      boton.title = 'Gestionar notificaciones';
      boton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path><path d="M9 6V4h6v2"></path></svg>';
      head.insertBefore(boton, close);
    }
    boton.classList.toggle('is-active', modoSeleccion);
    boton.setAttribute('aria-label', modoSeleccion ? 'Salir de selección' : 'Seleccionar notificaciones para eliminar');
    boton.title = modoSeleccion ? 'Salir de selección' : 'Gestionar notificaciones';
    boton.onclick = function () { modoSeleccion = !modoSeleccion; if (!modoSeleccion) seleccionadas.clear(); renderNotificacionesModal(); };
  }
  function decorarFilas() {
    const visibles = typeof window.notificacionesDelModoActual === 'function' ? window.notificacionesDelModoActual() : [];
    const filas = document.querySelectorAll('#modal-body .notif-row');
    filas.forEach((fila, index) => {
      const notif = visibles[index];
      if (!puedeEliminar(notif) || !modoSeleccion) return;
      fila.classList.add('notif-selectable');
      const selector = document.createElement('label');
      selector.className = 'notif-select-check'; selector.title = 'Seleccionar notificación';
      selector.innerHTML = `<input type="checkbox" ${seleccionadas.has(notif.id) ? 'checked' : ''} aria-label="Seleccionar notificación"><span></span>`;
      const input = selector.querySelector('input');
      input.addEventListener('change', function () { if (input.checked) seleccionadas.add(notif.id); else seleccionadas.delete(notif.id); actualizarBarraSeleccion(); });
      fila.insertBefore(selector, fila.firstChild);
    });
    if (modoSeleccion) crearBarraSeleccion();
  }
  function crearBarraSeleccion() {
    const body = document.querySelector('#modal-body'); if (!body) return;
    let barra = body.querySelector('[data-role="notif-selection-bar"]');
    if (!barra) {
      barra = document.createElement('div'); barra.dataset.role = 'notif-selection-bar'; barra.className = 'notif-selection-bar';
      barra.innerHTML = '<span data-role="notif-selection-count">0 seleccionadas</span><button type="button" class="btn-ghost-danger notif-bulk-delete" data-action="eliminar-seleccionadas" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path><path d="M9 6V4h6v2"></path></svg> Eliminar</button>';
      body.insertBefore(barra, body.firstChild); barra.querySelector('[data-action="eliminar-seleccionadas"]').addEventListener('click', eliminarSeleccionadasUI);
    }
    actualizarBarraSeleccion();
  }
  function actualizarBarraSeleccion() {
    const body = document.querySelector('#modal-body'); if (!body) return;
    const barra = body.querySelector('[data-role="notif-selection-bar"]'); if (!barra) return;
    const cantidad = seleccionadas.size;
    const texto = barra.querySelector('[data-role="notif-selection-count"]');
    const boton = barra.querySelector('[data-action="eliminar-seleccionadas"]');
    if (texto) texto.textContent = `${cantidad} seleccionada${cantidad === 1 ? '' : 's'}`;
    if (boton) boton.disabled = cantidad === 0;
  }
  async function eliminarSeleccionadasUI() {
    const ids = [...seleccionadas]; if (!ids.length) return;
    if (!window.confirm(`¿Eliminar ${ids.length} notificación${ids.length === 1 ? '' : 'es'} seleccionada${ids.length === 1 ? '' : 's'}?`)) return;
    try {
      await Promise.all(ids.map(id => api.delete(`/api/notificaciones/${STATE.user.id}/${encodeURIComponent(id)}`)));
      seleccionadas.clear(); modoSeleccion = false; toast(`${ids.length} notificación${ids.length === 1 ? '' : 'es'} eliminada${ids.length === 1 ? '' : 's'}`);
      await loadNotificaciones(); renderNotificacionesModal();
    } catch (ex) { toast(ex.message || 'No se pudieron eliminar las notificaciones.'); }
  }
  window.eliminarNotificacionUI = async function (notificacionId) {
    try {
      if (!window.confirm('¿Eliminar esta notificación?')) return;
      await api.delete(`/api/notificaciones/${STATE.user.id}/${encodeURIComponent(notificacionId)}`);
      seleccionadas.delete(notificacionId); toast('Notificación eliminada'); await loadNotificaciones(); renderNotificacionesModal();
    } catch (ex) { toast(ex.message || 'No se pudo eliminar la notificación.'); }
  };
  const style = document.createElement('style');
  style.textContent = `
    #modal .modal-head .notif-manage-btn{margin-left:auto;margin-right:6px;width:30px;height:30px;min-width:30px;}
    #modal .modal-head .notif-manage-btn svg{width:15px;height:15px;}
    #modal .modal-head .notif-manage-btn.is-active{background:var(--danger-100);color:var(--danger);}
    #modal-body .notif-row{background:transparent;border:0;border-radius:0;box-shadow:none;padding:8px 2px;gap:3px;min-height:0;}
    #modal-body .notif-row + .notif-row{border-top:1px solid var(--line);}
    #modal-body .notif-text{font-size:12px;line-height:1.38;}
    #modal-body .notif-text b{font-weight:650;}
    #modal-body .notif-work-name{color:var(--green-700);font-weight:650;}
    #modal-body .notif-fecha{font-size:9.5px;line-height:1.2;}
    #modal-body .notif-badge{font-size:9px;padding:3px 7px;}
    #modal-body .notif-actions{margin-top:5px!important;gap:6px!important;}
    #modal-body .notif-actions button{padding:6px 9px;font-size:10.5px;border-radius:7px;}
    #modal-body .notif-row.notif-selectable{position:relative;padding-left:26px;}
    #modal-body .notif-select-check{position:absolute;left:0;top:8px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2;}
    #modal-body .notif-select-check input{position:absolute;opacity:0;pointer-events:none;}
    #modal-body .notif-select-check span{width:15px;height:15px;border:1px solid var(--line);border-radius:4px;background:var(--surface);display:block;transition:.15s ease;}
    #modal-body .notif-select-check input:checked + span{background:var(--green-800);border-color:var(--green-800);box-shadow:inset 0 0 0 3px var(--surface);}
    #modal-body .notif-selectable > .notif-text,#modal-body .notif-selectable > .notif-fecha,#modal-body .notif-selectable > .notif-actions{margin-left:0;}
    #modal-body .notif-selection-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0;padding:4px 0 6px;color:var(--ink-soft);font-size:10px;}
    #modal-body .notif-bulk-delete{flex:none;width:auto;display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:5px 7px;margin:0;border-radius:7px;font-size:10px;line-height:1;}
    #modal-body .notif-bulk-delete svg{width:11px;height:11px;}
    #modal-body .notif-bulk-delete:disabled{opacity:.4;cursor:default;}
  `;
  document.head.appendChild(style);
  instalar();
})();
