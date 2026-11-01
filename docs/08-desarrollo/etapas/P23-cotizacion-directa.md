# P23 Cotización directa, sin consulta: especificación

- **Fase y semana:** C. Entrega 2 · desde el 1 de noviembre de 2026, primero de los ajustes de la reunión con el dueño (`../ajustes-reunion-dueno.md`, punto 1)
- **Estado:** aprobada (01/11/2026) y en curso en la rama `pedido-23-cotizacion-directa`
- **Pedidos:** 23 y 24 de `03-cierre-comercial/registro-de-cambios.md`. El 25 (editar en lugar de versiones) queda descartado: el dueño prefiere las versiones.
- **Historias que cambian:** HU-24 (consultas, desaparece), HU-25 (cotizar), HU-28 (seguimiento), HU-23 (ficha del cliente), HU-30 (agendar desde la cotización), HU-02 (permisos del encargado)
- **Base:**
  - Requisitos: RF-29 a RF-35; RN-01 (cambia), RN-02, RN-03, RN-12; RNF-05, RNF-10.
  - Lo que dejó C2 (`C2-consultas-cotizaciones.md`): `consulta`, `cotizacion` con versiones, el PDF y compartirlo.
  - Decisiones del dueño del 01/11: el encargado puede cotizar; se mantienen las versiones; los motivos de rechazo actuales (precio, no respondió, otro) le sirven.

## 1. Objetivo
Que el dueño o el encargado registren una **cotización en una sola pantalla**: el cliente (nuevo o ya registrado), su vehículo, los servicios con sus precios y si se cotizó **en persona o por fotos**. Sin una consulta antes, sin canal, sin fotos ni videos. La cotización queda **pendiente** hasta que se **acepta** (al agendarla) o se **rechaza** con su motivo.

## 2. Alcance
- **Incluye:**
  - El menú "Consultas" pasa a ser **"Cotizaciones"** (`/panel/cotizaciones`), con pestañas **Pendientes**, **Aceptadas** y **Rechazadas** y búsqueda.
  - **Nueva cotización**: elegir o registrar al cliente, y en una sola pantalla el vehículo, los servicios, "¿Cómo se cotizó?", descuento, adelanto y validez. Se crea con su PDF.
  - **Ficha de la cotización**: número, estado, cliente y vehículo; "Agendar" como paso siguiente; las versiones con su PDF (ver, compartir y descargar); "Nueva versión", "Rechazar" y "Volver a pendiente" en "Más".
  - **El encargado cotiza** (pedido 24): con el permiso "Cotizaciones" crea cotizaciones, hace versiones y ve sus montos y su PDF.
  - Las direcciones viejas (`/panel/consultas…`) llevan a las nuevas.
  - La ficha del cliente muestra sus cotizaciones y "Nueva cotización"; la reserva enlaza a "Ver la cotización".
- **No incluye** (y dónde queda):
  - Borrar las tablas que dejan de usarse (`consulta_archivo`, `subida_pendiente`, `cotizacion_foto`) y las columnas `consulta.canal` y `consulta.nota`: en una migración posterior, cuando esto esté probado en pruebas.
  - Que el encargado sume adicionales a una orden (RF-43): sigue siendo del dueño; se pregunta en la próxima revisión.
  - Fotos de la orden (detalles, inicio y final): pedido 27.
  - La apariencia nueva del panel: pedido 26. Esta etapa usa los componentes de hoy.

## 3. Reglas que se cumplen

