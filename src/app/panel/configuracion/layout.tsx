import { PestanasConfiguracion } from "@/modulos/configuracion/componentes/pestanas";

// Encabezado y pestañas de Configuración. Este layout NO protege: cada página llama a exigirModulo.
export default function LayoutConfiguracion({ children }: LayoutProps<"/panel/configuracion">) {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="tt-titulo-pagina">Configuración</h1>
        <PestanasConfiguracion />
      </div>
      {children}
    </section>
  );
}
