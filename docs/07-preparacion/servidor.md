# Registro del servidor — TocTar Detailing

Qué tiene el VPS de producción y pruebas, cómo se configuró y cómo se mantiene. Se actualiza cada vez que se toca la máquina. Paso a paso del despliegue completo: `guia-de-despliegue.md`.

> **Nada secreto en este archivo.** La frase de la clave SSH, las contraseñas y los tokens van solo en el gestor de contraseñas de YankoSoft. La IP sí está aquí: es pública.

## Datos

| | |
|---|---|
| Proveedor | Hetzner Cloud, cuenta del negocio (`toctartarija@gmail.com`), proyecto **TocTar**. YankoSoft entra con su cuenta personal como miembro **Admin** |
| Nombre | `toctar` |
| Plan | **CX23**, Cost-Optimized, x86: 2 vCPU, 4 GB de RAM, 40 GB de disco |
| Ubicación | Nuremberg (nbg1), Alemania |
| Sistema | **Ubuntu 26.04 LTS**, con soporte hasta 2031 |
| IPv4 | `5.75.168.229` |
| IPv6 | `2a01:4f8:1c1f:8bcc::1` (bloque `2a01:4f8:1c1f:8bcc::/64`) |
| Creado | 23/10/2026 |
| Protecciones | **Delete protection** y **Rebuild protection** activadas. Para borrar o reinstalar, primero hay que desactivarlas a mano en **Settings** |
| Backups de Hetzner | **Desactivados**: lo decide el dueño (cuestan un 20 % del plan). La base se respalda igual a R2 (guía, paso 8) |
| Costo | Unos USD 7 al mes (plan USD 6,49 + IPv4), sin impuestos. Con backups, unos USD 8,50 |

### Por qué este plan

- **Cost-Optimized y no Regular Performance:** en el ajuste de precios de Hetzner del 15/06/2026, la línea CPX ("Regular Performance") subió a unos USD 23 al mes por 4 GB, y la CX apenas a USD 6,49. TocTar no necesita más: las fotos se sirven desde Cloudflare R2, el sitio sale de caché y el panel lo usan unas 3 personas. Lo que más memoria pide es compilar al desplegar, y para eso está el swap.
- **Nuremberg:** la mejor latencia de Hetzner desde Tarija en Europa (unos 216 ms). En EE. UU. Hetzner no ofrece la línea Cost-Optimized.
- **Ubuntu 26.04:** LTS, soportado por el instalador de Coolify (todas las LTS) y por Docker. Si Coolify fallara por la versión, con el servidor vacío se reinstalaba con 24.04 (Rebuild).
- **Si queda chico:** **Rescale** a CX33 (8 GB) desde el panel, en minutos y sin reinstalar. Ojo: un Rescale pasa al precio vigente en ese momento.

## Acceso

- **Solo con clave SSH**, nunca con contraseña. La clave es `~/.ssh/toctar` en la PC de YankoSoft, protegida con una frase guardada en el gestor (entrada "SSH TocTar Hetzner"). En Hetzner está cargada como `toctar-hetzner`.
- Para entrar:
  ```powershell
  ssh -i $env:USERPROFILE\.ssh\toctar root@5.75.168.229
  ```
- **Si se pierde la clave o su frase**, no hay forma de recuperarla. Se crea una nueva (`ssh-keygen -t ed25519 -C "toctar-hetzner" -f ...`), se carga en Hetzner y se entra por la **consola web** del servidor (Hetzner → servidor → **Console**) para agregarla a `/root/.ssh/authorized_keys`. Con el servidor vacío, es más simple borrarlo y crearlo de nuevo, como se hizo el 23/10.
- **Lección del 23/10:** la primera clave quedó inservible porque la frase se escribió mal al crearla (no se ve mientras se escribe). Desde entonces, la frase se crea primero en el gestor y se **pega** con clic derecho, y se comprueba con `ssh-keygen -y -f ~/.ssh/toctar` antes de usarla.

## Firewall de Hetzner (`toctar-web`)

Aplicado al servidor `toctar`. Todo lo que no está en la lista se descarta: un puerto sin regla da "Connection timed out", no "connection refused".

| Entrante | Puerto | Origen | Para qué |
|---|---|---|---|
| TCP | 22 | Any | SSH, solo con clave |
| TCP | 80 | Any | http: Coolify saca los certificados y redirige a https |
| TCP | 443 | Any | https: el sitio, el panel y Coolify |
| TCP | 8000 | Any | Panel de Coolify. **Temporal:** se borra cuando Coolify tenga su dominio (guía, paso 4.8) |

- Salientes: todo permitido.
- **El 3000 nunca se abre:** la app solo se alcanza por el proxy de Coolify.
- Cuando se creó, el firewall no traía la regla del 22 y SSH no respondía. Se agregó a mano.

## Qué se le hizo (23/10/2026)

Por SSH, como `root`, en este orden:

1. **Sistema al día:**
   ```bash
   apt update && apt full-upgrade -y
   ```
2. **Actualizaciones de seguridad automáticas y fail2ban** (bloquea a quien prueba entrar muchas veces):
   ```bash
   apt install -y unattended-upgrades fail2ban && dpkg-reconfigure -f noninteractive unattended-upgrades && systemctl enable --now fail2ban
   ```
3. **Swap de 4 GB**, usado solo cuando hace falta (al compilar):
   ```bash
   fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf && sysctl --system
   ```
4. **SSH solo con clave**, en `/etc/ssh/sshd_config.d/99-toctar.conf`:
   ```
   PasswordAuthentication no
   KbdInteractiveAuthentication no
   PermitRootLogin prohibit-password
   ```
   Se aplicó con `sshd -t && systemctl restart ssh`, probando antes de cerrar que una segunda sesión entraba.
5. **Reinicio** para cargar el núcleo nuevo. Quedó en `7.0.0-38-generic`.

Comprobación final:
```bash
uname -r && free -h | grep Swap && systemctl is-active fail2ban
# 7.0.0-38-generic · Swap: 4.0Gi · active
```

## Lo que falta instalar

Ver `guia-de-despliegue.md`:

- [ ] Coolify (paso 4), después del DNS en Cloudflare (pasos 1 y 3).
- [ ] Bases PostgreSQL 18 de pruebas y producción (paso 5).
- [ ] Apps de pruebas y producción (paso 7).
- [ ] Respaldos diarios de la base a R2 (paso 8).
- [ ] Cerrar el puerto 8000 en el firewall.

Cada cosa que se instale se anota aquí, con su fecha.

## Cloudflare R2: fotos, datos de clientes y respaldos

Configurado el 23/10/2026 en la cuenta de Cloudflare del negocio (`toctartarija@gmail.com`). YankoSoft entra con su cuenta personal como **Super Administrator**; al entregar el sistema, el dueño lo puede bajar a **Administrator** (sigue manejando DNS y R2, pero no la facturación ni los miembros).

- **Plan:** R2 gratuito (10 GB al mes, sin costo por descargas). La tarjeta registrada es **provisoriamente la de YankoSoft**: se cambia a la del dueño.
- **Account ID:** `7b3b2188fdc6c23bfdb4cc84e28745f6` (no es secreto). Endpoint para `S3_ENDPOINT`: `https://7b3b2188fdc6c23bfdb4cc84e28745f6.r2.cloudflarestorage.com`.
- **Buckets**, todos con ubicación sugerida **Eastern North America (ENAM)**, la región de Cloudflare más cercana a Bolivia, y clase **Standard**:

| Bucket | Para qué | Acceso público |
|---|---|---|
| `toctar-fotos` | Fotos del sitio, producción | Dominio `fotos.toctardetailing.com` (**pendiente**: necesita el dominio en Cloudflare) |
| `toctar-fotos-pruebas` | Fotos del sitio, pruebas | Dominio `fotos-pruebas.toctardetailing.com` (**pendiente**) |
| `toctar-privado` | Datos de clientes, producción: reclamos, consultas, órdenes y comprobantes | **Nunca.** CORS: `https://toctardetailing.com`, PUT y GET |
| `toctar-privado-pruebas` | Datos de clientes, pruebas | **Nunca.** CORS: `https://pruebas.toctardetailing.com`, PUT y GET |
| `toctar-respaldos` | Copias de la base de datos | **Nunca** |

- **Tokens** (Account API tokens, sin vencimiento), con su Access Key ID y Secret guardados **solo en el gestor de contraseñas**:
  - `toctar-app`: Object Read & Write sobre los 4 buckets de fotos y privados. Va en `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY` de las dos apps.
  - `toctar-respaldos`: Object Read & Write solo sobre `toctar-respaldos`. Va en el almacenamiento S3 de Coolify, para los respaldos.
- **Si un token se filtra:** se borra en R2 → Manage API tokens, se crea otro igual y se actualizan las variables en Coolify.

## Mantenimiento

- **Actualizaciones de seguridad:** se instalan solas todos los días (unattended-upgrades), pero **no reinician** el servidor. Una vez al mes, o cuando avise la consola, entrar y revisar:
  ```bash
  cat /var/run/reboot-required 2>/dev/null && echo "hay que reiniciar"
  ```
  Si hay que reiniciar, hacerlo en un horario sin uso (de noche en Bolivia): `reboot`.
- **Espacio en disco:** `df -h /`. Con Docker, limpiar imágenes viejas desde Coolify o con `docker system prune` (con cuidado: no borrar volúmenes).
- **Quién intentó entrar:** `fail2ban-client status sshd`.
- **Costo:** la factura llega todos los meses a la cuenta del negocio. Hetzner acumula los montos menores a 10 hasta pasarlo; desde el 1/10/2026 cambió las fechas de facturación de todos sus clientes.
