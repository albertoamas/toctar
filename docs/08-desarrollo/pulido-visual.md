# Pulido visual

- **Parte 1, Entrega 1 (grupos 1 a 6):** del 16 al 19 de octubre de 2026, antes de la demo del 23 y del acta del 30. ✅
- **Parte 2, Entrega 2 (grupos 7 a 13):** desde el 24 de octubre de 2026, después de la reorganización del panel (C5 §0) y antes de la demo y el acta de la Entrega 2. Mismo método, mismos estándares.
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
- **Con la skill del panel.** En las pantallas del panel se carga también `pantallas-panel` (`.claude/skills/pantallas-panel/SKILL.md`): el inventario de cada pantalla, su tipo (lista, ficha, crear, configuración o flujo), una sola acción principal, las fichas en modo lectura con "Editar" por sección, lo poco usado en el menú "Más", textos justos y la lista de QA por rol, estado y tamaño. **Menos es más:** lo que no ayuda a la tarea de la pantalla se quita, se esconde o se va a otra.
- **Restricción.** La marca ya tiene su recurso fuerte (rojo, corte a 60°, línea LED); se usa con medida. Pulir es quitar ruido antes que agregar decoración.

## Cómo se trabaja cada pantalla

1. **Antes:** se carga la skill `frontend-design` (y en el panel, `pantallas-panel`). Capturas en celular (360 y 390 px) y computadora (1280 px). En el panel, también la tableta (768 px).
2. **Análisis:** se revisa la pantalla contra los estándares de abajo y se anota en su registro qué se encontró.
3. **Propuesta:** se acuerdan los cambios con YankoSoft antes de programarlos, **una pantalla a la vez** (nunca un grupo entero de golpe). La propuesta muestra el inventario, lo que se encontró, las mejoras visuales y de orden, y los componentes que se reutilizan o se crean.
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

Una rama por grupo, desde `develop`.
- **Pedidos de la demo (2B):** una rama por pedido (`pulido/portada-comparador`, `pulido/whatsapp-nubecita`…).
- **Parte 1:** `pulido/comunes`, `pulido/sitio`, `pulido/ingreso`, `pulido/panel-sitio`, `pulido/panel-gestion` y `pulido/panel-configuracion`.
- **Parte 2:** `pulido/catalogo`, `pulido/clientes`, `pulido/consultas`, `pulido/agenda`, `pulido/taller`, `pulido/seguimiento` y `pulido/repaso`.

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

### 2B. Pedidos de la demo del 24/10
El dueño vio el sitio en pruebas, con sus fotos: le gustó la estructura y pidió un sitio más simple ("para tontos": menos es más), con más imágenes. Se hacen antes de la HU-40, uno por uno, cada uno con su PR. Alcance y horas: `03-cierre-comercial/registro-de-cambios.md`, pedidos 1 a 11.

