# Arquitectura y stack — TocTar Detailing

- **Versión:** 1.1 · 10 de octubre de 2026
- **Estado:** stack aprobado; se suma Docker

Una sola aplicación web sirve el sitio público y el panel. Corre en contenedores Docker en un servidor propio en la nube, con PostgreSQL en el mismo servidor y las fotos en un almacenamiento aparte. Así el hosting que paga TocTar queda en unos **USD 5 a 8 por mes**.

## Vista general

```mermaid
flowchart LR
    subgraph Usuarios
        V[Visitante<br/>navegador]
        P[Dueño, encargado, técnico<br/>PWA en celular o PC]
    end

    subgraph VPS[Servidor en la nube]
        PX[Proxy con https]
        APP[Contenedor app<br/>Next.js: sitio + panel + API]
        DB[(Contenedor PostgreSQL)]
        STG[Contenedores de pruebas<br/>pruebas.dominio]
    end

    R2[(Almacenamiento de fotos<br/>Cloudflare R2)]
    BK[(Respaldos diarios<br/>en R2)]
    WA[WhatsApp<br/>del teléfono]
    G[Google<br/>búsqueda y Maps]

    V --> PX
    P --> PX
    PX --> APP
    PX --> STG
    APP --> DB
    APP -- fotos y PDF --> R2
    DB -- pg_dump diario --> BK
    P -. enlace wa.me / compartir PDF .-> WA
    G -. indexa el sitio .-> APP
```

## Stack

| Capa | Elección | Por qué | Alternativa descartada |
|---|---|---|---|
| Lenguaje | TypeScript | Un solo lenguaje en todo el proyecto; los tipos atrapan errores antes de producción | — |
| Framework | **Next.js** (App Router) | Sitio público con páginas pre-generadas (rápidas y buenas para Google) y panel en la misma base de código. Muy conocido por Claude Code | Sitio y panel separados: dos proyectos que mantener |
| Interfaz | Tailwind CSS + shadcn/ui | Componentes listos (tablas, formularios, diálogos) que se ven profesionales en el celular | Diseño desde cero: más lento |
| Base de datos | **PostgreSQL** | Confiable para dinero y fechas; la restricción de exclusión evita cruces de agenda | MySQL: sin restricciones de exclusión |
| Acceso a datos | Drizzle ORM | Tipos de TypeScript desde el esquema, migraciones en SQL legible, permite SQL propio (restricción de agenda) | Prisma: más pesado y menos cómodo con SQL propio |
| Autenticación | Better Auth (usuario y contraseña) | Sesiones seguras, contraseñas con hash, sin servicios externos | Servicios de pago (Clerk, Auth0) |
| Validación | Zod | Mismas reglas en el formulario y en el servidor | — |
| Fotos | Cloudflare R2 + compresión con `sharp` al subir | 10 GB gratis y sin costo por descarga; las fotos no llenan el servidor | Guardar fotos en el VPS: el disco se llena y complica los respaldos |
| PDF | `@react-pdf/renderer` en el servidor | Genera el PDF sin un navegador oculto; la plantilla se escribe como componentes | Puppeteer: necesita Chrome en el servidor, mucha memoria |
| PWA | Manifest + service worker mínimo (sin caché de datos) | Instalable, sin modo sin conexión (Acl-10) | — |
| Pruebas | Vitest (reglas de negocio) + Playwright (flujos críticos) | Las reglas RN y los 5 flujos de secuencia quedan probados | — |
| Contenedores | **Docker**: `Dockerfile` propio de la app y `docker-compose.yml` para desarrollo | La app se construye igual en la PC, en pruebas y en producción; no depende de lo instalado en el servidor y se puede mudar de proveedor en minutos | Instalar Node y PostgreSQL a mano en el servidor: cada servidor queda distinto |
| Hosting | VPS (Hetzner o DigitalOcean, 2 GB RAM) con **Coolify** | Despliegue automático al hacer push, https automático, respaldos de PostgreSQL programados. Unos USD 5 a 8/mes | Vercel: el plan gratis no permite uso comercial y el Pro cuesta USD 20/mes; Railway: costo variable |
| Monitoreo | UptimeRobot (gratis) | Aviso por correo si el sitio se cae | — |

Las versiones exactas de cada librería se fijan en la etapa 7, al crear el proyecto, usando la última estable de ese momento.

## Costos de infraestructura para TocTar

Según el acuerdo, TocTar paga dominio y hosting al costo del proveedor; YankoSoft regala el primer año de dominio y el primer mes de hosting.

| Concepto | Costo aproximado | Quién paga |
|---|---|---|
| VPS con 2 GB de RAM | USD 5 a 8/mes | TocTar desde el mes 2 |
| Cloudflare R2 | Gratis hasta 10 GB | — |
| Dominio .com | USD 10 a 15/año | TocTar desde el año 2 |
| UptimeRobot, Coolify | Gratis | — |

Se verifica el precio real al contratar y se le informa al dueño antes (acuerdo).

## Cómo se resuelve cada punto clave

### Sitio público y Google
- Las páginas públicas se generan de antemano y se regeneran cuando el dueño guarda un cambio en el panel. Resultado: carga rápida (RNF-02) sin perder lo editable.
- URL por servicio (`/servicios/nano-ceramico`), `sitemap.xml`, `robots.txt` que excluye `/panel` (RNF-12) y datos estructurados de negocio local.

