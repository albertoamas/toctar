import type { NextConfig } from "next";

// Encabezados de seguridad de todas las respuestas (revisión de seguridad de la Entrega 1).
// - Nadie puede meter el sitio ni el panel dentro de otra página para engañar al usuario (clickjacking).
// - La política de contenido no limita los scripts: Next.js usa scripts en línea y exigir un "nonce"
//   volvería dinámicas todas las páginas. Solo cierra lo que no se usa (objetos, <base>, formularios a otros sitios).
// - HSTS: el navegador solo usa https (lo ignora mientras se trabaja con http en desarrollo).
const ENCABEZADOS_SEGURIDAD = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // Imagen de Docker chica: solo los archivos necesarios para correr (ver Dockerfile)
  output: "standalone",
  // No anunciar la tecnología del servidor.
  poweredByHeader: false,
  // Solo en desarrollo (npm run dev): permite probar desde el celular por la red local (http://192.168.x.x:3000).
  // Sin esto, el servidor de desarrollo no le entrega el JavaScript a otra dirección que localhost y nada
  // interactivo funciona (menú, formularios, visor). No afecta a pruebas ni a producción.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Fotos y logo suben por Server Actions: hasta 5 MB por imagen, más lo que agrega el formulario.
    serverActions: { bodySizeLimit: "6mb" },
  },
  // Direcciones que cambiaron con la reorganización del panel (C5 §0): los favoritos y el historial siguen andando
  async redirects() {
    return [
      { source: "/panel/configuracion/cotizaciones", destination: "/panel/configuracion/parametros", permanent: true },
      { source: "/panel/sitio/servicios/nuevo", destination: "/panel/catalogo/nuevo", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: ENCABEZADOS_SEGURIDAD },
      {
        // El service worker siempre se pide de nuevo: así un cambio llega a todos (HU-06).
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
