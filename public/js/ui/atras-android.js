/* Riverosapay · Mini actualización funcional · botón/gesto Atrás de Android */
(function instalarAtrasAndroid(){
  const CLAVE='riverosapay_android_back';
  const DURACION=2200;
  let esperandoSalida=false;
  let temporizador=null;

  function appActiva(){return !!document.querySelector('#screen-app.active');}
  function modalAbierto(){return !!document.querySelector('#modal.open');}
  function drawerAbierto(){return !!document.querySelector('#drawer.open');}
  function cancelarAviso(){esperandoSalida=false;clearTimeout(temporizador);temporizador=null;}
  function pedirSalida(){
    if(esperandoSalida){
      cancelarAviso();
      history.back();
      return;
    }
    esperandoSalida=true;
    toast('Pulsa de nuevo para salir');
    temporizador=setTimeout(cancelarAviso,DURACION);
  }
  function volverDentroDeLaApp(){
    if(modalAbierto()){closeModal();return true;}
    if(drawerAbierto()){closeDrawer();return true;}
    if(!appActiva())return false;

    if(STATE.viewMode==='jefe-ver'||STATE.viewMode==='jefe-historial'){
      STATE.viewMode='jefe-home';
      STATE.jefeView=null;
      STATE.activeTab=null;
      $('#tabbar').classList.add('hidden');
      renderHome();
      return true;
    }
    if(STATE.viewMode==='empleado'&&STATE.activeTab){
      STATE.activeTab=null;
      $all('.tab').forEach(b=>b.classList.remove('active'));
      renderHome();
      return true;
    }
    return false;
  }

  function estadoBase(){
    if(!history.state||history.state[CLAVE]!==true){
      history.replaceState({...history.state,[CLAVE]:true},'');
    }
  }

  window.addEventListener('popstate',()=>{
    if(volverDentroDeLaApp()){
      cancelarAviso();
      history.pushState({...history.state,[CLAVE]:true},'');
      return;
    }
    if(appActiva()){
      pedirSalida();
      if(esperandoSalida)history.pushState({...history.state,[CLAVE]:true},'');
    }
  });

  document.addEventListener('DOMContentLoaded',estadoBase);
})();
