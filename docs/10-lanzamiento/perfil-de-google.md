# Perfil de Empresa en Google — guía para el dueño

> HU-18 (RF-09). El sitio ya está preparado para Google: mapa del sitio, `robots.txt` y datos de negocio local. Lo que falta está **fuera del software**: el Perfil de Empresa, que es lo que aparece en Google Maps y en la ficha de la derecha al buscar "detailing Tarija". Lo crea el dueño con su propia cuenta de Google; YankoSoft lo acompaña en una llamada o en persona (unos 20 minutos, más la verificación).

## Antes de empezar

- Una cuenta de Google del negocio (puede ser la de `toctartarija@gmail.com`). El perfil queda a nombre del dueño, no de YankoSoft.
- El sitio ya publicado en su dominio (después de A3).
- A mano: dirección exacta, horario, WhatsApp, 5 a 10 fotos buenas del taller y de trabajos, y el logo.

## Pasos

1. Entrar a **business.google.com** con la cuenta del negocio y elegir "Agregar tu empresa".
2. **Nombre:** `TocTar Detailing`, igual que en el sitio. Sin palabras extra como "el mejor" o "Tarija": Google puede suspender el perfil.
3. **Categoría principal:** "Servicio de detallado de automóviles". Se pueden sumar como secundarias "Servicio de polarizado de vidrios" y "Lavadero de autos", si corresponden.
4. **Ubicación:** sí, los clientes van al taller. Poner la dirección y ajustar el pin en el mapa sobre el portón del taller.
5. **Zona de servicio:** no hace falta (no van a domicilio).
6. **Contacto:** el WhatsApp del negocio como teléfono y la dirección del sitio (`https://<dominio>`).
7. **Verificación:** Google pide un video corto del taller (letrero, entrada y herramientas de trabajo) o un código. Puede tardar varios días: conviene empezar apenas el sitio esté publicado.
8. **Completar el perfil** (una vez verificado):
   - Horario, el mismo que está en el panel (Configuración → Datos del negocio).
   - Descripción: dos o tres oraciones con los servicios principales. Sin precios.
   - Fotos: logo, portada, el taller por fuera y por dentro, y trabajos terminados.
   - Servicios: los mismos nombres que en el sitio.

## Después

- **Reseñas:** al entregar un vehículo, pedirle al cliente que deje una reseña. Google muestra primero los negocios con reseñas recientes. Se responden todas, también las malas, con calma.
- **Mantener los datos iguales en todos lados:** si cambia el horario o el teléfono, cambiarlo en el panel **y** en el perfil. A Google le importa que coincidan.
- **Search Console** (lo hace YankoSoft en A3/B6): registrar el dominio, enviar `https://<dominio>/sitemap.xml` y revisar que las páginas entren al índice. Validar los datos de negocio local con la prueba de resultados enriquecidos de Google.

## Qué ya hace el sitio por su cuenta

| Qué | Dónde |
|---|---|
| Título y descripción propios en cada página; URL legibles (`/servicios/pulido-y-nano-ceramico`) | Cada página del sitio |
| `sitemap.xml` con las páginas y los servicios visibles | `src/app/sitemap.ts` |
| `robots.txt` que deja fuera el panel, el ingreso y la API | `src/app/robots.ts` |
| Datos de negocio local (`AutomotiveBusiness`): nombre, dirección, ubicación, horario, WhatsApp, correo y redes, con lo que cargó el dueño | Pie del sitio (`src/modulos/sitio/negocio-local.ts`) |
| El entorno de pruebas no se indexa | `SITIO_INDEXABLE=false` en `pruebas.<dominio>` |
