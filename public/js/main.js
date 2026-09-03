/* ============================================================
   Riverospay · ARRANQUE: wiring de drawer/perfil/modal + bootstrap DOMContentLoaded
   ============================================================ */

function cargarModuloAmistades() {
  return new Promise((resolve, reject) => {
    if (typeof openAmistades === 'function') return resolve();
    const script = document.createElement('script');
    script.src = 'js/amistades/amistades.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('No se pudo cargar el módulo de amistades.'));
    document.head.appendChild(script);
  });
}

function prepararDrawerAmistades() {
  const drawer = $('#drawer');
  if (!drawer) return;
  $('#drawer-compartir')?.classList.add('hidden');
  $('#drawer-verificar')?.classList.add('hidden');
  let item = $('#drawer-amistades');
  if (!item) {
    item = document.createElement('button'); item.className = 'drawer-item'; item.id = 'drawer-amistades';
    item.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.8 19c.7-3.2 2.5-4.8 5.2-4.8s4.5 1.6 5.2 4.8"/><path d="M14.5 14.8c2.8.1 4.7 1.4 5.3 4.2"/></svg> Amistades`;
    const referencia = $('#drawer-notificaciones') || $('#drawer-informacion'); drawer.insertBefore(item, referencia);
  }
}

function setupDrawer() {
  prepararDrawerAmistades();
  $('#btn-menu').addEventListener('click', openDrawer);
  $('#drawer-overlay').addEventListener('click', closeDrawer);
  $('#drawer-inicio').addEventListener('click', () => {
    closeDrawer(); $('#tabbar').classList.add('hidden'); $all('.tab').forEach(b => b.classList.remove('active'));
    STATE.activeTab = null; STATE.jefeView = null; STATE.viewMode = modoActualUsuario() === 'jefe' ? 'jefe-home' : 'empleado'; renderHome();
  });
  $('#drawer-amistades').addEventListener('click', () => { closeDrawer(); openAmistades(); });
  $('#drawer-compartir').classList.add('hidden'); $('#drawer-verificar').classList.add('hidden');
  $('#drawer-notificaciones').addEventListener('click', () => { closeDrawer(); openNotificaciones(); });
  $('#drawer-informacion').addEventListener('click', () => { closeDrawer(); openInformacion(); });
  $('#drawer-logout').addEventListener('click', () => {
    closeDrawer(); if (STATE.socket) { STATE.socket.disconnect(); STATE.socket = null; }
    STATE.user = null; STATE.viewMode = 'empleado'; STATE.activeTab = null; STATE.trabajo = { lugares: [], turnos: [] }; STATE.estudio = []; STATE.actividades = []; STATE.eventos = []; STATE.historial = []; STATE.amistades = []; STATE.notificaciones = []; STATE.jefeView = null; STATE.pendingRequest = null; STATE.onboardingPending = false;
    $('#tabbar').classList.add('hidden'); showScreen('screen-auth'); setAuthMode('login');
    const lastUser = localStorage.getItem('riverospay_last_user'); if (lastUser) $('#log-user').value = lastUser; $('#log-pass').value = ''; setTimeout(() => $('#log-user')?.focus({ preventScroll: true }), 80);
  });
}

function setupPerfil() { $('#btn-perfil').addEventListener('click', openPerfil); }
function setupModal() { $('#modal-close').addEventListener('click', closeModal); $('#modal-overlay').addEventListener('click', closeModal); }

function nombreJefePorId(id) {
  if (!id) return null;
  if (STATE.viewMode === 'jefe-ver' && STATE.user && id === STATE.user.id) return STATE.user.nombreCompleto || STATE.user.username;
  const fuentes = [STATE.trabajo, STATE.jefeView].filter(Boolean);
  for (const fuente of fuentes) {
    const turno = (fuente.turnos || []).find(t => t.jefeAsignadoId === id && (t.jefeNombre || t.jefeUsername));
    if (turno) return turno.jefeNombre || turno.jefeUsername;
  }
  const a = (STATE.amistades || []).find(x => x.id === id);
  return a ? (a.nombreCompleto || a.username) : null;
}

