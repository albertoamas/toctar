# Criterios de aceptación — Entrega 2 (Gestión)

- **Fuente:**
  - `05-analisis/historias-de-usuario/historias.md` (HU-19 a HU-41).
  - Las especificaciones de etapa en `08-desarrollo/etapas/` (C1 a C5).
  - Los ajustes de la reunión con el dueño (`08-desarrollo/ajustes-reunion-dueno.md`, pedidos 12, 13, 21, 23, 24, 26, 27, 28 y 30) y el pedido 32 (dos roles, sin técnico asignado).
- **Uso:**
  - Es la lista con la que el dueño revisa y firma el acta de la entrega 2 (`actas-de-aceptacion/entrega-2.md`).
  - Con ella se hace la prueba completa en `pruebas.toctardetailing.com` y se arma la capacitación por rol.
  - Se actualiza con cada cambio que entre antes del acta (por ejemplo, los pedidos 29 y 31 si se aprueban).
- **Estados:**
  - ✅ cumple y tiene prueba automática.
  - 🟢 cumple, revisado a mano.
  - ⏳ pendiente (casi siempre, la prueba en un celular real con https o algo que carga el dueño).
  - ⚠️ ajustado respecto de la historia original (el motivo está en la nota).
- **Las pruebas E2E corren dos veces:** en un celular (Pixel 7) y en una computadora. Las unitarias están en `tests/unit/`.

## Resumen

| Historia | Etapa | Estado |
|---|---|---|
| HU-19 Catálogo con variantes | C1 | ✅ Terminada (el mantenimiento cambió con el pedido 21) |
| HU-20 Precios por tamaño y duración | C1 | ✅ Terminada. Falta la lista de precios real del dueño |
| HU-21 Registrar clientes y vehículos | C1 | ✅ Terminada (la placa obligatoria cambia si se aprueba el pedido 29) |
| HU-22 Buscar clientes | C1 | ✅ Terminada |
| HU-23 Ficha del cliente | C1 | ✅ Terminada |
| HU-24 Registrar consulta | C2 | ⚠️ Reemplazada por la cotización directa (pedido 23) |
| HU-25 Armar cotización | C2 | ✅ Terminada (en una pantalla, pedidos 23 y 24) |
| HU-26 PDF de la cotización | C2 | ✅ Terminada, sin fotos (pedido 27). Falta revisarlo impreso y que el dueño confirme condiciones, garantía y formas de pago |
| HU-27 Compartir el PDF | C2 | ✅ Terminada. Falta probarlo en un celular real con https |
| HU-28 Seguimiento de cotizaciones | C2 | ✅ Terminada |
| HU-29 Tablero de la agenda | C3 | ✅ Terminada |
| HU-30 Agendar reserva | C3 | ✅ Terminada |
| HU-31 Reprogramar o cancelar | C3 | ✅ Terminada |
| HU-32 Registrar pagos y saldo | C3 | ✅ Terminada. Falta la foto del comprobante desde un celular real |
| HU-33 Recibir vehículo | C4 | ✅ Terminada, con el checklist parte por parte (pedidos 12 y 26) |
| HU-34 Trabajar una orden | C4 | ✅ Terminada, con fotos de inicio y final (pedido 27), historial (pedido 28) y sin técnico asignado (pedido 32) |
| HU-35 Avisar vehículo listo | C4 | ✅ Terminada |
| HU-36 Entregar vehículo | C4 | ✅ Terminada, con la firma del cliente (pedido 13) |
| HU-37 Saldos pendientes | C4 | ✅ Terminada, con búsqueda y orden (pedido 30) |
| HU-38 Recordatorios de mantenimiento | C4 | ✅ Terminada, con planes por vehículo (pedidos 20 y 21) |
| HU-39 Pantalla del día | C5 | ✅ Terminada |
| HU-40 Plantillas de WhatsApp | C5 | ✅ Terminada |
| HU-41 Fotos de órdenes a la galería | C5 | ✅ Terminada |

**Revisión manual de YankoSoft:**
- **02/11/2026, en local, a 390 y 1280 px:** el ciclo completo por la pantalla con los tres roles de entonces (antes del pedido 32; cotizar con un cliente nuevo, agendar, recibir con el checklist, el técnico empieza, sube la foto de inicio y la marca lista, avisar, cobrar, firmar y entregar), con 39 capturas revisadas. Sin pasos que fallen ni pantallas que se salgan. El técnico no ve precios, pagos ni teléfonos; el encargado sin Pagos ni Cotizaciones no ve montos. Salieron dos detalles, corregidos (ver "Errores encontrados").
- **Pendiente:** lo mismo en `pruebas.toctardetailing.com` desde un celular real (los ⏳ de abajo), con los dos roles: dueño; encargado con y sin cada permiso, y con el perfil Taller.

