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
    - **Cambio:** toda la portada va en un solo `<Suspense>` (`PortadaConDatos`). Mientras tanto se ve solo el arte, con una pantalla reservada (`min-h-screen`), para que el pie no salte. Regla para el resto del sitio: **un título de sección nunca aparece antes que su contenido**; el título principal de la página sí puede, porque orienta.
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
  - **Rendimiento móvil del sitio (pendiente común):** la galería da 87 en tres corridas (antes de estos cambios, 85, 86 y 91 con los mismos datos: no empeoró). Como en la portada (88 a 92) y en un servicio (91 y 92), la mayor parte del LCP es "render delay" de 2 a 3,5 s, que es igual en todas las páginas. Se investiga aparte, antes de cerrar el grupo 2.
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

<!-- Plantilla:
### X.Y Nombre (fecha)
- **Encontrado:**
- **Cambios:**
- **Descartado o pendiente:**
- **Verificación:** capturas, pruebas, Lighthouse.
-->
