# C7 Patrones comunes del panel — especificación

- **Fase y semana:** cierre de la Entrega 2 · del 18 al 20/11/2026 (1 a 3 días, §10)
- **Estado:** aprobada (18/11). Alcance acotado el 18/11: se mejoran 6 patrones y la regla de anchos, no todo el panel.
- **Historias:** las del panel que usan cada patrón (§5). No agrega funciones: cambia cómo se ven y se usan.
- **Base:** `docs/06-diseno/sistema-del-panel.md` (estructura, que se amplía con estos patrones), la skill
  `pantallas-panel`, la reunión del dueño sobre el panel (fin de octubre: "un panel administrativo estándar y amigable") y
  el checklist `docs/08-desarrollo/rediseno-panel-checklist.md`.
- **Prototipo (fase 0):** https://claude.ai/artifact/SJE6vhxguZyWteDE6XJLe6 (privado: se comparte desde su menú). La v2
  mostró 15 pantallas; la v3 muestra solo las de este alcance, completas y también a 1600 px.

## 1. Objetivo

Que las pantallas que más se usan en el recorrido de un trabajo (cotizar, reservar, recibir, trabajar, entregar y cobrar)
se vean y se usen igual entre sí, con los patrones del prototipo que el desarrollador eligió, y que todo el panel siga
una sola regla de anchos. La dirección de diseño de hoy se mantiene.

## 2. Alcance

### Incluye

- **6 patrones**, cada uno como un componente común, aplicados a sus pantallas (§5): ficha con el recorrido, formulario
  en pasos con resumen, flujo de un paso, modales, lista con acción en la fila y ficha con historia. Unas 14 pantallas.
- **La regla de anchos** (§4), para todo el panel a la vez, en `PaginaPanel` y en los campos de datos cortos.
- Las pruebas E2E que tocan esas pantallas, y el Manual del panel con las capturas que cambien.

### Queda como hoy (decisión del 18/11)

Estas pantallas no se rediseñan; solo heredan lo que cambie en los componentes que usan (por ejemplo, los modales y la
regla de anchos):

- **Inicio**: la dirección de hoy le gusta más al desarrollador que la del prototipo.
- **El menú**: el lateral negro en la computadora y el desplegable a la izquierda en el celular (sin barra inferior).
- **El checklist de Recibir** (las tarjetas de "Qué tiene"): Recibir solo cambia su marco (§5.3).
- **La letra**: Montserrat. **Los colores**: los de hoy (tarjetas blancas sobre `bg-fondo-panel`, el rojo solo en la
  acción principal y el módulo activo).
