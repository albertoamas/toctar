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
- **Panel (desde 4.2):** botones y campos de 44 px con pantalla táctil y 36 px con mouse. Se decide por el tipo de puntero (`pointer-coarse:`), no por el ancho, en los componentes comunes (`Button`, `Input`, `Selector`). Las pantallas nuevas lo heredan.
- **Botones del panel (desde 4.5):** todos salen de `Button` (`src/componentes/ui/button.tsx`); el sitio, el ingreso y el formulario de garantía usan `tt-boton`, el de la marca.
  - **Rojo (`default`):** guarda o crea. Uno por formulario, o la acción principal de una lista ("Agregar servicio").
  - **Blanco con borde (`outline`):** agregar una fila dentro de un formulario ("Agregar beneficio"), acciones secundarias ("Subir foto", "Cambiar logo") y "Cancelar", en la página y en los diálogos.
  - **Rosado con letra roja (`destructive`):** confirmar lo que no se deshace ("Eliminar pregunta", "Sí, desactivar").
  - **Sin fondo (`ghost`):** las acciones de cada fila (íconos, "Desactivar").
  - Lo que lleva a otra pantalla es un enlace con forma de botón: `<Link className={cn(buttonVariants(...))}>`. Sin `cn` el borde del contorno no se ve. No `<Button render={<Link />}>`: base-ui le pone rol de botón y el lector de pantalla lo anuncia como botón (5.6).
  - **Tamaño:** siempre el normal (`default` o `icon`): 36 px con mouse y 44 con pantalla táctil. Los tamaños chicos (`sm`, `xs`, `icon-sm`, `icon-xs`) no se usan en el panel.
- **Capturas del celular:** la captura `fullPage` de Playwright apaga la emulación táctil. Para la página completa se agranda la ventana (`setViewportSize`) y se mide antes de capturar.
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
| 1.4 | Estructura del panel: barra lateral, menú del celular y usuario | ✅ 18/10 |
| 1.5 | Avisos, estados vacíos y de carga del panel | ✅ 18/10 |

### 2. Sitio público
Antes de la demo del viernes 23.

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 2.1 | Portada | `/` | ✅ 18/10 |
| 2.2 | Servicios | `/servicios` | ✅ 18/10 |
| 2.3 | Página de un servicio | `/servicios/[slug]` | ✅ 18/10 |
| 2.4 | Galería y visor de fotos | `/galeria` | ✅ 18/10 |
| 2.5 | Nosotros | `/nosotros` | ✅ 18/10 |
| 2.6 | Preguntas frecuentes | `/preguntas-frecuentes` | ✅ 18/10 |
| 2.7 | Contacto | `/contacto` | ✅ 18/10 |
| 2.8 | Garantía y reclamos | `/garantia` | ✅ 18/10 |
| 2.9 | Página no encontrada | cualquier ruta inexistente | ✅ 18/10 |
| 2.10 | Sin conexión | `public/sin-conexion.html` | ✅ 18/10 |

### 3. Ingreso

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 3.1 | Ingresar | `/ingresar` | ✅ 19/10 |

### 4. Panel: inicio y sitio web

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 4.1 | Inicio | `/panel` | ✅ 19/10 |
| 4.2 | Servicios del sitio | `/panel/sitio` | ✅ 19/10 |
| 4.3 | Nuevo servicio | `/panel/sitio/servicios/nuevo` | ✅ 19/10 |
| 4.4 | Editar servicio (datos, foto y variantes) | `/panel/sitio/servicios/[id]` | ✅ 19/10 |
| 4.5 | Textos del sitio | `/panel/sitio/textos` | ✅ 19/10 |
| 4.6 | Preguntas frecuentes | `/panel/sitio/preguntas` | ✅ 19/10 |
| 4.7 | Galería | `/panel/sitio/galeria` | ✅ 19/10 |

### 5. Panel: reclamos y usuarios

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 5.1 | Reclamos | `/panel/reclamos` | ✅ 19/10 |
| 5.2 | Detalle de un reclamo | `/panel/reclamos/[id]` | ✅ 19/10 |
| 5.3 | Usuarios | `/panel/usuarios` | ✅ 19/10 |
| 5.4 | Nuevo usuario | `/panel/usuarios/nuevo` | ✅ 19/10 |
| 5.5 | Editar usuario | `/panel/usuarios/[id]` | ✅ 19/10 |
| 5.6 | Sin acceso | `/panel/sin-acceso` | ✅ 19/10 |

### 6. Panel: configuración

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 6.1 | Datos del negocio y logo | `/panel/configuracion` | ⏳ (pendiente de 1.4: a 360 px la pantalla se pasa 3 px de ancho) |
| 6.2 | Taller (espacios y tamaños de vehículo) | `/panel/configuracion/taller` | ⏳ |
| 6.3 | Cotizaciones y mantenimiento | `/panel/configuracion/cotizaciones` | ⏳ |

## Registro por pantalla

Las comparativas de antes y después de cada grupo (antes a la izquierda) están en `docs/08-desarrollo/pulido-visual/`.

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

### 1.4 Estructura del panel (18/10/2026)
- **Encontrado:**
  - En el celular, las pantallas con pestañas (Sitio web y Configuración) se salían por la derecha: 420 px de ancho en una pantalla de 360, con texto cortado. La causa era la columna del contenido, que no podía achicarse (`min-width` automático de un elemento flex) y la estiraba la tira de pestañas.
  - En el celular, la barra de arriba no quedaba fija. En la computadora, la barra lateral se iba con la página, así que en las páginas largas el menú y "Cerrar sesión" quedaban lejos.
  - Los enlaces del menú medían 36 px y "Cerrar sesión", 32.
  - El módulo actual solo se marcaba con un fondo gris oscuro, sin el lenguaje de la página actual del sitio.
  - En tableta (768 px), la barra lateral se llevaba casi un tercio de la pantalla y el contenido quedaba apretado.
  - Los nombres de los roles estaban escritos dos veces (`usuario-sesion.tsx` y `modulos/usuarios/textos.ts`).
- **Cambios:**
  - `min-w-0` en la columna del contenido (`src/app/panel/layout.tsx`): arregla el desborde en todas las pantallas a la vez.
  - Barra de arriba fija (`sticky`) y el aviso sin conexión justo debajo. La barra lateral queda fija y a la altura de la pantalla, con su propio desplazamiento si hace falta.
  - Barra lateral recién desde 1024 px (`lg`). En el celular y la tableta, la barra de arriba con el menú desplegable.
  - Enlaces del menú de 44 px y "Cerrar sesión" de 44 × 44.
  - Módulo actual: fondo gris más un trazo rojo inclinado a 60°, como los del monograma (`.tt-modulo-actual`). Es lo único rojo del menú.
  - `UsuarioSesion` usa `NOMBRE_ROL` de `modulos/usuarios/textos.ts`.
- **Descartado o pendiente:**
  - Pendiente para 6.1: a 360 px, `/panel/configuracion` todavía se pasa 3 px. No viene de la estructura: el formulario del negocio tiene algo que no se achica.
- **Verificación:**
  - Capturas a 360, 768, 1280 y 1600 px, con el menú del celular abierto y ampliada al 300 % del trazo.
  - Medición del desborde en 12 pantallas del panel a 360 px: antes se salían 8, ahora solo Configuración, por 3 px.
  - E2E `base` "el panel no se sale de la pantalla en el celular y su menú queda a mano". E2E completo: 126 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 1.5 Avisos, estados vacíos y de carga del panel (18/10/2026)
- **Encontrado:**
  - En el celular, los avisos aparecían abajo y tapaban "Guardar cambios" y el último campo durante unos 4 s.
  - El aviso de error se veía igual que el de éxito (el mismo cartel blanco, solo cambiaba un ícono chico).
  - El aviso preguntaba el tema a `next-themes`, que nunca se configuró: código muerto y una dependencia de más.
  - Había 15 versiones de "Cargando…" (textos distintos, uno con otro color y dos vacíos), y el texto aparecía un instante antes de la pantalla.
  - Las pantallas vacías no tenían un estilo común. El aviso de "Usuario creado" y el de "Servicio creado" estaban copiados.
- **Cambios:**
  - Avisos arriba, a 64 px (debajo de la barra del panel en el celular y la tableta), siempre en claro. Error con borde e ícono rojos y 6 s; éxito con borde e ícono verdes y 3 s. El CSS de los bordes va fuera de capas, porque el CSS de sonner, sin capa, le ganaría. Se quitó `next-themes`.
  - `src/componentes/panel/cargando.tsx`: siluetas grises que aparecen recién a los 0,3 s (sin parpadeo si la carga es rápida), con latido suave salvo que se pida reducir el movimiento, y "Cargando…" para lectores de pantalla. Reemplaza las 15 versiones.
  - `src/componentes/panel/estado-vacio.tsx`: recuadro punteado que dice qué pasa y qué hacer. Usado en servicios, preguntas, galería, reclamos y usuarios. No repite el botón de acción: cada pantalla ya lo tiene arriba.
  - `src/componentes/panel/aviso-en-pagina.tsx` para "Usuario creado" y "Servicio creado". La subida de fotos usa también `avisarResultado`.
  - Inicio: `text-muted-foreground` pasó a `text-tinta-suave` (tokens del proyecto).
