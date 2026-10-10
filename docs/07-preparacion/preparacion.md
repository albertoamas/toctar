# Preparación — TocTar Detailing

- **Inicio:** 10 de octubre de 2026
- **Meta de la etapa:** proyecto base desplegado ("hola mundo" en producción) con despliegue automático.

## Hecho en la PC de desarrollo

- [x] Proyecto Next.js 16.4 + React 19.3 + TypeScript + Tailwind 4 (`create-next-app`), con salida `standalone`.
- [x] Drizzle ORM 0.45 + `pg` + Zod 4; `drizzle.config.ts` lee `.env` con `@next/env`.
- [x] `docker-compose.yml` con PostgreSQL 18 para desarrollo.
- [x] `Dockerfile` en varias etapas (Node 24 LTS, usuario sin privilegios, verificación de estado). Imagen de unos 300 MB, probada contra la base local.
- [x] `GET /api/salud`: responde 200 si la app y la base están arriba; 503 si la base no responde.
- [x] `.env.example`, `.gitignore`, `.dockerignore`.
- [x] `CLAUDE.md` con contexto, reglas del negocio, comandos y convenciones.
- [x] Repositorio Git local (rama `main`) con `.gitattributes` para saltos de línea LF.
- [ ] Primer commit y rama `develop`.

## Pendiente

| # | Tarea | Necesita | Responsable |
|---|---|---|---|
| 1 | Instalar `gh` y crear el repositorio privado en GitHub | `winget install GitHub.cli` + `gh auth login` | YankoSoft |
| 2 | Elegir proveedor del VPS (Hetzner o DigitalOcean) y contratarlo | Decisión + tarjeta | YankoSoft (1er mes regalado) |
| 3 | Instalar Coolify en el VPS y conectarlo al repositorio | VPS | YankoSoft |
| 4 | Comprar el dominio y apuntarlo al VPS (`<dominio>` y `pruebas.<dominio>`) | Nombre elegido por el dueño | YankoSoft (1er año regalado) |
| 5 | Crear en Coolify los dos entornos: `develop` → pruebas, `main` → producción, cada uno con su PostgreSQL 18 | Pasos 1 a 4 | YankoSoft |
| 6 | Cuenta de Cloudflare a nombre de TocTar: bucket R2 de fotos y bucket de respaldos | Correo del dueño | Dueño + YankoSoft |
| 7 | Respaldos diarios de PostgreSQL en Coolify hacia R2 (30 días) | Pasos 5 y 6 | YankoSoft |
| 8 | UptimeRobot vigilando `/api/salud` de producción | Paso 5 | YankoSoft |
| 9 | Aplicar las migraciones al arrancar el contenedor | La primera migración (etapa 8) | YankoSoft |

## Decisiones tomadas en esta etapa

- **Node 24 LTS en la imagen.** Es la versión con soporte largo. En la PC de desarrollo está Node 26; no hay diferencias que afecten al proyecto.
- **Almacenamiento de fotos en desarrollo:** la arquitectura preveía MinIO, pero dejó de publicar imágenes de Docker. Se decide cuando se programe la subida de fotos (etapa 8). Opciones: un bucket R2 de desarrollo (gratis, igual a producción) o un emulador S3 en Docker (RustFS, Garage o SeaweedFS).
- **Verificación de Meta Business: no hace falta.** La API de WhatsApp está fuera del alcance; el sistema usa enlaces `wa.me` y la función de compartir del celular.
