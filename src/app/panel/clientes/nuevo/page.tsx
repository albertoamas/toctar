import type { Metadata } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { exigirModulo } from "@/lib/sesion";
import { volverDesde } from "@/lib/volver";
import { FormularioNuevoCliente } from "@/modulos/clientes/componentes/formulario-nuevo-cliente";
import { tamanosActivos } from "@/modulos/configuracion/consultas";
import { catalogoVehiculos } from "@/modulos/clientes/consultas";

export const metadata: Metadata = { title: "Nuevo cliente" };

// HU-21: registrar un cliente con su primer vehículo. Dueño o encargado con el permiso "clientes".
// Desde "Cliente nuevo" de Nueva reserva (20/11, `?volver=` a la reserva): "Volver" lleva a ella y, al crear, la reserva
// sigue con el cliente ya elegido.
export default function PaginaNuevoCliente({ searchParams }: PageProps<"/panel/clientes/nuevo">) {
  return (
    <PaginaPanel tipo="formulario">
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/panel/clientes/nuevo">, "searchParams">) {
  const usuario = await exigirModulo("clientes");
  const [tamanos, catalogo, parametros] = await Promise.all([tamanosActivos(), catalogoVehiculos(), searchParams]);
  const volver = volverDesde(parametros.volver, { href: "/panel/clientes", texto: "Clientes" }, usuario);
  // Solo una reserva nueva sigue con el cliente creado; desde otra pantalla, a la ficha del cliente, como siempre
  const reserva = volver.href.startsWith("/panel/agenda/nueva") ? volver.href : undefined;
  return (
    <>
      <EncabezadoPagina titulo="Nuevo cliente" volver={volver} />
      <FormularioNuevoCliente tamanos={tamanos} catalogo={catalogo} reserva={reserva} />
    </>
  );
}
