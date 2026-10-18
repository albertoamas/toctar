import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { ListaEditable } from "@/modulos/configuracion/componentes/lista-editable";
import { listarElementos } from "@/modulos/configuracion/consultas";

export const metadata: Metadata = { title: "Configuración del taller" };

// HU-05: espacios del taller (RN-06) y tamaños de vehículo (RN-07). Solo el dueño.
export default function PaginaTaller() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await exigirModulo("configuracion");
  const [espacios, tamanos] = await Promise.all([listarElementos("espacios"), listarElementos("tamanos")]);
  return (
    <div className="grid max-w-5xl gap-12 lg:grid-cols-2">
      <ListaEditable
        lista="espacios"
        elementos={espacios}
        descripcion="Cada espacio recibe un vehículo por día: la agenda no deja reservar dos en el mismo."
      />
      <ListaEditable
        lista="tamanos"
        elementos={tamanos}
        descripcion="Los precios de cada servicio se cargan por tamaño. El orden es el de las listas al cotizar."
      />
    </div>
  );
}
