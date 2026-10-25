@AGENTS.md

# TocTar Detailing — sitio web y sistema de gestión

Software a medida de YankoSoft para TocTar Detailing, un taller de detailing automotriz en Tarija, Bolivia.
Una sola app Next.js sirve el sitio público y el panel interno (PWA instalable, sin modo sin conexión).

## Antes de programar

La documentación vive en `docs/` y manda sobre cualquier supuesto:

- `docs/flujo-de-trabajo.md`: etapas del proyecto y estado actual.
- `docs/08-desarrollo/plan-de-desarrollo.md`: fases, calendario y estado. **Antes de programar una historia, lee la especificación de su etapa en `docs/08-desarrollo/etapas/`** (reglas, tablas, pantallas, acciones, textos y pruebas). Si no existe, escríbela primero con `_plantilla.md`.
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

## Identidad visual

Manual de marca, tokens y componentes en el Design System https://claude.ai/artifact/FcABnS1tF3WgZMz9v3e5BT (resumen en `docs/06-diseno/identidad-visual.md`). En el código:

- Usa los tokens de `src/app/globals.css` (`bg-rojo`, `text-rojo-texto`, `text-tinta-suave`, `bg-superficie`…), nunca colores sueltos.
- Sitio público y pantalla de ingreso siempre en oscuro (`data-theme="oscuro"`); panel en claro.
- El rojo de marca no va como texto chico: para eso existe `rojo-texto`. Los titulares van en `font-heading italic`.
- El único ángulo diagonal es 60°. Los logos están en `public/marca/`: no se recolorean, se elige la variante.
- Logo con lema solo desde 360 px de ancho (horizontal) o 320 px (vertical); más chico, la variante `-sin-lema` y el lema como texto (`<p className="tt-lema">`).

## Stack

Next.js 16 (App Router, Cache Components) + TypeScript · PostgreSQL 18 + Drizzle ORM · Better Auth · Zod ·
Tailwind CSS 4 + shadcn/ui · Cloudflare R2 (fotos, PDF) · `@react-pdf/renderer` · Vitest + Playwright ·
Docker (imagen `standalone`) desplegada con Coolify en un VPS.

## Comandos

```bash
docker compose up -d      # PostgreSQL (5432) y RustFS, imitación de R2 (API 9000, consola 9001)
npm run almacenamiento:preparar   # crea los buckets de desarrollo, público y privado (una vez)
npm run dev               # app en http://localhost:3000; desde el celular, en la misma red: http://<IP de la PC>:3000
npm run build             # build de producción
npm run lint
npm run typecheck         # genera tipos de rutas y corre tsc
npm test                  # pruebas unitarias (Vitest, tests/unit)
npx knip                  # código sin uso (también lo corre el CI)
npm run test:e2e          # pruebas de punta a punta (Playwright, tests/e2e; recrea la base toctar_e2e, compila y levanta en :3200)
npm run db:generate -- --name <nombre>   # crea una migración desde src/db/esquema/
npm run db:migrate        # aplica migraciones pendientes
npm run db:studio         # explorador de la base
npm run db:reiniciar-local   # deja vacías la base y los buckets de desarrollo (solo si apuntan a localhost)
npm run datos:demo        # datos de demostración (sitio y panel) en una base recién migrada; fotos en material/fotos-demo
docker build -t toctar:local .   # imagen igual a la de producción
```

Copiar `.env.example` a `.env` la primera vez y completar `BETTER_AUTH_SECRET` y `DUENO_INICIAL_CONTRASENA`. Al arrancar, la app crea el primer dueño si la base no tiene usuarios (`src/lib/arranque.ts`); en producción también aplica las migraciones.

## Convenciones