---

## HU-19 Catálogo con variantes

> Como dueño, quiero definir variantes de cada servicio, para cotizar con opciones.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 19.1 | Agrego variantes a un servicio (por ejemplo, 1, 2, 3, 5 y 10 años), las renombro y las desactivo | E2E `hu-19-20` "las variantes se agregan, renombran y desactivan en el catálogo; una nueva pide sus precios" | ✅ |
| 19.2 | Cada servicio dice cuál es su mantenimiento (otro servicio o él mismo) y cada cuántos meses | E2E `hu-19-20` "el dueño marca el mantenimiento…" y `hu-38` "entregar el mantenimiento lo deja hecho y programa el siguiente…" | ⚠️ Antes era una casilla "genera recordatorio" con un intervalo único; el pedido 21 lo cambió a un plan por servicio |
| 19.3 | Desactivo un servicio o una variante sin perder el historial; el servicio desactivado sale del sitio | E2E `hu-19-20` "…desactiva un servicio, que sale del sitio"; unitarias `catalogo` | ✅ |
| 19.4 | Un servicio que otro usa como su mantenimiento no se desactiva | E2E `hu-19-20` "un servicio que otro usa como su mantenimiento no se desactiva (pedido 21)" | ✅ (agregado) |
| 19.5 | Solo el dueño entra al catálogo (lleva precios, RN-01); ningún encargado | E2E `hu-19-20` "ningún encargado entra al catálogo, ni con todos sus permisos ni con el perfil Taller" | ✅ |

## HU-20 Precios por tamaño y duración

> Como dueño, quiero cargar precios por tamaño de vehículo y la duración de cada servicio, para que el sistema me sugiera precios y fechas.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 20.1 | Cada variante tiene un precio por tamaño de vehículo; vacío es "según evaluación" | E2E `hu-19-20` "el dueño carga precios por tamaño; vacío es según evaluación…" | ✅ |
| 20.2 | Cada servicio tiene su duración en días, que la reserva sugiere | E2E `hu-19-20` "…cambia la duración…" y `hu-30` (la reserva sugiere la duración) | ✅ |
| 20.3 | Cada cambio de precio queda registrado con fecha y usuario | E2E `hu-19-20` "…cada cambio queda en el historial" | ✅ |
| 20.4 | Los precios reales del taller están cargados | El dueño entrega la lista de precios y sus variantes; se carga en producción al publicar | ⏳ (del dueño) |

## HU-21 Registrar clientes y vehículos

> Como personal, quiero registrar clientes y sus vehículos, para tener su historial.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 21.1 | Cliente: nombre y WhatsApp obligatorios; correo, NIT y razón social opcionales (plegados en "Agregar correo, NIT y notas") | E2E `hu-21` "el personal registra un cliente con su primer vehículo…" y "lo opcional está plegado…" | ✅ |
| 21.2 | Vehículo: placa y tamaño obligatorios; marca, modelo, año y color opcionales. Un cliente también se registra sin vehículo | E2E `hu-21` "…con su primer vehículo; los obligatorios vacíos muestran su error" y "un cliente se registra sin vehículo" | ✅ (cambia si se aprueba el pedido 29, vehículos sin placa) |
| 21.3 | Si el WhatsApp o la placa ya existen, avisa de quién son y lleva a su ficha | E2E `hu-21` "un teléfono o una placa repetidos avisan de quién son y llevan a su ficha" | ✅ |
| 21.4 | El encargado entra a Clientes solo con el permiso | E2E `hu-21` "el encargado entra a Clientes solo con el permiso; el perfil Taller no" | ✅ |

## HU-22 Buscar clientes

> Como personal, quiero encontrar un cliente rápido, para atenderlo mientras escribe por WhatsApp.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 22.1 | Busco por parte del nombre (sin importar tildes), del WhatsApp o de la placa | E2E `hu-22` "se busca por parte del nombre sin tildes, por teléfono parcial y por placa…" | ✅ |
| 22.2 | Los resultados aparecen mientras escribo | E2E `hu-22` (misma prueba: sin tocar "Buscar") | ✅ |
| 22.3 | Los clientes desactivados no salen en la lista, pero se ven aparte | E2E `hu-22` "los desactivados no salen en la lista, pero se ven aparte" | ✅ (agregado) |
| 22.4 | Un cliente con muchos vehículos muestra tres placas y cuántas más; la buscada se ve siempre | E2E `hu-22` "un cliente con cinco vehículos muestra tres placas…" | ✅ (agregado) |

## HU-23 Ficha del cliente

