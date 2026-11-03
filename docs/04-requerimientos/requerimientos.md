# Requerimientos — TocTar Detailing (Web + Gestión)

- **Versión:** borrador 1 · 9 de octubre de 2026
- **Alcance:** opción Web + Gestión (`03-cierre-comercial/acuerdo.md`)
- **Estado:** aprobado por el dueño (octubre de 2026)

Cada requisito tiene un código para rastrearlo hasta su historia de usuario y su prueba. Si el dueño pregunta "¿esto estaba incluido?", se responde con este documento.

**Columnas:**
- **Entrega:** `1` = Web (sitio, panel, accesos y configuración) · `2` = Gestión.
- **Prioridad:** `Imprescindible` (sin esto no se entrega) · `Deseable` (se hace si el tiempo alcanza; si no, pasa a mantenimiento o al backlog).
- **Origen:** `Ent` entrevista · `Enc-N` pregunta N de la encuesta · `Acl-N` aclaración N · `Cot` cotización · `Ref` sitio de referencia · `Prop` propuesta.

## 1. Actores

| Actor | Descripción | Usa el sistema |
|---|---|---|
| Visitante | Cualquier persona que entra al sitio público | Solo el sitio público |
| Dueño | Atiende WhatsApp, cotiza, configura todo | Panel completo |
| Encargado | El personal del taller (hoy el encargado y dos empleados que hacen de todo): lo que el dueño marque en sus permisos. Desde el pedido 32 (02/11/2026) no hay rol Técnico: quien trabaja los vehículos es un encargado con el perfil Taller | Panel según permisos |
| Cliente | Recibe la cotización en PDF y los avisos por WhatsApp | No tiene cuenta (Acl-5) |

## 2. Requisitos funcionales

### 2.1 Sitio público (SP)

| Código | Requisito | Entrega | Prioridad | Origen |
|---|---|---|---|---|
| RF-01 | El sitio tiene una portada con lema, servicios principales y llamado a escribir por WhatsApp. | 1 | Imprescindible | Cot, Ref |
| RF-02 | El sitio tiene una página "Nosotros" con quiénes son, cómo trabajan y por qué elegir TocTar. | 1 | Imprescindible | Cot |
| RF-03 | Cada servicio activo tiene su página con descripción, beneficios, proceso paso a paso y variantes (por ejemplo, años del cerámico), sin precios. | 1 | Imprescindible | Cot, Enc-20, Ref |
| RF-04 | La galería muestra fotos de antes y después y se puede filtrar por servicio. | 1 | Imprescindible | Cot, Ref |
| RF-05 | El sitio tiene una página de preguntas frecuentes sobre servicios y garantía. | 1 | Imprescindible | Cot |
| RF-06 | La página de contacto muestra dirección con Google Maps, horarios, WhatsApp, correo y redes. | 1 | Imprescindible | Cot |
| RF-07 | El visitante puede enviar un formulario de garantía o reclamo (nombre, teléfono, placa, servicio, fecha aproximada, descripción y fotos opcionales); queda registrado en el panel. | 1 | Imprescindible | Cot, Ref |
| RF-08 | Todas las páginas muestran un botón de WhatsApp; en la página de un servicio, el mensaje se abre con ese servicio ya escrito. | 1 | Imprescindible | Cot, Prop |
| RF-09 | Cada página tiene título, descripción y URL legible para Google; el sitio publica un mapa del sitio y los datos del negocio local. | 1 | Imprescindible | Cot |

### 2.2 Panel del sitio (PS)

| Código | Requisito | Entrega | Prioridad | Origen |
|---|---|---|---|---|
| RF-10 | El dueño edita los textos de portada, nosotros, preguntas frecuentes y contacto. | 1 | Imprescindible | Cot |
| RF-11 | El dueño crea, edita, ordena y oculta servicios del sitio, con sus fotos. | 1 | Imprescindible | Cot, Acl-8 |
| RF-12 | El dueño sube fotos de antes y después a la galería, las asocia a un servicio, las ordena y las oculta. | 1 | Imprescindible | Cot |
| RF-13 | El dueño ve los reclamos recibidos y los marca como atendidos, con una nota. | 1 | Imprescindible | Cot |

