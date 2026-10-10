import { Encabezado } from "@/componentes/sitio/encabezado";

// Diseño del sitio público. Los datos del negocio (pie, WhatsApp) se leen de la
// configuración cuando exista HU-04.
export default function LayoutSitio({ children }: LayoutProps<"/">) {
  return (
    <>
      <Encabezado />
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">
          TocTar Detailing · Tarija, Bolivia
        </div>
      </footer>
    </>
  );
}
