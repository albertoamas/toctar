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
