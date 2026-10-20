# Guía de despliegue (etapa A3) — TocTar Detailing

> Paso a paso para dejar `pruebas.<dominio>` y `<dominio>` funcionando con despliegue automático. Meta: listo el **miércoles 21/10**, dos días antes de la demo del viernes 23.
> `<dominio>` = **`toctardetailing.com`** (elegido por el dueño el 15/10). Por ejemplo, `pruebas.<dominio>` es `pruebas.toctardetailing.com`.

## Resumen

```
GitHub (develop / main)
        │ push
        ▼
VPS (Hetzner CX23, Alemania) ── Coolify (Traefik + https automático)
        ├── app "pruebas"     ← rama develop  → https://pruebas.<dominio>  + PostgreSQL 18 propio
        └── app "producción"  ← rama main     → https://<dominio>          + PostgreSQL 18 propio
Cloudflare (cuenta de TocTar)
        ├── DNS y dominio (Registrar)
        ├── R2: toctar-fotos, toctar-fotos-pruebas (públicos con dominio propio)
        ├── R2: toctar-privado, toctar-privado-pruebas (privados: fotos de reclamos y fotos y videos de consultas)
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
   - **Hetzner** (recomendado): el plan **CX23** (2 vCPU, 4 GB, 40 GB) en Alemania es el único con 4 GB dentro de lo que se le dijo al dueño. A veces pide verificar identidad al abrir la cuenta, y puede tardar un día: crear la cuenta apenas haya correo y tarjeta. Comparación completa en "Costos y proveedor" al final.
   - **Si el CX23 figura como no disponible:** Contabo Cloud VPS 10 en EE. UU., con un precio parecido y más memoria, pero más lento y con peor soporte. Antes de pagar, confirmar el precio final y si cobra instalación.
   Revisar el precio vigente antes de contratar.
   Activar la verificación en dos pasos e invitar a YankoSoft como miembro (Hetzner: Security → Members).
2. Crear el servidor:
   - **Ubuntu 24.04**, en **Nuremberg** (216 ms desde Tarija, la mejor de Hetzner en Europa). Los planes de Hetzner en EE. UU. subieron en 2026: 4 GB en Ashburn cuesta unos USD 37 al mes.
   - **4 GB de RAM y 2 vCPU** (CX23). Con 2 GB, compilar Next.js para dos entornos en la misma máquina se queda corto de memoria.
   - **Acceso con clave SSH** de la PC de YankoSoft, no con contraseña: `ssh-keygen -t ed25519` y pegar el contenido de `~/.ssh/id_ed25519.pub`.
   - **Copias del servidor activadas** (Hetzner Backups, 20 % del precio del servidor): salvan el servidor entero.
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

1. R2 → crear cinco buckets:
   - **`toctar-fotos`** para producción, público: lo que muestra el sitio (servicios, galería, logo);
   - **`toctar-fotos-pruebas`**, igual para pruebas, para que lo que se pruebe no mezcle fotos con producción;
   - **`toctar-privado`** y **`toctar-privado-pruebas`**, **privados**: datos de clientes, como las fotos de los reclamos. Sin dominio propio ni acceso público: el panel las muestra con enlaces firmados que vencen a los 15 minutos;
   - **`toctar-respaldos`**, privado, para los respaldos de la base.
2. En cada bucket de fotos: Settings → **Custom Domains** → `fotos.<dominio>` y `fotos-pruebas.<dominio>`. Cloudflare crea el registro DNS. No usar la dirección `r2.dev`: está limitada y no es para producción.
3. R2 → Manage API Tokens → crear **dos tokens** con "Object Read & Write":
   - uno para la app, limitado a los buckets de fotos y los privados (los cuatro);
   - otro para los respaldos, limitado a `toctar-respaldos`.
   Copiar el Access Key ID y el Secret apenas se crean: el secret se muestra una sola vez.
4. El endpoint es `https://<id-de-cuenta>.r2.cloudflarestorage.com`. El id de la cuenta aparece en la página de R2.
5. **CORS en los dos buckets privados:** los videos de las consultas suben directo desde el navegador (una acción del servidor acepta hasta 6 MB), con un permiso firmado de 10 minutos. Settings → **CORS Policy** → Add:
   - `toctar-privado`: origen `https://<dominio>`; `toctar-privado-pruebas`: origen `https://pruebas.<dominio>`.
   ```json
   [{ "AllowedOrigins": ["https://<dominio>"], "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["content-type"], "MaxAgeSeconds": 3600 }]
   ```
   Sin esto, al agregar un video a una consulta aparece "No se pudo subir el video".

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
| `S3_BUCKET_PRIVADO` | `toctar-privado-pruebas` | `toctar-privado` |
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

## Costos y proveedor (investigado el 15/10/2026)

### Dominio `toctardetailing.com` (Cloudflare Registrar)

- **Precio:** Cloudflare cobra lo que cobra el registro, sin recargo. Hoy son unos **USD 10,46 al año**, y la renovación cuesta lo mismo.
- **Desde el 1/11/2026** Verisign sube el precio mayorista y el total pasa a unos **USD 11,15 al año**. Conviene comprar antes.
- **Se paga una vez al año** y se renueva solo. Se pueden pagar varios años juntos, hasta 10.
- **Primer año:** lo regala YankoSoft. Desde el segundo, lo paga TocTar.

### Servidor: opciones medidas desde Tarija

Latencia medida desde la PC de YankoSoft en Tarija (ping, 15/10). Precios por mes, sin impuestos.

| Opción | Plan | Precio aprox. | Latencia | Comentario |
|---|---|---|---|---|
| **Hetzner Alemania** (recomendado) | CX23: 2 vCPU, 4 GB, 40 GB, 20 TB de tráfico | **€5,49 + IPv4 (unos USD 7)** | 216 ms | Confiable, se cobra por hora, sin permanencia. A veces el plan figura como no disponible |
| Hetzner EE. UU. | CPX21: 3 vCPU, 4 GB | unos USD 37 | 118 ms | Subió en 2026: fuera de presupuesto |
| Contabo EE. UU. | Cloud VPS 10: 4 vCPU, 8 GB | unos USD 5 a 6 (confirmar) | ~120 ms (estimada) | Barato y con mucha memoria; más lento y soporte flojo. Plan B |
| Hostinger | KVM 1 / KVM 2 | USD 6,49 / 8,99 en promoción | — | La promoción exige pagar 24 meses adelantados; renueva a USD 11,99 / 14,99 |
| Vultr Santiago | 2 vCPU, 4 GB | unos USD 24 a 30 | **71 ms** | La más rápida desde Bolivia, pero cuesta 3 o 4 veces lo presupuestado |
| Vultr São Paulo | 2 vCPU, 4 GB | unos USD 30 | 111 ms | Ídem |
| DigitalOcean Nueva York | 2 vCPU, 4 GB | USD 24 | sin respuesta al ping | Sin centros en Sudamérica; fuera de presupuesto |

**Por qué Hetzner Alemania a pesar de la distancia:**
- Es la única opción confiable dentro de USD 5 a 8.
- La latencia pesa menos de lo que parece. Las páginas del sitio salen de la caché. Las fotos se sirven desde Cloudflare (R2), que está cerca del visitante. Al servidor solo va el HTML y el uso del panel.
- Si el uso del panel en el taller se siente lento, se puede migrar a Vultr Santiago con el dueño de acuerdo en pagar más. Es mover la base y repetir esta guía.

**Pago desde Bolivia:** antes de contratar, probar que la tarjeta acepte compras internacionales en dólares o euros. Algunos bancos las limitan.

