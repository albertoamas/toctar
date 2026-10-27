# P21 Planes de mantenimiento por vehículo: especificación

- **Fase y semana:** C. Entrega 2 · 27 de octubre de 2026, antes del grupo 13 del pulido y del cierre (C5)
- **Estado:** aprobada (27/10/2026) y programada en la rama `pedido-21-planes-mantenimiento`
- **Pedido:** 21 de `03-cierre-comercial/registro-de-cambios.md` (absorbe el pedido 17 y el error del mantenimiento repetido)
- **Historias que cambian:** HU-19 (catálogo), HU-36 (entregar), HU-38 (mantenimientos), HU-05 (parámetros), HU-23 (ficha del cliente)
- **Base:**
  - Requisitos: RF-49, RF-50; RN-08 (cambia), RN-09; RNF-11 (todo configurable).
  - Lo que dejó C4 (`C4-taller-entrega.md` §4 a §6): `recordatorio_mantenimiento`, `entregarVehiculo`, la lista de Mantenimientos y "Agendar" con `?recordatorio=`.
  - Lo que dejó el pedido 20: las pestañas Por avisar, Más adelante y Cerrados.
  - Encuesta del dueño, preguntas 7 y 8 (`01-descubrimiento/encuesta.md`).

## 1. Objetivo
Que cada vehículo tenga sus **planes de mantenimiento**: qué mantenimiento le toca, cada cuánto y cuándo es el próximo. Se crean solos al entregar, con los valores que el dueño pone en el catálogo, se repiten solos al entregar cada mantenimiento y se ajustan a mano en la ficha del cliente (otra frecuencia, otra fecha, un servicio hecho antes del sistema, terminar el plan).

## 2. Alcance
- **Incluye:**
  - En el catálogo, por servicio: "Al entregarlo, programa su mantenimiento: **[servicio de mantenimiento]** cada **[N]** meses" (el mismo servicio u otro).
  - Fuera el intervalo único de Configuración ("Aviso de mantenimiento"): cada servicio tiene el suyo.
  - Al entregar, el mantenimiento que se hizo queda **hecho** y se programa el siguiente; si el cliente vino por su cuenta (sin agendar desde Mantenimientos), igual. Nunca dos abiertos del mismo vehículo y servicio.
  - "Agendar" desde Mantenimientos trae la línea del servicio de mantenimiento (y su opción si tiene una sola).
  - En la ficha del cliente: **"Agregar mantenimiento"** (un servicio hecho antes del sistema, pedido 17), **"Editar"** un plan (cada cuántos meses y la próxima fecha) y **"No le interesa"** (termina el plan).
- **No incluye** (y dónde queda):
  - Los días de "Próximos" configurables: pedido 19.
  - Cerrar solo los planes de quien no responde: se termina con "No le interesa" (decisión del 27/10).
  - Aviso automático por WhatsApp (API de Meta): pedido 22. Este modelo no lo impide: el aviso sigue registrando quién y cuándo.
  - Carga desde una planilla: queda como opción del pedido 17 (+3 h), si son muchos clientes.

## 3. Reglas que se cumplen

| Regla | Qué dice | Cómo se garantiza |
|---|---|---|
| RN-08 (cambia) | Antes: un intervalo para todo el negocio, desde la entrega. Ahora: **cada servicio dice cuál es su mantenimiento y cada cuántos meses**; cada vehículo puede tener su propia frecuencia | Catálogo (`servicio.mantenimiento_servicio_id`, `servicio.mantenimiento_meses`); el plan copia la frecuencia al crearse y se edita en la ficha |
| RN-09 | El mantenimiento es un servicio cobrado del catálogo | Sin cambios: el servicio de mantenimiento se cotiza y se cobra como cualquier otro |
| Un plan abierto por vehículo y servicio | El mantenimiento repetido ya no puede pasar | Índice único parcial en la base (§4) y la regla `planesAlEntregar` (§6) |
| RNF-11 | Nada fijo en el código | La frecuencia y el servicio de mantenimiento salen del catálogo y del plan |
| RN-12 | El técnico no ve teléfonos ni montos | Sin cambios: Mantenimientos y la ficha del cliente no son del técnico |

