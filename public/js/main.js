/* ============================================================
   Riverosapay · ARRANQUE: wiring de drawer/perfil/modal + bootstrap DOMContentLoaded
   ============================================================ */
function cargarModuloAmistades(){return new Promise((resolve,reject)=>{if(typeof openAmistades==='function')return resolve();const script=document.createElement('script');script.src='js/amistades/amistades.js';script.onload=resolve;script.onerror=()=>reject(new Error('No se pudo cargar el módulo de amistades.'));document.head.appendChild(script);});}
function cargarModuloTesoreria(){return new Promise((resolve,reject)=>{if(typeof abrirTesorero==='function')return resolve();const script=document.createElement('script');script.src='js/tesoreria/tesoreria.js';script.onload=resolve;script.onerror=()=>reject(new Error('No se pudo cargar el módulo de tesorería.'));document.head.appendChild(script);});}

/* ============================================================
   TEMA · Preferencia local del dispositivo
   Se mantiene fuera del backend: cada dispositivo conserva su
   propia elección. La configuración se muestra dentro del modal
   existente de perfil/configuración.
   ============================================================ */
const RIVEROSPAY_THEME_KEY='riverospay_theme';
const RIVEROSPAY_DARK_STYLE_ID='riverospay-dark-style';

const RIVEROSPAY_DARK_CSS=`
:root[data-theme="dark"]{
  --bg:#101412;
  --surface:#171C19;
  --ink:#F0F3F0;
  --ink-soft:#A9B1AA;
  --line:#303833;
  --green-100:#193326;
  --green-900:#0A2B19;
  --green-800:#2F9B59;
  --green-700:#3DAF68;
  --green-600:#49BE73;
  --green-500:#5AC982;
  --danger:#F06A61;
  --danger-100:#3A211F;
  --warn:#D7B75A;
  --warn-100:#362F1D;
  --shadow-card:0 6px 20px -14px rgba(0,0,0,.65);
  --shadow-pop:0 20px 44px -18px rgba(0,0,0,.75);
}
:root[data-theme="dark"] body{background:#0B0E0C;}
:root[data-theme="dark"] .auth-card h1,
:root[data-theme="dark"] .role-wrap h1,
:root[data-theme="dark"] .empty-card h2,
:root[data-theme="dark"] .empty-card h3,
:root[data-theme="dark"] .lugar-title,
:root[data-theme="dark"] .day-name,
:root[data-theme="dark"] .evento-lugar,
:root[data-theme="dark"] .view-title,
:root[data-theme="dark"] .drawer-brand span,
:root[data-theme="dark"] .modal-head h3,
:root[data-theme="dark"] .admin-head h1,
:root[data-theme="dark"] .section-head h3{color:var(--ink);}
:root[data-theme="dark"] .auth-form input,
:root[data-theme="dark"] .modal-body input,
:root[data-theme="dark"] .modal-body textarea,
:root[data-theme="dark"] .modal-body select{color:var(--ink);background:var(--surface);}
:root[data-theme="dark"] .notice-box{border-color:#51471F;}
:root[data-theme="dark"] .notice-box b{color:#E9D58A;}
:root[data-theme="dark"] .btn-add:active{background:#21412E;}
:root[data-theme="dark"] .trabajo-vista-selector{background:rgba(47,155,89,.14)!important;color:var(--ink)!important;}
:root[data-theme="dark"] .icon-btn.small,
:root[data-theme="dark"] .view-back{background:var(--green-100);color:var(--green-800);}
:root[data-theme="dark"] .avatar{background:rgba(255,255,255,.92);color:var(--green-900);}
:root[data-theme="dark"] .toast{background:#071C10;}
:root[data-theme="dark"] ::selection{background:rgba(73,190,115,.28);}
`;

function instalarEstiloTema(){
  if(document.getElementById(RIVEROSPAY_DARK_STYLE_ID))return;
  const style=document.createElement('style');
  style.id=RIVEROSPAY_DARK_STYLE_ID;
  style.textContent=RIVEROSPAY_DARK_CSS;
  document.head.appendChild(style);
}

function obtenerTema(){
  return localStorage.getItem(RIVEROSPAY_THEME_KEY)==='dark'?'dark':'light';
}

