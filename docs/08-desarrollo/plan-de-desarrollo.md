# Plan de desarrollo — TocTar Detailing (Web + Gestión)

- **Versión:** 2 · 10 de octubre de 2026 (ajustada al desarrollo con Claude Code)
- **Base:** backlog de `05-analisis/historias-de-usuario/historias.md` y plazos de `03-cierre-comercial/acuerdo.md`

## Cuándo empieza a correr el plazo

Según el acuerdo, los plazos cuentan desde que se cumplen **el primer pago (hecho) y la entrega del material (pendiente)**. A ese día lo llamamos **día D**. Hasta que llegue el material, las fechas de este plan son relativas; cuando se conozca D, se completan.

| Entrega | Plazo del acuerdo | Plan | Cobro al aceptarse |
|---|---|---|---|
| 1. Web | 2 a 3 semanas | Semanas 1 y 2 | Bs 700 |
| 2. Gestión | 3 a 4 semanas más | Semanas 3 a 6 | Bs 2.000 |
| Margen | | Semana 7 | |
| **Total** | **5 a 7 semanas** | **6 semanas + 1 de margen** | |

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
| 1. Web (HU-04 a HU-18; HU-01 a 03 se adelantan) | unos 12 días | unos 7 días | 2 (con la revisión del dueño) |
| 2. Gestión (HU-19 a HU-38) | unos 27 días | unos 15 días | 3 a 4 |

**Conclusión:** el cuello de botella deja de ser programar y pasa a ser el dueño (material, respuestas en 3 días hábiles, 5 días para aceptar cada entrega). Por eso **no se promete menos que el plazo del acuerdo**: el tiempo ganado se usa como margen y para hacer las historias deseables, no para adelantar fechas comprometidas.

## Antes del día D (sin depender del material)

| Iteración | Contenido | Historias |
|---|---|---|
| 0. Cimientos | Base ya lista (Next.js, PostgreSQL, Docker, `/api/salud`) + shadcn/ui, Vitest, Playwright, layout del sitio y del panel, decisión de almacenamiento de fotos | — |
| 1. Acceso | Inicio de sesión, usuarios y roles, permisos del encargado, módulo `permisos.ts`, usuario dueño inicial | HU-01, HU-02, HU-03 |

## Entrega 1: Web (semanas 1 y 2)

| Semana | Contenido | Historias | Material que necesita |
|---|---|---|---|
| 1 | Datos del negocio, parámetros, app instalable, servicios, textos y galería del panel. **Se levanta el entorno de pruebas** (VPS, Coolify, dominio). Primera revisión del dueño | HU-04 a HU-09 | Logo, datos de contacto, dominio, textos base, fotos |
| 2 | Sitio público completo, reclamos y Google (SEO); carga del contenido real; capacitación. **Acta de aceptación de la entrega 1 → producción** | HU-10 a HU-18 | Condiciones y garantía |

## Entrega 2: Gestión (semanas 3 a 6)

La entrega 2 empieza sin esperar el acta de la 1 (el dueño tiene 5 días hábiles para aceptarla).

| Semana | Contenido | Historias | Material que necesita |
|---|---|---|---|
| 3 | Catálogo con variantes y precios; clientes, vehículos, búsqueda y ficha | HU-19 a HU-23 | Lista de precios, días por servicio, variantes |
| 4 | Consultas, cotización con versiones, PDF y compartir | HU-24 a HU-27 | Condiciones del PDF |
| 5 | Seguimiento de consultas; agenda: tablero, reservas, reprogramar; pagos y saldo | HU-28 a HU-32 | — |
| 6 | Recepción, órdenes del técnico, aviso, entrega, saldos, mantenimiento; deseables si hay tiempo; capacitación. **Acta de aceptación de la entrega 2** | HU-33 a HU-38 (+ HU-39 a HU-41) | Precio y contenido del mantenimiento |

**Semana 7: margen.** Absorbe material atrasado, ajustes de las revisiones y las historias deseables que no hayan entrado.

## Riesgos del calendario

- **Material atrasado.** Es el riesgo principal. Si falta algo, la semana avanza con datos de prueba y el contenido real se carga después; si falta el logo o los datos de contacto, la primera revisión pierde valor.
- **Respuestas lentas del dueño.** Una revisión sin respuesta en 3 días hábiles corre el calendario. Se le recuerda en el mismo día de la demo qué se necesita.
- **Interfaces difíciles** (agenda y PDF). Son las que menos acelera Claude Code; se muestran al dueño temprano, aunque estén incompletas.
- **Validación pendiente.** Ver la sección siguiente.

## Validación pendiente del dueño

1. Los supuestos S-1 a S-5 de `05-analisis/casos-de-uso/casos-de-uso.md`: **antes del día D** (S-3 afecta al modelo de datos).
2. Los criterios de aceptación de HU-01 a HU-18: **antes de la semana 1**, en una reunión corta (son la lista con la que se firma el acta de la entrega 1).
3. Las historias HU-19 a HU-41: **antes de la semana 3**.

## Ritmo de cada semana

- Lunes: elegir las historias de la semana.
- Cada historia: rama → plan → código → pruebas → revisión → merge a `develop` (se despliega en pruebas).
- Viernes: demo al dueño en el entorno de pruebas; él responde en máximo 3 días hábiles.
- Los pedidos nuevos van a `03-cierre-comercial/registro-de-cambios.md` (bolsa de 8 horas).
