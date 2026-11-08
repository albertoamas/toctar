import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel, PartesIguales } from "@/componentes/panel/pagina-panel";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { exigirModulo } from "@/lib/sesion";
import { BurbujaMensaje } from "@/modulos/configuracion/componentes/burbuja-mensaje";
import { EditorPlantilla } from "@/modulos/configuracion/componentes/editor-plantilla";
import { obtenerDatosPublicos, obtenerPlantillas } from "@/modulos/configuracion/consultas";
import { CLAVES_PLANTILLA, PLANTILLAS } from "@/modulos/configuracion/plantillas";
import { mensajeDeEjemplo } from "@/modulos/ordenes/mensajes";

export const metadata: Metadata = { title: "Mensajes" };

// HU-40: los mensajes de WhatsApp que se envían desde la orden, los saldos y los mantenimientos. Solo el dueño.
// Pulido 13.28: una ficha. Cada mensaje se lee como le llega al cliente (con datos de ejemplo) y se edita en su modal.
// Antes eran tres editores abiertos (3,5 pantallas en el celular) y un párrafo que explicaba los campos.

const VOLVER = { href: "/panel/configuracion", texto: "Configuración" } as const;

export default function PaginaMensajes() {
  return (
    <PaginaPanel tipo="ficha">
      <Suspense fallback={<Cargando volver={VOLVER} />}>
        <Contenido />
      </Suspense>
    </PaginaPanel>
  );
}

async function Contenido() {
  await exigirModulo("configuracion");
  const [plantillas, negocio] = await Promise.all([obtenerPlantillas(), obtenerDatosPublicos()]);
  return (
    <>
      <EncabezadoPagina titulo="Mensajes" volver={VOLVER} />
      <PartesIguales>
        {CLAVES_PLANTILLA.map((c) => (
          <SeccionConEditar
            key={c}
            // Otro prefijo que el del campo del editor ("mensaje-listo"): no se mezclan sus ids
            id={`seccion-mensaje-${c}`}
            titulo={PLANTILLAS[c].titulo}
            etiquetaEditar={`Editar mensaje: ${PLANTILLAS[c].titulo}`}
            tituloModal={PLANTILLAS[c].titulo}
            lectura={
              <div className="flex flex-col gap-3">
                <p className="text-sm text-tinta-suave">{PLANTILLAS[c].cuando}</p>
                <BurbujaMensaje texto={mensajeDeEjemplo(c, plantillas[c], negocio.nombre)} />
              </div>
            }
          >
            <EditorPlantilla clave={c} guardado={plantillas[c]} negocio={negocio.nombre} />
          </SeccionConEditar>
        ))}
      </PartesIguales>
    </>
  );
}
