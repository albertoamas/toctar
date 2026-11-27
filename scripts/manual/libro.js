// El manual como un libro (scripts/manual-armar.mjs lo pone dentro de la página): una página a la vez, que se pasa con
// Anterior y Siguiente, deslizando el dedo o con las flechas del teclado. Cada página tiene su dirección (#recibir…),
// así el índice lleva directo, el "atrás" del celular vuelve a la anterior y se puede recordar dónde quedó. Tocar una
// captura la abre en grande. Sin este script se ven todas las páginas, una tras otra (también al imprimir).
(function () {
  var paginas = Array.prototype.slice.call(document.querySelectorAll(".pagina"));
  if (paginas.length === 0) return;
  var raiz = document.documentElement;
  var cabeza = document.querySelector(".libro-cabeza");
  var pie = document.querySelector(".libro-pie");
  var capitulo = document.querySelector(".libro-capitulo");
  var numero = document.querySelector(".libro-numero");
  var anterior = document.querySelector(".libro-anterior");
  var siguiente = document.querySelector(".libro-siguiente");
  var avance = document.querySelector(".libro-avance span");
  var CLAVE = "manual-toctar-pagina";
  var actual = -1;

  raiz.classList.add("libro-activo");
  // Cada página empieza arriba: el navegador no salta al ancla ni recuerda dónde se había bajado
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  cabeza.hidden = false;
  pie.hidden = false;

  // La página de un id: la que es ese id o la que lo contiene
  function indiceDe(id) {
    if (!id) return -1;
    var elemento = document.getElementById(id);
    if (!elemento) return -1;
    var pagina = elemento.closest(".pagina");
    return pagina ? paginas.indexOf(pagina) : -1;
  }

  function guardar(i) {
    try {
      localStorage.setItem(CLAVE, String(i));
    } catch {
      // Sin almacenamiento (ventana privada): no se recuerda, nada más
    }
  }

  function mostrar(i, sentido) {
    if (i < 0 || i >= paginas.length || i === actual) return;
    var reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    paginas.forEach(function (p, j) {
      p.classList.toggle("actual", j === i);
      p.classList.remove("entra-adelante", "entra-atras");
    });
    var pagina = paginas[i];
    if (!reducir && sentido) pagina.classList.add(sentido > 0 ? "entra-adelante" : "entra-atras");
    capitulo.textContent = pagina.getAttribute("data-capitulo");
    numero.textContent = i + 1 + " de " + paginas.length;
    avance.style.width = ((i + 1) / paginas.length) * 100 + "%";
    anterior.disabled = i === 0;
    siguiente.disabled = i === paginas.length - 1;
    actual = i;
    window.scrollTo(0, 0);
    guardar(i);
  }

  // Ir a una página dejando la dirección en el historial: así el "atrás" vuelve
  function ir(i) {
    if (i < 0 || i >= paginas.length || i === actual) return;
    var sentido = i > actual ? 1 : -1;
    history.pushState({ pagina: i }, "", "#" + paginas[i].id);
    mostrar(i, sentido);
    var titulo = paginas[i].querySelector("h1, h2, h3");
    if (titulo) {
      titulo.setAttribute("tabindex", "-1");
      titulo.focus({ preventScroll: true });
    }
  }

  anterior.addEventListener("click", function () {
    ir(actual - 1);
  });
  siguiente.addEventListener("click", function () {
    ir(actual + 1);
  });

  // Los enlaces del índice y de cada capítulo
  document.addEventListener("click", function (evento) {
    var enlace = evento.target.closest('a[href^="#"]');
    if (!enlace) return;
    var i = indiceDe(enlace.getAttribute("href").slice(1));
    if (i < 0) return;
    evento.preventDefault();
    ir(i);
  });

  window.addEventListener("popstate", function () {
    var i = indiceDe(location.hash.slice(1));
    mostrar(i < 0 ? 0 : i, i < actual ? -1 : 1);
  });

  // Flechas del teclado (no mientras se escribe o con la captura en grande abierta)
  document.addEventListener("keydown", function (evento) {
    if (evento.altKey || evento.ctrlKey || evento.metaKey || document.querySelector("dialog[open]")) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    if (evento.key === "ArrowRight") ir(actual + 1);
    if (evento.key === "ArrowLeft") ir(actual - 1);
  });

  // Deslizar el dedo: de costado y más que de arriba abajo (así no molesta al bajar por la página)
  var inicio = null;
  document.addEventListener(
    "touchstart",
    function (evento) {
      if (evento.touches.length !== 1 || document.querySelector("dialog[open]")) return (inicio = null);
      inicio = { x: evento.touches[0].clientX, y: evento.touches[0].clientY };
    },
    { passive: true },
  );
  document.addEventListener(
    "touchend",
    function (evento) {
      if (!inicio) return;
      var dx = evento.changedTouches[0].clientX - inicio.x;
      var dy = evento.changedTouches[0].clientY - inicio.y;
      inicio = null;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      // Dentro de una tabla que se desplaza de costado, el dedo la mueve a ella
      if (evento.target.closest(".tabla")) return;
      ir(dx < 0 ? actual + 1 : actual - 1);
    },
    { passive: true },
  );

  // La captura en grande: la imagen entera, con zoom con los dedos
  var visor = document.querySelector(".visor");
  var cuerpo = visor.querySelector(".visor-cuerpo");
  document.addEventListener("click", function (evento) {
    var pantalla = evento.target.closest(".pantalla");
    if (!pantalla || typeof visor.showModal !== "function") return;
    var copia = pantalla.cloneNode(true);
    var lupa = copia.querySelector(".agrandar");
    if (lupa) lupa.remove();
    var imagen = copia.querySelector("img");
    imagen.loading = "eager";
    var marco = document.createElement("div");
    marco.className = "visor-pantalla";
    while (copia.firstChild) marco.appendChild(copia.firstChild);
    cuerpo.replaceChildren(marco);
    visor.showModal();
  });
  visor.querySelector(".visor-cerrar").addEventListener("click", function () {
    visor.close();
  });
  visor.addEventListener("click", function (evento) {
    if (evento.target === visor) visor.close();
  });

  // Al abrir: la página de la dirección; si no hay, la portada, y si se había quedado en otra, se ofrece seguir ahí
  var desdeDireccion = indiceDe(location.hash.slice(1));
  // Antes de mostrar la primera: mostrarla ya guarda esa como la última leída
  var guardada = -1;
  try {
    guardada = Number(localStorage.getItem(CLAVE));
  } catch {
    guardada = -1;
  }
  history.replaceState({ pagina: Math.max(desdeDireccion, 0) }, "");
  mostrar(desdeDireccion < 0 ? 0 : desdeDireccion, 0);
  window.addEventListener("load", function () {
    window.scrollTo(0, 0);
  });
  if (desdeDireccion < 0) {
    if (guardada > 1 && guardada < paginas.length) {
      var aviso = document.querySelector(".seguir");
      aviso.querySelector("span").textContent = "Te quedaste en la página " + (guardada + 1) + ": " + (paginas[guardada].querySelector("h2, h3") || {}).textContent + ".";
      aviso.hidden = false;
      aviso.querySelector(".seguir-si").addEventListener("click", function () {
        aviso.hidden = true;
        ir(guardada);
      });
      aviso.querySelector(".seguir-no").addEventListener("click", function () {
        aviso.hidden = true;
      });
    }
  }
})();
