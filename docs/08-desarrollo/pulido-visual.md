# Pulido visual de la Entrega 1

- **Inicio:** 16 de octubre de 2026
- **Meta:** terminar antes de la demo del viernes 23 (sitio) y del acta del viernes 30 (panel).
- **Qué es:** se repasa cada pantalla de la Entrega 1, una por una, para que se vea y se use mejor. **No se agregan funciones.** Si aparece algo que el contrato no incluye, se anota en `03-cierre-comercial/registro-de-cambios.md` y no se programa.

## Con qué mirada se trabaja

Cada pantalla se revisa como lo haría un **desarrollador frontend senior y un diseñador de UI/UX profesional**, no solo "que se vea lindo":

- **Primero el usuario y su tarea.** Quién usa la pantalla (un cliente en el celular, el dueño en el taller con poco tiempo y al sol), qué vino a hacer y qué le estorba. Lo que no ayuda a esa tarea se saca.
- **Jerarquía clara.** Lo más importante se ve primero; una sola acción principal por pantalla; el espacio y el tamaño ordenan, no los adornos.
- **Coherencia.** Los mismos componentes, espacios, tamaños de letra y textos en todo el sistema. Si algo se resuelve en una pantalla, se resuelve igual en las demás.
- **Todos los estados.** Vacío, cargando, con error, con muchos datos, con textos largos, sin foto, sin permiso. No solo el caso feliz.
- **Decisiones con fundamento.** Cada cambio se justifica (accesibilidad, legibilidad, uso con el pulgar, marca, rendimiento) y se mide cuando se puede (contraste, Lighthouse, capturas). Si algo no mejora, no se cambia.
- **Sin atajos.** Nada de parches de estilo sueltos, `!important`, valores mágicos ni duplicar un bloque para "salir del paso": se arregla en el componente o en el token que corresponde.
- **Con las skills de diseño.** Antes de analizar cada pantalla se carga la skill de diseño del proyecto (`frontend-design`, activada en `.claude/settings.json`) y se siguen sus criterios: plan de diseño revisado contra el encargo antes de programar, tipografía y jerarquía intencionales, sin los rasgos de "plantilla genérica", movimiento con medida y autocrítica con capturas. Sus reglas no pasan por encima de la identidad visual de TocTar: donde la marca ya decidió (colores, tipografías, corte a 60°), manda la marca.
- **Restricción.** La marca ya tiene su recurso fuerte (rojo, corte a 60°, línea LED); se usa con medida. Pulir es quitar ruido antes que agregar decoración.

## Cómo se trabaja cada pantalla

1. **Antes:** se carga la skill `frontend-design`. Capturas en celular (360 y 390 px) y computadora (1280 px). En el panel, también la tableta (768 px).
2. **Análisis:** se revisa la pantalla contra los estándares de abajo y se anota en su registro qué se encontró.
3. **Propuesta:** se acuerdan los cambios con YankoSoft antes de programarlos.
4. **Cambios:** en la rama del grupo (ver "Ramas"), con commits chicos y separados (estilo, texto, estructura).
5. **Después:** capturas en los mismos tamaños, para comparar.
6. **Verificación:** la lista "Al terminar cada pantalla".
7. **Registro:** se completa la sección de la pantalla y su estado en la tabla.

Estados: ⏳ pendiente · 🔵 en curso · ✅ terminada.

## Estándares

### Identidad visual
- Solo los tokens de `src/app/globals.css` (`bg-rojo`, `text-rojo-texto`, `text-tinta-suave`, `bg-superficie`…). Nada de colores sueltos ni valores de color a mano.
- El sitio y la pantalla de ingreso siempre en oscuro; el panel en claro, con la barra lateral negra.
- El rojo de marca no va como texto chico: para eso existe `rojo-texto`. Los titulares van en `font-heading italic`.
- El único ángulo diagonal es 60°, pintado con degradado y no con `clip-path` (`06-diseno/identidad-visual.md`).
- Logos de `public/marca/`, sin recolorear. Con lema solo desde 360 px (horizontal) o 320 px (vertical).
- Los mismos componentes en todas las pantallas (`Campo`, `Button`, `tt-boton`, insignias): una pantalla no inventa su propio estilo.

