import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { exigirModulo } from "@/lib/sesion";
import { ListaEditable } from "@/modulos/configuracion/componentes/lista-editable";
import { listarElementos } from "@/modulos/configuracion/consultas";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";

export const metadata: Metadata = { title: "Configuración del taller" };

// HU-05: espacios del taller (RN-06) y tamaños de vehículo (RN-07); pedido 12: las partes del checklist de recepción.
// Solo el dueño. Pulido 13.27: una lista debajo de la otra (en dos columnas, el checklist quedaba solo con un hueco al lado).
export default function PaginaTaller() {
  return (
    <>
      <EncabezadoPagina titulo="Taller" volver={{ href: "/panel/configuracion", texto: "Configuración" }} />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirModulo("configuracion");
  const [espacios, tamanos, partes] = await Promise.all([listarElementos("espacios"), listarElementos("tamanos"), listarElementos("partes")]);
  return (
    <div className="flex max-w-3xl flex-col gap-10">
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
      <ListaEditable lista="partes" elementos={partes} descripcion="Lo que se revisa al recibir un vehículo, en este orden." />
    </div>
  );
}
