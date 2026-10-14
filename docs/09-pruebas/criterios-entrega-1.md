# Criterios de aceptación — Entrega 1 (Web)

- **Fuente:** `05-analisis/historias-de-usuario/historias.md` y las especificaciones de etapa en `08-desarrollo/etapas/`.
- **Uso:**
  - Es la lista con la que el dueño revisa y firma el acta de la entrega 1 (`actas-de-aceptacion/entrega-1.md`).
  - Se actualiza al cerrar cada historia.
  - En la demo del viernes 23 el dueño valida que los criterios son los correctos.
- **Estados:**
  - ✅ cumple y tiene prueba automática.
  - 🟢 cumple, revisado a mano.
  - ⏳ pendiente.
  - ⚠️ ajustado respecto de la historia original (el motivo está en la nota).

## Resumen

| Historia | Etapa | Estado |
|---|---|---|
| HU-01 Iniciar sesión | B1 | ✅ Terminada |
| HU-02 Gestionar usuarios y roles | B1 | ✅ Terminada (un criterio ajustado) |
| HU-03 Permisos del encargado | B1 | ⏳ En curso: el control ya funciona; faltan los módulos que se asignan |
| HU-04 a HU-06 | B2 | ⏳ |
| HU-07 a HU-09 | B3 | ⏳ |
| HU-10 a HU-15 | B4 | ⏳ |
| HU-16 a HU-18 | B5 | ⏳ |

---

## HU-01 Iniciar sesión

> Como usuario del panel, quiero entrar con mi usuario y contraseña, para usar solo lo que me corresponde.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 1.1 | Con datos correctos, entro al panel y veo solo los módulos de mi rol | E2E `hu-01` "con datos correctos entra al panel…" y `hu-02` "el dueño crea un técnico…" (el técnico no ve Usuarios) | ✅ |
| 1.2 | Con datos incorrectos, veo un mensaje que no dice cuál de los dos falló | E2E `hu-01` "con contraseña incorrecta…" y "un usuario que no existe ve el mismo mensaje" | ✅ |
| 1.3 | Un usuario desactivado no puede entrar | E2E `hu-01` "un usuario desactivado no puede entrar…" | ✅ |
| 1.4 | La sesión vence tras un tiempo sin uso y puedo cerrarla cuando quiera | Vence a los **7 días sin uso** (configuración en `src/lib/auth.ts`, revisada). Cierre: E2E `hu-01` "cerrar sesión vuelve al ingreso…" | ✅ |
| 1.5 | El usuario se acepta sin importar mayúsculas | E2E `hu-01` "el usuario se acepta sin importar mayúsculas" | ✅ (agregado) |

## HU-02 Gestionar usuarios y roles

> Como dueño, quiero crear usuarios con su rol, para que cada persona tenga su acceso.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 2.1 | Creo un usuario con nombre, usuario, contraseña inicial y rol (dueño, encargado o técnico) | E2E `hu-02` "el dueño crea un técnico (usuario con guion)…" (el creado ingresa); "un usuario repetido muestra un error claro"; "los errores del formulario se muestran junto a cada campo" | ✅ |
| 2.2 | Restablezco la contraseña de cualquier usuario | E2E `hu-02` "restablecer la contraseña: la anterior deja de servir y la nueva funciona". Además se cierran las sesiones abiertas con la contraseña anterior | ✅ |
| 2.3 | Desactivo un usuario sin borrar lo que registró | E2E `hu-02` "desactivar a alguien con la sesión abierta lo saca del panel". No existe ninguna acción de borrar (RN-14) | ✅ |
| 2.4 | ⚠️ **Ajustado:** nadie puede desactivarse a sí mismo, y el único dueño activo no puede quitarse el rol | E2E `hu-02` "el único dueño no puede desactivarse ni quitarse el rol"; unitarias `usuarios-reglas` | ✅ |

**Nota sobre 2.4.** La historia decía "no puedo desactivarme a mí mismo si soy el único dueño activo". La librería de autenticación no permite que nadie se desactive a sí mismo, en ningún caso. Es más seguro: siempre hay otra persona que lo hace. La regla del último dueño se mantiene para el cambio de rol. **El dueño confirma este ajuste en la demo.**

## HU-03 Permisos del encargado

> Como dueño, quiero elegir qué módulos ve el encargado, para darle acceso sin mostrarle todo.

| # | Criterio | Cómo se comprueba | Estado |
|---|---|---|---|
| 3.1 | Marco o desmarco módulos (clientes, consultas, agenda, órdenes, pagos, mantenimientos, sitio, reclamos) y el permiso "autorizar entrega con saldo" | Las casillas aparecen al elegir el rol Encargado. **Hoy solo está "Autorizar entrega con saldo"**: cada módulo suma su casilla cuando existe su pantalla (Sitio web en B3, Reclamos en B5, el resto en la entrega 2) | ⏳ |
| 3.2 | El encargado nunca puede cotizar ni cambiar la configuración | Unitarias `permisos` "nunca ve cotizaciones, usuarios, configuración, catálogo, aunque tenga todos los permisos" | ✅ |
| 3.3 | El permiso se valida en el servidor: entrar por la URL de un módulo no habilitado muestra "sin acceso" | E2E `hu-02` (el técnico en `/panel/usuarios`). La prueba del encargado en un módulo no habilitado se agrega con el primer módulo asignable (B3) | 🟢 parcial |

## HU-04 a HU-18

Se completan al cerrar cada etapa, con los criterios de `historias.md` y los de su especificación.

## Requisitos no funcionales que se revisan en esta entrega

| Requisito | Cómo se comprueba | Estado |
|---|---|---|
| RNF-01 Celular desde 360 px y computadora | Todas las pruebas E2E corren en celular (Pixel 7) y en escritorio; revisión visual en cada etapa | 🟢 al día |
| RNF-02 Sitio rápido en 4G (Lighthouse ≥ 90) | Medición en B4 | ⏳ |
| RNF-03 Instalable; aviso claro sin conexión | B2 (HU-06) | ⏳ |
| RNF-04 https, contraseñas con hash, sesión que vence | Hash scrypt de Better Auth; sesión de 7 días; https en el entorno de pruebas (A3) | 🟢 parcial |
| RNF-05 Permisos validados en el servidor | Unitarias `permisos` (matriz completa) y E2E de acceso por URL | ✅ |
| RNF-12 El panel no aparece en buscadores | E2E `base` "el panel y el ingreso no se indexan en Google" | ✅ |
| RNF-14 Texto alternativo y contraste legible | Contrastes de la identidad verificados (54 pares); Lighthouse en B4 | 🟢 parcial |

## Errores encontrados y corregidos durante el desarrollo

| Fecha | Historia | Error | Corrección | Prueba que lo cubre |
|---|---|---|---|---|
| 14/10/2026 | HU-02 | Un usuario con guion en el nombre (por ejemplo, `ana-maria`) se creaba bien, pero no podía ingresar: la librería de autenticación validaba con un patrón distinto al del formulario | Un solo patrón compartido (`PATRON_NOMBRE_USUARIO`) | Unitaria `usuarios` "todo usuario que acepta el formulario también puede ingresar"; E2E con `tecnico-c` |
| 14/10/2026 | HU-02 | Al desactivar o reactivar no aparecía el aviso de confirmación | El aviso se muestra desde la acción, no desde la pantalla que se reemplaza | E2E "desactivar a alguien…" (espera el aviso) |
