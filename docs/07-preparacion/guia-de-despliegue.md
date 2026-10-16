# Guía de despliegue (etapa A3) — TocTar Detailing

> Paso a paso para dejar `pruebas.<dominio>` y `<dominio>` funcionando con despliegue automático. Meta: listo el **miércoles 21/10**, dos días antes de la demo del viernes 23.
> `<dominio>` = **`toctardetailing.com`** (elegido por el dueño el 15/10). Por ejemplo, `pruebas.<dominio>` es `pruebas.toctardetailing.com`.

## Resumen

```
GitHub (develop / main)
        │ push
        ▼
VPS (Hetzner o DigitalOcean) ── Coolify (Traefik + https automático)
        ├── app "pruebas"     ← rama develop  → https://pruebas.<dominio>  + PostgreSQL 18 propio
        └── app "producción"  ← rama main     → https://<dominio>          + PostgreSQL 18 propio
Cloudflare (cuenta de TocTar)
        ├── DNS y dominio (Registrar)
        ├── R2: toctar-fotos, toctar-fotos-pruebas (públicos con dominio propio)
        └── R2: toctar-respaldos (privado)
UptimeRobot → https://<dominio>/api/salud
```

## 0. Antes de empezar (pedir al dueño)

- [ ] **Dominio elegido** y confirmado (opciones: toctardetailing.com, toctardetailingcar.com, toctartarija.com). Revisar disponibilidad juntos.
- [ ] **Titular:** nombre completo y CI o NIT del dueño.
- [ ] **Acceso al Gmail del negocio** (`toctartarija@gmail.com`) durante la configuración: los códigos de verificación llegan ahí. Antes de usarlo, confirmar que la recuperación está en el celular del dueño.
- [ ] **Tarjeta:** el primer año de dominio y el primer mes de VPS los regala YankoSoft (acuerdo). Decidir si se cargan con la tarjeta de YankoSoft y después se cambia a la del dueño, o con la del dueño desde el inicio (se evitan olvidos en las renovaciones).

**Regla de cuentas:** todas a nombre de TocTar, con el correo del negocio y la verificación en dos pasos en el celular del dueño. YankoSoft entra como **miembro del equipo** con su propio usuario (acuerdo: "El dominio y la cuenta de hosting quedan a nombre de TocTar").

## 1. Cloudflare y el dominio (unos 30 minutos)

1. Crear la cuenta en **dash.cloudflare.com** con el correo del negocio. Activar la verificación en dos pasos.
2. **Comprar el dominio:** Domain Registration → Register Domains. Cloudflare lo vende al costo, sin recargo. Datos del titular: los del dueño. No vende `.com.bo`: si eligen ese, se compra en NIC Bolivia y después se apuntan sus DNS a Cloudflare.
3. **Invitar a YankoSoft:** Manage Account → Members → Invite, con el rol de administrador.
4. El dominio queda con su DNS en Cloudflare. Los registros se cargan en el paso 3, cuando ya esté la IP del VPS.

## 2. VPS (unos 20 minutos)

1. Crear la cuenta con el correo del negocio:
   - **Hetzner** (recomendado): es el único que da 4 GB dentro de lo que se le dijo al dueño (USD 5 a 8 al mes). A veces pide verificar identidad al abrir la cuenta, y puede tardar un día: crear la cuenta apenas haya correo y tarjeta.
   - **DigitalOcean**: más simple de abrir, pero 4 GB cuesta bastante más que lo presupuestado. Si se usa, conviene el de 2 GB más 2 GB de memoria swap en el disco.
   Revisar el precio vigente antes de contratar.
   Activar la verificación en dos pasos e invitar a YankoSoft como miembro (Hetzner: Security → Members; DigitalOcean: Team).
2. Crear el servidor:
   - **Ubuntu 24.04**, en la región más cercana a Bolivia (Hetzner: Ashburn, EE. UU. Este; DigitalOcean: Nueva York).
   - **4 GB de RAM y 2 vCPU** (Hetzner, el plan compartido más chico con 4 GB). Con 2 GB, compilar Next.js para dos entornos en la misma máquina se queda corto de memoria.
   - **Acceso con clave SSH** de la PC de YankoSoft, no con contraseña: `ssh-keygen -t ed25519` y pegar el contenido de `~/.ssh/id_ed25519.pub`.
   - **Copias del servidor activadas** (Hetzner Backups o DigitalOcean Backups): un extra chico que salva el servidor entero.
