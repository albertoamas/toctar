# P43 Volver a la pantalla de origen — especificación

- **Fase y semana:** cierre de la Entrega 2 · semana 5 (10/11/2026)
- **Estado:** hecha (11/11/2026, rama `volver-al-origen`); aprobada el 10/11, la propuesta completa (puntos 1, 2 y 3)
- **Historias:** todas las pantallas del panel con "Volver" (pulido 13.18: el botón de volver a la izquierda del título)
- **Base:** `inventario-pantallas.md`, `P37-cambio-de-dueno.md` (el primer origen en la dirección, `?desde=comprador`), `registro-de-cambios.md` (pedido 43)

## 1. Objetivo
Que "Volver" lleve a la pantalla de la que se vino, y no a una fija. Hoy una orden siempre vuelve a "Órdenes", aunque se haya entrado desde Inicio, desde la ficha del cliente o desde Saldos. Al volver a una lista, que siga con su pestaña, sus filtros y su búsqueda. Y que el "atrás" del celular no devuelva a un formulario ya enviado.

## 2. Alcance
- **Incluye:**
  1. **"Volver" a la pantalla de origen.** Cada enlace que abre otra pantalla lleva en la dirección de dónde sale (`?volver=`, con la pestaña, los filtros y la búsqueda de una lista). La pantalla lo usa para "Volver" y para la línea que dice a dónde vuelve. Sin "desde" (un enlace guardado, una pestaña nueva), vuelve a su lista de siempre, como hasta ahora.
  2. **Se conserva al crear o terminar un paso.** Nueva reserva, Nueva cotización, Nueva versión, Recibir, Entregar y Publicar pasan el "desde" a la pantalla que abren al terminar, y su "Cancelar" o primer "Volver" lleva ahí.
  3. **El "atrás" del celular salta el formulario enviado.** Al crear o terminar un paso, la pantalla nueva reemplaza al formulario en el historial (`redirect(…, RedirectType.replace)`).
- **No incluye:** el "atrás" dentro de los pasos de Nueva reserva y Nueva cotización (ya tienen "Atrás" propio y van en la dirección), ni las pantallas que se abren desde un solo lugar (Configuración, Sitio web, Usuarios), que ya vuelven bien.

