"use client";

import { ErrorInesperado } from "@/componentes/sitio/error-inesperado";

// Un error inesperado fuera del sitio y del panel (por ejemplo, el ingreso), en tema oscuro como el ingreso (pulido 13.5).
export default function ErrorGeneral({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div data-theme="oscuro" className="flex flex-1 flex-col bg-fondo text-tinta">
      <ErrorInesperado retry={retry} />
    </div>
  );
}
