/* ============================================================
   Riverosapay · core/moduleLoader.js
   Carga centralizada de módulos JS que antes se inyectaban en
   caliente desde 4 archivos distintos (auth.js, main.js, socket.js
   y eventos.js), cada uno con su propia copia de la misma lógica.
   Ahora hay un solo lugar donde ver qué módulos existen y cómo se
   cargan: RIVEROSAPAY_MODULOS.
   ============================================================ */

const RIVEROSAPAY_MODULOS = {
  admin: { src: 'js/admin/admin.js', yaListo: () => typeof enterAdmin === 'function' },
  amistades: { src: 'js/amistades/amistades.js', yaListo: () => typeof openAmistades === 'function' },
  tesoreria: { src: 'js/tesoreria/tesoreria.js', yaListo: () => typeof abrirTesorero === 'function' },
  abonosEmpleado: { src: '/js/trabajo/abonos-empleado.js', yaListo: () => typeof window.abrirAbonosEmpleadoHome === 'function' },
  // Estos tres se auto-instalan al cargar (no exponen una función para
  // comprobar si ya están listos); solo nos interesa no inyectarlos dos veces.
  tanda5: { src: '/js/trabajo/tanda5-ui.js', yaListo: () => false },
  eliminarNotificaciones: { src: '/js/notificaciones/eliminar.js', yaListo: () => false },
  perfilVerificado: { src: 'js/verificacion/perfil-verificado.js', yaListo: () => false, async: false },
  atrasAndroid: { src: 'js/ui/atras-android.js', yaListo: () => false, async: false }
};

const _riverosapayModulosPromesas = {};

function cargarModulo(nombre) {
  const def = RIVEROSAPAY_MODULOS[nombre];
  if (!def) return Promise.reject(new Error(`Módulo desconocido: ${nombre}`));
  if (def.yaListo()) return Promise.resolve();
  if (_riverosapayModulosPromesas[nombre]) return _riverosapayModulosPromesas[nombre];

  _riverosapayModulosPromesas[nombre] = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = def.src;
    if (def.async === false) script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`No se pudo cargar el módulo: ${nombre}`));
    document.head.appendChild(script);
  });
  return _riverosapayModulosPromesas[nombre];
}

setTimeout(() => {
  cargarModulo('abonosEmpleado').catch(err => console.error(err));
}, 0);
