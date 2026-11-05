"use client";

import { usePathname } from "next/navigation";
import { ErrorInesperado } from "@/componentes/sitio/error-inesperado";

// Un error inesperado fuera del sitio y del panel (por ejemplo, el ingreso), en tema oscuro como el ingreso (pulido 13.5).
// También el que rompe el diseño del panel (su menú o su sesión), que panel/error.tsx no alcanza: ahí "Ir al inicio"
// vuelve al panel, no al sitio.
export default function ErrorGeneral({ retry }: { error: unknown; retry: () => void }) {
  const ruta = usePathname();
  return (
    <div data-theme="oscuro" data-fondo="oscuro" className="flex flex-1 flex-col bg-fondo text-tinta">
      <ErrorInesperado retry={retry} inicio={ruta.startsWith("/panel") ? "/panel" : "/"} />
    </div>
  );
}