### Celular primero y app instalable (PWA)
- Se diseña primero para 360 px y después se agranda. Sin desplazamiento horizontal en ningún ancho.
- Áreas táctiles de 44 × 44 px como mínimo; nada importante pegado al borde de la pantalla.
- Instalada como app: respeta la muesca y la barra inferior del teléfono (`safe-area`), y el aviso sin conexión se sigue viendo bien.
- Formularios cómodos en el celular: el teclado que corresponde (`inputMode`, `type`), autocompletado y botones que no queden tapados por el teclado.

### Accesibilidad (RNF-14)
- Contraste AA como mínimo (4,5:1 en texto normal).
- Se puede usar entero con teclado, con el foco visible.
- Imágenes con texto alternativo; íconos sueltos con `aria-label`; el color siempre acompañado de una palabra (por ejemplo, en las insignias).
- Un solo `h1` por pantalla y títulos en orden.
- Las animaciones respetan "reducir movimiento" (`prefers-reduced-motion`).

### Rendimiento (RNF-02)
- Lighthouse móvil: rendimiento ≥ 90 y 100 en accesibilidad, buenas prácticas y SEO en el sitio (el ingreso y el panel no se indexan a propósito).
- CLS 0: nada salta mientras carga. El espacio reservado mientras cargan los datos tiene el tamaño del contenido final.
- Las fotos con su tamaño declarado; carga diferida si no están en la primera pantalla.

### Textos
- En español de Bolivia, de tú, claros y cortos. Los botones dicen lo que hacen ("Guardar cambios", no "Enviar").
- Los errores dicen qué pasó y cómo seguir. Las pantallas vacías invitan a la acción.
- Sin precios ni testimonios en el sitio público (RN-10).

### Código
- Nada de valores del negocio fijos en el código: todo sale del panel.
- Sin código muerto ni duplicado: si dos pantallas repiten un bloque, se vuelve un componente compartido.
- Las reglas del proyecto en `CLAUDE.md` (Server Components por defecto, sesión dentro de `<Suspense>`, validación con Zod).

## Al terminar cada pantalla

- [ ] Capturas del después en todos los tamaños, revisadas.
- [ ] `npm run lint`, `npm run typecheck` y `npm test` sin errores.
- [ ] Las E2E de la pantalla pasan, en celular y en escritorio. Si cambió un texto o un rol, la prueba se actualiza; nunca se borra para que pase.
- [ ] Sin código muerto ni duplicado: `npx -y knip@5` no muestra nada nuevo. Avisos ya conocidos, que no son errores: `public/sw.js`, los scripts, `src/lib/utils.ts` (lo usa la herramienta de shadcn), `tests/e2e/preparar.setup.ts`, `@tailwindcss/turbopack`, partes sin usar de componentes de shadcn y tipos exportados.
- [ ] Lighthouse móvil, si la pantalla es del sitio.
- [ ] Registro de la pantalla completo y estado en ✅.

## Al terminar cada grupo

- [ ] `npm run test:e2e` completo.
- [ ] Pull Request a `develop` con las capturas de antes y después, revisado y unido con squash.
- [ ] Los errores encontrados, en la tabla de `09-pruebas/criterios-entrega-1.md`.

## Ramas

Una rama por grupo, desde `develop`: `pulido/comunes`, `pulido/sitio`, `pulido/ingreso`, `pulido/panel-sitio`, `pulido/panel-gestion`, `pulido/panel-configuracion`.

## Pantallas

### 1. Piezas comunes
Se hacen primero: aparecen en todas las pantallas.

| # | Pantalla | Estado |
|---|---|---|
| 1.1 | Encabezado y menú del sitio (con el menú del celular) | ✅ 16/10 |
| 1.2 | Pie del sitio | ✅ 16/10 |
| 1.3 | Botón fijo de WhatsApp | ✅ 18/10 |
| 1.4 | Estructura del panel: barra lateral, menú del celular y usuario | ⏳ |
| 1.5 | Avisos, estados vacíos y de carga del panel | ⏳ |