### 2.3 Accesos y configuración (AC)

| Código | Requisito | Entrega | Prioridad | Origen |
|---|---|---|---|---|
| RF-14 | Los usuarios entran con usuario y contraseña, y pueden cerrar sesión. | 1 | Imprescindible | Cot |
| RF-15 | El dueño crea usuarios, les asigna un rol (dueño o encargado; pedido 32), restablece su contraseña y los desactiva. | 1 | Imprescindible | Acl-7 |
| RF-16 | El dueño define a qué módulos accede el encargado. | 1 | Imprescindible | Acl-7, Prop |
| RF-17 | El dueño edita los datos del negocio: nombre, logo, WhatsApp, dirección, horarios, correo y redes; se usan en el sitio y en el PDF. | 1 | Imprescindible | Acl-8 |
| RF-18 | El dueño configura los parámetros: espacios del taller, tamaños de vehículo, adelanto sugerido, validez de la cotización, condiciones y garantía del PDF, intervalo de mantenimiento y servicios que lo generan. | 1 | Imprescindible | Acl-8, Acl-9 |
| RF-19 | El sistema se puede instalar en la pantalla de inicio del celular (PWA). | 1 | Imprescindible | Acl-10 |

### 2.4 Clientes y vehículos (CV)

| Código | Requisito | Entrega | Prioridad | Origen |
|---|---|---|---|---|
| RF-20 | El personal registra clientes con nombre, teléfono de WhatsApp, correo opcional, y NIT y razón social opcionales. | 2 | Imprescindible | Cot, Enc-1 |
| RF-21 | El personal registra vehículos de un cliente con placa, marca, modelo, año, color y tamaño. | 2 | Imprescindible | Cot, Enc-16 |
| RF-22 | El personal busca clientes por nombre, teléfono o placa. | 2 | Imprescindible | Prop |
| RF-23 | El sistema avisa si el teléfono o la placa ya están registrados, para evitar duplicados. | 2 | Imprescindible | — |
| RF-24 | La ficha del cliente muestra sus vehículos y el historial de consultas, cotizaciones, órdenes y pagos. | 2 | Imprescindible | Cot |

### 2.5 Catálogo de servicios y precios (CA)

| Código | Requisito | Entrega | Prioridad | Origen |
|---|---|---|---|---|
| RF-25 | El dueño crea servicios con variantes (por ejemplo, 1, 2, 3, 5 y 10 años; básico o premium; tonalidades). | 2 | Imprescindible | Enc-18, Cot |
| RF-26 | Cada variante tiene un precio de referencia por tamaño de vehículo; puede quedar vacío cuando el precio depende de la evaluación (PPF, chapa y pintura). | 2 | Imprescindible | Enc-16, Ent |
| RF-27 | Cada servicio o variante tiene una duración estimada en días, que usa la agenda. | 2 | Imprescindible | Prop |
| RF-28 | Los servicios y variantes se desactivan en lugar de borrarse, y los cambios de precio quedan en un historial. | 2 | Imprescindible | Prop |

### 2.6 Consultas y cotizaciones (CO)

