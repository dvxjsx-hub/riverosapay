# riverosapay

App de organización personal/laboral para administrar mejor la relación **JEFE / EMPLEADO** en el trabajo. Prototipo en desarrollo activo — la versión 1.0 llega cuando el creador diga "LISTO".

## Qué resuelve

Un EMPLEADO organiza sus turnos de trabajo, su horario de estudio y sus eventos. Un JEFE, una vez verificado por ese empleado, puede ver esa información en tiempo real y hasta cargarle trabajos directamente. Todo sin que compartan más datos que un código de verificación de 8 dígitos.

## Lógica de la app

**Roles.** Cada cuenta elige un único rol al registrarse, EMPLEADO o JEFE, y no puede cambiarlo después. El rol determina qué puede ver y editar: el EMPLEADO es dueño de sus datos (trabajo, estudio, evento); el JEFE solo accede a los datos de un empleado después de que ese empleado acepta su solicitud.

**Verificación (link JEFE↔EMPLEADO).** Cada EMPLEADO tiene un `shareCode` único de 8 dígitos. El JEFE lo ingresa y se crea una solicitud (`joinRequest`) pendiente. El EMPLEADO la acepta o rechaza; al aceptarla se crea un `link` permanente entre ambos. A partir de ahí, cualquier endpoint que el JEFE use para ver datos de ese EMPLEADO valida que ese `link` exista (`tieneAcceso`) antes de responder — sin ese link, el JEFE recibe 403.

**Tiempo real.** Cada EMPLEADO tiene su propia "sala" de Socket.IO (`emp-<id>`). Cuando algo cambia (un turno, una materia, un evento), el servidor emite el estado actualizado a esa sala. El EMPLEADO siempre está en su propia sala; el JEFE se une a la sala de un empleado solo si ya fue verificado, así que ambos ven los cambios al instante sin recargar.

**Trabajo (turnos).** Un turno tiene lugar, día, horario, y opcionalmente queda asignado a un JEFE específico. Si lo crea el JEFE, queda asignado a él automáticamente; si lo crea el EMPLEADO, puede elegir a qué jefe (ya verificado) asignarlo o dejarlo sin asignar. Marcar "pagado" y el valor del día lo hace principalmente el JEFE cuando está verificando. Borrar un turno sigue reglas distintas según quién lo pide y si está pagado (ver `PROYECTO.txt` para el detalle paso a paso).

**Notificaciones.** Hay dos tipos que conviven en una sola lista para el EMPLEADO: las solicitudes de verificación pendientes/rechazadas, y notificaciones de info (trabajo añadido, pagado, eliminado, jefe configurado). Todo se ordena por fecha.

**Persistencia.** El estado completo de la app (usuarios, turnos, materias, eventos, links, solicitudes, notificaciones) vive en un único objeto en memoria que se reescribe entero en cada `save()`, ya sea hacia MongoDB Atlas o hacia un archivo JSON local, según la tecnología usada (más abajo).

## Tecnologías

- **Backend:** Node.js + Express + Socket.IO.
- **Persistencia:** MongoDB Atlas (capa gratuita) cuando está configurada; si no, se guarda en un archivo JSON local en el propio servidor. Esto existe puntualmente porque Render, en su plan gratuito, apaga el servicio por inactividad y puede perder el archivo local al reiniciarse — MongoDB Atlas resuelve eso guardando la info fuera del servidor.
- **Frontend:** HTML/CSS/JS puro, sin frameworks. Pensado 100% para uso desde el celular (PWA con modo standalone).
- **Hosting:** Render (capa gratuita), por ahora.

## Estructura del proyecto

```
riverosapay/
├── server.js              # arranca Express + Socket.IO, monta las rutas
├── src/
│   ├── config/db.js       # persistencia (Mongo Atlas / archivo local)
│   ├── utils/utils.js     # hashing, ids, códigos de usuario/recuperación
│   ├── realtime/io.js     # referencia compartida a la instancia de Socket.IO
│   ├── models/            # acceso a datos por dominio (usuarios, trabajo, estudio, evento, verificación, notificaciones)
│   ├── controllers/       # lógica de cada endpoint
│   ├── routes/            # solo define las rutas y las conecta a los controllers
│   ├── sockets/            # eventos de Socket.IO (salas por empleado/jefe)
│   └── middleware/        # manejo de errores async
└── public/                # frontend, ya modularizado por sección (auth, trabajo, estudio, eventos, jefe, perfil, notificaciones...)
```

Cada dominio (trabajo, estudio, evento, verificación) tiene su propio modelo, controller y archivo de rutas, así se puede seguir agregando funcionalidad sin que un solo archivo crezca sin control.
