# Plan de desarrollo — TocTar Detailing (Web + Gestión)

- **Versión:** 3 · 14 de octubre de 2026 (fechas reales desde el día D)
- **Base:** backlog de `05-analisis/historias-de-usuario/historias.md` y plazos de `03-cierre-comercial/acuerdo.md`

## Cuándo empieza a correr el plazo

Según el acuerdo, los plazos cuentan desde que se cumplen el primer pago y la entrega del material. **Día D = miércoles 14 de octubre de 2026**: llegaron el logo, las fotos y los datos de contacto (`01-descubrimiento/material-recibido.md`). Lo que falta se completa durante el desarrollo.

| Semana | Fechas |
|---|---|
| 1 | 14 al 20 de octubre |
| 2 | 21 al 27 de octubre |
| 3 | 28 de octubre al 3 de noviembre |
| 4 | 4 al 10 de noviembre |
| 5 | 11 al 17 de noviembre |
| 6 | 18 al 24 de noviembre |
| 7 | 25 de noviembre al 1 de diciembre |

| Entrega | Plazo del acuerdo | Fecha límite | Plan | Cobro al aceptarse |
|---|---|---|---|---|
| 1. Web | 2 a 3 semanas | **3 de noviembre** | Semanas 1 a 3 | Bs 700 |
| 2. Gestión | 3 a 4 semanas más | **1 de diciembre** | Semanas 4 a 6 | Bs 2.000 |
| Margen | | | Semana 7 | |

El material llegó antes de terminar la iteración 1 (acceso), así que esa iteración entra en la semana 1 y la entrega 1 usa sus 3 semanas. La entrega 2 apunta al 24 de noviembre y deja la semana 7 de margen antes del límite.

## Estimación con Claude Code

Los tamaños del backlog (S = medio día, M = 1,5 días, L = 3 días) son de desarrollo sin asistencia. Con Claude Code, el tiempo de **programar** baja, pero no todo baja igual:

| Tipo de trabajo | Efecto de Claude Code | Ejemplos |
|---|---|---|
| Pantallas de alta, edición y listado; páginas del sitio | Mucho: un 50 a 60 % menos | Usuarios, servicios, textos, clientes, catálogo, portada |
| Lógica con reglas del negocio | Medio: un 30 % menos (hay que verificar cada regla con pruebas) | Permisos, cotización con versiones, saldos, mantenimiento |
| Interfaz delicada y documentos | Poco: se itera mirando el resultado en el celular | Tablero de la agenda, PDF de la cotización, subida de fotos |
| Revisar el código antes de cada merge | No baja: lo hace el desarrollador | Todas |
| Respuestas del dueño, material, revisiones semanales, aceptación | No baja: depende de TocTar | Todas |

| Entrega | Sin asistencia | Con Claude Code | Semanas |
|---|---|---|---|
| 1. Web (HU-01 a HU-18) | unos 16 días | unos 9 días | 3 (con la revisión del dueño) |
| 2. Gestión (HU-19 a HU-38) | unos 27 días | unos 15 días | 3, más 1 de margen |

**Conclusión:** el cuello de botella deja de ser programar y pasa a ser el dueño (material, respuestas en 3 días hábiles, 5 días para aceptar cada entrega). Por eso **no se promete menos que el plazo del acuerdo**: el tiempo ganado se usa como margen y para hacer las historias deseables, no para adelantar fechas comprometidas.

## Antes del día D

- [x] Iteración 0, cimientos: Next.js, PostgreSQL, RustFS, Docker, shadcn/ui, Vitest, Playwright, layouts (PR #1, 14 de octubre).

## Entrega 1: Web (semanas 1 a 3)

| Semana | Contenido | Historias | Material que necesita |
|---|---|---|---|
| 1 (14–20 oct) | Iteración 1, acceso: inicio de sesión, usuarios, permisos del encargado. Datos del negocio, parámetros, app instalable. **Se levanta el entorno de pruebas** (VPS, Coolify, dominio) | HU-01 a HU-06 | Dominio y titular, horario |
| 2 (21–27 oct) | Servicios, textos y galería del panel; portada, páginas de servicio, galería, nosotros y preguntas frecuentes. **Primera revisión del dueño: viernes 23** | HU-07 a HU-13 | Textos por servicio, fotos (las principales de cada servicio pueden llegar después: el sitio usa una imagen de reemplazo) |
| 3 (28 oct–3 nov) | Contacto, WhatsApp, reclamos y Google (SEO); carga del contenido real; capacitación. **Acta de aceptación de la entrega 1 → producción** | HU-14 a HU-18 | Condiciones y garantía |

## Entrega 2: Gestión (semanas 4 a 6, margen en la 7)

La entrega 2 empieza sin esperar el acta de la 1 (el dueño tiene 5 días hábiles para aceptarla).

| Semana | Contenido | Historias | Material que necesita |
|---|---|---|---|
| 4 (4–10 nov) | Catálogo con variantes y precios; clientes, vehículos, búsqueda y ficha; consultas | HU-19 a HU-24 | Lista de precios, variantes de inyección y succión y de vidrios |
| 5 (11–17 nov) | Cotización con versiones, PDF y compartir; seguimiento; agenda | HU-25 a HU-31 | Condiciones del PDF |
| 6 (18–24 nov) | Pagos, recepción, órdenes del técnico, aviso, entrega, saldos, mantenimiento; capacitación. **Acta de aceptación de la entrega 2** | HU-32 a HU-38 | — |

**Semana 7 (25 nov–1 dic): margen** antes del límite del acuerdo. Absorbe material atrasado, ajustes de las revisiones y las historias deseables (HU-39 a HU-41) que no hayan entrado.

## Riesgos del calendario

- **Material atrasado.** Es el riesgo principal. Si falta algo, la semana avanza con datos de prueba y el contenido real se carga después; si falta el logo o los datos de contacto, la primera revisión pierde valor.
- **Respuestas lentas del dueño.** Una revisión sin respuesta en 3 días hábiles corre el calendario. Se le recuerda en el mismo día de la demo qué se necesita.
- **Interfaces difíciles** (agenda y PDF). Son las que menos acelera Claude Code; se muestran al dueño temprano, aunque estén incompletas.
- **Entrega 1 sin margen.** Usa las 3 semanas del acuerdo. Si algo se atrasa, se avisa al dueño en la revisión semanal; las historias deseables y los ajustes menores se mueven, no se recorta la calidad.
- **Validación pendiente.** Ver la sección siguiente.

## Validación pendiente del dueño

1. [x] Los supuestos S-1 a S-5: respondidos el 14 de octubre (S-2, S-4 y S-5 con ajustes).
2. [ ] Los criterios de aceptación de HU-01 a HU-18: en la primera revisión (viernes 23 de octubre), con lo ya construido a la vista. Son la lista con la que se firma el acta de la entrega 1.
3. [ ] Las historias HU-19 a HU-41: antes de la semana 4.

## Ritmo de cada semana

- Lunes: elegir las historias de la semana.
- Cada historia: rama → plan → código → pruebas → revisión → merge a `develop` (se despliega en pruebas).
- Viernes: demo al dueño en el entorno de pruebas; él responde en máximo 3 días hábiles.
- Los pedidos nuevos van a `03-cierre-comercial/registro-de-cambios.md` (bolsa de 8 horas).