> Como personal, quiero ver todo lo de un cliente en un lugar, para atenderlo con contexto.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 23.1 | Muestra sus datos y vehículos; los datos se leen y se editan en un modal | E2E `hu-23` "en la ficha los datos se leen y se editan en un modal…" y "los vehículos se agregan, editan, desactivan y reactivan…" | ✅ |
| 23.2 | Muestra sus cotizaciones, sus reservas y órdenes y, a quien ve pagos, lo que debe | E2E `hu-25` "desde la ficha del cliente: …la cotización queda en su ficha" y `hu-32` (la ficha dice "Debe 300 Bs" con una entregada con saldo, y nada con una agendada) | ✅ |
| 23.3 | Desde la ficha inicio una cotización o una reserva, o abro su WhatsApp | E2E `hu-25` (desde la ficha, el cliente llega elegido) y `hu-30` (reserva directa) | ✅ |
| 23.4 | Un cliente se desactiva desde "Más", con confirmación, y se reactiva | E2E `hu-23` "un cliente se desactiva desde «Más» con confirmación…" | ✅ (agregado) |
| 23.5 | Sus mantenimientos: agregar uno anterior al sistema, cambiar el plan y terminarlo | E2E `hu-38` "en la ficha del cliente: agregar un mantenimiento anterior al sistema…" | ✅ (agregado, pedidos 17 y 21) |

## HU-24 Registrar consulta (reemplazada)

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 24.1 | No hay consulta aparte: lo que hacía (registrar al cliente y su vehículo) pasó a la cotización (25.1). Las direcciones viejas de Consultas llevan a Cotizaciones | E2E `hu-28` "las direcciones de Consultas llevan a Cotizaciones; una consulta vieja sin cotizar no aparece" | ⚠️ Pedido 23: el dueño pidió cotizar directo ("le agrega complicación innecesaria") |

## HU-25 Armar cotización

> Como dueño o encargado con el permiso "Cotizaciones", quiero armar una cotización en una sola pantalla con precios sugeridos, para cotizar rápido sin equivocarme.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 25.1 | Elijo al cliente o lo registro ahí mismo, con su vehículo, en una sola pantalla | E2E `hu-25` "cliente nuevo en una sola pantalla…" y "un WhatsApp repetido avisa y ofrece cotizarle a ese cliente…" | ⚠️ Pedido 23 (antes, consulta y después cotización) |
| 25.2 | Agrego servicios y variantes; el precio se sugiere por el tamaño del vehículo y lo puedo cambiar | E2E `hu-25` "cliente nuevo…: …los servicios con el precio del tamaño…"; unitarias `cotizaciones` | ✅ |
| 25.3 | Agrego descuento; se calculan el total y el adelanto sugerido. El descuento no pasa el subtotal ni el adelanto el total | E2E `hu-25` "el descuento no pasa el subtotal, el adelanto no pasa el total…"; unitarias `cotizaciones` | ✅ |
| 25.4 | Indico cómo se cotizó: en persona o por fotos; por fotos es un estimado y el PDF lo dice (RN-03) | E2E `hu-25` "…y por fotos" y `hu-26`; unitarias `pdf-cotizacion` | ✅ |
| 25.5 | La validez se sugiere desde Configuración y no puede ser anterior a hoy | E2E `hu-25` "…la validez no es anterior a hoy"; `hu-05` (el parámetro) | ✅ |
| 25.6 | Cotizan el dueño y el encargado con "Cotizaciones"; el servidor rechaza a los demás (RN-01) | E2E `hu-25` "pedido 24: el encargado con Cotizaciones cotiza y ve los montos; sin el permiso no entra; el perfil Taller tampoco"; unitarias `permisos` | ⚠️ Pedido 24 (antes, solo el dueño) |
| 25.7 | Un cambio a una cotización enviada crea una versión nueva con el mismo número; la anterior no cambia (RN-02) | E2E `hu-25` "nueva versión: el mismo número, la anterior queda reemplazada…" | ✅ |

## HU-26 PDF de la cotización

> Como dueño, quiero un PDF profesional, para entregarlo impreso o por WhatsApp.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 26.1 | Lleva logo, datos del negocio, cliente y vehículo, número y fecha, detalle, total, adelanto, validez, formas de pago, condiciones y garantía | E2E `hu-26` "al guardar se genera el PDF…"; unitarias `pdf-cotizacion` | ⚠️ Sin fotos: el pedido 27 sacó las fotos de la cotización |
| 26.2 | Una versión nueva no cambia el PDF anterior; si una quedó sin PDF, su ficha lo genera | E2E `hu-26` "…una versión nueva no cambia el anterior" y "si una cotización quedó sin PDF, su ficha lo genera" | ✅ |
| 26.3 | El texto de condiciones, garantía y formas de pago sale de Configuración | E2E `hu-05` (Parámetros) y unitarias `pdf-cotizacion` | ✅ |
| 26.4 | Se ve bien impreso en A4 y en la pantalla del celular | Revisión a mano: imprimirlo y abrirlo en un celular real | ⏳ |
| 26.5 | El encargado sin "Cotizaciones" no abre el PDF | E2E `hu-26` "RN-01: el encargado sin Cotizaciones, también con el perfil Taller, no abre el PDF" | ✅ |
| 26.6 | Los textos reales de condiciones, garantía y formas de pago | Los confirma el dueño (hay un borrador cargado) | ⏳ (del dueño) |

