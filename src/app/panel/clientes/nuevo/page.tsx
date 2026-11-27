import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { exigirModulo } from "@/lib/sesion";
import { FormularioNuevoCliente } from "@/modulos/clientes/componentes/formulario-nuevo-cliente";
import { tamanosActivos } from "@/modulos/configuracion/consultas";
import { catalogoVehiculos } from "@/modulos/clientes/consultas";

export const metadata: Metadata = { title: "Nuevo cliente" };

// HU-21: registrar un cliente con su primer vehículo. Dueño o encargado con el permiso "clientes".
export default function PaginaNuevoCliente() {
  return (
    <PaginaPanel tipo="formulario">
      <EncabezadoPagina titulo="Nuevo cliente" volver={{ href: "/panel/clientes", texto: "Clientes" }} />
      <Suspense fallback={<Cargando />}>
        <Formulario />
      </Suspense>
    </PaginaPanel>
  );
}

async function Formulario() {
  await exigirModulo("clientes");
  const [tamanos, catalogo] = await Promise.all([tamanosActivos(), catalogoVehiculos()]);
  return <FormularioNuevoCliente tamanos={tamanos} catalogo={catalogo} />;
}
