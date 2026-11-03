# Historias de usuario — TocTar Detailing (Web + Gestión)

- **Versión:** borrador 1 · 9 de octubre de 2026
- **Base:** `04-requerimientos/requerimientos.md` y `05-analisis/casos-de-uso/casos-de-uso.md`
- **Estado:** pendiente de validación del dueño

Este es el backlog del proyecto. Cada historia se programa en el orden de la tabla, dentro de su entrega.

**Tamaño:** `S` hasta medio día · `M` 1 a 2 días · `L` 3 días o más (se parte antes de programarla).
**Prioridad:** `Imprescindible` · `Deseable` (se hace si el tiempo alcanza).

## Backlog

| Código | Historia | Entrega | Prioridad | Tamaño | Requisitos |
|---|---|---|---|---|---|
| HU-01 | Iniciar sesión | 1 | Imprescindible | M | RF-14 |
| HU-02 | Gestionar usuarios y roles | 1 | Imprescindible | M | RF-15 |
| HU-03 | Permisos del encargado | 1 | Imprescindible | S | RF-16 |
| HU-04 | Datos del negocio | 1 | Imprescindible | S | RF-17 |
| HU-05 | Parámetros del sistema | 1 | Imprescindible | S | RF-18 |
| HU-06 | App instalable | 1 | Imprescindible | S | RF-19 |
| HU-07 | Servicios del sitio | 1 | Imprescindible | M | RF-11 |
| HU-08 | Textos del sitio | 1 | Imprescindible | S | RF-10 |
| HU-09 | Galería en el panel | 1 | Imprescindible | M | RF-12 |
| HU-10 | Portada | 1 | Imprescindible | M | RF-01 |
| HU-11 | Página de cada servicio | 1 | Imprescindible | M | RF-03 |
| HU-12 | Galería pública | 1 | Imprescindible | S | RF-04 |
| HU-13 | Nosotros y preguntas frecuentes | 1 | Imprescindible | S | RF-02, RF-05 |
| HU-14 | Contacto y mapa | 1 | Imprescindible | S | RF-06 |
| HU-15 | Botón de WhatsApp | 1 | Imprescindible | S | RF-08 |
| HU-16 | Formulario de reclamo | 1 | Imprescindible | M | RF-07 |
| HU-17 | Atender reclamos | 1 | Imprescindible | S | RF-13 |
| HU-18 | Sitio preparado para Google | 1 | Imprescindible | S | RF-09 |
| HU-19 | Catálogo con variantes | 2 | Imprescindible | M | RF-25, RF-28 |
| HU-20 | Precios por tamaño y duración | 2 | Imprescindible | M | RF-26, RF-27, RF-28 |
| HU-21 | Registrar clientes y vehículos | 2 | Imprescindible | M | RF-20, RF-21, RF-23 |
| HU-22 | Buscar clientes | 2 | Imprescindible | S | RF-22 |
| HU-23 | Ficha del cliente | 2 | Imprescindible | M | RF-24 |
| HU-24 | Registrar consulta (reemplazada por la cotización directa, pedido 23) | 2 | Imprescindible | M | RF-29, RF-30 |
| HU-25 | Armar cotización (directa, pedido 23) | 2 | Imprescindible | L | RF-29, RF-31, RF-34 |
| HU-26 | PDF de la cotización | 2 | Imprescindible | L | RF-32 |
| HU-27 | Compartir el PDF | 2 | Imprescindible | S | RF-33 |
| HU-28 | Seguimiento de cotizaciones | 2 | Imprescindible | S | RF-30, RF-35 |
| HU-29 | Tablero de la agenda | 2 | Imprescindible | L | RF-38 |
| HU-30 | Agendar reserva | 2 | Imprescindible | M | RF-36, RF-37 |
| HU-31 | Reprogramar o cancelar | 2 | Imprescindible | S | RF-39 |
| HU-32 | Registrar pagos y saldo | 2 | Imprescindible | M | RF-45, RF-46 |
| HU-33 | Recibir vehículo | 2 | Imprescindible | M | RF-40 |
| HU-34 | Trabajar una orden | 2 | Imprescindible | M | RF-41, RF-42 |
| HU-35 | Avisar vehículo listo | 2 | Imprescindible | S | RF-48 |
| HU-36 | Entregar vehículo | 2 | Imprescindible | M | RF-43, RF-49 |
| HU-37 | Saldos pendientes | 2 | Imprescindible | S | RF-47 |
| HU-38 | Recordatorios de mantenimiento | 2 | Imprescindible | M | RF-50 |
| HU-39 | Pantalla del día | 2 | Deseable | M | RF-52 |
| HU-40 | Plantillas de WhatsApp | 2 | Deseable | S | RF-51 |
| HU-41 | Fotos de órdenes a la galería | 2 | Deseable | S | RF-44 |

