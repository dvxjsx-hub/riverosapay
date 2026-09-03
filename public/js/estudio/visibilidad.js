/* ============================================================
   Riverosapay · ESTUDIO: visibilidad según Sesión académica
   ============================================================ */

function sesionAcademicaActiva() {
  return STATE.user?.esEstudiante === true;
}

function actualizarVisibilidadEstudio() {
  const activo = sesionAcademicaActiva();
  const tab = $('#tab-estudio');
  if (tab) tab.classList.toggle('hidden', !activo);

  // Si la sesión se desactivó mientras Estudio estaba seleccionado,
  // dejamos la navegación en un estado válido.
  if (!activo && STATE.activeTab === 'estudio') {
    STATE.activeTab = null;
    $all('.tab').forEach(b => b.classList.remove('active'));
    if (STATE.viewMode === 'empleado') renderHome();
  }

  // El botón de Estudio del selector Organizador también debe respetar
  // la misma preferencia.
  const botones = $all('#content button');
  botones.forEach(btn => {
    if (btn.textContent.trim() === 'Estudio') btn.classList.toggle('hidden', !activo);
  });
}

// enterApp reconstruye la navegación después de iniciar sesión o cambiar
// de preferencia, así que sincronizamos la pestaña justo después.
const _enterAppEstudio = typeof enterApp === 'function' ? enterApp : null;
if (_enterAppEstudio) {
  enterApp = function(...args) {
    const resultado = _enterAppEstudio.apply(this, args);
    actualizarVisibilidadEstudio();
    return resultado;
  };
}

// Organizador genera dinámicamente sus botones.
const _abrirOrganizadorEstudio = typeof abrirOrganizador === 'function' ? abrirOrganizador : null;
if (_abrirOrganizadorEstudio) {
  abrirOrganizador = function(...args) {
    const resultado = _abrirOrganizadorEstudio.apply(this, args);
    actualizarVisibilidadEstudio();
    return resultado;
  };
}

// Protección adicional: aunque alguien intente acceder a Estudio desde la
// navegación, no se debe cargar cuando la sesión académica está desactivada.
const _seleccionarOrganizadorEstudio = typeof seleccionarOrganizador === 'function' ? seleccionarOrganizador : null;
if (_seleccionarOrganizadorEstudio) {
  seleccionarOrganizador = function(tab, ...args) {
    if (tab === 'estudio' && !sesionAcademicaActiva()) {
      toast('Activa la Sesión académica desde Configuración para usar Estudio.');
      actualizarVisibilidadEstudio();
      return;
    }
    return _seleccionarOrganizadorEstudio.call(this, tab, ...args);
  };
}

// Protección adicional para el tabbar.
const _setupTabsEstudio = typeof setupTabs === 'function' ? setupTabs : null;
if (_setupTabsEstudio) {
  setupTabs = function(...args) {
    const resultado = _setupTabsEstudio.apply(this, args);
    actualizarVisibilidadEstudio();
    return resultado;
  };
}