- **Descartado o pendiente:**
  - Botón de acción dentro de las pantallas vacías: descartado por ahora, porque repetiría el de arriba. Si una pantalla no tiene acción visible, se agrega al revisarla.
- **Verificación:**
  - Capturas de los avisos en celular y computadora, con el sistema en claro y en oscuro.
  - La carga y la pantalla vacía, insertadas en una página: a los 100 ms la carga todavía no se ve; a los 800 ms aparecen las siluetas.
  - E2E `base` "el aviso de guardado no tapa el botón de guardar". E2E completo: 127 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 2.1 Portada (18/10/2026)
- **Encontrado:**
  - El pendiente del CLS 0,024: mientras llega el texto de la portada se reservaba un alto fijo que no coincidía con el texto real. Con el texto actual, a 360 px el texto medía 392 y se reservaban 368: lo de abajo bajaba 24 px. Con una presentación corta subía 88 px. En cuatro corridas de Lighthouse del 18/10 el CLS dio 0 porque el servidor responde rápido, pero el salto aparece en cuanto la base tarda.
  - Al llegar al cierre ("Cuéntanos qué necesita tu vehículo") se veían dos botones de WhatsApp: el del cierre era de contorno y no contaba como principal, así que el fijo aparecía al lado.
  - En el celular la portada medía unos 5050 px (a 390 de ancho): cada servicio era una tarjeta de unos 620 px.
  - Lo que estaba bien: la cabecera (arte, lema, LED que llega con el texto), las tarjetas en la computadora y el cierre con el monograma.
- **Cambios:**
  - El bloque de texto de la cabecera tiene el mismo alto mínimo cargando y cargado (24,5rem en el celular, 18,5rem en la computadora): un texto más corto ya no hace subir la página. Medido: diferencia 0 a 360, 412 y 1280 px.
  - El cierre usa el botón de WhatsApp principal (rojo): mientras se ve, el fijo se esconde.
  - En el celular (menos de 640 px), `TarjetaServicio` pasa a fila compacta: foto de 7rem a la izquierda, título de 22 px, resumen de 2 renglones y "Ver el servicio". Toda la fila se toca y conserva el corte a 60°. La portada del celular bajó a 2975 px. Como es el mismo componente, la página Servicios también lo tiene (se revisa en 2.2).
- **Descartado o pendiente:**
  - Mostrar solo 3 servicios en el celular: descartado. El cliente no se enteraría de los otros.
  - Riesgo que queda: si el dueño escribe una presentación más larga que la actual, el texto todavía empuja lo de abajo. El panel ya pide "dos o tres frases" (máximo 400 caracteres).
  - Al pasar la portada a las filas compactas, la prueba de 1.3 bajaba 1600 px y caía en el cierre, donde el fijo se esconde. Ahora baja hasta la mitad de los servicios.
- **Segunda revisión de YankoSoft (18/10):**
  - *"Al dar F5 hay cosas que cargan antes, por ejemplo la palabra Servicios."* Grabado con red lenta, cuadro a cuadro. A los 0,5 s se veía el encabezado sin el logo, el arte y el título "Servicios" suelto; el resto llegaba unos 0,2 s después. Los títulos de sección y el cierre estaban fijos en la página (primer envío) y su contenido sale de la base (segundo envío). El logo era un archivo aparte y llegaba último.
    - **Cambio:** toda la portada va en un solo `<Suspense>` (`PortadaConDatos`). Mientras tanto se ve solo el arte, con una pantalla reservada (`min-h-screen`), para que el pie no salte. Regla para el resto del sitio: **un título de sección nunca aparece antes que su contenido**. ~~El título principal de la página sí puede, porque orienta.~~ Corregido en la revisión de 2.5: **tampoco el título de la página**; cada página llega entera.
    - **Cambio:** el logo del encabezado va dentro de la página. Se lee al armarla de `public/marca/toctar-horizontal-sin-lema-sobre-oscuro.svg`, que sigue siendo el único original.
    - **Resultado:** el primer cuadro muestra el encabezado con el logo y el arte, sin títulos sueltos; el siguiente, todo junto.
  - *"Se repite mucho WhatsApp."* Contado: en la portada, 4 veces al recorrerla (cabecera, botón fijo, cierre y pie), dos con el mismo texto "Escribir por WhatsApp".
    - **Cambio:** los botones dicen lo que gana el cliente y el ícono dice el canal. En la cabecera, "Pedir cotización"; en el cierre, "Mandar fotos de mi vehículo". El nombre accesible empieza igual y suma "por WhatsApp" (WCAG 2.5.3). Se quedan como estaban el botón fijo (solo ícono), "WhatsApp +591…" del pie (es un dato de contacto) y "Consultar por este servicio".
    - **Pendiente:** Galería, Nosotros, Preguntas frecuentes y Contacto siguen con "Escribir por WhatsApp" en su botón principal. Se decide al revisar cada una (2.4 a 2.7), con el mismo criterio.
  - Las capturas de antes de esta revisión quedaron en la conversación, no en `pulido-visual/` (se borraron al volver a grabar).
- **Tercera revisión de YankoSoft (18/10):** *"Poner en la sección del inicio una foto detrás, un poco opaca, del taller."*
  - Se prototiparon dos opciones con una foto de ejemplo: A, foto detrás y el arte encima; B, foto detrás sin el arte. Se eligió **B**: la foto del lugar real da más confianza que un dibujo y el titular sube a la primera pantalla. La marca sigue en el rojo, el titular, el corte a 60° y la línea LED.
  - **Cambio:** la foto se carga desde el panel (*Sitio web → Textos → Portada → Foto del taller*), opcional, con la misma subida que la foto de un servicio. Se guarda en `contenido_pagina.foto_archivo_id` (migración `0014_foto_portada`). Sin foto, la portada muestra el arte, como un servicio sin foto muestra el reemplazo. No es un cambio de alcance: es contenido del sitio editable desde el panel (Entrega 1), y estaba anotado como decisión abierta en `B4-sitio-publico.md`.
  - **Cambio:** la foto va al 50 % y con un velo negro donde va el texto (abajo en el celular, a la izquierda en la computadora). Contraste medido en el píxel más claro detrás del texto: 6,1:1 o más en los tres anchos, también con una foto toda blanca. Entra con la línea LED (600 ms, sin animación si se pide reducir movimiento). Con foto, la cabecera es de una columna (la derecha era la del arte).
  - **Cambio:** mientras carga, la cabecera se ve vacía (antes, con el arte): si el arte estaba y llegaba una foto, el texto subía de golpe en el celular. Saltos medidos con red lenta: 0 en los cuatro anchos.
  - **Rendimiento:** con la foto de 1600 px y prioridad alta, Lighthouse móvil bajó de 90 a 84 (le quitaba red al texto). En el celular va la versión de 640 px con prioridad baja: 87 y 88 con foto, 88 a 92 sin foto en la misma compilación (la diferencia queda dentro de lo que varía entre corridas). Computadora 99.
  - **Pendiente (dueño):** la foto de ejemplo es de otro taller (se lee "Detailing Club Tarragona" en la puerta): sirve para probar en la base de desarrollo y no va al repositorio ni al sitio. Hace falta una foto propia del taller, horizontal y con buena luz. Por eso no hay comparativa en `pulido-visual/`.
  - E2E `hu-08` "la foto del taller va detrás del lema de la portada; sin foto vuelve el arte". De paso se corrigió una prueba inestable de 2.2 (el foco con el teclado se probaba antes de que la página terminara de hidratarse). E2E completo: 141 pasan.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px. Comparativa en `pulido-visual/2.1-portada-celular-completa.jpg`.
  - Tras la segunda revisión: E2E `hu-10` "al recargar, los títulos de la portada no aparecen antes que su contenido" (con red lenta, cuando se ve "Servicios" ya están sus tarjetas). E2E completo: 133 pasan. Lighthouse móvil: portada con rendimiento 90 y 92, Servicios y Contacto con 92; 100 en lo demás; CLS 0.
  - Saltos medidos con red lenta en los cuatro anchos: 0. Lighthouse móvil: portada con rendimiento 90 y 91 en dos corridas, Servicios con 91; 100 en accesibilidad, buenas prácticas y SEO; CLS 0.
  - E2E `hu-10` "en el celular los servicios van en filas compactas…" y "al llegar al cierre de la portada se ve un solo botón de WhatsApp". E2E completo: 131 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 2.2 Servicios (18/10/2026)