### 2. Sitio público
Antes de la demo del viernes 23.

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 2.1 | Portada | `/` | ⏳ |
| 2.2 | Servicios | `/servicios` | ⏳ |
| 2.3 | Página de un servicio | `/servicios/[slug]` | ⏳ |
| 2.4 | Galería y visor de fotos | `/galeria` | ⏳ |
| 2.5 | Nosotros | `/nosotros` | ⏳ |
| 2.6 | Preguntas frecuentes | `/preguntas-frecuentes` | ⏳ |
| 2.7 | Contacto | `/contacto` | ⏳ |
| 2.8 | Garantía y reclamos | `/garantia` | ⏳ |
| 2.9 | Página no encontrada | cualquier ruta inexistente | ⏳ |
| 2.10 | Sin conexión | `public/sin-conexion.html` | ⏳ |

### 3. Ingreso

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 3.1 | Ingresar | `/ingresar` | ⏳ |

### 4. Panel: inicio y sitio web

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 4.1 | Inicio | `/panel` | ⏳ |
| 4.2 | Servicios del sitio | `/panel/sitio` | ⏳ |
| 4.3 | Nuevo servicio | `/panel/sitio/servicios/nuevo` | ⏳ |
| 4.4 | Editar servicio (datos, foto y variantes) | `/panel/sitio/servicios/[id]` | ⏳ |
| 4.5 | Textos del sitio | `/panel/sitio/textos` | ⏳ |
| 4.6 | Preguntas frecuentes | `/panel/sitio/preguntas` | ⏳ |
| 4.7 | Galería | `/panel/sitio/galeria` | ⏳ |

### 5. Panel: reclamos y usuarios

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 5.1 | Reclamos | `/panel/reclamos` | ⏳ |
| 5.2 | Detalle de un reclamo | `/panel/reclamos/[id]` | ⏳ |
| 5.3 | Usuarios | `/panel/usuarios` | ⏳ |
| 5.4 | Nuevo usuario | `/panel/usuarios/nuevo` | ⏳ |
| 5.5 | Editar usuario | `/panel/usuarios/[id]` | ⏳ |
| 5.6 | Sin acceso | `/panel/sin-acceso` | ⏳ |

### 6. Panel: configuración

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 6.1 | Datos del negocio y logo | `/panel/configuracion` | ⏳ |
| 6.2 | Taller (espacios y tamaños de vehículo) | `/panel/configuracion/taller` | ⏳ |
| 6.3 | Cotizaciones y mantenimiento | `/panel/configuracion/cotizaciones` | ⏳ |

## Registro por pantalla

Cada pantalla anota aquí, al trabajarla: qué se encontró, qué se cambió (con el commit o el PR) y lo que quedó pendiente o se descartó, con el motivo.

### 1.1 Encabezado y menú del sitio (16/10/2026)
- **Encontrado:**
  - En el celular, el menú no se cerraba al elegir una página: quedaba abierto tapando la página nueva (comprobado con una prueba).
  - El botón del menú medía 32 × 32 px; el mínimo es 44.
  - No se marcaba la página actual, ni a la vista ni para lectores de pantalla (`aria-current`).
  - El menú del celular era el panel gris por defecto de shadcn: sin nada de la marca y sin la acción principal del sitio (WhatsApp).
  - "Preguntas frecuentes" y "Garantía y reclamos" solo estaban en el pie, adonde en el celular casi nadie llega.
  - Al bajar en una página larga, el encabezado desaparecía.
  - La lista de páginas estaba escrita tres veces (encabezado, pie y sitemap), y la lógica de "cerrar el menú al navegar" estaba solo en el panel.
