"use client";

import { ErrorInesperado } from "@/componentes/sitio/error-inesperado";

// Un error inesperado en una página del sitio (pulido 13.5): se muestra dentro de su marco (encabezado y pie), en vez de
// la página genérica de Next. En producción no lleva el detalle del error (Next lo oculta).
export default function ErrorSitio({ retry }: { error: unknown; retry: () => void }) {
  return <ErrorInesperado retry={retry} />;
}
