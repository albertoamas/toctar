// Service worker de TocTar (HU-06, RNF-03). Mínimo a propósito: no guarda el panel para usarlo
// sin internet (fuera del acuerdo). Solo guarda la página de aviso y la muestra cuando una
// navegación falla por falta de conexión. Las demás peticiones van directo a la red.
const CACHE = "toctar-sin-conexion-v1";
const PAGINA_SIN_CONEXION = "/sin-conexion.html";

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.add(PAGINA_SIN_CONEXION)).then(() => self.skipWaiting()));
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
  if (evento.request.mode !== "navigate") return;
  evento.respondWith(fetch(evento.request).catch(() => caches.match(PAGINA_SIN_CONEXION)));
});
