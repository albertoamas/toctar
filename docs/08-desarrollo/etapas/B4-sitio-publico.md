# B4 Sitio público — especificación

- **Fase y semana:** B. Entrega 1 · semana 2 (21 al 27 de octubre; se adelanta desde el 14)
- **Estado:** aprobada para programar (14 de octubre de 2026)
- **Historias:** HU-10 Portada · HU-11 Página de cada servicio · HU-12 Galería pública · HU-13 Nosotros y preguntas frecuentes · HU-14 Contacto y mapa · HU-15 Botón de WhatsApp
- **Base:**
  - Requisitos: RF-01 a RF-06, RF-08 y RF-09 (título y descripción de cada página; el mapa del sitio y los datos para Google van en B5).
  - Requisitos no funcionales: RNF-01 (desde 360 px), RNF-02 (Lighthouse móvil ≥ 90), RNF-14 (texto alternativo y contraste).
  - Regla: RN-10 (sin precios ni testimonios).
  - Datos: lo que se carga en B2 (negocio) y B3 (servicios, textos, preguntas y galería).
  - Diseño: Design System (`EncabezadoSitio`, `Cover`, `TarjetaServicio`, `Boton`, `BotonWhatsApp`, `Lema`, `LineaLed`).

## 1. Objetivo

Un visitante entiende qué hace TocTar, ve trabajos reales, resuelve sus dudas y escribe por WhatsApp desde cualquier página. Todo lo que ve lo cargó el dueño en el panel, y cada cambio se ve sin volver a desplegar.

## 2. Alcance

**Incluye:**
- **Páginas:** portada, servicios, página de cada servicio, galería, nosotros, preguntas frecuentes y contacto.
- **Botón de WhatsApp** fijo en todas las páginas del sitio. En la página de un servicio, el mensaje ya lleva el nombre del servicio.
- **Lecturas en caché por etiqueta**, invalidadas por las acciones del panel:
  - `negocio` (B2), `servicios`, `contenido` y `galeria` (B3).
  - La galería y la página de un servicio también dependen de `servicios`: si cambia el nombre de un servicio, se actualizan.
- **Título y descripción de cada página** para Google y para compartir por WhatsApp.
- **Página "no encontrada"** con la marca.
- **Imagen de reemplazo** para los servicios sin foto (decisión del 14/10).

**No incluye:**
- **Mapa del sitio, `robots.txt` y datos del negocio local para Google:** van en B5 (HU-17).
- **Formulario de reclamo:** va en B5 (HU-16).
- **Videos:** el dueño los publica en sus redes.
- **Fotos principales reales:** cuando lleguen, el dueño las sube desde el panel. Mientras tanto se usa la imagen de reemplazo.

## 3. Reglas que se cumplen

| Regla | Qué dice | Dónde se garantiza |
|---|---|---|
| RN-10 | Sin precios ni testimonios | Las tablas del sitio no tienen precios (B3). E2E: ninguna página pública contiene "Bs" |
| RF-03 | Cada servicio **activo** tiene su página, sin precios | `/servicios/[slug]` solo para servicios visibles; uno oculto da "no encontrada" |
| RF-04 | Galería filtrable por servicio | `/galeria?servicio=<slug>`; solo fotos visibles de servicios visibles |
| RF-05 | Preguntas frecuentes | `/preguntas-frecuentes`, solo las visibles, en su orden; se abren de a una (`<details>`) |
| RF-06 | Dirección con mapa, horarios, WhatsApp, correo y redes | `/contacto`. La dirección enlaza a Google Maps: en el celular abre la app de mapas |
| RF-08, HU-15 | Botón de WhatsApp en todas las páginas, con el servicio escrito | Botón fijo del layout del sitio; la página de servicio pasa su propio mensaje. Si no hay número cargado, no se muestra |
| RF-09 (parte) | Título, descripción y URL legible | `generateMetadata` por página; los servicios usan su slug y su resumen |
| RNF-02 | Lighthouse móvil ≥ 90 | Sin JavaScript extra en el sitio salvo el visor de la galería. Miniaturas de 640 px, `loading="lazy"`, ancho y alto en cada imagen, mapa embebido diferido |
| RNF-14 | Texto alternativo y contraste | Fotos con su descripción o el nombre del servicio; tokens de color verificados (B2) |

