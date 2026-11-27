"use client";

import "./globals.css";

// Último recurso (pulido 13.5): falló el diseño raíz y no hay nada más que mostrar. Next lo dibuja con su propio
// documento, sin los estilos ni las fuentes del resto: por eso importa los estilos y usa el tema oscuro de la marca.
// Sin metadata (es un componente de cliente): el título va con <title>.
export default function ErrorGlobal({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es">
      <body data-theme="oscuro" className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-fondo px-4 text-center text-tinta">
        <title>Algo salió mal · TocTar Detailing</title>
        <h1 className="font-heading text-4xl font-extrabold italic">Algo salió mal</h1>
        <p className="max-w-md text-tinta-suave">Fue un problema nuestro. Vuelve a intentar en un momento.</p>
        <button type="button" onClick={() => retry()} className="tt-boton tt-boton--principal">
          Volver a intentar
        </button>
      </body>
    </html>
  );
}