### Permisos
- Cada acción del servidor verifica la sesión y el rol antes de tocar datos (RNF-05). Un solo módulo `permisos.ts` define qué puede hacer cada rol y qué módulos tiene el encargado.
- Las reglas sensibles se prueban automáticamente: solo el dueño cotiza (RN-01), el técnico no ve precios (RN-12), la entrega con saldo requiere al dueño (RN-13).

### WhatsApp
- **Botón del sitio y avisos:** enlaces `https://wa.me/591XXXXXXXX?text=...` con el mensaje armado desde la plantilla. Abren la app con el texto escrito; la persona envía.
- **Compartir el PDF:** en el celular se usa la función de compartir del navegador (Web Share API con archivos), que abre el menú del teléfono con el PDF adjunto. Si el navegador no la soporta, se descarga el PDF.
- La API de WhatsApp queda fuera del alcance; el diseño la permite después sin cambiar las plantillas.

### Fotos
- El celular sube la foto; el servidor la redimensiona (lado mayor 1600 px), la convierte a WebP y la guarda en R2. Se guarda también una miniatura.
- Videos de consultas: hasta 50 MB y 60 segundos, sin procesar (RNF-07). Se revisa si el espacio de R2 crece demasiado.

### PDF de cotización
- Se genera al guardar la cotización y se guarda en R2; no se regenera después, así el PDF enviado nunca cambia (RN-02).

### Respaldos (RNF-06)
- PostgreSQL: copia diaria automática con Coolify a R2, se conservan 30 días.
- Fotos: R2 ya replica los datos; además, copia semanal a otro bucket.
- Antes del lanzamiento se hace una restauración de prueba y se documenta en `10-lanzamiento/`.

### Fechas y zona horaria
- Todo se guarda en UTC y se muestra en hora de Bolivia (America/La_Paz). Las fechas de agenda son fechas sin hora (D-9 del modelo).

## Entornos

| Entorno | Dónde | Para qué | Se actualiza |
|---|---|---|---|
| Desarrollo | PC de YankoSoft: la app corre con `npm run dev` y PostgreSQL y RustFS (imita a R2) en `docker compose` | Programar | Siempre |
| Pruebas | `pruebas.<dominio>` en el mismo VPS, con su propia base | Revisión semanal del dueño | Push a la rama `develop` |
| Producción | `<dominio>` | Uso real | Push a la rama `main` |

El entorno de pruebas no se indexa en Google y tiene datos ficticios.

## Docker

| Dónde | Qué corre en Docker | Cómo |
|---|---|---|
| Desarrollo | PostgreSQL y RustFS | `docker compose up -d`. La app corre fuera de Docker para que la recarga en caliente sea rápida en Windows |
| Pruebas y producción | La app y PostgreSQL | Coolify construye la imagen con el `Dockerfile` del repositorio en cada push y levanta PostgreSQL como servicio con su volumen y sus respaldos |

- **`Dockerfile` en varias etapas:** instala dependencias, compila con la salida `standalone` de Next.js y deja una imagen final chica (solo lo necesario para correr), con usuario sin privilegios.
- **Las migraciones** de la base se aplican al arrancar el contenedor, antes de aceptar tráfico.
- **Configuración por variables de entorno** (`DATABASE_URL`, claves de R2, secreto de sesión); nunca en el código ni en la imagen. Un `.env.example` documenta cuáles hacen falta.
- **Misma versión de PostgreSQL** en desarrollo y producción, fijada en `docker-compose.yml` y en Coolify.
- No hace falta Kubernetes ni nada más complejo: un solo servidor con Docker alcanza de sobra para este volumen.

## Estructura del proyecto

```
toctar/
├── CLAUDE.md                 contexto, convenciones y comandos para Claude Code
├── Dockerfile                imagen de la app para pruebas y producción
├── docker-compose.yml        PostgreSQL y RustFS para desarrollo
├── .env.example              variables de entorno necesarias
├── docs/                     esta documentación
├── src/
│   ├── app/
│   │   ├── (sitio)/          páginas públicas
│   │   ├── panel/            panel interno (requiere sesión)
│   │   └── api/              rutas para subir archivos y generar PDF
│   ├── modulos/              un directorio por módulo: clientes, catalogo, cotizaciones,
│   │                         agenda, trabajos, pagos, mantenimiento, sitio, configuracion
│   │   └── <modulo>/         acciones.ts (servidor), consultas.ts, esquemas.ts (zod), componentes/
│   ├── db/                   esquema de Drizzle y migraciones
│   ├── lib/                  autenticación, permisos, almacenamiento, whatsapp, pdf, fechas
│   └── componentes/          componentes de interfaz compartidos
└── tests/
    ├── unit/                 reglas de negocio (RN)
    └── e2e/                  flujos críticos (diagramas de secuencia)
```

## Decisiones a confirmar

- [x] Stack: Next.js + PostgreSQL + Drizzle + Better Auth, con Docker (aprobado el 10 de octubre de 2026).
- [x] Prototipo de pantallas: no se hace; las pantallas se validan en la revisión semanal del entorno de pruebas.
- [ ] Proveedor del VPS: Hetzner (más barato, servidores en Europa o EE. UU.) o DigitalOcean (más conocido). La latencia desde Bolivia es aceptable en ambos para este uso.
- [ ] Cuenta de Cloudflare a nombre de TocTar (R2 y, opcionalmente, DNS del dominio).