**Pruebas de punta a punta:** el WhatsApp del negocio se carga por el panel en un paso previo (`tests/e2e/preparar.setup.ts`), para que la caché del sitio se actualice como en el uso real.

**Cómo se leen los datos:**
- El build no tiene base de datos. Las partes con datos van dentro de `<Suspense>`, llaman a `connection()` y leen con funciones `'use cache'` con `cacheTag`.
- La estructura de cada página (encabezado y títulos fijos) se genera en el build. Los datos salen de la caché en memoria y se renuevan cuando el panel guarda.

## 4. Datos

Sin tablas nuevas. Las lecturas públicas van en `src/modulos/sitio/publico.ts` (todas con `'use cache'`, `cacheLife("max")` y sus etiquetas):

| Función | Devuelve | Etiquetas |
|---|---|---|
| `serviciosPublicos()` | Servicios visibles en orden: nombre, slug, resumen, foto | `servicios` |
| `servicioPublico(slug)` | Un servicio visible con descripción, beneficios, pasos, variantes activas y sus fotos de galería visibles. Si la única variante es "Única" (servicio sin opciones, D-2), no se muestran variantes | `servicios`, `galeria` |
| `contenidoPublico(pagina)` | Los textos de la página | `contenido` |
| `preguntasPublicas()` | Preguntas visibles en orden | `contenido` |
| `galeriaPublica()` | Fotos visibles de servicios visibles, con el nombre y el slug del servicio | `galeria`, `servicios` |

Lo del negocio (dirección, horario, WhatsApp, redes) ya está en `obtenerDatosPublicos()` (B2, etiqueta `negocio`).

## 5. Pantallas y rutas

Todas en `src/app/(sitio)/`, en tema oscuro, desde 360 px. El encabezado (`EncabezadoSitio`) enlaza a Servicios, Galería, Nosotros y Contacto; el pie suma Preguntas frecuentes.

| Ruta | Contenido |
|---|---|
| `/` | **Portada (HU-10):** arte de marca (`Cover`: losas y franjas a 60°), lema como titular, presentación y botón principal "Escribir por WhatsApp". Línea LED que se enciende una vez. Servicios en tarjetas (`TarjetaServicio`; los primeros 6). Hasta 6 fotos de la galería con un enlace "Ver la galería". Cierre con invitación a escribir |
| `/servicios` | Todos los servicios visibles en tarjetas |
| `/servicios/[slug]` | **Servicio (HU-11):** foto principal o la imagen de reemplazo, nombre (`titular-hero`), resumen y descripción; beneficios; proceso paso a paso numerado; variantes (nombre y descripción, sin precio); fotos de ese servicio; cierre "Consultar por este servicio" (WhatsApp con el servicio escrito) |
| `/galeria` | **Galería (HU-12):** filtro por servicio (enlaces, funcionan sin JavaScript) y grilla de miniaturas. Al tocar una foto se abre un visor con el antes y el después en grande. Si no hay fotos: "Pronto vas a ver aquí nuestros trabajos." |
| `/nosotros` | **Nosotros (HU-13):** historia, cómo trabajamos, por qué elegirnos y un enlace a las preguntas frecuentes |
| `/preguntas-frecuentes` | **Preguntas (HU-13):** cada pregunta se abre y se cierra (`<details>`); al final, la invitación a escribir |
| `/contacto` | **Contacto (HU-14):** texto de bienvenida, dirección (enlace a Google Maps), mapa embebido diferido, horario, WhatsApp, correo y redes |
| No encontrada | Monograma, "No encontramos esta página" y enlaces a la portada y a los servicios |

**Botón de WhatsApp:** fijo abajo a la derecha (`tt-whatsapp--fijo`), con `aria-label="Escribir a TocTar por WhatsApp"`.
- **Mensaje general:** "Hola, quiero consultar por un servicio."
- **En la página de un servicio:** "Hola, quiero consultar por <servicio>."

## 6. Acciones del servidor

Ninguna nueva. Las acciones del panel (B2 y B3) ya invalidan las etiquetas que leen estas páginas.