Las historias del panel (HU-01 a HU-09) van antes que las del sitio público porque el sitio muestra lo que se carga en el panel.

## Entrega 1: Web

### HU-01 Iniciar sesión
Como usuario del panel, quiero entrar con mi usuario y contraseña, para usar solo lo que me corresponde.
- Con datos correctos, entro al panel y veo solo los módulos de mi rol.
- Con datos incorrectos, veo un mensaje que no dice cuál de los dos falló.
- Un usuario desactivado no puede entrar.
- La sesión vence tras un tiempo sin uso y puedo cerrarla cuando quiera.

### HU-02 Gestionar usuarios y roles
Como dueño, quiero crear usuarios con su rol, para que cada persona tenga su acceso.
- Creo un usuario con nombre, usuario, contraseña inicial y rol (dueño o encargado; pedido 32: no hay rol Técnico).
- Restablezco la contraseña de cualquier usuario.
- Desactivo un usuario sin borrar lo que registró.
- No puedo desactivarme a mí mismo si soy el único dueño activo.

### HU-03 Permisos del encargado
Como dueño, quiero elegir qué módulos ve el encargado, para darle acceso sin mostrarle todo.
- Marco o desmarco módulos (clientes, consultas, agenda, órdenes, pagos, mantenimientos, sitio, reclamos) y el permiso "autorizar entrega con saldo" (RN-13).
- El encargado nunca puede cotizar (RN-01) ni cambiar la configuración.
- El permiso se valida en el servidor: entrar por la URL de un módulo no habilitado muestra "sin acceso".
- Un perfil marca sus casillas de un toque: Taller (agenda y órdenes), Atención (además clientes, cotizaciones, pagos y mantenimientos) o Todo; después se ajustan (pedido 32).

### HU-04 Datos del negocio
Como dueño, quiero editar los datos del negocio, para que el sitio y el PDF estén siempre al día.
- Edito nombre, logo, WhatsApp, dirección, coordenadas del mapa, horarios, correo y redes.
- Los cambios se ven en el sitio y en los PDF nuevos sin intervención de YankoSoft.

### HU-05 Parámetros del sistema
Como dueño, quiero cambiar los parámetros del negocio, para no depender de un programador cuando algo cambia.
- Configuro: espacios del taller, tamaños de vehículo, adelanto sugerido, validez de la cotización, condiciones y garantía del PDF, intervalo de mantenimiento.
- Ningún parámetro puede quedar vacío o negativo.
- Cambiar un parámetro no altera cotizaciones ni reservas ya guardadas.

### HU-06 App instalable
Como usuario del panel, quiero instalar el sistema en mi celular, para abrirlo como una app.
- En Android aparece la opción de instalar; en iPhone, "Agregar a inicio".
- Se abre a pantalla completa con el ícono de TocTar.
- Sin internet muestra un aviso claro en lugar de un error.

### HU-07 Servicios del sitio
Como dueño, quiero crear y editar los servicios que muestra el sitio, para mantenerlo al día.
- Cada servicio tiene nombre, resumen, descripción, beneficios, pasos del proceso, foto principal y orden.
- La foto principal es opcional: mientras no se cargue, el sitio muestra una imagen de reemplazo con la marca de TocTar.
- Puedo ocultar un servicio sin borrarlo.
- El servicio del sitio es el mismo registro que el del catálogo de la entrega 2 (se le suman precios después).

### HU-08 Textos del sitio
Como dueño, quiero editar los textos de portada, nosotros, preguntas frecuentes y contacto.
- Edito el lema y la presentación de la portada, el texto de nosotros y las preguntas con sus respuestas.
- Puedo agregar, ordenar y quitar preguntas frecuentes.

