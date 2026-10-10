# Propuesta de software — TocTar Detailing

Versión: 7 de octubre de 2026 · Original: https://claude.ai/artifact/CuP9AQAtXFXna3oPnkJw7t

## Resumen ejecutivo

Proponemos a TocTar Tarija una plataforma con dos partes: un **sitio web público** que muestre sus servicios y trabajos, y un **sistema de gestión interno** que reemplace el cuaderno de reservas. Las dos comparten una sola base de datos de clientes, vehículos y trabajos.

Con el sistema, TocTar podrá:

- Registrar cada consulta de WhatsApp y darle seguimiento hasta que se convierta en trabajo.
- Armar cotizaciones en el sistema y enviarlas en PDF por correo o WhatsApp.
- Agendar reservas sin cruces de turnos, con el adelanto registrado.
- Avisar al cliente cuando su vehículo está listo y recordarle su mantenimiento cada 3 meses.
- Controlar caja, inventario y sueldos (incluidas las horas extra) en un solo lugar.

El cliente no cotiza ni reserva por su cuenta: todo contacto entra por WhatsApp y el personal registra cotizaciones y reservas. El sistema se construye en 3 fases, empezando por el sitio público, como pidió el dueño.

## Cómo trabaja TocTar hoy

Todo empieza por WhatsApp, las reservas se anotan en papel y todos los servicios se cotizan de la misma forma:

1. El cliente escribe por WhatsApp y recibe un saludo con el menú de servicios.
2. TocTar le pregunta qué servicio quiere y para qué vehículo.
3. Se le invita a pasar por el taller para cotizar. Si no puede, se le piden fotos o video.
4. El dueño prepara la cotización y la entrega impresa o la envía en PDF por correo o WhatsApp.
5. El cliente confirma y paga un adelanto por QR o en efectivo.
6. El personal anota la reserva en papel, se hace el trabajo y se avisa al cliente.

### Servicios

| Servicio | Variantes |
| --- | --- |
| Pulido y corrección de pintura + nano cerámico o nano grafeno | 1, 2, 3, 5 y 10 años de duración: más años, capa más densa y mayor precio |
| Mantenimiento de nano cerámico | Cada 3 meses, servicio cobrado |
| Lavado de interior | Básico y premium |
| Limpieza de asientos por inyección y succión | Por definir |
| Pulido de vidrios (ácido y manchas) | Por definir |
| Polarizado de vidrios | Por tonalidad |
| Restauración de faroles con polímero | Sin variantes |
| Instalación de PPF | Según las piezas a cubrir |
| Chapa y pintura | Según el daño |

Los precios se dan por tamaño de vehículo (auto/sedán, camioneta y vagoneta) y el dueño enviará la lista detallada. Igual, siempre se cotiza viendo el vehículo o sus fotos.

### Necesidades administrativas

- Manejar las reservas y citas de los vehículos.
- Avisar al cliente cuando su vehículo está listo.
- Recordar a los clientes su mantenimiento cada 3 meses.
- Llevar el flujo de caja.
- Controlar el inventario.
- Calcular sueldos y salarios, prorrateando las horas extra.

### Problemas que vemos

- **Reservas en papel**: se pueden perder o cruzar turnos, y no dejan historial del cliente ni del vehículo.
- **Consultas que se enfrían**: muchos clientes quedan en pasar por el taller y no vuelven, y hoy no hay forma de saber cuántos son.
- **Cotizaciones sin registro**: se hacen a mano y no queda historial de lo cotizado ni del precio final.
- **Explicaciones repetidas**: el proceso del nano cerámico se explica una y otra vez por WhatsApp.
- **Adelantos dispersos**: los pagos por QR y en efectivo no están en un solo lugar donde se vea qué se pagó y qué se debe.
- **Mantenimiento olvidado**: el recordatorio de 3 meses depende de que alguien se acuerde.

## Sitio de referencia