| # | Pedido | Dónde | Estado |
|---|---|---|---|
| 2B.1 | **Comparador en la portada:** el antes y después que más le gustó, arriba, junto al lema. En la Galería del panel se elige el trabajo ("Mostrar en la portada", solo los que tienen antes); sin elegir, va el primero con antes; sin ninguno, la portada queda como hoy | `/` y `/panel/sitio/galeria` | ✅ 24/10 (PR #78) |
| 2B.2 | **WhatsApp más llamativo:** una nubecita al lado del botón fijo, con un texto corto, que aparece unos segundos después y se cierra; un solo saltito al aparecer. Sin brillo ni parpadeo continuo; sin animación con "reducir movimiento" | todas las páginas públicas | ✅ 24/10 (PR #79) |
| 2B.3 | **TikTok:** "Mira nuestros trabajos en TikTok" en la Galería y en la portada, si el enlace está cargado. Un enlace a su perfil, sin videos incrustados (cargarían los rastreadores de TikTok y harían lento el celular) | `/galeria` y `/` | ✅ 24/10 (PR #80) |
| 2B.4 | **Página de un servicio más simple:** beneficios con ícono (elegido de una lista fija en el panel), descripción corta, las opciones como escalones (estilo del afiche del nano cerámico, en los colores de la marca) | `/servicios/[slug]` y su edición en el panel | ✅ 24/10 (PR #81) |
| 2B.5 | **Imágenes dentro de la página de un servicio:** el dueño quiere fotos o afiches al lado de lo que se explica, no solo texto (aclarado por YankoSoft el 24/10: no una galería ni una tira aparte). Hecho: "Fotos de la página" en el panel, un lugar por sección ("Cómo lo hacemos" y "Opciones", con aviso si la sección no se ve); en el sitio, al lado de su sección (alternando de lado en la computadora, debajo del texto en el celular). Decorativas: sin descripción ni visor. Con la revisión de YankoSoft, además: sin "En qué consiste" (repetía el resumen, que queda arriba) y sin la grilla "Trabajos de…" al final (queda "Ver la galería") | `/servicios/[slug]` y el panel | ✅ 24/10 (PR #83) |
| 2B.6 | **Repaso "menos es más":** el sitio entero con la vara del dueño: textos más cortos y más foto donde haya. Hecho: en el celular, las listas de servicios (Servicios y la portada) sin el resumen cortado a la vista (foto, nombre y "Ver el servicio"; el lector de pantalla lo sigue leyendo); textos fijos más cortos (intro de Servicios y los cierres). Lo que escribe el dueño en el panel no se toca desde el código: se le sugiere acortar "Cómo trabajamos" de Nosotros y la presentación de la portada | sitio público | ✅ 24/10 (PR #82) |
| 2B.7 | **Logo del encabezado más grande:** de 32 a 36 px de alto en el celular y 40 en la computadora (sigue sin lema: mide menos de los 360 px que pide el manual) | encabezado del sitio | ✅ 24/10 (PR #84) |
| 2B.8 | **"Ver el servicio" a la misma altura:** en la computadora, el enlace de cada tarjeta de servicio quedaba más arriba o más abajo según el largo del resumen; ahora va al pie de la tarjeta (revisión de YankoSoft) | Servicios y portada | ✅ 24/10 (PR #84) |
| 2B.9 | **Foto del equipo en Nosotros:** un lugar en Textos del sitio → Nosotros (como la foto del taller de la portada; `FOTOS_DE_PAGINA`); en el sitio, al lado de la historia en la computadora y debajo en el celular | `/nosotros` y `/panel/sitio/textos` | ✅ 24/10 (PR #85) |
| 2B.10 | **Sin hueco sobre el comparador de la portada:** en un celular ancho (de 390 a 767 px) quedaba un espacio de hasta 150 px entre los botones y el comparador: el alto reservado para el texto mientras carga seguía puesto ya cargado. Ahora solo se reserva cargando; CLS 0 medido con la red y el procesador frenados (revisión de YankoSoft) | `/` | ✅ 24/10 (PR #86) |
| 2B.11 | **El comparador de la portada se mueve solo:** la línea va y viene suave (del 20 al 80 %, 5 s la ida y vuelta) desde un segundo después de estar a la vista; tras 3 idas y vueltas queda en el medio (no se mueve para siempre: WCAG 2.2.2). Se detiene si el visitante la arrastra de costado, la toca o la enfoca con el teclado (desplazar la página sobre la foto no la detiene); se pausa fuera de la pantalla o con la pestaña oculta y no se mueve con "reducir movimiento" (tampoco si se activa con la página abierta). El deslizador del lector de pantalla queda en el medio mientras tanto. Solo en la portada: en la galería la persona la abre para arrastrarla (pedido de YankoSoft) | `/` | ✅ 24/10 (PR #86) |
| 2B.12 | **Galería rediseñada como vitrina pareja:** todos los trabajos en el mismo recuadro de 4:3, en una grilla regular (3 columnas en la computadora, 2 en la tableta, 1 en el celular): lo que ordena la página es esa repetición. Los antes y después van primero y se comparan ahí mismo (sin abrir nada; quietos, solo el de la portada se mueve solo); las fotos solas llenan su recuadro. Debajo de cada uno, su servicio, que lleva a su página. El filtro, como el menú del sitio: solo texto y la barra roja a 60° bajo el elegido. Sin visor ni descripciones; la descripción del panel pasa a ser opcional ("Trabajo de <servicio>" si falta). Una primera versión por secciones de servicio se descartó: con tamaños distintos se veía desordenada (revisión de YankoSoft) | `/galeria` y `/panel/sitio/galeria` | ✅ 25/10 (PR #88) |

**Del afiche del nano cerámico** (ejemplo del dueño) se toma: la fila de beneficios con ícono, la escalera de años como opciones y la idea en una línea ("a más años, más gruesa la capa"). No se copia: los colores por año (azul, verde, naranja), los brillos ni el texto todo en mayúsculas, que rompen la marca y cuestan en el celular.

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
| 6.1 | Datos del negocio y logo | `/panel/configuracion` | ✅ 19/10 |
| 6.2 | Taller (espacios y tamaños de vehículo) | `/panel/configuracion/taller` | ✅ 19/10 |
| 6.3 | Cotizaciones y mantenimiento (desde el 24/10, Parámetros) | `/panel/configuracion/parametros` | ✅ 19/10 |

### Parte 2: Entrega 2

Las pantallas de C1 a C4, en el orden en que el taller las usa. Los mismos estándares de arriba; además, en el panel de gestión:
- **El dueño las usa en el taller, desde el celular**, con poco tiempo: lo que se consulta más va arriba y cada fila es un toque.
- **Montos legibles de un vistazo:** cifras con `tabular-nums`, en Bs, y el saldo siempre dicho con palabras ("Pagado", "Saldo: 300 Bs"), no solo con color.
- **El técnico (RN-12)** nunca ve precios, pagos ni el teléfono del cliente: se revisa también con su usuario.
- **Estados de un trabajo** (agendada, recibida, en proceso, lista, entregada, cancelada) escritos igual en todas las pantallas.
- **Cada pantalla se ordena con `pantallas-panel`:** primero su inventario (qué hay, para qué tarea, quién y cada cuánto, y la decisión: queda, se esconde o se va), después su tipo y su forma. Los patrones nuevos (la sección con "Editar" y el menú "Más") se arman una vez en `src/componentes/panel/` en el primer grupo que los necesite y los demás grupos los reusan.

### 7. Panel: catálogo

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 7.1 | Catálogo y precios | `/panel/catalogo` | ✅ |
| 7.2 | Nuevo servicio (antes 4.3, en Sitio web; desde el 26/10, un modal de la lista) | `/panel/catalogo` | ✅ |
| 7.3 | Servicio del catálogo: datos, precios por tamaño, variantes e historial | `/panel/catalogo/[id]` | ✅ |

### 8. Panel: clientes

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 8.1 | Clientes y búsqueda | `/panel/clientes` | ✅ |
| 8.2 | Agregar cliente | `/panel/clientes/nuevo` | ✅ |
| 8.3 | Ficha del cliente: datos, vehículos, consultas, reservas y mantenimientos | `/panel/clientes/[id]` | ✅ |

### 9. Panel: consultas y cotizaciones

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 9.1 | Consultas (pestañas y consultas que se enfrían) | `/panel/consultas` | ✅ |
| 9.2 | Nueva consulta | `/panel/consultas/nueva` | ✅ |
| 9.3 | Detalle de una consulta: estado, fotos, cotizaciones y reservas | `/panel/consultas/[id]` | ✅ |
| 9.4 | Cotizar | `/panel/consultas/[id]/cotizar` | ✅ |
| 9.5 | PDF de la cotización (impreso y en el celular; con la skill `pdf`) | `/panel/cotizaciones/[id]/pdf` | ✅ |

### 10. Panel: agenda y pagos

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 10.1 | Agenda: tablero de la semana y del día | `/panel/agenda` | ✅ |
| 10.2 | Nueva reserva (desde una cotización, directa y desde un mantenimiento) | `/panel/agenda/nueva` | ✅ |
| 10.3 | Reserva: montos, pagos, reprogramar y cancelar | `/panel/agenda/[id]` | ✅ |

### 11. Panel: taller

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 11.1 | Órdenes (dueño y encargado) y Mis órdenes (técnico) | `/panel/ordenes` | ✅ |
| 11.2 | Orden: estado, fotos, avances, montos y aviso | `/panel/ordenes/[id]` | ✅ |
| 11.3 | Recibir vehículo | `/panel/ordenes/[id]/recibir` | ✅ |
| 11.4 | Entregar vehículo | `/panel/ordenes/[id]/entregar` | ✅ |

### 12. Panel: seguimiento

| # | Pantalla | Ruta | Estado |
|---|---|---|---|
| 12.1 | Saldos pendientes | `/panel/pagos` | ⏳ |
| 12.2 | Mantenimientos | `/panel/mantenimientos` | ⏳ |

### 13. Repaso de lo que cambió y pendientes de la parte 1

| # | Pantalla | Qué se revisa | Estado |
|---|---|---|---|
| 13.1 | Estructura del panel (1.4) | El menú en grupos y la barra lateral pulida el 24/10 (C5 §0): se registra y se revisa con el técnico y con un encargado | ⏳ |
| 13.2 | Servicios del sitio y su página (4.2 y 4.4) | Sin alta, nombre ni variantes desde la reorganización: que nada quede huérfano | ⏳ |
| 13.3 | Portada (2.1) | La foto del taller es el LCP del celular: que cargue sin diferir y con prioridad (`loading="eager"`) | ⏳ |
| 13.4 | No encontrado dentro del panel | Hoy no existe: un cliente, una orden o una cotización que ya no está (27 `notFound()` del panel) muestra la página del sitio público, con su menú y "Ver los servicios", y saca al personal del panel. Necesita la suya, dentro del panel | ⏳ |
| 13.5 | Error inesperado (sitio y panel) | Hoy no existe: sin `error.tsx` ni `global-error.tsx`, una falla del servidor muestra la página genérica de Next, sin marca ni forma de volver | ⏳ |

**Cobertura** (revisada el 24/10 contra todas las rutas de `src/app` y `public/`): cada pantalla del sitio, el ingreso y el panel está en un grupo. Lo que no tiene ruta propia se revisa dentro de su pantalla:
- **Los diálogos:** el historial de precios va en 7.3, el visor de fotos en 11.2 y 11.3, y el comprobante en 10.3 y 11.4.
- **Los formularios que se abren en la misma pantalla:** registrar o anular un pago, reprogramar o cancelar, extender la entrega, "No le interesa"…
- **El inicio (4.1)** no entra: lo rehace la HU-39 (pantalla del día).
- **Las pantallas que suma C5:** "Mensajes" (HU-40) y "Publicar en la galería" (HU-41) se diseñan con `frontend-design` en su propia historia.
- `GET /api/salud` no es una pantalla.

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
  - Pendiente para 6.1: a 360 px, `/panel/configuracion` todavía se pasa 3 px. No viene de la estructura: el formulario del negocio tiene algo que no se achica (resuelto en 6.1: eran las horas del horario).
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
  - El bloque de texto de la cabecera tiene el mismo alto mínimo cargando y cargado (24,5rem en el celular, 18,5rem en la computadora): un texto más corto ya no hace subir la página. Medido: diferencia 0 a 360, 412 y 1280 px. **Cambió el 24/10 (2B.10):** ya cargado mide lo suyo; la reserva queda solo mientras carga (`CabeceraCargando`), porque en un celular ancho dejaba un hueco sobre el comparador.
  - El cierre usa el botón de WhatsApp principal (rojo): mientras se ve, el fijo se esconde.
  - En el celular (menos de 640 px), `TarjetaServicio` pasa a fila compacta: foto de 7rem a la izquierda, título de 22 px, resumen de 2 renglones y "Ver el servicio" (desde el 24/10, sin el resumen a la vista: 2B.6). Toda la fila se toca y conserva el corte a 60°. La portada del celular bajó a 2975 px. Como es el mismo componente, la página Servicios también lo tiene (se revisa en 2.2).
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

### 2.4 y cierre de las páginas: pedidos del 24/10/2026
- **Pedido:**
  - En la galería, que el antes y el después se comparen con una línea que se arrastra sobre la foto.
  - Que la sección de cierre ("¿Quieres este resultado en tu vehículo?" y las demás) no quede a media pantalla en una página corta.
- **Decidido con YankoSoft:**
  - **El comparador va en la foto grande:** la grilla sigue igual, con su etiqueta "Antes y después". En la grilla, arrastrar con el dedo chocaba con tocar para abrir.
  - **El cierre sigue solo en las páginas que ya lo tenían** (portada, Servicios, cada servicio, Galería, Nosotros y Preguntas frecuentes).
- **Cambios:**
  - **`ComparadorAntesDespues`** (`src/componentes/sitio/comparador-antes-despues.tsx`):
    - una sola foto con el antes recortado hasta la línea;
    - el tirador es el paralelogramo rojo a 60° de la marca, con un borde oscuro en la línea para leerse sobre fotos claras;
    - se arrastra en cualquier punto de la foto con el dedo o el mouse (`touch-action: pan-y`: la página se sigue desplazando de arriba abajo);
    - con el teclado y el lector de pantalla, un deslizador nativo oculto (flechas), con el foco en el tirador;
    - la caja toma la forma de la foto de después y no pasa del 70 % del alto de la pantalla.
  - **El visor** usa el comparador cuando hay antes; con una sola foto, la muestra como antes. `FotoGrande` quedó sin las opciones del par.
  - **`CierreWhatsApp`** lleva `mt-auto`: queda pegado al pie. La página de un servicio ahora es una columna que llena la pantalla (`flex-1`), para que el cierre llegue al pie también ahí.
- **Verificación:**
  - Capturas a 390 y 1280 px, del comparador y de la galería.
  - En una pantalla de 1900 px de alto, el hueco entre el cierre y el pie es de 0 px en la galería, las preguntas, Nosotros, Servicios, la portada y dos servicios.
  - E2E `hu-12`: la línea arranca al medio, las flechas la mueven y un toque cerca del borde la lleva ahí.
  - E2E `base`: el cierre pegado al pie en las 6 páginas que lo tienen.
- **Después de la revisión de código:** las dos fotos se ven enteras (`object-contain`); la línea no salta al empezar a desplazar la página (se mueve solo con un arrastre de costado o un toque); el tirador queda entero en los bordes; la etiqueta que no cabe se esconde; el foco del visor entra por el título.

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
  - Para 6.1: a 360 px ya no aparece la barra horizontal en Configuración, pero los campos llegan al borde derecho sin margen (se corta el borde) (resuelto en 6.1).
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
  - Para 6.x: en `ListaEditable` (variantes, y también espacios y tamaños de Configuración) el nombre queda solo en un renglón y los botones en otro, aun con lugar. Se ve con Configuración para no cambiarla desde aquí (resuelto en 6.2).
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

### 6.1 Datos del negocio y logo (19/10/2026)
- **Encontrado:**
  - A 360 px todo el formulario se salía 15 px por la derecha y quedaba recortado (campos, etiquetas, la descripción del horario). La causa: en el horario, cada renglón tenía dos horas de ancho fijo (128 px) más la "a" y la ✕, unos 356 px donde había 328; ese renglón ensanchaba la columna y la página recortaba lo que sobraba.
  - El cuadro de cada día medía 32 px de alto con pantalla táctil.
  - Tras un error, el foco quedaba en la página; el error del horario era texto suelto y no el componente común.
  - En el celular el logo quedaba debajo de "Guardar cambios" pero se guarda solo, al momento.
  - Lo que estaba bien: partes con título, ayuda de la ubicación con "Ver en el mapa", horario por día con segundo turno y "Copiar el lunes", el logo en columna aparte en la computadora.
- **Cambios:**
  - Las horas se achican si no hay lugar (hasta 128 px), y el primer turno guarda el lugar de la ✕: las horas de los dos renglones quedan alineadas.
  - El cuadro de cada día y "Cerrado": 44 px con pantalla táctil, 36 con mouse.
  - `useFocoEnError` en el formulario; el error del horario con `MensajeError`.
  - El logo dice "Se guarda al momento, sin el botón Guardar cambios", con una línea arriba en el celular y la tableta.
- **Descartado:**
  - Otro selector de horas: el reloj del sistema funciona bien en el celular.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px, y con error a 360 y 1280. Comparativa en `pulido-visual/6.1-configuracion-horario-360.jpg`.
  - E2E `hu-04` "a 360 px ningún campo de Configuración se sale de la pantalla" y el foco en el primer error. E2E completo: 169 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 6.2 Taller: espacios y tamaños (19/10/2026)
- **Encontrado:**
  - En el celular las 8 filas ocupaban dos renglones (el nombre arriba, los botones abajo), aun con nombres cortos como "Espacio 1"; en la computadora, 2 de 8. El nombre pedía al menos 192 px y, a 360 px, ↑ ↓ ✎ y "Desactivar" ocupaban unos 230 de los 302 que hay. Es la lista común: lo mismo en las variantes de un servicio.
  - Al agregar sin nombre, el foco no volvía al campo.
  - Lo que estaba bien: cada lista con título y para qué sirve, desactivados aparte con borde punteado y "Reactivar", agregar y renombrar en la lista con el foco en el campo al abrir, 44 px con pantalla táctil, sin desborde.
- **Cambios:**
  - Cada fila en un renglón: el nombre (se parte si es largo) y ↑ ↓ ✎. "Desactivar" pasa a la edición (se abre con el lápiz), con borde y a la derecha de Guardar y Cancelar: se usa poco y así no se toca sin querer. Vale para espacios, tamaños y variantes.
  - `useFocoEnError` en el formulario de la lista.
- **Descartado:**
  - "Desactivar" como ícono: la palabra es más clara, y el ojo ya es "ocultar" en Preguntas y Galería.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px, y agregar con error a 360 y 1280; la edición con "Desactivar" a 360. Comparativa en `pulido-visual/6.2-taller-celular.jpg`.
  - E2E `hu-05` "espacios del taller…" (desactiva desde la edición). E2E completo: 169 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 6.3 Cotizaciones y mantenimiento (19/10/2026)
- **Encontrado:**
  - Tras un error, el foco quedaba en la página.
  - "Bs" iba antes del número y "días" y "meses" después: el campo del adelanto arrancaba unos 28 px más a la derecha que los otros dos.
  - Lo que estaba bien: el aviso de que cambiar un valor no toca lo guardado, dos partes con título, ayuda y unidad en cada campo, los textos del PDF que crecen con el contenido, 44 px con pantalla táctil, sin desborde.
- **Cambios:**
  - `useFocoEnError` en el formulario.
  - La unidad siempre después ("250 Bs"): los tres campos alineados.
- **Descartado:**
  - Vista previa del PDF con los textos: función nueva, y el PDF es de la Entrega 2.
- **Verificación:**
  - Capturas a 360, 390, 768 y 1280 px, y con errores a 360 y 1280. Comparativa en `pulido-visual/6.3-cotizaciones-computadora.jpg`.
  - E2E `hu-05` "los parámetros vacíos o negativos…" (y el foco en el adelanto). E2E completo: 169 pasan. Lint, typecheck y 205 unitarias sin errores. knip: nada nuevo.

### 7.1 Catálogo y precios (25/10/2026)
- **Inventario** (skill `pantallas-panel`):

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | Servicios con variantes, días y estado de los precios | Encontrar un servicio; saber si le faltan precios | Dueño, seguido | Queda, con el precio a la vista |
  | Ningún precio en la lista | Responder "¿cuánto cuesta?" | Dueño, todos los días | Se agrega "Desde 700 Bs" (dato existente) |
  | "Precios completos" en cada fila | Informar | — | Se va: solo se avisa lo que falta |
  | Insignia "Genera mantenimiento" junto al nombre | Informar | Rara vez | Pasa a texto en los datos de la fila |
  | "Toca un servicio para editarlo" | Explicar | — | Se va |
- **Encontrado:**
  - Una pantalla llamada "Catálogo y precios" que no mostraba ningún precio.
  - "Precios completos" repetido en las 8 filas, sin información útil.
  - La insignia de mantenimiento desalineaba la primera fila.
  - La fila no tenía flecha: en la computadora no parecía tocable, a diferencia del inicio.
  - Cada lista del panel armaba su encabezado y sus filas a su manera.
- **Cambios** (propuesta aprobada el 25/10):
  - Cada fila: el nombre, debajo **"Desde 700 Bs"** (el menor de sus precios vigentes, `precioDesde`) o "Según evaluación", y en tinta suave "5 variantes · 1 día · Con mantenimiento". **"Faltan N precios"** en la insignia de aviso, solo cuando faltan. Flecha a la derecha. Inactivos atenuados con su insignia.
  - Una línea arriba: "Los precios no salen en el sitio."
  - **Componentes compartidos nuevos:** `EncabezadoPagina` (título, acción principal y una línea de contexto) y `ListaFilas` / `DatosFila` (`fila-lista.tsx`: fila de un toque con título, dato, detalles, aviso o estado y flecha). La fila del inicio (`BloqueDelDia`) pasa a usarla: una sola implementación.
  - La lista calcula los precios faltantes y el "desde" con `preciosVigentes` (la misma consulta que la ficha) en lugar de otra consulta propia. `textoDias` reemplaza el "1 día / N días" repetido.
- **Verificación:** capturas a 360, 390, 768 y 1280 px, sin desborde; el inicio se ve igual con la fila compartida. Comparativa en `pulido-visual/7.1-catalogo-celular.jpg`. E2E `hu-19-20` (el "desde", el aviso de lo que falta y "Con mantenimiento"), `hu-39`, `hu-01` y `hu-17`; unitarias de `precioDesde` y `textoDias`.

### 7.2 Nuevo servicio (25/10/2026)
- **Encontrado:** ya era una pantalla de crear como pide la skill (un campo y "Crear servicio"). La ayuda explicaba que el servicio nace oculto en el sitio, algo que ya dice su ficha; el título no usaba el encabezado compartido.
- **Cambios** (propuesta aprobada el 25/10): `EncabezadoPagina`; la ayuda se acorta a "Como lo conocen los clientes."; el nombre empieza con el cursor puesto (`autoFocus`): es el único campo y en el celular el teclado aparece solo.
- **Verificación:** capturas a 360, 390, 768 y 1280 px, con el foco visible en el campo. Comparativa en `pulido-visual/7.2-nuevo-servicio-celular.jpg`. La E2E de `base` que comprueba que un error devuelve el foco al campo ahora saca el foco antes de enviar (si no, pasaba sin probar nada).
- **Revisión del 26/10 (aprobada):** una pantalla entera para un solo campo obligaba a ir y volver. "Agregar servicio" abre ahora el modal "Nuevo servicio" desde la lista (el mismo de las fichas, `ModalFormulario`: hoja desde abajo en el celular, el cursor en el nombre); al crear, lleva a la ficha. Se borra `/panel/catalogo/nuevo`, que redirige a `/panel/catalogo` como la vieja `/panel/sitio/servicios/nuevo`. Regla nueva de la skill: crear algo de uno a tres campos va en un modal; un formulario largo, en su pantalla. Capturas a 360, 390, 768 y 1280 px con el modal abierto y el foco en el campo; comparativa en `pulido-visual/7.2-nuevo-servicio-modal-celular.jpg`. E2E: el ayudante `abrirNuevoServicio`, y `hu-19-20` comprueba las dos redirecciones.

### 7.3 Servicio del catálogo (25 y 26/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | Precios de cada variante (un formulario abierto por variante) | Consultar un precio; cambiarlo a veces | Dueño, seguido | Arriba y en lectura, un recuadro por variante con "Editar" |
  | Datos (nombre, duración, mantenimiento, activo) | Configurar el servicio | Dueño, rara vez | En lectura, con "Editar" |
  | Variantes (agregar, renombrar, ordenar, desactivar) | Cambiar la estructura | Rara vez | En lectura (sus nombres), con "Editar" |
  | Historial de precios | Consultar | Rara vez | Dentro del modal de precios |
  | Modelos de cada tamaño y párrafos de ayuda | Explicar | Casi nunca | Se van; queda una línea en el formulario de precios |
- **Encontrado:**
  - **5.032 px de alto en el celular** (unas siete pantallas): el formulario de datos y uno de precios por variante, todos abiertos; con las cinco variantes del cerámico, 25 campos y **seis botones rojos de guardar** a la vista.
  - Para consultar un precio, lo que más se hace aquí, había que leer formularios.
  - Párrafos de ayuda en cada sección, "Ver los modelos de cada tamaño" (ya están en Configuración) y la lista de variantes repetida al final.
  - El estado en el sitio era una frase gris con un enlace subrayado; en la orden es una insignia y un botón.
- **Primera versión (25/10), descartada en la revisión del 26/10:** edición en el lugar con una sección abierta a la vez, y en la computadora un recuadro angosto a la derecha. El desarrollador vio desorden: el recuadro de datos no alineaba con los precios (arrancaba a la altura del título "Precios"), tres estilos de título, siete botones "Editar" con borde, la grilla de precios con montos a distintas alturas, y la página que saltaba al editar.
- **Cambios** (propuesta aprobada el 26/10):
  - **Un solo sistema por sección:** título (Barlow) fuera del recuadro y "Editar" sin borde en su misma fila; el recuadro debajo. Cada variante es un recuadro con su nombre y su "Editar" en la cabecera. Datos y Variantes lado a lado, del mismo alto; desde la revisión del 26/10, **arriba de los precios** (primero lo que es el servicio y después sus precios).
  - **"Editar" abre un modal** ("Precios de 1 año", "Datos del servicio", "Variantes") con el formulario y "Guardar …" y "Cancelar" (o "Listo") al pie. En el celular es una hoja desde abajo con los botones fijos. La página no salta ni cambia mientras se edita; el foco va al primer campo al abrir y vuelve a "Editar" al cerrar. "Ver historial" va arriba en el modal de precios (consulta, no guarda). El formulario de precios, como la lectura: una fila por tamaño (el nombre a la izquierda y el campo en Bs, de ancho fijo, a la derecha); en una grilla, los nombres largos movían los campos de altura y de ancho.
  - **Precios en lectura** como lista en todos los tamaños de pantalla: el tamaño a la izquierda y el monto a la derecha, en columna aunque el nombre del tamaño ocupe dos líneas. En la computadora, dos recuadros por fila.
  - Encabezado compartido con la insignia ("En el sitio", "Oculto en el sitio" o "Inactivo") y "Su página en el sitio" como botón de contorno. Recién creado y sin precios, se abre el modal de los de su primera variante.
  - **Componentes:** `SeccionConEditar` (nuevo, `seccion-con-editar.tsx`: título, "Editar", recuadro de lectura y modal con el formulario) y `ModalFormulario` (`modal-formulario.tsx`: el modal, con `useCerrarModal`, `PieModal` y `CancelarModal` para el formulario; lo usa también "Agregar servicio") reemplaza a `SeccionEditable`, que se borra con su regla de "una abierta a la vez" (el modal ya lo es). Lo reutilizan las demás fichas.
- **Verificación:**
  - **2.226 px en el celular (−56 %)** y 1.384 en la computadora (−59 %); igual con Datos y Variantes arriba. Capturas a 360, 390, 768 y 1280 px en lectura y con cada modal abierto (hoja en el celular); el foco en el primer campo al abrir (también el que se abre solo al crear) y de vuelta en "Editar" al cerrar. Comparativas en `pulido-visual/7.3-servicio-catalogo-celular.jpg` y `7.3-servicio-catalogo-computadora.jpg`.
  - E2E `hu-19-20` con los modales (editar, guardar, cerrar y volver a lectura con el dato y el foco; "Listo" no aparece con una variante a medio escribir); la página pública se renueva en segundo plano en unos segundos y la prueba la visita hasta ver el cambio (`enElSitio`). `hu-07` cierra el modal de precios que abre la ficha recién creada.
  - La especificación C1 (§5 y §8) quedó al día.

### 8.1 Clientes y búsqueda (26/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | Buscador (nombre, teléfono o placa) | Encontrar a un cliente | Dueño o encargado, varias veces al día | Arriba: es la tarea de la pantalla |
  | Lista: nombre, WhatsApp y placas | Abrir la ficha | Igual | Queda, con la fila de un toque compartida |
  | "Agregar cliente" | Registrar un cliente | Seguido | Arriba; en su pantalla (cliente y vehículo: un formulario largo) |
  | "Ver desactivados" | Recuperar a un cliente dado de baja | Rara vez | Abajo |
- **Encontrado:**
  - Dos listas distintas en la misma pantalla (tarjetas sueltas en el celular, tabla en la computadora), cuando el catálogo y el inicio ya usan la fila de un toque.
  - La placa, que es como el taller nombra un auto, en gris chico al lado del teléfono.
  - El texto del buscador cortado en el celular ("Buscar por nombre, teléfono o p" a 360 px).
  - Viendo los desactivados, solo un texto en negrita lo decía; para volver, un enlace al final.
- **Cambios** (propuesta aprobada el 26/10):
  - `ListaFilas` en todos los tamaños: el nombre, las placas en negrita y el WhatsApp en tinta suave (o "Sin vehículos"). Se van la tabla y las tarjetas.
  - **Varios vehículos** (pedido del desarrollador al aprobar: una familia o una flota): hasta tres placas y "y 2 más", sin cortar una placa al pasar de renglón; si se buscó una placa, las que coinciden van primero, así la buscada se ve aunque sea la quinta. Función pura `placasEnFila`, con prueba unitaria.
  - `EncabezadoPagina` con "Agregar cliente"; en el buscador, "Nombre, teléfono o placa" (el lector de pantalla sigue oyendo la etiqueta completa).
  - Viendo los desactivados: "Desactivados. Ver los activos" arriba de la lista y las filas atenuadas.
- **Verificación:** capturas a 360, 390, 768 y 1280 px de la lista, una búsqueda, una sin resultados, una por la quinta placa y los desactivados, con un cliente temporal de cinco vehículos y un nombre de 60 letras (se borró después); sin desborde. El alto en el celular queda igual por fila (la placa en su renglón). Comparativa en `pulido-visual/8.1-clientes-celular.jpg`. E2E `hu-22` (cinco vehículos: tres placas y "y 2 más"; la quinta buscada pasa adelante) y `hu-23`, sin el filtro de lo visible que pedían la tabla y las tarjetas.

### 8.2 Agregar cliente (26/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | Nombre y WhatsApp | Registrar al cliente | Dueño o encargado, cada cliente nuevo | A la vista (obligatorios) |
  | Placa y tamaño del primer vehículo | Lo normal: llega con su auto | Casi siempre | A la vista: el tamaño define el precio |
  | Correo, NIT, razón social y notas | Facturar, recordar algo | A veces, casi siempre después | Plegados: "Agregar correo, NIT y notas" |
  | Marca, modelo, año y color | Describir el auto | A veces | Plegados: "Agregar marca, modelo, año y color" |
  | "Agregar cliente" (botón) | Crear | Al final | "Crear cliente", fijo al pie en el celular |
- **Encontrado:**
  - 12 campos a la vista y 1.501 px en el celular (dos pantallas), cuando el caso común usa 4.
  - Entre el WhatsApp y la placa, cuatro campos opcionales: para cargar el auto había que pasar por lo que no se usa.
  - El botón decía lo mismo que el título ("Agregar cliente") y quedaba al fondo.
  - En la computadora, el nombre ocupaba todo el ancho y el WhatsApp quedaba angosto, mientras placa y tamaño iban de a dos.
  - La ayuda de Notas, en dos líneas; el título sin el encabezado compartido.
- **Cambios** (propuesta aprobada el 26/10):
  - A la vista, nombre y WhatsApp; placa y tamaño (de a dos desde 640 px). Lo opcional, plegado detrás de "＋ Agregar …": se abre con un toque, el foco pasa a su primer campo y empieza abierto si trae un valor o un error (un error nunca queda escondido).
  - "Crear cliente" ("Creando…"); en el celular, fijo al pie mientras el formulario se desplaza.
  - Notas: "Por ejemplo, cómo prefiere que lo contacten." (también en la ficha). `EncabezadoPagina`.
  - **Componentes nuevos:** `MasDatos` (`mas-datos.tsx`: un `<details>` nativo, funciona antes de cargar la página y sus campos se envían igual estando cerrado) y `PieFormulario` (`pie-formulario.tsx`: el botón de crear fijo al pie en el celular). `CamposCliente` y `CamposVehiculo` reciben `plegar`; la ficha y la nueva consulta no cambian.
- **Verificación:** **950 px en el celular (−37 %)**; con todo abierto, 1.582. Capturas a 360, 390, 768 y 1280 px vacía, con todo abierto y con errores (el correo inválido recibe el foco; el grupo del vehículo abierto porque trae la marca); desplazada hasta el final, el botón fijo no tapa nada. Comparativa en `pulido-visual/8.2-agregar-cliente-celular.jpg`. E2E `hu-21`: lo opcional plegado, el foco al abrir, el "＋ Agregar" de 44 px y el error de un campo plegado a la vista y con el foco; "Crear cliente".

### 8.3 Ficha del cliente (26/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | Nombre y "Escribir por WhatsApp" | Saber quién es, contactarlo | Seguido | Arriba |
  | Vehículos (lista, lápiz y "Agregar vehículo") | Ver sus autos, agregar uno | Seguido | Arriba; editar y agregar en modales |
  | Datos: 6 campos abiertos y "Guardar cambios" | Consultar un dato; corregirlo a veces | Consultar seguido, editar rara vez | En lectura, con "Editar" en un modal |
  | Reservas con saldo y estado | Qué tiene agendado y qué debe | Seguido | Queda; lo que debe sube al encabezado |
  | Consultas y "Nueva consulta" | Qué preguntó, empezar otra | A veces | Queda |
  | Mantenimientos | Cuándo le toca | A veces | Al final |
  | "Desactivar" (título, texto y botón) | Darlo de baja | Casi nunca | Al menú "Más", con confirmación |
- **Encontrado:**
  - **1.888 px en el celular** (casi tres pantallas); la mitad, el formulario de datos abierto (6 campos y "Guardar cambios") para algo que se edita rara vez.
  - Lo que debe el cliente, recién en la tercera pantalla, dentro de Reservas.
  - "Desactivar", una sección entera (título, texto y botón) entre Datos y Consultas.
  - Los campos vacíos (correo, NIT, razón social) ocupando lugar; el vehículo se editaba dentro de la lista y la página saltaba.
  - El encabezado sin el componente compartido; en el celular, el botón de WhatsApp solo en su renglón.
- **Cambios** (propuesta aprobada el 26/10):
  - Encabezado compartido con "Debe 900 Bs" (insignia de aviso, solo para quien ve pagos; como en Saldos pendientes, lo entregado sin pagar: función pura `saldoPendiente`, con prueba unitaria), "Escribir por WhatsApp" y **"Más"** con "Desactivar cliente" (confirmación en un modal, el foco en "Cancelar"). Desactivado: "Reactivar cliente" en el encabezado.
  - Datos en lectura (etiqueta y valor, solo lo que tiene valor) con "Editar" en un modal; vehículos con la placa grande, el lápiz y "＋ Agregar" en modales, con lo opcional plegado como en el alta. Lado a lado y del mismo alto en la computadora.
  - Reservas con `ListaFilas` (con flecha, como las demás listas), antes que Consultas; Mantenimientos igual (su fila lleva un enlace adentro).
  - **Componentes:** `MenuMas` (nuevo, `menu-mas.tsx`, sobre el `dropdown-menu` de shadcn: lo usarán las fichas de consulta, reserva y orden); `CancelarModal focoInicial`, para las confirmaciones. Reutilizados: `EncabezadoPagina`, `SeccionConEditar`, `ModalFormulario`, `ListaFilas` y `MasDatos`. `AccesoCliente` pasa a `MasCliente` y `ReactivarCliente`.
- **Verificación:** **1.279 px en el celular (−32 %)** y 914 en la computadora (−26 %). Capturas a 360, 390, 768 y 1280 px de dos clientes (uno con reservas, saldo y mantenimiento; otro con dos vehículos y una consulta), del menú "Más" y de cada modal; el foco en el primer campo al abrir (en "Cancelar" en la confirmación) y de vuelta en su botón al cerrar. Comparativa en `pulido-visual/8.3-ficha-cliente-celular.jpg`. E2E `hu-23` (datos y vehículos en modales: errores, foco, lectura después de guardar, lo guardado al volver a abrir; desactivar desde "Más" y reactivar), `hu-32` (agendada, sin "Debe"; entregada con saldo, "Debe 300 Bs"; sin Pagos, ni saldos ni deuda), `hu-24`, `hu-33` y `hu-38`.
- **Revisión del grupo 8 (code-review, 26/10):**
  - "Debe" sumaba también las reservas por venir: ahora cuenta lo entregado sin pagar, como Saldos pendientes. Y se calcula también para quien tiene Pagos sin Agenda.
  - `MasDatos` podía volver a cerrarse solo tras un segundo envío, y quitarle el foco al campo con error: ahora solo se abre, y el foco al abrir es una vez por toque.
  - `CabeceraSeccion` (de `seccion-con-editar.tsx`): la cabecera de Vehículos era una copia de la de `SeccionConEditar`.
  - El comentario y la prueba de `placasEnFila`: pasa adelante las placas que contienen lo buscado, sea o no una placa.
  - Descartados: el foco al cancelar desde "Más" ya vuelve al botón (la E2E lo comprueba); al reactivar, el aviso lo anuncia; "Pagado" y "Saldo" se distinguen por el texto, y lo que debe está en el encabezado; el `conAviso` por render es el patrón de los demás formularios en modal.

### 9.1 Consultas (26/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | "Nueva consulta" | Registrar a alguien que preguntó | Dueño o encargado, varias veces al día | Arriba |
  | Pestañas Abiertas, Confirmadas y Perdidas, con cantidades | Ver qué falta responder o cerrar | Igual | Quedan |
  | Fila: cliente, placa, servicio, estado y días | Abrir la consulta | Igual | La fila de un toque compartida |
  | "Se enfría" (ámbar) | Saber a quién volver a escribir | Lo más importante de la lista | Insignia de aviso, con palabras |
- **Encontrado:**
  - Dos listas distintas (tarjetas en el celular, tabla en la computadora); la misma lista va en la ficha del cliente, lo único que quedaba distinto ahí después de la 8.3.
  - "Se enfría" se veía distinto en cada tamaño (recuadro ámbar en el celular; fondo apenas visible y un reloj en la computadora) y se decía con color e ícono.
  - En Confirmadas y Perdidas, la insignia repetía lo que dice la pestaña; el servicio (lo que quiere el cliente) en gris chico, como la placa.
  - El título sin el encabezado compartido.
- **Cambios** (propuesta aprobada el 26/10):
  - `ListaFilas` en todos los tamaños: el cliente, el servicio en negrita, la placa y hace cuánto en tinta suave. La que se enfría: "9 días sin movimiento" en una insignia de aviso (los días no se repiten abajo). En la propuesta decía "sin respuesta"; se escribió "sin movimiento" porque los días cuentan cualquier movimiento, no solo la respuesta del cliente.
  - El estado solo en Abiertas (Consultó o Cotizado); en la ficha del cliente, siempre, con la placa grande.
  - **`ListaFilas` extendida** (aprobado con la propuesta): muestra el aviso y el estado a la vez, y el estado puede ir en verde o ámbar (`tonoEstado`). En el inicio, una entrega atrasada muestra "Atrasada desde el …" y también "En proceso"; en la ficha del cliente, "Cancelada" es una sola insignia ámbar (antes se armaba como aviso).
  - `EncabezadoPagina` con "Nueva consulta".
- **Verificación:** capturas a 360, 390, 768 y 1280 px de las tres pestañas, del inicio y de dos fichas de cliente; sin desborde. Comparativa en `pulido-visual/9.1-consultas-celular.jpg`. E2E `hu-28` (el aviso con palabras, el estado en Abiertas y no en Perdidas, el orden), `hu-39` (la entrega atrasada con su estado), `hu-24`, `hu-23` y `hu-32`.

### 9.2 Nueva consulta (27/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | Buscador, lista de clientes y "Cliente nuevo" | Elegir de quién es | Dueño o encargado, varias veces al día | Queda, con la fila de Clientes |
  | Cliente elegido y "Cambiar" | Confirmar quién es | Igual | Recuadro de lectura |
  | Vehículo: sus autos u "Otro vehículo" | Elegir cuál | Igual | Queda, la placa grande |
  | Servicio, canal y nota | Lo que preguntó | Igual | Queda |
  | "Registrar consulta" | Guardar | Igual | Fijo abajo en el celular |
- **Encontrado:**
  - La lista para elegir cliente era la vieja de Clientes (tarjetas sueltas, placas en gris); la misma va en "Nueva reserva".
  - El cliente elegido en un recuadro de borde negro grueso con "Cambiar" subrayado, un estilo que no está en otra pantalla.
  - La placa chica en las opciones de vehículo; los títulos de sección y sus acciones sin la cabecera compartida; el título sin el encabezado compartido.
  - "Registrar consulta" al fondo: en el celular, más de una pantalla abajo.
- **Cambios** (propuesta aprobada el 27/10):
  - Elegir cliente con `ListaFilas`, como Clientes (8.1): el nombre, las placas en negrita (hasta tres y "y N más") y el WhatsApp. También en "Nueva reserva".
  - El elegido en un recuadro de lectura, con "Cambiar" sin borde en `CabeceraSeccion` (como "Editar"); con cliente nuevo, "Buscar un cliente registrado". Los dos con su ícono, como "Editar" y "Agregar".
  - La placa grande en las opciones de vehículo; "Registrar consulta" en `PieFormulario`; `EncabezadoPagina`.
  - El canal, sin opción marcada de entrada (como estaba): un valor por defecto que no se cambia sería un dato falso sobre de dónde llegan los clientes. Si el dueño dice que casi todo llega por WhatsApp, se puede marcar de entrada.
- **Verificación:** capturas a 360, 390, 768 y 1280 px de los tres pasos (elegir, elegido y cliente nuevo), de los errores y de "Nueva reserva"; sin desborde. Comparativa en `pulido-visual/9.2-nueva-consulta-celular.jpg`. E2E `hu-24` (la placa en la fila para elegir, el elegido en su recuadro con "Cambiar") y `hu-30`.

### 9.3 Detalle de una consulta (27/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | Nombre, estado y "Escribir por WhatsApp" | Quién es, contactarlo | Dueño o encargado, seguido | Arriba |
  | Cotizar, Agendar o Reabrir (en distintas secciones) | El paso siguiente | Seguido | Al encabezado, uno solo |
  | Datos (cliente, vehículo, servicio, canal, registrada) | Contexto | Seguido | En lectura, sin el nombre repetido |
  | Cotizaciones, PDF, Compartir y Descargar | Mandar o revisar la cotización | Dueño, seguido | Quedan; botones del tamaño estándar |
  | "Corregir (nueva versión)" | Rehacer la cotización | Dueño, a veces | Sin borde en la cabecera de Cotizaciones |
  | Reservas de la consulta | Ir a la reserva | A veces | Fila de un toque |
  | Fotos y videos | Ver y agregar | Seguido | Quedan; la ayuda en una línea |
  | Nota (campo abierto y "Guardar nota") | Leerla; corregirla a veces | Leer seguido | En lectura, con "Editar" en un modal |
  | "Marcar como perdida" | Cerrarla | A veces | Al menú "Más", con su modal |
  | Recuadro "Perdida" con "Reabrir" | Por qué se perdió; reabrir | A veces | Motivo bajo el título; "Reabrir" en el encabezado |
- **Encontrado:**
  - Los botones repartidos: hasta tres rojos a la vista ("Cotizar", "Guardar nota", "Agendar") y el paso siguiente en un lugar distinto según el estado.
  - La nota, un formulario siempre abierto con su botón rojo; "Marcar como perdida" al fondo; la perdida, una sección entera para una línea de motivo.
  - Los botones del PDF de 32 px (Ver PDF, Compartir, Descargar y Generar PDF): el estándar es 44 con el dedo.
  - El nombre repetido en los datos; la placa sin destacar; las reservas como enlaces subrayados sueltos; el título sin el encabezado compartido.
- **Cambios** (propuesta aprobada el 27/10):
  - El paso siguiente, uno solo, en `EncabezadoPagina` (Cotizar, Agendar o Reabrir), con "Escribir por WhatsApp" y `MenuMas` con "Marcar como perdida" (modal); perdida, el motivo bajo el título.
  - Datos en lectura con la placa grande y "Ver ficha del cliente"; "Corregir" en `CabeceraSeccion`; botones del PDF de tamaño estándar (no queda ningún `size="sm"` en el panel); reservas con `ListaFilas`; la nota con `SeccionConEditar`; la ayuda de fotos en una línea.
  - `EstadoConsulta` pasa a `MasConsulta` y `ReabrirConsulta`; `NotaConsulta`, a `FormularioNota`.
- **Revisión del 27/10 (pedido del desarrollador):** el vehículo decía "Compactos, Suzuki Swift" y se leía como una lista de modelos. El tamaño va aparte, con su etiqueta, en las tres pantallas que lo mostraban así: en la consulta, una fila "Tamaño"; en la ficha del cliente y en las opciones de Nueva consulta, el modelo en su línea y "Tamaño: Compactos" debajo. En la misma revisión: una consulta con varios servicios de interés se anotó como pedido 18 (`registro-de-cambios.md`); consulta y cotización siguen separadas (no toda consulta se cotiza, y una consulta tiene varias versiones de cotización que no cambian), pero ya se ven en una sola pantalla.
- **Hallazgo de accesibilidad:** Next 16 deja la página anterior oculta en el documento (para volver atrás al instante). Si tiene un campo con el mismo `id` que la actual, la etiqueta de la actual se asocia al oculto y el lector de pantalla no la anuncia. Pasaba con la nota (Nueva consulta también tiene `id="nota"`): el campo del modal tiene ahora su propio id. Pasa también en el modal "Datos del cliente" después de "Agregar cliente" (desde antes del pulido): propuesta aparte, que `Campo` genere ids únicos.
- **Verificación:** 1.068 px en el celular la abierta (−7 %; la estimación era 900: los datos ocupan más que lo previsto), 1.270 la cotizada. Capturas a 360, 390, 768 y 1280 px de una abierta, una cotizada (se cotizó la consulta 2 de la demo local) y una perdida, del menú "Más" y de los modales; sin desborde. Comparativa en `pulido-visual/9.3-consulta-celular.jpg`. E2E `hu-24` (la nota en un modal), `hu-25` y `hu-28` (perder desde "Más", el motivo bajo el título, reabrir desde el encabezado), `hu-26`, `hu-27`, `hu-30` y `hu-31`.

### 9.4 Cotizar (27/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | Título; cliente, placa y tamaño | Qué se cotiza | Dueño, cada cotización | En el encabezado, en su línea |
  | Líneas de servicio (servicio, precio, sugerido) | Armar la cotización | Igual | Quedan; la primera, con lo que pidió el cliente |
  | Subir, bajar y quitar en cada línea | Ordenar o quitar | Quitar a veces; ordenar casi nunca | Quedan: `EditorLista` es el de Sitio web (pulido 4.4) |
  | Descuento y Subtotal, Descuento y Total | El precio final | Igual | Quedan; el total, también fijo al pie |
  | Adelanto, Válida hasta y "Estimado según fotos" | Condiciones del PDF | Casi siempre como vienen | En su sección, sin ayudas de más |
  | Fotos para el PDF | Elegir hasta 4 | Con fotos en la consulta | Queda |
  | "Guardar y generar PDF" | Enviar | Igual | Fijo abajo en el celular, con el total |
- **Encontrado:**
  - En el celular, con dos servicios, 1.440 px: el total a mitad de página y el botón al fondo; mientras se cargan los precios, el total no se ve.
  - La sección "Total" mezclaba el precio con las condiciones (adelanto, validez y estimado).
  - Ayudas que repetían lo obvio: "El de Configuración; se puede cambiar…", "Sugerida con los días de Configuración", "En bolivianos" y "Los precios sugeridos son los del catálogo para…".
  - Siempre arrancaba sin líneas, aunque la consulta dijera qué servicio quiere el cliente.
  - El encabezado no era el compartido.
- **Cambios** (propuesta aprobada el 27/10):
  - El total y el botón en `PieFormulario`: fijos abajo en el celular, al pie en la computadora. El total del pie no se anuncia (`aria-hidden`): ya lo anuncia el resumen.
  - Dos secciones: Total (descuento y resumen) y Condiciones (adelanto y validez lado a lado, y el estimado). Se van las cuatro ayudas; queda "Opcional." en el descuento y la del estimado (qué cambia en el PDF).
  - Una cotización nueva arranca con el servicio de interés de la consulta: con una sola variante, elegida y con su precio; con varias, una línea para elegir cuál; sin servicio, vacía. Función pura `lineasDelServicioDeInteres`, con prueba unitaria. Corregir arranca, como antes, con las líneas de la versión anterior.
  - `EncabezadoPagina` con "Cliente, placa (tamaño)".
- **Revisión del 27/10 (pedido del desarrollador):** el menú de servicios tenía guiones largos ("Pulido y nano cerámico — 2 años", un rasgo de texto generado) y no distinguía los servicios con opciones: todo en un menú, con el nombre repetido en cada opción y cortado al cerrarlo.
  - **Dos menús:** primero el servicio (uno por renglón); si tiene varias opciones, al lado (debajo en el celular) el menú "Opción". Componente nuevo `ElegirServicio`, compartido por las líneas de la cotización y de la reserva directa, y por los adicionales de una orden (grupo 11): lo resuelto en una pantalla se resuelve igual en las demás. Regla pura `serviciosConOpciones`.
  - Sin la opción elegida, el error lo dice ("Elige la opción.") y va a ese menú. El esquema de una línea (`lineaServicio`) es uno solo para la cotización y la reserva (la reserva tenía una copia).
  - La cotización que arranca con un servicio de varias opciones ya trae el servicio elegido: falta solo la opción.
  - **Sin guion largo:** "Pulido y nano cerámico (2 años)" (`descripcionLinea`), en el panel, la cotización, su PDF, la reserva y los adicionales. Las ya guardadas no cambian. También el nombre de la app instalada ("TocTar Detailing: Panel") y el resumen sin descuento ("Sin descuento" en lugar de "—").
  - Capturas con pantalla táctil y la ventana agrandada (la regla de capturas del celular, ver "Estándares").
- **Verificación:** con dos servicios, 1.441 px en el celular, igual que antes (la estimación era 1.250: la sección Condiciones suma su título), pero el total y el botón quedan siempre a la vista. Capturas a 360, 390, 768 y 1280 px con una línea precargada, con dos servicios y al corregir; sin desborde. En la base local se cotizó también la consulta 1 de la demo (al capturar los errores, el formulario estaba completo) y se crearon las consultas 4 y 5 (una con un servicio de una variante y otra con el nano cerámico). Comparativa en `pulido-visual/9.4-cotizar-celular.jpg`. E2E `hu-25` (la primera línea según el servicio de interés, el total al pie), `hu-26`, `hu-27` y `hu-30` (la reserva directa usa las mismas líneas).

### 9.5 PDF de la cotización (27/10/2026)
- **Revisión** (skill `pdf`): los dos PDF de la base local y los de la prueba unitaria, como imagen en A4, en blanco y negro y a 390 px de ancho (el celular, sin zoom).
- **Lo que ya estaba bien:** una hoja A4 limpia en el orden de lectura; el total en la banda negra con el corte a 60° (en blanco y negro sigue siendo lo más visible; en el celular se lee sin zoom); montos con dos decimales y separador de miles; las fuentes incrustadas; el rojo solo en piezas grandes.
- **Encontrado:**
  - El logo con 14 mm de alto fijo: el que subió el dueño en Configuración es casi cuadrado y con lema, y quedaba de 14 × 14 mm con el lema ilegible (la marca pide la variante sin lema en tamaños chicos; la del PDF, cuando no hay uno subido, ya lo es).
  - El vehículo como en el panel antes de la 9.3: "Suzuki Swift, Plata" y "Compactos" sin etiqueta.
  - El cuerpo en 9,5 pt, chico en el celular, con un tercio de la hoja libre.
  - "Fecha" y "Válida hasta" pegados al título (2 mm).
- **Cambios** (propuesta aprobada el 27/10):
  - El logo según su forma: horizontal, 14 mm de alto (hasta 70 mm de ancho); casi cuadrado o vertical, 24 mm.
  - "Tamaño: …" con su etiqueta, en tinta suave, debajo del modelo.
  - El cuerpo en 10,5 pt (etiquetas, encabezado, secciones, banda del total y pie en proporción); la columna de precios y los totales un poco más anchos.
  - 4 mm entre el título y las fechas.
  - Las cotizaciones ya enviadas no cambian (RN-02): los cambios valen para las nuevas y para las versiones nuevas.
  - Para el grupo 13 (Configuración): en la ayuda del logo, recomendar el horizontal sin lema para los documentos.
- **Revisión del grupo 9 (code-review, 27/10):**
  - El logo pasaba de 24 a 14 mm de golpe en la proporción 2:1: ahora el alto baja de a poco entre 1,5:1 y 3:1. Un logo vertical **con** lema sigue sin cumplir la marca a ese tamaño (el lema va desde 320 px): no se puede elegir la variante de una imagen que sube el dueño; la prueba usa el vertical sin lema y la ayuda de Configuración lo recomendará (grupo 13).
  - El paso siguiente de la consulta y "Corregir" se calculan una vez, en la página (`corregible`): el encabezado y Cotizaciones no se contradicen.
  - El vehículo (placa, detalle y "Tamaño: …"), un componente compartido: `DatosVehiculo`, en la ficha del cliente y en Nueva consulta.
  - El total del pie de Cotizar, solo en el celular (en la computadora el resumen está justo arriba).
  - Descartados: el `conAviso` por render (el patrón de los demás formularios en modal) y los ids repetidos de los títulos (`cliente-titulo`, `nota-titulo`), que son el mismo caso general de `Campo` y esperan la decisión del desarrollador.
- **Verificación:** con tres servicios y sin fotos, una hoja; con cuatro fotos, la segunda hoja con las fotos; con 20 líneas, varias hojas numeradas. Pruebas unitarias nuevas: tres servicios caben en una hoja, y el logo cuadrado con una versión 2. Comparativa en `pulido-visual/9.5-pdf-cotizacion.jpg` (antes, después y en el celular). E2E `hu-26` (el PDF se genera, se ve y se descarga).

### Repaso de las reglas en los grupos 7 a 9 (27/10/2026)
Pedido del desarrollador: releer las reglas del principio de este documento y corregir lo que no se cumplió.
- **Capturas del celular:** se tomaron sin pantalla táctil y con `fullPage` (la regla pide la emulación táctil y la ventana agrandada; con `fullPage`, además, el pie fijo aparecía a mitad de página). Se repasaron todas las pantallas de los grupos 7 a 9 con pantalla táctil a 360, 390, 768 y 1280 px: nada se sale y ningún botón ni campo mide menos de 44 px (solo el selector de archivos oculto, que se usa con su botón). Las capturas siguientes se toman así.
- **Ramas:** los grupos 7 y 8 se trabajaron en `pulido/grupo-7` y `pulido/grupo-8` (ya unidos); la regla pide `pulido/catalogo`, `pulido/clientes`… El grupo 9 se renombró a `pulido/consultas` (GitHub cerró el PR #101 y siguió en el #102); los siguientes usan los nombres de la regla.
- **Errores en `09-pruebas/criterios-entrega-1.md`:** los de los grupos 7 a 9 se anotaron en su tabla.
- **Textos:** sin guiones largos (—) en lo que ve la gente (revisión del 9.4).
- **Ids únicos (accesibilidad):** `Campo` genera un id único para su etiqueta, error y ayuda, y se lo pasa a su control (`useAtributosDeCampo` en `Input`, `Textarea` y `Selector`). Arregla en todo el panel el caso de la nota (9.3) y del modal "Datos del cliente": Next deja hasta 3 páginas ocultas en el documento y los ids comunes chocaban. Los títulos de sección repetidos (`cliente-titulo`) quedan: dicen lo mismo en las dos páginas.
- **Sin duplicar:** el bloque del vehículo (`DatosVehiculo`) y la validación de una línea de servicio (`lineaServicio`) quedan en un solo lugar.

### 10.1 Agenda (27/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | "Nueva reserva" | Agendar sin un espacio pensado | Dueño o encargado, a diario | Arriba |
  | Semana anterior, siguiente y "Hoy" | Moverse por las semanas | A diario | Queda, en un renglón |
  | Tablero (espacios por días, cintas, "Libre") | Ver lo ocupado y agendar en un hueco | Lo principal | Queda; en la tableta, la vista por día |
  | Pestañas de los días (celular) | Elegir el día | A diario | Quedan |
  | "Martes 27 de octubre, hoy" (celular) | Saber qué día se ve | — | Se va: lo dice la pestaña elegida |
- **Encontrado:**
  - En la tableta (768 px), siete columnas de unos 75 px: las placas se cortaban ("4…", "3…") y "Hoy" se montaba sobre "Mié 28".
  - En el celular, cuatro renglones antes de la primera reserva: las flechas solas, la semana, las pestañas y el día repetido.
  - El título sin el encabezado compartido.
  - Bien y sin cambios: las cintas con el corte a 60° y la placa grande, "Libre, Agendar" punteado, los días cerrados rayados y con su palabra, y todo con texto para el lector de pantalla.
- **Cambios** (propuesta aprobada el 27/10):
  - La grilla de la semana desde 1024 px; hasta ahí, la vista por día (el celular y la tableta, lo mismo).
  - La semana en un renglón entre las flechas: corta en el celular ("26 oct al 1 nov", con el año si cambia: "28 dic al 3 ene 2027"), completa desde 640 px; "Hoy" al final, fuera de la semana actual. Regla pura `textoSemanaCorto`, con prueba unitaria.
  - Sin el renglón del día repetido; `EncabezadoPagina` con "Nueva reserva".
- **Verificación:** capturas con pantalla táctil a 360, 390, 768 y 1280 px de esta semana y de una con cambio de año; nada se sale y ningún control mide menos de 44 px. En el celular el tablero empieza unos 80 px más arriba. Comparativa en `pulido-visual/10.1-agenda.jpg` (celular y tableta). E2E `hu-29` (la pestaña de hoy marcada; moverse de semana y volver con "Hoy"), `hu-30`, `hu-31`, `hu-33` y `hu-38`.

### 10.2 Nueva reserva (27/10/2026)
- **Antes de empezar:** la rama trae los cambios del grupo 9 (#102, sin unir todavía): la reserva directa usa los dos menús de servicio de la 9.4.
- **Inventario:**

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | Cliente y vehículo (o la cotización con sus servicios) | Qué se agenda | Dueño o encargado, cada reserva | Arriba, en lectura |
  | Servicios (directa) | Qué y a qué precio | Dueño o quien ve pagos | Quedan |
  | Ingreso, entrega y espacio | Lo central | Cada reserva | Quedan |
  | Técnico | Asignarlo | Casi siempre | Queda |
  | Hora aproximada y nota | Un detalle del cliente | A veces | Plegados |
  | Adelanto: monto, método y comprobante | Lo que pagó | Casi siempre, con pagos | Queda |
  | "Agendar" | Guardar | Cada reserva | Fijo abajo en el celular |
- **Encontrado:**
  - La pantalla más larga del panel: 2.084 px en el celular la directa y 1.776 desde una cotización, con "Agendar" al fondo.
  - El cliente elegido con el estilo viejo (borde negro grueso, "Cambiar" subrayado) y el vehículo como "2345KLM, Sedanes y hatchbacks medianos" (la confusión de la 9.3).
  - "Elegir vehículo" en tarjetas sueltas, la placa chica y el tamaño sin etiqueta.
  - Ayudas largas o que repetían Configuración; el total de la directa entre los servicios; el mantenimiento en un recuadro sin estilo; el título sin el encabezado compartido.
- **Cambios** (propuesta aprobada el 27/10):
  - Cliente y vehículo en un recuadro de lectura con `CabeceraSeccion` y `DatosVehiculo`; la consulta de la reserva directa y la de la cotización traen marca, modelo, año y color. Desde una cotización, sus servicios en su recuadro, con el total y la línea de que queda aceptada.
  - "Elegir vehículo" con `ListaFilas` (la placa grande, lo que se sepa y "Tamaño: …").
  - Hora y nota en `MasDatos`; sin la ayuda del adelanto y con la de la entrega en una línea.
  - "Agendar" en `PieFormulario`, con el total de la directa al lado.
  - El mantenimiento, en una línea con su vencimiento en una insignia (de aviso si venció). En la propuesta decía `AvisoEnPagina`, pero ese componente es la confirmación de algo recién creado (ícono de éxito y anuncio al lector de pantalla): la insignia es lo que usa el panel para un dato que pide atención.
  - `EncabezadoPagina`; `CabeceraSeccion` acepta no tener acción.
- **Verificación:** con pantalla táctil a 360, 390, 768 y 1280 px, los cinco caminos (desde una cotización, elegir cliente, elegir vehículo, directa y desde un mantenimiento): nada se sale; bajo 44 px solo el selector oculto del comprobante. La directa, 1.943 px en el celular (−7 %; la estimación era 1.750) y la de cotización, 1.806 (+2 %: la cotización tiene su propio recuadro); lo que se gana es "Agendar" siempre a mano y la pantalla igual al resto. Comparativa en `pulido-visual/10.2-nueva-reserva-celular.jpg`. E2E `hu-30` (la hora plegada y su foco al abrirla, la cotización con su total), `hu-38` (el mantenimiento con su insignia), `hu-29`, `hu-31`, `hu-32` y `hu-33`.

### 10.3 Reserva (27/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | Placa, estado y WhatsApp | Qué reserva es, contactar | Dueño o encargado, seguido | Arriba |
  | "Recibir vehículo" (el día de ingreso) | El paso siguiente | Una vez por reserva | Al encabezado |
  | Reprogramar y Cancelar reserva (formularios en la página) | Mover o cancelar | A veces y rara vez | A "Más", con modales |
  | Datos (fechas, espacio, técnico, cliente, vehículo, consulta, agendada) | Contexto | Seguido | En lectura, sin la placa repetida |
  | Servicios, total, pagado y saldo | Cuánto falta | Seguido, con pagos | Quedan |
  | Pagos y "Registrar pago" | Cobrar | Seguido | Quedan; "Registrar pago" sin fondo, con su modal |
  | "Esta reserva ya es una orden" (aviso de éxito) | Ir a la orden | Ya recibida | "Ver la orden" en el encabezado |
  | Recuadro "Cancelada: motivo" | Por qué | Cancelada | Una línea bajo el título |
- **Encontrado:**
  - Dos rojos compitiendo ("Recibir vehículo" y "Registrar pago"); "Reprogramar" y "Cancelar reserva" siempre a la vista, y sus formularios empujaban la página.
  - Enlaces de menos de 44 px: el nombre del cliente, "Ver la orden" y la cotización.
  - "Ya es una orden" con el aviso de éxito (es para lo recién creado); el vehículo repetía la placa del título y su tamaño sin etiqueta; el título sin el encabezado compartido.
- **Cambios** (propuesta aprobada el 27/10):
  - El paso siguiente, uno solo, en `EncabezadoPagina`: "Recibir vehículo" o "Ver la orden"; con "Escribir por WhatsApp" y `MenuMas` ("Reprogramar", "Cancelar reserva") con sus modales (`MasReserva`). Cancelar empieza con el foco en el motivo, que es obligatorio (un Enter ahí escribe, no confirma), y su botón para cerrar dice "Volver" (`CancelarModal` acepta "Volver"); en la propuesta decía el foco en "Volver".
  - Cancelada, el motivo bajo el título. Datos: el vehículo con su modelo y "Tamaño: …" (la consulta de la reserva trae año y color); el cliente como texto; "Ver ficha del cliente" y "Ver la cotización …" de 44 px.
  - **"Registrar pago"** (`RegistrarPago`) se abre en un modal; en la cabecera de Pagos va sin fondo (`seccion`). El bloque de servicios y pagos (`MontosTrabajo`) lo comparte la orden (grupo 11), que cambia igual; en Saldos pendientes (grupo 12) el botón sigue rojo, ya con el modal.
- **Revisión del grupo 10 (code-review, 27/10):**
  - Lo que se sabe del vehículo (marca y modelo, año, color) estaba armado en cuatro lugares: una regla, `detalleVehiculo` (`clientes/reglas.ts`, con prueba unitaria), en la ficha del cliente, Nueva consulta, Nueva reserva y la reserva.
  - "Cambiar" (Nueva reserva) volvía a elegir sin el día y el espacio que llegaron del tablero, y aparecía al agendar un mantenimiento (cambiar de cliente perdía el recordatorio): ahora los conserva y, con un mantenimiento, no se ofrece. Ya pasaba antes del pulido.
  - Reprogramar o cancelar solo navega si hay que quitar "?agendada=1"; `datosDirecta` no copia dos veces el vehículo elegido.
  - Descartados: el foco al cerrar un modal cuyo botón desaparece (pagar todo el saldo, cancelar), como "Reactivar" en el grupo 8 (el aviso lo anuncia); los ids de título repetidos, el caso ya documentado; y el motivo de cancelación en tinta suave, como el de la consulta perdida (9.3), con la insignia "Cancelada" en aviso.
- **Verificación:** con pantalla táctil a 360, 390, 768 y 1280 px (agendada para hoy, a futuro, ya orden, "Más", los dos modales y el de registrar pago): nada se sale y ningún control mide menos de 44 px. Comparativa en `pulido-visual/10.3-reserva-celular.jpg`. E2E `hu-31` (reprogramar y cancelar desde "Más"), `hu-32` (registrar y anular pagos), `hu-33` (recibir y "Ver la orden" desde el encabezado), `hu-36`, `hu-37` y `hu-38`.

### 11.1 Órdenes (27/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | "Órdenes" o "Mis órdenes" | Saber dónde está | — | Queda, con `EncabezadoPagina` |
  | Pestañas Todas, Recibidas, En proceso y Listas | Filtrar por estado | Dueño o encargado, a diario | Se van: la lista se agrupa por estado |
  | Tarjetas (placa, estado, aviso, servicios, cliente, técnico y entrega) | Abrir la orden | Todos, varias veces al día | Quedan, como filas de `ListaFilas` |
  | Insignia del estado en cada tarjeta | Saber en qué va | — | Se va: lo dice el grupo |
  | "Atrasada" y "Sin avisar" | Lo que pide atención | — | Quedan, como aviso |
- **Encontrado:**
  - En el celular (390 px) las pestañas no cabían: "Listas (1)" quedaba cortada.
  - Las pestañas escondían órdenes que son pocas a la vez (las que caben en los espacios del taller).
  - Tarjetas propias, distintas de las listas del resto del panel, y con las insignias en lugares distintos según el largo de la placa; en la computadora ocupaban dos tercios del ancho.
  - Sin `EncabezadoPagina` ni `EstadoVacio`.
  - "Pulido y nano cerámico — 5 años": los datos de demostración armaban la descripción con el formato viejo (`scripts/datos-demo.mjs`). Las órdenes del panel ya usan "Servicio (opción)" (9.4).
- **Cambios** (propuesta aprobada el 27/10):
  - Tres grupos en el orden del taller, Recibidas, En proceso y Listas, cada uno con su título y su cantidad ("Ninguna." si está vacío). Desde 1024 px, una columna por grupo, como un tablero; más angosto, uno debajo del otro. El técnico ve lo mismo con sus órdenes.
  - Cada orden es una fila de `ListaFilas`: la placa grande, "Atrasada" o "Sin avisar" como aviso (no se dan juntas), "Entrega hoy" o "Entrega aproximada: 26/10/2026" en negrita, y los servicios y el cliente (con el técnico, para el dueño y el encargado) en tinta suave.
  - `EncabezadoPagina` y `EstadoVacio`. Los datos de demostración escriben "Servicio (opción)"; los que ya están en una base no cambian hasta volver a cargarlos.
- **Verificación:** capturas con pantalla táctil a 360, 390, 768 y 1280 px; nada se sale y ningún control mide menos de 44 px. Comparativa en `pulido-visual/11.1-ordenes-celular.jpg`. E2E `hu-33` (Mis órdenes del técnico y la de otro técnico vacía) y `hu-34` (la orden en su grupo, con el conteo).

### 11.2 Orden (27/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Quién y cada cuánto | Decisión |
  |---|---|---|---|
  | Placa, estado, "Atrasada" y WhatsApp | Qué orden es, contactar | Todos, siempre | Arriba, con `EncabezadoPagina` |
  | Pasos y el botón grande del paso siguiente | Avanzar la orden | El técnico, a diario | Quedan |
  | "Volver a recibida" o "Volver a en proceso" | Deshacer un toque sin querer | Rara vez | A "Más", con confirmación |
  | "Extender entrega" (formulario en la página) | Mover la fecha | Dueño o encargado, rara vez | A "Más", en un modal |
  | Avisar por WhatsApp y "Entregar vehículo" | El paso siguiente de una lista | Dueño o encargado | Un solo rojo: el que toca ahora |
  | Datos (con la placa repetida y el tamaño sin etiqueta) | Contexto | Seguido | Como la reserva (10.3) |
  | Fotos en cuatro etapas | Subir y ver fotos | El técnico, a diario | Las vacías, en una fila |
  | Avances y la historia | Anotar y ver el trabajo | Todos | Quedan |
  | Servicios, montos y pagos | Cobrar, sumar adicionales | Dueño o encargado con Pagos | Quedan; en la computadora, a la derecha |
  | "Entregado el…" en un recuadro | Cuándo y quién | Ya entregada | Una línea bajo el título |
- **Encontrado:**
  - Una lista no tenía ningún botón rojo ya avisada ("Volver a avisar" y "Entregar vehículo" en contorno), y sin avisar el rojo era el aviso y la entrega quedaba igual de visible.
  - "Extender entrega" y "Volver a…" siempre a la vista; extender abría su formulario dentro de la página.
  - Cada etapa de fotos vacía ocupaba unos 190 px (la casilla de la cámara y "Elegir de la galería"); una entregada sin fotos mostraba cuatro líneas "Sin fotos de…".
  - Los datos repetían la placa, el tamaño iba sin etiqueta y el nombre del cliente y "Ver la reserva" eran enlaces de menos de 44 px.
  - En la computadora, la columna derecha quedaba vacía bajo los datos y los montos al final de la izquierda.
- **Cambios** (propuesta aprobada el 27/10):
  - `EncabezadoPagina` con la placa, el estado, "Atrasada", "Escribir por WhatsApp" y `MenuMas` (`MasOrden`, `acciones-orden.tsx`): "Extender entrega" en un modal (`ExtenderEntrega` ya es solo el formulario, con `PieModal`) y "Volver a…" con su confirmación ("Sí, volver a en proceso", el foco en "Cancelar"; si ya se avisó, dice que el aviso se borra). El técnico ve "Más" con "Volver a…", porque es quien trabaja la orden. Entregada, "Entregado el… por…" (y el saldo autorizado, con Pagos) bajo el título.
  - Lista: sin avisar, "Avisar por WhatsApp" en rojo y "Entregar vehículo" en contorno; avisada, "Entregar vehículo" en rojo y "Volver a avisar" en contorno. En la propuesta decía la entrega siempre en rojo: así el rojo sigue siendo el paso que toca.
  - Datos como en la reserva: la entrega primero ("Hoy" o la fecha, aproximada), espacio, técnico, ingreso, cliente con su teléfono (no para el técnico) y el vehículo con su modelo (`detalleVehiculo`) y "Tamaño: …"; "Ver ficha del cliente" y "Ver la reserva" de 44 px.
  - Fotos: una etapa vacía muestra "Tomar foto" y "Elegir de la galería" en una fila (`FotosOrden` con `compacta`); con fotos, la grilla y la casilla de la cámara, como antes. Cerrada y sin fotos, una línea: "Sin fotos.". Recibir (11.3) sigue con la casilla.
  - Desde 1024 px, el trabajo a la izquierda (cómo llegó, fotos y avances) y los datos y montos a la derecha; en el celular, datos, trabajo y montos.
- **Verificación:** con pantalla táctil a 360, 390, 768 y 1280 px (en proceso y atrasada, lista y avisada, entregada; el menú "Más" y sus dos modales): nada se sale y ningún control mide menos de 44 px (las entradas de archivo ocultas no cuentan). En el celular, la orden en proceso pasa de 2.802 a 2.464 px. Comparativa en `pulido-visual/11.2-orden-celular.jpg`. E2E `hu-33`, `hu-34` (volver a en proceso y extender desde "Más"), `hu-35`, `hu-36`, `hu-37`, `hu-41` y `flujo-taller-completo`.

### 11.3 Recibir vehículo (27/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Decisión |
  |---|---|---|
  | "Recibir 2345KLM", el cliente y el tamaño sin etiqueta | Confirmar que es el auto correcto | `EncabezadoPagina` con el cliente y el vehículo en una línea |
  | Servicios (título y lista) | Saber qué se le hace | En una línea |
  | Fotos de ingreso: la casilla "Tomar foto" y "Elegir de la galería" | Lo primero, de pie junto al auto | Queda: aquí la casilla grande es la tarea |
  | Observaciones y técnico | Anotar y asignar | Quedan |
  | "Recibir vehículo" o "Recibir sin fotos" | Terminar el paso | Con `PieFormulario` |
- **Encontrado:**
  - En el celular, "Recibir vehículo" quedaba al final y tapado por el teclado mientras se escribían las observaciones (Nueva reserva y Cotizar ya lo tienen fijo abajo).
  - El vehículo, solo por su tamaño y sin etiqueta: ni modelo ni color para confirmar que es el auto.
  - Un título y una lista con viñetas para uno o dos servicios; el título sin el encabezado compartido.
  - Bien y sin cambios: el orden del paso (fotos, observaciones, técnico), el aviso sin fotos con el segundo toque, el técnico de la reserva ya elegido y que el técnico no entre.
- **Cambios** (propuesta aprobada el 27/10):
  - `EncabezadoPagina` con "Carlos Fernández, Toyota Corolla 2019 Blanco (tamaño: …)" (`detalleVehiculo`); "Servicios: …" en una línea, separados por coma.
  - El botón en `PieFormulario`: fijo abajo en el celular, al pie desde 640 px; el aviso sin fotos, justo encima.
  - La ayuda de las fotos, más corta: "Todo el vehículo y cada detalle. Después de recibirlo ya no se quitan."
- **Verificación:** con pantalla táctil a 360, 390, 768 y 1280 px, sin fotos y con el aviso de recibir sin fotos: nada se sale y ningún control mide menos de 44 px (las entradas de archivo ocultas no cuentan). Comparativa en `pulido-visual/11.3-recibir-celular.jpg`. E2E `hu-33`.

### 11.4 Entregar vehículo (27/10/2026)
- **Inventario:**

  | Qué hay | Tarea | Decisión |
  |---|---|---|
  | "Entregar 5678JKR" y el cliente | Confirmar que es el auto | `EncabezadoPagina` con el cliente y el vehículo |
  | Servicios, total, pagado y saldo | Cuánto falta | Quedan, con los montos alineados |
  | "Registrar pago" sin fondo en la cabecera de Pagos | Cobrar el saldo: lo primero | "Falta cobrar" con "Registrar pago" al pie de los pagos |
  | Casilla "Entregar con saldo pendiente" | La excepción | Queda, después del cobro |
  | Aviso del mantenimiento | Saber que se programa | Queda |
  | "Entregar vehículo" | Terminar | Con `PieFormulario` |
- **Encontrado:**
  - Con saldo, lo más visible era la casilla con borde de aviso y el botón rojo: la pantalla empujaba a entregar sin cobrar, y "Registrar pago" era un texto chico en la cabecera de Pagos.
  - Total, pagado y saldo terminaban a la mitad (`max-w-sm` en `MontosTrabajo`) y no en la columna de los precios; pasaba igual en la reserva.
  - El título sin el encabezado compartido y solo con el cliente; el botón no quedaba fijo abajo en el celular.
  - El visor del comprobante (pendiente de 10.3 y 11.4) se revisó en el código, sin datos de demostración con foto: es el mismo diálogo del visor de fotos, con su título y la miniatura de 44 px con nombre. Sin cambios.
- **Cambios** (propuesta aprobada el 27/10):
  - `MontosTrabajo` con `cobrar`: con saldo, al pie de los pagos "Falta cobrar 200 Bs" y "Registrar pago" con borde (el mismo modal); la cabecera ya no lo repite. Al cobrar todo, "Pagado por completo.". `RegistrarPago` recibe `variante` (rojo en Saldos pendientes, sin fondo en la cabecera de una sección, con borde aquí) en lugar de `seccion`.
  - Total, pagado y saldo a todo el ancho, alineados con los precios (`px-3`, como las filas de servicios): en la entrega, la reserva y la orden.
  - `EncabezadoPagina` con "Rodrigo Mendoza, Hyundai Tucson 2022 Azul" (`detalleVehiculo`) y el botón en `PieFormulario`.
- **Verificación:** con pantalla táctil a 360, 390, 768 y 1280 px (entregar con saldo, la reserva y la orden con los montos nuevos): nada se sale y ningún control mide menos de 44 px. Comparativa en `pulido-visual/11.4-entregar-celular.jpg`. E2E `hu-31`, `hu-32`, `hu-36`, `hu-37`, `hu-38` y `flujo-taller-completo`.

### Revisión del grupo 11 (code-review, 27/10/2026)
- **Corregido:**
  - La lista decía "Entrega 26/10/2026" y perdía "aproximada", que la orden sí dice: vuelve a "Entrega aproximada: …".
  - El técnico, en una orden recibida, tenía un contenedor de acciones vacío en el encabezado ("Más" sin nada que ofrecer): ahora no se muestra.
  - `hu-35` seguía entrando a `?estado=listo`, que ya no existe: busca la orden en el grupo "Listas".
  - El error del modal "Volver a…" queda asociado a su botón (`aria-describedby`).
- **Descartado:**
  - Que los montos alineados cambien también la reserva: fue parte de la propuesta 11.4.
  - Unificar la línea del encabezado de Recibir y Entregar: Recibir muestra el tamaño a propósito (es lo que se cotizó y se revisa al recibir); al entregar no hace falta.
  - Que `ExtenderEntrega` dependa del modal: ya lo dice su comentario y solo se usa ahí.
- **Verificación:** E2E completa (326 de 326) antes de estos cambios, y `hu-33`, `hu-34` y `hu-35` después.

<!-- Plantilla:
### X.Y Nombre (fecha)
- **Encontrado:**
- **Cambios:**
- **Descartado o pendiente:**
- **Verificación:** capturas, pruebas, Lighthouse.
-->