- Código, nombres de archivos, tablas y mensajes en **español** (sin tildes ni ñ en identificadores: `cotizacion`, `anio`). Librerías y APIs de terceros quedan como son.
- Componentes de shadcn/ui en `src/componentes/ui/` (se agregan con `npx shadcn@latest add <nombre>`); componentes propios del sitio y del panel en `src/componentes/sitio/` y `src/componentes/panel/`.
- Rutas: sitio público en `src/app/(sitio)/`, panel en `src/app/panel/`.
- En Windows, Playwright usa el Google Chrome instalado: Control de aplicaciones bloquea el Chromium de Playwright.
- Estructura por módulo en `src/modulos/<modulo>/`: `acciones.ts` (server actions), `consultas.ts`, `esquemas.ts` (Zod), `componentes/`.
- Toda página y acción del panel verifica la sesión con `src/lib/sesion.ts` (`exigirSesion`) y el rol o módulo con `src/lib/permisos.ts`. El layout del panel NO protege a sus páginas y `src/proxy.ts` solo redirige rápido.
- La sesión se lee siempre dentro de `<Suspense>` (Cache Components): leerla fuera rompe el build.
- **Seguridad:** las funciones de `auth.api.*` del plugin admin (`createUser`, `banUser`, `setUserPassword`…) solo verifican permisos si reciben `headers: await headers()`. Sin headers actúan como el sistema: solo se usan así en `src/lib/arranque.ts`.
- **Seguridad:** Better Auth se usa solo desde el servidor; no hay ruta `/api/auth` (expondría su API pública). Su límite de intentos no cubre el ingreso del panel: el límite es propio (`src/modulos/acceso/`).
- Las acciones que reciben datos sueltos (no un formulario) también los validan con Zod: cualquiera puede llamarlas.
- Datos de clientes (fotos de reclamos y, más adelante, documentos) van al bucket privado (`guardarFoto(..., { privado: true })`) y se muestran con `urlsFotoPrivada`. El público es solo para lo que muestra el sitio.
- Validación con Zod, el mismo esquema en el formulario y en el servidor.
- Cada historia de usuario: rama propia → plan → implementación → pruebas → Pull Request revisado → merge a `develop` (ver "Control de versiones"). Skills y revisiones de cada paso (`context7`, `frontend-design`, `pantallas-panel` para el panel, `pdf`, `code-review`, `security-review`): `docs/08-desarrollo/plan-de-desarrollo.md`, "Cómo se trabaja cada historia".
- Las reglas de negocio (RN) llevan prueba en `tests/unit/`; los flujos críticos, en `tests/e2e/`.

## Control de versiones

Repositorio privado: `github.com/albertoamas/toctar`.

| Rama | Para qué | Se despliega en |
|---|---|---|
| `main` | Lo que está en producción. Solo recibe merges desde `develop` al aceptarse una entrega o una corrección | `<dominio>` |
| `develop` | Integración; lo que ve el dueño en la revisión semanal | `pruebas.<dominio>` |
| `hu-XX-descripcion` | Una historia de usuario (ej. `hu-01-iniciar-sesion`). Sale de `develop` y vuelve por Pull Request | — |
| `arreglo/descripcion` | Corrección urgente en producción. Sale de `main` y se une a `main` y a `develop` | — |

- Nunca se hace commit directo en `main` ni en `develop`: todo entra por Pull Request, revisado por el desarrollador antes del merge.
- Merge con **squash** desde las ramas de historia (un commit por historia en `develop`); merge normal de `develop` a `main`.
- Commits en español, en imperativo y con el tipo adelante: `feat: agrega inicio de sesión con usuario y contraseña (HU-01)`. Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`.
- Un commit = un cambio con sentido propio. No mezclar formato, refactor y funcionalidad.
- Cada entrega aceptada se marca con una etiqueta: `v1.0.0` (entrega 1, Web), `v2.0.0` (entrega 2, Gestión); correcciones posteriores `v1.0.1`, etc.
- Nunca se versionan secretos. Si una clave llega a un commit, se cambia la clave (borrarla del historial no basta).

## Entornos

- **CI/CD:** cada PR pasa por GitHub Actions (lint, tipos, unitarias, knip, build, E2E y gitleaks) y no se une en rojo; al unir, Actions pide el despliegue a Coolify (`docs/07-preparacion/ci-cd.md`).
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
