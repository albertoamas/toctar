# Prueba a mano en celulares reales

Lo que las pruebas automáticas no alcanzan a ver: la cámara, el dedo, instalar la app, compartir por WhatsApp, imprimir y el teclado del iPhone. Cierra los ⏳ de `criterios-entrega-1.md` (6.2) y de `criterios-entrega-2.md` (23.7, 26.4, 27.3, 32.5, 33.6, 36.5, el ciclo completo con los dos roles y RNF-03).

- **Dónde:** `https://pruebas.toctardetailing.com` (la cámara, la instalación y compartir piden https: en `localhost` no se prueban).
- **Con qué:** un **Android con Chrome** y un **iPhone con Safari**. Lo ideal es uno de cada uno; si hay uno solo, se hace todo en ese y lo que es propio del otro queda anotado como pendiente.
- **Datos:** inventados (cliente "Prueba Celular", placa `9999TST`, WhatsApp propio para recibir los mensajes). Nunca datos de clientes reales: pruebas no es producción.
- **Cuánto lleva:** unas 2 horas la primera vuelta completa; las de los otros perfiles, unos 20 minutos cada una.

## Cómo anotar

Cada punto se marca con ✅ si anduvo, o con ❌ y una nota corta: **qué celular, qué hiciste, qué esperabas y qué pasó**, con una captura de pantalla. Una sola línea basta: "iPhone 13, Safari: en Recibir, al tomar la foto del frente la pantalla quedó en blanco". Los ❌ se pasan a YankoSoft todos juntos al terminar.

## 0. Antes de empezar

- [ ] El dueño de prueba y tres encargados de prueba creados desde **Usuarios**, uno con cada perfil: **Taller**, **Atención** y **Todo**. Las contraseñas, anotadas aparte.
- [ ] En **Catálogo**, al menos dos servicios con precio, y uno de ellos con mantenimiento y su frecuencia.
- [ ] El celular con la batería cargada y con el WhatsApp de prueba a mano.

## 1. El sitio público (sin ingresar)

En los dos celulares, primero en vertical y después en horizontal:

- [ ] La portada carga rápido, con el video o la foto de arriba, y nada se sale de la pantalla hacia los costados.
- [ ] El comparador de antes y después se arrastra con el dedo, y la página sigue subiendo y bajando normal al deslizar por encima de él.
- [ ] Servicios: la lista y la página de un servicio. No aparece ningún precio.
- [ ] Galería: abrir una foto, pasar a la siguiente deslizando y cerrarla.
- [ ] Nosotros, Preguntas frecuentes (se abren y se cierran), Garantía y Privacidad se leen bien.
- [ ] Contacto: el botón de WhatsApp abre WhatsApp con el mensaje escrito, y el mapa se ve.
- [ ] El botón flotante de WhatsApp no tapa nada importante.
- [ ] Compartir la portada y un servicio por WhatsApp: se ve la tarjeta con la imagen y el título.
- [ ] Garantía y reclamos: mandar un reclamo con una foto tomada con la cámara. Llega al panel, en Reclamos, con la foto.

## 2. Instalar la app

- [ ] **Android:** abrir `/panel` en Chrome, menú de los tres puntos, **Instalar app** (o "Agregar a pantalla principal"). Aparece el ícono de TocTar en el inicio.
- [ ] **iPhone:** en Safari, el botón de compartir, **Agregar a inicio**. Aparece el ícono de TocTar.
- [ ] Abierta desde el ícono, se ve como una app (sin la barra de direcciones) y pide ingresar.
- [ ] Girar el celular a horizontal: la app gira y se acomoda.
- [ ] Cerrarla del todo y volver a abrirla desde el ícono: sigue con la sesión iniciada.
- [ ] Con el modo avión puesto, abrirla: aparece el aviso de que no hay conexión, sin pantalla rota. Al quitar el modo avión, vuelve a andar.

## 3. Ingresar y la cuenta

- [ ] Ingresar con el dueño. Con el teclado del iPhone abierto, el botón **Ingresar** se puede tocar sin cerrar el teclado.
- [ ] Una contraseña mal escrita muestra el error junto al campo, en español.
- [ ] El administrador de contraseñas del celular ofrece guardarla y después la completa sola.
- [ ] **Cambiar mi contraseña** (en la ficha de su usuario): pide la actual, cambia a una nueva y sigue con la sesión iniciada. Salir e ingresar con la nueva.
- [ ] Salir: vuelve al ingreso, y con el botón Atrás del celular no se ve el panel.

## 4. Un trabajo completo, de la cotización a la entrega (con el dueño)

Es la prueba más importante: el recorrido de todos los días, de punta a punta, en el celular.

### Cliente y vehículo
- [ ] **Clientes**, **Agregar cliente** con su vehículo (marca, modelo, color y placa). Con el teclado abierto se ve el campo que se está escribiendo, y el de WhatsApp abre el teclado de números.
- [ ] Guardar y, enseguida, volver a abrir la ficha: el vehículo está con **su color** (23.7). Repetirlo una vez con los datos móviles en lugar de wifi.

### Cotización
- [ ] **Cotizaciones**, nueva cotización para ese cliente, con dos servicios. El total se calcula bien.
- [ ] Abrir el PDF en el celular: se lee sin hacer zoom raro y los montos están completos (26.4).
- [ ] **Compartir el PDF** por WhatsApp a tu número, en Android y en iPhone: llega el archivo PDF, no un enlace roto (27.3).
- [ ] **Enviar por WhatsApp**: abre WhatsApp con el mensaje armado.
- [ ] Imprimir el PDF en A4 (desde la PC o el celular): entra en la hoja, sin cortes ni páginas en blanco (26.4).
- [ ] **Aceptó**: la cotización queda aceptada "Sin fecha".

