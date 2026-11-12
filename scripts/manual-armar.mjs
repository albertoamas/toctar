// Arma contenido/manual/manual.html, el Manual del panel que se abre en /panel/manual (pedido 44), desde el contenido de
// scripts/manual/contenido.mjs y las posiciones de los números de contenido/manual/marcas.json (las saca
// `npm run manual:capturas`). Uso: `npm run manual:armar`. Por ahora el manual se lee solo en la web (sin PDF).
// El contenido es nuestro (no de los usuarios): sus textos pueden llevar <b> y los botones como <span class="boton">.
//
// En la pantalla es un libro: una página a la vez (la portada, el índice, la portada de cada capítulo y un tema por
// página), que se pasa con los botones, deslizando el dedo o con las flechas (scripts/manual/libro.js). Sin JavaScript
// y al imprimir se ven todas, una tras otra.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CAPITULOS, DIA, ESTADOS, GLOSARIO, PERMISOS, PROBLEMAS, QUIEN } from "./manual/contenido.mjs";

const SALIDA = path.join(process.cwd(), "contenido", "manual");
const marcas = JSON.parse(readFileSync(path.join(SALIDA, "marcas.json"), "utf8"));
const RUTA = "/panel/manual";

const chips = (quien) => quien.map((q) => `<span class="quien quien--${q}">${QUIEN[q]}</span>`).join("");
/** "Recibir el vehículo" da "recibir-el-vehiculo": la dirección de cada página, con su capítulo adelante. */
const slug = (texto) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function figura(c) {
  const m = marcas[c.id];
  if (!m) throw new Error(`Falta la captura ${c.id}: corre npm run manual:capturas -- ${c.id}`);
  const puntos = m.puntos
    .map((p, i) => (p ? `<span class="marca" style="left:${p.x}%;top:${p.y}%" aria-hidden="true">${i + 1}</span>` : ""))
    .join("");
  const leyenda = c.marcas.map((marca, i) => `<li${m.puntos[i] ? "" : ' class="sin-punto"'}><span class="n" aria-hidden="true">${i + 1}</span><span>${marca.texto}</span></li>`).join("");
  return `
        <figure class="tablet" style="--proporcion:${(m.ancho / m.alto).toFixed(4)}">
          <button type="button" class="pantalla" aria-label="Ver la captura en grande">
            <img src="${RUTA}/capturas/${c.id}.jpg" alt="" width="${m.ancho}" height="${m.alto}" loading="lazy">
            ${puntos}
            <span class="agrandar" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>Ver en grande</span>
          </button>
        </figure>
        <ol class="leyenda" aria-label="Qué señala cada número">${leyenda}</ol>`;
}

function cuerpoTema(t) {
  const encabezado = `
      <div class="tema-cabeza">
        ${t.paso ? `<span class="paso-num" aria-hidden="true">${t.paso}</span>` : ""}
        <h3>${t.titulo}</h3>
        ${t.quien ? `<span class="chips">${chips(t.quien)}</span>` : ""}
      </div>`;
  const partes = [encabezado];
  if (t.intro) partes.push(`<p class="intro">${t.intro}</p>`);
  if (t.captura) partes.push(figura(t.captura));
  if (t.pasos) partes.push(`<div class="bloque"><h4>Paso a paso</h4><ol class="pasos">${t.pasos.map((p) => `<li><span>${p}</span></li>`).join("")}</ol></div>`);
  if (t.puntos) partes.push(`<ul class="puntos">${t.puntos.map((p) => `<li>${p}</li>`).join("")}</ul>`);
  if (t.claves) partes.push(`<dl class="claves">${t.claves.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("")}</dl>`);
  if (t.nota) partes.push(`<p class="nota">${t.nota}</p>`);
  if (t.siAlgoFalla) {
    partes.push(`<div class="bloque falla"><h4>Si algo sale mal</h4><dl>${t.siAlgoFalla.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("")}</dl></div>`);
  }
  if (t.html) partes.push(t.html);
  return `<article class="tema">${partes.join("\n")}</article>`;
}

