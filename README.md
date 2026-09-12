# Riverosapay 🚀

Riverosapay es un proyecto que hice para organizar de una forma sencilla la parte **personal y laboral** de una cuenta, principalmente desde el celular.

La idea principal es poder separar los roles de **BOSS / EMPLEADO**, conectar las cuentas cuando corresponde y tener en un mismo lugar cosas como trabajos, horarios, estudio, eventos, amistades, notificaciones y tesorería.

La aplicación funciona como una **PWA**, así que se puede instalar desde el navegador y utilizar prácticamente como una aplicación móvil.

> Este proyecto no es una plataforma bancaria ni procesa pagos reales. La parte de pagos y tesorería sirve para llevar el control y registro de información que ocurre fuera de la aplicación.

---

## 🧠 ¿Qué es Riverosapay?

Riverosapay está dividido principalmente en dos espacios:

- **Inicio:** una pantalla limpia de bienvenida.
- **Organizador:** donde realmente están las herramientas de la cuenta.

También existen módulos que se conectan entre sí, como **Amistades**, **Notificaciones**, **Trabajo**, **Estudio**, **Eventos** y **Tesorería**.

La idea es que cada cosa tenga su propio lugar y que el backend sea quien compruebe realmente qué puede hacer cada usuario, no solamente la interfaz.

---

## 👷 Modo EMPLEADO

El empleado utiliza el Organizador para manejar principalmente:

- 💼 Trabajos y turnos.
- 📚 Estudio, si tiene activa la sesión académica.
- 📅 Eventos.
- 👥 Amistades.
- 🔔 Notificaciones.
- 💰 Información de tesorería cuando existe una relación correspondiente.

El empleado es propietario de sus propios datos y puede tener relaciones con uno o varios BOSS.

También puede decidir si un BOSS tiene permiso para consultar sus **Académicos y Eventos**. Este permiso es general por relación BOSS ↔ EMPLEADO, no depende de un trabajo individual.

---

## 👑 Modo BOSS

El BOSS tiene su propio Organizador para administrar la parte laboral.

Puede:

- Crear trabajos.
- Elegir una amistad como empleado.
- Enviar trabajos como solicitudes.
- Consultar trabajos asignados.
- Gestionar pagos y finalización de trabajos según las reglas del sistema.
- Congelar trabajos finalizados cuando cumplen las condiciones necesarias.
- Consultar Académicos y Eventos de un empleado cuando este le haya dado permiso.

Cuando un BOSS envía un trabajo, primero se crea una **solicitud**. El trabajo no aparece inmediatamente como trabajo del empleado.

El empleado puede:

- ✅ **Aceptar:** el trabajo pasa a formar parte de sus trabajos y queda relacionado con el BOSS.
- ❌ **Rechazar:** la solicitud se cierra y el trabajo no se añade.

---

## 👥 Amistades y relaciones laborales

Las amistades son bidireccionales. Cuando una solicitud es aceptada, ambas cuentas quedan conectadas.

A partir de estas relaciones se pueden crear vínculos laborales BOSS ↔ EMPLEADO.

El acceso a información de otra cuenta no depende solamente de lo que muestre la interfaz. El backend comprueba nuevamente las relaciones y permisos antes de entregar información.

---

## 💼 Trabajo

Los trabajos/turnos pueden guardar información como:

- 📍 Lugar.
- 📆 Fecha y día.
- 🕐 Hora de inicio y finalización.
- 📝 Descripción opcional.
- 💵 Valor del día.
- ✅ Estado de pago.
- 👑 BOSS asignado.
- 🔒 Estado de congelación.
- 🗑️ Estado de eliminación o solicitud de eliminación.

Un trabajo puede ser personal o estar relacionado con un BOSS.

También existe la posibilidad de registrar **trabajadores personalizados por referencia**, para llevar registros de una persona que no necesariamente tenga una cuenta en Riverosapay.

### 🔒 Trabajos congelados

Cuando un trabajo cumple las condiciones necesarias y el BOSS decide congelarlo, pasa a ser permanente y ya no admite cambios.

Para congelarlo se necesita:

- Que el trabajo haya finalizado.
- Que tenga registrado el valor del pago.
- Que el día esté marcado como pagado.

Una vez congelado, el backend mantiene la protección aunque se vuelva a entrar a la aplicación o se reinicie el servidor.

---

## 📚 Estudio

El módulo de estudio permite organizar la parte académica de una cuenta cuando está activa la **sesión académica**.

Incluye principalmente:

- 📖 Materias.
- 📝 Actividades.
- 📅 Organización académica.

La sesión académica puede activarse o desactivarse desde Configuración.

---

## 📅 Eventos

Los eventos permiten registrar actividades personales y consultar la agenda cuando corresponde.

Los permisos para que un BOSS pueda ver los eventos de un empleado se controlan desde la relación laboral y requieren autorización del empleado.

---

## 💰 Tesorería

El módulo de Tesorería permite llevar el control del capital administrado entre un BOSS y un tesorero.

Permite registrar:

- Solicitudes para establecer la relación.
- Capital agregado.
- Gastos.
- Movimientos.
- Saldo disponible.

La aplicación solamente organiza y registra esta información. **No realiza transferencias bancarias ni mueve dinero real desde el sistema.**

---

## 🔔 Notificaciones

Las notificaciones se separan por el modo al que pertenecen para evitar mezclar acciones de EMPLEADO y BOSS.

