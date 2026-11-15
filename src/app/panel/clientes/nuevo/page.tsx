import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { exigirModulo } from "@/lib/sesion";
import { FormularioNuevoCliente } from "@/modulos/clientes/componentes/formulario-nuevo-cliente";
import { tamanosActivos } from "@/modulos/configuracion/consultas";

export const metadata: Metadata = { title: "Agregar cliente" };

// HU-21: registrar un cliente con su primer vehículo. Dueño o encargado con el permiso "clientes".
export default function PaginaNuevoCliente() {
  return (
    <PaginaPanel tipo="formulario">
      <EncabezadoPagina titulo="Agregar cliente" volver={{ href: "/panel/clientes", texto: "Clientes" }} />
      <Suspense fallback={<Cargando />}>
        <Formulario />
      </Suspense>
    </PaginaPanel>
  );
}

async function Formulario() {
  await exigirModulo("clientes");
  return <FormularioNuevoCliente tamanos={await tamanosActivos()} />;
}
