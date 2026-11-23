import type { Metadata } from "next";
import { TextoAccion } from "@/componentes/panel/texto-accion";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { Pestanas } from "@/componentes/panel/pestanas";
import { buttonVariants } from "@/componentes/ui/button";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { Buscador } from "@/componentes/panel/buscador";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { ListaCotizaciones } from "@/modulos/cotizaciones/componentes/lista-cotizaciones";
import { TarjetasCotizaciones } from "@/modulos/cotizaciones/componentes/tarjetas-cotizaciones";
import { contarPorVista, listarCotizaciones } from "@/modulos/cotizaciones/consultas/lista";
import { Paginacion } from "@/componentes/panel/paginacion";
import { conPagina, leerPagina } from "@/lib/paginacion";
import { VISTAS, type Vista } from "@/modulos/cotizaciones/reglas";
import { BarraLista } from "@/componentes/panel/barra-lista";
import { aqui } from "@/lib/volver";

export const metadata: Metadata = { title: "Cotizaciones" };

// Pedido 23 (P23-cotizacion-directa.md §5): las cotizaciones por estado, con búsqueda por cliente, teléfono, placa o
// número. Las pendientes, las que llevan más tiempo sin respuesta primero (RF-35), con su aviso desde los días de
// Configuración. Dueño o encargado con "Cotizaciones" (RN-12: sin él, nada de precios).
export default function PaginaCotizaciones({ searchParams }: PageProps<"/panel/cotizaciones">) {
  return (
    <PaginaPanel tipo="lista">
      <EncabezadoPagina
        titulo="Cotizaciones"
        accion={
          // Enlace con forma de botón: lleva a otra pantalla
          <Link href="/panel/cotizaciones/nueva" className={cn(buttonVariants())}>
            <PlusIcon />
            <TextoAccion corto="Nueva">Nueva cotización</TextoAccion>
          </Link>
        }
      />
      {/* El orden de toda lista (BarraLista): las pestañas, la barra y la lista. Cada una en su Suspense: al buscar, el campo
          no se vuelve a montar y no pierde el foco */}
      <Suspense fallback={<div aria-hidden className="h-11 border-b border-border" />}>
        <PestanasConCuentas searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<div className="h-9 pointer-coarse:h-11" />}>
        <BarraLista buscador={<Buscador etiqueta="Buscar por cliente, teléfono, placa o número" ejemplo="Cliente, placa o número" />} />
      </Suspense>
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

const TITULOS: Record<Vista, string> = { pendientes: "Pendientes", aceptadas: "Aceptadas", rechazadas: "Rechazadas" };
const VACIOS: Record<Vista, string> = {
  pendientes: "No hay cotizaciones pendientes.",
  aceptadas: "No hay cotizaciones aceptadas.",
  rechazadas: "No hay cotizaciones rechazadas.",
};

/** La vista de la dirección (`?vista=`), o "pendientes". hasOwn y no `in`: `?vista=__proto__` no es una pestaña. */
const vistaDe = (v: unknown): Vista => (typeof v === "string" && Object.hasOwn(VISTAS, v) ? (v as Vista) : "pendientes");
const enlaceVista = (v: Vista) => (v === "pendientes" ? "/panel/cotizaciones" : `/panel/cotizaciones?vista=${v}`);

/** Las pestañas, con la cuenta de cada vista (lo buscado la cambia). Leen la dirección: dentro de un Suspense. */
function PestanasCotizaciones({ vista, cantidades }: { vista: Vista; cantidades: Record<Vista, number> }) {
  return (
    <Pestanas
      etiqueta="Cotizaciones por estado"
      activa={enlaceVista(vista)}
      conservarBusqueda
      pestanas={(Object.keys(VISTAS) as Vista[]).map((v) => ({ href: enlaceVista(v), texto: TITULOS[v], cuenta: cantidades[v] }))}
    />
  );
}

async function PestanasConCuentas({ searchParams }: Pick<PageProps<"/panel/cotizaciones">, "searchParams">) {
  await exigirModulo("cotizaciones");
  const parametros = await searchParams;
  const q = typeof parametros.q === "string" ? parametros.q : "";
  return <PestanasCotizaciones vista={vistaDe(parametros.vista)} cantidades={await contarPorVista(q)} />;
}

async function Lista({ searchParams }: Pick<PageProps<"/panel/cotizaciones">, "searchParams">) {
  const usuario = await exigirModulo("cotizaciones");
  const parametros = await searchParams;
  const vista = vistaDe(parametros.vista);
  const q = typeof parametros.q === "string" ? parametros.q : "";
  const [{ cotizaciones, total, pagina, paginas }, parametrosNegocio] = await Promise.all([listarCotizaciones({ vista, q, pagina: leerPagina(parametros.pagina) }), obtenerParametros()]);

  return (
    <>
      {cotizaciones.length === 0 ? (
        <EstadoVacio>{q.trim() ? `Ninguna cotización ${TITULOS[vista].toLowerCase().slice(0, -1)} coincide con «${q.trim()}».` : VACIOS[vista]}</EstadoVacio>
      ) : (
        <>
          {/* Pendientes y Aceptadas, en tarjetas (recorrido visual del 22/11, como Órdenes); las rechazadas, el
              historial, en tabla. En cada pestaña el estado ya se sabe: no se repite */}
          {vista === "rechazadas" ? (
            <ListaCotizaciones cotizaciones={cotizaciones} umbral={parametrosNegocio.dias_cotizacion_sin_respuesta} conEstado={false} vista={vista} desde={aqui("/panel/cotizaciones", parametros)} />
          ) : (
            <TarjetasCotizaciones
              cotizaciones={cotizaciones}
              umbral={parametrosNegocio.dias_cotizacion_sin_respuesta}
              desde={aqui("/panel/cotizaciones", parametros)}
              // «Reservar» en la tarjeta, para quien reserva (Agenda)
              conReservar={puedeVerModulo(usuario, "agenda")}
            />
          )}
          <Paginacion pagina={pagina} paginas={paginas} total={total} nombre={["cotización", "cotizaciones"]} enlace={(p) => conPagina("/panel/cotizaciones", parametros, p)} />
        </>
      )}
    </>
  );
}