### HU-09 Galería en el panel
Como dueño, quiero subir fotos de antes y después, para mostrar el trabajo.
- Subo un par antes/después (o una foto sola), la asocio a un servicio y le pongo una descripción corta.
- Las fotos se comprimen al subirlas.
- Puedo ordenar y ocultar fotos.

### HU-10 Portada
Como visitante, quiero ver de un vistazo qué hace TocTar, para decidir si escribir.
- Muestra lema, imagen principal, servicios destacados y algunas fotos de la galería.
- El botón principal abre WhatsApp.
- Carga rápido en el celular (RNF-02).

### HU-11 Página de cada servicio
Como visitante, quiero entender un servicio antes de preguntar, para saber si es lo que necesito.
- Muestra descripción, beneficios, proceso paso a paso, variantes (por ejemplo, años del cerámico) y fotos de ese servicio.
- No muestra precios (RN-10).
- Termina con una invitación a escribir por WhatsApp sobre ese servicio.

### HU-12 Galería pública
Como visitante, quiero ver trabajos reales, para confiar en el resultado.
- Muestra los pares antes/después visibles, filtrables por servicio.
- Las fotos se ven bien en el celular y se pueden ampliar.

### HU-13 Nosotros y preguntas frecuentes
Como visitante, quiero conocer al negocio y resolver dudas comunes, para no tener que preguntar todo.
- "Nosotros" muestra el texto cargado en el panel.
- Las preguntas frecuentes se abren y cierran una por una.

### HU-14 Contacto y mapa
Como visitante, quiero saber dónde está el taller y cuándo atiende, para ir o escribir.
- Muestra dirección, mapa de Google Maps, horarios, WhatsApp, correo y redes.
- Tocar la dirección en el celular abre la app de mapas.

### HU-15 Botón de WhatsApp
Como visitante, quiero escribir por WhatsApp desde cualquier página, para consultar sin buscar el número.
- El botón se ve en todas las páginas.
- En la página de un servicio, el mensaje empieza con ese servicio escrito ("Hola, quiero consultar por…").
- Usa el número configurado en los datos del negocio.

### HU-16 Formulario de reclamo
Como cliente, quiero dejar un reclamo o pedido de garantía, para que TocTar lo atienda.
- Pido nombre, teléfono, placa, servicio, fecha aproximada, descripción y hasta 3 fotos.
- Los campos obligatorios se validan antes de enviar.
- Al enviar veo una confirmación; el reclamo queda pendiente en el panel.
- Tiene protección contra envíos automáticos (spam).

### HU-17 Atender reclamos
Como dueño o encargado con el módulo de reclamos, quiero ver los reclamos recibidos, para responderlos a tiempo.
- Veo la lista con los pendientes primero.
- Abro uno, veo sus datos y fotos, y lo marco como atendido con una nota.
- Desde el reclamo puedo abrir WhatsApp con ese cliente.

### HU-18 Sitio preparado para Google
Como dueño, quiero que TocTar aparezca al buscar en Tarija, para recibir clientes nuevos.
- Cada página tiene título y descripción propios; las URL son legibles (por ejemplo, `/servicios/nano-ceramico`).
- El sitio publica `sitemap.xml` y datos de negocio local.
- El panel no se indexa (RNF-12).
- Fuera del software: alta del Perfil de Empresa en Google Maps.

## Entrega 2: Gestión

### HU-19 Catálogo con variantes
Como dueño, quiero definir variantes de cada servicio, para cotizar con opciones.
- Agrego variantes a un servicio (por ejemplo, 1, 2, 3, 5 y 10 años).
- Indico cuál es el mantenimiento del servicio (otro servicio o él mismo) y cada cuántos meses (pedido 21).
- Desactivo servicios o variantes sin perder el historial.

### HU-20 Precios por tamaño y duración
Como dueño, quiero cargar precios por tamaño de vehículo y la duración de cada servicio, para que el sistema me sugiera precios y fechas.
- Cada variante tiene un precio por tamaño de vehículo (hoy 5 tamaños, de compactos a extra grandes); puede quedar vacío ("según evaluación").
- Cada servicio o variante tiene duración en días.
- Cada cambio de precio queda registrado con fecha y usuario.

