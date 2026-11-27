# Imagen de la app para pruebas y producción (Coolify la construye en cada push).
# Varias etapas: dependencias → compilación → imagen final chica con la salida standalone.

# Versión exacta: así un cambio de Node o de Alpine entra por un PR de Dependabot (y pasa por el CI), no sin avisar
FROM node:24.22.1-alpine3.24 AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# El commit que se compila (Coolify lo pasa con "Include Source Commit in Build"): es la versión que el panel compara
# para avisar que hay una nueva (pedido 39, next.config.ts). Sin él, la versión es la fecha del build.
ARG SOURCE_COMMIT
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
# Migraciones de la base: se aplican al arrancar (src/lib/arranque.ts)
COPY --from=build --chown=nextjs:nodejs /app/src/db/migraciones ./migraciones

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/salud || exit 1

CMD ["node", "server.js"]