[Detailing Center Bolivia](https://www.detailingcenterbo.com/) (Santa Cruz) es la referencia del sitio que quiere el dueño: una vitrina de servicios y trabajos que lleva al cliente a WhatsApp, sin reservas ni cotizador. TocTar seguirá ese mismo modelo.

| Elemento | Detailing Center | Propuesta para TocTar |
| --- | --- | --- |
| Portada | Imagen grande, lema y tarjetas de servicios | Igual, con lema propio y botón de WhatsApp siempre visible |
| Menú | Inicio, Nosotros, Servicios, Catálogo, Contacto, FAQ, Reclamos, Blog | Inicio, Servicios, Trabajos, Nosotros, FAQ, Contacto |
| Página por servicio | [Recubrimiento cerámico](https://www.detailingcenterbo.com/recubrimiento-cerámico): beneficios, duración y 3 niveles con precio (1, 3 y 5 años: 390, 490 y 590 USD) | Beneficios, proceso paso a paso y niveles, sin precios (decisión del dueño) |
| Galería | [Catálogo](https://www.detailingcenterbo.com/catálogo) de fotos de trabajos | Antes y después por servicio, con las fotos que TocTar ya tiene; después se alimenta desde las órdenes de trabajo |
| Contacto | WhatsApp, correo y redes | WhatsApp con mensaje prellenado (servicio y vehículo), mapa de Tarija y horarios |
| Reclamos | [Formulario](https://www.detailingcenterbo.com/contact-8) con datos del vehículo y número de orden | Formulario de garantía o reclamo |
| Testimonios | Carrusel de opiniones | No se incluyen, por decisión del dueño |
| Reservas y cotizador | No tiene | No se incluyen; el contacto es por WhatsApp. Un cotizador en línea puede sumarse en el futuro |

Lo más útil de copiar es la página por servicio: explica el nano cerámico y sus niveles antes de que el cliente pregunte, lo que reduce las explicaciones repetidas por WhatsApp.

El dueño pidió que el sitio **“venda sin vender”**. En lugar de precios y promociones, convencen el proceso explicado paso a paso, las fotos de antes y después, la garantía y los años de protección. Cada página termina con una invitación tranquila a escribir por WhatsApp.

## Solución propuesta

La solución tiene 11 módulos sobre una sola base de datos: el sitio público y 10 módulos internos que usa solo el personal. Cada módulo responde a una necesidad que dio el dueño o a un problema detectado.

### Usuarios del sistema

| Rol | Quién es hoy | Qué hace en el sistema |
| --- | --- | --- |
| Dueño / jefe | El dueño | Atiende WhatsApp, registra consultas, arma cotizaciones, agenda reservas y cobra. Configura precios y parámetros, y ve caja, inventario, sueldos y reportes |
| Encargado de atención | Nadie todavía | Rol listo para cuando TocTar contrate: atiende WhatsApp, consultas, agenda y cobros, con los permisos que el dueño le dé (por ejemplo, sin ver sueldos ni reportes) |
| Técnico | 2 empleados | Ve sus trabajos, sube fotos, marca avances, registra insumos y marca su entrada y salida desde el celular |
| Cliente | No entra al sistema | Ve el sitio, escribe por WhatsApp y recibe su cotización en PDF y los avisos |

El encargado conviene mantenerlo: no agrega pantallas nuevas, porque usa las mismas del dueño con menos permisos. Si los permisos se diseñan desde el inicio, activarlo después es crear un usuario, no reprogramar.

### Módulos

| # | Módulo | Qué resuelve | Funciones principales |
| --- | --- | --- | --- |
| 1 | Sitio web público | Mostrar los servicios y el trabajo | Portada, página por servicio sin precios, galería antes/después, FAQ, contacto, garantías y reclamos, botón de WhatsApp. Textos y fotos editables desde el panel. Tono “vender sin vender” |
| 2 | Clientes y vehículos | Falta de historial | Ficha del cliente con sus vehículos (placa, marca, modelo, año, tamaño), NIT y razón social, e historial de cotizaciones y trabajos |
| 3 | Catálogo de servicios y precios | Precios que cambian seguido | Servicios, variantes y tamaños de vehículo que el dueño crea, edita o desactiva sin programador. Hoy: 1 a 10 años de cerámico, básico/premium, tonalidades; auto/sedán, camioneta, vagoneta |
| 4 | Consultas y cotizaciones | Consultas que se enfrían y cotizaciones sin registro | Registro de cada consulta con fotos o video. Cotización con precios sugeridos del catálogo que el dueño puede ajustar. PDF con logo, validez, condiciones y garantía, formas de pago, adelanto y fotos. Estados: consultó, cotizado, confirmado, perdido |
| 5 | Agenda y reservas | Reservas en papel | Tablero por espacios del taller (cantidad configurable; hoy 3), trabajos de uno o varios días, adelanto registrado, sin cruces |
| 6 | Órdenes de trabajo | Seguimiento del vehículo en el taller | Inspección de ingreso con fotos, estados (recibido, en proceso, listo, entregado), fotos de antes y después, precio cotizado vs. final |
| 7 | Avisos y mantenimiento | Avisar “listo” y recordar el mantenimiento | Aviso de WhatsApp al terminar. Recordatorio de mantenimiento con intervalo y servicios configurables (hoy: cada 3 meses, solo nano cerámico), que invita a agendar el mantenimiento cobrado |
| 8 | Caja | Flujo de caja | Adelanto sugerido configurable (hoy Bs 200) y editable en cada reserva; no reembolsable si el cliente cancela. Saldos por QR o efectivo, egresos, cierre diario |
| 9 | Inventario | Control de insumos | Productos (cerámicos, compuestos, PPF, láminas de polarizado), entradas, consumo por orden, alertas de stock bajo |
| 10 | Personal y sueldos | Pago semanal con horas extra | Marcado de entrada y salida. Planilla con periodo, tarifa por hora y recargo de hora extra configurables (hoy semanal, Bs 12,5 por hora, sin recargo); boleta por periodo |
| 11 | Configuración | Un negocio que cambia y crece | Datos del negocio, usuarios y permisos por rol, espacios del taller, adelanto sugerido, intervalo de mantenimiento, plantilla y condiciones del PDF, tarifas y periodo de pago |

Además, un panel de reportes para el dueño: ventas por servicio y por mes, consultas convertidas en trabajos, mantenimientos pendientes y rendimiento por técnico.

La factura electrónica (SIAT) queda fuera por ahora. El dueño la quiere más adelante, solo cuando el cliente la pida; por eso el sistema guarda el NIT y la razón social desde el inicio.

### Pensado para crecer

TocTar está creciendo, así que ningún número de hoy queda fijo en el código:

- **Volumen**: 2 vehículos por día es el punto de partida, no un límite. Los espacios del taller, los técnicos y los usuarios se agregan desde la configuración.
- **Precios y servicios**: todo se edita desde el panel, con historial; una cotización ya enviada conserva el precio con que se hizo.
- **Reglas de pago**: adelanto, tarifas, recargo de horas extra y periodo de planilla son parámetros, no fórmulas fijas.
- **Personal**: entrarán más técnicos y quizá un encargado; cada uno con su rol y permisos.
- **A futuro**: el modelo de datos deja lugar para la factura electrónica y para una segunda sucursal sin rehacer el sistema.

## Flujo de un trabajo con el sistema

```
Cliente consulta (WhatsApp) → ¿Puede ir al taller?
   sí → Revisión en el taller ──┐
   no → Envía fotos o video ────┴→ Cotización en PDF (impresa, correo o WhatsApp)
→ Adelanto y reserva (QR o efectivo, fecha y técnico)
→ Ingreso al taller (orden y fotos de antes)
→ Trabajo del técnico (avances e insumos)
→ Vehículo listo (fotos y aviso por WhatsApp)
→ Entrega y cobro (saldo a caja)
→ Recordatorio a los 3 meses (mantenimiento) → nueva cita
```

El cliente solo habla por WhatsApp; el personal registra cada paso en el sistema, desde la consulta hasta la entrega. El recordatorio de 3 meses lo trae de vuelta a la agenda.

## Fases de desarrollo

| Fase | Duración | Incluye |
| --- | --- | --- |
| Fase 1: Sitio y base | 2 a 3 semanas | Sitio por servicio y FAQ, galería antes y después, WhatsApp y contacto, panel para editar el sitio, usuarios/roles/ajustes, posicionamiento en Google |
| Fase 2: Taller | 3 a 4 semanas | Clientes y vehículos, cotizaciones en PDF, agenda y reservas, órdenes de trabajo y fotos, caja (adelantos y cobros), avisos (listo y 3 meses) |
| Fase 3: Administración | 2 a 3 semanas | Inventario de insumos, consumo por orden, personal y horas extra, planilla y boletas, egresos y cierre de caja, reportes del dueño |

Se diseña todo el sistema desde el inicio y se entrega por partes. Antes de programar se hace el análisis completo (casos de uso, modelo de datos y arquitectura), así cada fase se construye sobre la base definitiva y nada se tira.

La Fase 1 entrega el sitio público, como pidió el dueño, pero ya sobre el sistema real: incluye el inicio de sesión, los roles, la configuración y un panel para editar servicios, textos y galería. Las Fases 2 y 3 agregan módulos a esa misma base. Empezar por el sitio también conviene porque Google tarda meses en posicionar un sitio nuevo.

## Tecnología propuesta

Una aplicación web que funcione bien en el celular, porque se usará desde el taller. No hace falta instalar nada: se abre en el navegador y se puede agregar a la pantalla de inicio.

| Parte | Propuesta | Por qué |
| --- | --- | --- |
| Sitio público | Páginas rápidas y optimizadas para Google | Que aparezca al buscar “detailing Tarija” o “nano cerámico Tarija” |
| Sistema interno | Aplicación web instalable (PWA) con usuarios y roles; funciona con conexión a internet, sin modo sin conexión | Un solo sistema para dueño, encargado y técnicos |
| Base de datos | PostgreSQL | Clientes, caja y sueldos en un lugar confiable, con respaldos diarios |
| Cotizaciones | PDF generado por el sistema con el logo de TocTar | Se imprime o se envía por correo o WhatsApp con un toque |
| Fotos | Almacenamiento en la nube | Fotos de consultas y de antes/después sin llenar el servidor |
| WhatsApp | Desde ya: saludo automático y respuestas rápidas de WhatsApp Business (gratis). Fase 1: enlaces con mensaje prellenado. Fase 2: WhatsApp Business API para avisos automáticos | La API de Meta cobra por conversación; conviene activarla cuando los recordatorios estén listos |
| Pagos QR | Registro manual del pago con foto del comprobante | Integrar con el banco es más caro y lento; se puede evaluar después |
| Hosting | Servidor en la nube con dominio propio (ej. toctar.com.bo) | Costo mensual bajo, incluido en el soporte mensual |

## Inversión y tiempos

Los montos se definen después de validar el alcance con el dueño. Los tiempos consideran un desarrollador apoyado por herramientas de IA para programar. Lo que más puede alargarlos no es el código, sino las validaciones con el dueño, el material del sitio (textos y fotos), la aprobación de WhatsApp Business API por Meta y las pruebas en el taller.

| Fase | Duración estimada | Inversión (Bs) |
| --- | --- | --- |
| Análisis y diseño | 1 semana | Por definir |
| Fase 1: Sitio público y base del sistema | 2 a 3 semanas | Por definir |
| Fase 2: Operación del taller | 3 a 4 semanas | Por definir |
| Fase 3: Administración | 2 a 3 semanas | Por definir |
| Dominio, hosting y soporte | Mensual | Por definir |

Forma de pago sugerida: 50% al iniciar cada fase y 50% al entregarla. Cada fase se entrega funcionando y se usa en el taller antes de empezar la siguiente.

## Respuestas del dueño

El dueño respondió el cuestionario; sus respuestas ya están aplicadas en esta propuesta.

| Tema | Respuesta | Qué cambia en el sistema |
| --- | --- | --- |
| Factura electrónica (SIAT) | No por ahora; más adelante, solo cuando el cliente la pida | Se guarda NIT y razón social; facturación en una fase futura |
| Volumen | Hoy unos 2 vehículos por día y hasta 3 a la vez; el negocio está creciendo | Agenda por espacios del taller, con cantidad configurable |
| Adelanto | Depende del servicio, normalmente Bs 200 (algunos clientes dan más); no se devuelve | Adelanto sugerido configurable y editable por reserva; si el cliente cancela, queda como ingreso |
| Mantenimiento | Solo nano cerámico, cada 3 meses, se cobra | Recordatorio solo para cerámico; el mantenimiento es un servicio del catálogo |
| Personal | 2 empleados, pago semanal | Periodo de planilla configurable (hoy semanal) |
| Horas extra | Se prorratean sobre la hora normal, hoy Bs 12,5 | Tarifa y recargo configurables (hoy Bs 12,5 por hora, sin recargo) |
| Entrada y salida | La marca cada empleado | Marcado desde el celular del técnico |
| Cotizaciones | Solo el dueño | Solo el rol dueño crea y envía cotizaciones. El dueño también atiende el WhatsApp; el encargado queda como rol opcional |
| Qué va primero | El sitio público | El sitio pasa a la Fase 1 |
| Pulido de vidrios e inyección y succión | Siguen | Agregados al catálogo |
| Tamaños de vehículo | Auto/sedán, camioneta, vagoneta | Precio base por esos 3 tamaños |
| Nano cerámico | 1, 2, 3, 5 y 10 años | 5 variantes en el catálogo |
| Cotización en PDF | Logo, validez, condiciones y garantía, formas de pago, adelanto y fotos del vehículo | Plantilla del PDF |
| Precios en el sitio | No, solo describir los servicios | Sitio sin precios |
| Material disponible | Logo en buena calidad y fotos de trabajos; sin dominio | Hay que registrar un dominio |
| Pedido adicional | “Que venda sin vender” | Sitio que convence con el proceso, las fotos y la garantía, sin tono de venta |

### Pendientes

- [ ] Lista de precios actual por servicio y tamaño, para la carga inicial; después el dueño la mantiene desde el panel.
- [ ] ¿Cuántos días ocupa cada servicio en el taller? Se necesita para la agenda.
- [ ] ¿Cuánto cuesta el mantenimiento del cerámico y qué incluye?
- [ ] Variantes de inyección y succión y de pulido de vidrios, si las hay.
- [ ] Elegir y registrar el dominio (por ejemplo, toctar.com.bo).

**Supuestos de esta propuesta:** una sola sucursal en Tarija; el cliente no tiene cuenta, no cotiza ni reserva por su cuenta; cotizaciones y reservas las registra el personal; los pagos QR se registran a mano.

## Próximos pasos

Cuando el dueño apruebe esta propuesta, el análisis se documenta en este orden:

1. **Casos de uso** por actor (dueño, encargado, técnico), con su diagrama general.
2. **Historias de usuario** con criterios de aceptación, priorizadas por fase. Ejemplo: *Como encargado, quiero registrar el adelanto de una reserva por QR o efectivo, para saber cuánto falta cobrar al entregar el vehículo.*
3. **Diagramas de secuencia** de los flujos clave: consulta y cotización en PDF, reserva con adelanto, ingreso del vehículo, cierre de la orden con aviso al cliente y recordatorio de mantenimiento.
4. **Modelo de datos**: clientes, vehículos, servicios, consultas, cotizaciones, citas, órdenes, pagos, inventario y empleados.
5. **Prototipo de pantallas** de la Fase 1, para validarlo con el equipo del taller antes de programar.