### HU-21 Registrar clientes y vehículos
Como personal, quiero registrar clientes y sus vehículos, para tener su historial.
- Cliente: nombre y teléfono obligatorios; correo, NIT y razón social opcionales.
- Vehículo: placa y tamaño obligatorios; marca, modelo, año y color opcionales.
- Si el teléfono o la placa ya existen, el sistema avisa y ofrece abrir ese registro.

### HU-22 Buscar clientes
Como personal, quiero encontrar un cliente rápido, para atenderlo mientras escribe por WhatsApp.
- Busco por parte del nombre, del teléfono o de la placa.
- Los resultados aparecen mientras escribo.

### HU-23 Ficha del cliente
Como personal, quiero ver todo lo de un cliente en un lugar, para atenderlo con contexto.
- Muestra datos, vehículos, cotizaciones, órdenes, pagos y saldo pendiente.
- Desde la ficha puedo iniciar una cotización o una reserva directa, o abrir WhatsApp.

### HU-24 Registrar consulta (reemplazada)
Desde el pedido 23 (01/11/2026) no hay consulta aparte: el dueño pidió cotizar directo. Lo que hacía esta historia (registrar al cliente y su vehículo sin salir de la pantalla) pasó a HU-25. Especificación: `08-desarrollo/etapas/P23-cotizacion-directa.md`.

### HU-25 Armar cotización
Como dueño o encargado con el permiso "Cotizaciones", quiero armar una cotización en una sola pantalla con precios sugeridos, para cotizar rápido sin equivocarme.
- Elijo al cliente o lo registro ahí mismo, con su vehículo (pedido 23).
- Agrego servicios y variantes; el precio se sugiere según el tamaño del vehículo y lo puedo cambiar.
- Agrego descuento; el sistema calcula total y adelanto sugerido.
- Indico cómo se cotizó: en persona o por fotos; por fotos es un estimado (RN-03).
- Defino la validez de la cotización; el sistema sugiere la de la configuración (S-5).
- Cotizan el dueño y el encargado con el permiso; el servidor rechaza a los demás (RN-01, pedido 24).
- Modificar una cotización enviada crea una versión nueva; la anterior no cambia (RN-02).

### HU-26 PDF de la cotización
Como dueño, quiero un PDF profesional, para entregarlo impreso o por WhatsApp.
- Lleva logo, datos del negocio, cliente y vehículo, número y fecha, detalle, total, adelanto, validez, formas de pago, condiciones y garantía (sin fotos desde el pedido 27).
- Se ve bien impreso en A4 y en la pantalla del celular.
- El texto de condiciones sale de la configuración.

### HU-27 Compartir el PDF
Como dueño, quiero mandar el PDF desde el celular, para no pasar por la computadora.
- En el celular, "Compartir" abre el menú del teléfono con el PDF adjunto (WhatsApp, correo).
- En la computadora, el PDF se descarga o se imprime.

### HU-28 Seguimiento de cotizaciones
Como dueño, quiero ver qué cotizaciones esperan respuesta, para recuperar clientes que se enfrían.
- Lista por estado: pendientes, aceptadas y rechazadas, con búsqueda por cliente, teléfono, placa o número.
- Muestra los días desde el último movimiento; las pendientes, de más antigua a más nueva, y las que pasan los días de Configuración dicen "Sin respuesta".
- Puedo rechazar una cotización con un motivo (precio, no respondió, otro) y volverla a pendiente.

### HU-29 Tablero de la agenda
Como personal, quiero ver la ocupación del taller por espacio y día, para saber cuándo hay lugar.
- Vista semanal: filas por espacio, columnas por día; cada reserva ocupa los días de su duración.
- Cada bloque muestra placa, servicio y estado; al tocarlo se abre la reserva.
- Funciona en el celular (desplazamiento horizontal o vista por día).

### HU-30 Agendar reserva
Como personal, quiero agendar una reserva sin cruces, para dejar de usar el cuaderno.
- Desde una cotización confirmada o como reserva directa (CU-13).
- El sistema sugiere la duración y solo deja elegir espacios libres en esos días (RN-06).
- Registro el adelanto con el monto sugerido editable (RN-04). No se asigna un técnico (pedido 32).

