import type { Metadata, Route } from "next";
import { TextoAccion } from "@/componentes/panel/texto-accion";
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
import { listarClientes, vehiculoConPlacaExacta } from "@/modulos/clientes/consultas";
import { normalizarBusqueda, rutaVehiculo } from "@/modulos/clientes/reglas";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { BarraLista } from "@/componentes/panel/barra-lista";
import { ENLACE_TEXTO } from "@/componentes/panel/enlace-texto";
import { aqui, conDesde } from "@/lib/volver";
import { Paginacion } from "@/componentes/panel/paginacion";
import { conPagina, leerPagina } from "@/lib/paginacion";

export const metadata: Metadata = { title: "Clientes" };

// HU-21 y HU-22: lista y búsqueda de clientes. Dueño o encargado con el permiso "clientes".
// Pulido 8.1: la fila de un toque compartida, con las placas (como el taller nombra los autos) en negrita.
// 17/11: de a páginas (antes, los 30 más recientes y "escribe algo más preciso").
export default function PaginaClientes({ searchParams }: PageProps<"/panel/clientes">) {
  return (
    <PaginaPanel tipo="lista">
      <EncabezadoPagina
        titulo="Clientes"
        accion={
          // Enlace con forma de botón: lleva a otra pantalla (cliente y vehículo: un formulario largo)
          <Link href="/panel/clientes/nuevo" className={cn(buttonVariants())}>
            <PlusIcon />
            <TextoAccion corto="Nuevo">Nuevo cliente</TextoAccion>
          </Link>
        }
      />
      {/* Aparte de la lista: al buscar, el campo no se vuelve a montar y no pierde el foco */}
      <Suspense fallback={<div className="h-9 pointer-coarse:h-11" />}>
        <BarraLista buscador={<Buscador />} />
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
  const [{ clientes, total, pagina, paginas }, delVehiculo] = await Promise.all([
    listarClientes({ q, desactivados, pagina: leerPagina(parametros.pagina) }),
    // Pedido 51: una placa exacta lleva directo a la ficha de ese vehículo (la placa es única entre los activos)
    q && !desactivados ? vehiculoConPlacaExacta(q) : null,
  ]);
  const busqueda = normalizarBusqueda(q);
  // Los desactivados, al final de la lista (26/11): se miran poco y en el celular ocupaban un renglón arriba. Viéndolos,
  // arriba dice qué son, con la vuelta a los activos
  const otraVista = conPagina("/panel/clientes", { ...parametros, ver: desactivados ? undefined : "desactivados" }, 1) as Route;
  const vista = desactivados ? (
    <p className="flex flex-wrap items-center gap-x-3 text-sm text-tinta-suave">
      Clientes desactivados
      <Link href={otraVista} className={cn(ENLACE_TEXTO, "text-tinta")}>
        Ver los activos
      </Link>
    </p>
  ) : null;
  const alFinal = desactivados ? null : (
    <Link href={otraVista} className={cn(ENLACE_TEXTO, "text-sm text-tinta-suave")}>
      Ver clientes desactivados
    </Link>
  );
  // Pedido 51: una placa exacta, arriba, también si su dueño no sale en la lista (desactivado)
  const atajo = delVehiculo && (
    <ListaFilas
      etiqueta="Vehículo con esa placa"
      filas={[
        {
          href: conDesde(rutaVehiculo(delVehiculo.clienteId, delVehiculo.id), desdeAqui),
          titulo: delVehiculo.placa,
          tituloGrande: true,
          detalles: [`De ${delVehiculo.cliente}: ver su ficha`],
        },
      ]}
    />
  );
  if (clientes.length === 0) {
    return (
      <>
        {vista}
        {atajo}
        <EstadoVacio>
          {q
            ? `No hay clientes${desactivados ? " desactivados" : ""} con «${q.trim()}».`
            : desactivados
              ? "No hay clientes desactivados."
              : "Todavía no hay clientes. Agrega el primero con «Nuevo cliente»."}
        </EstadoVacio>
        {alFinal}
      </>
    );
  }

  return (
    <>
      {vista}
      {atajo}
      <TablaClientes
        etiqueta={desactivados ? "Clientes desactivados" : "Clientes"}
        clientes={clientes}
        busqueda={busqueda}
        href={(id) => conDesde(`/panel/clientes/${id}` as Route, desdeAqui)}
        atenuadas={desactivados}
      />
      <Paginacion pagina={pagina} paginas={paginas} total={total} nombre={["cliente", "clientes"]} enlace={(p) => conPagina("/panel/clientes", parametros, p)} />
      {alFinal}
    </>
  );
}
