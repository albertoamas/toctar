# Plan de desarrollo — TocTar Detailing (Web + Gestión)

- **Versión:** 6 · 4 de noviembre de 2026 (antes: v5 del 15/10)
- **Base:**
  - Backlog: `05-analisis/historias-de-usuario/historias.md`.
  - Plazos y pagos: `03-cierre-comercial/acuerdo.md`.
  - Tablas: `06-diseno/modelo-de-datos/modelo-de-datos.md`.
  - Pendientes de infraestructura: `07-preparacion/preparacion.md`.
- **Cómo se usa:**
  - Cada etapa tiene un criterio de salida; no se pasa a la siguiente sin cumplirlo.
  - Al cerrar una etapa, se marca aquí y en `flujo-de-trabajo.md`.
  - Si una fecha se mueve, se cambia aquí y se avisa al dueño en la revisión del viernes.

## Qué cambió en la versión 6

- **Todo lo programable de las dos entregas está en `develop`** y en `pruebas.toctardetailing.com`: C1 a C5, el pulido visual, los ajustes de la reunión con el dueño (cotización directa, checklist, firma, fotos justas, órdenes con historial, saldos), el rediseño del panel, dos roles sin técnico asignado (pedido 32), los ajustes del sitio (pedidos 33 a 36) y las correcciones de la auditoría QA del 03/11.
- **La Entrega 1 no tuvo su acta el 3/11.** Como se decidió el 21/10, `develop` completo pasa a `main` al aceptar, así que las dos entregas se aceptan y se publican juntas. Falta acordarlo con el dueño, junto con la fecha de la demo y del acta.
- **Lo que queda es el cierre** ("Para cerrar la Entrega 2"): la prueba completa a mano en celulares reales, la capacitación, las actas y lo que decide o carga el dueño.
- **El alcance cambió por pedidos del dueño**, todos en `registro-de-cambios.md` (pedidos 1 a 36). Las secciones de cada etapa de abajo son el plan original: lo que cambió después está en el registro y en la especificación de cada etapa (por ejemplo, sin técnico desde el pedido 32 y sin consulta aparte desde el 23).

## Qué cambió en la versión 5 (15/10)

- **El desarrollo va más rápido de lo previsto.** El trabajo empezó el 9/10 con la firma y el primer pago (base técnica el 10/10). Apenas llegó el material, el 14/10, B1 a B4 (15 historias, con pruebas y documentación) se programaron en dos días; el plan v4 les daba dos semanas. Lo lento del proyecto fueron las reuniones y la recolección de requisitos, no el código. Los plazos del contrato cuentan desde el 14/10, porque el acuerdo los hace empezar con el pago y el material.
- **El calendario se adelanta una semana** para la Entrega 2 (meta 13/11 en vez de 20/11). **Las fechas del acuerdo no cambian** (3/11 y 1/12): el adelanto queda como margen.
- **No se adelanta más** porque la Entrega 2 tiene las partes más difíciles (PDF, versiones de cotización, agenda sin cruces, ciclo de la orden) y porque necesita uso real del taller y al menos una vuelta de ajustes antes del acta.
- **El adelanto depende del dueño:** la lista de precios y las variantes pasan a pedirse para el viernes 23 (antes, 3/11), y el dominio sigue siendo urgente.
- **Lunes 19:** reunión de avance con el dueño, con una presentación y sin mostrar todavía la app. La primera demo sigue siendo el viernes 23.

## Dónde estamos (8 de noviembre)