| Código | Requisito | Entrega | Prioridad | Origen |
|---|---|---|---|---|
| RF-29 | El personal registra una cotización directa: el cliente (o lo registra ahí mismo), su vehículo, los servicios con sus precios y si se cotizó en persona o por fotos. Sin consulta aparte, canal, fotos ni videos (pedido 23, 01/11/2026; antes: una consulta con canal, fotos o videos y notas). | 2 | Imprescindible | Acl-2, pedido 23 |
| RF-30 | Cada cotización tiene un estado: pendiente, aceptada (al agendarla) o rechazada (con motivo: precio, no respondió u otro). Una rechazada puede volver a pendiente (pedido 23; antes, el de la consulta). | 2 | Imprescindible | Prop, pedido 23 |
| RF-31 | El dueño o el encargado con el permiso crea la cotización: servicios con precio sugerido del catálogo según el tamaño del vehículo, que puede ajustar, descuento, total, adelanto sugerido y validez (pedidos 23 y 24: sin consulta antes y sin fotos). | 2 | Imprescindible | Acl-2, Enc-13, pedidos 23 y 24 |
| RF-32 | La cotización se genera en PDF con logo, datos del cliente y del vehículo, detalle, total, validez, condiciones y garantía, formas de pago, adelanto y fotos. | 2 | Imprescindible | Enc-19 |
| RF-33 | El PDF se puede descargar o imprimir; desde el celular se comparte directo a WhatsApp o correo con el menú de compartir del teléfono. | 2 | Imprescindible | Acl-2, Cot |
| RF-34 | Modificar una cotización enviada crea una nueva versión; las anteriores conservan sus precios. | 2 | Imprescindible | Prop |
| RF-35 | El personal ve la lista de cotizaciones por estado, con búsqueda y los días transcurridos desde el último movimiento; las pendientes sin respuesta se resaltan. | 2 | Imprescindible | Cot, pedido 23 |

### 2.7 Agenda (AG)

| Código | Requisito | Entrega | Prioridad | Origen |
|---|---|---|---|---|
| RF-36 | Al confirmar una cotización se crea una reserva con fecha de ingreso, espacio del taller, duración (sugerida por el catálogo) y el adelanto. Sin técnico asignado (pedido 32). | 2 | Imprescindible | Cot, Acl-5 |
| RF-37 | El personal crea reservas directas, sin cotización previa, para clientes registrados (por ejemplo, un mantenimiento). | 2 | Imprescindible | Acl-5 |
| RF-38 | La agenda muestra un tablero por espacio y por día, con vista semanal. | 2 | Imprescindible | Cot |
| RF-39 | El personal reprograma o cancela una reserva, indicando el motivo. | 2 | Imprescindible | — |

### 2.8 Órdenes de trabajo (OT)

| Código | Requisito | Entrega | Prioridad | Origen |
|---|---|---|---|---|
| RF-40 | Al ingresar el vehículo, la reserva pasa a orden de trabajo con una inspección de ingreso: un checklist de partes que arma el dueño, revisado parte por parte, con el detalle de cada una (rayón, golpe, raspón, roto u otro), su nota y su foto (pedidos 12 y 27), y observaciones. | 2 | Imprescindible | Prop, pedido 12 |
| RF-41 | La orden tiene estados: recibido, en proceso, listo y entregado. | 2 | Imprescindible | Cot |
| RF-42 | Quien tiene el permiso de Órdenes ve las órdenes del taller (sin técnico asignado, pedido 32), sube las fotos de inicio y del final (pedido 27), registra avances y notas, y marca la orden como lista. | 2 | Imprescindible | Prop |
| RF-43 | La orden muestra el precio cotizado y el precio final; el dueño puede sumar servicios adicionales. | 2 | Imprescindible | Prop |
| RF-44 | Desde una orden entregada, el dueño elige fotos de antes y después para publicarlas en la galería del sitio. | 2 | Deseable | Prop |

### 2.9 Adelantos y saldos (PA)

| Código | Requisito | Entrega | Prioridad | Origen |
|---|---|---|---|---|
| RF-45 | El personal registra pagos de una reserva u orden: monto, método (QR, efectivo o transferencia), fecha, tipo (adelanto o saldo) y foto opcional del comprobante. | 2 | Imprescindible | Cot, Enc-5 |
| RF-46 | El sistema calcula el saldo pendiente de cada orden: precio final menos pagos. | 2 | Imprescindible | Cot |
| RF-47 | El personal ve la lista de clientes con saldo pendiente. | 2 | Imprescindible | Cot |

### 2.10 Avisos y mantenimiento (AV)

