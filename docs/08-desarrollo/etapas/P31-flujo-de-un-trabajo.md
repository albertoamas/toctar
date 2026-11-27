# P31 Un trabajo, de la cotización a la entrega — especificación

- **Fase y semana:** C. Entrega 2 · 4 de noviembre de 2026, antes del cierre
- **Estado:** aprobada por YankoSoft (04/11/2026) con la maqueta del recorrido. Se programa en dos partes:
  - **Parte 1 (A y C):** el recorrido claro y el Inicio por pasos. ✅ Hecha (04/11/2026, PR #137; ajustes de diseño en #138).
  - **Parte 2 (B):** cotizar sin registrar y la placa opcional (pedidos 31 b y 29). ⏳ Sin empezar: la decide el dueño.
- **Pedidos:** 31 y 29 de `03-cierre-comercial/registro-de-cambios.md`. El 18 queda resuelto por el 23 (la cotización ya lleva varios servicios).
- **Historias que cambian:** HU-25 (cotizar), HU-28 (seguimiento), HU-30 (agendar), HU-39 (inicio)
- **Base:**
  - Lo que dejó P23 (`P23-cotizacion-directa.md`): la cotización directa, con el cliente y su vehículo; "Agendar" la deja aceptada.
  - Lo que dejó C3 (`C3-agenda-pagos.md`): la reserva desde una cotización o directa; cancelarla devuelve la cotización.
  - Lo que dejó P26 (`P26-rediseno-panel.md`): el panel estándar (tarjetas, insignias, una acción principal por pantalla).
- **Maqueta del recorrido:** `material/maqueta-flujo/` (local; solo el orden de los pasos: la estética es la del panel).

## 1. Objetivo
El dueño dijo que el camino de la cotización a la reserva "no se siente fluido ni claro". Para él es **un solo trabajo que avanza**: pide precio, acepta, se reserva, entra al taller, queda listo y se entrega. Cada pantalla de ese trabajo muestra **en qué paso está** y **un solo botón** para el siguiente. Los dos caminos que hoy no se conocen (reservar desde la cotización y reservar desde la Agenda) llevan al mismo lugar y nunca hacen escribir dos veces los servicios y los precios.

## 2. Alcance

### Parte 1
- **A1. Los pasos del trabajo**, arriba de la cotización, de la reserva y de la orden: Cotizada, Aceptada, Reservada, En el taller, Lista y Entregada, con el paso actual marcado. Una reserva sin cotización empieza en Reservada.
- **A2. Dos acciones claras en una cotización pendiente** (reemplazado el 04/11, ver "Cambió el 04/11"):
  - **"Aceptó: reservar"** (la principal, en lugar de "Agendar"): lleva a la reserva con la cotización.
  - **"Aceptó, sin fecha"**: la deja aceptada sin reserva. Queda en "Aceptadas" con la insignia "Sin fecha" y su principal pasa a ser **"Reservar"**.
  - Una aceptada sin fecha se puede rechazar o volver a pendiente (en "Más"), como una pendiente.
- **A3. Nueva reserva conoce las cotizaciones:** al elegir el cliente y su vehículo, si tiene cotizaciones pendientes o aceptadas sin fecha, se ofrecen arriba ("Usar la cotización 2026-0002") antes de armar una directa. Quien no tiene Pagos (no arma directas) también llega a elegir al cliente y ve sus cotizaciones, en lugar del aviso de hoy.
- **A4. El recorrido no se corta** ("Volver" y el aviso, reemplazados el 04/11): desde una cotización, "Volver" de la reserva lleva a esa cotización. El aviso al reservar dice qué pasó: "Reservada para el jueves 5/11 en el Espacio 2. La cotización 2026-0002 quedó aceptada."
- **C1. Inicio:** "Para atender" suma las **aceptadas sin fecha** con "Reservar". "Para hoy" dice en cada fila **el paso siguiente** (Recibir, Empezar, Marcar lista, Avisar, Entregar).

### Parte 2
- **B1. Cotizar sin registrar:** la cotización pide nombre, WhatsApp, el vehículo (marca y modelo, el tamaño y, si la tiene, la placa), los servicios y si fue en persona o por fotos. El cliente y su vehículo quedan registrados recién al reservar.
- **B2. Sin duplicados:** al escribir el WhatsApp se busca entre los clientes. Si ya existe, se muestra "Ya es cliente: Fernando Rocha" con sus vehículos para elegir, y la cotización queda con él (como hoy). Si no, la cotización guarda el nombre y el WhatsApp. Al reservar, se vuelve a buscar por WhatsApp (puede haberse registrado mientras tanto) y por placa: si existen, se usan; si no, se crean. El WhatsApp ya es único en la base (`cliente_telefono_unico`) y la placa, única entre los vehículos activos: aunque dos personas reserven a la vez, no se crean dos.
- **B3. Placa opcional (pedido 29):** un vehículo sin placa (recién importado) se nombra por marca, modelo, año y color, con el chasis opcional. Donde hoy va la placa grande, va "Sin placa" y su descripción.

- **No incluye:** cambiar las etapas del taller (recibir, checklist, fotos, avisar, entregar y firmar ya existen); una vista nueva para el taller (el perfil Taller ya ve "Para hoy" con el paso siguiente, C1); los avisos automáticos (pedido 22).

### Cambió el 04/11: Cotizaciones cotiza y la Agenda reserva
Con la parte 1 hecha, YankoSoft vio que dos botones parecidos y dos entradas confundían. Reemplaza a A2 y A4 (maqueta aprobada: https://claude.ai/artifact/7JNeFSikgG3Fzb9kiuAnVP):
- **Cotización pendiente:** un solo botón, **"Aceptó"**, sin confirmación: se deshace con "Volver a pendiente". Queda aceptada con la insignia "Sin fecha".
- **Aceptada sin fecha:** el atajo **"Reservar en Agenda"**, solo para quien ve la Agenda.
- **Agenda:** **"Por reservar"** arriba del tablero, con las aceptadas sin reserva; las que esperan hace más tiempo, primero. Sin ninguna, no ocupa lugar. La Agenda es el único lugar donde se reserva: "Volver" de Nueva reserva siempre lleva a ella.
- **Inicio:** las aceptadas sin fecha llevan directo a la reserva a quien ve la Agenda.
- **Nueva reserva:** el botón final dice **"Reservar"**, igual que "Por reservar" y "Reservar en Agenda". También dicen "Reservar" los enlaces que la abren desde el tablero de la Agenda y desde Mantenimientos.
- **Sin cambios:** Nueva reserva sigue ofreciendo las cotizaciones del vehículo (también las pendientes), y el tablero y Mantenimientos abren el mismo formulario.

**Avisos:** los de éxito son flotantes y temporales, también al llegar a otra pantalla (`AvisoFlotante`); no se repiten al recargar, al volver atrás ni tras otra acción en la misma pantalla. Reemplaza a `AvisoEnPagina`. Lo que impide seguir (el PDF que no se generó) queda a la vista.

## 3. Reglas que se cumplen
- RN-02: una cotización enviada no cambia; reservar desde ella copia sus líneas y precios, nunca se vuelven a escribir.
- RN-12: sin Pagos ni Cotizaciones no se ven montos: la oferta de cotizaciones en Nueva reserva muestra el total solo a quien los ve.
- RF-36: la cotización queda aceptada con "Aceptó", o al reservarla.
- Una cotización tiene como mucho una reserva activa: una aceptada sin fecha se reserva una vez; si se cancela la reserva, vuelve como hoy (C3).

## 4. Datos
**Parte 1: sin migración.** "Aceptada sin fecha" es la consulta en `confirmado` con su cotización vigente en `aceptada` y **sin trabajo activo** (no cancelado). Se calcula al leer.
- Reservar desde una cotización acepta: la pendiente (`consulta.cotizado` y cotización `enviada`) o la aceptada sin fecha (`consulta.confirmado`, cotización `aceptada`, sin trabajo activo).
- `transicionPermitida`: desde `confirmado` se puede ir a `perdido` o `cotizado` solo si no tiene trabajo activo.

**Parte 2 (con migración, se detalla al empezarla):** `consulta.cliente_id` y `vehiculo_id` pasan a opcionales, con `nombre`, `telefono`, `vehiculo_texto` y `tamano_id` para la que no tiene cliente (una restricción exige uno u otro); `vehiculo.placa` opcional con `chasis`.

## 5. Pantallas y rutas (parte 1)
- `/panel/cotizaciones/[id]`: los pasos arriba; en una pendiente, "Aceptó" (principal); en una aceptada sin fecha, "Reservar en Agenda" (principal, solo con Agenda) y la insignia "Sin fecha"; "Más" con Rechazar y Volver a pendiente.
- `/panel/cotizaciones?vista=aceptadas`: la insignia "Sin fecha" en las que no tienen reserva.
- `/panel/agenda/nueva?cotizacion=`: acepta también la aceptada sin fecha; "Volver" a la Agenda. Con el cliente o el vehículo desactivados, lo dice antes del formulario. Los precios de la cotización, con Pagos o con Cotizaciones.
- `/panel/agenda`: "Por reservar (N)" arriba del tablero, con las cinco que esperan hace más tiempo a la vista y las demás plegadas.
- `/panel/agenda/nueva` (directa o sin Pagos): 768 px de ancho, como Nueva cotización. Después de elegir cliente y vehículo, "Sus cotizaciones" si las hay, y la reserva sin cotización plegada detrás de "＋ Reserva sin cotización" (sin cotizaciones, a la vista).
- `/panel/agenda/[id]` y `/panel/ordenes/[id]`: los pasos arriba; el aviso de reserva con el día, el espacio y la cotización.
- `/panel` (Inicio): aceptadas sin fecha en "Para atender"; el paso siguiente en "Para hoy".

## 6. Acciones del servidor (parte 1)
- `cambiarEstadoCotizacion` suma la acción `aceptar` (de pendiente a aceptada sin fecha): con el permiso "Cotizaciones", con la consulta bloqueada; deja la cotización vigente en `aceptada`.
- `rechazar` y `reabrir` aceptan también una aceptada sin fecha (sin trabajo activo, mirado con el bloqueo).
- `agendarReserva` desde una cotización: acepta la aceptada sin fecha, con el mismo orden de bloqueos (consulta y después cotización, QA-10).

## 7. Componentes y diseño
- `PasosTrabajo` (`src/componentes/panel/pasos-trabajo.tsx`): barras de pasos: las hechas en tinta, la actual en azul con `aria-current="step"`, las que faltan en el borde; sin rojo, que es del botón principal. En el celular, "Paso 3 de 6: Reservada" sobre las barras; desde `@xl`, el nombre debajo de cada una. Ocupa el ancho de su pantalla. En la orden reemplaza a sus tres pasos con círculos: uno solo por pantalla, y el botón grande sigue debajo (`EstadoOrden`).
- Todo con los tokens y componentes del panel (`EncabezadoPagina`, `Insignia`, `tt-tarjeta-panel`, `buttonVariants`), sin la estética de la maqueta.

## 8. Textos de la interfaz
- Botones: "Aceptó", "Reservar en Agenda".
- Insignia: "Sin fecha".
- Aviso al aceptar: "Cotización aceptada. Queda en Por reservar hasta que tenga fecha."
- Aviso al reservar: "Reservada para el {día} en el {espacio}." y, desde una cotización, "La cotización {número} quedó aceptada."
- "Para atender": "Cotización aceptada de {cliente}", detalle "{total}, sin fecha" (sin total si no ve montos), acción "Reservar".

## 9. Pruebas
- **Unitarias:** `pasoDelTrabajo` (cada estado de cotización y de trabajo, con y sin cotización); `transicionPermitida` con la aceptada con y sin trabajo; el paso siguiente de cada fila de "Para hoy".
- **E2E:** "Aceptó" la deja en Aceptadas con "Sin fecha" y en "Por reservar", y desde ahí se reserva; volver a pendiente la saca de la lista; desde Nueva reserva se elige un cliente con cotización y se usa (los precios llegan sin escribirlos); "Volver" lleva a la Agenda; el encargado sin Pagos elige al cliente y reserva su cotización; los pasos marcan el actual en la cotización, la reserva y la orden.

## 10. Orden de trabajo
1. Parte 1, rama `pedido-31-flujo-de-un-trabajo`: esta especificación, reglas y unitarias, acciones, pantallas, E2E, revisión y PR.
2. Parte 2, rama propia: el detalle de datos de §4 en esta especificación, migración, pantallas, E2E, revisión y PR.

## 11. Criterio de salida
- El recorrido de la maqueta se hace en el panel sin escribir dos veces un precio y sin perder el lugar.
- El E2E completo pasa (también en WebKit) y las capturas a 360 y 1280 px no se salen de la pantalla.

## 12. Decisiones abiertas
| Qué | De quién | Mientras tanto |
|---|---|---|
| ¿La parte 2 va incluida o cotizada? | Dueño | Se programa después de la parte 1, con su visto bueno |
| ¿El encargado sin Cotizaciones puede marcar "Aceptó"? | Dueño | No: cambia el estado de la cotización, va con "Cotizaciones" |