## HU-27 Compartir el PDF

> Como dueño, quiero mandar el PDF desde el celular, para no pasar por la computadora.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 27.1 | En el celular, "Compartir" abre el menú del teléfono con el PDF adjunto | E2E `hu-27` "con el menú del teléfono, comparte el PDF con su nombre", "si el teléfono pide otro toque…" y "…avisa y no queda trabado" | ✅ |
| 27.2 | En la computadora, el PDF se descarga o se imprime | E2E `hu-27` "sin menú de compartir archivos, lo descarga" | ✅ |
| 27.3 | Compartirlo por WhatsApp desde un celular real, Android y iPhone | Revisión a mano en `pruebas.toctardetailing.com` (necesita https) | ⏳ |

## HU-28 Seguimiento de cotizaciones

> Como dueño, quiero ver qué cotizaciones esperan respuesta, para recuperar clientes que se enfrían.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 28.1 | Lista por estado (pendientes, aceptadas y rechazadas), con búsqueda por cliente, teléfono, placa o número; las pestañas cuentan lo encontrado | E2E `hu-28` "se busca por placa o número, y las pestañas cuentan lo encontrado" | ✅ |
| 28.2 | Las pendientes, de más antigua a más nueva; las que pasan los días de Configuración dicen "Sin respuesta" | E2E `hu-28` "pendientes por antigüedad…"; unitarias `cotizaciones` | ✅ |
| 28.3 | Rechazo con un motivo (precio, no respondió, otro con detalle) y vuelvo a pendiente | E2E `hu-28` "rechazar desde «Más», con motivo, y volver a pendiente…" | ✅ |
| 28.4 | Al agendar, la cotización pasa sola a aceptada | E2E `hu-30` "desde la cotización: la versión y la cotización quedan aceptadas…" | ✅ |

## HU-29 Tablero de la agenda

> Como personal, quiero ver la ocupación del taller por espacio y día, para saber cuándo hay lugar.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 29.1 | Vista semanal: filas por espacio, columnas por día; cada reserva ocupa los días de su duración | E2E `hu-29` "las reservas ocupan sus días en su espacio…"; unitarias `agenda` | ✅ |
| 29.2 | Cada bloque muestra placa, servicio y estado, con el color de su estado (sin técnico, pedido 32); al tocarlo se abre | E2E `hu-29` y `hu-34` "…la agenda las muestra en verde" (las entregadas siguen marcadas, pedido 28) | ✅ |
| 29.3 | Arranca en la semana de hoy y la marca; un día libre lleva a agendar ahí | E2E `hu-29` "el tablero arranca en la semana de hoy y la marca" y "…un día libre lleva a agendar ahí" | ✅ |
| 29.4 | Funciona en el celular (vista por día) | Las E2E `hu-29` corren también en el celular | ✅ |

## HU-30 Agendar reserva

> Como personal, quiero agendar una reserva sin cruces, para dejar de usar el cuaderno.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 30.1 | Desde una cotización pendiente ("Agendar": el cliente aceptó) o como reserva directa | E2E `hu-30` "desde la cotización…" y "reserva directa: cliente y vehículo registrados, servicio del catálogo con su precio…" | ⚠️ "Cotización confirmada" pasó a ser "pendiente que se acepta al agendar" (pedido 23) |
| 30.2 | Sugiere la duración y solo ofrece espacios libres en esos días (RN-06); si dos personas agendan el mismo espacio a la vez, una recibe un aviso | E2E `hu-30` "solo se ofrecen los espacios libres…" y "la base rechaza un cruce en el mismo espacio aunque el código fallara…"; unitarias `agenda` | ✅ |
| 30.3 | Registro el adelanto con el monto sugerido, editable (RN-04); no se asigna un técnico (pedido 32) | E2E `hu-30` "desde la cotización: …el adelanto registrado" | ✅ |
| 30.4 | El encargado con Agenda y sin Pagos agenda sin ver montos; sin Agenda no entra | E2E `hu-30` "el encargado con Agenda sin Pagos agenda sin montos ni adelanto; sin Agenda no entra" | ✅ |
| 30.5 | Desde el tablero, el día y el espacio llegan elegidos y "Cambiar" cliente no los pierde | E2E `hu-30` "«Cambiar» vuelve a elegir el cliente sin perder el día y el espacio…" | ✅ (agregado) |

