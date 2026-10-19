import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { whatsAppLocal } from "@/lib/whatsapp";
import { FormularioNegocio } from "@/modulos/configuracion/componentes/formulario-negocio";
import { LogoDocumentos } from "@/modulos/configuracion/componentes/logo-documentos";
import { obtenerConfiguracionNegocio } from "@/modulos/configuracion/consultas";

export const metadata: Metadata = { title: "Configuración" };

// HU-04: datos del negocio (pestaña Negocio). Solo el dueño (módulo "configuracion").
export default function PaginaConfiguracion() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await exigirModulo("configuracion");
  const c = await obtenerConfiguracionNegocio();
  const valores = {
    nombre: c.nombre,
    whatsapp: c.whatsapp ? whatsAppLocal(c.whatsapp) : "",
    correo: c.correo ?? "",
    direccion: c.direccion,
    ubicacion: c.coordenadas ? `${c.coordenadas.lat}, ${c.coordenadas.lng}` : "",
    facebook: c.redes.facebook ?? "",
    instagram: c.redes.instagram ?? "",
    tiktok: c.redes.tiktok ?? "",
    nit: c.nit ?? "",
    razonSocial: c.razonSocial ?? "",
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,42rem)_minmax(0,20rem)]">
      <p className="text-tinta-suave lg:col-span-2">Datos del negocio que se muestran en la página y en los documentos.</p>
      <FormularioNegocio valores={valores} horarios={c.horarios} />
      {/* En el celular y la tableta va debajo de "Guardar cambios", que no lo guarda: una línea lo separa (pulido 6.1) */}
      <aside className="border-t border-border pt-10 lg:sticky lg:top-8 lg:self-start lg:border-0 lg:pt-0">
        <LogoDocumentos logo={c.logo} />
      </aside>
    </div>
  );
}