- **Cambios:**
  - Componente común `src/componentes/menu-desplegable.tsx`, usado por el sitio y el panel: se cierra al tocar un enlace, y abrir y cerrar miden 44 px. Reemplaza al `MenuMovil` del panel.
  - Menú del celular a pantalla completa y en negro: logo, línea LED, páginas principales grandes en Barlow itálica, páginas de consulta más chicas, el botón "Escribir por WhatsApp" a todo lo ancho y el lema.
  - Página actual: en la computadora, una barra roja bajo el enlace, con extremos a 60° (`.tt-enlace-actual`); en el celular, el enlace en rojo; en los dos, `aria-current`. Va dentro de `<Suspense>` porque, con Cache Components, la ruta se conoce recién al atender el pedido.
  - Encabezado fijo arriba (`sticky`).
  - Revisión de YankoSoft (16/10): la línea LED con brillo bajo el encabezado molestaba, y el marcador rojo se perdía sobre ella. Ahora el encabezado se separa con una línea gris de 1 px sin brillo y el marcador rojo va encima (opción A; la B era una línea roja fina con el marcador blanco). La LED queda para la portada. Anotado en `06-diseno/identidad-visual.md`.
  - Una sola lista de páginas en `src/lib/sitio.ts` (`PAGINAS_PRINCIPALES`, `PAGINAS_SECUNDARIAS`) para el encabezado, el pie y el sitemap.
  - `BotonWhatsApp` acepta `className`.
- **Descartado o pendiente:**
  - Botón de WhatsApp en la barra de la computadora: descartado, ya está el botón flotante.
  - Encabezado que se esconde al bajar: descartado; el fijo simple alcanza para un sitio corto y no agrega movimiento.
  - Pendiente para 2.1 (Portada): Lighthouse marca CLS 0,023. Con los datos de la base de pruebas, la sección de servicios se corre al cargar el bloque de arriba; no viene del encabezado (en Servicios, CLS 0).
- **Verificación:**
  - Capturas a 360, 390 y 1280 px, y ampliadas al 300 % del tramo LED.
  - E2E `base`: el menú marca la página actual, se cierra al elegir una página, el botón mide 44 px y en el celular están las páginas de consulta y el WhatsApp. Otra prueba confirma que el encabezado sigue a la vista al bajar.
  - E2E completo: 120 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.
  - Lighthouse móvil: portada y Servicios con rendimiento 91 y 100 en accesibilidad, buenas prácticas y SEO.

### 1.2 Pie del sitio (16/10/2026)
- **Encontrado:**
  - Todos los enlaces del pie medían de 18 a 20 px de alto; el mínimo es 44.
  - Las redes sociales iban como texto ("Facebook  TikTok") y pasaban desapercibidas.
  - En tableta (768 px), el logo con el lema ocupaba una celda entera de una grilla de dos columnas: quedaba desparejo y con mucho espacio vacío.
  - En el celular, el pie medía casi dos pantallas de alto.
  - La fila de enlaces de abajo se cortaba donde caía.
- **Cambios:**
  - Redes con íconos en una sola tinta (Simple Icons 13.21, CC0, en `iconos-marca.tsx`). Componente común `src/componentes/sitio/redes-sociales.tsx`: en el pie, solo íconos de 44 px con su nombre para lectores de pantalla ("TocTar en Facebook"); en Contacto, ícono y nombre.
  - Clase `.tt-area-toque`: 44 px de área táctil invisible para enlaces de texto sueltos, sin cambiar el espaciado. El WhatsApp y el correo quedan a 24 px entre sí para que sus áreas no se pisen; antes del ajuste, el WhatsApp tenía unos 36 px.
  - Grilla: una columna en el celular, dos desde 640 px, la marca arriba y tres columnas en tableta, y cuatro columnas en la computadora, como antes.
  - Enlaces de abajo en filas de 44 px: dos columnas ordenadas en el celular y una fila en la computadora.
  - El pie del celular pasó de unos 990 a 866 px de alto (a 360 px de ancho).