## 3. Reglas que se cumplen
- **El parámetro se llama `volver`** (`?volver=/panel/clientes/8`), no `desde`: Nueva versión ya usa `desde` para la versión de la que parte y Cambiar de dueño para `desde=comprador`. En esta especificación, "desde" es la pantalla de origen.
- **Seguridad (no es un desvío abierto):** "desde" solo se acepta si es una dirección del panel: empieza con `/panel`, sin `//`, sin `\`, sin esquema ni dominio (se lee con `new URL(desde, base)` y se exige el mismo origen y que la ruta empiece con `/panel/` o sea `/panel`). Hasta 1000 caracteres. Si no cumple, se ignora y se vuelve a la lista de siempre.
- **Permisos:** si "desde" es una pantalla de un módulo que quien mira no puede abrir (por ejemplo, Saldos sin Pagos), se ignora. Para no mostrar un botón que lleva a "Sin acceso".
- **Nada del negocio cambia:** ninguna regla, tabla ni permiso. Solo direcciones y textos de "Volver".

## 4. Datos
Sin cambios en la base.

## 5. Pantallas y rutas

### Dónde se entra y a dónde vuelve (antes → ahora)

| Pantalla | Antes, "Volver" | Se entra desde | Ahora |
|---|---|---|---|
| Orden `/panel/ordenes/[id]` | Órdenes | Órdenes (con su filtro), Inicio, Saldos, ficha del cliente, Mantenimientos, tablero de Agenda, la reserva; al terminar Recibir, Entregar o Publicar | Al origen |
| Reserva `/panel/agenda/[id]` | Agenda | Agenda (con su semana y día), Inicio, ficha del cliente, la cotización, Mantenimientos, la orden; al crearla | Al origen |
| Cotización `/panel/cotizaciones/[id]` | Cotizaciones | Cotizaciones (con su pestaña y búsqueda), Inicio, ficha del cliente, la reserva; al crearla o versionarla | Al origen |
| Ficha del cliente `/panel/clientes/[id]` | Clientes | Clientes (con su búsqueda), la orden, la reserva, la cotización, Mantenimientos; al crearlo | Al origen |
| Nueva reserva | Agenda | Agenda, Inicio, ficha del cliente, la cotización ("Reservar"), Mantenimientos | Al origen; se conserva en los cuatro pasos |
| Nueva cotización | Cotizaciones | Cotizaciones, Inicio, ficha del cliente | Al origen; se conserva en los tres pasos |
| Reclamo `/panel/reclamos/[id]` | Reclamos | Reclamos (con su pestaña), Inicio | Al origen |
| Servicio del catálogo | Catálogo | Catálogo (con "Inactivos"), "Abrir en el catálogo" desde su página del sitio | Al origen |
| Servicio del sitio | Sitio › Servicios | Sitio › Servicios, "Su página en el sitio" desde el catálogo | Al origen |
| Usuario `/panel/usuarios/[id]` | Usuarios | Usuarios (con "Desactivados") | A Usuarios, con su píldora |
| Recibir, Entregar, Publicar, Nueva versión, Cambiar de dueño | La reserva, la orden o la cotización | Solo desde ahí | Igual; al terminar, la pantalla nueva vuelve al origen de la anterior |

### El texto debajo del título
Dice a dónde vuelve, según el "desde": Inicio, Agenda, Órdenes, Cotizaciones, Clientes, Saldos pendientes, Mantenimientos, Reclamos, Catálogo y precios, Usuarios, Servicios (del sitio); y para una ficha: Reserva, Orden, Cotización, Cliente, Servicio del catálogo, Su página en el sitio. El nombre accesible del botón sigue siendo "Volver a {texto}".

### Las fichas de un trabajo que ya no son lo que eran
Al terminar Recibir, la reserva pasa a orden (su dirección lleva a la orden). Si el "desde" de un paso es la propia reserva u orden del trabajo, se usa el "desde" de esa pantalla: la orden recibida vuelve a donde se estaba antes de abrir la reserva (por ejemplo, Agenda o Inicio), y no a la reserva, que ahora redirige a la orden.

## 6. Acciones del servidor
Las que redirigen al terminar reciben `volver` (campo oculto del formulario), lo validan con la misma regla (§3) y lo agregan a la dirección a la que redirigen, con `RedirectType.replace`:
- `crearReserva` → la reserva (`?agendada=1&volver=…`)
- `crearCotizacion` y `crearVersion` → la cotización
- `crearCliente` → la ficha del cliente
- `recibirVehiculo`, `entregarVehiculo`, `publicarEnGaleria` → la orden
- `cambiarDuenoVehiculo` → la ficha del nuevo dueño
- `crearServicio` (modal del catálogo) y `crearUsuario` → su ficha o la lista (solo `replace`: se crean desde su lista)

## 7. Componentes y diseño
- **`src/lib/volver.ts`** (funciones puras, con prueba unitaria):
  - `leerDesde(valor)`: la dirección validada (§3) o `null`.
  - `conDesde(href, desde)`: el enlace con `desde` (codificado). Si el resultado supera los 1000 caracteres, se quita el `desde` anidado más adentro.
  - `textoVolver(ruta)`: el texto de §5, o `null` si la ruta no es una pantalla conocida (entonces se ignora).
  - `sinElTrabajo(desde, trabajoId)`: si `desde` es la reserva u orden de ese trabajo (o uno de sus pasos), devuelve el `desde` de esa pantalla.
- **`volverDesde(parametros, porDefecto, usuario)`** (`src/lib/volver.ts`; al principio estaba aparte, en `volver-servidor.ts`): lee `desde`, comprueba el permiso del módulo y devuelve `{ href, texto }` para `EncabezadoPagina`.
- **`aqui(ruta, parametros)`**: la dirección actual de una pantalla del servidor (su ruta y sus parámetros), para los enlaces que salen de ella.
- `EncabezadoPagina` y `BotonVolver` no cambian: reciben `volver` como hasta ahora.
- **`TablaLista`** recibe `desde` (la lista con su pestaña, filtros y búsqueda) y lo agrega a cada fila; `ListaCotizaciones` y `ReservasCliente`, lo mismo para la ficha del cliente. El tablero de la Agenda (`TableroSemana`, `AgendaDelDia`) lo pasa a cada reserva y a cada "Reservar".
- **Crear servicio** (modal sobre el Catálogo) sigue con `push`: con `replace`, la lista saldría del historial.

## 8. Textos de la interfaz
- Debajo del título: "Inicio", "Agenda", "Órdenes", "Cotizaciones", "Clientes", "Saldos pendientes", "Mantenimientos", "Reclamos", "Catálogo y precios", "Usuarios", "Servicios", "Reserva", "Orden", "Cotización", "Cliente", "Servicio del catálogo", "Su página en el sitio".
- Botón: "Volver a {texto}" (nombre accesible, como hoy).

## 9. Pruebas
- **Unitarias** (`tests/unit/volver.test.ts`): `leerDesde` acepta `/panel`, `/panel/ordenes?filtro=listo` y rechaza `//otro.com`, `https://otro.com/panel`, `/\\otro`, `/sitio`, `javascript:`, vacío y más de 1000 caracteres; `textoVolver` de cada ruta; `conDesde` codifica y recorta lo anidado; `sinElTrabajo`.
- **De punta a punta** (`tests/e2e/p43-volver.spec.ts`):
  1. Una orden abierta desde Inicio, desde la ficha del cliente y desde Saldos vuelve a cada una, con su texto.
  2. Desde Órdenes › "Listas" con una búsqueda, la orden vuelve a la lista con el filtro y la búsqueda.
  3. Nueva reserva desde la ficha del cliente: al crearla, la reserva vuelve al cliente.
  4. Recibir desde la reserva abierta desde Agenda: la orden vuelve a Agenda; y el "atrás" del navegador no vuelve a Recibir.
  5. Un `desde` de otro sitio (`?volver=https://otro.com`) se ignora: vuelve a la lista de siempre.
  6. Sin el permiso del módulo de "desde" (un encargado sin Pagos con `?volver=/panel/pagos`), vuelve a la lista de siempre.

## 10. Orden de trabajo
Una rama, `volver-al-origen`, y un PR: primero `volver.ts` con sus pruebas; después las pantallas de §5 (los enlaces que salen y el "Volver" que llega); después los flujos (§6) con `replace`; al final las E2E y los documentos.

## 11. Criterio de salida
En el celular y en la computadora, desde cada origen de la tabla de §5, "Volver" lleva a esa pantalla, con su texto; las listas vuelven con su pestaña, filtros y búsqueda; después de crear o terminar un paso, el "atrás" del navegador no vuelve al formulario. E2E completas en verde.

## 12. Decisiones abiertas
Ninguna.
