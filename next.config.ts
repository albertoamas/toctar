import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen de Docker chica: solo los archivos necesarios para correr (ver Dockerfile)
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
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