## HU-31 Reprogramar o cancelar

> Como personal, quiero mover o cancelar una reserva, para reflejar lo que pide el cliente.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 31.1 | Al reprogramar solo se ofrecen espacios libres en las fechas nuevas | E2E `hu-31` "reprogramar solo ofrece espacios libres en las nuevas fechas y mueve la reserva" | ✅ |
| 31.2 | Al cancelar pido un motivo; el adelanto queda como ingreso (RN-05), el espacio se libera y la cotización pasa a rechazada | E2E `hu-31` "cancelar pide motivo, deja los pagos, libera el espacio…"; unitarias `agenda` | ✅ |

## HU-32 Registrar pagos y saldo

> Como personal, quiero registrar cada pago, para saber cuánto falta cobrar.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 32.1 | Registro monto, método (QR, efectivo, transferencia), fecha, tipo y foto opcional del comprobante; no paso el saldo | E2E `hu-32` "registrar un pago con comprobante, no pasar el saldo y anular con motivo"; unitarias `pagos` | ✅ |
| 32.2 | El saldo se recalcula al instante; pagada por completo, no ofrece más pagos | E2E `hu-32` "pagada por completo no ofrece más pagos…" | ✅ |
| 32.3 | Un pago no se borra: se anula con motivo y queda en el historial | E2E `hu-32` "…anular con motivo" | ✅ |
| 32.4 | Sin el permiso Pagos no se ven montos | E2E `hu-32` "…sin Pagos no se ven montos" | ✅ |
| 32.5 | La foto del comprobante desde la cámara de un celular real | Revisión a mano (necesita https) | ⏳ |

## HU-33 Recibir vehículo

> Como personal, quiero registrar el estado del vehículo al ingresar, para evitar reclamos por daños previos.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 33.1 | Desde la reserva, "Recibir": el checklist con las partes de Configuración; cada una se marca "Bien" o "Detalle" (qué tiene, una nota y su foto) y "Bien" se vuelve a tocar para desmarcarla | E2E `hu-33-checklist` "se revisa parte por parte: bien o con un detalle y su foto…"; unitarias `ordenes` | ⚠️ Pedido 12 (antes, solo fotos y observaciones) y pedido 26 (marcar y desmarcar como interruptor) |
| 33.2 | Sin revisar todas las partes no se recibe; con todas bien, se recibe al primer toque. Después de recibir, el checklist no cambia | E2E `hu-33-checklist` "…sin revisar todo no se recibe…" y "todas bien se recibe al primer toque; después de recibir el checklist no cambia" | ✅ |
| 33.3 | Anoto observaciones (sin técnico, pedido 32); se crea la orden "recibida" con el precio cotizado | E2E `hu-33-recibir` "recibir con observaciones: la reserva pasa a orden…" | ✅ |
| 33.4 | Antes de su día no se recibe; si llega tarde, se recibe igual | E2E `hu-33-recibir` "antes de su día no se recibe; tarde, se recibe…" | ✅ |
| 33.5 | Si la reserva se cancela, el checklist y sus fotos se descartan | E2E `hu-33-recibir` "si la reserva se cancela, el checklist y sus fotos…" | ✅ (agregado) |
| 33.6 | El checklist con fotos desde la cámara de un celular real | Revisión a mano (necesita https) | ⏳ |

## HU-34 Trabajar una orden

> Como personal del taller, quiero ver las órdenes y registrar el avance, para que el dueño sepa cómo va cada vehículo.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 34.1 | Con el permiso de Órdenes se ven todas, sin técnico asignado; sin Pagos, sin precios (RN-12) | E2E `hu-33-recibir` (otro del perfil Taller la ve sin precios), `hu-34-historial` "el perfil Taller ve en «Entregadas» todas, sin precios"; unitarias `permisos` | ✅ |
| 34.2 | Cambia el estado (en proceso, listo), sube fotos de inicio y del final, y escribe avances; al marcarla lista, el espacio se libera | E2E `hu-34-trabajar-orden` "el perfil Taller trabaja cualquier orden: empieza, sube fotos, escribe avances y la marca lista…" | ⚠️ Pedido 27: fotos de inicio y del final, sin fotos "durante" |
| 34.3 | Se puede extender la entrega a otro espacio libre; el dueño ve las órdenes agrupadas por estado | E2E `hu-34-trabajar-orden` "extender la entrega…; las listas del dueño por estado" | ✅ (agregado) |
| 34.4 | Las órdenes entregadas se buscan por placa, cliente o fecha | E2E `hu-34-historial` "en «Entregadas» se buscan por placa, cliente o fecha…" | ✅ (agregado, pedido 28) |
| 34.5 | No se asigna un técnico: la reserva, recibir y la orden no lo piden, y la orden dice quién hizo cada paso | E2E `hu-33-recibir` (sin el campo), `hu-34-trabajar-orden` (la orden no dice a quién está asignada) y `flujo-taller-completo` | ⚠️ Pedido 32 (antes, técnico opcional) |