### HU-31 Reprogramar o cancelar
Como personal, quiero mover o cancelar una reserva, para reflejar lo que pide el cliente.
- Al reprogramar se valida otra vez que el espacio esté libre.
- Al cancelar pido un motivo; el adelanto queda como ingreso y no se devuelve (RN-05).

### HU-32 Registrar pagos y saldo
Como personal, quiero registrar cada pago, para saber cuánto falta cobrar.
- Registro monto, método (QR, efectivo, transferencia), fecha, tipo (adelanto o saldo) y foto opcional del comprobante.
- El saldo de la orden se recalcula al instante.
- Un pago registrado no se borra; se anula con motivo y queda en el historial.

### HU-33 Recibir vehículo
Como personal, quiero registrar el estado del vehículo al ingresar, para evitar reclamos por daños previos.
- Desde la reserva elijo "Recibir"; en el checklist marco cada parte "Bien" o con un detalle (qué tiene, una nota y su foto), y "Bien" se vuelve a tocar para desmarcarla; sin revisarlas todas no se recibe (pedidos 12 y 26).
- Anoto observaciones (lo que no es una parte). Las fotos de inicio y del final se toman en la orden (pedido 27).
- Se crea la orden en estado "recibido" con el precio cotizado.

### HU-34 Trabajar una orden
Como personal del taller, quiero ver las órdenes y registrar el avance, para que el dueño sepa cómo va cada vehículo. (Hasta el pedido 32 era "Órdenes del técnico": cada técnico veía solo las suyas.)
- Con el permiso de Órdenes veo todas las del taller, sin técnico asignado; sin Pagos, sin precios (RN-12, pedido 32).
- Cambio el estado (recibido, en proceso, listo), subo fotos de inicio y del final (pedido 27) y escribo notas.

### HU-35 Avisar vehículo listo
Como personal, quiero avisar al cliente con un toque, para no escribir el mismo mensaje cada vez.
- En una orden lista, "Avisar" abre WhatsApp con el mensaje escrito (nombre, vehículo y saldo).
- Queda registrado que se avisó y cuándo.

### HU-36 Entregar vehículo
Como personal, quiero cerrar la orden al entregar, para que todo quede registrado.
- Veo precio final, pagos y saldo; el dueño puede sumar servicios adicionales.
- Con saldo pendiente, solo el dueño o un encargado con el permiso "autorizar entrega con saldo" puede confirmar la entrega (RN-13).
- Si el servicio genera mantenimiento, se calcula la fecha del próximo (RN-08).
- El cliente firma con el dedo que recibe su vehículo conforme, con su nombre; si no puede firmar, se entrega sin firma con el motivo (pedido 13).

### HU-37 Saldos pendientes
Como dueño, quiero ver quién me debe, para cobrarlo.
- Lista de órdenes entregadas con saldo, con cliente, monto y días.
- Desde cada una puedo abrir WhatsApp o registrar el pago.
- Busco por cliente, teléfono o placa y ordeno por la más antigua, el mayor monto o el cliente; el total por cobrar es el de todas (pedido 30).

### HU-38 Recordatorios de mantenimiento
Como personal, quiero ver a quién le toca mantenimiento, para traerlos de vuelta al taller.
- Lista de mantenimientos vencidos y por vencer (próximos 15 días), ordenados por fecha.
- "Avisar" abre WhatsApp con el mensaje escrito; luego marco avisado, agendado o no interesado.
- "Agendar" abre una reserva directa del servicio de mantenimiento.

### HU-39 Pantalla del día (deseable)
Como dueño, quiero ver lo del día al abrir el sistema, para organizarme rápido.
- Muestra ingresos y entregas de hoy, órdenes listas sin avisar, mantenimientos por avisar y reclamos pendientes.

### HU-40 Plantillas de WhatsApp (deseable)
Como dueño, quiero editar los mensajes de WhatsApp, para que suenen como TocTar.
- Edito las plantillas de "vehículo listo" y "mantenimiento" con campos como {nombre}, {vehiculo} y {saldo}.

### HU-41 Fotos de órdenes a la galería (deseable)
Como dueño, quiero publicar las fotos de un trabajo terminado, para mantener la galería viva sin esfuerzo.
- Desde una orden entregada elijo fotos de antes y después y las publico en la galería con su servicio.