| Código | Requisito | Entrega | Prioridad | Origen |
|---|---|---|---|---|
| RF-48 | Al marcar una orden como lista, un botón abre WhatsApp con un mensaje para el cliente (nombre, vehículo y saldo). | 2 | Imprescindible | Ent, Cot |
| RF-49 | Al entregar un servicio que genera mantenimiento, el sistema calcula la fecha del próximo mantenimiento. Al entregar el mantenimiento, programa el siguiente (pedido 21). | 2 | Imprescindible | Ent, Enc-7 |
| RF-50 | El personal ve los mantenimientos por vencer y vencidos, los avisa con un botón de WhatsApp y los marca como avisado, agendado o no interesado. | 2 | Imprescindible | Ent, Cot |
| RF-51 | El dueño edita las plantillas de los mensajes de WhatsApp. | 2 | Deseable | Acl-8 |
| RF-52 | La pantalla de inicio del panel muestra lo del día: ingresos, entregas, órdenes listas sin avisar y mantenimientos por avisar. | 2 | Deseable | — |

## 3. Requisitos no funcionales

| Código | Requisito | Cómo se verifica |
|---|---|---|
| RNF-01 | El sitio y el panel se usan bien en celular (desde 360 px de ancho) y en computadora. | Revisión en celular Android, iPhone y PC |
| RNF-02 | El sitio público carga rápido en 4G. | Lighthouse móvil ≥ 90 en rendimiento y SEO |
| RNF-03 | El sistema es instalable (PWA) y requiere internet; sin conexión muestra un aviso claro. | Instalación en Android e iOS; prueba en modo avión |
| RNF-04 | Todo el tráfico va por https; las contraseñas se guardan cifradas (hash); las sesiones vencen por inactividad. | Revisión de configuración |
| RNF-05 | Los permisos se validan en el servidor, no solo ocultando botones. | Pruebas automáticas por rol |
| RNF-06 | Se respalda a diario la base de datos y las fotos; se prueba una restauración antes del lanzamiento. | Restauración de prueba documentada |
| RNF-07 | Las fotos se comprimen al subirlas; los videos tienen un tamaño máximo (a definir en el diseño). | Subida de prueba |
| RNF-08 | Todo en español, montos en Bs, fechas dd/mm/aaaa y hora de Bolivia (America/La_Paz). | Revisión |
| RNF-09 | Funciona en las 2 últimas versiones de Chrome (Android y PC), Safari (iPhone) y Edge. | Revisión en cada navegador |
| RNF-10 | Quedan registrados quién y cuándo crea o cambia cotizaciones, pagos y precios. | Revisión del historial |
| RNF-11 | Ningún valor del negocio (precios, montos, intervalos, cantidades) queda fijo en el código. | Revisión de código |
| RNF-12 | El panel y los datos internos no aparecen en buscadores. | Revisión de robots y etiquetas |
| RNF-13 | El modelo de datos contempla desde el inicio el Sistema completo, la factura SIAT y una segunda sucursal, sin rehacer tablas. | Revisión del diseño |
| RNF-14 | Las imágenes del sitio tienen texto alternativo y el contraste es legible. | Lighthouse accesibilidad ≥ 90 |

## 4. Reglas de negocio

