@AGENTS.md

# TocTar Detailing — sitio web y sistema de gestión

Software a medida de YankoSoft para TocTar Detailing, un taller de detailing automotriz en Tarija, Bolivia.
Una sola app Next.js sirve el sitio público y el panel interno (PWA instalable, sin modo sin conexión).

## Antes de programar

La documentación vive en `docs/` y manda sobre cualquier supuesto:

- `docs/flujo-de-trabajo.md`: etapas del proyecto y estado actual.
- `docs/04-requerimientos/requerimientos.md`: requisitos RF, RNF y reglas de negocio RN.
- `docs/05-analisis/`: casos de uso, historias de usuario (backlog) y flujos críticos.
- `docs/06-diseno/modelo-de-datos/modelo-de-datos.md`: modelo de datos (decisiones D-n).
- `docs/06-diseno/arquitectura/arquitectura.md`: stack, entornos y estructura de carpetas.
- `docs/03-cierre-comercial/`: alcance contratado (Web + Gestión). Lo que no esté ahí es un cambio: se anota en `registro-de-cambios.md`, no se programa directamente.

## Reglas del negocio que no se negocian

- Solo el dueño cotiza. El técnico no ve precios. Una cotización enviada no cambia su precio ni su PDF.
- El cliente no usa el sistema: no reserva ni tiene cuenta. El personal registra todo.
- Sin precios ni testimonios en el sitio público.
- Todo es configurable desde el panel (servicios, precios, montos, tarifas, intervalos, espacios del taller). Nada de valores del negocio fijos en el código.
- Todo se guarda en UTC y se muestra en hora de Bolivia (`America/La_Paz`).

## Stack

Next.js 16 (App Router, Cache Components) + TypeScript · PostgreSQL 18 + Drizzle ORM · Better Auth · Zod ·
Tailwind CSS 4 + shadcn/ui · Cloudflare R2 (fotos, PDF) · `@react-pdf/renderer` · Vitest + Playwright ·
Docker (imagen `standalone`) desplegada con Coolify en un VPS.

## Comandos

```bash
docker compose up -d      # PostgreSQL de desarrollo (puerto 5432)
npm run dev               # app en http://localhost:3000
npm run build             # build de producción
npm run lint
npm run typecheck         # genera tipos de rutas y corre tsc
npm run db:generate       # crea una migración desde src/db/esquema.ts
npm run db:migrate        # aplica migraciones pendientes
npm run db:studio         # explorador de la base
docker build -t toctar:local .   # imagen igual a la de producción
```

Copiar `.env.example` a `.env` la primera vez.

## Convenciones

- Código, nombres de archivos, tablas y mensajes en **español** (sin tildes ni ñ en identificadores: `cotizacion`, `anio`). Librerías y APIs de terceros quedan como son.
- Estructura por módulo en `src/modulos/<modulo>/`: `acciones.ts` (server actions), `consultas.ts`, `esquemas.ts` (Zod), `componentes/`.
- Toda acción del servidor verifica sesión y rol con `src/lib/permisos.ts` antes de tocar datos.
- Validación con Zod, el mismo esquema en el formulario y en el servidor.
- Cada historia de usuario: rama propia → plan → implementación → pruebas → revisión → merge a `develop`.
- Las reglas de negocio (RN) llevan prueba en `tests/unit/`; los flujos críticos, en `tests/e2e/`.

## Ramas y entornos

- `develop` → entorno de pruebas (`pruebas.<dominio>`), revisión semanal del dueño.
- `main` → producción.
- La verificación de estado es `GET /api/salud` (la usan Docker, Coolify y UptimeRobot).

## Plugins de Claude Code del proyecto

Activados en `.claude/settings.json`. En una PC nueva se instalan una vez con:

```bash
claude plugin install typescript-lsp@claude-plugins-official --scope project
claude plugin install frontend-design@claude-plugins-official --scope project
claude plugin install playwright@claude-plugins-official --scope project
claude plugin install context7@claude-plugins-official --scope project
claude plugin install security-guidance@claude-plugins-official --scope project
claude plugin install commit-commands@claude-plugins-official --scope project
claude plugin install claude-md-management@claude-plugins-official --scope project
```