**Glosario:**
- **Servicio base:** el que se hizo y origina el plan (por ejemplo, "Pulido y nano cerámico").
- **Servicio de mantenimiento:** el que se agenda y se cobra (por ejemplo, "Mantenimiento del nano cerámico"). Puede ser el mismo servicio base ("Pulido de vidrios" cada 6 meses).
- **Plan:** la fila abierta de `recordatorio_mantenimiento` de un vehículo y un servicio base. Al hacerse, queda "hecho" y nace la siguiente: la historia del plan son sus filas.

## 4. Datos
Migración `0036_planes_mantenimiento` (esquema) y sus datos en la misma migración.

### `servicio`: columnas nuevas (y una que se va)

| Columna | Tipo | Nulo | Restricciones |
|---|---|---|---|
| `mantenimiento_servicio_id` | `integer` | sí | FK `servicio`. El servicio que se agenda como su mantenimiento; puede ser él mismo |
| `mantenimiento_meses` | `integer` | sí | Entre 1 y 24. Check: los dos nulos o los dos con valor (`servicio_mantenimiento_completo`) |
| ~~`genera_mantenimiento`~~ | | | Se borra después de copiar los datos |

**Datos:** cada servicio con `genera_mantenimiento` pasa a `mantenimiento_meses` = el parámetro `intervalo_mantenimiento_meses` (3) y `mantenimiento_servicio_id` = "Mantenimiento del nano cerámico" si es "Pulido y nano cerámico" (los dos por su `slug`, de `0016_datos_catalogo`) y si no, él mismo. Después se borra el parámetro `intervalo_mantenimiento_meses`.

### `recordatorio_mantenimiento`: cambios

| Columna | Cambio | Para qué |
|---|---|---|
| `trabajo_origen_id` | Pasa a nulo | Un plan cargado a mano (servicio hecho antes del sistema) no viene de una orden |
| `servicio_id` | Sin cambio de tipo: es el **servicio base** | Lo que se hizo; el mensaje dice "el mantenimiento de {servicio}" |
| `servicio_mantenimiento_id` | Nueva, `integer` no nulo, FK `servicio` | Lo que se agenda. Datos: la del catálogo del servicio base o, si no tiene, el mismo |
| `intervalo_meses` | Nueva, `integer` no nulo, entre 1 y 24 | La frecuencia de este plan. Datos: 3 (el parámetro de hoy) |
| `trabajo_hecho_id` | Nueva, `integer` nulo, FK `trabajo` | La orden que lo hizo |
| `estado` | Suma `hecho` | Check: `hecho` si y solo si `trabajo_hecho_id` tiene valor (`recordatorio_hecho_con_trabajo`) |
| Índice `recordatorio_un_plan_abierto` | Nuevo, único y parcial: `(vehiculo_id, servicio_id)` donde `estado in ('pendiente', 'avisado', 'agendado')` | Nunca dos abiertos del mismo vehículo y servicio. Antes de crearlo, los abiertos repetidos que ya existan dejan solo el más reciente (los otros pasan a `no_interesado` con la nota "Repetido: se dejó el más reciente.") |

Se conservan `recordatorio_unico_por_servicio` (`trabajo_origen_id`, `servicio_id`: entregar dos veces no duplica; con origen nulo no aplica) y los índices de estado y cliente. Decisión nueva del modelo, **D-11:** el plan de mantenimiento es la fila abierta de `recordatorio_mantenimiento`; no hay una tabla aparte (la historia son sus filas hechas).

## 5. Pantallas y rutas

### `/panel/catalogo/[id]`: Servicio del catálogo (solo el dueño)
- **Datos, en lectura:** "Mantenimiento: Mantenimiento del nano cerámico, cada 3 meses" o "No programa mantenimiento". Si es él mismo: "Él mismo, cada 6 meses".
- **Editar datos (modal):** en lugar de la casilla, "Programa un mantenimiento al entregarlo" (casilla) y, marcada:
  - "Servicio de mantenimiento": menú con los servicios activos del catálogo, este primero como "Este mismo servicio".
  - "Cada" [N] "meses", de 1 a 24.
- **Lista del catálogo:** "Con mantenimiento" en los detalles, como hoy.

### `/panel/configuracion/parametros`
- Se va "Aviso de mantenimiento" y, con él, la sección "Mantenimiento" (queda vacía).