function aplicarTema(tema,guardar=true){
  const nuevoTema=tema==='dark'?'dark':'light';
  instalarEstiloTema();
  document.documentElement.dataset.theme=nuevoTema;
  if(guardar)localStorage.setItem(RIVEROSPAY_THEME_KEY,nuevoTema);
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content',nuevoTema==='dark'?'#101412':'#0F3D24');
  return nuevoTema;
}

function iniciarTema(){
  aplicarTema(obtenerTema(),false);
}

function alternarTema(){
  const nuevo=aplicarTema(obtenerTema()==='dark'?'light':'dark');
  toast(nuevo==='dark'?'Modo oscuro activado':'Modo oscuro desactivado');
  actualizarControlTema();
}

function actualizarControlTema(){
  const control=$('#tema-toggle');
  const texto=$('#tema-valor');
  const oscuro=obtenerTema()==='dark';
  if(control)control.setAttribute('aria-checked',String(oscuro));
  if(control)control.classList.toggle('active',oscuro);
  if(texto)texto.textContent=oscuro?'Modo oscuro':'Modo claro';
}

/* Aplicamos el tema antes de que aparezca la interfaz para evitar
   el destello claro → oscuro al abrir la aplicación. */
iniciarTema();

/* El punto de entrada de Configuración sigue siendo el original de
   perfil/perfil.js. Aquí solo añadimos la sección Apariencia. */
const _openConfiguracionTema=typeof openConfiguracion==='function'?openConfiguracion:null;
if(_openConfiguracionTema){
  openConfiguracion=function(){
    _openConfiguracionTema();
    const body=$('#modal-body');
    if(!body)return;
    body.querySelector('#config-apariencia')?.remove();
    const section=document.createElement('div');
    section.id='config-apariencia';
    section.innerHTML=`
      <p class="settings-group-label">Apariencia</p>
      <div class="settings-list">
        <button class="settings-item" type="button" onclick="alternarTema()">
          <span class="settings-icon" aria-hidden="true">🌙</span>
          <span class="settings-label">Modo oscuro<span class="settings-value" id="tema-valor">Modo claro</span></span>
          <span class="theme-switch" id="tema-toggle" role="switch" aria-label="Modo oscuro" aria-checked="false"><span></span></span>
        </button>
      </div>
    `;
    body.appendChild(section);
    actualizarControlTema();
  };
}