- **Encontrado:**
  - Con el teclado, el marco del foco rodeaba solo "Ver el servicio", pero lo que se abre es toda la tarjeta (el enlace la cubre).
  - La página terminaba con la última tarjeta y pasaba al pie. Quien no sabía qué servicio elegir solo tenía el botón fijo, sin nada que lo invitara a escribir.
  - El estilo del título principal (`font-heading text-[40px] leading-[44px] font-extrabold italic`) estaba copiado en las 6 páginas interiores.
  - Lo que estaba bien: las filas compactas en el celular (de 2.1), las tres columnas en la computadora, el texto que explica por qué no hay precios y el CLS 0.
- **Cambios:**
  - Con el teclado se enmarca toda la tarjeta (`.tt-tarjeta:has(.tt-tarjeta__enlace:focus-visible)`) y el enlace ya no lleva su propio marco.
  - Al final de la lista va un cierre: "¿No sabes cuál elegir?", "Mándanos fotos de tu vehículo y te decimos qué conviene hacer." y el botón principal "Mandar fotos de mi vehículo". Mientras se ve, el botón fijo se esconde. Es el mismo componente que el cierre de la portada (`src/componentes/sitio/cierre-whatsapp.tsx`), que ahora solo cambia el título y el texto.
  - El cierre llega junto con la lista (un solo `<Suspense>`), según la regla de 2.1. El título de la página y la bajada siguen llegando primero.
  - `TituloPagina` (`src/componentes/sitio/titulo-pagina.tsx`) es el título de las 6 páginas interiores. Se ven igual que antes (revisado en el HTML de cada una).
- **Descartado o pendiente:**
  - Filtros o categorías en la lista: descartado. Son 8 servicios y se ven de un vistazo.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px, sin desborde. Comparativas en `pulido-visual/2.2-servicios-celular.jpg` y `pulido-visual/2.2-foco-tarjeta.jpg`.
  - E2E `hu-11` "la lista de servicios termina con una invitación a mandar fotos, con un solo WhatsApp a la vista" y "con el teclado se enmarca toda la tarjeta del servicio". E2E completo: 136 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.
  - Lighthouse de Servicios: en el celular, 93 de rendimiento; en la computadora, 99. 100 en accesibilidad, buenas prácticas y SEO; CLS 0.

### 2.3 Página de un servicio (18/10/2026)
- **Encontrado:**
  - En la base de desarrollo los servicios casi no tienen descripción, beneficios, pasos ni fotos. Para ver la página completa se cargó un servicio con todo en `toctar_e2e`, que se recrea en cada E2E (no en la base del dueño).
  - En el celular, "‹ Servicios" (para volver) quedaba debajo de la foto, entre la foto y el título, y medía 81 × 20 px.
  - Los dos botones de WhatsApp (arriba y en el cierre) decían lo mismo: "Consultar por este servicio". El cierre no era el de la portada y Servicios (sin el monograma).
  - Opciones: si una tenía descripción, salía ancha y las demás chicas, en renglones disparejos.
  - Lo que estaba bien: el titular, los pasos numerados (son una secuencia), las viñetas a 60°, la página que llega toda junta, sin precios y con CLS 0.
- **Cambios:**
  - "‹ Servicios" es lo primero de la página en todos los anchos, con 44 px de alto.
  - El cierre es el componente común (`CierreWhatsApp`), que ahora acepta el servicio para el mensaje. Su botón dice "Mandar fotos de mi vehículo" y manda el servicio escrito; el de arriba sigue como "Consultar por este servicio".
  - Opciones: si alguna tiene descripción, grilla pareja (2 columnas en tableta, 3 en computadora); si no, cajitas en fila como antes.
- **Descartado o pendiente:**
  - Abrir en grande las fotos de "Trabajos de…": sería una función nueva; está "Ver la galería".
  - **Meta descripción (SEO 92 en Lighthouse).** En esta página, que lee la base, Next manda la metadata en streaming: el navegador la recibe en el `<body>`. Los bots que solo leen el `<head>` (WhatsApp, Facebook, Bing, los rastreadores de Google con guion) la reciben en el `<head>`, y Googlebot ejecuta JavaScript. Lighthouse 12 ya no se identifica como bot, por eso la marca como faltante. Se probó `htmlLimitedBots: /.*/` (todo bloqueante): dejaba colgadas las precargas de enlaces. Se descartó y se dejó el comportamiento de Next, con una prueba de que WhatsApp, Bing y Facebook la reciben en el `<head>`.
  - Para 2.9: una dirección de servicio inexistente responde con estado 200 (la página no encontrada se ve igual).
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px, con datos reales y con un servicio completo, sin desborde. Comparativas en `pulido-visual/2.3-cabecera-celular.jpg`, `2.3-servicio-celular.jpg` y `2.3-servicio-computadora.jpg`.
  - E2E `hu-11` "volver a Servicios es lo primero y se toca con el dedo" y el botón del cierre con el servicio escrito; `hu-18` "la página de un servicio entrega título, descripción y vista previa dentro del head a WhatsApp y a los buscadores". E2E completo: 140 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.
  - Lighthouse de un servicio: en el celular, 92 de rendimiento (91 con el servicio completo); en la computadora, 100. 100 en accesibilidad y buenas prácticas; SEO 92 por lo de arriba; CLS 0.

### 2.4 Galería y visor de fotos (18/10/2026)
- **Encontrado** (con 8 trabajos de muestra en `toctar_e2e`: 3 pares y 5 fotos solas de 4 servicios; la base de desarrollo tiene 2):
  - En el celular el filtro ocupaba 200 px (4 renglones con 5 servicios, por los nombres largos) antes de la primera foto.
  - Visor en el celular: el "Antes" ocupaba toda la pantalla y había que bajar para ver el "Después".
  - Visor en la computadora: con una foto vertical y otra horizontal, una quedaba en una caja gris alta y la otra arriba, con un hueco negro abajo.
  - El botón de cerrar de los diálogos medía unos 28 px y para los lectores de pantalla decía "Close", en inglés. Es del componente común: pasaba también en el panel.
  - La página terminaba sin invitación, justo después de ver los trabajos; la galería vacía seguía con "Escribir por WhatsApp" (pendiente de 2.1).
  - Lo que estaba bien: la grilla cuadrada (2, 3 y 4 columnas), la etiqueta "Antes y después", el foco con el teclado, el filtro con enlaces que funciona sin JavaScript y con 44 px, sin desborde.
- **Cambios:**
  - Filtro en el celular: una sola fila que se desliza de costado, de borde a borde; el último botón cortado avisa que hay más. Desde 640 px, en renglones como antes. Mide 52 px en lugar de 200.
  - Visor: el antes y el después en cajas de la misma altura (36 % de la pantalla en el celular, uno sobre otro; lado a lado en la computadora), con la foto entera y centrada. La foto sola sigue grande.
  - Cerrar de 44 × 44 y "Cerrar" en `src/componentes/ui/dialog.tsx`: lo toman todos los diálogos (visor, reclamos y confirmaciones del panel; revisado en "¿Eliminar esta foto?").
  - Cierre común al final ("¿Quieres este resultado en tu vehículo?", botón "Mandar fotos de mi vehículo"), en el mismo `<Suspense>` que las fotos. La galería vacía queda con su texto y el cierre.
  - La primera fila de la grilla (hasta 4 fotos) va sin carga diferida y la primera con prioridad alta: era el LCP del celular y el navegador la pedía tarde.
- **Descartado o pendiente:**
  - Pasar de una foto a otra dentro del visor y un deslizador para comparar: funciones nuevas.
  - Si se entra con el filtro ya elegido (un enlace compartido) y el servicio está al final de la fila, en el celular su botón queda fuera de la vista hasta deslizar.
  - **Rendimiento móvil del sitio (pendiente común, resuelto al cerrar el grupo 2: ver "Rendimiento del sitio"):** la galería da 87 en tres corridas (antes de estos cambios, 85, 86 y 91 con los mismos datos: no empeoró). Como en la portada (88 a 92) y en un servicio (91 y 92), la mayor parte del LCP es "render delay" de 2 a 3,5 s, que es igual en todas las páginas. Se investiga aparte, antes de cerrar el grupo 2.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px (grilla, filtro activo, visor con par y con foto sola, foco), sin desborde. Comparativas en `pulido-visual/2.4-galeria-celular.jpg`, `2.4-visor-celular.jpg` y `2.4-visor-computadora.jpg`.
  - E2E `hu-12`: filtro de una fila en el celular; antes y después a la vista a la vez; "Cerrar" de 44 px que cierra (también con Escape); cierre con un solo WhatsApp. E2E completo: 141 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.
  - Lighthouse de la galería: celular 87, computadora 99; 100 en accesibilidad, buenas prácticas y SEO; CLS 0.

### 2.5 Nosotros (18/10/2026)
- **Encontrado:**
  - Toda la página era texto gris del mismo tamaño: la historia (lo que se viene a leer) pesaba lo mismo que "Cómo trabajamos".
  - En el celular las franjas del monograma pasaban detrás de los renglones de la historia (contraste 8,3:1, se leía, pero ensuciaba).
  - El final seguía con "Escribir por WhatsApp" (pendiente de 2.1) y dos botones sueltos, sin el cierre de las otras páginas.
  - Lo que estaba bien: los textos del panel, sin precios ni testimonios; las viñetas a 60° en 2 columnas; todo llega junto; sin desborde.
