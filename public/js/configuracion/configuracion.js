/* ============================================================
   Riverosapay · CONFIGURACIÓN: tema claro / oscuro.
   Persistencia local por dispositivo, sin afectar datos de usuario.
   ============================================================ */
(function(){
  const STORAGE_KEY='riverospay_theme';
  const DARK_STYLE_ID='riverospay-dark-style';

  const DARK_CSS=`
  :root[data-theme="dark"]{
    --bg:#111613;
    --surface:#1A211D;
    --ink:#F2F5F3;
    --ink-soft:#AEB8B1;
    --line:#303A33;
    --green-100:#193224;
    --green-500:#48B86D;
    --green-600:#3FAF65;
    --green-700:#55C878;
    --green-800:#3FAF65;
    --green-900:#0A2416;
    --danger-100:#3A201F;
    --warn-100:#3A311B;
    --warn:#D8B968;
    --shadow-card:0 8px 24px -16px rgba(0,0,0,.7);
    --shadow-pop:0 22px 50px -20px rgba(0,0,0,.8);
  }
  :root[data-theme="dark"] body{background:#080B09;color:var(--ink);}
  :root[data-theme="dark"] .phone,
  :root[data-theme="dark"] .app,
  :root[data-theme="dark"] .auth,
  :root[data-theme="dark"] .role{background:var(--bg);color:var(--ink);}
  :root[data-theme="dark"] .auth-card h1,
  :root[data-theme="dark"] .role-wrap h1,
  :root[data-theme="dark"] .empty-card h2,
  :root[data-theme="dark"] .empty-card h3,
  :root[data-theme="dark"] .role-name,
  :root[data-theme="dark"] .clave6-wrap .clave6-viewer span{color:var(--ink);}
  :root[data-theme="dark"] .role-card,
  :root[data-theme="dark"] .empty-card,
  :root[data-theme="dark"] .tabbar,
  :root[data-theme="dark"] .modal,
  :root[data-theme="dark"] .drawer,
  :root[data-theme="dark"] .sheet,
  :root[data-theme="dark"] .card,
  :root[data-theme="dark"] .list-card{background:var(--surface);color:var(--ink);border-color:var(--line);}
  :root[data-theme="dark"] .auth-form input,
  :root[data-theme="dark"] .modal-body input,
  :root[data-theme="dark"] .modal-body textarea,
  :root[data-theme="dark"] .modal-body select{background:#151B17;color:var(--ink);border-color:var(--line);}
  :root[data-theme="dark"] .auth-form .login-step input{background:transparent;color:var(--ink);}
  :root[data-theme="dark"] .btn-secondary,
  :root[data-theme="dark"] .icon-btn.small,
  :root[data-theme="dark"] .btn-add{background:#193224;color:#BFEACD;border-color:var(--line);}
  :root[data-theme="dark"] .drawer-item{color:var(--ink);}
  :root[data-theme="dark"] .drawer-item:hover,
  :root[data-theme="dark"] .drawer-item:active{background:#202922;}
  :root[data-theme="dark"] .drawer-brand{border-color:var(--line);}
  :root[data-theme="dark"] .drawer-footnote{color:var(--ink-soft);}
  :root[data-theme="dark"] .tab{color:var(--ink-soft);}
  :root[data-theme="dark"] .tab.active{color:var(--green-500);border-color:var(--green-500);}
  :root[data-theme="dark"] .notice-box{border-color:#554A27;color:var(--warn);}
  :root[data-theme="dark"] .notice-box b{color:#E5CD8A;}
  :root[data-theme="dark"] .modal-overlay,
  :root[data-theme="dark"] .drawer-overlay{background:rgba(0,0,0,.68);}
  :root[data-theme="dark"] .toast{box-shadow:0 10px 30px rgba(0,0,0,.55);}
  :root[data-theme="dark"] .trabajo-vista-selector{background:rgba(63,175,101,.15)!important;color:var(--ink)!important;}
  :root[data-theme="dark"] .modal-close{color:var(--ink-soft);}
  :root[data-theme="dark"] hr{border-color:var(--line);}
  :root[data-theme="dark"] ::placeholder{color:#7F8982;opacity:1;}
  :root[data-theme="dark"] select option{background:#151B17;color:var(--ink);}
  `;

  function ensureStyle(){
    if(document.getElementById(DARK_STYLE_ID))return;
    const style=document.createElement('style');
    style.id=DARK_STYLE_ID;
    style.textContent=DARK_CSS;
    document.head.appendChild(style);
  }

  function aplicarTema(theme){
    const root=document.documentElement;
    const oscuro=theme==='dark';
    if(oscuro)ensureStyle();
    root.dataset.theme=oscuro?'dark':'light';
    try{localStorage.setItem(STORAGE_KEY,oscuro?'dark':'light');}catch(_e){}
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',oscuro?'#0A2416':'#155C31');
    const toggle=document.getElementById('theme-toggle');
    if(toggle){
      toggle.checked=oscuro;
      toggle.setAttribute('aria-checked',String(oscuro));
    }
    const label=document.getElementById('theme-label');
    if(label)label.textContent=oscuro?'Modo oscuro':'Modo claro';
  }

  function obtenerTema(){
    try{
      const guardado=localStorage.getItem(STORAGE_KEY);
      if(guardado==='dark'||guardado==='light')return guardado;
    }catch(_e){}
    return 'light';
  }

  function abrirConfiguracion(){
    closeDrawer();
    openModal('Configuración',`
      <div class="settings-panel">
        <div class="settings-row">
          <div class="settings-copy">
            <strong>Modo oscuro</strong>
            <span id="theme-label" class="muted">Modo claro</span>
          </div>
          <label class="theme-switch" aria-label="Cambiar modo oscuro">
            <input id="theme-toggle" type="checkbox" aria-checked="false">
            <span class="theme-slider"></span>
          </label>
        </div>
        <p class="settings-hint">Cambia la apariencia de Riverospay. La elección se guarda en este dispositivo.</p>
      </div>
    `);
    const toggle=document.getElementById('theme-toggle');
    if(toggle){
      toggle.checked=document.documentElement.dataset.theme==='dark';
      toggle.setAttribute('aria-checked',String(toggle.checked));
      toggle.addEventListener('change',()=>aplicarTema(toggle.checked?'dark':'light'));
    }
    aplicarTema(obtenerTema());
  }

  window.aplicarTema=aplicarTema;
  window.abrirConfiguracion=abrirConfiguracion;
  window.obtenerTema=obtenerTema;

  function iniciarTema(){
    ensureStyle();
    const theme=obtenerTema();
    document.documentElement.dataset.theme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#0A2416':'#155C31');
  }
  iniciarTema();
})();
