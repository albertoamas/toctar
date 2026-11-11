# P47 Enviar la cotización por WhatsApp — especificación

- **Pedido:** 47 (`03-cierre-comercial/registro-de-cambios.md`), aprobado el 11/11/2026, **sin costo** (incluido).
- **Historias:** HU-27 (compartir el PDF) y HU-40 (mensajes editables).
- **Estado:** hecho el 11/11/2026 (rama `pedido-47-enviar-cotizacion`).

## 1. Objetivo

Hoy "Compartir" abre el menú del teléfono con el PDF y hay que **buscar el chat del cliente a mano**; en la computadora el PDF se descarga y se adjunta en WhatsApp Web. Una página no puede adjuntar un archivo a un chat elegido, y mandar un documento a un número solo se puede con la API de WhatsApp Business, que está fuera de alcance (`acuerdo.md`).

"Enviar por WhatsApp" abre **el chat del cliente**, con su número, y un mensaje que lleva **un enlace al PDF** de esa versión. Quien cotiza solo toca Enviar; el cliente toca el enlace y ve la cotización, sin cuenta.

## 2. Alcance

- Un enlace por versión de cotización, con un código largo y aleatorio.
- Una ruta pública que entrega el PDF de ese enlace, o una página corta si ya no vale.
- El botón "Enviar por WhatsApp" en la versión que vale.
- La plantilla "Cotización" en Configuración > Mensajes.

Fuera: el envío automático (lo hace una persona), avisar cuando el cliente lo abre y enlaces para otros documentos.

## 3. Reglas que se cumplen

- **Sin cuenta para el cliente** (CLAUDE.md): el enlace no pide ingresar.
- **Una cotización enviada no cambia** (RN-02): el enlace entrega el PDF guardado de esa versión, no uno nuevo.
- **Datos del cliente, privados:**
  - el código tiene 122 bits aleatorios (`gen_random_uuid`), así que no se adivina;
  - la respuesta lleva `Cache-Control: private, no-store` y `X-Robots-Tag: noindex`;
  - `/c/` va en las rutas privadas de `robots.txt`;
  - el PDF sale del bucket privado por la app y no queda en ninguna dirección pública del almacenamiento.
- **Cuándo vale el enlace:**
  - **vigente**, hasta su fecha de validez inclusive (día de Bolivia): entrega el PDF;
  - **aceptada**: entrega el PDF siempre (el cliente puede querer verla después);
  - **vencida** (vigente pasada su fecha): una página "Esta cotización venció el …" con el WhatsApp del negocio;
  - **reemplazada**: una página "Esta cotización tiene una versión nueva" con el WhatsApp del negocio;
  - **un código que no existe**: la página de no encontrada del sitio.
- **Sin precios en el sitio público:** el enlace no es una página del sitio ni se enlaza desde él. Es el documento que se le manda al cliente.

## 4. Datos

- **`cotizacion.enlace`**: `text not null unique`, con `default replace(gen_random_uuid()::text, '-', '')` (32 caracteres hexadecimales). La migración lo llena para las versiones que ya existen (un valor distinto por fila).
- **`plantilla_mensaje`**: su clave admite `cotizacion` (la comprobación de la tabla se arma con `CLAVES_PLANTILLA`).

## 5. Pantallas y rutas

- **`GET /c/[codigo]`** (`src/app/c/[codigo]/route.ts`), pública:
  - si vale, el PDF en línea, con `Content-Disposition: inline` y su nombre;
  - si no, redirige a `/c/[codigo]/no-vigente`.
- **`/c/[codigo]/no-vigente`**: una página del sitio (fondo oscuro, la marca) que dice por qué ya no vale, con "Escribir por WhatsApp" al negocio. Sin datos del cliente ni montos.
- **Ficha de la cotización**, en la versión que vale (vigente o aceptada):
  - **"Enviar por WhatsApp"**: un enlace a `wa.me/<cliente>?text=…`, en otra pestaña;
  - **"Ver PDF"**;
  - **en su "⋯"**: "Compartir el PDF" (el menú del teléfono, con el archivo, para quien lo prefiera) y "Descargar PDF".

  La reemplazada conserva "Ver PDF" y su "⋯" con "Descargar PDF".

## 6. Acciones del servidor

No hay acciones nuevas: el enlace se arma al dibujar la ficha, que ya exige el permiso "Cotizaciones" (`exigirAccion("cotizar")` en la página).

## 7. Componentes y diseño

- `mensajeCotizacion` (`src/modulos/ordenes/mensajes.ts`, junto a los otros mensajes de WhatsApp), con los campos nombre, vehículo, negocio, número y enlace. Si el dueño quitó `{enlace}` de la plantilla, el enlace se agrega al final: el mensaje nunca sale sin él.
- `CompartirPdf` pasa a un hook (`useCompartirPdf`) para usarlo desde el "⋯". Si el teléfono pide otro toque (Safari, cuando bajar el PDF tarda), lo dice un aviso: "El PDF está listo: vuelve a elegir «Compartir el PDF»".

## 8. Textos de la interfaz

- **Botón:** "Enviar por WhatsApp".
- **Plantilla original:** "Hola {nombre}, te mandamos la cotización {numero} de {negocio} para tu {vehiculo}: {enlace}"
- **Reemplazada:** "Esta cotización tiene una versión nueva" / "Pídele la última a {negocio} por WhatsApp."
- **Vencida:** "Esta cotización venció el {fecha}" / "Escríbenos y te mandamos una actualizada."

## 9. Pruebas

- **Unitarias:**
  - `mensajeCotizacion`, con y sin `{enlace}` en la plantilla;
  - `estadoEnlace`: vigente, vencida, aceptada y reemplazada.
- **E2E** (`p47-enviar-cotizacion`):
  - el botón abre `wa.me` con el número del cliente y el enlace;
  - el enlace, sin sesión, entrega el PDF;
  - una versión reemplazada y una vencida llevan a su página;
  - un código inventado da no encontrada;
  - Compartir y Descargar siguen en el "⋯".

## 10. Orden de trabajo

1. La migración y el esquema.
2. Las reglas, el mensaje y sus pruebas unitarias.
3. La ruta y la página.
4. La ficha y el hook de compartir.
5. Las E2E.
6. Documentos y revisiones (código y seguridad).

## 11. Criterio de salida

Desde la ficha, un toque abre el chat del cliente con el mensaje y el enlace; el cliente abre el PDF sin cuenta; una versión que ya no vale no muestra montos; pasan las pruebas y las revisiones.

## 12. Decisiones abiertas

Ninguna.