### `/panel/ordenes/[id]/entregar`
- La línea que anticipa: "Se programará: Mantenimiento del nano cerámico, el 27/01/2027." Una por plan nuevo, con la misma regla que la acción (§6). Si cierra uno: "Queda hecho el mantenimiento de Pulido y nano cerámico." (en la misma línea).

### `/panel/mantenimientos`
- Sin cambios de forma. La fila dice "Mantenimiento de {servicio base}" como hoy y suma "cada 3 meses".
- "Cerrados" suma los **hechos** ("Hecho", con "Ver la orden" que lo hizo).

### `/panel/agenda/nueva?…&recordatorio=`
- La línea 1 llega elegida con el **servicio de mantenimiento**; si tiene una sola opción, también la opción y su precio sugerido. Se puede cambiar o sumar otras.

### `/panel/clientes/[id]`: ficha del cliente, sección "Mantenimientos" (con el módulo Mantenimientos)
- **Cabecera:** "Agregar" (sin fondo, como en Vehículos; "Agregar mantenimiento" para el lector de pantalla), si el cliente tiene vehículos activos y algún servicio programa mantenimiento.
- **Cada plan abierto** (pendiente o avisado): servicio base, vehículo, "cada N meses", la próxima fecha y su estado; acciones en un menú "Más": "Editar" y "No le interesa". Agendado: "Ver la reserva" y sin acciones (se edita al cancelar la reserva).
- **La historia** (hechos, "No le interesa"), como hoy, debajo.
- **Agregar mantenimiento (modal):** "Vehículo" (si tiene más de uno), "Servicio que se hizo" (los que programan mantenimiento), "Cuándo se hizo" (fecha, hasta hoy), "Cada" [N] "meses" (llega el del catálogo) y la línea "Próximo mantenimiento: 15/10/2026" que se calcula a la vista. Botón "Agregar mantenimiento".
- **Editar (modal):** "Cada" [N] "meses" y "Próximo mantenimiento" (fecha). Botón "Guardar plan".
- Vacío: "No tiene mantenimientos programados." como hoy.

## 6. Acciones del servidor

| Acción | Permiso | Qué hace | Mensajes |
|---|---|---|---|
| `guardarDatosCatalogo` (cambia) | `catalogo` (dueño) | Guarda `mantenimiento_servicio_id` y `mantenimiento_meses` (los dos o ninguno); el servicio de mantenimiento debe existir | "Elige el servicio de mantenimiento." · "Escribe los meses, de 1 a 24." |
| `entregarVehiculo` (cambia) | `ordenes` | En la transacción de la entrega, aplica `planesAlEntregar` (abajo): marca hechos y crea los siguientes. Ya no lee el parámetro | Los de siempre |
| `agregarMantenimiento` (nueva) | `mantenimientos` | Vehículo activo del cliente; servicio con mantenimiento en el catálogo; fecha hasta hoy; meses de 1 a 24. Crea el plan con `fecha_programada` = fecha + meses (puede quedar vencido). Si ya hay uno abierto de ese vehículo y servicio, no lo crea | "Mantenimiento agregado." · "Ese vehículo ya tiene un mantenimiento abierto de ese servicio: edítalo." |
| `editarPlan` (nueva) | `mantenimientos` | Solo abierto sin agendar (pendiente o avisado), de un cliente y vehículo activos. Cambia `intervalo_meses` y `fecha_programada` (desde hoy, hasta 24 meses) | "Plan guardado." · el `YA_NO` de siempre |
| `cerrarMantenimiento` | `mantenimientos` | Sin cambios ("No le interesa") | |

**Regla pura `planesAlEntregar`** (`mantenimientos/reglas.ts`, con prueba unitaria). Entrada: los servicios de la orden con su mantenimiento del catálogo, los planes abiertos del vehículo, la orden y hoy. Salida: los planes que quedan **hechos** y los **nuevos**.
1. Por cada plan abierto del vehículo cuyo **servicio de mantenimiento** está en la orden: queda hecho y nace el siguiente, igual (mismo servicio base, mismo servicio de mantenimiento, **su** frecuencia), para hoy + su frecuencia. Si está agendado con otra reserva, no se toca.
2. Por cada **servicio base** de la orden con mantenimiento en el catálogo: si su plan no se resolvió en el paso 1, el abierto (si hay, sin agendar con otra reserva) queda hecho y nace uno nuevo con la frecuencia del plan que había o, si no había, la del catálogo.
3. Nunca dos nuevos del mismo servicio base.

