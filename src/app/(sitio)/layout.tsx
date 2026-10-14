import Image from "next/image";
import { Encabezado } from "@/componentes/sitio/encabezado";

// El sitio público va siempre en tema oscuro (identidad visual: la versión principal del logo es sobre negro).
// Los datos del negocio (pie, WhatsApp) se leen de la configuración cuando exista HU-04.
export default function LayoutSitio({ children }: LayoutProps<"/">) {
  return (
    <div data-theme="oscuro" className="flex flex-1 flex-col bg-fondo text-tinta">
      <Encabezado />
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8">
          <Image src="/marca/toctar-monograma-sobre-oscuro.svg" alt="" width={40} height={30} unoptimized />
          <p className="tt-lema text-tinta-suave">Como ven tu auto, te ven a ti</p>
          <p className="text-sm text-tinta-suave">Tarija, Bolivia</p>
        </div>
      </footer>
    </div>
  );
}
