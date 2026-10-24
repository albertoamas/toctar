# C3 Agenda y pagos — especificación

- **Fase y semana:** C. Entrega 2 · semana 4
- **Estado:** programada (21 de octubre de 2026): HU-29 a HU-32 en `develop` (PR #61 a #64). Falta mostrarle el tablero al dueño y probar el cobro con comprobante en un celular real
- **Historias:** HU-29 Tablero de la agenda · HU-30 Agendar reserva · HU-31 Reprogramar o cancelar · HU-32 Registrar pagos y saldo
- **Base:**
  - Requisitos: RF-36 a RF-39, RF-45, RF-46; RNF-01, RNF-05, RNF-07, RNF-10, RNF-11.
  - Reglas: RN-04 (adelanto sugerido editable; el cliente puede dar más), RN-05 (si cancela, el adelanto no se devuelve), RN-06 (un espacio no tiene dos vehículos el mismo día), RN-11 (el personal registra todo), RN-12 (el técnico no ve precios ni pagos); S-3 (agenda por día y espacio; la hora es solo una nota).
  - Modelo: D-1 (reserva y orden son `trabajo`), D-4 (las líneas copian descripción y precio), D-5 (cruces imposibles en la base), D-6, D-7 (`sucursal_id`), D-9, D-10. Tablas `trabajo`, `trabajo_linea` y `pago`.
  - Casos de uso: CU-13, CU-14, CU-17. Flujo crítico 2 de `05-analisis/diagramas-de-secuencia/flujos-criticos.md`.
  - Decisión del 20/10 (`C1-catalogo-clientes.md` §12): la duración del catálogo es una estimación; solo sugiere la fecha de entrega, que se edita en cada reserva y se le da al cliente como aproximada.

Esta especificación se escribe al empezar la etapa, con lo aprendido en las anteriores. Se programa contra ella; si algo cambia durante la etapa, se corrige aquí primero.

## 1. Objetivo

La agenda reemplaza al cuaderno: el personal ve en un tablero qué espacio del taller está ocupado cada día, agenda una reserva desde una cotización aceptada o directa, sin cruces aunque dos personas reserven a la vez, la reprograma o la cancela, y registra el adelanto y los pagos con el saldo siempre al día.

## 2. Alcance

**Incluye:**
- **Agendar (HU-30), dueño y encargado con "Agenda":**
  - Desde la cotización vigente de una consulta: "Agendar". La cotización pasa a "aceptada" y la consulta a "confirmado". Las líneas de la reserva copian las de la cotización (D-4).
  - Reserva directa, sin cotización (por ejemplo, un mantenimiento): cliente y vehículo (los de C1, con el buscador), servicios del catálogo con el precio vigente del tamaño (editable; "según evaluación" obliga a escribirlo, como al cotizar).
  - Fecha de ingreso; fecha de entrega aproximada, sugerida por la duración del catálogo y editable; el sistema solo ofrece espacios libres en esos días (RN-06) y la base rechaza un cruce aunque el código fallara (D-5).
  - Técnico (opcional), hora aproximada de ingreso como nota (S-3) y nota libre.
  - Adelanto: el sugerido de Configuración, editable (RN-04), con método; o "sin adelanto". Lo registra solo quien tiene "Pagos".
- **Tablero (HU-29), dueño y encargado con "Agenda":** semana de lunes a domingo, una fila por espacio activo y una columna por día; cada reserva es un bloque que ocupa sus días, con placa, servicio y estado; al tocarlo se abre. Semana anterior y siguiente, "Hoy". Los días que el taller no atiende (horario de Configuración) se ven atenuados.
- **Reprogramar o cancelar (HU-31):** nuevas fechas y espacio, con la misma validación; cancelar pide motivo. El adelanto queda como ingreso (RN-05): los pagos no se tocan.
- **Pagos y saldo (HU-32), dueño y encargado con "Pagos":** monto, método (efectivo, QR, transferencia), tipo (adelanto o saldo), fecha y foto opcional del comprobante (bucket privado). El saldo (total − pagos no anulados) se recalcula al instante. Un pago no se borra: se anula con motivo y queda en el historial. Auditoría de cada pago y anulación (RNF-10).
- **En la consulta:** la reserva que salió de ella, con enlace. **En la ficha del cliente:** sus reservas.
- **Módulos construidos:** "Agenda" y "Pagos" (con permiso de encargado). "Pagos" no tiene menú propio en C3: se trabaja desde cada reserva (la lista de saldos es HU-37, en C4).

**No incluye** (y dónde queda):
- **Recibir el vehículo y la orden** (estados recibido, en proceso, listo, entregado; fotos de ingreso; técnico): C4. En C3 una reserva solo está "agendada" o "cancelada".
- **Lista de saldos pendientes** (HU-37) y **entrega con saldo** (RN-13): C4.
- **Avisar al cliente por WhatsApp** de su reserva: se abre el chat con el botón de siempre; las plantillas son HU-40 (deseable).
- **Agenda por hora:** no (S-3).
- **Varias sucursales:** el modelo tiene `sucursal_id` (D-7); la pantalla muestra la principal.

## 3. Reglas que se cumplen

| Regla | Qué dice | Dónde se garantiza |
|---|---|---|
| RN-06, D-5 | Un espacio no tiene dos vehículos el mismo día | Restricción de exclusión `trabajo_sin_cruces` (btree_gist, `daterange(fecha_inicio, fecha_fin, '[]')`) sobre trabajos no cancelados ni entregados. La pantalla solo ofrece espacios libres; la acción vuelve a mirar y, si la base rechaza el cruce (código 23P01), responde "Ese espacio se ocupó recién: elige otro" |
| RF-36, CU-13 | Al confirmar una cotización se crea la reserva | `agendarReserva` con `cotizacionId`: en una transacción, cotización vigente → "aceptada", consulta → "confirmado" (`transicionPermitida`), trabajo con líneas copiadas, pago de adelanto |
| RF-37 | Reserva directa para clientes registrados | `agendarReserva` sin cotización: líneas del catálogo con el precio vigente del tamaño (`precioSugerido` de C2) |
| RF-38, S-3 | Tablero por espacio y día, semanal | `/panel/agenda`; fechas `date` sin hora (D-9); la hora es una nota |
| RF-39, CU-14 | Reprogramar o cancelar con motivo | `reprogramarReserva` (misma validación de cruces) y `cancelarReserva` (motivo obligatorio) |
| RN-04 | Adelanto sugerido editable; el cliente puede dar más | Se completa con el parámetro `adelanto_sugerido`; el monto puede ir de 1 Bs al total |
| RN-05 | Si cancela, el adelanto no se devuelve | Cancelar no toca los pagos; la reserva cancelada sigue mostrando lo pagado |
| RF-45, RF-46 | Pagos con método, tipo, fecha y comprobante; saldo | Tabla `pago`; `calcularSaldo` (función pura) suma los no anulados; un pago no puede pasar el saldo pendiente |
| RNF-10 | Quién y cuándo crea o cambia pagos | `auditoria`: `pago` (`crear`, `anular`) y `trabajo` (`agendar`, `reprogramar`, `cancelar`) |
| RN-12 | El técnico no ve precios ni pagos | Agenda y Pagos no tienen acceso de técnico (sus órdenes llegan en C4) |
| D-6 | Nada se borra | Reserva cancelada con motivo; pago anulado con motivo |

## 4. Datos

Migraciones por historia: `0026_trabajos` (HU-30: `btree_gist`, `trabajo`, `trabajo_linea`, `pago` y la restricción de exclusión) y `0027_cotizacion_reagendable` (HU-31: el índice de una reserva por cotización no cuenta las canceladas, para volver a agendar una cotización si el cliente vuelve). No hay datos iniciales: los espacios (3) y el adelanto sugerido (Bs 200) ya están desde B2.

### `trabajo` (reserva y, desde C4, orden)
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `sucursal_id` | `integer` | no | FK `sucursal` (D-7); la del espacio |
| `cliente_id` | `integer` | no | FK `cliente` |
| `vehiculo_id` | `integer` | no | FK `vehiculo`; del mismo cliente (se valida en la acción) |
| `consulta_id` | `integer` | sí | FK `consulta`, si salió de una |
| `cotizacion_id` | `integer` | sí | FK `cotizacion`; único: una cotización se agenda una vez |
| `espacio_id` | `integer` | no | FK `espacio_taller` |
| `fecha_inicio` | `date` | no | Día de ingreso |
| `fecha_fin` | `date` | no | Entrega aproximada. CHECK `fecha_fin >= fecha_inicio` |
| `hora_ingreso` | `text` | sí | Nota, hasta 40 ("a las 9", "en la tarde") (S-3) |
| `tecnico_id` | `integer` | sí | FK `usuario` con rol técnico (se valida en la acción) |
| `descuento` | `numeric(10,2)` | no | Copiado de la cotización (D-4); 0 en una reserva directa. CHECK `>= 0` |
| `estado` | `text` | no | CHECK `agendado`, `recibido`, `en_proceso`, `listo`, `entregado`, `cancelado`. En C3: `agendado` o `cancelado` |
| `nota` | `text` | sí | Hasta 1000 |
| `motivo_cancelacion` | `text` | sí | Hasta 300. CHECK: obligatorio si `cancelado` |
| `cancelado_at`, `cancelado_por` | `timestamptz`, `integer` | sí | |
| `created_at`, `created_by` | `timestamptz`, `integer` | no | |
| `updated_at` | `timestamptz` | no | |

- Restricción `trabajo_sin_cruces`: `EXCLUDE USING gist (espacio_id WITH =, daterange(fecha_inicio, fecha_fin, '[]') WITH &&) WHERE (estado NOT IN ('cancelado', 'entregado'))`.
- Índices: (`fecha_inicio`, `fecha_fin`) para el tablero; (`cliente_id`); (`consulta_id`).
- C4 agrega las columnas de la orden (recepción, listo, entrega, autorización de saldo).

### `trabajo_linea`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `trabajo_id` | `integer` | no | FK `trabajo` |
| `variante_id` | `integer` | no | FK `variante` |
| `descripcion` | `text` | no | Copiada (D-4) |
| `precio` | `numeric(10,2)` | no | CHECK `> 0`. Copiado de la cotización o del catálogo |
| `es_adicional` | `boolean` | no | Por defecto `false`; los adicionales los suma el dueño en C4 (RF-43) |
| `orden` | `integer` | no | |

Total del trabajo = suma de sus líneas − descuento (el de la cotización: sin él, el saldo de una reserva con descuento quedaría inflado).

### `pago`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `trabajo_id` | `integer` | no | FK `trabajo` |
| `monto` | `numeric(10,2)` | no | CHECK `> 0` |
| `metodo` | `text` | no | CHECK `efectivo`, `qr`, `transferencia` |
| `tipo` | `text` | no | CHECK `adelanto`, `saldo` |
| `fecha` | `date` | no | Día del pago, en Bolivia; no futura |
| `comprobante_archivo_id` | `integer` | sí | FK `archivo`, privado |
| `anulado` | `boolean` | no | Por defecto `false` |
| `motivo_anulacion` | `text` | sí | Hasta 300. CHECK: obligatorio si anulado |
| `anulado_at`, `anulado_por` | `timestamptz`, `integer` | sí | |
| `created_at`, `created_by` | `timestamptz`, `integer` | no | |

Índice (`trabajo_id`). Saldo = total − suma de pagos no anulados.

## 5. Pantallas y rutas

Todas con `exigirModulo` dentro de `<Suspense>`, el estándar del panel y sin desborde a 360 px. Los montos y pagos se muestran solo a quien tiene "Pagos" (además del dueño).

### `/panel/agenda` — Agenda (dueño y encargado con "Agenda")
- Arriba: "Nueva reserva" (enlace con forma de botón, rojo), la semana ("20 al 26 de octubre"), "‹ Semana anterior", "Hoy", "Semana siguiente ›". `?semana=AAAA-MM-DD` (el lunes).
- **Computadora:** grilla con una fila por espacio y siete columnas; cada reserva es un bloque que abarca sus días (recortado a la semana si empieza antes o termina después), con placa, servicio y técnico. Hoy, marcado. Días cerrados, atenuados. Un día libre se toca para agendar ahí (`/panel/agenda/nueva?fecha=…&espacio=…`).
- **Celular:** un día a la vez (con los siete días de la semana como pestañas), una tarjeta por espacio: la reserva que lo ocupa o "Libre" con "Agendar". Así no hace falta desplazarse de lado.
- Vacío: la grilla con todo "Libre".

### `/panel/agenda/nueva` — Nueva reserva
- `?cotizacion=<id>`: llega con el cliente, el vehículo y las líneas de la cotización vigente (solo lectura; para cambiar precios se corrige la cotización). La duración sugerida sale de esos servicios.
- Directa: cliente y vehículo como en la nueva consulta (C2, `ElegirCliente`); servicios con `LineasCotizacion` (el editor de líneas de C2) y el precio vigente del tamaño. Quien no tiene "Pagos" ve los servicios sin precios y no puede elegir "según evaluación" sin precio: la reserva directa con precios la arma quien tiene "Pagos" o el dueño.
- **Fechas:** "Ingresa el" (por defecto, mañana o `?fecha=`) y "Entrega aproximada" (sugerida: ingreso + la mayor duración de los servicios − 1; editable). Al cambiar las fechas, los espacios se vuelven a consultar.
- **Espacio:** solo los libres en esos días, como opciones; si no hay ninguno, "No hay espacio libre en esas fechas: elige otras." `?espacio=` lo deja elegido si está libre.
- **Técnico** (opcional), **hora aproximada** y **nota**.
- **Adelanto** (solo con "Pagos"): monto (sugerido), método, comprobante opcional; o la casilla "Sin adelanto".
- "Agendar". Al guardar, va a la reserva.

### `/panel/agenda/[id]` — Reserva
- Cliente (enlace a su ficha si puede), vehículo, fechas, espacio, técnico, hora, nota, estado; "Escribir por WhatsApp"; la consulta y la cotización de las que salió.
- **Servicios y saldo** (con "Pagos"): líneas, total, pagado y saldo.
- **Pagos** (con "Pagos"): lista con fecha, tipo, método, monto, comprobante (ver en grande) y "Anular" (motivo); los anulados, tachados, con su motivo. "Registrar pago".
- **Reprogramar:** fechas y espacio, con los espacios libres. **Cancelar:** motivo; aviso "El adelanto no se devuelve (Bs 200 quedan como ingreso)".
- Una reserva cancelada se ve con su motivo y sus pagos, sin acciones.

### En otras pantallas
- **Consulta:** en "Cotizaciones", la vigente tiene "Agendar" (con "Agenda"); con reserva, "Reserva del 24/10 en Espacio 2" con enlace.
- **Ficha del cliente:** sección "Reservas" (próximas primero).

## 6. Acciones del servidor

Todas validan con Zod (también las de datos sueltos) y empiezan con `exigirModulo`.

| Acción | Módulo | Qué hace | Mensajes |
|---|---|---|---|
| `espaciosLibres` | `agenda` | Lectura para el formulario: espacios activos sin trabajos activos que se crucen con las fechas | — |
| `agendarReserva` | `agenda` (+ `pagos` para el adelanto) | Valida fechas, espacio activo, técnico, cliente y vehículo, líneas; con cotización: que sea la vigente de una consulta "cotizado". En una transacción: trabajo, líneas, adelanto, cotización "aceptada", consulta "confirmado", auditoría. El cruce lo frena la base | "Reserva agendada para el 24/10 en Espacio 2." · "Ese espacio se ocupó recién: elige otro." · "Esa cotización ya fue agendada." |
| `reprogramarReserva` | `agenda` | Nuevas fechas y espacio de una reserva agendada; misma validación | "Reserva movida al 28/10 en Espacio 1." |
| `cancelarReserva` | `agenda` | Motivo obligatorio; estado "cancelado"; los pagos quedan. Si vino de una consulta "confirmado": la consulta pasa a "perdido" y la cotización vuelve a "enviada", las dos juntas | "Reserva cancelada. El adelanto queda como ingreso." (sin pagos: "Reserva cancelada.") |
| `registrarPago` | `pagos` | Monto (> 0 y ≤ saldo), método, tipo, fecha (≤ hoy), comprobante opcional (foto privada); auditoría | "Pago de 300 Bs registrado. Saldo: 1550 Bs." · "El pago no puede ser mayor que el saldo (1550 Bs)." · "Esa reserva ya está pagada." |
| `anularPago` | `pagos` | Motivo obligatorio; no se borra; auditoría | "Pago anulado." |

**Consultas** (`src/modulos/agenda/consultas.ts`, `src/modulos/pagos/consultas.ts`): `semanaDeAgenda(lunes)`, `obtenerReserva(id)`, `reservasDelCliente(id)`, `reservaDeConsulta(id)`, `pagosDeTrabajo(id)`.

**Funciones puras** (con prueba unitaria): `lunesDeLaSemana(fecha)`, `diasDeLaSemana(lunes)`, `fechaEntregaSugerida(ingreso, duraciones)`, `seCruzan(a, b)`, `bloquesDeLaSemana(trabajos, lunes)` (recorte a la semana y columnas que ocupa), `calcularSaldo(total, pagos)`.

## 7. Componentes y diseño

- Reutiliza: `ElegirCliente` y `LineasCotizacion` (C2), `CampoMonto`, `Selector`, `RadioGroup` (con el valor en un campo oculto propio: lección de C2), `Checkbox`, `Dialog`, `Pestanas`, `EstadoVacio`, `AvisoEnPagina`, `achicarFoto` y la vista de fotos de las consultas.
- Nuevos: `TableroSemana` (grilla de computadora), `AgendaDelDia` (celular), `FormularioReserva`, `PagosReserva`, `RegistrarPago`.
- **Tablero:** se diseña con `frontend-design`. Bloques con el color de su estado, sin depender solo del color (texto del estado); el bloque de hoy y los días cerrados se distinguen también con texto para lectores de pantalla. Se muestra temprano al dueño (es la interfaz que más cuesta ajustar).

## 8. Textos de la interfaz

- Menú: "Agenda". En la consulta: "Agendar". En la ficha del cliente: "Reservas".
- Tablero: "Nueva reserva" · "Hoy" · "Semana anterior" · "Semana siguiente" · "Libre" · "Agendar" · "Cerrado".
- Nueva reserva: "Ingresa el" · "Entrega aproximada" (ayuda: "Sugerida por la duración de los servicios. Se le da al cliente como aproximada.") · "Espacio" · "Técnico" (opción "Sin asignar") · "Hora aproximada" · "Nota" · "Adelanto" · "Método": "Efectivo" / "QR" / "Transferencia" · "Sin adelanto" · "Comprobante (opcional)" · "Agendar".
- Reserva: "Reprogramar" · "Cancelar reserva" · "Motivo" · "El adelanto no se devuelve." · "Servicios" · "Total" · "Pagado" · "Saldo" · "Registrar pago" · "Adelanto" / "Saldo" · "Anular" · "Anulado: <motivo>".
- Errores: "Elige el espacio." · "La entrega no puede ser antes del ingreso." · "No hay espacio libre en esas fechas: elige otras." · "Ese espacio se ocupó recién: elige otro." · "Escribe el motivo." · "El pago no puede ser mayor que el saldo (X Bs)." · "La fecha del pago no puede ser futura." · "Ese técnico ya no está activo.".

## 9. Pruebas

- **Unitarias** (`tests/unit/`):
  - `lunesDeLaSemana` y `diasDeLaSemana` en hora de Bolivia (un domingo a las 23:00 en La Paz es de esa semana).
  - `fechaEntregaSugerida`: un servicio de 1 día entra y sale el mismo día; uno de 2, al día siguiente; con varios, la mayor duración.
  - `seCruzan`: bordes inclusivos (termina el 24 y otro empieza el 24: se cruzan).
  - `bloquesDeLaSemana`: recorte de un trabajo que empieza la semana anterior o termina la siguiente.
  - `calcularSaldo`: sin pagos, con pagos, con anulados, en centavos.
  - Esquemas de reserva y de pago.
- **Contra la base** (E2E con consulta directa): insertar dos trabajos activos que se cruzan en el mismo espacio falla con la restricción; si uno está cancelado, no.
- **De punta a punta** (`tests/e2e/`):
  - `hu-30-agendar` (flujo crítico 2): desde una cotización (cotización "aceptada", consulta "confirmado", líneas copiadas, adelanto registrado) y directa; solo se ofrecen espacios libres; **dos personas reservan el mismo espacio a la vez**: una lo logra y la otra recibe "Ese espacio se ocupó recién".
  - `hu-29-tablero`: los bloques en sus días y espacios, un trabajo de varios días, cambiar de semana, tocar un día libre para agendar; en el celular, la vista por día.
  - `hu-31-reprogramar-cancelar`: mover a un espacio libre; no se ofrece uno ocupado; cancelar con motivo libera el espacio y deja el adelanto.
  - `hu-32-pagos`: registrar un saldo, el saldo se recalcula, no pasa el saldo, anular con motivo; comprobante privado.
  - Permisos: el encargado con "Agenda" sin "Pagos" agenda pero no ve montos ni registra pagos; el técnico recibe "sin acceso".
  - A 360 px, ninguna pantalla nueva se sale.

## 10. Orden de trabajo

Una rama y un PR por historia, desde `develop`:
1. `hu-30-agendar-reserva`: esta especificación; tablas y restricción; `agendarReserva` desde cotización y directa, con adelanto; página de la reserva (sin pagos todavía); "Agendar" en la consulta. Flujo crítico 2.
2. `hu-29-tablero-agenda`: el tablero (diseño con `frontend-design`, mostrado temprano al dueño).
3. `hu-31-reprogramar-cancelar`.
4. `hu-32-pagos`: pagos, saldo, anular, comprobante; "Reservas" en la ficha del cliente.

Cada PR: lint, typecheck, unitarias, E2E completo y knip; `code-review` y `security-review` (toca montos y datos de clientes); capturas a 360 y 1280 px (plan de desarrollo, "Cómo se trabaja cada historia").

## 11. Criterio de salida

- La base rechaza un cruce aunque el código fallara (prueba directa contra la restricción).
- Dos personas reservando el mismo espacio a la vez: solo una lo logra, y la otra recibe un mensaje claro.
- El tablero muestra la semana del taller en la computadora y el día en el celular.
- El saldo de cada reserva es correcto con pagos y anulaciones.
- En la demo: aceptar la cotización de C2, agendarla con adelanto, verla en el tablero, moverla y registrar el saldo.

## 12. Decisiones abiertas

| Qué | De quién | Mientras tanto |
|---|---|---|
| Duración sugerida con varios servicios: ¿la mayor o la suma? | Dueño | La mayor (un mismo espacio, trabajos en paralelo); la entrega se edita en cada reserva |
| ¿Los días que el taller no atiende cuentan para la duración? | Dueño | Cuentan (días de calendario); el tablero los muestra atenuados y la entrega se ajusta a mano |
| Si se cancela una reserva que salió de una consulta, ¿la consulta queda "confirmado" o pasa a "perdido"? | Dueño | Pasa a "perdido" con motivo "otro" y el motivo de la cancelación como detalle; se puede reabrir. La cotización vuelve a "enviada" (vigente): al reabrir la consulta, queda "cotizado" y se agenda de nuevo (HU-31) |
| ¿El encargado con "Pagos" ve el total y el saldo de la reserva? | Dueño | Sí: necesita el saldo para cobrar (RF-46). Sigue sin ver ni crear cotizaciones (RN-01) |
| ¿Se permite un pago mayor al saldo (el cliente deja más)? | Dueño | No: evita errores de tipeo. Si deja más, se suma un adicional en C4 |

## 13. Cierre (21 de octubre de 2026)

HU-29 a HU-32 en `develop` (PR #61 a #64), con `code-review` y `security-review` en cada una y todos sus hallazgos atendidos. Lo que se decidió al programar y no estaba escrito arriba:

- **Cancelar mueve la consulta y la cotización juntas:** la consulta pasa a "perdido" y la cotización a "enviada" solo si la consulta estaba "confirmado"; si no, ninguna se toca. La auditoría lo registra.
- **Una reserva con saldo cero o a favor** cuenta como pagada: no ofrece más pagos.
- **"Nueva reserva" en la ficha del cliente** solo para quien ve pagos: la reserva directa lleva precios. Las demás salen de una consulta.
- **El comprobante** (al registrar un pago o con el adelanto al agendar) va al bucket privado, se achica en el navegador y, si el pago o la reserva no se guardan, se borra.
- **Un pago no pasa el saldo** aunque dos personas cobren a la vez: se revisa con la reserva bloqueada.

Pendiente a mano: mostrarle el tablero al dueño (demo del viernes 6 de noviembre) y probar en un celular real el cobro con la foto del comprobante.
