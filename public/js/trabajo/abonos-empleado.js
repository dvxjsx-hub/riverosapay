/* ============================================================
   Riverosapay · ABONOS EMPLEADO
   Historial completo de abonos recibidos dentro de Trabajo.
   ============================================================ */
(function () {
  const icon = {
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19c.8-3.1 3.1-4.8 6.5-4.8s5.7 1.7 6.5 4.8"/></svg>',
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M7 9h.01M17 15h.01"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z"/><path d="M5 4.5v17M9 6h7M9 10h7"/></svg>'
  };

  function instalarEstilos() {
    if (document.getElementById('riverosapay-abonos-empleado-style')) return;
    const style = document.createElement('style');
    style.id = 'riverosapay-abonos-empleado-style';
    style.textContent = `
      .empleado-abonos{display:flex;flex-direction:column;gap:14px;padding-bottom:28px;animation:homeIn .2s ease both}
      .empleado-abonos-head{display:flex;align-items:center;gap:10px;margin-bottom:2px}
      .empleado-abonos-head .icon-btn.small{flex:none}
      .empleado-abonos-title{min-width:0}
      .empleado-abonos-title .eyebrow{display:block;color:var(--green-700);font-size:10.5px;font-weight:800;letter-spacing:.08em}
      .empleado-abonos-title h2{margin:2px 0 0;font-family:var(--font-display);font-size:21px;color:var(--green-900)}
      .empleado-abonos-total{background:var(--green-900);color:#fff;border-radius:var(--radius-md);padding:16px;box-shadow:var(--shadow-card)}
      .empleado-abonos-total .label{font-size:11.5px;color:rgba(255,255,255,.7)}
      .empleado-abonos-total strong{display:block;margin-top:2px;font-family:var(--font-display);font-size:25px}
      .empleado-abonos-total .meta{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.13);font-size:11.5px;color:rgba(255,255,255,.68)}
      .empleado-abonos-list{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md);box-shadow:var(--shadow-card);padding:2px 13px}
      .empleado-abono-row{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--line)}
      .empleado-abono-row:last-child{border-bottom:none}
      .empleado-abono-icon{width:36px;height:36px;flex:none;border-radius:10px;background:var(--green-100);color:var(--green-800);display:flex;align-items:center;justify-content:center}
      .empleado-abono-icon svg{width:19px;height:19px}
      .empleado-abono-main{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
      .empleado-abono-main strong{font-size:13.5px}
      .empleado-abono-main span{font-size:11.5px;color:var(--ink-soft);line-height:1.35}
      .empleado-abono-valor{font-family:var(--font-display);font-size:13.5px;color:var(--green-700);white-space:nowrap}
      .empleado-abono-empty{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md);padding:20px;text-align:center}
      .empleado-abono-empty .empty-icon{margin:0 auto 8px}
      .empleado-abono-empty h3{margin:0 0 4px;font-family:var(--font-display);font-size:15px;color:var(--green-900)}
      .empleado-abono-empty p{margin:0;font-size:12.5px}
    `;
    document.head.appendChild(style);
  }

  function formatoFecha(fecha) {
    if (!fecha) return 'Sin fecha';
    const partes = String(fecha).split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : String(fecha);
  }

  function nombreJefe(jefe) {
    return jefe?.jefeUsername || jefe?.nombreCompleto || 'BOSS';
  }

  async function obtenerAbonos() {
    const vinculados = await api.get(`/api/mis-jefes/${STATE.user.id}`);
    const jefes = Array.isArray(vinculados) ? vinculados : [];
    const respuestas = await Promise.all(jefes.map(async jefe => {
      try {
        const data = await api.get(`/api/abonos/jefe/${jefe.jefeId}/empleado/${STATE.user.id}`);
        return (data.abonos || []).map(a => ({ ...a, jefeNombre: nombreJefe(jefe) }));
      } catch (ex) {
        return [];
      }
    }));
    return respuestas.flat().sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')) || Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }

  async function mostrarAbonosEmpleado() {
    instalarEstilos();
    marcarTabActiva('trabajo');
    STATE.viewMode = 'empleado-abonos';
    closeDrawer();
    $('#content').innerHTML = `<div class="empleado-abonos"><div class="empleado-abonos-head"><button type="button" class="icon-btn small" onclick="volverTrabajoDesdeAbonos()" aria-label="Volver">←</button><div class="empleado-abonos-title"><span class="eyebrow">TRABAJO</span><h2>Todos tus abonos</h2></div></div><div class="muted" style="font-size:12.5px;">Aquí puedes consultar el historial completo de lo que has recibido.</div><div id="empleado-abonos-cuerpo"><div class="muted">Cargando tus abonos...</div></div></div>`;

    try {
      const abonos = await obtenerAbonos();
      const total = abonos.reduce((suma, a) => suma + Number(a.valor || 0), 0);
      const cuerpo = $('#empleado-abonos-cuerpo');
      if (!cuerpo) return;
      cuerpo.innerHTML = `<div class="empleado-abonos-total"><span class="label">Total recibido</span><strong>${dineroCO(total)}</strong><div class="meta">${abonos.length} ${abonos.length === 1 ? 'abono registrado' : 'abonos registrados'}</div></div>${abonos.length ? `<div><span class="home-section-label">HISTORIAL</span><div class="empleado-abonos-list">${abonos.map(a => `<div class="empleado-abono-row"><div class="empleado-abono-icon">${icon.money}</div><div class="empleado-abono-main"><strong>Abono</strong><span>${escapeHtml(formatoFecha(a.fecha))}${a.jefeNombre ? ` · ${escapeHtml(a.jefeNombre)}` : ''}${a.descripcion ? ` · ${escapeHtml(a.descripcion)}` : ''}</span></div><strong class="empleado-abono-valor">+${dineroCO(a.valor)}</strong></div>`).join('')}</div></div>` : `<div class="empleado-abono-empty"><div class="empty-icon">${icon.money}</div><h3>Aún no tienes abonos</h3><p class="muted">Cuando recibas uno aparecerá automáticamente aquí.</p></div>`}`;
    } catch (ex) {
      const cuerpo = $('#empleado-abonos-cuerpo');
      if (cuerpo) cuerpo.innerHTML = `<div class="empleado-abono-empty"><div class="empty-icon">${icon.money}</div><h3>No se pudo cargar el historial</h3><p class="muted">Inténtalo de nuevo en unos segundos.</p></div>`;
    }
  }

  window.abrirAbonosEmpleadoHome = mostrarAbonosEmpleado;
  window.volverTrabajoDesdeAbonos = async function () {
    STATE.viewMode = 'empleado';
    await loadTrabajo();
  };

  function reemplazarIconosHome() {
    if (modoActualUsuario() !== 'empleado') return;
    const h2 = document.querySelector('.home-welcome h2');
    if (h2 && !h2.dataset.iconDone) {
      h2.textContent = `Hola, ${nombreCortoUsuario()}`;
      const span = document.createElement('span');
      span.innerHTML = icon.user;
      span.style.cssText = 'display:inline-flex;width:20px;height:20px;margin-left:5px;vertical-align:-3px;color:var(--green-700);';
      span.firstElementChild.style.width = '100%';
      span.firstElementChild.style.height = '100%';
      h2.appendChild(span);
      h2.dataset.iconDone = '1';
    }
    document.querySelectorAll('.home-money-icon').forEach(el => { el.innerHTML = icon.money; el.style.color = 'rgba(255,255,255,.9)'; const svg=el.querySelector('svg'); if(svg){svg.style.width='20px';svg.style.height='20px';} });
    document.querySelectorAll('.home-schedule-icon').forEach(el => { el.innerHTML = icon.book; const svg=el.querySelector('svg'); if(svg){svg.style.width='18px';svg.style.height='18px';} });
    document.querySelectorAll('.home-payment-icon').forEach(el => { el.innerHTML = icon.money; const svg=el.querySelector('svg'); if(svg){svg.style.width='18px';svg.style.height='18px';} });
  }

  const observer = new MutationObserver(reemplazarIconosHome);
  observer.observe(document.body, { childList: true, subtree: true });
  reemplazarIconosHome();
})();
