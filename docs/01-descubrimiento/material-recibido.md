# Material entregado por el dueño

- **Primera entrega:** 14 de octubre de 2026 (respuestas por WhatsApp a la lista del acuerdo)
- **Estado:** parcial. El plazo del acuerdo (día D) empieza cuando llegue el material de la web (ver "Qué falta").

## Respuestas

| # | Pedido | Respuesta del dueño | Estado |
|---|---|---|---|
| 1 | Logo | Lo manda por correo en PNG; pide la dirección de correo | Pendiente |
| 2 | Fotos de antes y después por servicio | Las manda por correo como documento | Pendiente |
| 3 | Textos base | Historia y garantía recibidas (abajo). Faltan "cómo trabajan" y preguntas frecuentes | Parcial |
| 4 | Contacto | Dirección, horarios, correo y redes recibidos. **El número de WhatsApp no está:** lo están recuperando o comprarán otro | Parcial |
| 5 | Dominio y titular | Respondió con un correo (`toctardetailingcar@gmail.com`). Faltan el nombre de dominio preferido y nombre y CI o NIT del titular | Aclarar |
| 6 | Precios por servicio, variante y tamaño | Mandó la **clasificación de vehículos (5 tamaños)**; los precios no | Parcial |
| 7 | Días por servicio | Solo cerámico: 1 día y medio. Más de un servicio: 2 a 3 días | Recibido |
| 8 | Mantenimiento del cerámico | Contenido recibido; **falta el precio** | Parcial |
| 9 | Variantes de inyección y succión y de pulido de vidrios | Sin respuesta | Pendiente |
| 10 | Condiciones y garantía del PDF | Sin respuesta (la garantía del punto 3 sirve de base) | Pendiente |
| — | Preguntas S-1 a S-5 | Sin respuesta | Pendiente |

## Textos recibidos (sin editar)

**Historia.** Toctar detailing empezó el 22 de junio de 2024. Después de trabajar en diferentes ciudades decidimos implementar el servicio en nuestra ciudad. Comenzamos en un garaje con las máquinas más básicas y ofreciendo solo servicio de pulido y nano cerámico.

**Garantías.** Al momento de recoger tu vehículo te damos un manual de indicaciones de los cuidados que el cliente debe tener con el vehículo. Si el cliente no hace caso de las indicaciones, la empresa no se hace cargo del vehículo. En cuestión a lavados es más fácil, ya que es notorio el trabajo y sobre todo es un cuidado más básico. Lo mismo es en restauración de faros con polímero y los demás servicios.

Los textos se pulen (ortografía y tono "que venda sin vender") y se le muestran al dueño para su aprobación; los ajustes de textos están incluidos en el acuerdo.

## Datos de contacto

- **Dirección:** Barrio Aeropuerto, calle Juan Pablo II, pasaje sin nombre conocido como "pasaje Tejerina", Tarija. Falta la ubicación exacta para el mapa (pin de Google Maps).
- **Horario:** 8:00 a 12:00 y 14:00 a 18:00. Falta confirmar qué días (¿lunes a sábado?).
- **Correo de contacto:** toctartarija@gmail.com
- **Facebook:** "Toc Tar detailing car tarija" · **Instagram:** "Tocta detaiing tarija" · **TikTok:** "toctar. Detailing". Faltan los enlaces exactos: los nombres llegaron con errores de tipeo.
- **WhatsApp:** pendiente (ver punto 4).

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
| Sin número de WhatsApp | El botón del sitio (HU-15) y los avisos (HU-35, HU-38) lo necesitan | Ninguno en el código (es configurable, HU-04); bloquea la publicación, no el desarrollo |