- **Cambios:**
  - La historia es el texto de entrada: blanca, 20 px en el celular y 22 en la computadora. "Cómo trabajamos" sigue en gris.
  - El monograma va detrás del título y del texto en un envoltorio que solo recorta los costados (`overflow-x-clip`), y el texto se pinta encima. En el celular, más chico (12rem) y arriba, solo detrás del título.
  - Cierre común: "¿Hablamos de tu vehículo?", botón "Mandar fotos de mi vehículo" y, al lado, "Ver las preguntas frecuentes". `CierreWhatsApp` acepta ahora un enlace secundario opcional.
  - Durante el cambio, el contenido quedó corrido 46 px en la computadora: le faltaba `w-full` dentro del `main` (que es flex). Corregido antes de terminar.
- **Descartado o pendiente:**
  - Foto del taller en Nosotros: no hay una propia todavía; la de la portada cumple ese papel.
  - "Cómo trabajamos" como pasos numerados: es un párrafo del panel; separarlo cambiaría el formulario.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px, sin desborde. Comparativas en `pulido-visual/2.5-nosotros-celular.jpg` y `2.5-nosotros-computadora.jpg`.
  - E2E `hu-13-14` "Nosotros muestra la historia…": termina con el cierre, un solo WhatsApp a la vista y el enlace a las preguntas frecuentes. E2E completo: 141 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.
  - Lighthouse de Nosotros: celular 92 (dos corridas), computadora 100; 100 en accesibilidad, buenas prácticas y SEO; CLS 0.
- **Revisión de YankoSoft (18/10):**
  - *"El monograma me gustaba más como estaba antes, le daba su toque a la página."* Vuelve a como estaba: grande, detrás del título y del texto, también en el celular. Se descarta el cambio B.
  - *"La página tiene el mismo problema de carga que la portada: la palabra Nosotros carga antes que todo."* La excepción de 2.1 ("el título de la página sí puede llegar antes") se ve igual de mal. **Cambio:** el título y la bajada van dentro del mismo `<Suspense>` que el contenido, en Nosotros y también en Servicios y Galería, que tenían lo mismo; mientras tanto se ve el encabezado y el espacio reservado. La página de un servicio ya llegaba entera.
  - E2E `base` "las páginas interiores llegan enteras: el título no aparece antes que el resto" (con red lenta, cuando está el `h1` ya está el cierre). Preguntas frecuentes, Contacto y Garantía se revisan igual en 2.6 a 2.8.

### 2.6 Preguntas frecuentes (18/10/2026)
- **Encontrado:**
  - El título, "¿No encontraste tu respuesta?" y su botón estaban fuera del `<Suspense>`: llegaban antes que las preguntas (lo mismo que se corrigió en 2.5).
  - En la computadora, el título y la lista iban en una columna centrada (empezaban en x = 272) y en las otras páginas en el borde izquierdo (x = 80): el título "saltaba" al pasar de una página a otra.
  - El final seguía con "Escribir por WhatsApp" y sin el cierre común. "Mandar fotos de mi vehículo" no sirve aquí: el cliente quiere preguntar.
  - Lo que estaba bien: `<details>` sin JavaScript, preguntas de 68 px (96 en dos renglones), foco visible, respuesta legible, sin desborde.
- **Cambios:**
  - La página llega entera, con el título.
  - El título arranca en el mismo borde que en las demás páginas; la lista conserva su ancho de lectura (48rem), alineada a la izquierda.
  - Cierre común: "¿No encontraste tu respuesta?", "Escríbenos con tu pregunta y te respondemos por WhatsApp." y el botón "Hacer mi pregunta" (nombre accesible "Hacer mi pregunta por WhatsApp"). `CierreWhatsApp` acepta ahora el texto del botón (`boton`); por omisión, "Mandar fotos de mi vehículo".
  - Sin preguntas cargadas: "Pronto vas a ver aquí las preguntas más comunes.", como en Servicios y Galería.
- **Descartado o pendiente:**
  - Marcar en rojo la pregunta abierta: la flecha que gira ya lo dice.
  - Datos estructurados de preguntas frecuentes para Google: Google casi no los muestra y sería algo nuevo.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px (cerradas, una abierta, foco), sin desborde. Grabación con red lenta: primero solo el encabezado, después la página entera. Comparativa en `pulido-visual/2.6-preguntas-computadora.jpg`.
  - E2E `hu-13-14` "las preguntas frecuentes se abren y se cierran una por una" (termina con el cierre, un solo WhatsApp a la vista) y `base` "las páginas interiores llegan enteras…" (ahora también esta página). Las pruebas del cierre bajan hasta el botón y no hasta el título: en el celular el título podía quedar a la vista y el botón justo debajo. E2E completo: 143 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.
  - Lighthouse: celular 92, computadora 100; 100 en accesibilidad, buenas prácticas y SEO; CLS 0.

### 2.7 Contacto (18/10/2026)
- **Encontrado:**
  - El título "Contacto" estaba fuera del `<Suspense>` y aparecía solo, antes que el resto.
  - En el celular el mapa quedaba al final de todo (y = 997 a 390 px), después del horario, la garantía y las redes, lejos de "Dónde estamos".
  - "Cómo llegar" y "Garantía y reclamos" medían 20 px de alto y el correo 24.
  - El botón seguía con "Escribir por WhatsApp" (pendiente de 2.1).
  - Lo que estaba bien: datos de Configuración y bienvenida del panel; la dirección abre Google Maps (14.2); mapa diferido; horario agrupado; redes de 44 px; sin desborde. El mapa vacío de la primera captura era de la captura: con tiempo se dibuja.
- **Cambios:**
  - La página llega entera, con el título.
  - Una sola grilla: el mapa va en el DOM justo después de "Dónde estamos" (en el celular queda debajo, y = 541) y en la computadora ocupa la columna derecha a lo alto (`md:col-start-2 md:row-span-5`). No se duplica.
  - Área táctil de 44 px (`.tt-area-toque`) en "Cómo llegar", "Garantía y reclamos" y el correo, sin cambiar el aspecto.
  - El botón dice "Pedir cotización", como en la portada; el número sigue debajo.
- **Descartado o pendiente:**
  - Cierre común: toda la página es el contacto; repetiría el botón de arriba.
  - Mapa en colores oscuros: el mapa de Google sin clave no se estiliza, y filtrar sus colores cambiaría el agua y los parques.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px, sin desborde. Grabación con red lenta: primero el encabezado, después la página entera. Comparativa en `pulido-visual/2.7-contacto-celular.jpg`.
  - E2E `hu-13-14` "en Contacto el mapa va junto a la dirección y los enlaces sueltos tienen 44 px para el dedo" y el botón por su nombre nuevo; `base` "las páginas interiores llegan enteras…" (ahora también Contacto). La prueba nueva falló en el celular: la base de pruebas arrancaba sin ubicación y el mapa aparecía recién cuando `hu-04` la guardaba (en la computadora ya había corrido). `preparar.setup.ts` carga ahora también la ubicación, con los mismos datos que `hu-04`. E2E completo: 145 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.
  - Lighthouse: celular 92, computadora 99; 100 en accesibilidad, buenas prácticas y SEO; CLS 0.

### 2.8 Garantía y reclamos (18/10/2026)
- **Encontrado** (reclamos de prueba en `toctar_e2e`, no en la base de desarrollo):
  - El título y la bajada llegaban antes que el formulario.
  - Al enviar con errores, el foco quedaba en la página: quien usa lector de pantalla, o estaba abajo, no se enteraba de qué falló.
  - Al enviar bien, la confirmación reemplazaba al formulario arriba, pero la pantalla seguía donde estaba el botón: en el celular, el título "Recibimos tu reclamo" quedaba tapado por el encabezado.
  - Los ejemplos ("71234567", "2849XKT") iban como texto dentro del campo y parecían ya escritos; con error se leía "Escribe los 8 dígitos…" junto a un campo que parecía tenerlos.
  - Los campos medían 32 px de alto y la X para quitar una foto 28 × 28.
  - Lo que estaba bien: el teclado que corresponde en cada campo, errores junto al campo y en lenguaje claro, lo escrito se conserva, la trampa antirrobots no estorba, sin botón fijo encima, sin desborde.
- **Cambios:**
  - La página llega entera, con el título.
  - Al enviar con errores, la pantalla va al primer campo con error (al centro, así no queda bajo el encabezado) y el foco también; al corregirlo y volver a enviar, va al siguiente.
  - Al enviar bien, la pantalla sube a la confirmación (`scroll-mt-24`) y el foco va a ella (`tabIndex={-1}`, `role="status"`).
  - Los ejemplos pasan a la ayuda: "Te respondemos por aquí. Ejemplo: 71234567" y "Por ejemplo, 2849XKT.".
  - Campos de 44 px de alto en este formulario (`CAMPO`, en un solo lugar). La X de quitar foto se ve de 28 px y se toca en 44 × 44.