function prepararDrawerAmistades(){const drawer=$('#drawer');if(!drawer)return;$('#drawer-compartir')?.classList.add('hidden');$('#drawer-verificar')?.classList.add('hidden');let item=$('#drawer-amistades');if(!item){item=document.createElement('button');item.className='drawer-item';item.id='drawer-amistades';item.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.8 19c.7-3.2 2.5-4.8 5.2-4.8s4.5 1.6 5.2 4.8"/><path d="M14.5 14.8c2.8.1 4.7 1.4 5.3 4.2"/></svg> Amistades`;const referencia=$('#drawer-notificaciones')||$('#drawer-informacion');drawer.insertBefore(item,referencia);}}
function setupDrawer(){prepararDrawerAmistades();prepararDrawerTesoreria();prepararDrawerConfiguracion();$('#btn-menu').addEventListener('click',openDrawer);$('#drawer-overlay').addEventListener('click',closeDrawer);$('#drawer-inicio').addEventListener('click',()=>{closeDrawer();$('#tabbar').classList.add('hidden');$all('.tab').forEach(b=>b.classList.remove('active'));STATE.activeTab=null;STATE.jefeView=null;STATE.viewMode=modoActualUsuario()==='jefe'?'jefe-home':'empleado';renderHome();});$('#drawer-amistades').addEventListener('click',()=>{closeDrawer();openAmistades();});$('#drawer-compartir').classList.add('hidden');$('#drawer-verificar').classList.add('hidden');$('#drawer-notificaciones').addEventListener('click',()=>{closeDrawer();openNotificaciones();});$('#drawer-informacion').addEventListener('click',()=>{closeDrawer();openInformacion();});$('#drawer-logout').addEventListener('click',()=>{closeDrawer();if(STATE.socket){STATE.socket.disconnect();STATE.socket=null;}STATE.user=null;STATE.viewMode='empleado';STATE.activeTab=null;STATE.trabajo={lugares:[],turnos:[]};STATE.estudio=[];STATE.actividades=[];STATE.eventos=[];STATE.historial=[];STATE.amistades=[];STATE.notificaciones=[];STATE.jefeView=null;STATE.pendingRequest=null;STATE.onboardingPending=false;$('#tabbar').classList.add('hidden');showScreen('screen-auth');setAuthMode('login');const lastUser=localStorage.getItem('riverospay_last_user');if(lastUser)$('#log-user').value=lastUser;$('#log-pass').value='';setTimeout(()=>$('#log-user')?.focus({preventScroll:true}),80);});}
function setupPerfil(){ $('#btn-perfil').addEventListener('click',openPerfil); }
function setupModal(){ $('#modal-close').addEventListener('click',closeModal); $('#modal-overlay').addEventListener('click',closeModal); }
function nombreJefePorId(id){if(!id)return null;if(STATE.viewMode==='jefe-ver'&&STATE.user&&id===STATE.user.id)return STATE.user.nombreCompleto||STATE.user.username;const fuentes=[STATE.trabajo,STATE.jefeView].filter(Boolean);for(const fuente of fuentes){const turno=(fuente.turnos||[]).find(t=>t.jefeAsignadoId===id&&(t.jefeNombre||t.jefeUsername));if(turno)return turno.jefeNombre||turno.jefeUsername;}const a=(STATE.amistades||[]).find(x=>x.id===id);return a?(a.nombreCompleto||a.username):null;}
function normalizarTextoBossEnModal(pares){const title=$('#modal-title');if(title){const original=title.textContent.trim();const reemplazo=pares[original];if(reemplazo)title.textContent=reemplazo;}const body=$('#modal-body');if(!body)return;const walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);const nodos=[];let node;while((node=walker.nextNode()))nodos.push(node);nodos.forEach(n=>{const t=n.nodeValue.trim();const reemplazo=pares[t];if(reemplazo)n.nodeValue=n.nodeValue.replace(t,reemplazo);});}
function aplicarEstiloSelectorTrabajo(){const selector=document.querySelector('.trabajo-vista-selector');if(!selector)return;selector.style.background='rgba(21,92,49,.08)';selector.style.color='var(--green-900)';selector.style.border='1.5px solid var(--line)';}
const _renderTrabajoT5=typeof renderTrabajo==='function'?renderTrabajo:null;if(_renderTrabajoT5)renderTrabajo=function(){_renderTrabajoT5();aplicarEstiloSelectorTrabajo();};
const _renderJefeViewT5=typeof renderJefeView==='function'?renderJefeView:null;if(_renderJefeViewT5)renderJefeView=function(){_renderJefeViewT5();aplicarEstiloSelectorTrabajo();};
function abrirSelectorTrabajo(){const actual=trabajoVistaActual===TRABAJO_VISTAS.HORARIOS?'Horarios':'Finalizados';const opcion=(vista,texto)=>`<button class="btn-secondary" type="button" style="width:100%;margin-top:8px;background:rgba(21,92,49,.08);color:var(--green-900);border:1.5px solid var(--line);font-weight:700;" onclick="cambiarVistaTrabajo('${vista}')">${texto}${actual===texto?' ✓':''}</button>`;openModal('Trabajo',`${opcion('horarios','Horarios')}${opcion('finalizados','Finalizados')}`);}
const _abrirAccionesTrabajoT5=typeof abrirAccionesTrabajo==='function'?abrirAccionesTrabajo:null;if(_abrirAccionesTrabajoT5)abrirAccionesTrabajo=function(){_abrirAccionesTrabajoT5();document.querySelectorAll('#modal-body button').forEach(btn=>{if(btn.textContent.trim()==='Filtrar por jefe')btn.textContent='Filtrar por BOSS';});};
const _abrirFiltroJefeT5=typeof abrirFiltroJefe==='function'?abrirFiltroJefe:null;if(_abrirFiltroJefeT5)abrirFiltroJefe=async function(...args){await _abrirFiltroJefeT5(...args);normalizarTextoBossEnModal({'Filtrar por jefe':'Filtrar por BOSS','Selecciona un jefe':'Selecciona un BOSS','Todos los jefes':'Todos los BOSS','No hay jefes registrados en tus trabajos.':'No hay BOSS registrados en tus trabajos.'});};
const _openAddTrabajoT5=typeof openAddTrabajo==='function'?openAddTrabajo:null;if(_openAddTrabajoT5)openAddTrabajo=async function(...args){await _openAddTrabajoT5(...args);normalizarTextoBossEnModal({'Jefe (amistad)':'BOSS (amistad)','El jefe se selecciona únicamente entre tus amistades.':'El BOSS se selecciona únicamente entre tus amistades.'});};
const _openTurnoDetailT5=typeof openTurnoDetail==='function'?openTurnoDetail:null;if(_openTurnoDetailT5)openTurnoDetail=function(...args){_openTurnoDetailT5(...args);normalizarTextoBossEnModal({'Jefe':'BOSS','Sin jefe':'Sin BOSS'});};
const _abrirCambiarJefeT5=typeof abrirCambiarJefe==='function'?abrirCambiarJefe:null;if(_abrirCambiarJefeT5)abrirCambiarJefe=async function(...args){await _abrirCambiarJefeT5(...args);normalizarTextoBossEnModal({'Cambiar jefe asignado':'Cambiar BOSS asignado','Jefe':'BOSS'});};
const _setPagadoT5=typeof setPagado==='function'?setPagado:null;if(_setPagadoT5)setPagado=async function(turnoId,pagado){try{await api.patch(`/api/trabajo/turnos/${turnoId}`,{pagado,actorJefeId:STATE.user.id,actorJefeUsername:STATE.user.username});toast(pagado?'Marcado como pagado':'Marcado como no pagado');await refrescarJefeTrabajo();openTurnoDetail(turnoId);}catch(ex){toast(ex.message);}};
const _guardarValorT5=typeof guardarValor==='function'?guardarValor:null;if(_guardarValorT5)guardarValor=async function(turnoId){const raw=$('#f-valor')?.value;try{await api.patch(`/api/trabajo/turnos/${turnoId}`,{valor:raw===''?null:Number(raw),actorJefeId:STATE.user.id,actorJefeUsername:STATE.user.username});toast('Valor guardado');await refrescarJefeTrabajo();openTurnoDetail(turnoId);}catch(ex){toast(ex.message);}};
function aplicarUIAuth(){const sub=$('#auth-sub');if(sub)sub.textContent='';const toggle=$('#auth-toggle');if(toggle){const isLogin=!$('#form-login')?.classList.contains('hidden');toggle.textContent=isLogin?'Crear cuenta':'Iniciar sesión';}const regUser=$('#reg-user');if(regUser){regUser.placeholder='';regUser.removeAttribute('maxlength');regUser.removeAttribute('minlength');if(regUser.dataset.usernameFilter!=='1'){regUser.dataset.usernameFilter='1';regUser.addEventListener('input',()=>{regUser.value=(regUser.value||'').replace(/[^a-zA-Z]/g,'');});}}const regTitle=$('#auth-title');if(regTitle&&$('#form-register')&&!$('#form-register').classList.contains('hidden'))regTitle.textContent='Crear usuario';}
const _abrirAyudaLoginAuthUI=typeof abrirAyudaLogin==='function'?abrirAyudaLogin:null;if(_abrirAyudaLoginAuthUI){abrirAyudaLogin=function(){_abrirAyudaLoginAuthUI();const body=$('#modal-body');if(!body)return;[...body.querySelectorAll('button')].forEach(btn=>{if(btn.textContent.trim()==='Olvidar este dispositivo')btn.remove();});};}
const _setAuthModeAuthUI=typeof setAuthMode==='function'?setAuthMode:null;if(_setAuthModeAuthUI){setAuthMode=function(mode){_setAuthModeAuthUI(mode);aplicarUIAuth();};}
document.addEventListener('DOMContentLoaded',async()=>{setupAuth();try{await cargarModuloAmistades();}catch(ex){console.error(ex);}try{await cargarModuloTesoreria();}catch(ex){console.error(ex);}aplicarUIAuth();setupDrawer();setupPerfil();setupTabs();setupModal();setupRequestCard();initSplash();});
