/* ============================================================
   Riverosapay · ARRANQUE: wiring de drawer/perfil/modal + bootstrap DOMContentLoaded
   ============================================================ */
const RIVEROSPAY_THEME_KEY='riverospay_theme';
const RIVEROSPAY_DARK_STYLE_ID='riverospay-dark-style';
const RIVEROSPAY_DARK_CSS=`
:root[data-theme="dark"]{--bg:#101412;--surface:#171C19;--ink:#F0F3F0;--ink-soft:#A9B1AA;--line:#303833;--green-100:#193326;--green-900:#0A2B19;--green-800:#2F9B59;--green-700:#3DAF68;--green-600:#49BE73;--green-500:#5AC982;--danger:#F06A61;--danger-100:#3A211F;--warn:#D7B75A;--warn-100:#362F1D;--shadow-card:0 6px 20px -14px rgba(0,0,0,.65);--shadow-pop:0 20px 44px -18px rgba(0,0,0,.75)}
:root[data-theme="dark"] body{background:#0B0E0C}
:root[data-theme="dark"] .auth-card h1,:root[data-theme="dark"] .role-wrap h1,:root[data-theme="dark"] .empty-card h2,:root[data-theme="dark"] .empty-card h3,:root[data-theme="dark"] .lugar-title,:root[data-theme="dark"] .day-name,:root[data-theme="dark"] .evento-lugar,:root[data-theme="dark"] .view-title,:root[data-theme="dark"] .drawer-brand span,:root[data-theme="dark"] .modal-head h3,:root[data-theme="dark"] .admin-head h1,:root[data-theme="dark"] .section-head h3{color:var(--ink)}
:root[data-theme="dark"] .auth-form input,:root[data-theme="dark"] .modal-body input,:root[data-theme="dark"] .modal-body textarea,:root[data-theme="dark"] .modal-body select{color:var(--ink);background:var(--surface)}
:root[data-theme="dark"] .notice-box{border-color:#51471F}:root[data-theme="dark"] .notice-box b{color:#E9D58A}:root[data-theme="dark"] .btn-add:active{background:#21412E}:root[data-theme="dark"] .trabajo-vista-selector{background:rgba(47,155,89,.14)!important;color:var(--ink)!important}:root[data-theme="dark"] .icon-btn.small,:root[data-theme="dark"] .view-back{background:var(--green-100);color:var(--green-800)}:root[data-theme="dark"] .avatar{background:rgba(255,255,255,.92);color:var(--green-900)}:root[data-theme="dark"] .toast{background:#071C10}:root[data-theme="dark"] ::selection{background:rgba(73,190,115,.28)}
.theme-switch{width:42px;height:24px;border-radius:20px;background:var(--line);display:flex;align-items:center;padding:3px;flex:none;transition:background .15s ease}.theme-switch span{width:18px;height:18px;border-radius:50%;background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,.25);transform:translateX(0);transition:transform .15s ease}.theme-switch.active{background:var(--green-700)}.theme-switch.active span{transform:translateX(18px)}
`;
function instalarEstiloTema(){if(document.getElementById(RIVEROSPAY_DARK_STYLE_ID))return;const style=document.createElement('style');style.id=RIVEROSPAY_DARK_STYLE_ID;style.textContent=RIVEROSPAY_DARK_CSS;document.head.appendChild(style)}
function obtenerTema(){return localStorage.getItem(RIVEROSPAY_THEME_KEY)==='dark'?'dark':'light'}
function aplicarTema(tema,guardar=true){const nuevoTema=tema==='dark'?'dark':'light';instalarEstiloTema();document.documentElement.dataset.theme=nuevoTema;if(guardar)localStorage.setItem(RIVEROSPAY_THEME_KEY,nuevoTema);const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',nuevoTema==='dark'?'#101412':'#0F3D24');return nuevoTema}
function iniciarTema(){aplicarTema(obtenerTema(),false)}
function alternarTema(){const nuevo=aplicarTema(obtenerTema()==='dark'?'light':'dark');toast(nuevo==='dark'?'Modo oscuro activado':'Modo oscuro desactivado');actualizarControlTema()}
function actualizarControlTema(){const control=$('#tema-toggle');const texto=$('#tema-valor');const oscuro=obtenerTema()==='dark';if(control){control.setAttribute('aria-checked',String(oscuro));control.classList.toggle('active',oscuro)}if(texto)texto.textContent=oscuro?'Modo oscuro':'Modo claro'}
iniciarTema();

function setupDrawer(){
  $('#btn-menu').addEventListener('click',openDrawer);
  $('#drawer-overlay').addEventListener('click',closeDrawer);
  $('#drawer-amistades').addEventListener('click',()=>{closeDrawer();openAmistades();});
  $('#drawer-tesoreria').addEventListener('click',()=>{closeDrawer();if(modoActualUsuario()==='jefe')abrirTesorero();else abrirAdministrarCapital();});
  $('#drawer-configuracion').addEventListener('click',()=>{closeDrawer();openConfiguracion();});
  $('#drawer-logout').addEventListener('click',()=>{
    closeDrawer();
    if(STATE.socket){STATE.socket.disconnect();STATE.socket=null;}
    STATE.user=null;STATE.viewMode='empleado';STATE.activeTab=null;
    STATE.trabajo={lugares:[],turnos:[]};STATE.estudio=[];STATE.actividades=[];STATE.eventos=[];
    STATE.historial=[];STATE.amistades=[];STATE.notificaciones=[];STATE.jefeView=null;
    STATE.pendingRequest=null;STATE.onboardingPending=false;
    showScreen('screen-auth');setAuthMode('login');
    const lastUser=localStorage.getItem('riverospay_last_user');
    if(lastUser)$('#log-user').value=lastUser;
    $('#log-pass').value='';
    setTimeout(()=>$('#log-user')?.focus({preventScroll:true}),80);
  });
}
function setupHeader(){$('#btn-notif').addEventListener('click',openNotificaciones);}
function setupPerfil(){$('#btn-perfil').addEventListener('click',openPerfil)}
function setupModal(){$('#modal-close').addEventListener('click',closeModal);$('#modal-overlay').addEventListener('click',closeModal)}
function abrirSelectorTrabajo(){const actual=trabajoVistaActual===TRABAJO_VISTAS.HORARIOS?'Horarios':'Finalizados';const opcion=(vista,texto)=>`<button class="btn-secondary" type="button" style="width:100%;margin-top:8px;background:rgba(21,92,49,.08);color:var(--green-900);border:1.5px solid var(--line);font-weight:700;" onclick="cambiarVistaTrabajo('${vista}')">${texto}${actual===texto?' ✓':''}</button>`;openModal('Trabajo',`${opcion('horarios','Horarios')}${opcion('finalizados','Finalizados')}`)}
document.addEventListener('DOMContentLoaded',async()=>{setupAuth();try{await cargarModulo('amistades')}catch(ex){console.error(ex)}try{await cargarModulo('tesoreria')}catch(ex){console.error(ex)}setupDrawer();setupHeader();setupPerfil();setupTabs();setupModal();setupRequestCard();initSplash()});