- **Descartado o pendiente:**
  - Resumen de errores arriba del formulario: con el foco en el primer error y los mensajes junto a cada campo alcanza para 7 campos.
  - **Panel (grupos 3 a 6):** sus campos también miden 32 px. Se decide ahí, para todas sus pantallas juntas.
  - Al repetir las capturas se llegó al límite de reclamos por hora desde la misma conexión: la confirmación de la computadora no salió y se vio el aviso del límite. Funciona como debe.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px (vacío, con errores, con fotos y la confirmación), sin desborde. Comparativas en `pulido-visual/2.8-errores-celular.jpg` y `2.8-confirmacion-celular.jpg`.
  - E2E `hu-16`: campos y "quitar foto" de 44 px; la confirmación a la vista y con el foco; el foco al primer error y, al corregirlo, al siguiente. `base` "las páginas interiores llegan enteras…" (Garantía: con el título ya está el formulario). E2E completo: 145 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.
  - Lighthouse: celular 89, computadora 100; 100 en accesibilidad, buenas prácticas y SEO; CLS 0. El celular queda en el pendiente común de rendimiento (2.4).
- **Revisión de YankoSoft (18/10):** *"El campo de servicio, donde se despliega una lista, sale blanco y no se ve lo escrito."* El `Selector` tenía el fondo transparente: Chrome en Windows dibuja la lista con el fondo del `<select>` y, transparente, la pintaba blanca con el texto blanco del sitio oscuro. Las capturas no lo mostraban porque la lista nativa no sale en ellas. **Cambio** en `src/componentes/panel/selector.tsx` (lo usan el sitio y el panel): las opciones llevan fondo y tinta del tema, y el selector el mismo fondo que `Input` en oscuro (antes se veía más oscuro que los otros campos). E2E `hu-16` "las opciones de la lista de servicios se leen sobre el fondo oscuro". E2E completo: 147 pasan.

### 2.9 Página no encontrada (18/10/2026)
- **Encontrado:**
  - Una dirección que no existe (`/no-existe`) mostraba la página sin encabezado ni pie: sin menú, sin logo con enlace al inicio, sin contacto, y la pestaña decía solo "TocTar Detailing". Está en `src/app/not-found.tsx`, fuera del diseño del sitio. Un servicio inexistente sí tenía encabezado y pie (el error pasa dentro del sitio): dos versiones distintas.
  - El pendiente de 2.3: `/servicios/no-existe` responde 200. Es lo documentado por Next con streaming: la página empieza a enviarse antes de saber si el servicio existe y el estado ya salió; Next agrega `noindex`.
  - Lo que estaba bien: el texto dice qué pasó y da dos salidas; el monograma; sin botón fijo; sin desborde.
- **Cambios:**
  - `MarcoSitio` (`src/componentes/sitio/marco-sitio.tsx`): encabezado, contenido y pie del sitio en un solo lugar; lo usan el diseño del sitio y la página no encontrada general.
  - `NoEncontrada` (`src/componentes/sitio/no-encontrada.tsx`): el contenido, compartido por la página general (con el marco) y la nueva `src/app/(sitio)/not-found.tsx` (dentro del diseño del sitio). Las dos se ven iguales.
  - Título de la pestaña "Página no encontrada · TocTar Detailing" (un servicio inexistente sigue con "Servicio no encontrado", de su página).
- **Descartado o pendiente:**
  - Responder 404 en un servicio inexistente: exigiría consultar la base en el `proxy` antes de cada página de servicio (la misma consulta que ya hace la página, una vez más en cada visita) para un caso raro que Google ya no indexa por el `noindex`.
  - Botón de WhatsApp: quien llega aquí busca una página; el inicio y los servicios alcanzan, y el pie tiene el WhatsApp.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px de los dos casos, sin desborde. Comparativa en `pulido-visual/2.9-no-encontrada-celular.jpg`.
  - E2E `hu-10` "una dirección que no existe…" (404, encabezado, pie y título) y `hu-11` "un servicio oculto o inexistente…" (`noindex`). E2E completo: 147 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.
  - Lighthouse no audita respuestas 404 (devuelve error en lugar de puntaje): sin medición en esta pantalla.

### 2.10 Sin conexión (18/10/2026)
- **Encontrado:**
  - Sin internet no cargaba ninguna fuente: el título salía en Arial y el texto en la del sistema. Las fuentes de la app (`next/font`) cambian de nombre en cada compilación: la página no podía pedirlas ni el service worker guardarlas.
  - "Reintentar" era un rectángulo con las puntas redondeadas, no el botón rojo con el corte a 60° del sitio.
  - Lo que estaba bien: todo dentro del archivo; el texto dice qué pasa y qué hacer ("El panel necesita internet" es correcto: el service worker solo se registra desde el panel); botón de 44 px; colores del tema oscuro; foco visible.
- **Cambios:**
  - Copias fijas de las fuentes en `public/fuentes/` (Barlow Condensed ExtraBold itálica y Montserrat variable, subconjunto latino, de Google Fonts; 62 KB en total) con sus licencias OFL al lado. La página las declara con `@font-face`.
  - `public/sw.js`: la caché pasa a `v2` y guarda la página y las dos fuentes al instalarse; al activarse borra la `v1`, así los teléfonos con la app ya instalada se actualizan. Las fuentes se sirven desde la caché.
  - "Reintentar" con el corte a 60°, con el mismo degradado que `.tt-boton--principal`.
- **Descartado o pendiente:**
  - Incrustar las fuentes dentro del HTML: pesaría más y habría que regenerarlas si cambia el texto.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px. Comparativa en `pulido-visual/2.10-sin-conexion-celular.jpg`.
  - E2E `hu-06` "sin internet, el panel muestra el aviso…": ahora comprueba que, sin red, la página tiene Barlow Condensed y Montserrat cargadas (las saca el service worker de su caché). E2E completo: 147 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### Rendimiento del sitio (cierre del grupo 2, 18/10/2026)
- **Encontrado** (Lighthouse móvil, tres corridas por página): portada 86, Servicios 88, Galería 89, Nosotros 90. El LCP simulado coincidía con el momento en que la página queda interactiva: el simulador cuenta como dependencias del LCP todo lo pedido antes de pintarlo, y la portada pedía 218 KB comprimidos de JavaScript y 7 fuentes (unos 130 KB) de entrada.
  - Los avisos del panel (`Toaster`, sonner: 38 KB) estaban en el diseño raíz: se descargaban en cada página del sitio, que no los usa.
  - Barlow Condensed cargaba 6 variantes (600, 700 y 800, normal e itálica); los titulares usan solo la itálica 700 y 800. Las normales las usaban únicamente los títulos de los diálogos y del menú de shadcn, contra la regla de la marca (titulares en itálica).
  - El menú del celular (Sheet de base-ui, 26 KB comprimidos) se descargaba con la página, también en la computadora.
- **Cambios:**
  - `Toaster` en el diseño del panel (`src/app/panel/layout.tsx`), donde están todos los avisos.
  - Barlow Condensed: solo itálica 700 y 800 (de 6 archivos a 2). Los títulos de `Dialog` y `Sheet` pasan a `font-bold italic`, como el resto de los titulares.
  - Menú desplegable en dos partes: el botón (`menu-desplegable.tsx`) y la hoja (`menu-desplegable-hoja.tsx`), que se carga con `lazy()` cuando la página terminó de cargar (en un momento libre) o antes si se apunta al botón; lo común va en `menu-desplegable-comun.ts` para no tener una importación circular. El foco vuelve al botón al cerrar, con `aria-expanded` y `aria-haspopup`.
- **Descartado:**
  - `experimental.inlineCss`: empeoró (84 a 86). Next manda el CSS dos veces (en el `<style>` y en los datos de React) y el HTML comprimido pasó de 41 a 110 KB.
- **Resultado** (tres corridas, promedio): portada 90, Servicios 93, Galería 90, Nosotros 95. La primera corrida con el servidor recién arrancado puede dar menos (83 en la portada): la caché está vacía.
- **Verificación:** E2E `base` "el menú marca la página actual…": al cerrar con Escape, el foco vuelve a "Abrir menú" y `aria-expanded` es `false`. La prueba de los colores del selector (2.8) leía los colores antes de que React pusiera el contenido en su lugar (llega en un contenedor oculto, fuera del tema oscuro) y fallaba a veces en el celular: ahora espera a que el campo se vea. E2E completo: 147 pasan. Lint, typecheck y 205 unitarias sin errores. knip: solo `SheetTrigger` sin usar, parte de shadcn (aviso conocido).

