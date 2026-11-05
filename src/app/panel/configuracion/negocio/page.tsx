import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { whatsAppLocal } from "@/lib/whatsapp";
import { textoEnlaceMapa } from "@/lib/ubicacion";
import { FormularioNegocio } from "@/modulos/configuracion/componentes/formulario-negocio";
import { LogoDocumentos } from "@/modulos/configuracion/componentes/logo-documentos";
import { obtenerConfiguracionNegocio } from "@/modulos/configuracion/consultas";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";

export const metadata: Metadata = { title: "Negocio" };

// HU-04: datos del negocio, horario, redes y logo (Configuración > Negocio, pedido 26). Solo el dueño (módulo "configuracion").
export default function PaginaNegocio() {
  return (
    <>
      <EncabezadoPagina titulo="Negocio" volver={{ href: "/panel/configuracion", texto: "Configuración" }} />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
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
    enlaceMapa: textoEnlaceMapa(c.enlaceMapa, c.coordenadas),
    mapaInsertado: c.mapaInsertado ?? "",
    facebook: c.redes.facebook ?? "",
    instagram: c.redes.instagram ?? "",
    tiktok: c.redes.tiktok ?? "",
    nit: c.nit ?? "",
    razonSocial: c.razonSocial ?? "",
  };

  // Una columna que no pasa del ancho de la pantalla (minmax(0,1fr)): con "auto", el contenido más ancho la ensanchaba y
  // en el Chromium de Linux los campos se salían 7 px a 360 de ancho (lo encontró el CI, 25/10)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,42rem)_minmax(0,20rem)]">
      <p className="text-sm text-tinta-suave lg:col-span-2">Datos del negocio que se muestran en la página y en los documentos.</p>
      <FormularioNegocio valores={valores} horarios={c.horarios} />
      {/* En el celular y la tableta va debajo de "Guardar cambios", que no lo guarda: en su propia tarjeta (pulido 6.1;
          pedido 26) */}
      <aside className="tt-tarjeta-panel p-4 sm:p-5 lg:sticky lg:top-8 lg:self-start">
        <LogoDocumentos logo={c.logo} />
      </aside>
    </div>
  );
}
