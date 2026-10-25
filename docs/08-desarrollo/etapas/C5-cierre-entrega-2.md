# C5 Cierre de la Entrega 2 — especificación

- **Fase y semana:** C. Entrega 2 · se adelanta a la semana 2 (desde el 23 de octubre); en el plan era la semana 5, con margen en la 6 y la 7
- **Estado:** aprobada (23 de octubre de 2026). §0 terminado el 24/10 (PR #74); HU-40 el 25/10 (PR #92) y HU-39 el 25/10; sigue la HU-41
- **Historias:** HU-39 Pantalla del día · HU-40 Plantillas de WhatsApp · HU-41 Fotos de órdenes a la galería (las tres deseables) · cierre: criterios de HU-19 a HU-38, capacitación y acta
- **Base:**
  - Requisitos: RF-44, RF-51, RF-52; RNF-01, RNF-05, RNF-11, RNF-14.
  - Reglas: RN-01 (solo el dueño pone precios y publica), RN-12 (el técnico no ve precios, pagos ni el teléfono del cliente); S-1.
  - Modelo: `plantilla_mensaje` (clave, texto) y `galeria_item.trabajo_id` (`06-diseno/modelo-de-datos/modelo-de-datos.md`).
  - Lo que dejó C4 (`C4-taller-entrega.md` §13): los mensajes de WhatsApp fijos en `src/modulos/ordenes/mensajes.ts`, el botón `AvisarPorWhatsApp`, las fotos de las órdenes en el bucket privado y las consultas de órdenes, saldos y mantenimientos.
  - Lo que dejó B3: la galería del panel (`/panel/sitio/galeria`), que guarda fotos públicas y las borra al quitar el ítem.

Esta especificación se escribe al empezar la etapa, con lo aprendido en las anteriores. Se programa contra ella; si algo cambia durante la etapa, se corrige aquí primero.

## 0. Reorganización del panel (antes de las historias)

Revisión de todas las rutas y flujos del panel (24 de octubre, aprobada por el desarrollador). No suma funciones: pone cada cosa donde se la busca. Va antes de la HU-40, que agrega una pestaña a Configuración, y de la HU-39, que cambia el inicio. Una rama (`refactor/reorganizacion-panel`), un commit por cambio:

1. **El servicio vive en el catálogo.**
   - **Antes:** el alta, el nombre y las variantes estaban en Sitio web, y los precios en el catálogo. Un servicio interno (el mantenimiento del cerámico) necesitaba resumen y página para existir, y una variante (que lleva precios) se agregaba en el sitio.
   - **Ahora:** Catálogo y precios tiene "Agregar servicio" (`/panel/catalogo/nuevo`, solo el nombre), el nombre en sus datos y el editor de variantes. Sitio web > Servicios edita solo la página pública: dirección, resumen, textos, beneficios, pasos, foto y si se muestra.
   - **Un servicio nuevo nace oculto en el sitio y sin resumen.** Para mostrarlo hay que escribir el resumen (lo exige el formulario).
   - **Permisos:** crear, nombrar y cambiar variantes pasa a ser del dueño (RN-01: un servicio lleva precios). El encargado con "Sitio web" sigue editando las páginas.
   - **Enlaces cruzados:** la ficha del catálogo enlaza a "Editar su página en el sitio", y la página del sitio a "Abrir en el catálogo" (solo para el dueño).
2. **Menú agrupado** sin cambiar ninguna dirección:
   - Inicio;
   - **Taller:** Agenda y Órdenes;
   - **Clientes:** Clientes, Consultas, Saldos pendientes, Mantenimientos y Reclamos;
   - **Sitio web;**
   - **Administración:** Catálogo y precios, Usuarios y Configuración.

   El grupo se define en `MODULOS` (`src/lib/permisos.ts`). Un grupo sin módulos para quien entra no se muestra. Los accesos del inicio siguen el mismo orden.
3. **Configuración: Negocio · Taller · Parámetros.** La pestaña "Cotizaciones y mantenimiento" mezclaba temas. Pasa a "Parámetros" (`/panel/configuracion/parametros`), con secciones:
   - Consultas: consulta que se enfría;
   - Cotizaciones: validez, condiciones, garantía y formas de pago;
   - Agenda: adelanto sugerido;
   - Mantenimiento: el intervalo.

   La sección de cada parámetro se define junto a él (`PARAMETROS`). La HU-40 suma "Mensajes".
4. **Un trabajo lleva a su pantalla según su estado.** Si está agendado o cancelado, es una reserva (`/panel/agenda/[id]`); si se recibió, es una orden (`/panel/ordenes/[id]`). Una sola función (`rutaTrabajo`) para la ficha del cliente (reservas y mantenimientos) y para cualquier lista que muestre trabajos.
5. **El permiso "Pagos" dice lo que da:** "Pagos (cobrar y ver saldos)" en Usuarios. El menú sigue diciendo "Saldos pendientes".
6. **"Cotizaciones" deja de ser un módulo falso.**
   - **Qué era:** figuraba como módulo "no construido" con la ruta `/panel/cotizaciones`, que no existe. En realidad servía de llave: cotizar es solo del dueño (RN-01), y `construido: false` lo escondía del menú.
   - **Ahora:** pasa a ser lo que es, una acción. `puede(usuario, "cotizar")` y `exigirAccion("cotizar")` en la página de cotizar, sus acciones y el PDF. Las cotizaciones siguen viviendo en la consulta, y el PDF en `/panel/cotizaciones/[id]/pdf`.
   - **Limpieza:** sin ese caso, la marca `construido` ya no la usa nadie (todos los módulos tienen pantalla) y se quita.

Pruebas: las E2E de HU-07, HU-10, HU-11 y HU-19/20 crean el servicio en el catálogo (el ayudante `crearServicioPublicado`), y el menú y el inicio se prueban con sus grupos.

**Hecho el 24/10 (PR #74).** Además de los 6 puntos, salió de las revisiones:
- **Barra lateral pulida con `frontend-design`:** cada enlace con el ícono de su módulo (el mismo del inicio, `ICONO_MODULO`), títulos de grupo en Barlow itálica, líneas entre bloques. En una pantalla baja se desplaza solo la lista.
- **`enlaceTrabajo`:** el enlace a un trabajo dice "Ver la orden" o "Ver la reserva" y solo aparece si quien mira puede abrir esa pantalla. Lo usan la ficha del cliente y Saldos pendientes.
- **Redirecciones** de las direcciones viejas (`/panel/configuracion/cotizaciones` y `/panel/sitio/servicios/nuevo`), en `next.config.ts`.
- **Una sola función renueva lo que muestra un servicio** (`servicioCambiado`) y el tipo `Transaccion` vive en `src/db`.

## 1. Objetivo

Al abrir el panel, el dueño ve lo que pide atención hoy. Escribe los mensajes de WhatsApp con su propio tono, y publica en el sitio las fotos de un trabajo terminado sin volver a subirlas. Con la Entrega 2 completa y probada, queda lista para la demo, la capacitación y el acta.

## 2. Alcance

- **Incluye:**
  - **HU-39 Pantalla del día:** el inicio del panel muestra, para el dueño y el encargado (cada uno según sus módulos):
    - los ingresos de hoy, con los atrasados que no llegaron;
    - las entregas de hoy, con las atrasadas;
    - las órdenes listas sin avisar;
    - los mantenimientos por avisar;
    - los reclamos pendientes.

    Los accesos a los módulos quedan debajo. El técnico sigue con su inicio de hoy (sus órdenes).
  - **HU-40 Plantillas de WhatsApp:** en Configuración, la pestaña "Mensajes" para editar los tres mensajes ("vehículo listo", "saldo pendiente" y "mantenimiento"), con campos como {nombre}, {vehiculo} y {saldo}, vista previa y "Volver al texto original".
  - **HU-41 Fotos de órdenes a la galería:** desde una orden entregada, el dueño elige la foto de después (obligatoria) y la de antes (opcional), el servicio y una descripción, y las publica en la galería del sitio.
  - **Cierre:**
    - `09-pruebas/criterios-entrega-2.md`, con los criterios de HU-19 a HU-41 y su estado;
    - la guía de capacitación por rol (`10-lanzamiento/capacitacion.md`);
    - el acta (`09-pruebas/actas-de-aceptacion/entrega-2.md`).
- **No incluye** (y dónde queda):
  - El merge a `main`, la etiqueta `v2.0.0` y el cobro: se hacen al aceptarse el acta, con la Entrega 1 (memoria del proyecto: `develop` completo pasa a `main` al aceptar).
  - Difuminar la placa o las caras en las fotos que se publican: no hay editor de fotos. El dueño elige fotos donde no se lean y lo confirma (§12).
  - Plantillas de otros mensajes (el de la cotización y el de los reclamos): quedan como están. Se suman si el dueño lo pide (registro de cambios).

## 3. Reglas que se cumplen

| Regla | Qué pide | Cómo se garantiza |
|---|---|---|
| RF-52 | El inicio muestra lo del día | Una consulta por bloque, cada una solo si quien entra ve ese módulo (`puedeVerModulo`) |
| RN-12 | El técnico no ve precios, pagos ni teléfonos | La pantalla del día no muestra montos ni teléfonos; el técnico no la ve (sigue con sus órdenes) |
| RF-51, RNF-11 | El dueño edita los mensajes; nada fijo en el código | Tabla `plantilla_mensaje` con los mensajes que el dueño cambió; el texto original vive solo en el código y vale mientras no haya fila ("Volver al texto original" la borra) |
| RF-51 | Una plantilla rota no envía un mensaje roto | Se valida al guardar: no vacía, hasta 1000 caracteres, solo con los campos de ese mensaje y con texto además de los campos (si no, con los campos vacíos saldría en blanco). Un campo vacío al armar el mensaje se quita junto con el espacio de antes, o el de después si empieza la línea |
| RF-44, RN-01 | El dueño publica fotos de una orden entregada | La acción exige ser el dueño; la orden, entregada; y las fotos, de esa orden y de su etapa |
| RNF-05 | Las fotos de los clientes son privadas | Publicar **copia** la foto al bucket público (un `archivo` nuevo): la de la orden sigue privada, y quitarla de la galería no borra la de la orden |
| RNF-14 | Las fotos del sitio tienen texto alternativo | La descripción es obligatoria (hasta 140, como en la galería) |

## 4. Datos

Migraciones:

- `0034_plantillas_mensaje` (HU-40): la tabla, vacía. (Los números 0031 a 0033 los usaron los pedidos de la demo.)
- `0035_galeria_desde_orden` (HU-41): la columna `trabajo_id`.

### `plantilla_mensaje`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `clave` | `text` | no | PK. CHECK `listo`, `saldo`, `mantenimiento` |
| `texto` | `text` | no | CHECK de 1 a 1000 caracteres |
| `updated_at` | `timestamptz` | no | |
| `updated_by` | `integer` | sí | FK `usuario` |

**Sin datos iniciales** (decidido al programarla, 25/10): el texto original de cada mensaje vive en el código (`src/modulos/configuracion/plantillas.ts`) y la tabla guarda solo el que el dueño cambió. Sin fila vale el original, y "Volver al texto original" borra la fila: así el original está en un solo lugar y no se repite en una migración. Los originales, los textos de C4 §8 escritos con campos:

- **listo:** "Hola {nombre}, tu {vehiculo} ya está listo en {negocio}. {saldo} Te esperamos en el taller."
- **saldo:** "Hola {nombre}, te escribimos de {negocio} por el saldo de {monto} del servicio de tu {vehiculo}. Puedes pagarlo en el taller, por QR o por transferencia."
- **mantenimiento:** "Hola {nombre}, te escribimos de {negocio}: a tu {vehiculo} le toca el mantenimiento de {servicio}. ¿Te agendamos un día?"

### `galeria_item` (cambia)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `trabajo_id` | `integer` | sí | FK `trabajo`. La orden de donde salieron las fotos (RF-44). Índice |

## 5. Pantallas y rutas

### `/panel` — Inicio (cambia; HU-39)
- **Título:** "Hola, {nombre}", y debajo la fecha de hoy ("Viernes 23 de octubre").
- **Bloques**, en este orden y solo los de los módulos de quien entra. Cada fila lleva a su pantalla:
  1. **Reclamos pendientes** (Reclamos): la cantidad, como hoy.
  2. **Ingresos de hoy** (Agenda): las reservas agendadas que ingresan hoy y las de días pasados que todavía no se recibieron ("Debía ingresar el 21/10"). Cada una con placa, cliente, espacio y hora aproximada; lleva a la reserva, donde está "Recibir vehículo".
  3. **Entregas de hoy** (Órdenes): las órdenes abiertas que se entregan hoy y las atrasadas ("Atrasada desde el 22/10"), con su estado escrito.
  4. **Listas sin avisar** (Órdenes): las órdenes listas sin aviso; lleva a la orden, donde está "Avisar por WhatsApp".
  5. **Mantenimientos por avisar** (Mantenimientos): la cantidad de vencidos y de próximos sin avisar; lleva a `/panel/mantenimientos`.
- Un bloque sin nada dice "Nada para hoy." (o "Nada pendiente.") en una línea, sin ocupar lugar de más.
- **Debajo**, "Ir a", los accesos a los módulos, como hoy.
- **En el celular**, una sola columna; en la computadora, dos.
- **El técnico** sigue con su inicio de hoy.

### `/panel/configuracion/mensajes` — Mensajes (dueño; HU-40)
- Una tarjeta por mensaje: "Vehículo listo", "Saldo pendiente" y "Mantenimiento".
- **En cada una:**
  - el texto, en un área de texto;
  - debajo, los campos que admite ese mensaje, cada uno con lo que significa;
  - la vista previa con datos de ejemplo;
  - los botones "Guardar" y "Volver al texto original".
- **Campos:**
  - En los tres: {nombre} (primer nombre del cliente), {vehiculo} ("Toyota Corolla (placa 1234ABC)") y {negocio} (el nombre de Configuración).
  - **Listo:** {saldo} ("Saldo pendiente: 350 Bs." si debe algo y quien avisa ve pagos; si no, desaparece).
  - **Saldo pendiente:** {monto} ("350 Bs").
  - **Mantenimiento:** {servicio}.

### `/panel/ordenes/[id]/publicar` — Publicar en la galería (dueño; HU-41)
- **Se llega** desde "Publicar en la galería", en una orden entregada con al menos una foto de después. Solo lo ve el dueño.
- **Qué se elige:**
  - **Foto de después** (obligatoria), entre las de la etapa "Después".
  - **Foto de antes** (opcional), entre las de "Ingreso" y "Antes".
  - Las fotos se eligen tocándolas, en una grilla con la elegida marcada (también con texto, no solo con color).
- **Servicio:** un selector con los servicios de la orden, con el primero ya elegido.
- **Descripción:** obligatoria, hasta 140 caracteres; es también el texto alternativo.
- **Casilla obligatoria:** "En las fotos no se lee la placa ni se ve a nadie".
- **"Publicar"** guarda y vuelve a la orden con "Publicado en la galería. Lo ordenas u ocultas en Sitio web > Galería.".
- **En la orden:** si ya se publicó, "Publicada en la galería (2 fotos)", con enlace a la galería del panel.

### En otras pantallas
- **Órdenes, mantenimientos y saldos:** los enlaces de WhatsApp usan la plantilla guardada.

## 6. Acciones del servidor

Todas validan con Zod y empiezan con `exigirModulo`.

| Acción | Quién | Qué hace | Mensajes |
|---|---|---|---|
| `guardarPlantilla` | dueño (`configuracion`) | Clave válida; texto de 1 a 1000 con solo los campos de esa plantilla. Guarda quién y cuándo, y renueva la caché de las plantillas | "Mensaje guardado." · "{precio} no es un campo de este mensaje. Usa: {nombre}, {vehiculo}, {negocio}, {saldo}." · "Escribe el mensaje." |
| `restaurarPlantilla` | dueño | Vuelve al texto original de esa clave (borra la fila guardada) | "Volvió el texto original." |
| `publicarEnGaleria` | dueño (`ordenes` y rol dueño) | Orden entregada; foto de después de su etapa "despues"; la de antes (si viene), de "ingreso" o "antes"; servicio entre los de la orden; descripción; casilla marcada. Copia cada foto (y su miniatura) del bucket privado al público como `archivo` nuevo, y crea el `galeria_item` al final, visible, con `trabajo_id`. Si algo falla después de copiar, borra las copias. Renueva la caché de la galería | "Publicado en la galería…" · "Elige la foto de después." · "Marca que en las fotos no se lee la placa ni se ve a nadie." |

**Consultas:**
- `src/modulos/inicio/consultas.ts`: `ingresosDeHoy(hoy)`, `entregasDeHoy(hoy)`, `listasSinAvisar()` y `contarMantenimientosPorAvisar(hoy)`. Sin montos ni teléfonos.
- `src/modulos/configuracion/consultas.ts`: `obtenerPlantillas()` (con `use cache` y su etiqueta, como los datos del negocio).
- `src/modulos/ordenes/consultas.ts`: `publicadasDeOrden(id)`.

**Funciones puras** (con prueba unitaria):
- `armarMensaje(plantilla, valores)`: reemplaza los campos y quita el vacío junto con su espacio ("Hola {nombre}," sin nombre da "Hola,"). Los mensajes de `mensajes.ts` pasan a usarla con la plantilla guardada.
- `camposDesconocidos(texto, permitidos)`: los campos que no son de esa plantilla.

## 7. Componentes y diseño

- **Reutiliza:**
  - `EstadoVacio`, `Campo`, `Pestanas` de Configuración, `Textarea`, `Checkbox` y `Selector`;
  - las miniaturas de `FotosOrden`;
  - `copiar` de almacenamiento (nuevo: leer del privado y subir al público).
- **Nuevos:**
  - `BloqueDelDia` (título, cantidad y filas con enlace);
  - `EditorPlantilla` (área de texto, campos, vista previa y botones);
  - `ElegirFotos` (grilla con selección de una).
- **Diseño con `frontend-design`:**
  - la pantalla del día es lo primero que ve el dueño cada mañana, desde el celular: lo urgente arriba, se lee de un vistazo y cada fila es un toque;
  - el editor de mensajes muestra cómo le llega el mensaje al cliente.

## 8. Textos de la interfaz

- **Inicio:**
  - Bloques: "Reclamos pendientes" · "Ingresos de hoy" · "Entregas de hoy" · "Listas sin avisar" · "Mantenimientos por avisar".
  - Estados: "Debía ingresar el {fecha}" · "Atrasada desde el {fecha}" · "Nada para hoy." · "Nada pendiente." · "Ir a".
- **Mensajes:**
  - Pestaña: "Mensajes".
  - Mensajes: "Vehículo listo" · "Saldo pendiente" · "Mantenimiento".
  - Partes: "Campos" · "Así le llega" · "Guardar" · "Volver al texto original".
- **Publicar:**
  - Botón en la orden: "Publicar en la galería".
  - Pasos: "Foto de después" · "Foto de antes (opcional)" · "Servicio" · "Descripción".
  - Casilla: "En las fotos no se lee la placa ni se ve a nadie".
  - Botón: "Publicar".
  - Estado en la orden: "Publicada en la galería ({n} fotos)".

## 9. Pruebas

- **Unitarias:**
  - `armarMensaje`: con todos los campos, sin nombre, sin saldo y con un campo repetido.
  - `camposDesconocidos`.
  - Los esquemas de plantilla y de publicar.
  - Los mensajes de C4 armados con la plantilla original dan el mismo texto de hoy (así los E2E de C4 siguen valiendo).
- **De punta a punta:**
  - `hu-39-pantalla-del-dia`:
    - el dueño ve un ingreso de hoy, uno atrasado, una entrega, una lista sin avisar y los mantenimientos;
    - un encargado solo con Agenda ve solo los ingresos;
    - el técnico sigue con sus órdenes.
  - `hu-40-plantillas`:
    - el dueño cambia el mensaje de "listo" y el enlace de WhatsApp de la orden lo usa;
    - un campo inventado da error;
    - "Volver al texto original" funciona;
    - un encargado no entra.
  - `hu-41-galeria-desde-orden`:
    - el dueño publica antes y después desde una orden entregada, y aparecen en la galería pública;
    - las copias son públicas y la foto de la orden sigue privada;
    - quitar el ítem de la galería no borra la foto de la orden;
    - un encargado no ve "Publicar en la galería", ni por la URL ni por la acción.
- A 360 px, ninguna pantalla nueva se sale.

## 10. Orden de trabajo

Una rama y un PR por historia, desde `develop`:
1. `docs/c5-especificacion`: esta especificación.
2. `hu-40-plantillas-whatsapp`: migración `0034`, `armarMensaje`, la pestaña "Mensajes" y los mensajes de C4 pasan a la plantilla. Va primero porque toca código de C4 que ya está probado.
3. `hu-39-pantalla-del-dia`. Diseño con `frontend-design`.
4. `hu-41-galeria-desde-orden`: migración `0035`, la copia al bucket público y la pantalla de publicar.
5. `docs/cierre-entrega-2`:
   - `criterios-entrega-2.md` (HU-19 a HU-41, con el estado de cada criterio);
   - `capacitacion.md`, con una guía corta por rol: dueño (cotizar, agenda, saldos y mensajes), encargado (recibir, entregar y cobrar) y técnico (sus órdenes desde el celular);
   - el acta `entrega-2.md`;
   - el cierre de esta especificación.

Cada PR pasa por lint, typecheck, unitarias, E2E completo y knip; `code-review` siempre y `security-review` (HU-40 y HU-41 tocan permisos, datos de clientes y el bucket público); capturas a 360 y 1280 px.

## 11. Criterio de salida

- Todos los criterios de HU-19 a HU-38 en ✅ o 🟢 en `criterios-entrega-2.md`; las deseables, en ✅ o anotadas para después.
- El E2E completo pasa.
- **En la demo:**
  - la pantalla del día con datos de una semana de prueba;
  - cambiar el mensaje de "listo" y avisar con él;
  - publicar un trabajo en la galería y verlo en el sitio.
- **Después, con el dueño** (no depende del código):
  - la capacitación por rol;
  - el acta firmada o confirmada por WhatsApp;
  - el merge a `main` y `v2.0.0`;
  - el pago de Bs 2.000.

## 12. Decisiones abiertas

| Qué | De quién | Mientras tanto |
|---|---|---|
| ¿Hace falta el permiso del cliente para publicar fotos de su vehículo? | Dueño | Se publican solo fotos donde no se lee la placa ni se ve a nadie, y el dueño lo confirma con la casilla. Si el dueño quiere pedir permiso, se suma una casilla "El cliente está de acuerdo" |
| ¿El encargado con "Sitio web" también publica desde la orden? | Dueño | No: solo el dueño (RF-44). Se cambia si lo pide |
| ¿Qué ve el encargado en la pantalla del día? | Dueño | Los bloques de sus módulos, sin montos |
| ¿Más mensajes editables (cotización, reclamos)? | Dueño | Quedan fijos; se suman si lo pide (registro de cambios) |
