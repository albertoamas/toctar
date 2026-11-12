// Arma contenido/manual/manual.html, el Manual del panel que se abre en /panel/manual (pedido 44), desde el contenido de
// scripts/manual/contenido.mjs y las posiciones de los números de contenido/manual/marcas.json (las saca
// `npm run manual:capturas`). Uso: `npm run manual:armar`; después, `npm run manual:pdf` para su PDF.
// El contenido es nuestro (no de los usuarios): sus textos pueden llevar <b> y los botones como <span class="boton">.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CAPITULOS, DIA, ESTADOS, GLOSARIO, PERMISOS, PROBLEMAS, QUIEN } from "./manual/contenido.mjs";

const SALIDA = path.join(process.cwd(), "contenido", "manual");
const marcas = JSON.parse(readFileSync(path.join(SALIDA, "marcas.json"), "utf8"));
const RUTA = "/panel/manual";

const chips = (quien) => quien.map((q) => `<span class="quien quien--${q}">${QUIEN[q]}</span>`).join("");

function figura(c) {
  const m = marcas[c.id];
  if (!m) throw new Error(`Falta la captura ${c.id}: corre npm run manual:capturas -- ${c.id}`);
  const puntos = m.puntos
    .map((p, i) => (p ? `<span class="marca" style="left:${p.x}%;top:${p.y}%" aria-hidden="true">${i + 1}</span>` : ""))
    .join("");
  const leyenda = c.marcas.map((marca, i) => `<li${m.puntos[i] ? "" : ' class="sin-punto"'}><span class="n" aria-hidden="true">${i + 1}</span><span>${marca.texto}</span></li>`).join("");
  return `
        <figure class="tablet" style="--proporcion:${(m.ancho / m.alto).toFixed(4)}">
          <div class="pantalla">
            <img src="${RUTA}/capturas/${c.id}.jpg" alt="" width="${m.ancho}" height="${m.alto}" loading="lazy">
            ${puntos}
          </div>
        </figure>
        <ol class="leyenda" aria-label="Qué señala cada número">${leyenda}</ol>`;
}

function tema(t) {
  const encabezado = `
      <div class="tema-cabeza">
        ${t.paso ? `<span class="paso-num" aria-hidden="true">${t.paso}</span>` : ""}
        <h3>${t.titulo}</h3>
        <span class="chips">${chips(t.quien)}</span>
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
  return `<article class="tema">${partes.join("\n")}</article>`;
}

const ciclo = `<ol class="ciclo" aria-label="Los pasos de un trabajo">${["Cotizada", "Reservada", "En el taller", "En proceso", "Lista", "Entregada"].map((p) => `<li>${p}</li>`).join("")}</ol>`;

const capitulos = CAPITULOS.map(
  (c) => `
  <section class="capitulo ancho" id="${c.id}" aria-labelledby="t-${c.id}">
    <header class="cap-cabeza">
      <span class="cap-num" aria-hidden="true">${c.numero}</span>
      <div>
        <h2 id="t-${c.id}">${c.titulo}</h2>
        <p>${c.resumen}</p>
      </div>
    </header>
    ${c.ciclo ? ciclo : ""}
    ${c.temas.map(tema).join("\n")}
  </section>`,
).join("\n");

const indice = [
  ...CAPITULOS.map((c) => ({ href: `#${c.id}`, num: c.numero, titulo: c.titulo, texto: c.resumen })),
  { href: "#referencia", num: "6", titulo: "Para consultar", texto: "Permisos, estados, un día típico, problemas frecuentes y palabras del panel." },
]
  .map((i) => `<a class="indice-item" href="${i.href}"><span class="cap-num" aria-hidden="true">${i.num}</span><span><b>${i.titulo}</b><span>${i.texto}</span></span></a>`)
  .join("");

