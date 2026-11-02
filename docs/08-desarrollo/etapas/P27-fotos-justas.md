# P27 Fotos solo donde sirven: especificación

- **Fase y semana:** C. Entrega 2 · 1 de noviembre de 2026, punto 4 de los ajustes de la reunión con el dueño (`../ajustes-reunion-dueno.md`)
- **Estado:** aprobada (01/11/2026) y en curso en la rama `pedido-27-fotos` (sale de la del pedido 13: tocan las mismas pantallas)
- **Pedido:** 27 de `03-cierre-comercial/registro-de-cambios.md`
- **Historias que cambian:** HU-33 (recibir), HU-34 (la orden), HU-41 (publicar en la galería: sin cambios de fondo)

## 1. Objetivo
Que el sistema pida fotos solo donde sirven y que **no haya dos lugares para lo mismo**: los detalles de cómo llegó, con su foto en el checklist; todo el vehículo al **inicio** del trabajo; y el **final** (de ahí sale la galería). Sin fotos de proceso ni videos.

## 2. Qué cambia

| Dónde | Antes | Ahora |
|---|---|---|
| Consulta | Fotos y videos | No existe (pedido 23) |
| Cotización | Fotos para el PDF | Sin fotos (pedido 23) |
| Recibir | "Fotos de ingreso" sueltas **y** la foto de cada detalle del checklist; pedía confirmar "recibir sin fotos" | Solo el checklist, con la foto de cada detalle. Sin confirmación de fotos: la prueba es el checklist revisado parte por parte |
| Orden | Ingreso, Antes, Durante y Después | **Inicio** (todo el vehículo, al empezar) y **Final** (al terminar) |
| Videos | En la consulta | En ninguna parte |

- Lo ya subido no se borra: las fotos de **ingreso** y de **durante** que existan se siguen viendo en la orden, sin poder subir más.
- En la base siguen las etapas `antes` y `despues` (se muestran como "Inicio" y "Final"): sin migrar datos.
- La galería del sitio sigue igual: la foto de después sale del "Final" y la de antes, del "Inicio" (o de ingreso, en las órdenes viejas).

## 3. Reglas
| Regla | Cómo se garantiza |
|---|---|
| Solo se suben fotos de inicio y final | `ETAPAS_CON_SUBIDA` en `ordenes/reglas.ts`: `etapaAbierta` y el esquema de la acción (`esquemaFotoOrden`) solo aceptan esas dos |
| Mientras la orden está abierta | `etapaAbierta`: recibida, en proceso o lista |
| Cómo llegó: el checklist | Se recibe con todas las partes revisadas (pedido 12) |

## 4. Textos
Títulos "Inicio" y "Final"; para el lector de pantalla, "Cámara para fotos del inicio", "Ver la foto 1 del final". Vacíos: "Sin fotos de inicio." / "Sin fotos del final.".

## 5. Pruebas
- **Unitarias:** solo inicio y final se suben, y solo con la orden abierta; el esquema rechaza ingreso y durante.
- **E2E:** al recibir no hay cámara de ingreso y se recibe sin confirmar fotos; la orden ofrece inicio y final (también al técnico); cancelar una reserva descarta el checklist y sus fotos; la galería publica desde inicio y final.

## 6. Terminado cuando
Ninguna pantalla pide fotos de más ni videos, y la orden tiene tres momentos claros: los detalles al recibir (checklist), el inicio y el final.