## 7. Componentes y diseño

- **Componentes nuevos** en `src/componentes/sitio/`, siguiendo el Design System:
  - `tarjeta-servicio.tsx`, con la imagen de reemplazo;
  - `boton-whatsapp.tsx`, con el glifo oficial de WhatsApp en una tinta;
  - `portada-arte.tsx`, con el arte de `Cover`;
  - `visor-galeria.tsx`, el único componente de cliente: un diálogo con el antes y el después.
- **Estilos:** las clases del Design System que faltan (`tt-boton`, `tt-tarjeta`, `tt-whatsapp`) se agregan a `globals.css`, con los mismos valores del `bundle.css` publicado.
- **Reglas de marca:**
  - el sitio sin esquinas redondeadas;
  - un solo botón principal por pantalla;
  - la línea LED una o dos veces por página;
  - el monograma grande recortado, como mucho una vez por página.

## 8. Textos de la interfaz

| Lugar | Texto |
|---|---|
| Botón principal | Escribir por WhatsApp |
| Cierre de un servicio | Consultar por este servicio |
| Tarjeta | Ver el servicio |
| Portada, galería | Ver la galería |
| Galería vacía | Pronto vas a ver aquí nuestros trabajos. |
| Filtro | Todos · <servicio> |
| Contacto, mapa | Cómo llegar |
| No encontrada | No encontramos esta página. · Ir al inicio · Ver los servicios |
| Etiquetas de foto | Antes · Después |

## 9. Pruebas

**Unitarias:**
- Mensaje de WhatsApp general y por servicio (codificado).
- Agrupación de la galería por servicio para el filtro.

**De punta a punta** (sobre los datos iniciales de B2 y B3):
1. La portada muestra el lema, los servicios visibles (no los ocultos) y el botón de WhatsApp con el número cargado.
2. La página de un servicio muestra los pasos, los beneficios y las variantes; el botón "Consultar por este servicio" lleva el nombre del servicio en el mensaje. Un servicio oculto da "no encontrada".
3. Galería: el filtro por servicio muestra solo esas fotos; al tocar una se abre el visor.
4. Las preguntas frecuentes se abren y cierran una por una.
5. Contacto: dirección con enlace al mapa, horario y redes.
6. Ninguna página pública muestra "Bs" (RN-10).
7. Un cambio en el panel (el lema de la portada) se ve en el sitio sin volver a desplegar.
8. Cada página tiene su título propio.

**Medición:** Lighthouse móvil sobre la portada, una página de servicio y la galería: 90 o más en rendimiento, accesibilidad y SEO.

## 10. Orden de trabajo

| Rama | Contenido |
|---|---|
| `docs/especificacion-b4` | Esta especificación |
| `hu-10-portada` | Estilos del Design System, `publico.ts`, botón de WhatsApp (HU-15), tarjeta de servicio, portada, `/servicios`, encabezado y pie actualizados, página no encontrada |
| `hu-11-pagina-servicio` | `/servicios/[slug]` |
| `hu-12-galeria-publica` | `/galeria` con filtro y visor |
| `hu-13-14-nosotros-contacto` | `/nosotros`, `/preguntas-frecuentes`, `/contacto` |

## 11. Criterio de salida

- [ ] Las pruebas pasan en celular y en escritorio.
- [ ] Lighthouse móvil ≥ 90 en rendimiento, accesibilidad y SEO (RNF-02, RNF-14).
- [ ] Se ve bien desde 360 px (revisión con capturas).
- [ ] Revisión manual de YankoSoft.
- [ ] **Demo del viernes 23:** el sitio con el contenido cargado. El dueño valida los criterios de HU-01 a HU-18.

## 12. Decisiones abiertas

| Decisión | Propuesta | Quién decide |
|---|---|---|
| Imagen principal de la portada | Arte de marca del Design System (sin foto) hasta tener una foto propia del taller con buena luz | Dueño (demo del 23) |
| Mensaje inicial de WhatsApp | "Hola, quiero consultar por…" | Dueño |
| Mapa embebido o solo el enlace | Embebido y diferido; si Lighthouse baja de 90, solo el enlace | YankoSoft, según la medición |
