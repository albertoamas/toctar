import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { EditorPlantilla } from "@/modulos/configuracion/componentes/editor-plantilla";
import { obtenerDatosPublicos, obtenerPlantillas } from "@/modulos/configuracion/consultas";
import { CLAVES_PLANTILLA } from "@/modulos/configuracion/plantillas";

export const metadata: Metadata = { title: "Mensajes" };

// HU-40: los mensajes de WhatsApp que se envían desde la orden, los saldos y los mantenimientos. Solo el dueño.
export default function PaginaMensajes() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await exigirModulo("configuracion");
  const [plantillas, negocio] = await Promise.all([obtenerPlantillas(), obtenerDatosPublicos()]);
  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <p className="max-w-2xl text-tinta-suave">
        Los mensajes que se arman para enviar por WhatsApp; quien avisa los revisa y los envía desde su celular. Cada campo
        entre llaves se cambia por el dato de ese cliente: tócalo para agregarlo donde está el cursor.
      </p>
      {CLAVES_PLANTILLA.map((c) => (
        <EditorPlantilla key={c} clave={c} guardado={plantillas[c]} negocio={negocio.nombre} />
      ))}
    </div>
  );
}
