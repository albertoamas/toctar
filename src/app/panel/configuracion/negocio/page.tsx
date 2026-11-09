import type { Metadata } from "next";
import { Suspense } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { ListaDatos } from "@/componentes/panel/lista-datos";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel, PartesIguales } from "@/componentes/panel/pagina-panel";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { resumirHorarios } from "@/lib/horarios";
import { exigirModulo } from "@/lib/sesion";
import { enlaceMapa, textoEnlaceMapa } from "@/lib/ubicacion";
import { whatsAppLocal } from "@/lib/whatsapp";
import {
  FormularioContacto,
  FormularioFacturacion,
  FormularioHorario,
  FormularioRedes,
  FormularioUbicacion,
} from "@/modulos/configuracion/componentes/formulario-negocio";
import { LogoDocumentos } from "@/modulos/configuracion/componentes/logo-documentos";
import { obtenerConfiguracionNegocio } from "@/modulos/configuracion/consultas";
import { NOMBRE_RED, REDES } from "@/modulos/configuracion/esquemas";

export const metadata: Metadata = { title: "Negocio" };

// HU-04: datos del negocio, horario, redes y logo (Configuración > Negocio, pedido 26). Solo el dueño (módulo "configuracion").
// Pulido 13.26: una ficha que se lee, con cada parte en su modal (como el servicio del sitio, 13.19): el horario resumido
// ("Lunes a sábado"), el mapa como "Ver en el mapa" y no su código, el logo en su fila. Antes, 43 campos abiertos.

const VOLVER = { href: "/panel/configuracion", texto: "Configuración" } as const;

export default function PaginaNegocio() {
  return (
    <PaginaPanel tipo="ficha">
      <Suspense fallback={<Cargando volver={VOLVER} />}>
        <Contenido />
      </Suspense>
    </PaginaPanel>
  );
}

const sinCargar = <span className="text-tinta-suave">Sin cargar</span>;

async function Contenido() {
  await exigirModulo("configuracion");
  const c = await obtenerConfiguracionNegocio();
  const valores = {
    nombre: c.nombre,
    whatsapp: c.whatsapp ? whatsAppLocal(c.whatsapp) : "",
    correo: c.correo ?? "",
    direccion: c.direccion,
    // Las coordenadas que salieron del mapa no se muestran como si se hubieran escrito en el enlace
    enlaceMapa: textoEnlaceMapa(c.enlaceMapa, c.coordenadas, c.mapaInsertado),
    mapaInsertado: c.mapaInsertado ?? "",
    facebook: c.redes.facebook ?? "",
    instagram: c.redes.instagram ?? "",
    tiktok: c.redes.tiktok ?? "",
    nit: c.nit ?? "",
    razonSocial: c.razonSocial ?? "",
  };
  // "Ver en el mapa": lo guardado, para revisar que abre el taller
  const verEnMapa = c.enlaceMapa ?? (c.coordenadas ? enlaceMapa(c.coordenadas) : null);

  return (
    <>
      <EncabezadoPagina titulo="Negocio" volver={VOLVER} />

      <PartesIguales>
        <SeccionConEditar
          id="contacto"
          titulo="Contacto"
          etiquetaEditar="Editar contacto"
          tituloModal="Contacto"
          lectura={
            <ListaDatos
              filas={[
                ["Nombre", c.nombre],
                ["WhatsApp", c.whatsapp ? `+591 ${whatsAppLocal(c.whatsapp)}` : sinCargar],
                ["Correo", c.correo ?? sinCargar],
              ]}
            />
          }
        >
          <FormularioContacto valores={valores} />
        </SeccionConEditar>

        <SeccionConEditar
          id="ubicacion"
          titulo="Ubicación"
          etiquetaEditar="Editar ubicación"
          tituloModal="Ubicación"
          lectura={
            <div className="flex flex-col gap-2">
              <p>{c.direccion || sinCargar}</p>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tinta-suave">
                {verEnMapa ? (
                  <a href={verEnMapa} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 font-semibold text-tinta underline">
                    Ver en el mapa
                    <ExternalLinkIcon className="size-3.5" aria-hidden />
                  </a>
                ) : (
                  <span>Sin ubicación en el mapa</span>
                )}
                {/* El pin sale de las coordenadas: sin ellas ni mapa cargado, la página no muestra mapa */}
                <span>
                  {c.mapaInsertado ? "El mapa de la página está cargado." : c.coordenadas ? "La página muestra un pin en la ubicación." : "La página no muestra mapa."}
                </span>
              </p>
            </div>
          }
        >
          <FormularioUbicacion valores={valores} />
        </SeccionConEditar>

        <SeccionConEditar
          id="horario"
          titulo="Horario de atención"
          etiquetaEditar="Editar horario de atención"
          tituloModal="Horario de atención"
          lectura={<ListaDatos filas={resumirHorarios(c.horarios).map((g) => [g.dias, g.horario === "cerrado" ? "Cerrado" : g.horario])} />}
        >
          <FormularioHorario horarios={c.horarios} />
        </SeccionConEditar>

        <SeccionConEditar
          id="redes"
          titulo="Redes sociales"
          etiquetaEditar="Editar redes sociales"
          tituloModal="Redes sociales"
          lectura={
            <ListaDatos
              filas={REDES.map((red) => [
                NOMBRE_RED[red],
                c.redes[red] ? (
                  // En una línea, con "…" si no entra: partido a la mitad de una palabra no se leía en el celular
                  <a href={c.redes[red]} target="_blank" rel="noreferrer" className="block truncate underline">
                    {c.redes[red]!.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                ) : (
                  <span className="text-tinta-suave">No se muestra</span>
                ),
              ])}
            />
          }
        >
          <FormularioRedes valores={valores} />
        </SeccionConEditar>

        <SeccionConEditar
          id="facturacion"
          titulo="Datos para facturar"
          etiquetaEditar="Editar datos para facturar"
          tituloModal="Datos para facturar"
          lectura={
            <ListaDatos
              filas={[
                ["NIT", c.nit ?? sinCargar],
                ["Razón social", c.razonSocial ?? sinCargar],
              ]}
            />
          }
        >
          <FormularioFacturacion valores={valores} />
        </SeccionConEditar>

        {/* Se guarda al momento, sin modal: el logo se cambia en su lugar */}
        <Seccion id="logo" titulo="Logo para documentos">
          <LogoDocumentos logo={c.logo} />
        </Seccion>
      </PartesIguales>
    </>
  );
}
