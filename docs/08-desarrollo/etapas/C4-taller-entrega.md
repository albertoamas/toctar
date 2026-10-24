# C4 Taller y entrega — especificación

- **Fase y semana:** C. Entrega 2 · semanas 4 y 5
- **Estado:** programada (23 de octubre de 2026): HU-33 a HU-38 en `develop` (PR #65, #66, #68, #69, #71 y #72). Falta la demo con el dueño desde un celular real
- **Historias:** HU-33 Recibir vehículo · HU-34 Órdenes del técnico · HU-35 Avisar vehículo listo · HU-36 Entregar vehículo · HU-37 Saldos pendientes · HU-38 Recordatorios de mantenimiento
- **Base:**
  - Requisitos: RF-40 a RF-43, RF-46 a RF-50; RNF-01, RNF-05, RNF-07, RNF-10, RNF-11.
  - Reglas: RN-08 (mantenimiento a los meses de Configuración desde la entrega, solo en los servicios marcados), RN-09 (el mantenimiento es un servicio cobrado del catálogo), RN-12 (el técnico ve solo sus órdenes, sin precios ni pagos), RN-13 (entrega con saldo solo por el dueño o un encargado con "autorizar entrega con saldo"); S-1, S-2.
  - Modelo: D-1 (reserva y orden son `trabajo`), D-4, D-5, D-6, D-9, D-10. Columnas nuevas en `trabajo`; tablas `trabajo_foto`, `trabajo_avance` y `recordatorio_mantenimiento`.
  - Casos de uso: CU-15, CU-16, CU-18, CU-19, CU-20. Flujos críticos 3, 4 y 5 de `05-analisis/diagramas-de-secuencia/flujos-criticos.md`.
  - Decisión del 20/10 (`C1-catalogo-clientes.md` §12): "Extender la entrega" corre la fecha de fin y, si el espacio está ocupado, propone otro libre; si el trabajo termina antes, se marca listo y el espacio se libera.
  - Lo que dejó C3 (`C3-agenda-pagos.md` §13): pagos con comprobante, `estaPagada`, `RegistrarPago`, `CampoComprobante` y el tablero, que ya muestra el estado escrito cuando no es "agendado".

Esta especificación se escribe al empezar la etapa, con lo aprendido en las anteriores. Se programa contra ella; si algo cambia durante la etapa, se corrige aquí primero.

## 1. Objetivo

El ciclo completo de un vehículo en el sistema. El personal lo recibe con fotos y observaciones, el técnico ve solo sus órdenes y registra el avance, el cliente recibe el aviso de "listo" por WhatsApp con un toque y el vehículo se entrega con el saldo cobrado (o autorizado). La fecha del próximo mantenimiento queda programada, y el dueño ve quién le debe y a quién le toca volver.

## 2. Alcance

**Incluye:**
- **Recibir el vehículo (HU-33), dueño y encargado con "Órdenes":** desde una reserva agendada, "Recibir vehículo".
  - Fotos de ingreso con la cámara del celular, observaciones (rayones, golpes, objetos que deja) y el técnico, si todavía no tiene.
  - La reserva pasa a orden: estado "recibido", con los servicios y precios que ya tenía (D-4).
- **Órdenes (HU-34):**
  - El técnico ve **solo las suyas**, sin precios ni pagos (RN-12). El dueño y el encargado con "Órdenes" ven todas.
  - En la orden se cambia el estado (recibido → en proceso → listo; se puede volver un paso atrás por error), se suben fotos de antes, durante y después, y se escriben avances con fecha y autor.
  - **Extender la entrega** (dueño y encargado): corre la fecha de fin. Si el espacio está ocupado esos días, avisa y ofrece los espacios libres para moverla (D-5).
  - **Listo antes de tiempo:** la fecha de fin pasa a hoy y el espacio queda libre desde mañana. Si se marcó por error y vuelve a en proceso, recupera su entrega (salvo que el espacio ya se haya tomado: entonces se extiende) y el aviso al cliente se borra.
  - **Extender** solo mientras se trabaja (recibida o en proceso), hasta una fecha de hoy en adelante.
- **Avisar que está listo (HU-35), dueño y encargado con "Órdenes":** en una orden lista, "Avisar por WhatsApp" abre el chat con el mensaje escrito: nombre, vehículo y, si quien avisa ve pagos, el saldo. Queda registrado quién avisó y cuándo.
- **Entregar (HU-36), dueño y encargado con "Órdenes":**
  - Se ven el precio cotizado, los adicionales, el precio final, los pagos y el saldo (los montos, solo con "Pagos").
  - **Adicionales:** solo el dueño suma servicios (RF-43; solo el dueño pone precios, RN-01). Así también se cobra lo que el cliente deja de más.
  - Se cobra el saldo con el `RegistrarPago` de C3.
  - **Entregar con saldo:** con saldo pendiente, solo el dueño o un encargado con "autorizar entrega con saldo" confirma la entrega, y queda registrado quién la autorizó (RN-13).
  - **Mantenimiento:** al entregar, cada servicio marcado "genera mantenimiento" programa un recordatorio para dentro de los meses de Configuración (RN-08).
- **Saldos pendientes (HU-37), dueño y encargado con "Pagos":** la lista de órdenes entregadas con saldo, con cliente, vehículo, monto y días desde la entrega. Desde cada una se escribe por WhatsApp o se abre la orden para registrar el pago. Arriba, el total que se debe.
- **Mantenimientos (HU-38), dueño y encargado con "Mantenimientos":**
  - Muestra los vencidos y los que vencen en los próximos 15 días, ordenados por fecha.
  - "Avisar por WhatsApp" abre el chat con el mensaje y marca "avisado".
  - "No le interesa" lo cierra, con una nota opcional.
  - "Agendar" abre una reserva directa del cliente y su vehículo. Al agendarla, el recordatorio queda "agendado" y apunta a la reserva.
- **En otras pantallas:**
  - En el **tablero**, las órdenes se ven con su estado escrito y llevan a la orden.
  - En la **reserva** recibida, el enlace "Ver la orden".
  - En la **ficha del cliente**, sus órdenes (son sus reservas, con el estado) y sus mantenimientos programados.
- **Módulos construidos:**
  - "Órdenes", también para el técnico.
  - "Mantenimientos".
  - "Pagos" gana su pantalla y su entrada en el menú, "Saldos pendientes".

**No incluye** (y dónde queda):
- **Pantalla del día** (HU-39), **plantillas de WhatsApp editables** (HU-40) y **fotos de órdenes a la galería** (HU-41): son deseables, en C5 si hay margen. Mientras tanto, los mensajes son fijos (§8) y se escriben pensando en que la HU-40 los vuelva editables.
- **Envío automático de WhatsApp:** fuera del alcance (flujos críticos, nota final). El sistema arma el mensaje y la persona lo envía.
- **Factura o recibo en PDF de la entrega:** no está en el alcance contratado.
- **Inventario de productos por orden:** futuro (modelo de datos, "Futuro").

## 3. Reglas que se cumplen

| Regla | Qué dice | Dónde se garantiza |
|---|---|---|
| RF-40, CU-15 | Al ingresar, la reserva pasa a orden con inspección: fotos y observaciones | `recibirVehiculo`: solo una reserva "agendada" cuyo día de ingreso ya llegó; estado "recibido", `recibido_at`/`recibido_por`, observaciones y fotos de etapa "ingreso" |
| RF-41 | Estados recibido, en proceso, listo y entregado | CHECK de `trabajo.estado` (desde C3) y `cambiarEstadoOrden` con `transicionOrden` (función pura): solo un paso adelante o atrás; "entregado" solo por `entregarVehiculo` |
| RF-42, RN-12, S-1 | El técnico ve sus órdenes, sube fotos, avances y notas, y marca listo; no ve precios ni pagos | Las consultas de órdenes filtran por `tecnico_id` del técnico; `obtenerOrden` no trae montos sin "Pagos"; las acciones del técnico verifican que la orden sea suya |
| RF-43, RN-01 | Precio cotizado y final; el dueño suma adicionales | `trabajo_linea.es_adicional`; `agregarAdicional` exige rol dueño. Precio cotizado = líneas no adicionales − descuento; final = todas − descuento |
| RF-46, RF-47 | Saldo de cada orden y lista de saldos pendientes | `calcularSaldo` (C3); `saldosPendientes()` suma en SQL por trabajo entregado y filtra saldo > 0 |
| RF-48 | Al estar lista, un botón abre WhatsApp con nombre, vehículo y saldo | `mensajeListo` (función pura) y `registrarAvisoListo` (guarda `avisado_listo_at`/`avisado_listo_por`) |
| RN-13, S-2 | Entrega con saldo solo por el dueño o un encargado con el permiso | `entregarVehiculo` vuelve a calcular el saldo dentro de la transacción, con la orden bloqueada. Con saldo > 0 exige `puede(usuario, "entrega_con_saldo")` y guarda `entrega_con_saldo_autorizada_por` |
| RF-49, RN-08 | Al entregar un servicio que genera mantenimiento, se calcula el próximo | En la misma transacción de la entrega: un `recordatorio_mantenimiento` por servicio marcado, con `fecha_programada = entrega + intervalo_mantenimiento_meses` (`sumarMeses`, función pura) |
| RF-50 | Mantenimientos por vencer y vencidos; avisar y marcar | `/panel/mantenimientos`; estados `pendiente`, `avisado`, `agendado`, `no_interesado` |
| RN-09 | El mantenimiento es un servicio cobrado | "Agendar" abre una reserva directa: se elige el servicio de mantenimiento del catálogo con su precio |
| D-5 | Sin cruces al extender | `extenderEntrega` usa la misma restricción `trabajo_sin_cruces`; si la base la rechaza (23P01), responde con los espacios libres |
| RNF-10 | Quién y cuándo | `auditoria`: `trabajo` (`recibir`, `estado`, `extender`, `avisar_listo`, `adicional`, `entregar`) y `recordatorio` (`avisar`, `no_interesado`, `agendar`) |
| D-6 | Nada se borra | Las fotos de ingreso no se quitan nunca; las demás, solo antes de la entrega y por quien la subió o el dueño |
| RNF-11 | Todo configurable | El intervalo de mantenimiento (Configuración), qué servicios lo generan (Catálogo) y el permiso de entrega con saldo (Usuarios) ya existen; los mensajes se vuelven editables con la HU-40 |

## 4. Datos

Migraciones por historia:
- `0028_ordenes` (HU-33): las columnas nuevas de `trabajo`, `trabajo_foto` y `trabajo_avance`.
- `0029_orden_fecha_prevista` (HU-34): `trabajo.fecha_fin_prevista`, la entrega que tenía antes de marcarla lista antes de tiempo.
- `0030_mantenimientos` (HU-36): `recordatorio_mantenimiento`.

No hay datos iniciales. El intervalo de mantenimiento (3 meses), el permiso `entrega_con_saldo` y la marca "genera mantenimiento" ya existen desde B2 y C1.

### `trabajo`: columnas nuevas
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `observaciones_ingreso` | `text` | sí | Hasta 2000 |
| `recibido_at`, `recibido_por` | `timestamptz`, `integer` | sí | FK `usuario`. CHECK: con estado recibido, en proceso, listo o entregado, `recibido_at` no es nulo |
| `listo_at` | `timestamptz` | sí | La última vez que pasó a listo |
| `avisado_listo_at`, `avisado_listo_por` | `timestamptz`, `integer` | sí | El último aviso |
| `entregado_at`, `entregado_por` | `timestamptz`, `integer` | sí | CHECK: con estado entregado, no nulo |
| `entrega_con_saldo_autorizada_por` | `integer` | sí | FK `usuario`; solo si se entregó con saldo |
| `saldo_al_entregar` | `numeric(10,2)` | sí | El saldo en el momento de la entrega, para la auditoría y la lista de saldos |

Índice (`tecnico_id`, `estado`) para "Mis órdenes"; índice (`estado`, `entregado_at`) para la lista de saldos.

### `trabajo_foto`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `trabajo_id` | `integer` | no | FK `trabajo` |
| `archivo_id` | `integer` | no | FK `archivo`, **privado** (son vehículos de clientes); único |
| `etapa` | `text` | no | CHECK `ingreso`, `antes`, `durante`, `despues` |
| `subido_por` | `integer` | no | FK `usuario` |
| `created_at` | `timestamptz` | no | |

Índice (`trabajo_id`, `etapa`). Hasta 20 fotos por etapa (se valida en la acción).

### `trabajo_avance`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `trabajo_id` | `integer` | no | FK `trabajo` |
| `usuario_id` | `integer` | no | FK `usuario` |
| `nota` | `text` | no | 1 a 1000 caracteres |
| `created_at` | `timestamptz` | no | |

Índice (`trabajo_id`). Los cambios de estado también dejan un avance automático ("Pasó a en proceso"), así la historia de la orden se lee en un solo lugar.

### `recordatorio_mantenimiento`
| Columna | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | `integer` identidad | no | |
| `trabajo_origen_id` | `integer` | no | FK `trabajo` (el entregado) |
| `cliente_id`, `vehiculo_id` | `integer` | no | FK; copiados del trabajo |
| `servicio_id` | `integer` | no | FK `servicio` (el que generó el mantenimiento) |
| `fecha_programada` | `date` | no | Entrega + intervalo (en Bolivia) |
| `estado` | `text` | no | CHECK `pendiente`, `avisado`, `agendado`, `no_interesado`; por defecto `pendiente` |
| `avisado_at`, `avisado_por` | `timestamptz`, `integer` | sí | |
| `trabajo_agendado_id` | `integer` | sí | FK `trabajo`. CHECK: obligatorio si `agendado` |
| `nota` | `text` | sí | Hasta 300 |
| `created_at`, `updated_at` | `timestamptz` | no | |

Índices: (`estado`, `fecha_programada`) y (`cliente_id`). Único (`trabajo_origen_id`, `servicio_id`): entregar dos veces no duplica recordatorios.

## 5. Pantallas y rutas

Todas con `exigirModulo` dentro de `<Suspense>`, el estándar del panel (44 px táctiles) y sin desborde a 360 px. Los montos se muestran solo a quien tiene "Pagos" (además del dueño); el técnico nunca los ve.

### `/panel/agenda/[id]` — Reserva (cambia)
- **Agendada, desde su día de ingreso:** "Recibir vehículo" (dueño y encargado con "Órdenes"). Antes de ese día no aparece: si el cliente llega antes, primero se reprograma.
- **Recibida o más adelante:** aviso "Esta reserva ya es una orden" con "Ver la orden", y sin acciones de reserva.

### `/panel/ordenes/[id]/recibir` — Recibir vehículo
- Encabezado con placa, cliente y servicios (sin precios).
- **Fotos de ingreso:** "Tomar foto", que en el celular abre la cámara. Varias, con vista previa y "Quitar". Cada una se achica en el navegador y se sube al bucket privado (como las fotos de las consultas).
- **Observaciones:** texto libre, con la ayuda "Rayones, golpes, objetos que deja el cliente…".
- **Técnico:** si la reserva no tiene, se elige; si tiene, viene elegido.
- "Recibir vehículo". Al guardar, va a la orden.
- Sin fotos se puede recibir, pero se avisa: "Sin fotos de ingreso no hay cómo probar el estado en que llegó." y se pide confirmar.

### `/panel/ordenes` — Órdenes
- **Técnico, "Mis órdenes":** sus órdenes en recibido, en proceso y listo, en tarjetas grandes con placa, vehículo, servicios, estado escrito y entrega aproximada. Las de hoy y las atrasadas, primero. Vacío: "No tienes órdenes asignadas."
- **Dueño y encargado:** las mismas tarjetas para todas las órdenes activas, con pestañas por estado (Recibidas, En proceso, Listas) y el técnico de cada una. Las listas sin avisar se marcan con "Sin avisar".
- Las entregadas no se listan aquí: están en la ficha del cliente y, con saldo, en Saldos pendientes.

### `/panel/ordenes/[id]` — Orden
- Placa, estado (insignia con texto), cliente, vehículo, técnico, espacio, ingreso y entrega aproximada. "Escribir por WhatsApp" solo para el dueño y el encargado.
- **Estado:** el siguiente paso como botón principal ("Empezar trabajo", "Marcar listo") y "Volver a …" como secundario. El técnico solo en sus órdenes.
- **Fotos:** por etapa (Ingreso, Antes, Durante, Después), con miniaturas que se amplían y "Tomar foto" en cada etapa salvo Ingreso, que es solo lectura.
- **Avances:** la historia de la orden, con fecha, autor y nota, y los cambios de estado. Campo "Escribir un avance".
- **Extender entrega** (dueño y encargado): nueva fecha de fin. Si el espacio está ocupado, "El Espacio 2 está ocupado desde el 30/10. Muévela a un espacio libre:" con los libres para todo el período.
- **Servicios y saldo** (con "Pagos"): precio cotizado, adicionales, precio final, pagado y saldo; pagos con "Registrar pago" (C3). El dueño ve "Agregar servicio" (adicional).
- **Lista:** "Avisar por WhatsApp" y, si ya se avisó, "Avisado el 30/10 a las 15:40 por Ana". Después, "Entregar vehículo".
- **Entregada:** todo en solo lectura, con quién entregó, cuándo y, si fue con saldo, quién lo autorizó.

### `/panel/ordenes/[id]/entregar` — Entregar vehículo
- Resumen: servicios y precio final, pagado y **saldo** grande (con "Pagos"; sin "Pagos", solo "Queda saldo pendiente" o "Pagado").
- Con saldo y "Pagos": "Registrar pago" en la misma pantalla.
- **Sin saldo:** "Entregar vehículo".
- **Con saldo:**
  - Quien puede autorizar ve la casilla "Entregar con saldo pendiente (X Bs)" y "Entregar vehículo".
  - Quien no puede ve "Queda saldo pendiente. La entrega con saldo la autoriza el dueño o quien tenga el permiso.", sin botón.
- Si algún servicio genera mantenimiento, una línea lo anticipa: "Se programará el mantenimiento para el 22/01/2027."

### `/panel/pagos` — Saldos pendientes (dueño y encargado con "Pagos")
- Arriba, "Total por cobrar: X Bs".
- Lista de las órdenes entregadas con saldo, la más antigua primero: cliente, placa, saldo, entregada el dd/mm (con el año, si es de otro) y "hace N días". Cada una tiene "Escribir por WhatsApp" (mensaje de saldo, §8) y **"Registrar pago" ahí mismo**: el encargado con "Pagos" y sin "Órdenes" no podría cobrar desde la orden. "Ver la orden", para quien ve órdenes.
- Vacío: "Nadie debe nada."

### `/panel/mantenimientos` — Mantenimientos (dueño y encargado con "Mantenimientos")
- Dos secciones, **Vencidos** y **Próximos 15 días**, ordenadas por fecha. Cada una muestra cliente, placa, servicio, fecha programada y estado ("Avisado el 2/02").
- En cada una: "Avisar por WhatsApp", que abre el chat y marca avisado; "Agendar", que lleva a `/panel/agenda/nueva?cliente=…&vehiculo=…&recordatorio=…`; y "No le interesa", que pide una nota opcional.
- No muestra los de un cliente o vehículo desactivado. "Agendar", solo para quien ve Agenda y Pagos (la reserva directa lleva precios).
- Vacío: "No hay mantenimientos por avisar."

### En otras pantallas
- **Tablero de la agenda:** una orden se ve con su estado escrito (ya existe) y el bloque lleva a la orden.
- **Ficha del cliente:** en "Reservas", el estado de cada una (recibida, en proceso, lista, entregada); nueva sección "Mantenimientos" con los programados.
- **Nueva reserva** con `?recordatorio=`: aviso "Mantenimiento de Nano cerámico (venció el 22/01)". Al agendar, el recordatorio queda "agendado".
- **Menú del técnico:** "Inicio" y "Órdenes".

## 6. Acciones del servidor

Todas validan con Zod (también las de datos sueltos) y empiezan con `exigirModulo`. Las del técnico verifican además que la orden sea suya.

| Acción | Quién | Qué hace | Mensajes |
|---|---|---|---|
| `recibirVehiculo` | `ordenes` (dueño, encargado) | Reserva "agendada" y su día de ingreso ya llegó; técnico activo; observaciones. Estado "recibido", sellos, avance automático, auditoría | "Vehículo recibido. La orden está en «Recibidas»." · "Esa reserva ya fue recibida." |
| `subirFotoOrden` | `ordenes` (el técnico, solo en las suyas) | Una foto achicada, de la etapa indicada, al bucket privado; hasta 20 por etapa; no en una orden entregada | "Foto guardada." · "Hasta 20 fotos por etapa." |
| `quitarFotoOrden` | quien la subió o el dueño | Solo antes de la entrega, y nunca las de ingreso (son la prueba de cómo llegó) | "Foto quitada." |
| `cambiarEstadoOrden` | `ordenes` (el técnico, solo en las suyas) | `transicionOrden(actual, nuevo)`; al pasar a listo, si la entrega aproximada es después de hoy, pasa a hoy (libera el espacio desde mañana) | "La orden está en proceso." · "La orden está lista. Avisa al cliente." |
| `agregarAvance` | `ordenes` (el técnico, solo en las suyas) | Nota de 1 a 1000 | — (se ve en la lista) |
| `extenderEntrega` | `ordenes` (dueño, encargado) | Nueva fecha de fin, después de la actual, hasta 60 días desde el ingreso; opcionalmente otro espacio. La base frena el cruce | "Entrega movida al 2/11." · "El Espacio 2 está ocupado desde el 30/10: elige otro espacio." |
| `registrarAvisoListo` | `ordenes` (dueño, encargado) | Orden lista; guarda el aviso. El enlace de WhatsApp se arma antes, en el servidor | — |
| `agregarAdicional` | dueño | Línea `es_adicional` con servicio del catálogo y precio (el vigente del tamaño, editable); no en una orden entregada | "Servicio agregado. Precio final: 1450 Bs." |
| `entregarVehiculo` | `ordenes` (+ `entrega_con_saldo` si hay saldo) | Orden lista. En una transacción con la orden bloqueada: saldo; si > 0, exige el permiso y la casilla marcada; estado "entregado", sellos, `saldo_al_entregar`, recordatorios de mantenimiento, auditoría | "Vehículo entregado." · "Vehículo entregado con saldo de 300 Bs." · "Queda saldo pendiente: la entrega con saldo la autoriza el dueño o quien tenga el permiso." |
| `avisarMantenimiento` | `mantenimientos` | Pendiente o avisado → avisado; guarda quién y cuándo | — |
| `cerrarMantenimiento` | `mantenimientos` | → no interesado, con nota opcional | "Listo: no se le volverá a avisar." |
| `agendarReserva` (cambia) | `agenda` (+ `mantenimientos` si trae `recordatorioId`) | Con `recordatorioId`: en la misma transacción, el recordatorio (abierto, del mismo cliente y vehículo) pasa a "agendado" con `trabajo_agendado_id`; si otra persona lo agendó o lo cerró recién, no se reserva | El mensaje de siempre · "Ese mantenimiento ya se agendó o se cerró. Vuelve a Mantenimientos." |
| `cancelarReserva` (cambia) | `agenda` | El mantenimiento agendado con esa reserva vuelve a la lista como estaba ("avisado" si se le avisó; si no, "pendiente") | El mensaje de siempre |

**Consultas:**
- `src/modulos/ordenes/consultas.ts`:
  - `ordenesDelTecnico(id)` y `ordenesActivas()`;
  - `obtenerOrden(id, { conMontos })`, que trae fotos con enlaces firmados, avances, líneas y pagos;
  - `saldoDeOrden(id)`.
- `src/modulos/pagos/consultas.ts`: `saldosPendientes()`.
- `src/modulos/mantenimientos/consultas.ts`: `mantenimientosPorAvisar(hoy)` y `mantenimientosDelCliente(id)`.

**Funciones puras** (con prueba unitaria):
- `transicionOrden(actual, nuevo)`;
- `sumarMeses(fecha, meses)`, que maneja el fin de mes (el 31/01 más un mes da el 28/02 o el 29/02);
- `mensajeListo({ nombre, vehiculo, saldo })`, `mensajeSaldo(...)` y `mensajeMantenimiento(...)`;
- `precioCotizadoYFinal(lineas, descuento)`;
- `diasDesde(fecha, hoy)`;
- `seccionMantenimiento(fecha, hoy)`, que devuelve vencido (ya pasó), próximo (de hoy a 15 días) o ninguno.

## 7. Componentes y diseño

- **Reutiliza:**
  - de C3: `RegistrarPago`, `CampoComprobante` (la misma idea de foto con vista previa), `VerComprobante` (vista en grande) y `useEspaciosLibres` (para extender);
  - del panel: `Pestanas`, `EstadoVacio`, `AvisoEnPagina`, `Selector`, `Dialog` y `achicarFoto`;
  - de C1: el botón de WhatsApp.
- **Nuevos:**
  - `TarjetaOrden` (la lista, pensada para el celular del técnico);
  - `FotosOrden` (por etapa, con cámara);
  - `AvancesOrden`;
  - `EstadoOrden` (botones de paso);
  - `ExtenderEntrega`;
  - `EntregarVehiculo`;
  - `ListaSaldos`;
  - `ListaMantenimientos`.
- **Diseño con `frontend-design`:** "Mis órdenes" y la orden son la pantalla que más usa el técnico, en el celular, con las manos ocupadas.
  - Botones grandes y el siguiente paso siempre visible.
  - "Tomar foto" usa `capture="environment"` para abrir la cámara trasera.
  - El estado se lee también como texto, no solo por el color.
- **Las fotos de las órdenes son privadas:** son vehículos de clientes. Se ven con enlaces firmados, como los comprobantes.

## 8. Textos de la interfaz

- **Menú:** "Órdenes" · "Mantenimientos" · "Saldos pendientes".
- **Estados:** "Agendada" · "Recibida" · "En proceso" · "Lista" · "Entregada" · "Cancelada".
- **Recepción:** "Recibir vehículo" · "Fotos de ingreso" · "Tomar foto" · "Observaciones" (ayuda: "Rayones, golpes, objetos que deja el cliente…") · "Técnico" · "Sin fotos de ingreso no hay cómo probar el estado en que llegó."
- **Orden:**
  - Estado: "Empezar trabajo" · "Marcar listo" · "Volver a recibida" · "Volver a en proceso".
  - Fotos: "Ingreso" · "Antes" · "Durante" · "Después".
  - Avances: "Avances" · "Escribir un avance" · "Guardar avance".
  - Entrega: "Extender entrega" · "Avisar por WhatsApp" · "Avisado el {fecha} por {nombre}" · "Entregar vehículo".
  - Montos: "Agregar servicio" · "Precio cotizado" · "Adicionales" · "Precio final".
- **Entrega:** "Entregar con saldo pendiente ({saldo} Bs)" · "Queda saldo pendiente. La entrega con saldo la autoriza el dueño o quien tenga el permiso." · "Se programará el mantenimiento para el {fecha}."
- **Saldos:** "Saldos pendientes" · "Total por cobrar" · "Entregada el {fecha}, hace {n} días" · "Nadie debe nada."
- **Mantenimientos:** "Vencidos" · "Próximos 15 días" · "Avisar por WhatsApp" · "Agendar" · "No le interesa" · "No hay mantenimientos por avisar."
- **Mensajes de WhatsApp** (fijos hasta la HU-40; el saldo solo si quien avisa ve pagos y hay saldo):
  - **Listo:** "Hola {nombre}, tu {vehículo} ya está listo en TocTar Detailing. {Saldo pendiente: {saldo} Bs. }Te esperamos en el taller."
  - **Saldo:** "Hola {nombre}, te escribimos de TocTar Detailing por el saldo de {saldo} Bs del servicio de tu {vehículo}. Puedes pagarlo en el taller, por QR o por transferencia."
  - **Mantenimiento:** "Hola {nombre}, te escribimos de TocTar Detailing: a tu {vehículo} le toca el mantenimiento de {servicio}. ¿Te agendamos un día?"
- **Errores:** "Esa orden no es tuya." · "Esa reserva todavía no llega a su día de ingreso: reprográmala." · "La nueva entrega tiene que ser después de la actual." · "Escribe el avance." · "Hasta 20 fotos por etapa."

## 9. Pruebas

- **Unitarias** (`tests/unit/`):
  - `transicionOrden`: solo un paso adelante o atrás; nunca a entregado ni desde entregado.
  - `sumarMeses`: el 31/01 + 1 da el 28/02 (o el 29/02 en un año bisiesto); el 15/11 + 3 da el 15/02 del año siguiente.
  - `precioCotizadoYFinal`: con y sin adicionales, con descuento.
  - Los mensajes de WhatsApp: con saldo, sin saldo y con un saldo a favor (que no se menciona).
  - `seccionMantenimiento` con hoy, ayer y dentro de 15 y 16 días.
  - Los esquemas de recepción, avance, extender, adicional y entrega.
- **De punta a punta** (`tests/e2e/`):
  - `hu-33-recibir`: desde la reserva, con fotos y observaciones; la orden queda "recibida"; antes del día de ingreso no se ofrece; las fotos quedan privadas.
  - `hu-34-ordenes-tecnico`: el técnico ve solo las suyas, sin precios; cambia estados, sube fotos y escribe avances; otro técnico recibe "Esa orden no es tuya" en una ajena, también por la acción; extender con el espacio ocupado ofrece otro; "listo" antes de tiempo libera el espacio.
  - `hu-35-avisar`: el enlace de WhatsApp lleva el mensaje con el saldo; sin "Pagos", sin el saldo; queda registrado el aviso.
  - `hu-36-entregar`:
    - sin saldo, se entrega;
    - con saldo, un encargado sin el permiso no puede y uno con el permiso sí, y queda quién lo autorizó;
    - un adicional sube el precio final y solo el dueño lo agrega;
    - un servicio que genera mantenimiento crea el recordatorio con la fecha correcta.
  - `hu-37-saldos`: aparece la entregada con saldo y se va al registrar el pago.
  - `hu-38-mantenimientos`: vencidos y próximos; avisar, no le interesa y agendar (el recordatorio queda "agendado" con la reserva).
  - **Flujo completo (flujos críticos 3, 4 y 5):** reserva → recibir → técnico → listo → aviso → cobro del saldo → entrega → recordatorio → agendar el mantenimiento.
  - A 360 px, ninguna pantalla nueva se sale.

## 10. Orden de trabajo

Una rama y un PR por historia, desde `develop`:
1. `hu-33-recibir-vehiculo`: esta especificación; migración `0028_ordenes`; módulo "Órdenes" construido; recepción con fotos; la página de la orden, básica (datos, fotos de ingreso, servicios), y "Ver la orden" en la reserva.
2. `hu-34-ordenes-tecnico`: "Mis órdenes" y la lista del dueño; estados, fotos por etapa, avances y extender entrega. Diseño con `frontend-design`.
3. `hu-35-avisar-listo`.
4. `hu-36-entregar-vehiculo`: migración `0030_mantenimientos`; adicionales, entrega con o sin saldo (RN-13) y recordatorios.
5. `hu-37-saldos-pendientes`: la pantalla de "Pagos" y su menú.
6. `hu-38-mantenimientos`: la lista, los avisos y el agendado; "Mantenimientos" en la ficha del cliente. Prueba del flujo completo.

Cada PR: lint, typecheck, unitarias, E2E completo y knip; `code-review` siempre y `security-review`, porque todas tocan permisos, datos de clientes o montos; capturas a 360 y 1280 px (plan de desarrollo, "Cómo se trabaja cada historia").

## 11. Criterio de salida

- Los 5 flujos de `flujos-criticos.md` tienen su prueba E2E y pasan.
- El técnico no ve precios, pagos ni órdenes ajenas, ni por la pantalla, ni por la URL, ni por las acciones.
- Una orden con saldo solo se entrega con autorización, y queda quién la dio.
- **En la demo:** recibir un vehículo con fotos desde el celular; el técnico lo pasa a listo; avisar por WhatsApp; cobrar el saldo; entregar; ver el mantenimiento programado.

## 12. Decisiones abiertas

| Qué | De quién | Mientras tanto |
|---|---|---|
| ¿El técnico puede recibir el vehículo? | Dueño | No: recibe el dueño o el encargado con "Órdenes" (la recepción sale de la agenda, que el técnico no ve). Si el dueño quiere, se le da al técnico recibir sus propias reservas |
| Una orden lista que el cliente todavía no retira, ¿ocupa su espacio? | Dueño | No (decisión del 20/10): al marcarla lista, el espacio queda libre desde mañana. Si en la práctica el auto sigue ocupando el lugar, se cambia para liberarlo recién al entregar |
| El mensaje de "listo", ¿lleva el saldo? | Dueño | Sí, si hay saldo y quien avisa ve pagos. Sin "Pagos", el mensaje va sin el monto |
| ¿El servicio de mantenimiento programa a su vez otro mantenimiento? | Dueño | Lo decide la marca "genera mantenimiento" del catálogo: si el dueño la activa en el servicio de mantenimiento, cada mantenimiento programa el siguiente |
| Agendar un mantenimiento lleva precios (reserva directa) | Dueño | Lo agenda el dueño o quien tiene "Pagos" (como cualquier reserva directa, C3). El encargado de mantenimientos sin "Pagos" avisa y deja la nota; agenda el dueño |
| Los textos de los mensajes de WhatsApp | Dueño | Los de §8, fijos hasta la HU-40 (deseable), que los vuelve editables en Configuración |
| ¿Hasta cuántas fotos por etapa? | YankoSoft | 20 por etapa. Las fotos van achicadas (unos 300 KB): 80 fotos por orden son unos 24 MB en R2 |

## 13. Cierre (23 de octubre de 2026)

HU-33 a HU-38 en `develop` (PR #65, #66, #68, #69, #71 y #72), con `code-review` y `security-review` en cada una y sus hallazgos atendidos o explicados en el PR. En el medio, Next.js pasó a 16.4.3 por dos vulnerabilidades críticas (PR #67). Los 5 flujos de `flujos-criticos.md` tienen su prueba E2E; los 3, 4 y 5 además juntos, de la reserva al mantenimiento agendado (`tests/e2e/flujo-taller-completo.spec.ts`). Lo que se decidió al programar y no estaba escrito arriba:

- **Fotos de ingreso:** recibir sin fotos pide confirmarlo. Recibido el vehículo, ya no se quitan (son la prueba de cómo llegó). Si la reserva se reprograma o se cancela antes, las que se alcanzaron a tomar se descartan.
- **Volver de "lista":** la orden recupera la entrega que tenía antes de marcarse lista (`fecha_fin_prevista`, migración `0029_orden_fecha_prevista`). Si ese espacio ya se ocupó, queda la entrega que tenía como lista.
- **El aviso de "listo"** es un botón que abre WhatsApp y lo registra en el mismo toque: no hay forma de abrir el chat sin que quede registrado.
- **Entrega con saldo:** quien autoriza sin ver pagos no ve el monto en el aviso (RN-12). La orden se bloquea mientras se entrega: el saldo no cambia entre la revisión y la entrega.
- **Saldos pendientes:** se cobra desde la misma lista (el encargado con "Pagos" sin "Órdenes" no llega a la orden). El saldo se calcula en la base con la misma cuenta que `calcularSaldo`.
- **Mantenimientos:**
  - No se listan ni se avisan los de un cliente o vehículo desactivado.
  - "Agendar" es para quien ve agenda y pagos (la reserva directa lleva precios).
  - Si la reserva del mantenimiento se cancela, el recordatorio vuelve a la lista como estaba.

Pendiente a mano, en `pruebas.toctardetailing.com` (ya con https):

- recibir con fotos desde un celular real;
- avisar y cobrar por WhatsApp de verdad;
- la demo con el dueño: recibir, listo, aviso, cobro, entrega y el mantenimiento programado.