### 3.1 Ingresar (19/10/2026)
- **Encontrado** (errores y bloqueo probados en `toctar_e2e`, para no sumar intentos al usuario de desarrollo):
  - Campos y botón de 32 px de alto: la pantalla se usa sobre todo desde el celular en el taller.
  - Tras un error, el foco quedaba en la página (había que tocar la contraseña de nuevo) y el error no estaba vinculado a los campos.
  - El error no se veía como en los demás formularios (sin el ícono de `MensajeError`).
  - "Ingresar" era el rectángulo de shadcn, distinto del botón rojo con el corte a 60° del sitio, aunque la pantalla está en el tema oscuro de la marca.
  - Lo que estaba bien: logo vertical sin lema y el lema como texto; título en itálica y línea LED; autocompletado y sin mayúscula automática en el usuario; el usuario se conserva y la contraseña se vacía; mensajes claros (el del bloqueo dice qué hacer); todo entra en 360 × 740.
- **Cambios:**
  - Campos y botón de 44 px; el botón es `tt-boton--principal`, a todo el ancho.
  - Tras un error, el foco va a la contraseña (vacía); el error queda vinculado a los dos campos (`aria-describedby`) y usa `MensajeError` dentro de una alerta.
  - Botón para mostrar u ocultar la contraseña, de 44 px, dentro del campo ("Mostrar la contraseña" / "Ocultar la contraseña").
- **Descartado o pendiente:**
  - "Olvidé mi contraseña": función nueva; la contraseña la cambia el dueño y el mensaje del bloqueo lo dice.
  - Centrar el título y el formulario: alineado a la izquierda se lee mejor.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px (vacío, con error y bloqueado). Comparativa en `pulido-visual/3.1-ingreso-error-celular.jpg`.
  - E2E `hu-01` "tras un error el foco va a la contraseña; los campos son de 44 px y la contraseña se puede ver". Como el nombre del botón contiene "contraseña", las pruebas buscan el campo por su etiqueta exacta (`apoyo.ts`). E2E completo: 149 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.
  - Lighthouse móvil: rendimiento 95, accesibilidad y buenas prácticas 100, CLS 0 (SEO 66: el ingreso no se indexa a propósito).
- **Revisión de YankoSoft (19/10):**
  - *"No hay botón para volver a la portada o salir de aquí."* **Cambio:** "‹ Volver al sitio" arriba a la izquierda, de 44 px (como "‹ Servicios" en la página de un servicio).
  - *"La barra roja me gusta, pero ese brillo neón no."* Elegido quitarlo en todas: **cambio** en `.tt-led` (se borra el token `--brillo-led`) y en `public/sin-conexion.html`. La línea queda lisa en la portada, el ingreso y la página sin conexión; `identidad-visual.md` actualizado.
  - E2E `hu-01`: el enlace al sitio, con 44 px. E2E completo: 149 pasan.

### 4.1 Inicio del panel (19/10/2026)
- **Encontrado** (como dueño en 4 anchos; como encargado con solo "Sitio web" y como técnico, en el celular; base `toctar_e2e`):
  - Al técnico, y al encargado sin el módulo de reclamos, el inicio les mostraba solo "Hola, …": una pantalla en blanco que no orientaba. En la Entrega 1 el técnico no tiene otros módulos (Órdenes llega con la Gestión).
  - En el celular, para ir a cualquier módulo había que abrir el menú.
  - "Inicio" y el saludo en gris debajo decían poco.
  - Lo que estaba bien: la tarjeta de reclamos pendientes (toda tocable, lleva a los pendientes, dice qué hacer), la barra lateral con el módulo actual.
- **Cambios:**
  - Un acceso de un toque a cada módulo que la persona puede usar, con ícono y una línea que dice para qué sirve. Salen de `modulosDelMenu` (los mismos del menú, por rol y permisos). Reclamos va primero y resaltado si hay pendientes. Una columna en el celular, dos en la computadora.
  - Sin módulos (hoy, el técnico): estado vacío común, "Por ahora no hay nada para ti en el panel. Tus trabajos del taller van a aparecer aquí."
  - El título es el saludo con el primer nombre ("Hola, Yerko"); la página llega entera.
- **Descartado o pendiente:**
  - Cifras o gráficos (trabajos del día, ingresos): son de la Gestión y hoy no hay datos. El inicio se rediseña con ella.
  - Se consultó si pulir el panel ahora o al terminar la Gestión: se sigue el plan inicial (ahora), porque el panel de la Entrega 1 se firma en el acta.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px (dueño) y a 390 (encargado y técnico). Comparativa en `pulido-visual/4.1-inicio-celular.jpg`.
  - E2E `hu-01` "el inicio da un acceso a cada módulo que la persona puede usar; al técnico le dice que aún no hay nada" y el saludo como título; `base` actualizada (`hu-17` pasa sin cambios). E2E completo: 151 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 4.2 Servicios del sitio (19/10/2026)
- **Encontrado:**
  - Los botones del panel medían 32 px ("Agregar servicio" y las flechas de subir y bajar, 32 × 32): en el celular, las flechas quedaban pegadas y era fácil tocar la otra. Venía de los componentes comunes (`Button`, `Input`, `Selector`), así que pasaba en todo el panel.
  - En cada fila, solo el texto abría el servicio; la miniatura no.
  - Lo que estaba bien: pestañas de 46 px que se deslizan en el celular, la lista en el orden del sitio, "Oculto" con palabra y no solo color, la flecha deshabilitada en los extremos, el resumen en 2 renglones, sin desborde, el estado vacío común.
- **Cambios:**
  - **Estándar del panel:** con pantalla táctil, botones y campos de 44 px (todos los tamaños, también los de ícono); con mouse, 36 px el normal. `pointer-coarse:` en `src/componentes/ui/button.tsx`, `ui/input.tsx` y `panel/selector.tsx`. Revisadas todas las pantallas del panel en 4 anchos: ninguna se sale.
  - Toda la fila abre el servicio, también la foto; las flechas quedan aparte. "Sin foto" va al final del nombre del enlace, para que el lector de pantalla diga primero el servicio.
- **Descartado o pendiente:**
  - Arrastrar para ordenar: función nueva y menos precisa que las flechas en el celular.
  - Para 6.1: a 360 px ya no aparece la barra horizontal en Configuración, pero los campos llegan al borde derecho sin margen (se corta el borde).
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px. Comparativa en `pulido-visual/4.2-servicios-panel-celular.jpg`.
  - E2E `base` "los botones del panel miden 44 px con pantalla táctil y 36 con mouse" (también abre el servicio desde la fila). E2E completo: 151 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 4.3 Nuevo servicio (19/10/2026)
- **Encontrado:**
  - El enlace "‹ Servicios" medía 20 px de alto: difícil de tocar con el dedo. Estaba copiado en 7 pantallas (5 del panel, la del servicio en el sitio y el ingreso), cada una con sus propias clases.
  - Al enviar con errores, el foco quedaba en el botón: no se notaba qué había fallado, sobre todo con lector de pantalla.
  - Lo que estaba bien: formulario corto (nombre y resumen), etiquetas visibles, errores con ícono y texto, ayuda bajo el resumen, campos y botón de 44 px con pantalla táctil (4.2).
- **Cambios:**
  - `EnlaceVolver` (`src/componentes/enlace-volver.tsx`): un solo enlace para volver, de 44 px, en las 7 pantallas. Se ve igual que antes.
  - `useFocoEnError` (`src/componentes/foco-en-error.ts`): tras enviar con errores, la pantalla y el foco van al primer campo con error. Lo usan este formulario y el de garantía (que ya lo hacía por su cuenta desde 2.8). Los demás formularios del panel lo reciben en su pantalla (4.4 a 6.x).
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px, vacío y con errores. Comparativa en `pulido-visual/4.3-nuevo-servicio-errores-celular.jpg`.
  - E2E `base` "al enviar con errores el foco va al campo, y el enlace para volver mide 44 px". E2E completo: 155 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 4.4 Editar servicio (19/10/2026)
- **Encontrado:**
  - En el celular, cada fila de Beneficios y Pasos dejaba el campo en 160 px (a 360 px): los 3 botones de 44 px ocupaban 132. "Brillo que dura años" se cortaba y el detalle del paso entraba en 3 palabras por renglón.
  - Tras un error, el foco no iba al campo, y las filas de Beneficios y Pasos con error no se marcaban (el lector de pantalla no lo anunciaba).
  - El número de cada fila quedaba más arriba que el centro del campo de 44 px.
  - La Descripción, el texto más largo, empezaba con un campo de 2 renglones, más bajo que el del Resumen.
  - En el celular, "Guardar cambios" queda a mitad de página, y debajo vienen Foto y Variantes, que se guardan solas: no quedaba claro si el botón también las guardaba.
  - Lo que estaba bien: el orden (Datos, Beneficios, Pasos, Guardar; Foto y Variantes aparte en la computadora), la ayuda de cada campo dice dónde se ve, controles de 44 px con pantalla táctil, "Mostrar en el sitio" se toca en toda la frase, sin desborde.
