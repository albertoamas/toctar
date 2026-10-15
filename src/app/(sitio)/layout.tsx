import { Encabezado } from "@/componentes/sitio/encabezado";
import { Pie } from "@/componentes/sitio/pie";

// El sitio público va siempre en tema oscuro (identidad visual: la versión principal del logo es sobre negro).
export default function LayoutSitio({ children }: LayoutProps<"/">) {
  return (
    <div data-theme="oscuro" className="flex flex-1 flex-col bg-fondo text-tinta">
      <Encabezado />
      <main className="flex flex-1 flex-col">{children}</main>
      <Pie />
    </div>
  );
}
