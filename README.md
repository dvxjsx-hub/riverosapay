# riverosapay

Aplicación de organización personal y laboral para administrar la relación **BOSS / EMPLEADO**. Está pensada principalmente para uso móvil y funciona como PWA.

## Qué es Riverosapay

Riverosapay separa claramente el **Inicio** del **Organizador**.

- **Inicio:** es una pantalla limpia de bienvenida. No muestra Trabajo, Estudio, Evento ni información del organizador.
- **Organizador:** es el espacio donde se gestionan las funciones de la cuenta.
- **Amistades:** permite conectar cuentas y sirve como base para las relaciones laborales.
- **Notificaciones:** concentra las solicitudes y avisos correspondientes al modo actual.

## Modos

Cada cuenta tiene un rol y un `modoActual`.

### Modo EMPLEADO

El empleado utiliza el Organizador para gestionar:

- Trabajo y turnos.
- Estudio, cuando la cuenta está configurada como estudiante.
- Eventos.

Trabajo, Estudio y Evento no aparecen directamente en Inicio; solo se muestran dentro del Organizador.

El empleado es propietario de sus datos. Puede tener amistades, asignar un BOSS a determinados trabajos y recibir solicitudes de trabajos creados por un BOSS.

### Modo BOSS

El BOSS tiene un Organizador propio para administrar su actividad laboral.

Puede:

- Consultar los trabajos que tiene asignados.
- Crear un trabajo desde su propio Organizador.
- Seleccionar una de sus amistades como destinatario del trabajo.
- Enviar el trabajo como una solicitud.
- Recibir en Notificaciones el resultado de la solicitud.

Cuando un BOSS envía un trabajo, **todavía no se crea como trabajo del empleado**. Primero queda como solicitud pendiente. El empleado recibe una notificación con la información del trabajo y puede:

- **Aceptar:** el trabajo se crea en sus trabajos, queda asociado al BOSS que lo envió y el nombre del BOSS queda disponible en la información del trabajo.
- **Rechazar:** la solicitud se cierra y el trabajo no se añade a los trabajos del empleado.

El envío solo puede hacerse hacia una cuenta que sea amistad del BOSS.

## Amistades y relación laboral

Las amistades son bidireccionales. Una vez aceptada una solicitud de amistad, ambas cuentas quedan relacionadas.

La relación BOSS ↔ EMPLEADO utilizada para consultar información laboral funciona mediante solicitudes de verificación y `links`. El empleado decide si acepta o rechaza el acceso. Los endpoints protegidos comprueban en backend que exista la relación correspondiente antes de entregar información.

La amistad también se utiliza para permitir que un BOSS envíe trabajos directamente a una persona concreta sin crear el trabajo de forma inmediata.

## Trabajo

Un trabajo/turno contiene, entre otros datos:

- Lugar.
- Fecha y día.
- Hora de inicio y finalización.
- Descripción opcional.
- Estado de pago.
- Valor del día.
- BOSS asignado.
- Estado de finalización.
- Estado de eliminación pendiente.

El empleado puede crear trabajos para sí mismo y, cuando corresponde, asignarlos a una amistad BOSS.

Un BOSS puede crear un trabajo desde su Organizador y enviarlo a una amistad. La aceptación del destinatario es necesaria para que el turno pase a formar parte de sus trabajos.

Los trabajos tienen vistas de **Horarios** y **Finalizados**, además de filtros relacionados con BOSS y estado de pago. Las reglas de edición, pago, finalización y eliminación se validan en backend según el propietario o BOSS asignado.

## Notificaciones

Las notificaciones pertenecen a la cuenta, pero se separan por `modoDestino` para evitar mezclar acciones de EMPLEADO y BOSS.

Entre los eventos gestionados están:

- Solicitudes de amistad.
- Resultados de solicitudes de amistad.
- Solicitudes de verificación.
- Trabajos asignados.
- Solicitudes de nuevos trabajos enviadas por un BOSS.
- Aceptación o rechazo de trabajos enviados por un BOSS.
- Trabajos pagados.
- Trabajos finalizados.
- Eliminaciones y solicitudes de eliminación.

Las actualizaciones de notificaciones se transmiten también mediante Socket.IO cuando la cuenta está conectada.

## Tiempo real

Cada empleado dispone de una sala de Socket.IO (`emp-<id>`). Los BOSS disponen de su sala (`jefe-<id>`).

El servidor autentica la conexión Socket.IO mediante la sesión del usuario. Un BOSS solo puede entrar a la sala de un empleado cuando el backend confirma que tiene acceso laboral válido.

Los cambios de Trabajo, Estudio, Evento y Notificaciones pueden reflejarse sin recargar la aplicación.

## Verificación BOSS ↔ EMPLEADO

Cada empleado tiene un código de verificación de 8 dígitos. El flujo de verificación crea una solicitud pendiente y el empleado decide si concede el acceso.

Al aceptar se crea un vínculo permanente entre BOSS y empleado. La consulta de información ajena no depende únicamente de la interfaz: el backend vuelve a comprobar los permisos.

## Persistencia

El estado de la aplicación se maneja mediante un objeto de datos central que contiene usuarios, amistades, solicitudes, trabajos, lugares, estudio, eventos, vínculos y notificaciones.

La capa de persistencia puede utilizar MongoDB Atlas o un archivo JSON local como respaldo de desarrollo, según la configuración disponible.

## Tecnologías

- **Backend:** Node.js + Express + Socket.IO.
- **Persistencia:** MongoDB Atlas o archivo JSON local.
- **Frontend:** HTML, CSS y JavaScript sin framework.
- **Aplicación móvil:** PWA con modo standalone.
- **Comunicación en tiempo real:** Socket.IO.

## Estructura del proyecto

```text
riverosapay/
├── server.js
├── src/
│   ├── config/             # persistencia
│   ├── utils/              # hashing, IDs y códigos
│   ├── realtime/           # instancia compartida de Socket.IO
│   ├── models/             # usuarios, amistades, trabajo, solicitudes, etc.
│   ├── controllers/        # lógica de negocio y endpoints
│   ├── routes/             # definición de rutas
│   ├── sockets/            # autenticación y salas de tiempo real
│   └── middleware/         # middleware de sesión y manejo async
└── public/
    ├── css/
    ├── img/
    ├── js/
    │   ├── admin/
    │   ├── amistades/
    │   ├── auth/
    │   ├── core/
    │   ├── estudio/
    │   ├── eventos/
    │   ├── home/
    │   ├── jefe/
    │   ├── notificaciones/
    │   ├── perfil/
    │   ├── socket/
    │   ├── trabajo/
    │   └── ui/
    ├── index.html
    └── manifest.json
```

La aplicación está organizada por dominios para que Trabajo, Estudio, Evento, Amistades, Notificaciones, autenticación y funciones BOSS puedan evolucionar de forma independiente sin concentrar toda la lógica en un único archivo.