- **Cambios:**
  - `EditorLista` (`src/componentes/panel/editor-lista.tsx`): en el celular los botones de la fila van debajo de sus campos, que usan todo el ancho (300 px a 360); desde 640 px siguen al costado. El número se alinea con el primer campo. `fila` recibe `marca` para marcar con error los campos de la fila y enlazarlos a su mensaje. Textos del sitio (4.5) hereda el diseño de las filas.
  - `useFocoEnError` en el formulario del servicio.
  - Descripción con unos 5 renglones de alto al empezar (`min-h-32`); sigue creciendo con el texto.
  - Foto principal y Variantes dicen "Se guarda(n) al momento, sin el botón Guardar cambios".
- **Descartado o pendiente:**
  - Barra fija de "Guardar cambios" en el celular: taparía contenido, y con las filas más cortas el botón queda justo después de los pasos.
  - Para 6.x: en `ListaEditable` (variantes, y también espacios y tamaños de Configuración) el nombre queda solo en un renglón y los botones en otro, aun con lugar. Se ve con Configuración para no cambiarla desde aquí.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px, y las filas con datos a 360 y 1280. Comparativa en `pulido-visual/4.4-editar-servicio-filas-celular.jpg`.
  - E2E `base` "en Editar servicio una fila vacía recibe el foco con su error, y en el celular sus botones van debajo". E2E completo: 157 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 4.5 Textos del sitio (19/10/2026)
- **Encontrado:**
  - En el celular, cada motivo de "Por qué elegirnos" era un campo de un renglón: las frases (hasta 160 caracteres) se cortaban y había que moverse dentro del campo para leerlas. Lo mismo, en menor medida, con los Beneficios de un servicio.
  - En la computadora, el recuadro vacío de la foto del taller medía 596 × 447 px, lo más grande de la pantalla, y quedaba debajo de "Guardar portada" aunque se guarda al momento.
  - Tras un error, el foco no iba al campo y los motivos con error no se marcaban.
  - Portada, Nosotros y Contacto son tres formularios aparte, separados solo por espacio: nada decía que cada botón guarda solo su parte.
  - Lo que estaba bien: el orden de las páginas del sitio, un botón con nombre por parte, los textos largos que crecen con el contenido, controles de 44 px con pantalla táctil, sin desborde, Contacto aclara qué sale de Configuración.
- **Cambios:**
  - `TextoCorto` (`src/componentes/panel/texto-corto.tsx`): se ve como un campo de un renglón y crece si la frase no entra. Enter envía el formulario y lo pegado con saltos queda en un renglón. Lo usan los motivos y los beneficios.
  - La foto del taller, hasta 24 rem de ancho, con "Se guarda al momento, sin el botón Guardar portada".
  - `useFocoEnError` y `marca` en el formulario de textos.
  - "Cada parte se guarda con su botón." arriba, y una línea entre las partes.
  - "Agregar motivo", "Agregar beneficio" y "Agregar paso" medían 28 px con mouse y letra más chica (lo vio YankoSoft): ahora el tamaño normal, como "Agregar variante" (36 px con mouse, 44 con pantalla táctil).
- **Descartado:**
  - Un solo botón para guardar todo: cambiaría las acciones del servidor, y lo que hay funciona.
  - Aviso al salir con cambios sin guardar: función nueva; con la línea y la frase queda claro qué guarda cada botón.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px. Comparativa en `pulido-visual/4.5-textos-motivos-celular.jpg`.
  - E2E `base` "en Textos del sitio un motivo largo se lee entero, y Enter envía sin saltar de renglón" (también mide "Agregar motivo"). E2E completo: 159 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### Botones del panel (19/10/2026)
- **Encontrado (lo vio YankoSoft, tras la 4.5):**
  - Todos los botones del panel usan el mismo componente, pero no había regla escrita para el color: "Agregar servicio" es rojo y "Agregar pregunta", la acción principal de su pantalla, es blanco con borde. "Crear usuario" y "Agregar servicio" hacen lo mismo con nombres distintos.
  - Quedaban botones del tamaño chico (28 px y letra de 12,8 px con mouse): "Desactivar" y "Reactivar" de las listas (variantes y Configuración), "Segundo turno" y "Copiar el lunes…" de los horarios, y en Galería los íconos de cada foto y "Guardar"/"Cancelar" al editarla.
- **Cambios:**
  - La regla de color y tamaño, en los estándares de arriba.
  - Esos botones pasan al tamaño normal (36 px con mouse, 44 con pantalla táctil). En el celular ya medían 44.
  - Revisión de todas las pantallas del panel hechas (inicio, sitio, reclamos, usuarios, configuración), con los formularios, diálogos y el menú del celular abiertos, con mouse y con pantalla táctil: ningún botón bajo el tamaño. Además:
    - "Escribir por WhatsApp" (detalle de un reclamo) no mostraba el borde: sin `cn`, `border-transparent` le ganaba a `border-border`. Ahora se ve como botón y sigue siendo enlace.
    - "Cancelar" era sin fondo en los formularios de la página (variantes, espacios, preguntas, galería) y con borde en los diálogos: ahora con borde en todos.
- **Pendiente:**
  - 4.6: "Agregar pregunta" en rojo (hecho).
  - 4.7: en el celular, los 5 íconos de cada foto de la galería se reparten en dos renglones (hecho).
  - 5.x: en la lista de usuarios, "Crear usuario" pasa a "Agregar usuario" (el formulario sigue diciendo "Crear usuario") (hecho en 5.3).
- **Verificación:**
  - Capturas de Galería, Configuración y Editar servicio a 360 y 1280 px, sin desborde.
  - E2E `base` "ningún botón del panel mide menos que el tamaño normal" (servicio, textos, preguntas, galería, configuración) y `hu-17` (el enlace de WhatsApp con borde). E2E completo: 161 pasan. Lint y typecheck sin errores. knip: nada nuevo.

### 4.6 Preguntas frecuentes (19/10/2026)
- **Encontrado:**
  - "Agregar pregunta" era blanco con borde y estaba al final de la lista: con muchas preguntas quedaba fuera de la pantalla, y en Servicios la misma acción es roja y va arriba.
  - Tras un error, el foco quedaba en la página.
  - Solo el lápiz abría la edición; en Servicios se toca toda la fila.
  - La Respuesta (hasta 1000 caracteres) empezaba con un campo de 2 renglones.
  - Lo que estaba bien: pregunta en negrita y respuesta en 2 renglones, "Oculta" con palabra, los 5 íconos en un renglón también a 360 px, 44 px con pantalla táctil, sin desborde, eliminar pide confirmación y sugiere ocultar.
- **Cambios:**
  - "Agregar pregunta" en rojo y arriba, junto al texto de la pantalla; la pregunta nueva se escribe arriba de la lista.
  - `useFocoEnError` en el formulario de pregunta.
  - Tocar la pregunta o la respuesta abre la edición. Con teclado y lector de pantalla sigue siendo el lápiz (así no hay dos controles con el mismo nombre).
  - Respuesta con unos 5 renglones al empezar (`min-h-32`).
- **Descartado:**
  - Arrastrar para ordenar (como en 4.2).
  - La respuesta entera en la lista: la alarga mucho; 2 renglones alcanzan para reconocerla.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px, y el formulario con errores a 360 y 1280. Comparativa en `pulido-visual/4.6-preguntas-computadora.jpg`.
  - E2E `base` "en Preguntas, Agregar va arriba y en rojo, el error recibe el foco y tocar una pregunta la abre". E2E completo: 163 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 4.7 Galería (19/10/2026)
- **Encontrado:**
  - En el celular y la tableta, los 5 íconos de cada foto iban en dos renglones (la papelera sola abajo): a 360 px la tarjeta medía 158 px y los íconos necesitan 220; a 768, 227 px menos el margen interno.
  - Editar una foto en el celular no cabía en la tarjeta de 158 px: el servicio cortado, el error en 5 renglones y "Cancelar" fuera de la tarjeta.
  - Tarjetas de alto distinto: el par ocupaba la mitad del alto de una foto sola.
  - Sin la foto de "Después", el error salía recién en un segundo intento (el servidor revisaba antes los campos de texto).
  - Tras un error, el foco no iba al campo, ni al subir ni al editar; el error de la descripción al editar no estaba enlazado a su campo.
  - Lo que estaba bien: "Subir fotos" arriba y en rojo con el filtro al lado, "Antes"/"Después" sobre cada foto, "Oculta" con palabra, el aviso de que el orden se cambia con todos los servicios, recuadros grandes para elegir cada foto con vista previa, eliminar con confirmación, 44 px con pantalla táctil, sin desborde.
- **Cambios:**
  - En el celular, una foto por renglón (desde 640 px, la grilla de antes). Recuadro de fotos de 2:1 en todas: el par, dos cuadrados; la foto sola se recorta al centro (solo en el panel; el sitio la muestra entera). La barra de íconos usa todo el ancho de la tarjeta: los 5 en un renglón en todos los anchos.
  - `useFocoEnError` al subir y al editar. El recuadro de foto con error se marca con `data-invalido` (borde rojo) y el hook también lo reconoce: `aria-invalid` no vale en un botón. Errores de editar enlazados a sus campos.
  - `subirGaleria` revisa la foto de "Después" junto con los demás campos: todos los errores salen juntos.