## 7. Componentes y diseño
- Reutiliza `SeccionConEditar`, `ModalFormulario`, `PieModal`, `MenuMas`, `Campo`, `Selector`, `Input`, `Checkbox`, `CabeceraSeccion` y `ENLACE_TEXTO`.
- Nuevos: `FormularioPlan` (agregar y editar, `mantenimientos/componentes/`) y `MasPlan` (el menú de cada plan en la ficha).

## 8. Textos de la interfaz
- **Catálogo:** "Programa un mantenimiento al entregarlo" · "Servicio de mantenimiento" · "Este mismo servicio" · "Cada" · "meses" · lectura "Mantenimiento del nano cerámico, cada 3 meses" · "Él mismo, cada 6 meses" · "No programa mantenimiento".
- **Entregar:** "Se programará: {servicio}, el {fecha}." · "Queda hecho el mantenimiento de {servicio base}."
- **Ficha:** "Agregar" (para el lector de pantalla, "Agregar mantenimiento": el texto entero no entra a 360 px, como "Agregar" en Vehículos) · "Servicio que se hizo" · "Cuándo se hizo" · "Próximo mantenimiento" · "Guardar plan" · "cada {N} meses" · "Mantenimiento agregado." · "Plan guardado."
- **Mantenimientos:** "cada {N} meses" · "Hecho".

## 9. Pruebas
- **Unitarias** (`tests/unit/mantenimientos.test.ts`): `planesAlEntregar` (el servicio base crea el plan; el mantenimiento lo marca hecho y crea el siguiente con la frecuencia editada; el cliente que vino por su cuenta; agendado con otra reserva no se toca; base y mantenimiento en la misma orden: uno solo); el esquema del catálogo (los dos o ninguno) y los de agregar y editar.
- **E2E:**
  - `hu-19-20-catalogo`: el dueño configura "Mantenimiento del nano cerámico cada 3 meses" en el pulido.
  - `hu-36-entregar`: entregar el pulido crea el plan con la frecuencia del servicio y la línea lo anticipa.
  - `hu-38-mantenimientos`: "Agendar" trae la línea del mantenimiento; entregar el mantenimiento lo deja hecho y crea el siguiente; el cliente que vino por su cuenta (reserva directa) no deja uno repetido; en "Cerrados", "Hecho".
  - `hu-23-ficha-cliente` (o `p21-planes`): agregar un mantenimiento anterior (queda vencido en "Por avisar"), editar la frecuencia y la fecha, y "No le interesa".
  - `hu-05` y la unitaria de parámetros: sin "Aviso de mantenimiento".
  - `flujo-taller-completo`: sigue pasando con la línea elegida sola.

## 10. Orden de trabajo
Rama `pedido-21-planes-mantenimiento` (sale de `pedido-20-mantenimientos-todos` mientras el #106 se une). Commits: migración y esquema → regla y unitarias → catálogo y parámetros → entregar → agendar → ficha → datos de demostración → E2E → documentos. Un PR a `develop`.

## 11. Criterio de salida
- Lint, tipos, unitarias, knip y E2E completa en verde; capturas con pantalla táctil a 360, 390, 768 y 1280 px del catálogo, la ficha y sus modales.
- `code-review` y `security-review` (cambia la base y suma acciones).
- Documentos al día: RN-08 en `requerimientos.md`, D-11 y las tablas en el modelo de datos, C1 y C4 (con una nota a esta especificación) y el registro de cambios.
- **En la demo:** el dueño configura el pulido; se entrega; aparece el plan; se agenda el mantenimiento con su línea elegida; se entrega y se programa el siguiente; en la ficha se carga un cerámico de julio y se le cambia la frecuencia a un auto.

## 12. Decisiones abiertas

| Qué | De quién | Mientras tanto |
|---|---|---|
| Qué servicios programan mantenimiento, con qué servicio y cada cuánto (los vidrios, el grafeno) | Dueño | Queda el pulido y nano cerámico → mantenimiento del nano cerámico cada 3 meses; el dueño carga el resto en el catálogo |
| ¿El servicio de mantenimiento programa a su vez otro? | Resuelto | Sí: el plan se repite solo, con su frecuencia, al entregar cada mantenimiento |
