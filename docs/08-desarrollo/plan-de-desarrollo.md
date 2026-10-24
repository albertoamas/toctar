# Plan de desarrollo — TocTar Detailing (Web + Gestión)

- **Versión:** 5 · 15 de octubre de 2026 (antes: v4 del 14/10)
- **Base:**
  - Backlog: `05-analisis/historias-de-usuario/historias.md`.
  - Plazos y pagos: `03-cierre-comercial/acuerdo.md`.
  - Tablas: `06-diseno/modelo-de-datos/modelo-de-datos.md`.
  - Pendientes de infraestructura: `07-preparacion/preparacion.md`.
- **Cómo se usa:**
  - Cada etapa tiene un criterio de salida; no se pasa a la siguiente sin cumplirlo.
  - Al cerrar una etapa, se marca aquí y en `flujo-de-trabajo.md`.
  - Si una fecha se mueve, se cambia aquí y se avisa al dueño en la revisión del viernes.

## Qué cambió en la versión 5

- **El desarrollo va más rápido de lo previsto.** El trabajo empezó el 9/10 con la firma y el primer pago (base técnica el 10/10). Apenas llegó el material, el 14/10, B1 a B4 (15 historias, con pruebas y documentación) se programaron en dos días; el plan v4 les daba dos semanas. Lo lento del proyecto fueron las reuniones y la recolección de requisitos, no el código. Los plazos del contrato cuentan desde el 14/10, porque el acuerdo los hace empezar con el pago y el material.
- **El calendario se adelanta una semana** para la Entrega 2 (meta 13/11 en vez de 20/11). **Las fechas del acuerdo no cambian** (3/11 y 1/12): el adelanto queda como margen.
- **No se adelanta más** porque la Entrega 2 tiene las partes más difíciles (PDF, versiones de cotización, agenda sin cruces, ciclo de la orden) y porque necesita uso real del taller y al menos una vuelta de ajustes antes del acta.
- **El adelanto depende del dueño:** la lista de precios y las variantes pasan a pedirse para el viernes 23 (antes, 3/11), y el dominio sigue siendo urgente.
- **Lunes 19:** reunión de avance con el dueño, con una presentación y sin mostrar todavía la app. La primera demo sigue siendo el viernes 23.

## Dónde estamos (24 de octubre)

