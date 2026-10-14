# Identidad visual — TocTar Detailing

- **Fecha:** 14 de octubre de 2026
- **Fuente:** hoja de logos (JPG de 4167 px) y manual de línea gráfica (PDF de 8 páginas) entregados por TocTar. Están en `material/`, fuera de Git.
- **Design System (referencia completa):** https://claude.ai/artifact/FcABnS1tF3WgZMz9v3e5BT. Contiene el manual de marca, los tokens, 8 componentes con su guía y los logos.

## Decisiones

| Tema | Decisión | De dónde sale |
|---|---|---|
| Colores | Rojo `#E40613`, carbón `#1A1A1A`, negro y blanco. `#FE0000` solo como fondo de la versión del logo en blanco | Medidos sobre el archivo original del logo |
| Texto rojo | `rojo-texto` (`#FF4D57` en oscuro, `#C40511` en claro) para texto de tamaño normal | El rojo de marca da 4,3:1 sobre negro; el mínimo es 4,5:1 |
| Recurso gráfico | Corte diagonal a 60° (botón principal, tarjetas, franjas) y línea LED roja con brillo | Trazos del monograma a 60°; fachada del manual, pág. 6 |
| Tipografía | Montserrat para el texto, Barlow Condensed itálica para los titulares | El lema del logo está en Montserrat; el logotipo es condensado, pesado e itálico |
| Temas | Sitio público siempre oscuro; panel claro por defecto, con barra lateral negra; ingreso en oscuro | Versión principal del logo sobre negro; lectura al sol en el taller |
| Logos | 13 SVG trazados del original (horizontal, vertical, monograma, en 4 tintas, más el ícono de la app) en `public/marca/` | Hoja de logos y pág. 2 del manual |
| Servicios sin foto | Imagen de reemplazo con el monograma y una banda a 60° | Decisión del 14/10 (`01-descubrimiento/material-recibido.md`) |

## En el código

- Tokens: `src/app/globals.css`. El tema oscuro se aplica con `data-theme="oscuro"` en cualquier elemento, y las variables de shadcn/ui apuntan a los tokens de marca.
- Utilidades: `bg-rojo`, `text-rojo-texto`, `text-tinta-suave`, `bg-superficie`, `font-heading` (Barlow Condensed), y las clases `tt-led`, `tt-lema` y `tt-boton-marca`.
- Fuentes: `next/font/google` en `src/app/layout.tsx`.
- Ícono de la app: `src/app/icon.svg`.

## Pendiente

- [ ] El archivo vectorial original del logo (.ai o .svg) del diseñador, para reemplazar los trazados.
- [ ] Validar con el dueño en la primera revisión (viernes 23 de octubre).