function normalizarTextoBossEnModal(pares) {
  const title = $('#modal-title'); if (title) { const original = title.textContent.trim(); const reemplazo = pares[original]; if (reemplazo) title.textContent = reemplazo; }
  const body = $('#modal-body'); if (!body) return; const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT); const nodos = []; let node;
  while ((node = walker.nextNode())) nodos.push(node); nodos.forEach(n => { const t = n.nodeValue.trim(); const reemplazo = pares[t]; if (reemplazo) n.nodeValue = n.nodeValue.replace(t, reemplazo); });
}
function aplicarEstiloSelectorTrabajo() { const selector = document.querySelector('.trabajo-vista-selector'); if (!selector) return; selector.style.background = 'rgba(21,92,49,.08)'; selector.style.color = 'var(--green-900)'; selector.style.border = '1.5px solid var(--line)'; }
const _renderTrabajoT5 = typeof renderTrabajo === 'function' ? renderTrabajo : null; if (_renderTrabajoT5) renderTrabajo = function() { _renderTrabajoT5(); aplicarEstiloSelectorTrabajo(); };
const _renderJefeViewT5 = typeof renderJefeView === 'function' ? renderJefeView : null; if (_renderJefeViewT5) renderJefeView = function() { _renderJefeViewT5(); aplicarEstiloSelectorTrabajo(); };
function abrirSelectorTrabajo() { const actual = trabajoVistaActual === TRABAJO_VISTAS.HORARIOS ? 'Horarios' : 'Finalizados'; const opcion = (vista, texto) => `<button class="btn-secondary" type="button" style="width:100%;margin-top:8px;background:rgba(21,92,49,.08);color:var(--green-900);border:1.5px solid var(--line);font-weight:700;" onclick="cambiarVistaTrabajo('${vista}')">${texto}${actual === texto ? ' ✓' : ''}</button>`; openModal('Trabajo', `${opcion('horarios', 'Horarios')}${opcion('finalizados', 'Finalizados')}`); }
const _abrirAccionesTrabajoT5 = typeof abrirAccionesTrabajo === 'function' ? abrirAccionesTrabajo : null; if (_abrirAccionesTrabajoT5) abrirAccionesTrabajo = function() { _abrirAccionesTrabajoT5(); document.querySelectorAll('#modal-body button').forEach(btn => { if (btn.textContent.trim() === 'Filtrar por jefe') btn.textContent = 'Filtrar por BOSS'; }); };
const _abrirFiltroJefeT5 = typeof abrirFiltroJefe === 'function' ? abrirFiltroJefe : null; if (_abrirFiltroJefeT5) abrirFiltroJefe = async function(...args) { await _abrirFiltroJefeT5(...args); normalizarTextoBossEnModal({ 'Filtrar por jefe': 'Filtrar por BOSS', 'Selecciona un jefe': 'Selecciona un BOSS', 'Todos los jefes': 'Todos los BOSS', 'No hay jefes registrados en tus trabajos.': 'No hay BOSS registrados en tus trabajos.' }); };
const _openAddTrabajoT5 = typeof openAddTrabajo === 'function' ? openAddTrabajo : null; if (_openAddTrabajoT5) openAddTrabajo = async function(...args) { await _openAddTrabajoT5(...args); normalizarTextoBossEnModal({ 'Jefe (amistad)': 'BOSS (amistad)', 'El jefe se selecciona únicamente entre tus amistades.': 'El BOSS se selecciona únicamente entre tus amistades.' }); };
const _openTurnoDetailT5 = typeof openTurnoDetail === 'function' ? openTurnoDetail : null; if (_openTurnoDetailT5) openTurnoDetail = function(...args) { _openTurnoDetailT5(...args); normalizarTextoBossEnModal({ 'Jefe': 'BOSS', 'Sin jefe': 'Sin BOSS' }); };
const _abrirCambiarJefeT5 = typeof abrirCambiarJefe === 'function' ? abrirCambiarJefe : null; if (_abrirCambiarJefeT5) abrirCambiarJefe = async function(...args) { await _abrirCambiarJefeT5(...args); normalizarTextoBossEnModal({ 'Cambiar jefe asignado': 'Cambiar BOSS asignado', 'Jefe': 'BOSS' }); };
const _setPagadoT5 = typeof setPagado === 'function' ? setPagado : null; if (_setPagadoT5) setPagado = async function(turnoId, pagado) { try { await api.patch(`/api/trabajo/turnos/${turnoId}`, { pagado, actorJefeId: STATE.user.id, actorJefeUsername: STATE.user.username }); toast(pagado ? 'Marcado como pagado' : 'Marcado como no pagado'); await refrescarJefeTrabajo(); openTurnoDetail(turnoId); } catch (ex) { toast(ex.message); } };
const _guardarValorT5 = typeof guardarValor === 'function' ? guardarValor : null; if (_guardarValorT5) guardarValor = async function(turnoId) { const raw = $('#f-valor')?.value; try { await api.patch(`/api/trabajo/turnos/${turnoId}`, { valor: raw === '' ? null : Number(raw), actorJefeId: STATE.user.id, actorJefeUsername: STATE.user.username }); toast('Valor guardado'); await refrescarJefeTrabajo(); openTurnoDetail(turnoId); } catch (ex) { toast(ex.message); } };

function aplicarUIAuth() {
  const sub = $('#auth-sub');
  if (sub) sub.textContent = '';
  const toggle = $('#auth-toggle');
  if (toggle) toggle.textContent = 'Crear nueva cuenta';
  const regUser = $('#reg-user');
  if (regUser) {
    regUser.placeholder = '';
    regUser.removeAttribute('maxlength');
    regUser.removeAttribute('minlength');
    if (regUser.dataset.usernameFilter !== '1') {
      regUser.dataset.usernameFilter = '1';
      regUser.addEventListener('input', () => {
        regUser.value = (regUser.value || '').replace(/[^a-zA-Z]/g, '');
      });
    }
  }
  const regTitle = $('#auth-title');
  if (regTitle && $('#form-register') && !$('#form-register').classList.contains('hidden')) regTitle.textContent = 'Crear usuario';
}

const _abrirAyudaLoginAuthUI = typeof abrirAyudaLogin === 'function' ? abrirAyudaLogin : null;
if (_abrirAyudaLoginAuthUI) {
  abrirAyudaLogin = function() {
    _abrirAyudaLoginAuthUI();
    const body = $('#modal-body');
    if (!body) return;
    [...body.querySelectorAll('button')].forEach(btn => {
      if (btn.textContent.trim() === 'Olvidar este dispositivo') btn.remove();
    });
  };
}

const _setAuthModeAuthUI = typeof setAuthMode === 'function' ? setAuthMode : null;
if (_setAuthModeAuthUI) {
  setAuthMode = function(mode) {
    _setAuthModeAuthUI(mode);
    aplicarUIAuth();
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  setupAuth(); try { await cargarModuloAmistades(); } catch (ex) { console.error(ex); }
  aplicarUIAuth();
  setupDrawer(); setupPerfil(); setupTabs(); setupModal(); setupRequestCard(); initSplash();
});