| Qué | Estado |
|---|---|
| Etapas 1 a 4 (descubrimiento, propuesta, cierre comercial, requerimientos) | ✅ Cerradas |
| Etapa 5 (análisis) | 🟡 Supuestos S-1 a S-5 respondidos; criterios de HU-01 a HU-41 escritos (`09-pruebas/criterios-entrega-1.md` y `-2.md`). Falta que el dueño los valide, en la demo del cierre |
| Etapa 6 (diseño) | ✅ Modelo de datos, arquitectura e identidad visual |
| Etapa 7 (preparación) | 🟡 Dominio, VPS en Hetzner, Coolify, R2, respaldos y CI/CD listos (`07-preparacion/servidor.md`, `ci-cd.md`). Pruebas en línea en `pruebas.toctardetailing.com`, que se despliega sola al unir a `develop`; producción configurada, sin publicar. Falta la reunión con el dueño (sus accesos y su tarjeta) y la restauración de prueba (RNF-06) |
| Iteración 0 (cimientos) | ✅ En `develop` (PR #1) |
| Etapa B1 Acceso (HU-01, HU-02, HU-03) | ✅ Cerrada el 14/10, en `develop` (PR #4, #7 y #10) |
| Etapa B2 Configuración y app (HU-04, HU-05, HU-06) | ✅ Programada y probada a mano el 14/10, en `develop` (PR #14, #15 y #16). Falta instalarla en celulares reales (ya hay https en pruebas) |
| Etapa B3 Contenido del panel (HU-07, HU-08, HU-09) | ✅ Programada el 14/10 (PR #19, #20 y #21) y mostrada en la demo del sitio (24/10). Falta la prueba completa a mano |
| Etapa B4 Sitio público (HU-10 a HU-15) | ✅ Programada el 14/10 (PR #23 a #26), mostrada en la demo del 24/10 y ajustada con los pedidos del dueño (1 a 11 y 33 a 36). Lighthouse móvil ≥ 90 en local; falta medirlo en pruebas |
| Etapa B5 Reclamos y Google (HU-16, HU-17, HU-18) | ✅ Programada el 15/10 (PR #33 a #36). Falta la prueba a mano, validar el JSON-LD en Google con https y que el dueño cree su Perfil de Empresa (`10-lanzamiento/perfil-de-google.md`) |
| Revisión de seguridad y calidad de la Entrega 1 | ✅ 16/10 (PR #40) |
| Pulido visual de la Entrega 1 | ✅ Las 32 pantallas, en `develop` (PR #43 a #48). Registro y comparativas en `pulido-visual.md` |
| Etapa C1 Catálogo y clientes (HU-19 a HU-23) | ✅ Programada el 20/10 (PR #49 a #53). Precios de prueba solo en E2E: falta la lista de precios real del dueño |
| Etapa C2 Consultas y cotizaciones (HU-24 a HU-28) | ✅ Programada el 21/10 (PR #55 a #60). Desde el pedido 23 (PR #113), cotización directa sin consulta aparte. Falta compartir el PDF desde un celular real, revisarlo impreso y que el dueño confirme formas de pago, condiciones y garantía |
| Etapa C3 Agenda y pagos (HU-29 a HU-32) | ✅ Programada el 21/10 (PR #61 a #64) y vista por el dueño en la reunión del panel (fines de octubre). Falta probar el cobro con comprobante en un celular real |
| Etapa C4 Taller y entrega (HU-33 a HU-38) | ✅ Programada el 23/10 (PR #65 a #72), con checklist (pedido 12), firma (13), fotos de inicio y final (27) e historial (28). Los 5 flujos críticos con su prueba E2E. Falta la prueba desde un celular real |
| Etapa C5 Cierre de la Entrega 2 | 🔵 Especificación aprobada el 23/10 (PR #73). §0, HU-39, HU-40 y HU-41 hechas (PR #74, #92 a #94); criterios de HU-19 a HU-41 escritos el 02/11 (`09-pruebas/criterios-entrega-2.md`, PR #127). Todo lo programable está en `develop`. **Sigue el cierre:** ver "Para cerrar la Entrega 2", debajo |
| Datos de demostración | ✅ Scripts `db:reiniciar-local`, `datos:demo` y `datos:reiniciar` (PR #75 y #120), al día con los ajustes del dueño. Falta cargarlos en pruebas: necesita un túnel SSH a la base y las claves de R2 de pruebas, que maneja el usuario |
| Pedidos de la demo del sitio (24/10) | ✅ Hechos el 24/10 (PR #78 a #88; `pulido-visual.md`, 2B.1 a 2B.12; registro de cambios 1 a 11). Falta que el dueño cargue en pruebas el trabajo de la portada, los íconos de los beneficios, la escalera del nano cerámico, las fotos de cada sección y del equipo, el TikTok y el WhatsApp real |
| Pulido visual de la Entrega 2 | ✅ Grupos 7 a 13, pantalla por pantalla, en `develop` (PR #99, #100, #102 a #105 y #108, del 25 al 27/10). Registro, comparativas y revisiones de cada grupo en `pulido-visual.md` |
| Pedidos nuevos del dueño (25/10 al 04/11) | 🔵 En `registro-de-cambios.md`. **Hechos:** 12, 13, 17 (dentro del 21), 20, 21, 23, 24, 26 a 28, 30, 31 (parte 1) y 32 a 37. **Descartado:** 25 (se mantienen las versiones). **Esperan al dueño:** 14 (cotizado), 15 y 16 (Sistema completo), 19, 22 (WhatsApp automático, por cotizar), 29 (vehículos sin placa) y 31, parte 2 (cotizar sin registrar). **Ya no aplica:** 18 (resuelto por el 23). Además, cargar en el catálogo los servicios con mantenimiento y su frecuencia |
| Pruebas E2E intermitentes | ✅ `flujo-taller-completo` y `hu-30` fallaban a veces con la suite completa: eran dos carreras reales del sistema (recibir pedía confirmar "sin fotos" con una foto recién subida; el menú de espacios mostraba un instante la lista de otras fechas), corregidas el 27/10 (PR #109). La E2E completa pasó tres veces seguidas sin fallas. Lo del 25/10 (`hu-08`: llenar antes de que la página responda) ya espera la hidratación |
| Ajustes de la reunión con el dueño (01/11) | ✅ Plan en `ajustes-reunion-dueno.md`: cotización directa (PR #113), checklist al recibir (#114), firma (#115), fotos justas (#116), órdenes con historial (#117), saldos con búsqueda (#118), rediseño del panel (#125, aprobado por el dueño) y dos roles sin técnico asignado (pedido 32, #129). Quedan, a decisión del dueño, vehículos sin placa (pedido 29) y los avisos automáticos (pedido 22, por cotizar) |
| Ajustes del sitio (03/11) | ✅ Pedidos 33 a 36: tarjetas de servicio más vivas (#131), galería en dos secciones (#132), TikTok a la par de WhatsApp y "Cómo llegar" como botón (#133) y portada sin "Trabajos recientes" (#134). Corrección del iPhone en formularios y logo (#130) |
| Auditoría QA del 03/11 | ✅ 14 hallazgos verificados: 10 corregidos (Zod, fechas, limpieza de fotos, bloqueos y el último dueño) y 4 descartados con motivo (PR #135, `09-pruebas/auditoria-qa-2026-11-03.md`) |
| Flujo del trabajo y cambio de dueño (04/11) | ✅ Pedido 31, parte 1 (#137, afinada en #140: "Aceptó", "Por reservar" en la Agenda y avisos flotantes): pasos del trabajo, "Aceptó: reservar" y "Aceptó, sin fecha", Nueva reserva con las cotizaciones del vehículo e Inicio con el paso siguiente. Pedido 37 (#138): un vehículo cambia de dueño con su plan de mantenimiento. También en #138: el ajuste al estándar del panel y las reservas de un mismo espacio de a una |
| Ajustes del 05/11 | ✅ "Reservar" y "Reservada" en toda la reserva (#142); "Cómo llegar" con la ficha de Google Maps y Contacto renovado, con "Abierto ahora" (pedido 38, #143); el menú del celular fluido desde el primer toque (#144); la app instalada gira en Android (#145); el ingreso renovado y sin bordes blancos (#146); el aviso de versión nueva (pedido 39, #148). `hu-23` reintenta con sus datos y guarda el registro del primer fallo (#147): el color vacío al reabrir un vehículo sigue sin causa (criterio 23.7) |
| Ajustes del 06/11 | ✅ Nueva cotización en tres pasos y lo opcional marcado igual en todo el panel (pedido 40, #151); Nueva reserva en cuatro pasos, con el mismo indicador y resumen (pedido 41, #152) |
| Pulido del panel (07 y 08/11) | ✅ Botón de volver, Sitio web y Configuración como fichas con modales, menú y avisos (PR #160 a #171; `pulido-visual.md`, 13.18 a 13.29) |
| C6 Consistencia del panel | ✅ Terminada el 08/11: reglas, piezas comunes, prueba en el CI, las 37 pantallas migradas y el recorrido final en 4 tamaños con 3 roles (PR #172 a #183; `etapas/C6-consistencia-del-panel.md`; reglas en `06-diseno/sistema-del-panel.md`). Va antes de la capacitación y de la prueba en celulares reales |
| Identidad visual aplicada a la app | ✅ En `develop` (PR #5 y #9, logos nítidos en tamaños chicos) |
| Inicio del trabajo | 9 de octubre de 2026 (firma y primer pago) |
| Día D (inicio del plazo del contrato) | 14 de octubre de 2026 (llegó el material) |

## Para cerrar la Entrega 2 (al 4 de noviembre)

Todo lo programable está en `develop` y en `pruebas.toctardetailing.com`. Lo que falta, en orden. Con la Entrega 2 se acepta también la Entrega 1 (todo `develop` pasa junto a `main`).

**Lo hace YankoSoft (no depende del dueño):**

**0. Pulido final del panel (desde el 09/11, después de C6).** C6 dejó las 37 pantallas con la misma estructura; estas, migradas sin revisar su diseño desde octubre (antes del pedido 26 y de los pedidos 31, 37, 40 y 41), pasan una por una por la revisión de diseño (`pulido-visual.md`, skill `pantallas-panel`: análisis, propuesta, aprobación, programación). En orden:

| Prioridad | Pantallas | Estado |
|---|---|---|
| 1. De pie en el taller | Recibir vehículo, Entregar vehículo | ✅ 09/11 (pulido 13.30) |
| 2. Flujos en pasos | Nueva reserva, Nueva cotización, Nueva versión | ✅ 10/11 (pulido 13.31, 13.33 y 13.35; cobrar 13.32 y los plegados 13.34) |
| 3. Todos los días | Inicio, Agenda, Saldos, Mantenimientos | 🔵 Inicio ✅ (13.36), Agenda ✅ (13.37), Saldos ✅ (13.38), Mantenimientos ✅ (13.39) |
| 4. Menos usadas | Ficha del cliente, Servicio del catálogo, Cambiar dueño, Publicar en la galería, Galería del panel | ✅ 10/11 (pulido 13.40 a 13.44; inventario, cambios 1b a 4c) |
| 5. Listas | Órdenes, Clientes, Cotizaciones, Reclamos, Catálogo, Usuarios | ✅ 10/11 (la barra común, 13.40; Reclamos y Catálogo, 13.45) |

**Desde el 10/11, el inventario de las 40 pantallas manda:** `inventario-pantallas.md` (formato en la computadora y en el celular, qué se cambia y por qué, para que todo el panel sea consistente). Mientras tenga cambios abiertos, las prioridades 4 y 5 quedan en pausa.

1. **Prueba completa a mano** con `09-pruebas/criterios-entrega-2.md` (y los ⚠️/⏳ de `criterios-entrega-1.md`) en pruebas, con https: dueño y encargado con cada perfil (Taller, Atención, Todo), en un Android y un iPhone. Cubre los ⏳ de celular real: compartir el PDF (27.3), comprobante con la cámara (32.5), checklist con fotos (33.6), PDF impreso en A4 (26.4) e instalar la app (B2).
2. **Datos de demostración en pruebas** (`datos:demo`), para la demo y la capacitación.
3. **Guía de capacitación** `10-lanzamiento/capacitacion.md`, corta y por rol (ver C5, punto 3). ✅ Escrita el 11/11: Taller, Atención y dueño, con la lista para la sesión; falta darla con el dueño y los encargados.
4. **Borradores de las actas** `09-pruebas/actas-de-aceptacion/entrega-1.md` y `entrega-2.md`.
5. **En el servidor** (con el acceso SSH de YankoSoft): confirmar que Traefik pone `x-real-ip` y que el puerto de la app no está abierto; la restauración de prueba antes de publicar (RNF-06, `07-preparacion/servidor.md`); Lighthouse y JSON-LD con https.

**Lo decide o lo carga el dueño** (sin apuro: se avanza con lo de arriba mientras tanto):

| Qué | Dónde |
|---|---|
| Pedido 29 y pedido 31, parte 2: vehículos sin placa y cotizar sin registrar al cliente (van juntos) | `etapas/P31-flujo-de-un-trabajo.md`, parte 2 |
| Pedidos 14 (Bs 200), 19 y 22 (avisos automáticos, por cotizar); la constancia en PDF de la entrega (pedido 13, +2 h) | `registro-de-cambios.md` |
| Pedidos 15 y 16: van en el Sistema completo | `registro-de-cambios.md` |
| Decisiones abiertas de C5 (permiso del cliente para publicar fotos, qué ve el encargado en Inicio, más mensajes editables) | `etapas/C5-cierre-entrega-2.md`, §12 |
| Sus datos: lista de precios real (20.4), servicios con mantenimiento y su frecuencia, textos del PDF (formas de pago, condiciones, garantía; 26.6), contenido del sitio (trabajo de la portada, fotos, TikTok, WhatsApp real) | Panel, en producción al publicar |
| Reunión de accesos: sus dos pasos en Cloudflare y Hetzner, su tarjeta y el equipo en Coolify | `07-preparacion/servidor.md` |

**Al aceptar:** demo, capacitación, actas confirmadas, merge de `develop` a `main`, etiquetas `v1.0.0` y `v2.0.0`, publicación en producción y cobro (Bs 700 + Bs 2.000).

## Calendario

| Semana | Fechas | Qué se hizo o qué toca | Con el dueño |
|---|---|---|---|
| 1 | 14 al 20 de octubre | B1 a B5 ✅ | Lunes 19: reunión de avance ✅ |
| 2 | 21 al 27 de octubre | A3 (pruebas en línea y CI/CD) ✅ · C1 a C5 programadas ✅ · pulido visual de las dos entregas ✅ | Demo del sitio (24/10) y sus pedidos ✅ |
| 3 | 28 de octubre al 3 de noviembre | Ajustes de la reunión del panel, rediseño, dos roles, ajustes del sitio y auditoría QA ✅ | Reunión del panel ✅. El acta de la Entrega 1 no se hizo: va con la de la 2 |
| 4 en adelante | Desde el 4 de noviembre | Cierre: "Para cerrar la Entrega 2" | Demo del ciclo completo, capacitación y actas, con fecha a acordar. Límite del acuerdo: **1/12** |

| Hito | Fecha límite | Pago al aceptarse |
|---|---|---|
| Entrega 1: Web publicada y aceptada | 3 de noviembre (pasó sin acta; se acepta junto con la Entrega 2) | Bs 700 |
| Entrega 2: Gestión aceptada | 1 de diciembre | Bs 2.000 |

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
| C5 Cierre de la Entrega 2 | `etapas/C5-cierre-entrega-2.md` | 🔵 Aprobada (23/10). §0, HU-39, HU-40 y HU-41 hechas; sigue el cierre ("Para cerrar la Entrega 2") |
| P21 Planes de mantenimiento | `etapas/P21-planes-mantenimiento.md` | ✅ Aprobada y programada (27/10, PR #107). Falta que el dueño cargue los servicios con mantenimiento |
| P12 Checklist al recibir | `etapas/P12-checklist-recepcion.md` | ✅ Programada (01/11, PR #114) |
| P13 Firma al entregar | `etapas/P13-firma-entrega.md` | ✅ Programada (01/11, PR #115); la constancia en PDF, por decidir |
| P23 Cotización directa | `etapas/P23-cotizacion-directa.md` | ✅ Programada (01/11, PR #113), con el pedido 24 |
| P26 Rediseño del panel | `etapas/P26-rediseno-panel.md` | ✅ Programada y aprobada por el dueño (02/11, PR #125) |
| P27 Fotos justas | `etapas/P27-fotos-justas.md` | ✅ Programada (01/11, PR #116) |
| P28 Órdenes con historial | `etapas/P28-ordenes-historial.md` | ✅ Programada (01/11, PR #117) |
| P30 Saldos: buscar y ordenar | `etapas/P30-saldos-buscar-ordenar.md` | ✅ Programada (01/11, PR #118) |
| P32 Dos roles, sin técnico | `etapas/P32-roles-sin-tecnico.md` | ✅ Programada (03/11, PR #129) |
| P31 Un trabajo, de la cotización a la entrega | `etapas/P31-flujo-de-un-trabajo.md` | 🔵 Parte 1 hecha (04/11, PR #137 y #138); la parte 2 (cotizar sin registrar y placa opcional), a decidir con el dueño |
| P37 Un vehículo cambia de dueño | `etapas/P37-cambio-de-dueno.md` | ✅ Hecha (04/11, PR #138) |
| B6 Cierre de la Entrega 1 | Sin especificación aparte | Va junto con el cierre de la Entrega 2 (C5) |

## Cómo se trabaja cada historia

Una rama `hu-XX-…` por historia, desde `develop`, con commits chicos por tipo (`CLAUDE.md`, "Control de versiones"). En cada una, además de programar:

1. **Documentación vigente.** Antes de usar una librería nueva, o una API que pudo cambiar, se lee su documentación actual con `context7`; para Next.js, `node_modules/next/dist/docs/`. Así no se programa sobre una versión vieja.
2. **Pantallas.** Una pantalla nueva o rediseñada se diseña con la skill `frontend-design`, con la identidad del Design System y el estándar del panel (44 px con pantalla táctil, regla de botones). Si es del panel, además con la skill del proyecto `pantallas-panel` (`.claude/skills/`): qué tipo de pantalla es (lista, ficha, crear, configuración o flujo), una acción principal, fichas en modo lectura con "Editar" por sección, lo poco usado en "Más", textos justos y su lista de QA por rol y por estado. Se revisan capturas a 360 y 1280 px y nada se sale de la pantalla.
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

**Cambió (04/11):** el pulido visual y la carga de contenido de prueba están hechos. La prueba a mano, la capacitación, el acta, el merge y el cobro van junto con los de la Entrega 2 ("Para cerrar la Entrega 2").

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

1. ✅ Historias deseables: HU-39 Pantalla del día · HU-40 Plantillas de WhatsApp (`plantilla_mensaje`) · HU-41 Fotos de órdenes a la galería (PR #92 a #94).
2. Prueba completa a mano con la lista de criterios de HU-19 a HU-41 (y los pendientes de HU-01 a HU-18).
3. Capacitación por rol: dueño (cotizar, agenda, saldos, mensajes y usuarios) y encargado según su perfil (Taller: recibir, trabajar y entregar; Atención: además clientes, cotizaciones y saldos). Sin técnico desde el pedido 32.
4. Demo del ciclo completo (fecha a acordar con el dueño) y actas de las dos entregas (`09-pruebas/actas-de-aceptacion/`).
5. Merge a `main`, etiquetas `v1.0.0` y `v2.0.0`, publicación y cobro (Bs 700 + Bs 2.000). Al completar el pago, TocTar recibe una copia del código.

**Criterio de salida de la fase C:** acta firmada antes del 1 de diciembre y pago recibido.

---

## Fase D. Lanzamiento y soporte

### D1. Lanzamiento
- **Antes de publicar:** restauración de prueba de un respaldo, documentada en `07-preparacion/servidor.md` (RNF-06).
- **Carga de datos reales:** precios, servicios con mantenimiento, textos del PDF, contenido del sitio y, si el dueño quiere, los clientes del cuaderno. Se coordina con él antes de publicar.
- **Primera semana de uso:** acompañamiento. Las correcciones entran como `arreglo/…` desde `main`.

### D2. Soporte y mejora
- Garantía de 30 días desde cada entrega: los errores no se cobran.
- Mantenimiento incluido los 3 primeros meses; desde el mes 4, Bs 120 por mes.
- Pedidos nuevos: `03-cierre-comercial/registro-de-cambios.md` (bolsa de 8 h; después Bs 40 por hora). Inventario, asistencia, planilla, caja y reportes son el Sistema completo (Bs 2.000 dentro de los 90 días).

---

## Ritmo de la semana

| Día | Qué |
|---|---|
| Lunes | Elegir las historias de la semana en el tablero |
| Martes a jueves | Desarrollo |
| Viernes | Demo de 20 minutos al dueño en pruebas; lista corta de lo que se necesita de él. Responde en máximo 3 días hábiles |
| Viernes después de la demo | Mensaje de avance por WhatsApp y actualización de este plan |

## Seguimiento

- **GitHub:** un issue por historia con sus criterios como casillas; milestones "Entrega 1 · Web" (3/11) y "Entrega 2 · Gestión" (1/12); tablero con las columnas Backlog, Esta semana, En curso, En revisión, En pruebas y Aceptado. Se arma cuando esté instalado `gh`.
- **Este documento:** "Dónde estamos" y "Para cerrar la Entrega 2" se actualizan al unir cada PR que cambie el estado.

## Decisiones y material pendientes

| # | Qué | De quién | Estado | Bloquea |
|---|---|---|---|---|
| 1 | Dominio exacto y titular | Dueño | ✅ `toctardetailing.com` (15/10) | — |
| 2 | Proveedor del VPS | YankoSoft | ✅ Hetzner (CX23) | — |
| 3 | Horario de atención con los días | Dueño | Se carga desde el panel antes de publicar | Nada |
| 4 | Textos por servicio y preguntas frecuentes (hay borradores cargados) | Dueño | Antes de publicar | La publicación |
| 5 | Fotos de cada servicio, de la portada y del equipo | Dueño | Antes de publicar | Nada (imagen de reemplazo) |
| 6 | Validación de los criterios de HU-01 a HU-41 | Dueño | En la demo del cierre | Las actas |
| 7 | Formas de pago, condiciones y garantía del PDF (hay un borrador cargado) | Dueño | Antes del acta (criterio 26.6) | El acta de la Entrega 2 |
| 8 | Lista de precios real y sus variantes | Dueño | Antes de publicar (criterio 20.4) | La publicación |
| 9 | Pedidos que esperan su decisión: 14, 19, 22, 29, 31 (parte 2) y la constancia en PDF de la entrega | Dueño | Sin fecha (`registro-de-cambios.md`) | Nada: se cierra sin ellos si no los aprueba |
| 10 | Vectorial original del logo | Diseñador del dueño | Sin fecha | Nada (hay trazado fiel) |

## Riesgos

| Riesgo | Efecto | Qué se hace |
|---|---|---|
| La prueba en celulares reales encuentra fallos que las E2E no ven | Ajustes antes del acta | Se prueba en Android y en iPhone (Safari) temprano en el cierre; las E2E ya corren también en WebKit |
| Material atrasado (textos, fotos, precios) | Publicar con contenido de prueba | El sitio y el panel funcionan con lo cargado; el contenido real se carga desde el panel, sin depender de YankoSoft |
| El dueño tarda en responder o en aceptar | El calendario se corre | Pedidos concretos en cada demo; el acta se considera aceptada a los 5 días hábiles sin observaciones |
| Las dos entregas se aceptan juntas | El primer cobro se corre hasta el cierre | Acordar con el dueño la fecha de la demo y del acta; el límite del acuerdo es el 1/12 |
| Lo del servidor (restauración, datos de demostración en pruebas) depende del acceso SSH, que tiene solo YankoSoft | Se atrasa el cierre si no se agenda | Se hace en una sola sesión, paso a paso, con los comandos listos |
| Pedidos nuevos en las demos | Alcance que crece | Todo pedido va al registro de cambios antes de hacerse |
