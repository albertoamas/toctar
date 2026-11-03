import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { buttonVariants } from "@/componentes/ui/button";
import { exigirModulo } from "@/lib/sesion";
import { BuscadorClientes } from "@/modulos/clientes/componentes/buscador-clientes";
import { TablaClientes } from "@/modulos/clientes/componentes/tabla-clientes";
import { buscarClientes } from "@/modulos/clientes/consultas";
import { normalizarBusqueda } from "@/modulos/clientes/reglas";

export const metadata: Metadata = { title: "Clientes" };

// HU-21 y HU-22: lista y búsqueda de clientes. Dueño o encargado con el permiso "clientes".
// Pulido 8.1: la fila de un toque compartida, con las placas (como el taller nombra los autos) en negrita.
export default function PaginaClientes({ searchParams }: PageProps<"/panel/clientes">) {
  return (
    <section className="flex flex-col gap-6">
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
      <Suspense fallback={<div className="h-9 max-w-md pointer-coarse:h-11" />}>
        <BuscadorClientes />
      </Suspense>
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/panel/clientes">, "searchParams">) {
  await exigirModulo("clientes");
  const parametros = await searchParams;
  const q = typeof parametros.q === "string" ? parametros.q : "";
  const desactivados = parametros.ver === "desactivados";
  const { clientes, hayMas } = await buscarClientes(q, desactivados);
  const busqueda = normalizarBusqueda(q);
  // Los enlaces conservan la búsqueda escrita: el campo la sigue mostrando
  const conBusqueda = (ver?: string) => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q);
    if (ver) p.set("ver", ver);
    const consulta = p.toString();
    return (consulta ? `/panel/clientes?${consulta}` : "/panel/clientes") as Route;
  };
  const enlace = "inline-flex min-h-11 items-center self-start text-sm underline";
  // Los desactivados se ven rara vez: el enlace va al final. Viéndolos, se dice arriba y se vuelve desde ahí
  const verDesactivados = !desactivados && (
    <Link href={conBusqueda("desactivados")} className={cn(enlace, "text-tinta-suave")}>
      Ver desactivados
    </Link>
  );
  const vistaDesactivados = desactivados && (
    <p className="-mt-3 flex flex-wrap items-center gap-x-2 text-tinta-suave">
      Desactivados.
      <Link href={conBusqueda()} className={cn(enlace, "font-semibold text-tinta")}>
        Ver los activos
      </Link>
    </p>
  );

  if (clientes.length === 0) {
    return (
      <>
        {vistaDesactivados}
        <EstadoVacio>
          {q
            ? `No hay clientes${desactivados ? " desactivados" : ""} con «${q.trim()}».`
            : desactivados
              ? "No hay clientes desactivados."
              : "Todavía no hay clientes. Agrega el primero con «Agregar cliente»."}
        </EstadoVacio>
        {verDesactivados}
      </>
    );
  }

  return (
    <>
      {vistaDesactivados}
      <TablaClientes
        etiqueta={desactivados ? "Clientes desactivados" : "Clientes"}
        clientes={clientes}
        busqueda={busqueda}
        href={(id) => `/panel/clientes/${id}`}
        atenuadas={desactivados}
      />
      {hayMas && <p className="text-sm text-tinta-suave">Hay más clientes: escribe algo más preciso para encontrar el que buscas.</p>}
      {verDesactivados}
    </>
  );
}