| Regla | Qué dice | Cómo se garantiza |
|---|---|---|
| RN-01 (cambia) | Antes: solo el dueño cotiza. Ahora: **cotiza el dueño o el encargado con el permiso "Cotizaciones"** | `puede(sujeto, "cotizar")` en `src/lib/permisos.ts`, que exigen las páginas, las acciones y la ruta del PDF |
| RN-02 | Una cotización enviada no cambia su precio ni su PDF; un cambio crea una versión | Sin cambios: "Nueva versión" reemplaza la vigente y crea otra con el mismo número |
| RN-03 | Lo cotizado por fotos es un estimado y el PDF lo dice | "¿Cómo se cotizó?" es obligatorio (En persona / Por fotos) y llena `cotizacion.es_estimado` |
| RN-12 | El técnico no ve precios ni teléfonos | El módulo Cotizaciones no es del técnico (`MODULOS.cotizaciones.tecnico = false`) |
| RNF-05 | Permisos en el servidor | Cada página y acción verifica la sesión y el permiso, no el menú |
| RNF-10 | Auditoría de cotizaciones | `crearCotizacion` y `guardarCotizacion` dejan su fila en `auditoria` |
| RNF-11 | Nada fijo en el código | Validez, adelanto, condiciones y los días "sin respuesta" siguen en Configuración |

## 4. Datos

**Decisión (D-12):** como se mantienen las versiones, la cotización necesita un **encabezado** que agrupe sus versiones y lleve el estado comercial (pendiente, aceptada, rechazada) y el seguimiento. Ese encabezado ya existe: es la tabla `consulta`. Se conserva con su nombre en la base y en el código (renombrarla toca la agenda, las órdenes y la auditoría sin ganar nada para el dueño); en la interfaz se llama "Cotización". Así no hay que mover datos entre tablas y las reservas siguen apuntando a `consulta_id` y `cotizacion_id` como hoy.

| Estado en la base (`consulta.estado`) | En la interfaz | Cuándo |
|---|---|---|
| `cotizado` | Pendiente | Al crearla y al volver a pendiente |
| `confirmado` | Aceptada | Al agendarla (sin cambios) |
| `perdido` | Rechazada | Con "Rechazar" (motivo: precio, no respondió u otro) o al cancelar su reserva (sin cambios) |
| `consulto` | No se muestra | Ya no se crea; las consultas viejas sin cotizar quedan en la base y no aparecen en ninguna lista |

**Migración `0038_cotizacion_directa`**:
- `consulta.canal` pasa a aceptar nulo (las cotizaciones nuevas no lo llevan). La restricción `consulta_canal_valido` sigue igual: un nulo la cumple.
- Permiso del encargado `consultas` → `cotizaciones`: se quita la restricción `usuario_permiso_valido`, se actualizan las filas y se vuelve a crear con la lista nueva.
- Parámetro `dias_consulta_fria` → `dias_cotizacion_sin_respuesta`: se renombra la fila de `parametro` (mismo valor).
- No se borra nada.

**Listas:** solo los encabezados con al menos una versión (`exists` en `cotizacion`), así las consultas viejas sin cotizar no aparecen.

## 5. Pantallas y rutas

Todas: dueño o encargado con "Cotizaciones" (`exigirModulo("cotizaciones")`); crear y hacer versiones exigen además `exigirAccion("cotizar")`, que hoy es lo mismo pero queda separado. El técnico no entra (404 del panel por permiso, como hoy).