## HU-35 Avisar vehículo listo

> Como personal, quiero avisar al cliente con un toque, para no escribir el mismo mensaje cada vez.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 35.1 | En una orden lista, "Avisar" abre WhatsApp con el mensaje escrito (nombre, vehículo y saldo) | E2E `hu-35` "avisar abre WhatsApp con nombre, vehículo y saldo…"; unitarias `mensajes-orden` | ✅ |
| 35.2 | Queda registrado quién avisó y cuándo | E2E `hu-35` (misma prueba) | ✅ |
| 35.3 | Sin Pagos el mensaje no lleva el saldo | E2E `hu-35` "sin Pagos el mensaje no lleva el saldo" | ✅ |

## HU-36 Entregar vehículo

> Como personal, quiero cerrar la orden al entregar, para que todo quede registrado.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 36.1 | Veo precio final, pagos y saldo; el dueño suma servicios adicionales | E2E `hu-36` "pagada: el dueño suma un adicional, se cobra y se entrega…" | ✅ |
| 36.2 | Con saldo, solo el dueño o el encargado con "autorizar entrega con saldo" entrega, y queda quién lo autorizó (RN-13) | E2E `hu-36` "con saldo: el encargado sin el permiso no entrega; con el permiso sí…"; unitarias `ordenes` | ✅ |
| 36.3 | Si el servicio tiene mantenimiento, queda programado el próximo (RN-08) | E2E `hu-36` "…queda programado el mantenimiento" y `hu-38`; unitarias `mantenimientos` | ✅ |
| 36.4 | El cliente firma con el dedo; si no puede, se entrega sin firma con el motivo | E2E `hu-36` "sin firma ni «Entregar sin firma» no se entrega; sin firma pide el motivo (pedido 13)" | ⚠️ Agregado por el pedido 13 |
| 36.5 | La firma con el dedo en un celular real | Revisión a mano | ⏳ |

## HU-37 Saldos pendientes

> Como dueño, quiero ver quién me debe, para cobrarlo.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 37.1 | Lista de órdenes entregadas con saldo, con cliente, monto y días | E2E `hu-37` "la entregada con saldo aparece, con su WhatsApp…" | ✅ |
| 37.2 | Desde cada una abro WhatsApp o registro el pago | E2E `hu-37` "…y se cobra desde la lista aunque no se vean órdenes" | ✅ |
| 37.3 | Busco por cliente, teléfono o placa y ordeno por antigüedad, monto o cliente; el total por cobrar es el de todas | E2E `hu-37` "pedido 30: se buscan por cliente, teléfono o placa y se ordenan…" | ✅ (agregado, pedido 30) |
| 37.4 | Sin Pagos no se entra, tampoco con el perfil Taller | E2E `hu-37` "sin Pagos no se entra a los saldos, tampoco con el perfil Taller" | ✅ |

## HU-38 Recordatorios de mantenimiento

> Como personal, quiero ver a quién le toca mantenimiento, para traerlos de vuelta al taller.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 38.1 | Mantenimientos vencidos y próximos (15 días) ordenados por fecha; "Más adelante" y "Cerrados" en sus pestañas | E2E `hu-38` "vencidos y próximos…"; unitarias `mantenimientos` | ✅ (las pestañas, pedido 20) |
| 38.2 | "Avisar" abre WhatsApp con el mensaje escrito; después, agendado o "No le interesa" | E2E `hu-38` "…avisar, no le interesa y agendar (y al cancelar la reserva, vuelve)" | ✅ |
| 38.3 | "Agendar" abre una reserva directa del servicio de mantenimiento; si se cancela, el mantenimiento vuelve | E2E `hu-38` (misma prueba) | ✅ |
| 38.4 | Entregar el mantenimiento lo deja hecho y programa el siguiente con la frecuencia del plan, también si el cliente vino por su cuenta | E2E `hu-38` "entregar el mantenimiento lo deja hecho y programa el siguiente…" | ⚠️ Pedido 21: planes por vehículo (antes, un intervalo único) |
| 38.5 | Solo con Mantenimientos se entra; sin Agenda y Pagos no se agenda; el perfil Taller no entra | E2E `hu-38` "solo con Mantenimientos se entra…" | ✅ |
| 38.6 | Los servicios con mantenimiento y su frecuencia están cargados | Lo carga el dueño en el catálogo | ⏳ (del dueño) |

## HU-39 Pantalla del día