3. **Firewall del proveedor:** permitir solo 22 (SSH), 80 y 443. Abrir el 8000 (panel de Coolify) solo mientras se configura y cerrarlo en el paso 4.8. **El 3000 nunca se abre:** la app solo se alcanza por el proxy (arquitectura, "Docker").
4. Anotar la **IP pública** del servidor.

## 3. DNS (5 minutos, en Cloudflare)

En el dominio → DNS → Records, crear registros **A** apuntando a la IP del VPS:

| Nombre | Destino | Proxy |
|---|---|---|
| `@` | IP del VPS | **DNS only** (nube gris) |
| `www` | IP del VPS | DNS only |
| `pruebas` | IP del VPS | DNS only |
| `coolify` | IP del VPS | DNS only |

**Proxy apagado (nube gris), a propósito.** Coolify saca los certificados https solo, y el límite de reclamos (HU-16) usa la IP real que pone Traefik en `x-real-ip`. Con el proxy de Cloudflare encendido, todos los visitantes llegarían con IP de Cloudflare y compartirían el mismo límite.

Comprobar desde la PC: `nslookup pruebas.<dominio>` devuelve la IP del VPS.

## 4. Coolify (unos 30 minutos)

1. Entrar al servidor: `ssh root@<IP>`. Actualizar con `apt update && apt upgrade -y`.
2. Instalar Coolify con el script oficial (revisar el comando vigente en coolify.io/docs):
   `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash`
3. Abrir `http://<IP>:8000` y crear el usuario administrador **en el momento**: el primero que entra se queda con el servidor. Es la cuenta de YankoSoft, que administra el servidor, con contraseña fuerte y verificación en dos pasos.
4. Settings → **Instance's Domain**: `https://coolify.<dominio>`. Coolify saca su certificado.
5. **Conectar GitHub:** Sources → + Add → GitHub App, instalada solo en el repositorio `albertoamas/toctar`. Es privado y así Coolify lo puede leer y desplegar en cada push.
6. Crear el proyecto **TocTar** con dos entornos: `pruebas` y `produccion`.
7. Probar que entra por `https://coolify.<dominio>`.
8. **Cerrar el puerto 8000** en el firewall del proveedor.

## 5. Bases de datos (en Coolify, 10 minutos)

En cada entorno: + New → Database → **PostgreSQL**, con la imagen `postgres:18-alpine` (la misma versión que en desarrollo).

- Nombre: `toctar-db-pruebas` o `toctar-db-produccion`.
- **Sin puerto público** (no marcar "Make it publicly available").
- Copiar la **URL interna** (`postgres://…@<servicio>:5432/postgres`): es el `DATABASE_URL` de la app de ese entorno.

## 6. Almacenamiento R2 (en Cloudflare, 20 minutos)

1. R2 → crear tres buckets:
   - **`toctar-fotos`** para producción;
   - **`toctar-fotos-pruebas`**, para que lo que se pruebe no mezcle fotos con producción;
   - **`toctar-respaldos`**, privado, para los respaldos de la base.
2. En cada bucket de fotos: Settings → **Custom Domains** → `fotos.<dominio>` y `fotos-pruebas.<dominio>`. Cloudflare crea el registro DNS. No usar la dirección `r2.dev`: está limitada y no es para producción.
3. R2 → Manage API Tokens → crear **dos tokens** con "Object Read & Write":
   - uno para la app, limitado a los dos buckets de fotos;
   - otro para los respaldos, limitado a `toctar-respaldos`.
   Copiar el Access Key ID y el Secret apenas se crean: el secret se muestra una sola vez.
4. El endpoint es `https://<id-de-cuenta>.r2.cloudflarestorage.com`. El id de la cuenta aparece en la página de R2.

## 7. Las dos apps (en Coolify, 20 minutos cada una)

En cada entorno: + New → Application → el repositorio desde la GitHub App.

| Ajuste | Pruebas | Producción |
|---|---|---|
| Rama | `develop` | `main` |
| Build Pack | Dockerfile | Dockerfile |
| Domains | `https://pruebas.<dominio>` | `https://<dominio>,https://www.<dominio>` (www redirige) |
| Puerto expuesto | 3000 | 3000 |
| **Ports Mappings** | **vacío** (no publicar el 3000 en el VPS) | vacío |
| Health check | `/api/salud`, puerto 3000 | ídem |
| Despliegue automático | sí (webhook de la GitHub App) | sí |

**Variables de entorno** (Environment Variables). Las marcadas con *build* también se tildan como **Build Variable**:

| Variable | Pruebas | Producción |
|---|---|---|
| `DATABASE_URL` | URL interna de `toctar-db-pruebas` | URL interna de `toctar-db-produccion` |
| `BETTER_AUTH_SECRET` | una nueva (ver abajo) | **otra distinta** |
| `BETTER_AUTH_URL` | `https://pruebas.<dominio>` | `https://<dominio>` |
| `SITIO_URL` (*build*) | `https://pruebas.<dominio>` | `https://<dominio>` |
| `SITIO_INDEXABLE` (*build*) | `false` | `true` |
| `DUENO_INICIAL_USUARIO` | `dueno` | `dueno` |
| `DUENO_INICIAL_NOMBRE` | `Dueño de prueba` | nombre real del dueño |
| `DUENO_INICIAL_CONTRASENA` | una temporal | una temporal, que el dueño cambia al entrar |
| `S3_ENDPOINT` | `https://<id>.r2.cloudflarestorage.com` | ídem |
| `S3_REGION` | `auto` | `auto` |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | token de la app | ídem |
| `S3_BUCKET` | `toctar-fotos-pruebas` | `toctar-fotos` |
| `S3_URL_PUBLICA` | `https://fotos-pruebas.<dominio>` | `https://fotos.<dominio>` |

- **Secreto nuevo:** `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- **Los secretos no se versionan ni se pegan en chats:** solo en Coolify y en el gestor de contraseñas de YankoSoft.
- Al primer arranque, la app aplica las migraciones y crea el dueño inicial (`src/lib/arranque.ts`). Después se pueden borrar las tres `DUENO_INICIAL_*`.

**Primer despliegue:** Deploy en pruebas → mirar los logs → abrir `https://pruebas.<dominio>/api/salud` (tiene que responder 200).

**Producción:** se despliega recién con el primer merge `develop` → `main`, al aceptarse la Entrega 1. Hasta entonces puede quedar creada pero sin desplegar, o mostrando la versión actual de `main`.

## 8. Respaldos (en Coolify, 10 minutos)

1. Settings → S3 Storages → + Add: el endpoint de R2, el bucket `toctar-respaldos` y el token de respaldos. Probar con "Validate".
2. En `toctar-db-produccion` → Backups:
   - frecuencia diaria (`0 4 * * *`, las 4:00 UTC, que son las 0:00 en Bolivia);
   - "Save to S3" con el almacenamiento anterior;
   - conservar **30 días** (RNF-06).
3. Pruebas: respaldo semanal y solo local alcanza (datos ficticios).
4. **Probar una restauración una vez:** bajar un respaldo y cargarlo en una base de desarrollo. Un respaldo que nunca se restauró no está probado.

## 9. Vigilancia (5 minutos)

- **UptimeRobot** (cuenta gratis con el correo del negocio, alertas también al correo de YankoSoft): monitor HTTP(s) a `https://<dominio>/api/salud` cada 5 minutos. Otro a `https://pruebas.<dominio>/api/salud`.
- **GitHub:** proteger `main` y `develop`: Settings → Branches → exigir Pull Request y prohibir push forzado. YankoSoft lo puede hacer con `gh`.

## 10. Comprobar (criterio de salida de A3)

- [ ] `https://pruebas.<dominio>` abre el sitio con candado (https) y el dueño de prueba puede ingresar.
- [ ] Un push a `develop` se despliega solo en pocos minutos.
- [ ] `/api/salud` responde 200 en pruebas.
- [ ] Subir una foto en el panel de pruebas: se ve desde `fotos-pruebas.<dominio>`.
- [ ] `https://pruebas.<dominio>/robots.txt` bloquea todo (`Disallow: /`): el entorno de pruebas no se indexa.
- [ ] El puerto 3000 no responde desde afuera: `curl http://<IP>:3000` falla.
- [ ] Instalar la app en un celular Android y en un iPhone (HU-06, pendiente desde B2).
- [ ] Lighthouse móvil en pruebas (RNF-02) y la prueba de resultados enriquecidos de Google con la portada (HU-18).

## Datos que se guardan (fuera del repositorio)

En el gestor de contraseñas de YankoSoft, en una entrada "TocTar":
- IP del VPS y acceso SSH;
- usuario de Coolify;
- los dos `BETTER_AUTH_SECRET`;
- los tokens de R2;
- las contraseñas iniciales.

Al dueño se le entrega una hoja con sus cuentas: Cloudflare, VPS y UptimeRobot, todas con su correo.
