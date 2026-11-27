// Service worker de TocTar (HU-06, RNF-03). Mínimo a propósito: no guarda el panel para usarlo
// sin internet (fuera del acuerdo). Solo guarda la página de aviso (con sus dos fuentes) y la muestra
// cuando una navegación falla por falta de conexión. Las demás peticiones van directo a la red.
// v2: se suman las fuentes (pulido 2.10); al cambiar el nombre, "activate" borra la caché v1.
const CACHE = "toctar-sin-conexion-v2";
const PAGINA_SIN_CONEXION = "/sin-conexion.html";
const FUENTES = ["/fuentes/barlow-condensed-800-italica-latin.woff2", "/fuentes/montserrat-variable-latin.woff2"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([PAGINA_SIN_CONEXION, ...FUENTES]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  // Las fuentes de la página sin conexión salen de la caché (sin red no hay otra forma de tenerlas).
  if (FUENTES.includes(new URL(evento.request.url).pathname)) {
    evento.respondWith(caches.match(evento.request).then((guardada) => guardada ?? fetch(evento.request)));
    return;
  }
  if (evento.request.mode !== "navigate") return;
  evento.respondWith(fetch(evento.request).catch(() => caches.match(PAGINA_SIN_CONEXION)));
});