- **Descartado:**
  - Un menú "Más" para ocultar y eliminar: un toque más y acciones escondidas.
  - Arrastrar para ordenar (como en 4.2).
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px, y subir y editar con errores a 360 y 1280. Con fotos reales en la base de desarrollo. Comparativa en `pulido-visual/4.7-galeria-editar-celular.jpg`.
  - E2E `base` "en la Galería del panel, subir sin nada marca todo junto y el foco va a la foto" y `hu-09` (los íconos de una foto en un renglón). E2E completo: 165 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 5.1 Reclamos (19/10/2026)
- **Encontrado:**
  - En la tabla (desde 768 px) solo el nombre abría el reclamo, con 18 px de alto: en una tableta, difícil de tocar.
  - En las tarjetas del celular los datos se partían ("· 2" en un renglón y "fotos" en el otro), y faltaba el servicio, que la tabla sí muestra.
  - La pestaña "Pendientes" no decía cuántos había.
  - Lo que estaba bien: tarjeta entera tocable en el celular y tabla en la computadora, estado con palabra y color, pestañas de 46 px, pendientes primero, estado vacío que dice de dónde llegan, sin desborde.
- **Cambios:**
  - En la tabla toda la fila abre el reclamo (el enlace del nombre la cubre con `after:absolute after:inset-0`); con teclado y lector de pantalla sigue siendo el nombre.
  - Tarjeta del celular: nombre, servicio (o "Servicio: no indicó") y un renglón con fecha, placa y fotos, sin partir ningún dato.
  - "Pendientes (2)": sale de la misma consulta, sin otra.
- **Descartado:**
  - Abrir en "Pendientes": cambia el comportamiento; con el número a la vista ya se nota si hay algo por atender.
  - Buscador y páginas: los reclamos son pocos.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px, todos y pendientes. Comparativa en `pulido-visual/5.1-reclamos-celular.jpg`.
  - E2E `hu-17` (el número en la pestaña y, en la computadora, abrir el reclamo tocando la placa). E2E completo: 165 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 5.2 Detalle de un reclamo (19/10/2026)
- **Encontrado:**
  - En el celular los 5 datos iban uno debajo de otro: a 360 px, "Escribir por WhatsApp" y "Marcar como atendido" quedaban a 870 y 1030 px.
  - Los títulos de cada parte ("Qué pasó", "Fotos", "Responder", "Atención") tenían la misma letra, tamaño y negrita que los datos: en el celular no se veía dónde empezaba cada parte.
  - Al marcar como atendido sin nota, el foco no iba al campo.
  - Lo que estaba bien: nombre y estado arriba, datos y fotos a la izquierda y acciones a la derecha en la computadora, WhatsApp con saludo ya escrito, la nota de atención con quién y cuándo, fotos que se amplían, sin desborde.
- **Cambios:**
  - Datos en dos columnas también en el celular; "Recibido" (fecha y hora) a todo el ancho. Responder y Atención suben unos 100 px a 360 px.
  - Títulos de cada parte en `font-heading` itálica, como en el resto del panel.
  - `useFocoEnError` en "Qué se hizo".
- **Descartado:**
  - Responder y Atención antes de los datos en el celular: primero hay que leer qué pasó.
  - El número de WhatsApp como enlace: el botón ya lo hace, con el saludo escrito.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px de un reclamo pendiente y uno atendido, y el error sin nota a 360 y 1280. Comparativa en `pulido-visual/5.2-reclamo-celular.jpg`.
  - E2E `hu-17` (foco en "Qué se hizo" tras el error). E2E completo: 165 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 5.3 Usuarios (19/10/2026)
- **Encontrado:**
  - En la tabla solo el nombre (18 px de alto) abría el usuario, como pasaba en Reclamos.
  - En las tarjetas del celular "usuario · rol" se partía ("encargado-permiso-c ·" y "Técnico" en otro renglón), y no decía "(tú)" en el propio, que la tabla sí.
  - "Crear usuario" en la lista: por la regla de botones, la acción principal de una lista es "Agregar…" ("Agregar servicio").
  - Lo que estaba bien: título y botón rojo arriba, tarjetas tocables enteras en el celular y tabla en la computadora, estado con palabra, desactivados al final, sin desborde.
- **Cambios:**
  - En la tabla toda la fila abre el usuario (como en 5.1).
  - Tarjeta: nombre con "(tú)" en el propio, y usuario y rol sin partirse.
  - "Agregar usuario" en la lista y "Agrega uno para cada persona del taller" en el estado vacío; el formulario sigue con "Crear usuario", como "Crear servicio".
- **Descartado:**
  - Buscador o filtro por rol: el taller tendrá pocos usuarios (la lista larga es de la base de pruebas).
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px con 35 usuarios. Comparativa en `pulido-visual/5.3-usuarios-celular.jpg`.
  - E2E `hu-02` "la lista de usuarios: Agregar usuario, (tú) y la fila que abre el usuario". E2E completo: 167 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 5.4 Nuevo usuario (19/10/2026)
- **Encontrado:**
  - Tras enviar con errores, el foco quedaba en la página.
  - Lo que estaba bien: cada rol es una tarjeta tocable entera con su descripción y el elegido con borde oscuro; los módulos del encargado aparecen solo al elegirlo, con descripción y la frase entera tocable; ayudas de usuario y contraseña; ojo de 44 px; "Crear usuario" igual que el título; 44 px con pantalla táctil; sin desborde.
- **Cambios:**
  - `useFocoEnError` en el formulario de usuario (el mismo de Editar usuario, 5.5).
- **Descartado:**
  - Avisar si un encargado queda sin módulos: hoy se permite a propósito (ve "Por ahora no hay nada para ti"); sería una regla nueva.
  - Generar la contraseña sola: función nueva.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px, vacío y con Encargado, y con errores a 360 y 1280. Sin comparativa: el cambio no se ve en la captura (el foco).
  - E2E `hu-02` "los errores del formulario se muestran junto a cada campo" (y el foco va al nombre). E2E completo: 167 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 5.5 Editar usuario (19/10/2026)
- **Encontrado:**
  - En el diálogo "Nueva contraseña", tras el error el foco quedaba en la página, y el error estaba armado a mano en lugar del componente común.
  - Al tocar "Desactivar usuario" el botón desaparece y el foco se perdía (igual al cancelar): con teclado o lector de pantalla no se notaba la confirmación.
  - "Contraseña" y "Acceso" iban con la letra común, como los textos; en el celular quedaban justo debajo de "Guardar cambios", que no guarda eso.
  - Lo que estaba bien: nombre y estado arriba, el usuario fijo con la razón, Contraseña y Acceso en columna aparte en la computadora, la confirmación de desactivar con los colores de la regla, la explicación cuando es el propio usuario, sin desborde. El formulario es el de 5.4: ya lleva el foco al error.
- **Cambios:**
  - Diálogo de contraseña con `Campo` y `useFocoEnError`.
  - Al abrir la confirmación, el foco va a su texto (que el lector de pantalla lee); al cancelar, vuelve a "Desactivar usuario".
  - "Contraseña" y "Acceso" en `font-heading` itálica, y una línea arriba de esa parte en el celular y la tableta.
- **Descartado:**
  - Mostrar u ocultar la contraseña del diálogo: va en texto a propósito, para pasársela a la persona.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px de un encargado, uno desactivado y el propio, y la confirmación y el diálogo con error a 360 y 1280. Comparativa en `pulido-visual/5.5-editar-usuario-celular.jpg`.
  - E2E `hu-02` (foco en el diálogo tras el error, en la confirmación y de vuelta al cancelar). E2E completo: 167 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 5.6 Sin acceso (19/10/2026)
- **Encontrado:**
  - "Volver al inicio" lleva a otra página, pero se anunciaba como botón: `Button` con `render={<Link />}` (base-ui le pone `role="button"`). Lo mismo "Agregar servicio" y "Agregar usuario".
  - Lo que estaba bien: explica qué pasa y qué hacer ("pídeselo al dueño") sin culpar; botón rojo de 44 px en el celular y 36 con mouse; el menú solo muestra lo que el usuario puede ver; sin desborde.
- **Cambios:**
  - Los tres pasan a `<Link className={cn(buttonVariants())}>`: se ven igual (mismo alto y color, medido) y se anuncian como enlace. La regla de botones lo dice.
- **Descartado:**
  - Decir a qué módulo se quiso entrar: la redirección no lo pasa y no hace falta para saber qué hacer.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px como técnico. Sin comparativa: se ve igual.
  - E2E `hu-02` ("Volver al inicio" como enlace en la pantalla de sin acceso); `base`, `hu-02` y `hu-07` buscan "Agregar servicio" y "Agregar usuario" como enlaces. E2E completo: 167 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

<!-- Plantilla:
### X.Y Nombre (fecha)
- **Encontrado:**
- **Cambios:**
- **Descartado o pendiente:**
- **Verificación:** capturas, pruebas, Lighthouse.
-->