| Código | Regla | Origen |
|---|---|---|
| RN-01 | Crean, modifican (con una versión nueva) y envían cotizaciones el dueño y el encargado con el permiso "Cotizaciones" (pedido 24, 01/11/2026; antes, solo el dueño). | Enc-13, pedido 24 |
| RN-02 | Una cotización enviada conserva sus precios aunque cambie el catálogo; un cambio crea una nueva versión. | Prop |
| RN-03 | Toda cotización hecha con fotos o video es un estimado sujeto a ver el vehículo; el PDF lo indica. | Ent, Acl-2 |
| RN-04 | El adelanto sugerido es configurable (hoy Bs 200) y se puede cambiar en cada reserva; el cliente puede dar más. | Enc-4, Enc-5 |
| RN-05 | Si el cliente cancela, el adelanto no se devuelve y queda como ingreso. | Enc-6 |
| RN-06 | Un espacio del taller no puede tener dos vehículos en el mismo día. La cantidad de espacios es configurable (hoy 3). | Enc-3, Acl-9 |
| RN-07 | Los precios se dan por tamaño de vehículo; los tamaños son configurables (hoy 5: compactos, sedanes y hatchbacks medianos, vagonetas medianas, vagonetas grandes y camionetas, extra grandes; ver `01-descubrimiento/material-recibido.md`). | Enc-16 |
| RN-08 | El recordatorio de mantenimiento solo aplica a los servicios que tienen uno en el catálogo (hoy el pulido y nano cerámico). Cada servicio dice cuál es su mantenimiento (otro servicio o él mismo) y cada cuántos meses, contados desde la entrega; cada vehículo tiene su plan, que se puede ajustar (otra frecuencia, otra fecha) y se repite al entregar cada mantenimiento. Cambió el 27/10/2026 (pedido 21): antes era un intervalo único para todo el negocio (3 meses). | Enc-7, pedido 21 |
| RN-09 | El mantenimiento es un servicio cobrado del catálogo. | Enc-8 |
| RN-10 | El sitio público no muestra precios ni testimonios. | Enc-20, Acl-3 |
| RN-11 | El cliente no tiene cuenta ni reserva por su cuenta; el personal registra consultas y reservas. | Acl-5 |
| RN-12 | Quien no tiene el permiso de Pagos ni el de Cotizaciones no ve precios, montos ni saldos; cada módulo, solo con su permiso. (Hasta el 02/11/2026 decía: el técnico no ve precios, pagos ni datos de otros módulos; solo sus órdenes. Cambió con el pedido 32: no hay rol Técnico.) | Prop; confirmado 14/10; cambió el 02/11 (pedido 32) |
| RN-13 | Una orden con saldo pendiente solo se marca como entregada si la autoriza el dueño o un encargado con el permiso "autorizar entrega con saldo". | Confirmado 14/10 ("el dueño o la persona a cargo del taller") |
| RN-14 | Los registros con historial (clientes, servicios, usuarios) se desactivan, no se borran. | Prop |

## 5. Fuera de alcance

| Tema | Dónde queda |
|---|---|
| Inventario, asistencia, planilla, egresos y cierre de caja, reportes | Sistema completo (Bs 2.000 dentro de 90 días) |
| Facturación electrónica SIAT | Futuro; se guardan NIT y razón social |
| Avisos automáticos por la API de WhatsApp | Futuro; con costo de Meta |
| Reservas o cotizaciones hechas por el cliente | Futuro |
| Uso sin conexión, tiendas de apps, conexión con bancos | No previsto |
| Producción de contenido, redes sociales, publicidad | No previsto |

## 6. Preguntas abiertas para el dueño

- [ ] Lista de precios por servicio, variante y tamaño (para la carga inicial). Los tamaños ya están: 5 (`01-descubrimiento/material-recibido.md`).
- [x] Días que ocupa cada servicio en el taller: cerámico 1,5 días; varios servicios, 2 a 3.
- [x] Precio y contenido del mantenimiento del cerámico: contenido recibido; el precio varía según tamaño, tratamiento y estado (se carga como "según evaluación").
- [ ] Variantes de inyección y succión y de pulido de vidrios.
- [x] ¿Cuántos días de validez lleva la cotización? Varía según el caso: se define en cada cotización (con un valor sugerido configurable).
- [x] ¿El técnico debe ver los precios? No (RN-12). Cambió el 02/11 (pedido 32): no hay rol Técnico; ver precios depende de los permisos de Pagos y Cotizaciones.
- [x] ¿Se puede entregar un vehículo con saldo pendiente? Sí, autorizado por el dueño o el encargado del taller (RN-13).
- [x] ¿Cada técnico ve solo sus órdenes o todas las del taller? Solo las suyas. Cambió el 02/11 (pedido 32): no se asigna un técnico; todos los que tienen Órdenes ven todas.
- [x] ¿La agenda se maneja solo por día o también por hora de ingreso? Solo por día y espacio.
- [x] ¿A quién se avisa cuando llega un reclamo y cómo? En el panel, al dueño y al encargado con el módulo de reclamos.
- [ ] Horarios de atención (pendiente de confirmar) y dirección exacta para Google Maps (recibida).
