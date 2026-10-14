# Material entregado por el dueño

- **Primera entrega:** 14 de octubre de 2026 (respuestas por WhatsApp a la lista del acuerdo)
- **Segunda entrega:** 14 de octubre de 2026 (logo, fotos, ubicación, WhatsApp, redes y respuestas S-1 a S-5)
- **Estado:** suficiente para empezar. **Día D = 14 de octubre de 2026.** Lo que falta se completa durante el desarrollo, antes de la semana en que se necesita (ver `08-desarrollo/plan-de-desarrollo.md`).
- **Dónde está:** los archivos (logo, fotos) se guardan fuera de Git, en la carpeta `material/` del proyecto (ignorada). Se cargan al sistema desde el panel; nunca se versionan.

## Respuestas

| # | Pedido | Respuesta del dueño | Estado |
|---|---|---|---|
| 1 | Logo | Recibido por correo | Recibido |
| 2 | Fotos de antes y después por servicio | Recibidas por correo. **Faltan las fotos principales de cada servicio:** el dueño graba videos y sacará fotos; el sitio usa una imagen de reemplazo mientras tanto | Parcial |
| 3 | Textos base | Historia y garantía recibidas (abajo). Faltan "cómo trabajan" y preguntas frecuentes | Parcial |
| 4 | Contacto | Dirección, ubicación en Google Maps, WhatsApp, correo y enlaces de redes recibidos. **Falta confirmar el horario** | Parcial |
| 5 | Dominio y titular | El dominio se basará en `toctardetailingcar` (como el correo). Faltan el dominio exacto y el nombre y CI o NIT del titular | Pendiente (antes de la semana 1, para levantar pruebas) |
| 6 | Precios por servicio, variante y tamaño | Mandó la **clasificación de vehículos (5 tamaños)**; los precios no | Parcial |
| 7 | Días por servicio | Solo cerámico: 1 día y medio. Más de un servicio: 2 a 3 días | Recibido |
| 8 | Mantenimiento del cerámico | Contenido recibido. El precio varía según tamaño, tratamiento y estado: se carga como "según evaluación" | Recibido |
| 9 | Variantes de inyección y succión y de pulido de vidrios | Sin respuesta | Pendiente |
| 10 | Condiciones y garantía del PDF | Sin respuesta (la garantía del punto 3 sirve de base) | Pendiente |
| — | Preguntas S-1 a S-5 | Respondidas (ver `05-analisis/casos-de-uso/casos-de-uso.md`): S-1 y S-3 confirmadas; S-2, S-4 y S-5 ajustadas | Recibido |
| 3b | Textos por servicio | Se arman por servicio: en qué consiste, cómo se hace y dudas frecuentes | Pendiente (semana 1, con cada servicio) |

## Textos recibidos (sin editar)

**Historia.** Toctar detailing empezó el 22 de junio de 2024. Después de trabajar en diferentes ciudades decidimos implementar el servicio en nuestra ciudad. Comenzamos en un garaje con las máquinas más básicas y ofreciendo solo servicio de pulido y nano cerámico.

**Garantías.** Al momento de recoger tu vehículo te damos un manual de indicaciones de los cuidados que el cliente debe tener con el vehículo. Si el cliente no hace caso de las indicaciones, la empresa no se hace cargo del vehículo. En cuestión a lavados es más fácil, ya que es notorio el trabajo y sobre todo es un cuidado más básico. Lo mismo es en restauración de faros con polímero y los demás servicios.

Los textos se pulen (ortografía y tono "que venda sin vender") y se le muestran al dueño para su aprobación; los ajustes de textos están incluidos en el acuerdo.

## Datos de contacto

- **Dirección:** Barrio Aeropuerto, calle Juan Pablo II, pasaje sin nombre conocido como "pasaje Tejerina", Tarija. Falta la ubicación exacta para el mapa (pin de Google Maps).
- **Horario:** 8:00 a 12:00 y 14:00 a 18:00 según la primera respuesta; pendiente de confirmar, con los días.
- **Correo de contacto:** toctartarija@gmail.com
- **Redes:** Facebook, Instagram y TikTok; los enlaces exactos los tiene YankoSoft y se cargan en los datos del negocio (HU-04).
- **WhatsApp y ubicación:** los tiene YankoSoft; se cargan en los datos del negocio (HU-04).

## Clasificación de vehículos (tamaños)

| # | Tamaño | Ejemplos |
|---|---|---|
| 1 | Compactos | Suzuki Alto, Kia Picanto, Vitz, Swift |
| 2 | Sedanes y hatchbacks medianos | Corolla, Sentra, Honda Civic, Mazda 3, Toyota Yaris |
| 3 | Vagonetas medianas | RAV4, Tucson, Sportage, X-Trail |
| 4 | Vagonetas grandes y camionetas | Land Cruiser Prado, Ford Explorer, Hilux, Ford Ranger |
| 5 | Extra grandes | Tundra, Sequoia, trufis |

## Mantenimiento básico del nano cerámico

- Lavado técnico de carrocería
- Limpieza de llantas y neumáticos
- Secado seguro con microfibra
- Descontaminación de pintura
- Inspección del estado del recubrimiento
- Aplicación de producto cerámico para fortalecer el nano cerámico

## Efecto en el diseño

| Respuesta | Efecto | Cambio necesario |
|---|---|---|
| 5 tamaños de vehículo en lugar de 3 | Ninguno en el código: los tamaños ya son configurables (RN-07). Cambian los ejemplos de los documentos | Se suma `descripcion` a `tamano_vehiculo` para mostrar los modelos de ejemplo al elegir el tamaño (ayuda al personal a clasificar). Ajuste menor, dentro del diseño |
| Cerámico: 1,5 días | La agenda es por día (S-3, sin confirmar): un trabajo de 1,5 días ocupa el espacio 2 días | Ninguno. La duración se guarda en días enteros y la reserva sugiere la duración, editable |
| Varios servicios: 2 a 3 días | La duración de un trabajo con varios servicios no es la suma | La reserva sugiere la duración mayor de sus servicios y el personal la ajusta (ya contemplado: "duración sugerida, editable") |
| "Manual de indicaciones" que se entrega al recoger el vehículo | Hoy es un papel del negocio. Si quieren que el sistema lo genere o lo imprima, es un pedido nuevo | Nada por ahora; si lo piden, va a `registro-de-cambios.md` |
| Sin fotos principales de los servicios | El sitio no puede quedar con espacios vacíos | La foto del servicio es opcional y se muestra una imagen de reemplazo con la marca (HU-07, HU-11). El dueño las sube desde el panel cuando las tenga |
| Validez de la cotización variable (S-5) | No hay una validez fija | La validez se define en cada cotización; la configuración solo sugiere (HU-25) |
| Entrega con saldo: dueño o encargado (S-2) | RN-13 se amplía | Permiso `entrega_con_saldo` asignable al encargado (HU-03) |
| Reclamos también para el encargado (S-4) | HU-17 | Módulo `reclamos` asignable al encargado (HU-03) |