- **Las listas simples**: Clientes, Cotizaciones, Órdenes, Reclamos, Usuarios y Catálogo (ya tienen páginas y filtros).
- **La Agenda** (rehecha el 16/11) y **Nuevo cliente** (rehecho el 17/11, #271).
- **Configuración, Sitio web** y las pantallas del sistema (sin acceso, no existe, error).

### No incluye

- **Reportes y Gastos** (`p16-gastos`, #257): se revisan aparte, al decidir unirlos.
- El sitio público, el ingreso y el PDF de la cotización.
- Funciones nuevas (van a `03-cierre-comercial/registro-de-cambios.md`), cambios de datos o de reglas de negocio.
- Lo que tenía el plan amplio del 18/11 y salió al acotarlo: paleta nueva, tipografía nueva, barra inferior en el
  celular, menú claro, rediseño de cada pantalla y de cada componente. Queda en el historial de git de este archivo.

## 3. Principios

1. **Un patrón, un componente.** Cada patrón es una pieza común; una pantalla no arma el suyo a mano. Si una pantalla
   necesita algo que la pieza no tiene, se extiende la pieza (y su prueba de consistencia).
2. **Menos es más.** Cada pantalla muestra lo que decide primero, lo que se consulta después y lo poco usado en "Más".
3. **Siempre se sabe dónde se está y qué sigue.** Las fichas del recorrido dicen en qué paso está el trabajo y ofrecen
   el paso siguiente como su única acción roja.
4. **El celular primero.** Toques de 44 px, botones al alcance del pulgar, nada debajo del teclado.

## 4. La regla de anchos

### 4.1 La decisión: todo el ancho, alineado a la izquierda, con columnas según el tipo

En un panel con menú lateral, la práctica estándar (Shopify Polaris, Stripe, Linear y los paneles de Material) es que el
contenido **use todo el ancho disponible, alineado a la izquierda con el título de la página**, y que el espacio de las
pantallas grandes se aproveche con **columnas**, no con márgenes.

- **Por qué no centrado:** junto al menú lateral, un bloque centrado deja dos franjas vacías de distinto tamaño, y el
  título y los botones cambian de lugar según el ancho de la ventana. Alineado a la izquierda, el ojo siempre empieza en
  el mismo lugar.
- **Por qué no un tope general:** ya se probó dos veces. Con el tope de 1600 px sobraba espacio en pantallas grandes
  (#258), y con un tope en los campos el formulario se veía angosto y raro (revertido el 17/11).
- **Por qué columnas:** una tabla aprovecha el ancho; un formulario no (un campo de 900 px no se lee mejor). Para que un
  formulario use el ancho sin estirarse, se pone al lado lo que acompaña: el resumen, el total o el estado.

### 4.2 Por tipo de pantalla

| Tipo | Ancho | Celular y tableta | Computadora (desde 1280 px) |
|---|---|---|---|
| Lista, tablero, Agenda, Inicio | Todo | Una columna; tablas en filas | Tablas a todo el ancho |
| Ficha | Todo | Una columna: lo que decide, después lo que se consulta | Dos columnas: principal (unos 2/3) y lateral (1/3) |
| Formulario largo o en pasos | Todo | Una columna; el resumen arriba, plegado | El formulario (2/3) y el resumen fijo al costado (1/3) |
| Flujo de un paso | Todo | Una columna; el estado arriba | El paso (2/3) y el estado o resumen al costado (1/3) |
| Formulario corto en su pantalla (Nuevo cliente, Nuevo usuario) | Todo | Una columna | Sus secciones lado a lado (como Nuevo cliente, #271) |
| Modal | Fijo: chico 480 px, mediano 640 px, grande 800 px | A todo el ancho, desde abajo | Centrado sobre la pantalla (es lo único centrado) |

### 4.3 Dos excepciones con medida

- **Los datos cortos tienen el ancho de lo que llevan**, en cualquier pantalla: monto (10 rem), fecha (12 rem), año
  (7 rem), placa (12 rem), teléfono (14 rem), cantidad (7 rem). Es la regla de los formularios bien hechos (GOV.UK y
  Polaris usan anchos por tipo de dato) y no es un tope general: los demás campos siguen a todo el ancho de su columna.
- **El texto de corrido** (notas, descripciones largas, mensajes) se corta en unos 70 caracteres por línea, porque más
  largo se lee mal. Es solo el párrafo; su tarjeta sigue a todo el ancho.

### 4.4 Dónde se programa

`src/componentes/panel/pagina-panel.tsx` (el tipo de pantalla decide sus columnas: `PartesIguales` pasa a una grilla
principal y lateral), `campo-monto.tsx` y un mapa de anchos por tipo de dato para `Input` en `campo.tsx`. La regla queda
en `sistema-del-panel.md` §1 y en la skill `pantallas-panel`.

## 5. Los patrones, uno por uno

Cada patrón dice qué componente cambia, qué pantallas lo usan, qué se ve distinto, cómo se prueba y cuándo está hecho.

### 5.1 Ficha con el recorrido y el paso siguiente

> **Descartado el 18/11.** Se programó (la tarjeta del recorrido con puntos y las fichas en dos columnas de 2/3 y 1/3) y
> el desarrollador prefirió las fichas como estaban: Orden, Cotización y Reserva quedan como hoy, con sus barras de pasos
> y su paso siguiente. Lo de abajo queda como registro de lo que se probó.

- **Componentes:** `pasos-trabajo.tsx` (el indicador: Cotizado → Aceptado → Reservado → En el taller → Listo → Entregado),
  `paso-siguiente.tsx` (la tarjeta con el texto del estado y el botón del paso) y `pagina-panel.tsx` (principal y lateral).
- **Pantallas:** Orden (`/panel/ordenes/[id]`), Cotización (`/panel/cotizaciones/[id]`) y Reserva (`/panel/agenda/[id]`).
- **Qué cambia:**
  - Arriba, una sola tarjeta con el indicador de pasos y, debajo, el paso siguiente: un texto corto ("Atrasada 14 días.
    La entrega aproximada era el 4/11.") y el botón rojo grande del paso ("Marcar listo", "Aceptada: reservar",
    "Recibir vehículo").
  - Los pasos ya hechos llevan a su pantalla (la cotización, la reserva) cuando quien mira puede abrirla.
  - Columna principal: lo que decide (servicios y pagos, con "Registrar pago"; fotos en la orden). Lateral: datos y
    historia.
  - Las acciones poco usadas (extender, cancelar, rechazar, volver al paso anterior, nueva versión) en "Más".
- **Pruebas:** las E2E de orden, cotización y reserva (`hu-34-trabajar-orden`, `hu-34-historial`, `hu-25-cotizar`, `hu-28-seguimiento`, `hu-30-agendar`, `hu-31-reprogramar-cancelar`, `p31-flujo-trabajo`) siguen
  pasando; una E2E nueva comprueba que el indicador marca el paso actual (`aria-current="step"`) en las tres fichas.
- **Hecho cuando:** las tres fichas usan las mismas piezas, en el mismo orden, en 390, 1280 y 1600 px.

### 5.2 Formulario en pasos con resumen

- **Componentes:** `pasos-flujo.tsx` (la barra de pasos), `resumen-paso.tsx` (el cliente y el vehículo elegidos, con
  "Cambiar") y uno nuevo, `ResumenLateral` (el total y lo elegido, fijo al costado en la computadora y arriba, plegable,
  en el celular).
- **Pantallas:** Nueva cotización (`/panel/cotizaciones/nueva`), Nueva reserva (`/panel/agenda/nueva`, sus tres caminos)
  y Nueva versión (`/panel/cotizaciones/[id]/nueva-version`).
- **Qué cambia:**
  - El paso actual en una columna; al costado, el resumen con el total siempre a la vista (subtotal, descuento, total,
    adelanto sugerido).
  - El precio del catálogo como ayuda en verde bajo el precio ("Precio del catálogo para una vagoneta mediana: 1.400 Bs").
  - "Cómo se cotizó" en tarjetas (`opciones-en-tarjetas.tsx`).
  - En el celular, el botón del paso fijo abajo (`pie-formulario.tsx`), con "Atrás" al lado.
- **Pruebas:** `hu-25-cotizar`, `hu-30-agendar`, `p31`, `reserva-empieza-de-cero` y `hu-38` siguen pasando; el total del
  resumen cambia al cambiar el precio (E2E).
- **Hecho cuando:** las tres pantallas usan la misma barra, el mismo resumen y el mismo pie.

### 5.3 Flujo de un paso

- **Componentes:** uno nuevo, `AvisoEstado` (una franja con ícono y texto, en verde "Pagado por completo", en ámbar
  "Falta cobrar 300 Bs", en azul para información), y `pie-formulario.tsx`.
- **Pantallas:** Entregar (`/panel/ordenes/[id]/entregar`), Recibir (`/panel/ordenes/[id]/recibir`, solo el marco: el
  checklist queda como hoy) y Publicar en la galería (`/panel/ordenes/[id]/publicar`).
- **Qué cambia:**
  - Arriba, el estado que decide (en Entregar, si está pagado o cuánto falta; en Recibir, qué reserva se recibe).
  - Lo justo para el paso, y un solo botón grande al final ("Entregar vehículo", "Recibir vehículo", "Publicar").
  - Lo que el paso va a hacer, dicho antes en una línea ("Al entregar se programa el mantenimiento del nano cerámico
    para el 18 de febrero.").
- **Pruebas:** `hu-33-recibir`, `hu-33-checklist`, `hu-36-entregar`, `hu-41-galeria-desde-orden` y `flujo-taller-completo` siguen pasando.
- **Hecho cuando:** los tres pasos tienen el mismo marco: título con la placa, estado arriba, contenido, un botón.

### 5.4 Modales

- **Componentes:** `modal-formulario.tsx`, `modal-pie.tsx` (`PieModal`, `CancelarModal`) y uno nuevo, `DatoClave` (el
  recuadro con el dato que decide: "Falta cobrar 300 Bs", "Entrega actual: 4/11").
- **Pantallas:** todos los modales cambian a la vez, porque comparten la pieza (el título, el pie con "Cancelar" a la
  izquierda y la acción a la derecha en la computadora, y a todo el ancho en el celular; la hoja desde abajo). Se revisan
  uno por uno los 6 más usados:
  - Registrar pago (`registrar-pago.tsx`): "Falta cobrar", el monto ya escrito, "Cómo pagó" en tarjetas, la fecha.
  - Anular pago (`anular-pago.tsx`): el pago que se anula como dato clave; el botón de contorno rojo.
  - Reprogramar (`acciones-reserva.tsx`): las fechas actuales como dato clave.
  - Cancelar reserva (`acciones-reserva.tsx`): qué pasa con el adelanto, dicho antes; contorno rojo.
  - Rechazar la cotización (`estado-cotizacion.tsx`): el motivo en tarjetas.
  - Agregar servicio (`agregar-adicional.tsx`): el precio del catálogo como ayuda, como en Nueva cotización.
- **Lo destructivo:** desactivar, anular, eliminar y cancelar usan el botón de contorno con texto rojo, nunca el rojo
  sólido, y siempre piden confirmación (el rojo sólido es la acción principal).
- **Pruebas:** las E2E de cada modal siguen pasando (buscan por rol y nombre); `consistencia-panel` comprueba que ningún
  modal se arma a mano.
- **Hecho cuando:** los 6 revisados con capturas, y los demás vistos en el recorrido de capturas.

### 5.5 Lista con acción en la fila

- **Componentes:** `fila-lista.tsx` (`FilaConAcciones`, `ListaEnTarjeta`) y `tabla-acciones.tsx`.
- **Pantallas:** Saldos pendientes (`/panel/pagos`), Mantenimientos (`/panel/mantenimientos`, Por avisar y Más adelante)
  y Por reservar (dentro de `/panel/agenda`).
- **Qué cambia:**
  - Cada fila con lo que identifica (cliente y placa), lo que decide (el monto o el vencimiento, con su insignia) y su
    acción a la derecha ("Cobrar"; "Avisar" y "Reservar"; "Reservar").
  - En el celular, los botones a todo el ancho debajo de la fila.
  - Saldos dice el total arriba ("980 Bs por cobrar").
- **Pruebas:** `hu-37-saldos`, `hu-38-mantenimientos` y `p31-flujo-trabajo` siguen pasando.
- **Hecho cuando:** las tres listas usan la misma fila, con las acciones en el mismo lugar.

### 5.6 Ficha con historia

- **Componentes:** uno nuevo, `LineaDeTiempo` (cada trabajo con su insignia, la placa, el servicio, el monto si quien
  mira ve montos y la fecha; el más reciente arriba; plegada desde el sexto con "Ver toda la historia"). Reemplaza las
  listas sueltas de reservas y cotizaciones (`reservas-cliente.tsx` y la lista de cotizaciones del cliente).
- **Pantallas:** Ficha del cliente (`/panel/clientes/[id]`) y ficha del vehículo
  (`/panel/clientes/[id]/vehiculos/[vehiculo]`).
- **Qué cambia:**
  - Columna principal: la historia (cotizaciones, reservas y órdenes de todos sus vehículos, o del vehículo) con
    "Cotizar" en su título.
  - Lateral: los vehículos (en la del cliente) y los datos, con "Editar".
  - Arriba, "Escribir por WhatsApp" y "Más" (desactivar, cambiar de dueño).
- **Pruebas:** `hu-23-ficha-cliente` y `p37-cambio-de-dueno` siguen pasando; una E2E nueva comprueba el orden de la
  historia (lo más reciente primero) y que el perfil Taller no ve montos (RN-12).
- **Hecho cuando:** las dos fichas muestran la historia con la misma pieza.

## 6. Acciones del servidor

No cambian. La historia de §5.6 lee lo que ya existe (cotizaciones, reservas y órdenes del cliente o del vehículo); si
hace falta, una consulta nueva que las junte, sin cambiar reglas.

## 7. Componentes y diseño

| Componente | Estado | Patrón |
|---|---|---|
| `pagina-panel.tsx` | Cambia: columnas por tipo de pantalla | Anchos |
| `campo.tsx`, `campo-monto.tsx` | Cambian: ancho por tipo de dato | Anchos |
| `pasos-trabajo.tsx`, `paso-siguiente.tsx` | Cambian | 5.1 |
| `pasos-flujo.tsx`, `resumen-paso.tsx`, `pie-formulario.tsx` | Cambian | 5.2 y 5.3 |
| `ResumenLateral` | Nuevo | 5.2 |
| `AvisoEstado` | Nuevo | 5.3 |
| `modal-formulario.tsx`, `modal-pie.tsx` | Cambian | 5.4 |
| `DatoClave` | Nuevo | 5.4 |
| `fila-lista.tsx`, `tabla-acciones.tsx` | Cambian | 5.5 |
| `LineaDeTiempo` | Nuevo | 5.6 |
| `opciones-en-tarjetas.tsx`, `insignia.tsx` | Se usan como están | Varios |

Los colores, la letra y los tokens de `globals.css` no cambian.

## 8. Textos de la interfaz

Los del prototipo, revisados con cada pantalla: el botón dice el paso ("Marcar listo", "Aceptada: reservar", "Entregar
vehículo"); el aviso usa el mismo verbo ("Pago registrado."); el estado con palabra y no solo color ("Atrasada 14 días.",
"Pagado por completo."); los nombres de los estados de `NOMBRE_ESTADO_TRABAJO`.

## 9. Pruebas

- **Unitarias:** `consistencia-panel.test.ts` suma una regla por pieza nueva (ninguna ficha del recorrido sin
  `PasosTrabajo`, ningún modal sin `ModalFormulario`, ningún flujo de un paso sin `AvisoEstado`).
- **E2E:** las de cada patrón (§5) siguen pasando; dos nuevas: el indicador de pasos en las tres fichas y la historia del
  cliente. `recorrido-panel.spec.ts` toma las capturas a 390 y 1366 px con los tres roles.
- **Capturas:** antes y después de cada pantalla, a 390, 1280 y 1600 px, en su PR.
- **Celular real:** al cerrar, el recorrido completo de un trabajo en Android e iPhone.

## 10. Orden de trabajo

| Paso | Qué | Rama | Se aprueba con |
|---|---|---|---|
| 0 | Prototipo v3: las pantallas de este alcance, completas, con el menú desplegable y a 1600 px | — | Visto bueno del desarrollador y del dueño |
| 1 | La regla de anchos (§4) | `patrones-anchos` | Capturas de una pantalla de cada tipo a 390, 1280 y 1600 px |
| 2 | Modales (§5.4) | `patrones-modales` | Capturas de los 6 revisados |
| 3 | ~~Ficha con el recorrido (§5.1)~~ Descartado el 18/11: las fichas quedan como estaban | — | — |
| 4 | Formulario en pasos con resumen (§5.2) | `patrones-formulario-pasos` | Capturas de las tres pantallas |
| 5 | Flujo de un paso (§5.3) | `patrones-flujo-un-paso` | Capturas de Entregar, Recibir y Publicar |
| 6 | Lista con acción (§5.5) | `patrones-lista-accion` | Capturas de las tres listas |
| 7 | Ficha con historia (§5.6) | `patrones-ficha-historia` | Capturas de las dos fichas |
| 8 | Cierre: recorrido de capturas, Manual del panel, documentos, prueba en celulares | `patrones-cierre` | Checklist completo |

Cada paso, un PR revisado y en verde antes del siguiente. Los anchos y los modales van primero porque los heredan todas
las pantallas de los pasos siguientes.

## 11. Criterio de salida

- Cada fila del checklist marcada, con sus capturas en el PR.
- Las 14 pantallas usan su patrón con la pieza común (lo verifica `consistencia-panel`).
- Las E2E y el CI en verde, y la prueba en celulares hecha.
- El Manual del panel con las capturas nuevas de las pantallas que cambiaron.
- En la demo: el recorrido de un trabajo de la cotización al cobro en el celular, y la historia de un cliente.

## 12. Decisiones abiertas

| Qué | De quién | Mientras tanto |
|---|---|---|
| El visto bueno del dueño al prototipo v3 | Desarrollador con el dueño | Se avanza con la regla de anchos, que no cambia cómo se ve cada pantalla |
| Reportes y Gastos (#257) con estos patrones | Desarrollador, al decidir unirlos | Quedan como están en su rama |
| Búsqueda general desde el encabezado | Es una función nueva: va a `registro-de-cambios.md` si se quiere | Cada lista mantiene su buscador |
