import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Pestanas } from "@/componentes/panel/pestanas";
import { buttonVariants } from "@/componentes/ui/button";
import { exigirModulo } from "@/lib/sesion";
import { BuscadorClientes } from "@/modulos/clientes/componentes/buscador-clientes";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { ListaCotizaciones } from "@/modulos/cotizaciones/componentes/lista-cotizaciones";
import { contarPorVista, LIMITE_HISTORIA, listarCotizaciones } from "@/modulos/cotizaciones/consultas";
import { VISTAS, type Vista } from "@/modulos/cotizaciones/reglas";

export const metadata: Metadata = { title: "Cotizaciones" };

// Pedido 23 (P23-cotizacion-directa.md §5): las cotizaciones por estado, con búsqueda por cliente, teléfono, placa o
// número. Las pendientes, las que llevan más tiempo sin respuesta primero (RF-35), con su aviso desde los días de
// Configuración. Dueño o encargado con "Cotizaciones" (RN-12: sin él, nada de precios).
export default function PaginaCotizaciones({ searchParams }: PageProps<"/panel/cotizaciones">) {
  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Cotizaciones"
        accion={
          // Enlace con forma de botón: lleva a otra pantalla
          <Link href="/panel/cotizaciones/nueva" className={cn(buttonVariants())}>
            <PlusIcon />
            Nueva cotización
          </Link>
        }
      />
      {/* Aparte de la lista: al buscar, el campo no se vuelve a montar y no pierde el foco */}
      <Suspense fallback={<div className="h-9 max-w-md pointer-coarse:h-11" />}>
        <BuscadorClientes etiqueta="Buscar por cliente, teléfono, placa o número" ejemplo="Cliente, placa o número" />
      </Suspense>
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const TITULOS: Record<Vista, string> = { pendientes: "Pendientes", aceptadas: "Aceptadas", rechazadas: "Rechazadas" };
const VACIOS: Record<Vista, string> = {
  pendientes: "No hay cotizaciones pendientes.",
  aceptadas: "No hay cotizaciones aceptadas.",
  rechazadas: "No hay cotizaciones rechazadas.",
};

async function Lista({ searchParams }: Pick<PageProps<"/panel/cotizaciones">, "searchParams">) {
  await exigirModulo("cotizaciones");
  const parametros = await searchParams;
  // hasOwn y no `in`: `?vista=__proto__` no es una pestaña
  const vista: Vista = typeof parametros.vista === "string" && Object.hasOwn(VISTAS, parametros.vista) ? (parametros.vista as Vista) : "pendientes";
  const q = typeof parametros.q === "string" ? parametros.q : "";
  // Las pestañas conservan la búsqueda escrita: el campo la sigue mostrando
  const enlace = (v: Vista) => {
    const p = new URLSearchParams();
    if (v !== "pendientes") p.set("vista", v);
    if (q.trim()) p.set("q", q);
    const consulta = p.toString();
    return (consulta ? `/panel/cotizaciones?${consulta}` : "/panel/cotizaciones") as Route;
  };
  const [{ cotizaciones, hayMas }, cantidades, parametrosNegocio] = await Promise.all([listarCotizaciones(vista, q), contarPorVista(q), obtenerParametros()]);

  return (
    <>
      <Pestanas
        etiqueta="Cotizaciones por estado"
        activa={enlace(vista)}
        pestanas={(Object.keys(VISTAS) as Vista[]).map((v) => ({ href: enlace(v), texto: `${TITULOS[v]} (${cantidades[v]})` }))}
      />
      {cotizaciones.length === 0 ? (
        <EstadoVacio>{q.trim() ? `Ninguna cotización ${TITULOS[vista].toLowerCase().slice(0, -1)} coincide con «${q.trim()}».` : VACIOS[vista]}</EstadoVacio>
      ) : (
        <>
          {/* En cada pestaña el estado ya se sabe: no se repite en las filas */}
          <ListaCotizaciones cotizaciones={cotizaciones} umbral={parametrosNegocio.dias_cotizacion_sin_respuesta} conEstado={false} />
          {hayMas && <p className="text-sm text-tinta-suave">Se muestran las {LIMITE_HISTORIA} más recientes. Busca para encontrar otra.</p>}
        </>
      )}
    </>
  );
}