| Qué | Estado |
|---|---|
| Etapas 1 a 4 (descubrimiento, propuesta, cierre comercial, requerimientos) | ✅ Cerradas |
| Etapa 5 (análisis) | 🟡 Supuestos S-1 a S-5 respondidos; falta que el dueño valide los criterios de las historias |
| Etapa 6 (diseño) | ✅ Modelo de datos, arquitectura e identidad visual |
| Etapa 7 (preparación) | 🟡 Dominio, VPS en Hetzner, Coolify, R2 y respaldos listos (`07-preparacion/servidor.md`). Pruebas en línea en `pruebas.toctardetailing.com`; producción configurada, sin publicar. Falta la reunión con el dueño (sus accesos y su tarjeta) |
| Iteración 0 (cimientos) | ✅ En `develop` (PR #1) |
| Etapa B1 Acceso (HU-01, HU-02, HU-03) | ✅ Cerrada el 14/10, en `develop` (PR #4, #7 y #10) |
| Etapa B2 Configuración y app (HU-04, HU-05, HU-06) | ✅ Programada y probada a mano el 14/10, en `develop` (PR #14, #15 y #16). Falta instalar en celulares (necesita https, A3) y mostrarla en la demo del 23 |
| Etapa B3 Contenido del panel (HU-07, HU-08, HU-09) | ✅ Programada el 14/10 (PR #19, #20 y #21). Falta la revisión manual y mostrarla con B4 |
| Etapa B4 Sitio público (HU-10 a HU-15) | ✅ Programada el 14/10 (PR #23 a #26). Lighthouse móvil ≥ 90. Falta la revisión manual y la demo del 23 |
| Etapa B5 Reclamos y Google (HU-16, HU-17, HU-18) | ✅ Programada el 15/10 (PR #33 a #36). Falta la revisión manual, validar el JSON-LD en Google con https (A3) y que el dueño cree su Perfil de Empresa (`10-lanzamiento/perfil-de-google.md`) |
| Revisión de seguridad y calidad de la Entrega 1 | ✅ 16/10 (PR #40) |
| Pulido visual de la Entrega 1 | ✅ Las 32 pantallas, en `develop` (PR #43 a #48). Registro y comparativas en `pulido-visual.md` |
| Etapa C1 Catálogo y clientes (HU-19 a HU-23) | ✅ Programada el 20/10 (PR #49 a #53). Precios de prueba solo en E2E: falta la lista de precios real del dueño |
| Etapa C2 Consultas y cotizaciones (HU-24 a HU-28) | ✅ Programada el 21/10 (PR #55 a #60). Falta compartir el PDF desde un celular real (necesita https, A3), revisarlo impreso y que el dueño confirme formas de pago, condiciones y garantía |
| Etapa C3 Agenda y pagos (HU-29 a HU-32) | ✅ Programada el 21/10 (PR #61 a #64). Falta mostrarle el tablero al dueño y probar el cobro con comprobante en un celular real |
| Etapa C4 Taller y entrega (HU-33 a HU-38) | ✅ Programada el 23/10 (PR #65 a #72). Los 5 flujos críticos con su prueba E2E. Falta la demo desde un celular real |
| Etapa C5 Cierre de la Entrega 2 | 🔵 Especificación aprobada el 23/10 (PR #73). §0, la reorganización del panel, en `develop` el 24/10 (PR #74): servicios en el catálogo, menú en grupos, Parámetros por tema. Siguen la HU-40, la HU-39 y la HU-41 |
| Datos de demostración | ✅ Scripts `db:reiniciar-local` y `datos:demo` (PR #75): el sitio con fotos y el panel con movimiento de esta semana. Falta cargarlos en pruebas |
| Pulido visual de la Entrega 2 | ⏳ Plan en `pulido-visual.md` (grupos 7 a 13): las pantallas de C1 a C4 y lo que cambió con la reorganización |
| Identidad visual aplicada a la app | ✅ En `develop` (PR #5 y #9, logos nítidos en tamaños chicos) |
| Inicio del trabajo | 9 de octubre de 2026 (firma y primer pago) |
| Día D (inicio del plazo del contrato) | 14 de octubre de 2026 (llegó el material) |

## Calendario

| Semana | Fechas | Fase | Revisión con el dueño |
|---|---|---|---|
| 1 | 14 al 20 de octubre | B1 a B5 ✅ | **Lunes 19**: reunión de avance (presentación, sin demo) |
| 2 | 21 al 27 de octubre | A3 entorno en la nube · B6 contenido real · C1 Catálogo y clientes (si llegaron los precios) | **Viernes 23**: primera demo, la web completa |
| 3 | 28 de octubre al 3 de noviembre | B6 cierre de la Entrega 1 · C2 Consultas y cotizaciones | **Viernes 30**: acta de la Entrega 1 y publicación (límite **3/11**) |
| 4 | 4 al 10 de noviembre | C3 Agenda y pagos · C4 Taller y entrega | **Viernes 6**: demo de cotización con PDF y agenda |
| 5 | 11 al 17 de noviembre | C4 y C5 cierre de la Entrega 2 | **Viernes 13**: ciclo completo y acta de la Entrega 2 (meta) |
| 6 y 7 | 18 de noviembre al 1 de diciembre | Margen: ajustes del uso real, historias deseables (HU-39 a HU-41) | Límite del acuerdo: **1/12** |

| Hito | Fecha límite | Pago al aceptarse |
|---|---|---|
| Entrega 1: Web publicada y aceptada | 3 de noviembre | Bs 700 |
| Entrega 2: Gestión aceptada | 1 de diciembre (meta: 13 de noviembre) | Bs 2.000 |

## Especificación de cada etapa

Este plan es el mapa: fases, fechas y criterios de salida. **El detalle para programar está en una especificación por etapa**, en `08-desarrollo/etapas/`, con la plantilla `_plantilla.md`. Incluye reglas, tablas columna por columna, pantallas, acciones del servidor, textos, pruebas, orden de ramas y decisiones abiertas.

- Cada especificación se escribe **al empezar su etapa**, no antes, para que use lo aprendido en las anteriores.
- No se programa una historia sin la especificación de su etapa.
- Si algo cambia durante la etapa, se corrige primero la especificación.

| Etapa | Especificación | Estado |
|---|---|---|
| B1 Acceso | `etapas/B1-acceso.md` | ✅ Cerrada (14/10) |
| B2 Configuración y app | `etapas/B2-configuracion.md` | ✅ Programada y probada a mano (14/10); falta instalar en celulares con https (A3) y la demo |
| B3 Contenido del panel | `etapas/B3-contenido.md` | ✅ Programada (14/10); falta la revisión manual |
| B4 Sitio público | `etapas/B4-sitio-publico.md` | ✅ Programada (14/10); falta la revisión manual |
| B5 Reclamos y Google | `etapas/B5-reclamos-google.md` | ✅ Programada (15/10, PR #33 a #36). Falta validar el JSON-LD en Google (A3) y la revisión manual |
| C1 Catálogo y clientes | `etapas/C1-catalogo-clientes.md` | ✅ Programada (20/10, PR #49 a #53). Falta cargar los precios reales |
| C2 Consultas y cotizaciones | `etapas/C2-consultas-cotizaciones.md` | ✅ Programada (21/10, PR #55 a #60). Falta la prueba en celulares con https (A3) y los textos del PDF del dueño |
| C3 Agenda y pagos | `etapas/C3-agenda-pagos.md` | ✅ Programada (21/10, PR #61 a #64). Falta mostrarle el tablero al dueño |
| C4 Taller y entrega | `etapas/C4-taller-entrega.md` | ✅ Programada (23/10, PR #65 a #72). Falta la demo desde un celular real |
| C5 Cierre de la Entrega 2 | `etapas/C5-cierre-entrega-2.md` | 🔵 Aprobada (23/10). §0 hecho (24/10, PR #74); sigue la HU-40 |
| B6 | `etapas/B6-…` | Al empezarla |

## Cómo se trabaja cada historia

Una rama `hu-XX-…` por historia, desde `develop`, con commits chicos por tipo (`CLAUDE.md`, "Control de versiones"). En cada una, además de programar:

1. **Documentación vigente.** Antes de usar una librería nueva, o una API que pudo cambiar, se lee su documentación actual con `context7`; para Next.js, `node_modules/next/dist/docs/`. Así no se programa sobre una versión vieja.
2. **Pantallas.** Una pantalla nueva o rediseñada se diseña con la skill `frontend-design`, con la identidad del Design System y el estándar del panel (44 px con pantalla táctil, regla de botones). Se revisan capturas a 360 y 1280 px y nada se sale de la pantalla.
3. **Documentos PDF** (cotización en C2; orden y comprobantes en C4).
   - Su diseño se trabaja con `frontend-design`. La app los genera con `@react-pdf/renderer`.
   - El archivo generado se revisa con la skill `pdf`: texto, tamaño A4, fuentes incrustadas, imágenes y cada página convertida a imagen para mirarla como una captura.
   - Además se revisa a mano: impreso y en el celular.
4. **Verificación.** lint, typecheck, `npm test`, `npm run test:e2e` completo y knip sin hallazgos nuevos.
5. **Revisión antes del PR.**
   - `code-review` sobre el cambio de la rama, siempre.
   - `security-review` cuando la historia toca permisos, sesiones, datos de clientes, archivos, montos o acciones que reciben datos sueltos.
   - La revisión automática del plugin `security-guidance` corre sola al hacer commit y sus avisos se atienden igual.
   - Cada hallazgo se corrige, o el PR explica por qué no aplica.
6. **Pull Request** hacia `develop`, con lo que hace, lo que queda pendiente y la verificación. Se une con squash cuando el desarrollador lo aprueba.

## Resumen de fases

| Fase | Qué cierra | Etapas |
|---|---|---|
| **A. Cimientos y preparación** | Etapas 6 y 7 del flujo: base técnica, identidad e infraestructura | A1 Base técnica ✅ · A2 Identidad visual 🔵 · A3 Entornos en la nube |
| **B. Entrega 1: Web** | Sitio público, panel de contenido, usuarios y configuración, en producción | B1 Acceso · B2 Configuración y app · B3 Contenido del panel · B4 Sitio público · B5 Reclamos y Google · B6 Cierre |
| **C. Entrega 2: Gestión** | Clientes, cotizaciones, agenda, órdenes, pagos y mantenimiento | C1 Catálogo y clientes · C2 Consultas y cotizaciones · C3 Agenda y pagos · C4 Taller y entrega · C5 Cierre |
| **D. Lanzamiento y soporte** | Etapas 10 y 11: uso real, respaldos probados, 3 meses de mantenimiento | D1 Lanzamiento · D2 Soporte |

---

## Fase A. Cimientos y preparación

### A1. Base técnica ✅
- Next.js 16, PostgreSQL 18, Drizzle, RustFS, Docker, shadcn/ui, Vitest, Playwright y layouts (PR #1).
- Repositorio en GitHub con convenciones de ramas, commits y PR (`CLAUDE.md`).

### A2. Identidad visual ✅
- **Entregable:**
  - Design System (https://claude.ai/artifact/FcABnS1tF3WgZMz9v3e5BT).
  - Tokens, tipografías y logos aplicados a la app (rama `identidad-visual`).
- **Criterio de salida:** la rama está unida a `develop`.
- **Queda pendiente, sin bloquear:** el vectorial original del logo del diseñador, y la validación del dueño el viernes 23.

### A3. Entornos en la nube
- **Cuándo:** semana 1, a más tardar el **miércoles 21**, para tener dos días de margen antes de la demo del 23.
- **Necesita del dueño:** ✅ dominio `toctardetailing.com` y datos del titular (recibidos el 15/10).
- **Tareas** (paso a paso en `07-preparacion/guia-de-despliegue.md`):
  1. Instalar `gh` y proteger `main` y `develop` en GitHub.
  2. Contratar el VPS (Hetzner o DigitalOcean, 4 GB: con 2 GB la compilación de dos entornos se queda corta) e instalar Coolify.
  3. Comprar el dominio y apuntar `<dominio>` y `pruebas.<dominio>` al VPS.
  4. En Coolify: `develop` → pruebas y `main` → producción, cada uno con su PostgreSQL 18 y sus variables (`BETTER_AUTH_SECRET` distinto, `DUENO_INICIAL_*`).
  5. Cuenta de Cloudflare a nombre de TocTar: un bucket R2 para fotos y otro para respaldos.
  6. Respaldo diario de PostgreSQL hacia R2, conservando 30 días.
  7. UptimeRobot vigilando `/api/salud`.
- **Entregable:** `pruebas.<dominio>` muestra el último `develop` y el dueño de prueba puede ingresar.
- **Criterio de salida:** un push a `develop` se despliega solo, y `/api/salud` responde 200 en pruebas.

---

## Fase B. Entrega 1: Web (14 de octubre al 3 de noviembre)

**Objetivo:** que el dueño publique y mantenga su sitio sin depender de YankoSoft, y que los clientes lo encuentren y escriban por WhatsApp.

### B1. Acceso (semana 1)

| | |
|---|---|
| Historias | HU-01 Iniciar sesión 🔵 · HU-02 Gestionar usuarios y roles · HU-03 Permisos del encargado |
| Tablas nuevas | `usuario`, `sesion`, `cuenta`, `verificacion` (hechas en HU-01) · `usuario_permiso` |
| Reglas | RN-01 (solo el dueño cotiza), RN-12 (el técnico no ve precios), RN-14 (desactivar, no borrar), S-2 y S-4 (permisos `entrega_con_saldo` y módulo `reclamos`) |
| Clave técnica | `src/lib/permisos.ts`: qué módulo ve cada rol y cada encargado. Toda acción pasa `headers` a `auth.api.*` |
| Pruebas | Unitarias: la matriz de permisos completa. E2E: el dueño crea un técnico y ese técnico entra; un encargado sin el módulo ve "sin acceso" |
| Entregable | El dueño crea usuarios, les asigna rol y módulos, restablece contraseñas y los desactiva |
| Criterio de salida | Ningún rol accede por URL a un módulo que no le corresponde (probado) |

### B2. Configuración y app instalable (semana 1)

| | |
|---|---|
| Historias | HU-04 Datos del negocio · HU-05 Parámetros del sistema · HU-06 App instalable |
| Tablas nuevas | `negocio`, `sucursal`, `parametro`, `tamano_vehiculo` (con `descripcion`), `espacio_taller`, `archivo` |
| Datos iniciales | 5 tamaños de vehículo, 3 espacios del taller, adelanto sugerido Bs 200, validez sugerida, intervalo de mantenimiento de 3 meses (`material-recibido.md`) |
| Clave técnica | Subida del logo a R2/RustFS (`src/lib/almacenamiento.ts`, compresión con `sharp`). Manifest y service worker mínimo; aviso claro sin conexión |
| Material | Dirección, ubicación, WhatsApp, correo y redes (recibidos). **Horario pendiente**: se carga después desde el panel |
| Entregable | Todo dato del negocio y todo parámetro se edita desde el panel. La app se instala en Android y iPhone con el ícono de TocTar |
| Criterio de salida | Ningún valor del negocio fijo en el código (RNF-11). Parámetros vacíos o negativos rechazados |

### B3. Contenido del panel (semana 2)

| | |
|---|---|
| Historias | HU-07 Servicios del sitio · HU-08 Textos del sitio · HU-09 Galería en el panel |
| Tablas nuevas | `servicio` (los campos del sitio; los precios llegan en C1), `variante` (nombre y descripción, para mostrarlas en el sitio; adelantada desde C1), `contenido_pagina`, `faq`, `galeria_item` |
| Clave técnica | Fotos: el lado mayor a 1600 px, WebP y miniatura. Al guardar se regenera solo la página afectada del sitio (Cache Components, `updateTag`) |
| Material | Textos por servicio (pendiente: se cargan con datos de prueba si no llegan). Fotos de antes y después (recibidas). Fotos principales (pendientes: se usa la imagen de reemplazo) |
| Entregable | El dueño crea servicios, edita textos y sube fotos de antes y después |
| Criterio de salida | Un cambio en el panel se ve en el sitio sin volver a desplegar |

### B4. Sitio público (semana 2)

| | |
|---|---|
| Historias | HU-10 Portada · HU-11 Página de cada servicio · HU-12 Galería pública · HU-13 Nosotros y preguntas frecuentes · HU-14 Contacto y mapa · HU-15 Botón de WhatsApp |
| Componentes del Design System | EncabezadoSitio, TarjetaServicio (con imagen de reemplazo), BotonWhatsApp, Lema, LineaLed, botón principal con corte a 60° |
| Reglas | RN-10: sin precios ni testimonios |
| Clave técnica | Páginas pre-generadas, imágenes optimizadas, enlaces `wa.me` armados con el número de HU-04 |
| Entregable | El sitio completo con contenido de prueba o real, en `pruebas.<dominio>` |
| Criterio de salida | Lighthouse móvil ≥ 90 en rendimiento, SEO y accesibilidad (RNF-02, RNF-14). Se ve bien desde 360 px |
| **Demo viernes 23** | Sitio y panel de contenido. **El dueño valida los criterios de HU-01 a HU-18** (los del acta) |

### B5. Reclamos y Google (semana 1)

| | |
|---|---|
| Historias | HU-16 Formulario de reclamo · HU-17 Atender reclamos · HU-18 Sitio preparado para Google |
| Tablas nuevas | `reclamo`, `reclamo_archivo` |
| Clave técnica | Protección contra spam (campo trampa y límite por IP), hasta 3 fotos, `sitemap.xml`, `robots.txt` sin `/panel`, datos de negocio local (JSON-LD) |
| Fuera del software | El dueño da de alta su Perfil de Empresa en Google Maps; YankoSoft lo guía |
| Entregable | Los reclamos llegan al panel, el dueño o el encargado con el módulo los atienden, y el sitio es indexable |
| Criterio de salida | El reclamo de prueba aparece en el inicio del panel (S-4) |

### B6. Cierre de la entrega 1 (semanas 2 y 3, hasta el 3 de noviembre)

0. Pulido visual pantalla por pantalla (`pulido-visual.md`): el sitio antes de la demo del 23, el panel antes del acta del 30.
1. Prueba completa en `pruebas.<dominio>` con la lista de criterios de HU-01 a HU-18. Las correcciones entran por PR.
2. Carga del contenido real: servicios, textos, fotos, datos del negocio y horario.
3. Capacitación del dueño y del encargado: videos cortos (cómo editar un servicio, subir fotos, crear un usuario, atender un reclamo).
4. Demo del viernes 30 y **acta de aceptación** firmada o confirmada por WhatsApp (`09-pruebas/actas-de-aceptacion/entrega-1.md`). Si en 5 días hábiles no hay observaciones, se considera aceptada.
5. Merge de `develop` a `main`, despliegue a producción, etiqueta `v1.0.0`.
6. Cobro de Bs 700. Empieza el mantenimiento incluido (3 meses desde la publicación).

**Criterio de salida de la fase B:** el sitio está publicado en `<dominio>`, el acta está firmada y el pago recibido.

---

## Fase C. Entrega 2: Gestión (21 de octubre al 13 de noviembre; margen hasta el 1 de diciembre)

**Objetivo:** que el taller deje el cuaderno. Toda consulta, cotización, reserva, orden y pago queda registrada.

**Antes de empezar:** el dueño entrega la lista de precios y las variantes de inyección y succión y de pulido de vidrios (viernes 23), y valida las historias HU-19 a HU-41 y las condiciones del PDF (viernes 30). Sin la lista de precios, C1 se programa con precios de prueba y C2 se atrasa.

### C1. Catálogo y clientes (semana 2)

| | |
|---|---|
| Historias | HU-19 Catálogo con variantes · HU-20 Precios por tamaño y duración · HU-21 Registrar clientes y vehículos · HU-22 Buscar clientes · HU-23 Ficha del cliente |
| Tablas nuevas | `precio` (historial, D-3), `cliente`, `vehiculo`. Columnas nuevas en `servicio` y `variante` (duración, genera mantenimiento); `variante` se crea en B3. `auditoria` pasa a C2, con las cotizaciones (los precios guardan su propio historial) |
| Reglas | D-2 (todo servicio tiene al menos una variante), RN-07 (precio por tamaño; vacío = "según evaluación", como el mantenimiento del cerámico), RNF-10 (registro de cambios de precio) |
| Entregable | Catálogo con precios cargados; clientes y vehículos con búsqueda por nombre, teléfono o placa |
| Criterio de salida | Un cambio de precio no altera nada ya guardado y queda en el historial |

### C2. Consultas y cotizaciones (semana 3)

| | |
|---|---|
| Historias | HU-24 Registrar consulta · HU-25 Armar cotización · HU-26 PDF de la cotización · HU-27 Compartir el PDF · HU-28 Seguimiento de consultas |
| Tablas nuevas | `consulta`, `consulta_archivo`, `cotizacion`, `cotizacion_linea`, `cotizacion_foto`, `auditoria` (viene de C1: registra quién y cuándo crea o cambia cotizaciones y, después, pagos, RNF-10) |
| Reglas | RN-01 (solo el dueño), RN-02 (una cotización enviada no cambia: modificarla crea otra versión), RN-03 (estimado por fotos), S-5 (validez definida en cada cotización) |
| Clave técnica | HU-25 y HU-26 son grandes: se parten. PDF con `@react-pdf/renderer` en la identidad visual (logo sobre claro), guardado en R2 y nunca regenerado. Web Share API con archivo |
| Flujo crítico | Consulta → cotización (diagrama 1 de `flujos-criticos.md`): prueba E2E |
| Entregable | El dueño cotiza desde el celular y manda el PDF por WhatsApp |
| Criterio de salida | El técnico y el encargado reciben "sin acceso" al intentar cotizar, también por URL y por la acción del servidor |

### C3. Agenda y pagos (semana 4)

| | |
|---|---|
| Historias | HU-29 Tablero de la agenda · HU-30 Agendar reserva · HU-31 Reprogramar o cancelar · HU-32 Registrar pagos y saldo |
| Tablas nuevas | `trabajo` (reserva y orden en una tabla, D-1), `trabajo_linea`, `pago` |
| Reglas | RN-06 (un espacio no puede tener dos vehículos el mismo día: restricción de exclusión en la base, D-5), RN-04 (adelanto sugerido editable), RN-05 (el adelanto no se devuelve) |
| Clave técnica | Agenda por día y espacio (S-3). El cerámico de 1,5 días ocupa 2. La duración del catálogo es una estimación: solo completa la fecha de entrega, que se edita en cada reserva y se le da al cliente como aproximada (decisión del 20/10, `etapas/C1-catalogo-clientes.md` §12). El tablero se muestra temprano al dueño, porque es de las interfaces que menos acelera Claude Code |
| Flujo crítico | Cotización → reserva sin cruces, con dos personas reservando a la vez: prueba E2E |
| Entregable | La agenda reemplaza al cuaderno |
| Criterio de salida | La base rechaza un cruce aunque el código fallara (prueba directa contra la restricción) |

### C4. Taller y entrega (semanas 4 y 5)

| | |
|---|---|
| Historias | HU-33 Recibir vehículo · HU-34 Órdenes del técnico · HU-35 Avisar vehículo listo · HU-36 Entregar vehículo · HU-37 Saldos pendientes · HU-38 Recordatorios de mantenimiento |
| Tablas nuevas | `trabajo_foto`, `trabajo_avance`, `recordatorio_mantenimiento` |
| Reglas | RN-12 (el técnico ve solo sus órdenes, sin precios), RN-13 (entrega con saldo solo por el dueño o un encargado con el permiso `entrega_con_saldo`), RN-08 (mantenimiento a 3 meses desde la entrega, solo en los servicios marcados) |
| Retrasos | "Extender la entrega" corre la fecha de fin de la orden; si el espacio ya está ocupado, avisa y propone otro libre (D-5). Si termina antes, se marca listo y el espacio se libera (decisión del 20/10, `etapas/C1-catalogo-clientes.md` §12) |
| Flujo crítico | Recepción → orden → aviso → entrega con saldo → mantenimiento: prueba E2E |
| Entregable | El ciclo completo de un vehículo en el sistema, de la consulta al recordatorio |
| Criterio de salida | Los 5 flujos de `flujos-criticos.md` tienen su prueba E2E y pasan |

### C5. Cierre de la entrega 2 (semana 5; margen en la 6 y la 7)

1. Historias deseables, solo si hay tiempo: HU-39 Pantalla del día · HU-40 Plantillas de WhatsApp (`plantilla_mensaje`) · HU-41 Fotos de órdenes a la galería.
2. Prueba completa con la lista de criterios de HU-19 a HU-38.
3. Capacitación por rol: dueño (cotizar, agenda, saldos), encargado y técnico (sus órdenes desde el celular).
4. Demo del viernes 13 y acta de la entrega 2 (`09-pruebas/actas-de-aceptacion/entrega-2.md`).
5. Merge a `main`, etiqueta `v2.0.0`, cobro de Bs 2.000. Al completar el pago, TocTar recibe una copia del código.

**Criterio de salida de la fase C:** acta firmada antes del 1 de diciembre y pago recibido.

---

## Fase D. Lanzamiento y soporte

### D1. Lanzamiento
- **Antes de publicar la entrega 1:** restauración de prueba de un respaldo, documentada en `10-lanzamiento/` (RNF-06).
- **Carga de datos reales:** los clientes del cuaderno, si el dueño quiere (se coordina en la semana 5).
- **Primera semana de uso:** acompañamiento. Las correcciones entran como `arreglo/…` desde `main`.

### D2. Soporte y mejora
- Garantía de 30 días desde cada entrega: los errores no se cobran.
- Mantenimiento incluido los 3 primeros meses; desde el mes 4, Bs 120 por mes.
- Pedidos nuevos: `03-cierre-comercial/registro-de-cambios.md` (bolsa de 8 h; después Bs 40 por hora). Inventario, asistencia, planilla, caja y reportes son el Sistema completo (Bs 2.000 dentro de los 90 días).

---

## Cómo se trabaja cada historia

1. Mover el issue a "En curso" (máximo 2 a la vez).
2. Crear la rama `hu-XX-descripcion` desde `develop` actualizado.
3. Leer la especificación de la etapa (`etapas/<código>.md`) y planificar con Claude Code a partir de ella.
4. Implementación siguiendo `CLAUDE.md` (tokens de marca, `exigirSesion`, permisos, Zod).
5. Pruebas: unitarias para cada regla RN y E2E para los criterios. Si cambia el esquema, la migración se genera con nombre (`npm run db:generate -- --name …`).
6. `lint`, `typecheck`, `test` y `test:e2e` pasan.
7. PR con la plantilla y `Closes #N`; revisión propia del diff completo (y `/code-review` como segunda mirada).
8. Merge con squash a `develop`: se despliega en pruebas.
9. La historia queda **terminada** cuando la ve el dueño en la revisión del viernes.

## Ritmo de la semana

| Día | Qué |
|---|---|
| Lunes | Elegir las historias de la semana en el tablero |
| Martes a jueves | Desarrollo |
| Viernes | Demo de 20 minutos al dueño en pruebas; lista corta de lo que se necesita de él. Responde en máximo 3 días hábiles |
| Viernes después de la demo | Mensaje de avance por WhatsApp y actualización de este plan |

## Seguimiento

- **GitHub:** un issue por historia con sus criterios como casillas; milestones "Entrega 1 · Web" (3/11) y "Entrega 2 · Gestión" (1/12); tablero con las columnas Backlog, Esta semana, En curso, En revisión, En pruebas y Aceptado. Se arma cuando esté instalado `gh`.
- **Este documento:** la columna de estado de "Dónde estamos" se actualiza cada viernes.

## Decisiones y material pendientes

| # | Qué | De quién | Para cuándo | Bloquea |
|---|---|---|---|---|
| 1 | ~~Dominio exacto y titular~~ ✅ `toctardetailing.com` (15/10) | Dueño | — | — |
| 2 | Proveedor del VPS: Hetzner o DigitalOcean | YankoSoft | Lunes 19 de octubre | A3 |
| 3 | Horario de atención confirmado, con los días | Dueño | Viernes 23 de octubre | Nada (se carga desde el panel) |
| 4 | Textos por servicio y preguntas frecuentes (hay borradores cargados) | Dueño | Viernes 23 de octubre | B6 (contenido real) |
| 5 | Fotos principales de cada servicio | Dueño | Antes del 3 de noviembre | Nada (imagen de reemplazo) |
| 6 | Validación de criterios HU-01 a HU-18 | Dueño | Demo del viernes 23 | B6 (acta) |
| 7 | Condiciones y garantía del PDF (hay un borrador cargado en el panel, B2) | Dueño | Viernes 30 de octubre | C2 |
| 8 | Lista de precios, variantes de inyección y succión y de vidrios | Dueño | **Viernes 23 de octubre** (se pide el lunes 19) | C1 y C2 |
| 9 | Validación de HU-19 a HU-41 | Dueño | Viernes 30 de octubre | Fase C |
| 10 | Vectorial original del logo | Diseñador del dueño | Sin fecha | Nada (hay trazado fiel) |

## Riesgos

| Riesgo | Efecto | Qué se hace |
|---|---|---|
| El dominio o el titular no llegan a tiempo | Sin entorno de pruebas para la demo del 23 | Pedirlo hoy. Si no llega el 19, el VPS se levanta con un subdominio temporal de Coolify y la demo se hace igual |
| Material atrasado (textos, fotos, precios) | Contenido de prueba en las demos | Datos de prueba realistas; el contenido real se carga en B6 y en C1 |
| El dueño tarda en responder o en aceptar | El calendario se corre | Pedidos concretos en cada demo; el acta se considera aceptada a los 5 días hábiles sin observaciones |
| Entrega 1 sin margen | Atraso en el primer cobro | Las historias deseables y los ajustes menores se mueven; la calidad no se recorta |
| Agenda y PDF, las interfaces más difíciles | Rehacerlas al final | Mostrarlas incompletas en la demo de su semana |
| Pedidos nuevos en las demos | Alcance que crece | Todo pedido va al registro de cambios antes de hacerse |
