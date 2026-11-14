# TocTar Detailing

Sitio web y sistema de gestión para TocTar Detailing, un taller de detailing automotriz en Tarija, Bolivia. Desarrollado
por YankoSoft.

Una sola app Next.js sirve las dos partes:

- **El sitio público** (`/`): servicios, galería, nosotros, preguntas frecuentes, contacto, garantía y reclamos y política
  de privacidad. Sin precios ni testimonios.
- **El panel** (`/panel`): una app instalable (PWA) para el dueño y los encargados. Incluye clientes y vehículos, catálogo
  con precios, cotizaciones en PDF, agenda por espacios del taller, órdenes con checklist, fotos y firma, pagos y saldos,
  mantenimientos, reclamos, el sitio web, usuarios y configuración. El cliente no usa el sistema: el personal registra todo.

## Stack

Next.js 16 (App Router, Cache Components) y TypeScript · PostgreSQL 18 con Drizzle ORM · Better Auth · Zod · Tailwind CSS 4
y shadcn/ui · Cloudflare R2 (fotos y PDF) · `@react-pdf/renderer` · Vitest y Playwright · Docker (imagen `standalone`)
desplegada con Coolify.

## Empezar

Hace falta Node 24 y Docker.

```bash
cp .env.example .env            # completar BETTER_AUTH_SECRET y DUENO_INICIAL_CONTRASENA
docker compose up -d            # PostgreSQL y RustFS (imitación local de R2)
npm install
npm run almacenamiento:preparar # crea los buckets de desarrollo (una vez)
npm run db:migrate
npm run dev                     # http://localhost:3000
```

Al arrancar, la app crea el primer dueño si la base no tiene usuarios. Para tener datos de muestra en el sitio y el panel:
`npm run datos:reiniciar` (con la app detenida).

## Verificar

```bash
npm run lint && npm run typecheck && npm test && npx knip
npm run test:e2e                # de punta a punta: recrea la base toctar_e2e, compila y levanta en :3200
```

El CI corre lo mismo en cada Pull Request, más el build y gitleaks (`.github/workflows/ci.yml`).

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Convenciones, comandos y reglas del negocio para programar | `CLAUDE.md` |
| Estado del proyecto y lo que falta para cerrar | `docs/08-desarrollo/plan-de-desarrollo.md` |
| Requisitos, reglas de negocio y alcance contratado | `docs/04-requerimientos/`, `docs/03-cierre-comercial/` |
| La especificación de cada etapa y de cada pedido del dueño | `docs/08-desarrollo/etapas/` |
| Reglas de las pantallas del panel | `docs/06-diseno/sistema-del-panel.md` |
| Servidor, despliegue y recuperación de un dueño | `docs/07-preparacion/` |
| Criterios de aceptación y actas | `docs/09-pruebas/` |
| Capacitación, perfil de Google y privacidad | `docs/10-lanzamiento/` |

## Ramas

`main` es producción, `develop` es pruebas (`pruebas.toctardetailing.com`) y cada cambio va en su propia rama, con un Pull
Request a `develop` que se une con squash. Detalle en `CLAUDE.md`, "Control de versiones".