### Reserva
- [ ] En **Agenda**, aparece en **Por reservar**. Tocar **Reservar**, elegir día, hora y espacio, y **Reservar**.
- [ ] El tablero de la Agenda se mueve con el dedo y muestra la reserva en su día.

### Recibir el vehículo
- [ ] Desde la reserva, **Recibir vehículo**.
- [ ] El checklist parte por parte: marcar algunas como bien y otra con un detalle.
- [ ] **Tomar foto** con la cámara del celular en una parte con detalle: se abre la cámara trasera, la foto queda y se ve la miniatura (33.6). En iPhone y en Android.
- [ ] Elegir una foto de la galería del celular en lugar de tomarla: también anda.
- [ ] Las fotos del frente y de los costados (las que pida) se suben sin que la pantalla se congele, también con datos móviles.
- [ ] Al terminar, la orden queda **En el taller**.

### En el taller
- [ ] **Empezar trabajo** y después marcarla lista. El paso de arriba avanza.
- [ ] **Avisar por WhatsApp**: abre WhatsApp con el aviso de que el vehículo está listo.

### Cobrar
- [ ] **Registrar pago** del adelanto o del total, con la **foto del comprobante tomada con la cámara** (32.5). La foto se ve después en el pago.
- [ ] En **Pagos** (saldos), el saldo de ese cliente baja o desaparece.

### Entregar
- [ ] **Entregar vehículo**, con el nombre de quien recibe.
- [ ] **La firma con el dedo** en el recuadro (36.5): el trazo sigue al dedo, la pantalla no se desplaza mientras se firma, y se puede borrar y volver a firmar. Probar también con el celular en horizontal.
- [ ] Al confirmar, la orden queda **Entregada** y la firma se ve en grande desde la orden.

### Después de la entrega
- [ ] **Publicar en la galería**: elegir el antes y el después. Aparece en la galería del sitio en unos segundos (recargar).
- [ ] En **Mantenimientos** aparece el vehículo para su próximo mantenimiento (si el servicio tenía uno), con **Avisar** por WhatsApp.

## 5. Lo del sitio desde el panel (con el dueño)

- [ ] **Sitio**, **Galería**: **Subir fotos** abre el modal, tomar una foto con la cámara y otra de la galería del celular, y guardarlas.
- [ ] **Sitio**, **Textos**, **Privacidad**: editar una sola sección y **Guardar sección**. En el sitio cambió solo esa.
- [ ] El video de la portada: subir uno corto desde el celular (de menos de 20 MB) y verlo en el sitio.
- [ ] **Reclamos**: abrir el que se mandó en el punto 1 y ver su foto.

## 6. Los modales y el teclado (en iPhone, sobre todo)

En tres o cuatro modales cualquiera (editar un cliente, registrar un pago, subir fotos, editar una sección):

- [ ] El modal sube desde abajo y los botones de guardar quedan a la vista con el teclado abierto.
- [ ] Al tocar un campo, la pantalla no salta ni hace zoom solo.
- [ ] **Cancelar** y el gesto de cerrar lo cierran sin guardar.
- [ ] Al guardar, el modal se cierra y aparece el aviso verde.
- [ ] Tocar dos veces rápido el botón de guardar no crea dos registros.

## 7. Con cada perfil de encargado

Salir del dueño e ingresar con cada encargado. Para cada uno, qué ve y qué no:

| Perfil | Debe ver | No debe ver |
|---|---|---|
| **Taller** | Inicio con "Para hoy", Agenda y Órdenes; puede recibir, tomar fotos, avisar y entregar con firma | **Ningún precio ni saldo**, ni Clientes, Cotizaciones, Pagos, Mantenimientos, Sitio web, Reclamos, Catálogo, Usuarios ni Configuración |
| **Atención** | Lo de Taller más Clientes, Cotizaciones, Pagos y Mantenimientos, con los precios | Sitio web, Reclamos, Catálogo, Usuarios ni Configuración |
| **Todo** | Lo de Atención más Sitio web y Reclamos, y puede entregar con saldo pendiente | Catálogo, Usuarios ni Configuración (son solo del dueño) |

- [ ] **Taller:** recibir un vehículo y entregarlo con firma, de punta a punta, sin que aparezca un monto en ninguna pantalla ni en ningún aviso.
- [ ] **Taller:** escribir a mano en el navegador la dirección `/panel/pagos`: muestra que no tiene acceso.
- [ ] **Atención:** cotizar, compartir el PDF y registrar un pago.
- [ ] **Todo:** una vuelta por cada módulo que tenga, y entregar un vehículo con saldo pendiente (a Taller y Atención no los deja).
- [ ] Ningún encargado puede crear un dueño ni cambiar la cuenta del dueño.

## 8. Al terminar

- [ ] Pasar los ❌ a YankoSoft, con su celular, sus pasos y su captura.
- [ ] Marcar en `criterios-entrega-1.md` y `criterios-entrega-2.md` los ⏳ que quedaron ✅ (6.2, 23.7, 26.4, 27.3, 32.5, 33.6, 36.5, el ciclo con los dos roles y RNF-03), con la fecha y los celulares usados.
- [ ] Desinstalar la app de prueba del celular si no es el del dueño, y desactivar los encargados de prueba.
