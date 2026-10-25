# CI/CD

Cómo se verifica y se publica cada cambio (25/10/2026). El workflow está en `.github/workflows/ci.yml` y las actualizaciones de dependencias en `.github/dependabot.yml`.

## Resumen

```
PR a develop o main ──► GitHub Actions: verificar + E2E + secretos (unos 10 min)
                         │ los tres son obligatorios para unir (protección de ramas)
                         ▼
Merge a develop ──► Actions vuelve a verificar ──► pide el despliegue a Coolify ──► pruebas.toctardetailing.com
Merge a main    ──► Actions vuelve a verificar ──► pide el despliegue a Coolify ──► toctardetailing.com
```

- **GitHub Actions decide** si un cambio se publica: solo lo que pasó las tres verificaciones.
- **Coolify ejecuta** el despliegue como hasta ahora: construye la imagen con el Dockerfile, aplica el https, cambia el contenedor solo si el nuevo pasa la verificación de salud (si no, deja el anterior) y guarda las imágenes para volver atrás. Los respaldos de las bases no cambian.
- **Docker Compose** sigue siendo solo para desarrollo (`docker-compose.yml`). En el servidor, cada app se construye con su Dockerfile y cada base es un recurso aparte de Coolify, con sus respaldos.

## Las verificaciones

| Job | Qué hace | Tiempo aproximado |
|---|---|---|
| **Verificar** | `npm ci`, lint, tipos (`typecheck`), pruebas unitarias, código sin uso (`knip`) y `npm run build` | 3 a 4 min |
| **E2E** | PostgreSQL 18 y RustFS como servicios (los mismos de `docker-compose.yml`), crea los buckets y corre `npx playwright test` contra el build de producción | 6 a 8 min |
| **Secretos** | gitleaks revisa todo el historial: si una clave o contraseña llegó a un commit, falla | menos de 1 min |

- **Variables:** el workflow usa valores de prueba (no son secretos) para lo que en la PC sale de `.env`. Ningún paso del CI se conecta a pruebas ni a producción.
- **Pruebas intermitentes:** en CI, una prueba E2E que falla se reintenta hasta dos veces. Si pasa al reintentar, el reporte la marca como **flaky**: hay que arreglarla, no ignorarla. Si falla las tres veces, el job queda en rojo y se suben los rastros (`e2e-rastros`, 7 días) para verlos con `npx playwright show-trace`.
- **Navegador:** en Linux se usa el Chromium de Playwright (en Windows, el Chrome instalado: ver `playwright.config.ts`). Se guarda entre corridas.
- **Node:** la versión 24, la misma de la imagen de producción.
- **Costo:** el repositorio es privado; el plan gratuito de GitHub trae 2000 minutos de Actions al mes. Cada PR y su merge gastan unos 20 a 25 minutos en total.

## Protección de ramas

`develop` y `main` exigen Pull Request y que pasen **Verificar**, **E2E** y **Secretos** (además de no permitir push forzado ni borrado; ver `servidor.md`). Un PR en rojo no se puede unir.

## Activar el despliegue desde GitHub (una sola vez)

Mientras no se active, el job **Desplegar en Coolify** no corre y Coolify sigue desplegando solo en cada push. Para activarlo, en este orden (YankoSoft; los valores secretos no pasan por el chat ni por el repositorio):

1. **Coolify → Settings → Advanced:** encender **API Access**. En **Keys & Tokens → API tokens**, crear un token `github-actions` con permiso **deploy** (solo ese). Copiarlo al gestor de contraseñas.
2. **GitHub → el repositorio → Settings → Secrets and variables → Actions:**
   - **Secrets → New repository secret:** `COOLIFY_TOKEN` con el token del paso 1.
   - **Variables → New repository variable:**
     - `COOLIFY_UUID_PRUEBAS`: el UUID de la app `toctar-pruebas` (en Coolify, está en la dirección de la app y en su pestaña **Webhooks**; no es secreto).
     - `COOLIFY_UUID_PRODUCCION`: el de `toctar-produccion`.
3. **Coolify → cada app → Advanced:** apagar **Auto Deploy**. Desde ahí, Coolify solo despliega cuando se lo pide GitHub Actions (o a mano).
4. **GitHub → Variables:** crear `COOLIFY_DESPLIEGUE` con el valor `activo`.
5. **Probar:** unir un PR chico a `develop` y mirar en **Actions** que el job **Desplegar en Coolify** termine en verde, y en Coolify que el despliegue lo pidió la API.

Para apagarlo (por ejemplo, durante un problema con Coolify): cambiar `COOLIFY_DESPLIEGUE` a otro valor y volver a encender **Auto Deploy** en Coolify.

## Qué hacer si…

- **El CI falla en un PR:** abrir el job en rojo en la pestaña **Actions**, corregir en la misma rama y subir. El CI vuelve a correr solo.
- **Una prueba E2E sale "flaky":** el PR se puede unir (pasó al reintentar), pero se abre una tarea para arreglarla.
- **Un despliegue falla:** el job **Desplegar en Coolify** queda en rojo y en línea sigue la versión anterior. Ver los logs del despliegue en Coolify. Para volver a una versión anterior: Coolify → la app → **Deployments** → **Rollback**.
- **Una urgencia en producción:** rama `arreglo/...` desde `main`, PR y merge; el CI tarda unos 10 minutos. Si Actions no estuviera disponible, se puede desplegar a mano desde Coolify (**Deploy**), sabiendo que ese despliegue no pasó por el CI.

## Dependabot

- **npm:** los lunes, un PR a `develop` con las actualizaciones menores y de parches juntas; cada versión mayor en su propio PR.
- **Acciones de GitHub y la imagen de Node:** una vez al mes. Una versión mayor de Node no se propone: se decide a mano.
- Pasan por el mismo CI y se unen como cualquier PR (revisión y "Aprobado"). Una versión mayor se revisa con su guía de migración antes de unirla.