> Como dueño, quiero ver lo del día al abrir el sistema, para organizarme rápido.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 39.1 | Muestra los números del día, lo que llega (y lo atrasado), las entregas, las listas sin avisar, los mantenimientos por avisar y los reclamos pendientes; cada fila lleva a su pantalla | E2E `hu-39` "el dueño ve los números del día…"; unitarias `inicio` | ✅ |
| 39.2 | Cada uno ve solo lo de sus módulos, sin montos si no tiene Pagos (también el perfil Taller) | E2E `hu-39` "un encargado solo con Agenda ve solo lo que llega, sin montos…" | ✅ |

## HU-40 Plantillas de WhatsApp

> Como dueño, quiero editar los mensajes de WhatsApp, para que suenen como TocTar.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 40.1 | Edito los mensajes de "vehículo listo", "saldo pendiente" y "mantenimiento" con campos como {nombre}, {vehiculo} y {saldo}, con vista previa | E2E `hu-40` "el dueño cambia el mensaje de listo, lo ve como le llega y el aviso de la orden lo usa…" y "tocar un campo lo agrega donde está el cursor…"; unitarias `plantillas` | ✅ |
| 40.2 | "Volver al texto original" deshace los cambios | E2E `hu-40` "…después vuelve al original" | ✅ |
| 40.3 | Solo el dueño las edita | E2E `hu-40` "un encargado no entra, aunque tenga todos los demás permisos" | ✅ |

## HU-41 Fotos de órdenes a la galería

> Como dueño, quiero publicar las fotos de un trabajo terminado, para mantener la galería viva sin esfuerzo.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 41.1 | Desde una orden entregada elijo la foto de después (y la de antes, opcional) y las publico con su servicio | E2E `hu-41` "el dueño publica antes y después de una orden entregada…" | ✅ |
| 41.2 | Se publican copias: las de la orden siguen privadas y quitarlas de la galería no las borra | E2E `hu-41` (misma prueba) | ✅ |
| 41.3 | Solo el dueño publica | E2E `hu-41` "un encargado con Órdenes no publica…" | ✅ |

---

## El ciclo completo

| Criterio | Cómo se comprueba | Estado |
|---|---|---|
| Una cotización se agenda, el vehículo se recibe con su checklist, un chico del taller (perfil Taller) lo trabaja, se avisa, se cobra, se entrega con firma y queda programado su próximo mantenimiento, que se agenda | E2E `flujo-taller-completo` "del día de ingreso al próximo mantenimiento agendado" | ✅ |
| El mismo ciclo, a mano, con los tres roles y en un celular real | Revisión a mano en `pruebas.toctardetailing.com` | ⏳ |

## Reglas de negocio de esta entrega

| Regla | Qué dice | Cómo se comprueba | Estado |
|---|---|---|---|
| RN-01 | Cotizan el dueño y el encargado con "Cotizaciones" | 25.6 y 26.5; unitarias `permisos` | ✅ |
| RN-02 | Una cotización enviada no cambia su precio ni su PDF | 25.7 y 26.2 | ✅ |
| RN-03 | Lo cotizado por fotos es un estimado y el PDF lo dice | 25.4 | ✅ |
| RN-04 | El adelanto sugerido es configurable y editable | 30.3 y `hu-05` | ✅ |
| RN-05 | Si el cliente cancela, el adelanto no se devuelve | 31.2 | ✅ |
| RN-06 | Un espacio no tiene dos vehículos el mismo día | 30.2 y 31.1 (también la base lo rechaza) | ✅ |
| RN-07 | Precios por tamaño de vehículo, con tamaños configurables | 20.1 y 25.2 | ✅ |
| RN-08 | El mantenimiento sale del plan de cada servicio | 19.2, 36.3 y 38.4 | ✅ |
| RN-09 | El mantenimiento es un servicio cobrado del catálogo | 38.3 (se agenda como reserva con su precio) | ✅ |
| RN-12 | Sin Pagos ni Cotizaciones no se ven precios ni montos (pedido 32: ya no hay rol Técnico) | 34.1 y las pruebas de acceso de cada módulo; unitarias `permisos` (perfiles) | ✅ |
| RN-13 | Con saldo, solo entrega quien tiene la autorización | 36.2 | ✅ |
| RN-14 | Clientes, servicios y usuarios se desactivan, no se borran | 19.3, 23.4 | ✅ |

## Requisitos no funcionales que se revisan en esta entrega