| Ruta | Qué es | Tipo (`pantallas-panel`) |
|---|---|---|
| `/panel/cotizaciones` | Lista con pestañas Pendientes (N), Aceptadas (N), Rechazadas (N) y buscador (cliente, teléfono, placa o número). Cada fila: cliente, número y total, placa y "hace N días"; la pendiente que pasa los días de Configuración lleva el aviso "Sin respuesta hace N días". Acción principal: "Nueva cotización" | Lista |
| `/panel/cotizaciones/nueva` | Paso 1: elegir el cliente con el buscador de Clientes, o "Cliente nuevo". Paso 2: un formulario con el cliente (o sus datos si es nuevo), el vehículo (uno suyo u "Otro vehículo"), los servicios, "¿Cómo se cotizó?", descuento, adelanto y validez. Botón "Crear cotización" fijo abajo en el celular | Crear |
| `/panel/cotizaciones/[id]` | Ficha. Encabezado: "Cotización 2026-0007", estado, y el paso siguiente: "Agendar" si está pendiente. "Más": "Nueva versión" y "Rechazar" (pendiente) o "Volver a pendiente" (rechazada). Secciones: Cliente y vehículo (con enlace a la ficha del cliente), Versiones (la vigente arriba, con total, validez, "Por fotos" si aplica y su PDF: ver, compartir, descargar), Reservas que salieron de ella, y el motivo si está rechazada | Ficha |
| `/panel/cotizaciones/[id]/nueva-version?desde=V` | El formulario de cotizar con los valores de la versión V (sin cliente ni vehículo: no cambian). "Guardar nueva versión" | Flujo de un paso |
| `/panel/cotizaciones/[id]/pdf/[version]` | El PDF de la versión (`?descargar=1`, `?para=compartir`), comprobando que sea de esa cotización. Reemplaza a `/panel/cotizaciones/[version]/pdf` | Ruta |

**Redirecciones** (`next.config.ts`, permanentes): `/panel/consultas` → `/panel/cotizaciones`; `/panel/consultas/nueva` → `/panel/cotizaciones/nueva`; `/panel/consultas/:id` y `/panel/consultas/:id/cotizar` → `/panel/cotizaciones/:id` (el id es el mismo).

**Otras pantallas:**
- Ficha del cliente: la sección "Cotizaciones" (la lista de arriba, sin el cliente) con "Nueva cotización" (`?cliente=`).
- Reserva: "Ver la cotización" en lugar de "Ver la consulta"; la nueva reserva desde una cotización vuelve con "Volver a la cotización".
- Inicio: la descripción del módulo ("Armar y enviar cotizaciones; aceptarlas al agendar.").
- Usuarios: la casilla del encargado dice "Cotizaciones (cotizar y ver precios)".
- Configuración, Parámetros: "Cotización sin respuesta" en la sección de cotizaciones.

**Lo que se va:** las pantallas de la consulta (`/panel/consultas/*`), el canal, la nota, las fotos y los videos de la consulta, las fotos del PDF de la cotización y el código de subida directa de videos.

## 6. Acciones del servidor

| Acción | Quién | Entrada | Qué hace |
|---|---|---|---|
| `crearCotizacion` (nueva) | `exigirAccion("cotizar")` | FormData: `clienteId` o `nuevo` (nombre, teléfono); `vehiculoId` o `otro` (placa, tamaño, marca, modelo, año, color); las líneas, descuento, adelanto, validez y `porFotos` (`esquemaCotizacion` + los de cliente y vehículo) | Valida todo antes de escribir. En una transacción: el cliente si es nuevo (teléfono único), el vehículo si es nuevo (placa única), el encabezado en `cotizado`, el número del año y la versión 1 con sus líneas y la copia de los datos del documento (D-4), y la auditoría. Fuera de la transacción, el PDF. Lleva a la ficha con "Cotización creada." |
| `guardarCotizacion` (cambia) | `exigirAccion("cotizar")` | Igual que hoy, sin fotos | Solo "Nueva versión" (`desde` obligatorio): reemplaza la vigente de un encabezado pendiente. Lleva a la ficha con "Nueva versión guardada." |
| `rechazarCotizacion` / `volverAPendiente` (de `cambiarEstadoConsulta`) | `exigirModulo("cotizaciones")` | `id`, `motivo`, `detalle` (Zod) | Como hoy perder y reabrir; al reabrir vuelve siempre a `cotizado` |
| `generarPdfPendiente` | `exigirAccion("cotizar")` | `id` de la versión | Sin cambios |

La lógica de cliente y vehículo (repetidos, mensajes, restricciones únicas) sale de `crearConsulta` a funciones compartidas; la de la versión (precios vigentes, número, líneas, documento) sale de `guardarCotizacion`, para que las dos acciones usen la misma.

