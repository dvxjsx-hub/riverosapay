/* ============================================================
   Riverosapay · NAVEGACION: pantallas, modal, drawer, menu por modo.
   ------------------------------------------------------------
   Reescrito para tener UNA sola fuente de verdad de la navegación:
   - El tabbar inferior ya no se oculta: es la navegación principal.
   - El drawer es estático en el HTML (ver index.html), aquí solo se
     decide qué mostrar/ocultar y qué texto usar según el rol.
   - Antes existían prepararDrawerAmistades/prepararDrawerTesoreria/
     prepararDrawerConfiguracion/prepararDrawerOrganizador duplicadas
     entre este archivo, main.js y perfil.js (una de ellas quedaba
     muerta según el orden de carga de los scripts). configurarMenuPorRol()
     es ahora la única función que decide la visibilidad del menú.
   ============================================================ */
let modalFocusTimer=null;

function showScreen(id){$all('.screen').forEach(s=>s.classList.remove('active'));const screen=$('#'+id);if(screen)screen.classList.add('active');}

function openModal(title,bodyHtml){clearTimeout(modalFocusTimer);$('#modal-title').textContent=title;$('#modal-body').innerHTML=bodyHtml;$('#modal-overlay').classList.add('open');$('#modal').classList.add('open');modalFocusTimer=setTimeout(()=>{if(!$('#modal').classList.contains('open'))return;const active=document.activeElement;if(active&&active!==document.body&&active!==document.documentElement)return;const first=$('#modal-body').querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled])');if(first)first.focus({preventScroll:true});},80);}

function closeModal(){clearTimeout(modalFocusTimer);modalFocusTimer=null;$('#modal-overlay').classList.remove('open');$('#modal').classList.remove('open');if(document.activeElement&&typeof document.activeElement.blur==='function')document.activeElement.blur();}

function openDrawer(){$('#drawer').classList.add('open');$('#drawer-overlay').classList.add('open');}
function closeDrawer(){$('#drawer').classList.remove('open');$('#drawer-overlay').classList.remove('open');}

/* Activa visualmente una tab del tabbar sin disparar su acción
   (la acción la dispara quien llama a esta función). */
function marcarTabActiva(tabId){
  $all('.tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tabId));
  STATE.activeTab = tabId === 'inicio' ? null : tabId;
}

/* Única función que decide qué queda visible en el drawer y en el
   tabbar según el rol (EMPLEADO vs BOSS). Se llama una vez al entrar
   a la app y otra vez si el usuario cambia de modo. */
function configurarMenuPorRol(){
  const esJefe = modoActualUsuario()==='jefe';

  $all('.tab-empleado-only').forEach(t=>t.classList.toggle('hidden', esJefe));
  $all('.tab-jefe-only').forEach(t=>t.classList.toggle('hidden', !esJefe));

  const tes = $('#drawer-tesoreria');
  if (tes) {
    tes.classList.toggle('hidden', esJefe);
    const texto = $('#drawer-tesoreria-text');
    if (texto) texto.textContent = 'Administrar capital';
  }
}