| Requisito | Cómo se comprueba | Estado |
|---|---|---|
| RNF-01 Celular desde 360 px y computadora | Todas las E2E corren en celular y en escritorio; pruebas "a 360 px no se sale nada" en `hu-39`, `hu-40`, `hu-41` y `base`; el panel rediseñado (pedido 26) revisado a 360, 390, 768 y 1280 px | ✅ |
| RNF-03 Instalable | E2E `hu-06`; instalación real en el celular del dueño y de cada encargado | ⏳ (en la capacitación) |
| RNF-05 Permisos validados en el servidor | Unitarias `permisos` (matriz completa) y las pruebas de acceso de cada historia (por dirección, no solo por menú) | ✅ |
| RNF-06 Respaldos | Restauración de prueba de un respaldo, documentada en `10-lanzamiento/` | ⏳ (antes de publicar) |
| RNF-10 Auditoría | Cambios de precio, cotizaciones, agendar, recibir, pagos anulados, adicionales y entregas (con quién autorizó el saldo y la firma) dejan quién y cuándo en `auditoria` | ✅ |
| RNF-11 Nada fijo en el código | Servicios, precios, tamaños, espacios, partes del checklist, adelanto, validez, días "sin respuesta" y mensajes, en el panel | ✅ (excepto los 15 días de "Próximos" en Mantenimientos: pedido 19, por confirmar) |
| RNF-14 Accesible | Controles de 44 px con pantalla táctil (`base`), foco al primer error, nombres para el lector de pantalla en cada botón de ícono | ✅ |

## Errores encontrados y corregidos durante el desarrollo

Los errores del 26 y 27 de octubre (pulido visual de la Entrega 2) están en `criterios-entrega-1.md`, en la misma sección. Desde los ajustes de la reunión con el dueño:

| Fecha | Historia | Error | Corrección | Prueba que lo cubre |
|---|---|---|---|---|
| 02/11/2026 | HU-33 | Al recibir, si el envío fallaba (por ejemplo, "faltan partes del checklist"), el menú del técnico volvía a "Sin asignar" mientras la pantalla lo seguía teniendo: el vehículo se podía recibir sin técnico | El técnico va en un campo propio y el menú se vuelve a poner después de cada envío | E2E `hu-33-checklist` (recibe después de un intento fallido y el técnico elegido ve la orden) |
| 02/11/2026 | HU-33 | Una parte marcada "Bien" por error no se podía dejar sin revisar | "Bien" funciona como interruptor (pedido 26); una parte que se desactivó en Configuración se cambia a bien o detalle, pero no se quita | E2E `hu-33-checklist` y unitarias `ordenes` |
| 02/11/2026 | HU-36 | En una orden cancelada, el saldo se resaltaba en ámbar como si se pudiera cobrar | Ámbar solo si se puede cobrar; verde con "Pagado por completo" si está pagada; sin color si está cancelada | Revisión del pedido 26, con capturas de una orden pagada, con saldo y cancelada |
| 02/11/2026 | HU-34, HU-36 | En una orden entregada seguía la fila "Entrega: Hoy, aproximada", que contradecía el encabezado ("Entregado el 02/11 a las 22:28") | Entregada, la fila no se muestra (recorrido de la Entrega 2) | E2E `hu-36` "pagada: el dueño suma un adicional…" |
| 02/11/2026 | HU-34 | En Fotos, con una foto subida, "Tomar foto" pasaba a ser un recuadro punteado y "Elegir de la galería" quedaba suelto debajo, sin borde | Los dos botones, iguales y juntos debajo de las fotos, haya fotos o no (recorrido de la Entrega 2) | E2E `hu-34-ordenes-tecnico` y `flujo-taller-completo` |
| 03/11/2026 | Panel (formularios por partes) | En el iPhone, el título de cada tarjeta de formulario (Contacto, Ubicación, Servicios…) quedaba encima del borde y el primer campo, pegado arriba: Safari no deja flotar una leyenda dentro de un fieldset flex. En Negocio, la caja del logo perdía su forma y, con un logo ancho, estiraba la página a la derecha | El flex va en un div dentro del fieldset (`SeccionFormulario`, que ahora usan todas las tarjetas) y el contenido empieza debajo del título; el logo se ubica dentro de su caja (absolute y object-contain) | E2E `iphone` (proyecto nuevo en WebKit, el motor de Safari): títulos adentro de su tarjeta en Negocio, Parámetros y Nueva cotización, nada se sale y la caja del logo guarda su forma |

## Lo que falta para el acta

1. La revisión manual de YankoSoft con esta lista, en `pruebas.toctardetailing.com`, con los tres roles.
2. Las pruebas en un celular real (⏳ de 26.4, 27.3, 32.5, 33.6, 36.5 y el ciclo completo).
3. Lo que carga o confirma el dueño (⏳ de 20.4, 26.6 y 38.6).
4. Los pedidos que el dueño apruebe antes del acta (29, 31, 19), con sus criterios en esta lista.
5. La validación de esta lista por el dueño en la demo, y el acta (`actas-de-aceptacion/entrega-2.md`).