- **Descartado o pendiente:**
  - Línea "© año TocTar Detailing": descartada. Para que el año cambie solo habría que generarla en cada visita, con un costo de rendimiento en todas las páginas.
  - Crédito de YankoSoft: no acordado con el dueño.
  - Aviso para el desarrollo: una vez, el servidor de desarrollo (`npm run dev`) no tomó un cambio de `globals.css` aunque el archivo estaba bien y el build sí lo incluía. Si un estilo nuevo no aparece, conviene reiniciar `npm run dev` antes de buscar el error.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px; Contacto a 360 px.
  - Área táctil medida tocando 18 px arriba y abajo del centro de cada enlace.
  - E2E `base` "los enlaces del pie tienen 44 px para el dedo". E2E completo: 122 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.
  - Lighthouse móvil: Nosotros y Contacto con rendimiento 91 y 90, 100 en lo demás y CLS 0.

### 1.3 Botón fijo de WhatsApp (18/10/2026)
- **Encontrado:**
  - Se veían dos botones de WhatsApp a la vez: el principal de la página y el fijo, en la primera pantalla de la portada, y también en Contacto, Nosotros y cada servicio mientras su botón principal está a la vista.
  - En Garantía y reclamos tapaba el selector "Servicio" del formulario (medido) y, en el iPhone, sube con el teclado y puede tapar el campo que se escribe.
  - El círculo rojo sin borde se confundía sobre fotos de autos rojos y sobre los bloques rojos de la portada.
  - Lo que estaba bien: no tapa nada de forma permanente en otras páginas, mide 56 px, respeta la muesca del iPhone y tiene nombre para lectores de pantalla.
- **Cambios:**
  - `src/componentes/sitio/whatsapp-flotante.tsx`: el botón fijo se esconde mientras un botón principal de WhatsApp (`data-whatsapp-principal`) está a la vista, y aparece con una entrada corta cuando sale. Sin animación si se pidió reducir el movimiento. Mientras está escondido no se puede enfocar ni lo leen los lectores de pantalla (`visibility`).
  - Botones principales que se reemplazan al terminar de cargar: se olvidan los que salen de la página, y el fijo no decide hasta medir los nuevos. Así no queda escondido para siempre ni parpadea.
  - La constante del atributo va en `whatsapp-comun.ts`. Si viene de un archivo "use client", el servidor recibe una referencia y no el texto: el atributo salía vacío.
  - Garantía y reclamos ya no lleva el botón fijo.
  - Borde negro de 2 px alrededor del círculo.
  - Queda redondo: es la forma que la gente reconoce como "chat de WhatsApp".
- **Descartado o pendiente:**
  - Versión sin JavaScript (`<noscript>`): descartada. Sin JavaScript, el sitio entero queda casi vacío, porque Next.js 16 transmite el contenido que depende de la base y lo inserta con JavaScript (verificado en portada, Servicios y Contacto). Es una limitación de todo el sitio, no de este botón.
  - `scroll-padding-top` para que el encabezado fijo no tape el foco: descartado. Se probó y Chrome ya centra el elemento enfocado, así que no hay nada que corregir; tampoco hay enlaces a secciones. Si se agregan, revisarlo.
  - Probar en el iPhone que el botón no tape campos con el teclado abierto en los formularios que lo llevan (hoy ninguno).
- **Verificación:**
  - Superposición medida en las 8 páginas a 360 y 1280 px, arriba y al final. Capturas de la portada a 390 px, arriba (solo el botón principal) y abajo (el fijo con su borde).
  - E2E `base` "el botón fijo de WhatsApp se esconde mientras el principal está a la vista". `hu-13-14` confirma que Garantía no lo lleva. `hu-10` y `hu-11` lo buscan por su clase o su enlace.
  - E2E completo: 124 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.
  - Lighthouse móvil: portada y Servicios con rendimiento 91 y 100 en lo demás.
- **Incidente de entorno:** con la PC suspendida, el reloj de Docker quedó adelantado y el almacenamiento rechazaba las subidas (`RequestTimeTooSkewed`): fallaban las pruebas de galería y reclamos. Se arregla con `docker compose restart almacenamiento`.

<!-- Plantilla:
### X.Y Nombre (fecha)
- **Encontrado:**
- **Cambios:**
- **Descartado o pendiente:**
- **Verificación:** capturas, pruebas, Lighthouse.
-->
