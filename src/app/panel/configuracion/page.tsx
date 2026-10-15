import type { Metadata } from "next";
import { Suspense } from "react";
import { exigirModulo } from "@/lib/sesion";
import { whatsAppLocal } from "@/lib/whatsapp";
import { FormularioNegocio } from "@/modulos/configuracion/componentes/formulario-negocio";
import { LogoDocumentos } from "@/modulos/configuracion/componentes/logo-documentos";
import { obtenerConfiguracionNegocio } from "@/modulos/configuracion/consultas";

export const metadata: Metadata = { title: "Configuración" };

// HU-04: datos del negocio. Solo el dueño (módulo "configuracion").
export default function PaginaConfiguracion() {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-4xl font-extrabold italic">Configuración</h1>
        <p className="text-tinta-suave">Datos del negocio que se muestran en la página y en los documentos.</p>
      </div>
      <Suspense fallback={<p className="text-tinta-suave">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </section>
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
      <FormularioNegocio valores={valores} horarios={c.horarios} />
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <LogoDocumentos logo={c.logo} />
      </aside>
    </div>
  );
}
