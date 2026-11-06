# P39 Aviso de versión nueva — especificación

- **Fase y semana:** cierre de la Entrega 2 · semana 4 (05/11/2026)
- **Estado:** programada (05/11/2026), con la maqueta del aviso aprobada el mismo día
- **Historias:** HU-06 (app instalable)
- **Base:** RNF-03, `registro-de-cambios.md` (pedido 39)

## 1. Objetivo
Que el dueño y los encargados sepan cuándo se publicó una versión nueva del sistema y la carguen con un toque. Si no, quien tiene el panel abierto (sobre todo en la app instalada, que casi nunca se cierra) sigue en la versión vieja, y algunas acciones pueden fallar con un error confuso.

## 2. Alcance
- **Incluye:**
  - En el panel, un aviso flotante que no se cierra solo: "Hay una versión nueva del sistema", con "Actualizar", que recarga la página.
  - La versión se compara al abrir el panel, al volver a la app y cada 10 minutos.
- **No incluye:**
  - El sitio público: Next ya recarga la página sola cuando el visitante navega entre versiones distintas.
  - Actualizar sin preguntar: se perdería lo que alguien esté escribiendo.
  - Los cambios del manifiesto, como la orientación: esos los actualiza Chrome por su cuenta o se reinstala la app.

## 3. Reglas que se cumplen
- **Nada fijo del negocio:** la versión sale de la compilación, no se escribe a mano.
- **Sin costo para el servidor:** una consulta liviana, sin base de datos ni sesión, y solo con la pestaña a la vista.
- **Un aviso por versión:** si ya se mostró, no se repite cada 10 minutos. Si se cerró, vuelve solo cuando se publica otra versión: la app instalada casi nunca se cierra.

## 4. Datos
Sin cambios en la base. La versión es un texto de la compilación:
- Al compilar, `next.config.ts` fija `NEXT_PUBLIC_VERSION_APP`: el commit (`SOURCE_COMMIT` en Coolify, `GITHUB_SHA` en el CI) o, si no hay, la fecha de la compilación. Con el commit, recompilar el mismo código no avisa de más.
- El Dockerfile declara `ARG SOURCE_COMMIT`. En Coolify, la opción es "Source commit availability" → **Available during build** (Advanced → Build & deploy), por ahora desactivada (§12); sin ella, la versión es la fecha de la compilación y avisa también cuando se recompila el mismo código, lo que no rompe nada.
- El navegador la recibe dentro de su código. El servidor la devuelve en `GET /api/version`.

## 5. Pantallas y rutas
- **`GET /api/version`:** devuelve `{ "version": "…" }`, sin caché (`no-store`). Es pública: el número de versión no es un secreto.
- **Panel (todas sus pantallas):** el componente `AvisoVersionNueva`, en el layout del panel, pide `/api/version`:
  - al cargar;
  - al volver a la pestaña (`visibilitychange`);
  - cada 10 minutos, mientras la pestaña está a la vista.
  Si la versión del servidor es distinta de la propia, muestra el aviso. Sin conexión o con error, no hace nada.

## 6. Acciones del servidor
Ninguna.

## 7. Componentes y diseño
- **Aviso flotante:** el de siempre (sonner), arriba al centro y a 64 px del borde, con el ícono de información y el borde izquierdo azul (`--info`).
- **Botón "Actualizar":** dentro del aviso.
- **Duración:** el aviso no se cierra solo, pero se puede cerrar.

## 8. Textos de la interfaz
- **Aviso:** "Hay una versión nueva del sistema"
- **Detalle:** "Actualiza para seguir con lo último."
- **Botón:** "Actualizar"

## 9. Pruebas
- **Unitarias:** la comparación de versiones. Distinta: avisa. Igual o vacía: no avisa.
- **E2E:**
  - Con `/api/version` simulado con otra versión, aparece el aviso, y "Actualizar" recarga.
  - Con la misma versión, no aparece.
  - En el sitio público no aparece.

## 10. Orden de trabajo
Rama `pedido-39-version-nueva`, un PR: especificación, maqueta aprobada y código.

## 11. Criterio de salida
Con el panel abierto en el celular, después de un despliegue en pruebas, al volver a la app aparece el aviso y "Actualizar" carga la versión nueva.

## 12. Decisiones abiertas
- **El commit como versión en Coolify:** el 05/11 se decidió dejar "Source commit availability" en **Runtime only**. Mientras tanto, la versión es la fecha de la compilación y el aviso sale también en un redeploy manual del mismo código. Para el futuro: **Available during build** en las dos apps (`07-preparacion/servidor.md`, Coolify).
