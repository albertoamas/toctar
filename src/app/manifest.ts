import type { MetadataRoute } from "next";

// App instalable (HU-06, RF-19). La instala el personal: abre directo en el panel.
// Sin modo sin conexión (acuerdo): sin internet se ve un aviso (public/sw.js).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TocTar Detailing: Panel",
    short_name: "TocTar",
    description: "Panel de gestión de TocTar Detailing",
    lang: "es",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    // Sigue la rotación del celular: en Android la app instalada respeta este valor (con "portrait" no giraba); el
    // iPhone lo ignora. El panel y el sitio se adaptan al ancho, y en horizontal hay más lugar (la firma al entregar).
    orientation: "any",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