## 7. Componentes y diseño
- Se reutilizan `EncabezadoPagina`, `Pestanas`, `ListaFilas`, `EstadoVacio`, `ElegirCliente`, `CamposCliente`, `CamposVehiculo`, `LineasServicio`, `PieFormulario`, `MenuMas`, `ModalFormulario`, `CompartirPdf` y `GenerarPdf`.
- "¿Cómo se cotizó?" es un grupo de dos opciones grandes (como el vehículo), sin ninguna elegida al crear: obliga a decidirlo. En una versión nueva viene la de la versión anterior.
- El buscador de la lista es el de Clientes (un campo y "Buscar", por GET).

## 8. Textos de la interfaz
- Menú y título: "Cotizaciones". Pestañas: "Pendientes (N)", "Aceptadas (N)", "Rechazadas (N)".
- Vacíos: "No hay cotizaciones pendientes." / "No hay cotizaciones aceptadas." / "No hay cotizaciones rechazadas." / "Ninguna cotización coincide con «texto»."
- Botones: "Nueva cotización", "Crear cotización", "Agendar", "Nueva versión", "Guardar nueva versión", "Rechazar", "Sí, rechazar", "Volver a pendiente".
- "¿Cómo se cotizó?": "En persona" / "Por fotos (precio estimado: se confirma al ver el vehículo)". Error: "Elige cómo se cotizó."
- Avisos: "Cotización creada.", "Nueva versión guardada.", "Cotización rechazada.", "La cotización volvió a pendiente."
- En la lista: "Sin respuesta hace N días" (insignia de aviso).

## 9. Pruebas
- **Unitarias** (`tests/unit/`):
  - permisos: el encargado con "Cotizaciones" puede cotizar; sin él, no; el técnico nunca; sumar adicionales sigue siendo solo del dueño.
  - el esquema de la cotización nueva: cliente nuevo o elegido, vehículo nuevo o elegido, "¿Cómo se cotizó?" obligatorio.
  - el estado al volver a pendiente y el aviso "sin respuesta".
- **E2E** (`tests/e2e/`, reemplazan las de HU-24 a HU-28):
  - crear una cotización con un cliente nuevo y su vehículo, en una pantalla, y ver su PDF;
  - con un cliente registrado, desde su ficha;
  - por fotos: el PDF dice que es un estimado;
  - nueva versión: la anterior queda reemplazada y el número se mantiene;
  - rechazar con motivo y volver a pendiente;
  - buscar en la lista por placa y por número;
  - agendar desde la ficha: pasa a Aceptadas;
  - el encargado con "Cotizaciones" cotiza; sin él no entra; el técnico no entra;
  - las direcciones viejas llevan a las nuevas;
  - compartir el PDF (HU-27) y `flujo-taller-completo` siguen pasando.

## 10. Orden de trabajo
Rama `pedido-23-cotizacion-directa`, un PR con commits chicos: especificación y registro → migración y permisos → acciones → pantallas nuevas → quitar las de la consulta y redirecciones → otras pantallas → pruebas → documentos.

## 11. Criterio de salida
- El dueño y el encargado crean una cotización para un cliente nuevo en una pantalla, la comparten por WhatsApp y la agendan o la rechazan, sin pasar por ninguna consulta.
- La suite completa (unitarias y E2E), lint, tipos, knip y build en verde; `code-review` y `security-review` sin hallazgos abiertos.
- Documentos al día: RN-01, HU-24 y HU-25, el modelo de datos (D-12), `CLAUDE.md`, el registro de cambios y el plan de ajustes.

## 12. Decisiones abiertas
- ¿El encargado también suma adicionales a una orden? Hoy no; se pregunta al dueño en la próxima revisión.
- Tratamiento del pedido (incluido o cotizado): lo decide YankoSoft con el dueño; se programa igual porque es lo más urgente para él.
