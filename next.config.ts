import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen de Docker chica: solo los archivos necesarios para correr (ver Dockerfile)
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Fotos y logo suben por Server Actions: hasta 5 MB por imagen, más lo que agrega el formulario.
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() {
    return [
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