const si = (v) => (v ? '<span class="si">Sí</span>' : '<span class="no">No</span>');
const permisos = `
      <div class="tabla"><table>
        <thead><tr><th scope="col">Lo que se puede hacer</th>${PERMISOS.columnas.map((c) => `<th scope="col">${c}</th>`).join("")}</tr></thead>
        <tbody>${PERMISOS.filas.map(([q, ...v]) => `<tr><th scope="row">${q}</th>${v.map((x) => `<td>${si(x)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>`;
const estados = ESTADOS.map(
  (g) => `<div class="estados"><h4>${g.grupo}</h4><dl>${g.filas.map(([e, d]) => `<div><dt><span class="estado">${e}</span></dt><dd>${d}</dd></div>`).join("")}</dl></div>`,
).join("");
const dia = DIA.map((d) => `<div class="dia"><span class="quien quien--${d.quien}">${QUIEN[d.quien]}</span><h4>${d.titulo}</h4><ol>${d.pasos.map((p) => `<li>${p}</li>`).join("")}</ol></div>`).join("");
const problemas = PROBLEMAS.map(([p, r]) => `<div><dt>${p}</dt><dd>${r}</dd></div>`).join("");
const glosario = GLOSARIO.map(([p, r]) => `<div><dt>${p}</dt><dd>${r}</dd></div>`).join("");

const estilo = readFileSync(path.join(process.cwd(), "scripts", "manual", "estilo.css"), "utf8");

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
<header class="portada">
  <div class="ancho">
    <div class="portada-arriba"><img class="logo" src="/marca/toctar-horizontal-sin-lema-sobre-oscuro.svg" alt="TocTar Detailing"><a class="volver-panel" href="/panel">Volver al panel</a></div>
    <h1>Manual del panel</h1>
    <p>Para el dueño y los encargados de TocTar Detailing: cada pantalla, en una tablet, con números que señalan qué tocar.</p>
    <div class="portada-acciones">
      <a class="descargar" href="${RUTA}/manual-del-panel-toctar.pdf" download="Manual del panel TocTar.pdf">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
        Descargar PDF
      </a>
      <span class="leyenda-portada"><span class="marca marca--suelta" aria-hidden="true">1</span> En cada captura, el número señala lo que se explica debajo.</span>
    </div>
  </div>
</header>

<nav class="barra" aria-label="Partes del manual">
  <div class="ancho">${CAPITULOS.map((c) => `<a href="#${c.id}">${c.titulo}</a>`).join("")}<a href="#referencia">Para consultar</a></div>
</nav>

<main>
  <section class="ancho indice" aria-label="Índice">${indice}</section>
${capitulos}
  <section class="capitulo ancho" id="referencia" aria-labelledby="t-referencia">
    <header class="cap-cabeza">
      <span class="cap-num" aria-hidden="true">6</span>
      <div>
        <h2 id="t-referencia">Para consultar</h2>
        <p>Lo que conviene tener a mano: quién puede qué, qué dice cada estado y qué hacer ante un problema.</p>
      </div>
    </header>
    <article class="tema"><div class="tema-cabeza"><h3>Quién puede qué</h3></div><p class="intro">El dueño ve todo. A cada encargado se le da un perfil en Usuarios; se puede ajustar cada casilla.</p>${permisos}</article>
    <article class="tema"><div class="tema-cabeza"><h3>Qué dice cada estado</h3></div><div class="estados-grid">${estados}</div></article>
    <article class="tema"><div class="tema-cabeza"><h3>Un día cualquiera</h3></div><div class="dias">${dia}</div></article>
    <article class="tema"><div class="tema-cabeza"><h3>Problemas frecuentes</h3></div><dl class="problemas">${problemas}</dl></article>
    <article class="tema"><div class="tema-cabeza"><h3>Palabras del panel</h3></div><dl class="glosario">${glosario}</dl></article>
  </section>
</main>

<footer>
  <div class="ancho">
    <img src="/marca/toctar-horizontal-sin-lema-sobre-oscuro.svg" alt="TocTar Detailing">
    <span>Manual del panel, noviembre de 2026. Hecho por YankoSoft.</span>
  </div>
</footer>
</body>
</html>
`;

writeFileSync(path.join(SALIDA, "manual.html"), html);
const total = CAPITULOS.flatMap((c) => c.temas).filter((t) => t.captura).length;
console.log(`Listo: contenido/manual/manual.html, ${total} capturas.`);
