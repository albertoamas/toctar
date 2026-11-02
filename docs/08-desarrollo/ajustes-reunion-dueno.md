# Ajustes de la reunión con el dueño (Entrega 2)

- **Origen:** reunión de revisión del panel con el dueño, a fines de octubre de 2026 (devolución anotada el 01/11).
- **Estado:** plan aprobado por YankoSoft el 01/11. Cada punto se especifica, se propone y se programa por separado.
- **Prioridad acordada:** primero la **cotización directa** (lo más urgente para el dueño), después el **checklist** y la **firma**, y recién entonces el **rediseño del panel**.
- **Relación con el cierre:** estos ajustes van **antes** de la prueba con los criterios, la capacitación y el acta de la Entrega 2 (`etapas/C5-cierre-entrega-2.md`).

## Cómo se trabaja cada punto

Igual que una historia (`plan-de-desarrollo.md`, "Cómo se trabaja cada historia"):

1. **Especificación** en `etapas/` con `_plantilla.md`, antes de programar (para los puntos con datos nuevos o reglas que cambian).
2. **Propuesta** de pantallas y decisiones a YankoSoft y, si cambia algo que el dueño ya vio, al dueño.
3. **Rama propia** desde `develop`, commits chicos, pruebas unitarias de las reglas y E2E de los flujos.
4. **Revisiones** (`code-review` siempre; `security-review` si toca permisos o datos) y **PR** a `develop`, que se une solo con un "Aprobado".
5. **Documentos al día:** `registro-de-cambios.md`, los requisitos que cambian, el modelo de datos y este plan (columna "Estado").

## 0. Resumen

