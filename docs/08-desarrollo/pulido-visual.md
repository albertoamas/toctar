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
- **Restricción.** La marca ya tiene su recurso fuerte (rojo, corte a 60°, línea LED); se usa con medida. Pulir es quitar ruido antes que agregar decoración.

## Cómo se trabaja cada pantalla

1. **Antes:** capturas en celular (360 y 390 px) y computadora (1280 px). En el panel, también la tableta (768 px).
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
- [ ] Sin código muerto ni duplicado: `npx -y knip@5` no muestra nada nuevo (los avisos ya conocidos están en el registro de la revisión del 16/10).
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
| 1.1 | Encabezado y menú del sitio (con el menú del celular) | ⏳ |
| 1.2 | Pie del sitio | ⏳ |
| 1.3 | Botón fijo de WhatsApp | ⏳ |
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

<!-- Plantilla:
### X.Y Nombre (fecha)
- **Encontrado:**
- **Cambios:**
- **Descartado o pendiente:**
- **Verificación:** capturas, pruebas, Lighthouse.
-->
