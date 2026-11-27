import { MarcoSitio } from "@/componentes/sitio/marco-sitio";

// El sitio público: encabezado, contenido y pie, siempre en tema oscuro (src/componentes/sitio/marco-sitio.tsx).
export default function LayoutSitio({ children }: LayoutProps<"/">) {
  return <MarcoSitio>{children}</MarcoSitio>;
}