| Orden | Punto | Pedido | Horas | Tratamiento sugerido | Estado |
|---|---|---|---|---|---|
| 1 | Cotización directa, sin consulta | 23 y 24 (el 25, descartado) | 18 a 24 | Por definir (cambia lo contratado: HU-24 y HU-25) | ✅ Programado (PR #113, 01/11) |
| 2 | Checklist al recibir el vehículo | 12 | 8 a 10 | Incluido en el plan (decisión del 01/11) | ✅ Programado (01/11) |
| 3 | Firma digital del cliente | 13 | 6 | Incluido en el plan (decisión del 01/11); el PDF, aparte | ✅ Programado (01/11) |
| 4 | Fotos: solo las que sirven, sin videos | 27 | 4 a 6 | Incluido | ✅ Programado (01/11) |
| 5 | Rediseño del panel: administrativo estándar | 26 | 25 a 35 | Incluido (sin él no hay aceptación) | ⏳ |
| 6 | Órdenes con historial y agenda con las completadas | 28 | 6 a 8 | Incluido | ⏳ |
| 7 | Saldos pendientes: ordenar y buscar | 30 | 2 | Incluido (bolsa de 8 h) | ⏳ |
| 8 | Vehículos sin placa | 29 | 6 a 8 | Por definir | ⏳ |
| 9 | Avisos de mantenimiento automáticos | 22 | Por estimar | Por cotizar (API de WhatsApp de Meta) | ⏳ Explicar al dueño |
| — | Reclamos | — | — | Sin cambios | — |

**Total aproximado:** 75 a 100 horas. El acuerdo tiene una bolsa de 8 horas para ajustes chicos; el resto se anota en `03-cierre-comercial/registro-de-cambios.md` con su tratamiento (incluido o cotizado), que decide YankoSoft con el dueño.

Los puntos 1 a 4 tocan las mismas pantallas (cotizar, recibir, entregar): se hacen con los componentes de hoy y el rediseño (5) les cambia la apariencia después, sin rehacerlos, porque usan los componentes compartidos del panel.

---

## 1. Cotización directa, sin consulta (pedido 23)

> **Estado (01/11/2026):** programado en el PR #113 con la especificación `etapas/P23-cotizacion-directa.md`. Lo que cambió respecto de la propuesta de abajo: como se mantienen las versiones, la tabla `consulta` quedó como encabezado de la cotización (D-12) en lugar de mover sus columnas a `cotizacion`; las consultas viejas sin cotizar no se migran ni se muestran.

### Lo que dijo el dueño
> "Son muchos pasos y cosas que no se hacen." En el taller: le escriben por WhatsApp o pasan por el taller preguntando por los servicios; un mensaje automático responde con la lista de servicios; el cliente dice cuál le interesa y **recién ahí se hace la cotización**. En el sistema espera lo mismo: cuando el cliente dice, por ejemplo, "quiero una instalación de PPF", el dueño o el encargado **registra al cliente si no está y hace la cotización directamente**, la envía o la imprime, y **se acepta o se rechaza**. "No le interesa la consulta para nada, ni si fue por WhatsApp o en el taller." **Sí le importa si la cotización se hizo por fotos o en persona** (eso, como está, le gustó).

### Cómo está hoy
- Tres pasos: **Nueva consulta** (cliente, vehículo, servicio de interés, canal, nota y fotos) → **ficha de la consulta** → **Cotizar** (líneas, precios, "por fotos", PDF).
- Datos: `consulta` (canal, estado `consulto` / `cotizado` / `confirmado` / `perdido`, motivo de pérdida, último movimiento) y `cotizacion` colgada de una consulta, con versiones (`enviada`, `reemplazada`, `aceptada`) y fotos (`cotizacion_foto`).
- La reserva sale de la cotización (`trabajo.cotizacion_id`, y también guarda `consulta_id`).
- El seguimiento ("consulta que se enfría", "perdida" con su motivo) vive en la consulta, igual que el bloque del inicio.

### Propuesta
**Una sola cosa: la Cotización.** El menú "Consultas" pasa a ser "**Cotizaciones**".

1. **Nueva cotización** (`/panel/cotizaciones/nueva`), en una pantalla y de arriba abajo:
   - **Cliente:** buscar por nombre, teléfono o placa; si no está, "Agregar cliente" en el mismo lugar (nombre, WhatsApp y vehículo), sin salir de la pantalla.
   - **Vehículo:** elegir uno del cliente o agregar uno.
   - **Servicios:** las líneas de hoy (servicio, opción, precio sugerido del catálogo, editable) y "Agregar servicio".
   - **¿Cómo se cotizó?** "En persona" o "Por fotos" (el aviso "precio estimado: se confirma al ver el vehículo" de RN-03).
   - Descuento, validez (sugerida por Configuración) y una nota opcional.
   - Un botón: **"Crear cotización"** → la ficha, con el PDF listo para compartir o imprimir.
2. **La ficha de la cotización** (`/panel/cotizaciones/[id]`):
   - Arriba: número, cliente, vehículo, total y su estado.
   - **"Aceptar y agendar"** (lleva a la nueva reserva con todo cargado), **"Rechazar"** (con su motivo: precio, no respondió, otro) y, en el menú "Más", **"Editar"** (si se aprueba el pedido 25) o "Nueva versión" (si no).
   - El PDF: ver, compartir por WhatsApp, descargar.
3. **La lista** (`/panel/cotizaciones`): pestañas **Pendientes**, **Aceptadas** y **Rechazadas**, con búsqueda por cliente, teléfono, placa o número. Las pendientes que pasan los días de Configuración sin respuesta llevan el aviso "Sin respuesta hace N días" (lo que hoy es "consulta que se enfría").
4. **Lo que desaparece:** la consulta, el canal (WhatsApp o taller), las fotos y archivos de la consulta y las fotos de la cotización (punto 4).
5. **En otras pantallas:** la ficha del cliente muestra "Cotizaciones" en lugar de "Consultas"; el inicio, "Cotizaciones sin respuesta"; la reserva, "Ver la cotización N".

### Datos y migración
- `cotizacion` suma `cliente_id`, `vehiculo_id`, `estado` (`pendiente`, `aceptada`, `rechazada`), `motivo_rechazo`, `detalle_rechazo` y `ultimo_movimiento_at` (lo que hoy está en la consulta). `consulta_id` queda nulo y deja de usarse.
- **Migración de lo que ya existe** (pruebas y datos de demostración; producción no está publicada):
  - cada cotización toma el cliente y el vehículo de su consulta;
  - su estado sale del de la consulta (`confirmado` → `aceptada`, `perdido` → `rechazada` con el mismo motivo, lo demás → `pendiente`);
  - las consultas sin cotización no pasan: eran solo preguntas.
- **Versiones:** si se aprueba el pedido 25, una cotización pendiente se **edita** (se regenera el PDF) y queda una tabla de cambios (quién, cuándo, qué precio tenía) en lugar de versiones; aceptada, se congela. Si no se aprueba, se mantienen las versiones de hoy.
- `trabajo.consulta_id` deja de usarse (queda `cotizacion_id`).
- Las tablas `consulta`, `consulta_archivo`, `subida_pendiente` y `cotizacion_foto` se dejan de usar en esta etapa y se borran en una migración posterior, una vez probado todo.
- El parámetro "Consulta que se enfría" pasa a llamarse "Cotización sin respuesta" (mismo valor).

### Permisos
- El módulo "Consultas" pasa a "**Cotizaciones**" (`usuario_permiso`: migración de `consultas` a `cotizaciones`).
- **Cotizar:** hoy solo el dueño (RN-01). Si el dueño confirma el **pedido 24**, un permiso "Cotizar y sumar adicionales" que él marca en Usuarios para el encargado.
- El técnico sigue sin ver cotizaciones (RN-12).

### Reglas y documentos que cambian
- HU-24 y HU-25 (`05-analisis/historias-de-usuario/historias.md`) y sus casos de uso; RF de consultas; RN-01 (si el 24) y RN-02 (si el 25).
- Modelo de datos (una decisión nueva: la cotización es la entrada del flujo comercial).
- `etapas/C2-consultas-cotizaciones.md` queda reemplazada por una especificación nueva (`etapas/P23-cotizacion-directa.md`).
- Redirecciones de `/panel/consultas…` a `/panel/cotizaciones…` (en `next.config.ts`).

### Pruebas
- Unitarias: la migración de estados, el aviso de "sin respuesta", el esquema de la cotización nueva (con cliente y vehículo nuevos o existentes).
- E2E: crear una cotización con un cliente nuevo; con uno existente; por fotos; aceptar y agendar; rechazar con motivo; editar (si el 25); buscar en la lista; el técnico no entra; las E2E de HU-24 a HU-28 se reescriben y `flujo-taller-completo` sigue pasando.

### Preguntas para el dueño (respondidas el 01/11)
1. ¿El **encargado** puede cotizar cuando él no está (pedido 24)? **Sí.**
2. ¿Prefiere **editar** la cotización (pedido 25) o hacer una versión nueva cada vez? **Versiones** (el 25 se descarta).
3. ¿Le sirven los motivos de rechazo de hoy (precio, no respondió, otro)? **Sí.**
4. Nueva: ¿el encargado también suma adicionales a una orden? Por preguntar; hoy, solo el dueño.

### Terminado cuando
El dueño crea una cotización para un cliente nuevo en una sola pantalla, la comparte por WhatsApp y la acepta o la rechaza, sin pasar por ninguna consulta.

---

## 2. Checklist al recibir el vehículo (pedido 12)

> **Estado (01/11/2026):** programado con la especificación `etapas/P12-checklist-recepcion.md`. Va incluido en el plan (no se cotiza aparte). Diferencias con la propuesta: cada parte arranca "Sin revisar" y se marca "Bien" o "Detalle" (este, en un modal), y no se recibe sin revisarlas todas (ajuste del 01/11 al probarlo) y las fotos generales de ingreso se mantienen hasta el pedido 27. La lista base y los tipos de detalle quedan como abajo, y el dueño ajusta la lista en Configuración → Taller.

### Lo que dijo el dueño
> Para recibir el vehículo quiere "un checklist, por llamarlo, para marcar detalles si es que el auto llegó con detalles, junto con la foto".

### Cómo está hoy
Al recibir: fotos de ingreso (sin orden ni relación con una parte), observaciones en texto libre y el técnico.

### Propuesta
1. **La lista de partes, en Configuración → Taller → "Checklist de recepción"** (editable fila por fila, como los espacios): capó, techo, puertas, parachoques, faros, espejos, parabrisas, aros, tapizado… El dueño la arma una vez; se puede ordenar y desactivar una parte.
2. **Al recibir**, una fila por parte con dos botones grandes: **"Bien"** (por defecto) y **"Con detalle"**. Con detalle:
   - el tipo: rayón, golpe, raspón, roto u otro;
   - una nota corta;
   - **"Foto"**: la cámara, y la foto queda unida a esa parte.
3. Las **fotos de ingreso** pasan a ser las de los detalles (punto 4); "Observaciones" queda para lo que no es una parte ("deja una caja de herramientas").
4. **En la orden**, "Cómo llegó" muestra solo las partes con detalle, con su foto, y "El resto, bien".
5. Si se aprueba la firma (punto 3), el checklist sale en la constancia que firma el cliente.

### Datos
- `parte_revision` (configuración): `id`, `nombre`, `orden`, `activo`.
- `trabajo_revision`: `trabajo_id`, `parte_id`, `estado` (`bien` / `con_detalle`), `tipo`, `nota`, `foto_archivo_id` (bucket privado).
- Datos iniciales: una lista base de partes, que el dueño ajusta.

### Pruebas
Unitarias del esquema (con detalle pide el tipo); E2E: el dueño arma la lista; al recibir marca dos detalles con foto; la orden los muestra; el técnico los ve sin precios.

### Preguntas para el dueño
1. ¿Qué partes quiere en la lista inicial?
2. ¿Los tipos de detalle (rayón, golpe, raspón, roto, otro) le sirven?

### Terminado cuando
Al recibir, el dueño marca en el celular los detalles con su foto en menos de un minuto, y quedan visibles en la orden.

---

## 3. Firma digital del cliente (pedido 13)

> **Estado (01/11/2026):** programado con la especificación `etapas/P13-firma-entrega.md`. Respuestas: la firma es **al entregar**; se puede entregar **sin firma, con el motivo**; la **constancia en PDF queda aparte: sugerírsela al dueño** en la próxima revisión (un documento con los trabajos hechos, cómo llegó y la firma, para mandarle al cliente por WhatsApp; +2 h).

### Lo que dijo el dueño (01/11)
> Quiere que **los clientes firmen al recibir su vehículo**, para verificar que todo esté bien, de forma digital.

Se entiende como **el momento en que el cliente recibe su vehículo de vuelta**, es decir, **la entrega**: el pedido 13, que ya estaba anotado.

### Propuesta
1. **En "Entregar vehículo"**, antes de confirmar: "**Firma del cliente**", un recuadro donde el cliente firma con el dedo, su nombre (llega el del cliente, editable si retira otra persona) y "Borrar firma".
2. La firma se guarda como imagen en el **bucket privado**, unida a la orden, con la fecha y quién entregó. No es una firma digital certificada: es una constancia de conformidad.
3. **En la orden entregada:** "Recibido conforme por {nombre}, el {fecha}", con la firma.
4. **Opcional (+2 h):** una **constancia en PDF** (trabajos hechos, checklist de cómo llegó, firma) para mandarle al cliente por WhatsApp.
5. **Sin firma**, ¿se puede entregar? Propuesta: sí, con "Entregar sin firma" y la razón (el cliente no estaba, retiró otra persona), igual que "recibir sin fotos".

### Datos
`trabajo.firma_entrega_archivo_id`, `firma_entrega_nombre`, `firma_entrega_at` (o una tabla `trabajo_firma` si también hay firma al recibir).

### Preguntas para el dueño
1. ¿La firma es **al entregar** (cuando se lleva el auto), **al recibir** (cuando lo deja, conformando el checklist) o **en las dos**? En las dos suma 2 a 3 horas.
2. ¿Quiere la **constancia en PDF**?
3. ¿Se puede entregar **sin firma**?

### Terminado cuando
El cliente firma en el celular al llevarse su auto y la firma queda en la orden (y en el PDF, si se pide).

---

## 4. Fotos: solo las que sirven (pedido 27)

> **Estado (01/11/2026):** programado con la especificación `etapas/P27-fotos-justas.md`. Además de la propuesta, se quitaron las "Fotos de ingreso" sueltas al recibir (repetían la foto de cada detalle del checklist) y la confirmación "recibir sin fotos": la prueba de cómo llegó es el checklist.

### Lo que dijo el dueño
> El sistema pide fotos innecesarias: en la consulta (no debería existir), en la cotización (se hace en persona o le mandan fotos por WhatsApp). En la orden: las de **recepción** sí van (son de detalles), las de **inicio** (todo el vehículo) y las del **final** también; las de **proceso** no le interesan. **No necesita subir videos en ninguna parte.**

### Propuesta
| Dónde | Hoy | Queda |
|---|---|---|
| Consulta | Fotos y videos | Desaparece con la consulta (punto 1) |
| Cotización | Fotos | Sin fotos |
| Recepción | "Ingreso" | **"Detalles"**, unidas al checklist (punto 2) |
| Inicio del trabajo | "Antes" | **"Inicio"**: el vehículo completo |
| Proceso | "Durante" | **Se quita** |
| Final | "Después" | **"Final"**; sigue sirviendo para la galería del sitio |
| Videos | Consulta | En ninguna parte |

- Las fotos "durante" que ya existen no se borran: se ven en la orden como "Otras fotos", sin poder subir más.
- Solo cambian los nombres que se ven ("Inicio", "Final"); los valores en la base (`antes`, `despues`) quedan, así no hay migración de datos.

### Terminado cuando
Ninguna pantalla pide fotos de más ni videos, y la orden tiene tres momentos claros: detalles al recibir, inicio y final.

---

## 5. Rediseño del panel: administrativo estándar (pedido 26)

### Lo que dijo el dueño
> Lo peor, junto con la cotización: no es amigable, mucho texto; "la idea es que un tonto pueda usarlo"; se confunde todo con el fondo, nada resalta; está "todo tirado a lo loco". No le gustó nada. No le interesa seguir la identidad visual en el panel interno: busca un panel administrativo **más estándar y amigable**. Cuesta seguir el flujo: mucha complejidad para cosas simples.

Por pantalla:
- **Inicio:** sobrecargado; prefiere algo simple o estadísticas básicas.
- **Sitio web y Configuración:** le gusta poder gestionarlo todo, pero el texto no es amigable ni está organizado: no se daría cuenta rápido de dónde entrar a cambiar un texto.
- **Catálogo y precios:** lo que más le gustó, pero le falta ser amigable.
- **Usuarios:** pobre de diseño, aunque le gustó la simplicidad.
- **Clientes:** adecuado.

### Dirección
- **La marca queda en el sitio público y en el ingreso.** En el panel: el logo y, como mucho, el rojo como color de acento del botón principal. Fuera los titulares en Barlow itálica, los cortes a 60° y el trazo rojo del menú.
- **Un panel administrativo conocido:**
  - fondo gris muy claro y **tarjetas blancas con borde y sombra suave**, para que cada bloque se separe del fondo;
  - menú lateral con íconos y el módulo actual bien marcado;
  - **tablas** para las listas en la computadora (y filas en el celular);
  - **insignias de color por estado** (verde: entregada o pagada; azul: en proceso; ámbar: atrasada o pendiente; gris: cancelada);
  - tipografía sin itálicas (Montserrat o la del sistema), títulos cortos;
  - **menos texto:** sin párrafos de ayuda; cada campo con su etiqueta y, si hace falta, un ícono de ayuda.
- **Inicio:** tarjetas con números (en el taller, entregas de hoy, por cobrar, cotizaciones sin respuesta, mantenimientos por avisar) y la lista de lo de hoy.
- **Sitio web y Configuración:** una página de inicio con **tarjetas grandes** del tipo "¿Qué quieres cambiar?" (Portada, Servicios, Nosotros, Contacto, Galería, Preguntas; Negocio, Horario, Taller, Mensajes), cada una con un ícono y una línea; al entrar, solo los campos de esa parte.
- **Catálogo:** una tabla con el servicio, sus opciones y el precio por tamaño a la vista; "Editar precios" en un modal.
- **Usuarios:** una tabla con el nombre, el rol en una insignia y su estado.

### Cómo se hace
1. **Prototipo de 3 pantallas** (Inicio, Órdenes y Cotizaciones) con el estilo nuevo, publicado en pruebas, para que el dueño lo vea y lo apruebe.
2. **Los componentes compartidos** (`Button`, tarjetas, `ListaFilas`, `EncabezadoPagina`, `SeccionConEditar`, modales, insignias, el menú y el diseño del panel): al cambiarlos, cambia casi todo el panel de una vez.
3. **Una pasada por pantalla** para lo que el cambio general no cubra (Sitio web y Configuración en tarjetas, Catálogo y Usuarios en tablas, el Inicio con números).

### Lo que cambia en las reglas
- `CLAUDE.md` e `06-diseno/identidad-visual.md`: "panel en claro con los titulares en `font-heading italic`" pasa a "el panel es administrativo estándar; la identidad visual es del sitio y del ingreso". Se anota como decisión del dueño.
- `pulido-visual.md` y la skill `pantallas-panel`: los estándares del panel se actualizan con la nueva dirección.

### Terminado cuando
El dueño aprueba el prototipo y, con todo el panel cambiado, encuentra cada cosa sin ayuda en la capacitación.

---

## 6. Órdenes y Agenda: historial y completadas (pedido 28)

### Lo que dijo el dueño
> Agenda le gustó, pero nota algo de redundancia con Órdenes. Quiere que **se queden marcadas las completadas**, en el calendario y en Órdenes. En Órdenes, sobre todo, **no puede buscar una orden pasada**.

### Propuesta
- **Roles claros:** Agenda = **planificar** (qué entra y cuándo); Órdenes = **el trabajo** (lo que está en el taller y el historial). Cada pantalla enlaza a la otra donde corresponde.
- **Órdenes:**
  - arriba, lo que está en el taller (Recibidas, En proceso, Listas), como hoy;
  - una pestaña **"Entregadas"** con **búsqueda** por placa, cliente o fecha y paginación, de la más reciente a la más vieja;
  - cada entregada con su insignia verde "Entregada" y la fecha.
- **Agenda:** las entregadas **siguen en el calendario** con su cinta en verde y "Entregada" (hoy desaparecen); las canceladas, en gris y tachadas, si el dueño las quiere ver.

### Terminado cuando
El dueño busca "5678" en Órdenes → Entregadas y abre la orden de hace dos meses; en la agenda ve qué días se entregó cada auto.

---

## 7. Saldos pendientes: ordenar y buscar (pedido 30)

> "Le gustó, pero le falta orden, buscar."

- Búsqueda por cliente, teléfono o placa.
- Ordenar por **más antigua** (hoy), **mayor monto** o **cliente**.
- El total por cobrar sigue arriba.

---

## 8. Vehículos sin placa (pedido 29)

### Lo que dijo el dueño
> La placa es el identificador principal del vehículo, pero a veces le llegan autos **sin placa**, por ejemplo uno recién importado.

### Propuesta
- La placa pasa a ser **opcional**. Sin placa, el vehículo se nombra "**Sin placa**: Toyota RAV4 2024 blanco" (marca, modelo, año y color pasan a ser obligatorios en ese caso, para distinguirlo).
- Campo opcional **"Número de chasis (VIN)"**, útil para los importados.
- Cuando llega la placa, se edita en la ficha y todo pasa a mostrarla.
- Una sola función para nombrar un vehículo (`nombreVehiculo`), usada en listas, títulos, agenda, órdenes, PDF y mensajes de WhatsApp.

### Datos
`vehiculo.placa` nula; el índice único de la placa solo cuando hay placa; `vehiculo.vin` opcional y único cuando existe.

### Preguntas para el dueño
¿Usaría el número de chasis, o alcanza con marca, modelo, año y color?

---

## 9. Mantenimientos "no tan automatizados" (pedido 22)

> "Le pareció ok, pero no lo vio tan automatizado."

- **Lo que ya es automático** (pedido 21): el plan se crea al entregar, con el mantenimiento y la frecuencia del catálogo, y se repite solo al entregar cada mantenimiento.
- **Lo que imagina el dueño:** que **el aviso salga solo** por WhatsApp. Eso necesita la **API oficial de WhatsApp de Meta** (pedido 22): un número dedicado, verificación del negocio, plantillas aprobadas y costo por mensaje.
- **Qué hacer:** explicárselo en la próxima reunión y, si quiere, cotizar el pedido 22. Mientras tanto, el inicio (con el rediseño) muestra "Mantenimientos por avisar" bien a la vista.

---

## 10. Reclamos

> "Sin más; tampoco piensa que se usará mucho." Sin cambios.

---

## Preguntas para la próxima reunión con el dueño

1. ¿El encargado puede cotizar (24)? ¿Editar la cotización en vez de versiones (25)?
2. ¿Qué partes van en el checklist? ¿Los tipos de detalle le sirven?
3. ¿La firma es al entregar, al recibir o en las dos? ¿Quiere la constancia en PDF? ¿Se puede entregar sin firma?
4. ¿Usaría el número de chasis para los autos sin placa?
5. ¿Quiere cotizar los avisos automáticos por WhatsApp (22)?
6. (Al mostrar el prototipo) ¿El estilo nuevo es lo que buscaba?

## Ramas previstas

| Punto | Rama |
|---|---|
| 1 | `pedido-23-cotizacion-directa` |
| 2 | `pedido-12-checklist-recepcion` |
| 3 | `pedido-13-firma-cliente` |
| 4 | `pedido-27-fotos-justas` |
| 5 | `pedido-26-rediseno-panel` (primero el prototipo) |
| 6 | `pedido-28-ordenes-historial` |
| 7 | `pedido-30-saldos-buscar` |
| 8 | `pedido-29-vehiculos-sin-placa` |
