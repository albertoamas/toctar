# Identidad visual — TocTar Detailing

- **Fecha:** 14 de octubre de 2026
- **Fuente:** hoja de logos (JPG de 4167 px), logo vertical (PNG exportado de Illustrator, 842 × 772, fondo transparente) y manual de línea gráfica (PDF de 8 páginas), entregados por TocTar. Están en `material/`, fuera de Git.
- **Importante:** el PDF **no es vectorial**: cada página es una imagen PNG sin compresión de 4167 px. Esas imágenes (pág. 2 vertical y pág. 4 horizontal) son la mejor fuente disponible. **No tenemos el logo vectorial original:** todos los SVG son trazados. Pedírselo al diseñador sigue pendiente.
- **Design System (referencia completa):** https://claude.ai/artifact/FcABnS1tF3WgZMz9v3e5BT. Contiene el manual de marca, los tokens, 8 componentes con su guía y los logos.

## Decisiones

| Tema | Decisión | De dónde sale |
|---|---|---|
| Colores | Rojo `#E30613` (el CMYK 0/100/100/0 de Illustrator), carbón `#1A1A1A`, negro y blanco. `#FE0000` solo como fondo de la versión del logo en blanco | Las dos únicas tintas del PNG exportado de Illustrator. El JPG daba `#E40613` por la compresión |
| Texto rojo | `rojo-texto` (`#FF4D57` en oscuro, `#C40511` en claro) para texto de tamaño normal | El rojo de marca da 4,3:1 sobre negro; el mínimo es 4,5:1 |
| Recurso gráfico | Corte diagonal a 60° (botón principal, tarjetas, franjas) y línea LED roja con brillo | Trazos del monograma a 60°; fachada del manual, pág. 6 |
| Tipografía | Montserrat para el texto, Barlow Condensed itálica para los titulares | El lema del logo está en Montserrat; el logotipo es condensado, pesado e itálico |
| Temas | Sitio público siempre oscuro; panel claro por defecto, con barra lateral negra; ingreso en oscuro | Versión principal del logo sobre negro; lectura al sol en el taller |
| Logos | 21 SVG en `public/marca/`: horizontal y vertical con y sin lema, y monograma, cada uno en 4 tintas, más el ícono de la app | Piezas trazadas una vez desde el PNG sin compresión de la pág. 4 del PDF: el **monograma como polígono** (14 esquinas, rectas exactas) y **TOCTAR y el lema con curvas**. El vertical se arma con esas piezas ubicadas como en el PNG de Illustrator (coincidencia 99,4 % y 98,7 %); su lema se traza aparte porque tiene otro espaciado |
| Logo en tamaños chicos | **Con lema solo desde 360 px de ancho (horizontal) o 320 px (vertical).** Por debajo, la versión `-sin-lema` y el lema como texto con la clase `tt-lema`, que se ve nítido a cualquier tamaño | El lema dibujado queda de 2 a 5 px y se ve borroso (encontrado el 14/10 en la pantalla de ingreso) |
| Servicios sin foto | Imagen de reemplazo con el monograma y una banda a 60° | Decisión del 14/10 (`01-descubrimiento/material-recibido.md`) |

## En el código

- Tokens: `src/app/globals.css`. El tema oscuro se aplica con `data-theme="oscuro"` en cualquier elemento, y las variables de shadcn/ui apuntan a los tokens de marca.
- Utilidades: `bg-rojo`, `text-rojo-texto`, `text-tinta-suave`, `bg-superficie`, `font-heading` (Barlow Condensed), y las clases `tt-led`, `tt-lema` y `tt-boton-marca`.
- Fuentes: `next/font/google` en `src/app/layout.tsx`.
- Ícono de la app: `src/app/icon.svg`.

## Pendiente

- [ ] El archivo vectorial original del logo (.ai o .svg) del diseñador, para reemplazar los trazados.
- [ ] Validar con el dueño en la primera revisión (viernes 23 de octubre).