Entre otras cosas, se utilizan para:

- Solicitudes de amistad.
- Respuestas de solicitudes.
- Solicitudes de relación BOSS ↔ EMPLEADO.
- Solicitudes de trabajos.
- Aceptación o rechazo de trabajos.
- Cambios relacionados con pagos.
- Finalización de trabajos.
- Solicitudes de eliminación.
- Acciones relacionadas con tesorería.

Cuando corresponde, las actualizaciones también se envían en tiempo real mediante Socket.IO.

---

## ⚡ Tiempo real

Riverosapay utiliza **Socket.IO** para mantener algunas partes de la aplicación actualizadas sin tener que recargar constantemente.

El backend utiliza salas separadas para empleados y BOSS y comprueba la sesión y los permisos antes de permitir el acceso a información laboral.

---

## 🔐 Seguridad

Durante el desarrollo también fui reforzando la seguridad del proyecto para que las reglas importantes no dependan solamente del frontend.

Actualmente el proyecto incluye, entre otras medidas:

- 🔑 Contraseñas nuevas protegidas con **Argon2id**.
- 🔄 Migración automática de cuentas antiguas que todavía tenían el hash anterior.
- 🚫 Rate limiting para intentos de autenticación.
- 🍪 Sesiones mediante cookies `HttpOnly` y `Secure` en producción.
- 💾 Sesiones persistentes en MongoDB cuando se utiliza MongoDB Atlas.
- 🛡️ Cabeceras de seguridad mediante Helmet.
- 📦 Límites para cuerpos HTTP demasiado grandes.
- 🔒 Comprobaciones de autorización directamente en backend.
- 🧾 Registro de acciones importantes mediante una colección de auditoría.
- 🗂️ Persistencia separada por entidades en MongoDB para evitar depender de un único documento gigante.

La auditoría registra cosas como quién realizó una acción, qué acción fue, sobre qué recurso y cuándo ocurrió, sin guardar contraseñas, tokens ni cookies.

---

## 🗄️ Persistencia

Riverosapay puede trabajar con dos formas de persistencia:

### MongoDB Atlas

Es la opción utilizada para el entorno desplegado. Los datos se separan en colecciones independientes, por ejemplo:

```text
riverosapay
├── estado
├── sessions
├── users
├── eventos
├── turnos
├── lugares
├── materias
├── amistades
├── amistadSolicitudes
├── actividades
├── joinRequests
├── links
├── notificaciones
├── trabajoSolicitudes
├── trabajadoresPersonal
├── tesorerias
├── tesoreriaSolicitudes
├── tesoreriaMovimientos
└── auditoria
```

### JSON local

Cuando no se configura MongoDB, el proyecto puede utilizar un archivo JSON local para desarrollo y pruebas.

---

## 🛠️ Tecnologías

- **Backend:** Node.js + Express.
- **Tiempo real:** Socket.IO.
- **Base de datos:** MongoDB Atlas.
- **Respaldo local:** JSON.
- **Frontend:** HTML + CSS + JavaScript puro.
- **Seguridad:** Argon2id + Helmet + sesiones + rate limiting.
- **Aplicación móvil:** PWA / modo standalone.
- **Testing:** Node.js Test Runner.

---

## 📁 Estructura del proyecto

```text
riverosapay/
├── server.js
├── src/
│   ├── config/             # persistencia y configuración
│   ├── utils/              # utilidades, hashing, IDs y códigos
│   ├── realtime/           # instancia compartida de Socket.IO
│   ├── models/             # acceso y reglas de datos
│   ├── controllers/        # lógica de negocio
│   ├── routes/             # rutas de la API
│   ├── sockets/            # conexiones y salas de tiempo real
│   └── middleware/         # sesiones, autorización y errores
├── tests/                  # pruebas automáticas
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

La idea de separar el proyecto por módulos es poder seguir agregando cosas sin terminar con toda la aplicación metida en un solo archivo.

---

## 🚀 Ejecutarlo localmente

Necesitas **Node.js 20.x**.

```bash
npm install
npm start
```

Por defecto el servidor utiliza el puerto `3000`, aunque en producción utiliza el puerto proporcionado por el entorno.

Si quieres ejecutar las pruebas:

```bash
npm test
```

Las pruebas comprueban, entre otras cosas, reglas de usuarios y claves, registro, login, login de administrador y el health check del servidor.

---

## 🌐 Producción

Riverosapay está preparado para ejecutarse como servicio web y utilizar MongoDB Atlas como persistencia.

El entorno de producción utiliza un servicio de Render con ejecución permanente, por lo que la aplicación no depende del comportamiento de suspensión de un servicio gratuito para volver a responder.

La aplicación también puede instalarse como PWA desde el navegador en dispositivos compatibles.

---

## 👨🏻‍💻 Sobre el proyecto

Riverosapay es un proyecto que he ido construyendo y mejorando por partes. Muchas funciones empezaron como ideas sencillas y poco a poco fueron creciendo hasta convertirse en módulos completos.

No está hecho pensando solamente en que "funcione". También he ido trabajando en permisos, seguridad, persistencia, sesiones, tiempo real y organización del código para que pueda seguir creciendo sin romper lo que ya existe.

Todavía es un proyecto que puede seguir mejorando, pero esta es la versión que estoy utilizando como base actual.

**Hecho por riverojsx. 🇨🇴**