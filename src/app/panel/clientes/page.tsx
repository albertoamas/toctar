import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { buttonVariants } from "@/componentes/ui/button";
import { exigirModulo } from "@/lib/sesion";
import { Buscador } from "@/componentes/panel/buscador";
import { TablaClientes } from "@/modulos/clientes/componentes/tabla-clientes";
import { buscarClientes } from "@/modulos/clientes/consultas";
import { normalizarBusqueda } from "@/modulos/clientes/reglas";
import { BarraLista } from "@/componentes/panel/barra-lista";
import { PildoraVista } from "@/componentes/panel/pildora-vista";
import { aqui, conDesde } from "@/lib/volver";

export const metadata: Metadata = { title: "Clientes" };

// HU-21 y HU-22: lista y búsqueda de clientes. Dueño o encargado con el permiso "clientes".
// Pulido 8.1: la fila de un toque compartida, con las placas (como el taller nombra los autos) en negrita.
export default function PaginaClientes({ searchParams }: PageProps<"/panel/clientes">) {
  return (
    <PaginaPanel tipo="lista">
      <EncabezadoPagina
        titulo="Clientes"
        accion={
          // Enlace con forma de botón: lleva a otra pantalla (cliente y vehículo: un formulario largo)
          <Link href="/panel/clientes/nuevo" className={cn(buttonVariants())}>
            <PlusIcon />
            Agregar cliente
          </Link>
        }
      />
      {/* Aparte de la lista: al buscar, el campo no se vuelve a montar y no pierde el foco */}
      <Suspense fallback={<div className="h-9 pointer-coarse:h-11" />}>
        <BarraLista buscador={<Buscador />} derecha={<PildoraVista texto="Desactivados" valor="desactivados" />} />
      </Suspense>
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/panel/clientes">, "searchParams">) {
  await exigirModulo("clientes");
  const parametros = await searchParams;
  // Pedido 43: cada ficha vuelve a esta lista, con su búsqueda
  const desdeAqui = aqui("/panel/clientes", parametros);
  const q = typeof parametros.q === "string" ? parametros.q : "";
  const desactivados = parametros.ver === "desactivados";
  const { clientes, hayMas } = await buscarClientes(q, desactivados);
  const busqueda = normalizarBusqueda(q);
  if (clientes.length === 0) {
    return (
      <>
        <EstadoVacio>
          {q
            ? `No hay clientes${desactivados ? " desactivados" : ""} con «${q.trim()}».`
            : desactivados
              ? "No hay clientes desactivados."
              : "Todavía no hay clientes. Agrega el primero con «Agregar cliente»."}
        </EstadoVacio>
      </>
    );
  }

  return (
    <>
      <TablaClientes
        etiqueta={desactivados ? "Clientes desactivados" : "Clientes"}
        clientes={clientes}
        busqueda={busqueda}
        href={(id) => conDesde(`/panel/clientes/${id}` as Route, desdeAqui)}
        atenuadas={desactivados}
      />
      {hayMas && <p className="text-sm text-tinta-suave">Hay más clientes: escribe algo más preciso para encontrar el que buscas.</p>}
    </>
  );
}
