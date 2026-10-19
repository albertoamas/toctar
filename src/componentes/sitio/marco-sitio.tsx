import { Encabezado } from "./encabezado";
import { Pie } from "./pie";

// Encabezado, contenido y pie del sitio público, siempre en tema oscuro (identidad visual: la versión principal del
// logo es sobre negro). Lo usan el diseño del sitio y la página no encontrada general, que queda fuera de él (pulido 2.9).
export function MarcoSitio({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="oscuro" className="flex flex-1 flex-col bg-fondo text-tinta">
      <Encabezado />
      <main className="flex flex-1 flex-col">{children}</main>
      <Pie />
    </div>
  );
}