const ciclo = `<ol class="ciclo" aria-label="Los pasos de un trabajo">${["Cotizada", "Reservada", "En el taller", "En proceso", "Lista", "Entregada"].map((p) => `<li>${p}</li>`).join("")}</ol>`;

// "Para consultar": las tablas, como temas de un capítulo más
const si = (v) => (v ? '<span class="si">Sí</span>' : '<span class="no">No</span>');
const REFERENCIA = {
  id: "referencia",
  numero: "6",
  titulo: "Para consultar",
  resumen: "Lo que conviene tener a mano: quién puede qué, qué dice cada estado y qué hacer ante un problema.",
  temas: [
    {
      titulo: "Quién puede qué",
      intro: "El dueño ve todo. A cada encargado se le da un perfil en Usuarios; se puede ajustar cada casilla.",
      html: `<div class="tabla"><table>
        <thead><tr><th scope="col">Lo que se puede hacer</th>${PERMISOS.columnas.map((c) => `<th scope="col">${c}</th>`).join("")}</tr></thead>
        <tbody>${PERMISOS.filas.map(([q, ...v]) => `<tr><th scope="row">${q}</th>${v.map((x) => `<td>${si(x)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>`,
    },
    {
      titulo: "Qué dice cada estado",
      html: `<div class="estados-grid">${ESTADOS.map((g) => `<div class="estados"><h4>${g.grupo}</h4><dl>${g.filas.map(([e, d]) => `<div><dt><span class="estado">${e}</span></dt><dd>${d}</dd></div>`).join("")}</dl></div>`).join("")}</div>`,
    },
    {
      titulo: "Un día cualquiera",
      html: `<div class="dias">${DIA.map((d) => `<div class="dia"><span class="quien quien--${d.quien}">${QUIEN[d.quien]}</span><h4>${d.titulo}</h4><ol>${d.pasos.map((p) => `<li>${p}</li>`).join("")}</ol></div>`).join("")}</div>`,
    },
    { titulo: "Problemas frecuentes", html: `<dl class="problemas">${PROBLEMAS.map(([p, r]) => `<div><dt>${p}</dt><dd>${r}</dd></div>`).join("")}</dl>` },
    { titulo: "Palabras del panel", html: `<dl class="glosario">${GLOSARIO.map(([p, r]) => `<div><dt>${p}</dt><dd>${r}</dd></div>`).join("")}</dl>` },
  ],
};
const TODOS = [...CAPITULOS, REFERENCIA];

// Las páginas del libro, en orden
const paginas = [];
const pagina = (id, capitulo, clase, contenido) => paginas.push({ id, capitulo, clase, contenido });

pagina(
  "portada",
  "Manual del panel",
  "pagina--portada",
  `<header class="portada">
    <div class="portada-arriba"><img class="logo" src="/marca/toctar-horizontal-sin-lema-sobre-oscuro.svg" alt="TocTar Detailing"><a class="volver-panel" href="/panel">Volver al panel</a></div>
    <h1>Manual del panel</h1>
    <p>Para el dueño y los encargados de TocTar Detailing: cada pantalla, en una tablet, con números que señalan qué tocar.</p>
    <div class="portada-acciones">
      <a class="empezar" href="#indice">Empezar a leer</a>
    </div>
    <p class="como-se-lee"><span class="marca marca--suelta" aria-hidden="true">1</span> En cada captura, el número señala lo que se explica debajo. Pasa de página con los botones de abajo o deslizando el dedo.</p>
  </header>`,
);

pagina(
  "indice",
  "Manual del panel",
  "pagina--indice",
  `<h2 class="titulo-indice">Índice</h2>
  <div class="indice">${TODOS.map(
    (c) => `<div class="indice-cap">
      <a class="indice-item" href="#${c.id}"><span class="cap-num" aria-hidden="true">${c.numero}</span><span><b>${c.titulo}</b><span>${c.resumen}</span></span></a>
      <ol class="indice-temas">${c.temas.map((t) => `<li><a href="#${c.id}-${slug(t.titulo)}">${t.titulo}</a></li>`).join("")}</ol>
    </div>`,
  ).join("")}</div>`,
);

for (const c of TODOS) {
  pagina(
    c.id,
    `${c.numero}. ${c.titulo}`,
    "pagina--capitulo",
    `<header class="cap-cabeza">
      <span class="cap-num" aria-hidden="true">${c.numero}</span>
      <div>
        <h2 id="t-${c.id}">${c.titulo}</h2>
        <p>${c.resumen}</p>
      </div>
    </header>
    ${c.ciclo ? ciclo : ""}
    <h3 class="en-este">En este capítulo</h3>
    <ol class="lista-temas">${c.temas.map((t) => `<li><a href="#${c.id}-${slug(t.titulo)}">${t.paso ? `<span class="paso-num paso-num--chico" aria-hidden="true">${t.paso}</span>` : ""}<span>${t.titulo}</span></a></li>`).join("")}</ol>`,
  );
  for (const t of c.temas) pagina(`${c.id}-${slug(t.titulo)}`, `${c.numero}. ${c.titulo}`, "pagina--tema", cuerpoTema(t));
}

const ids = paginas.map((p) => p.id);
if (new Set(ids).size !== ids.length) throw new Error("Dos páginas con la misma dirección: cambia el título de un tema.");

const estilo = readFileSync(path.join(process.cwd(), "scripts", "manual", "estilo.css"), "utf8");
const libro = readFileSync(path.join(process.cwd(), "scripts", "manual", "libro.js"), "utf8");
const total = paginas.length;

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>Manual del panel TocTar</title>
<style>
  @font-face { font-family: "Montserrat"; src: url("/fuentes/montserrat-variable-latin.woff2") format("woff2"); font-weight: 100 900; font-style: normal; font-display: swap; }
  @font-face { font-family: "Barlow Condensed"; src: url("/fuentes/barlow-condensed-800-italica-latin.woff2") format("woff2"); font-weight: 700 800; font-style: italic; font-display: swap; }
${estilo}
</style>
</head>
<body>
<!-- Generado por scripts/manual-armar.mjs: no se edita a mano (el contenido está en scripts/manual/contenido.mjs) -->
<div class="libro-cabeza" hidden>
  <a class="libro-indice" href="#indice">Índice</a>
  <span class="libro-capitulo" aria-live="polite"></span>
  <span class="libro-numero"></span>
</div>

<main class="libro">
${paginas
  .map(
    (p, i) => `<section class="pagina ${p.clase}" id="${p.id}" data-capitulo="${p.capitulo}" data-numero="${i + 1}" aria-label="Página ${i + 1} de ${total}">
  <div class="ancho">
${p.contenido}
  </div>
</section>`,
  )
  .join("\n")}
</main>

<nav class="libro-pie" aria-label="Pasar de página" hidden>
  <button type="button" class="libro-anterior"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>Anterior</button>
  <div class="libro-avance" aria-hidden="true"><span></span></div>
  <button type="button" class="libro-siguiente">Siguiente<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>
</nav>

<div class="seguir" role="status" hidden>
  <span></span>
  <button type="button" class="seguir-si">Seguir</button>
  <button type="button" class="seguir-no">Desde el principio</button>
</div>

<dialog class="visor" aria-label="Captura en grande">
  <button type="button" class="visor-cerrar">Cerrar</button>
  <div class="visor-cuerpo"></div>
</dialog>

<footer>
  <div class="ancho">
    <img src="/marca/toctar-horizontal-sin-lema-sobre-oscuro.svg" alt="TocTar Detailing">
    <span>Manual del panel, noviembre de 2026. Hecho por YankoSoft.</span>
  </div>
</footer>
<script>
${libro}
</script>
</body>
</html>
`;

writeFileSync(path.join(SALIDA, "manual.html"), html);
const capturas = TODOS.flatMap((c) => c.temas).filter((t) => t.captura).length;
console.log(`Listo: contenido/manual/manual.html, ${total} páginas y ${capturas} capturas.`);
