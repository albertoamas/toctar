import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { ENLACE_TEXTO } from "@/componentes/panel/enlace-texto";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { FilaConAcciones, ListaConAcciones } from "@/componentes/panel/fila-lista";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { Pestanas } from "@/componentes/panel/pestanas";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaCorta, fechaEnBolivia, textoHace } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { BuscadorClientes } from "@/modulos/clientes/componentes/buscador-clientes";
import { normalizarBusqueda, vehiculoEnLista } from "@/modulos/clientes/reglas";
import { obtenerDatosPublicos, obtenerPlantillas } from "@/modulos/configuracion/consultas";
import { calcularTotales } from "@/modulos/cotizaciones/reglas";
import { mensajeSaldo } from "@/modulos/ordenes/mensajes";
import { enlaceTrabajo } from "@/modulos/ordenes/reglas";
import { RegistrarPago } from "@/modulos/pagos/componentes/registrar-pago";
import { saldosPendientes } from "@/modulos/pagos/consultas";
import { filtrarSaldos, ORDENES_SALDOS, ordenarSaldos, type OrdenSaldos } from "@/modulos/pagos/reglas";

export const metadata: Metadata = { title: "Saldos pendientes" };

// HU-37: quién debe todavía (RF-47). El dueño o el encargado con "Pagos". Las órdenes entregadas con saldo, la más
// antigua primero; desde cada una se le escribe al cliente por WhatsApp y se registra el pago ahí mismo (quien tiene
// "Pagos" y no "Órdenes" no podría cobrar desde la orden). "Ver la orden" (o la reserva) para quien puede abrirla.
// Pulido 12.1: en cada fila, WhatsApp y "Registrar pago" con borde (un rojo por fila competía con los demás) y
// "Ver la orden" como enlace; en la computadora, las acciones a la derecha del texto.
// Pedido 30: se busca por cliente, teléfono o placa y se ordena por la más antigua, el mayor monto o el cliente. El total
// por cobrar sigue arriba, de todas.
export default function PaginaSaldos({ searchParams }: PageProps<"/panel/pagos">) {
  return (
    <PaginaPanel tipo="ficha">
      <EncabezadoPagina titulo="Saldos pendientes" />
      {/* Aparte de la lista: al buscar, el campo no se vuelve a montar y no pierde el foco */}
      <Suspense fallback={<div className="h-9 max-w-md pointer-coarse:h-11" />}>
        <BuscadorClientes />
      </Suspense>
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/panel/pagos">, "searchParams">) {
  const usuario = await exigirModulo("pagos");
  const ve = { ordenes: puedeVerModulo(usuario, "ordenes"), agenda: puedeVerModulo(usuario, "agenda") };
  const parametros = await searchParams;
  const q = typeof parametros.q === "string" ? parametros.q : "";
  // hasOwn y no `in`: `?orden=__proto__` no es un orden
  const orden: OrdenSaldos = typeof parametros.orden === "string" && Object.hasOwn(ORDENES_SALDOS, parametros.orden) ? (parametros.orden as OrdenSaldos) : "antiguas";
  const [todos, negocio, plantillas] = await Promise.all([saldosPendientes(), obtenerDatosPublicos(), obtenerPlantillas()]);
  if (todos.length === 0) return <EstadoVacio>Nadie debe nada.</EstadoVacio>;
  const hoy = fechaEnBolivia();
  // La misma cuenta en centavos que el resto de los montos, no una suma de decimales
  const { total } = calcularTotales(
    todos.map((s) => s.saldo),
    "0",
  );
  const saldos = ordenarSaldos(filtrarSaldos(todos, normalizarBusqueda(q)), orden);
  // Los enlaces del orden conservan la búsqueda escrita
  const enlace = (o: OrdenSaldos) => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q);
    if (o !== "antiguas") p.set("orden", o);
    const consulta = p.toString();
    return (consulta ? `/panel/pagos?${consulta}` : "/panel/pagos") as Route;
  };

  return (
    <>
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-tinta-suave">Total por cobrar</span>
        <span className="tt-titulo-pagina tabular-nums">{mostrarMonto(total)} Bs</span>
        <span className="text-sm text-tinta-suave">
          {/* Buscando, cuántas se ven de todas; el total es siempre el de todas */}
          {q.trim() ? `${saldos.length} de ${todos.length}` : todos.length === 1 ? "1 orden" : `${todos.length} órdenes`}
        </span>
      </p>

      <Pestanas
        etiqueta="Ordenar saldos"
        activa={enlace(orden)}
        pestanas={(Object.keys(ORDENES_SALDOS) as OrdenSaldos[]).map((o) => ({ href: enlace(o), texto: ORDENES_SALDOS[o] }))}
      />

      {saldos.length === 0 ? (
        <EstadoVacio>Ningún saldo coincide con «{q.trim()}».</EstadoVacio>
      ) : (
        <ListaConAcciones etiqueta="Órdenes con saldo">
          {saldos.map((s) => {
            const entregada = fechaEnBolivia(s.entregadoAt);
            const vehiculo = { marca: s.marca, modelo: s.modelo, placa: s.placa };
            const trabajo = enlaceTrabajo(s.id, "entregado", ve);
            return (
              <FilaConAcciones key={s.id}>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-semibold">{s.cliente}</span>
                      <span className="text-sm text-tinta-suave">{vehiculoEnLista(vehiculo)}</span>
                    </div>
                    <span className="shrink-0 tt-placa text-xl whitespace-nowrap">{mostrarMonto(s.saldo)} Bs</span>
                  </div>
                  <p className="text-sm">
                    Entregada el {fechaCorta(entregada, hoy)}, {textoHace(entregada, hoy)}
                  </p>
                </div>
                <div className="flex flex-col gap-1 lg:items-end">
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={enlaceWhatsApp(s.telefono, mensajeSaldo({ plantilla: plantillas.saldo, negocio: negocio.nombre, cliente: s.cliente, vehiculo, saldo: s.saldo }))}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ variant: "outline" }))}
                    >
                      <IconoWhatsApp />
                      Escribir por WhatsApp
                    </a>
                    <RegistrarPago trabajoId={s.id} saldo={s.saldo} hoy={hoy} conPagos />
                  </div>
                  {trabajo && (
                    <Link href={trabajo.href} className={cn(ENLACE_TEXTO, "lg:self-end")}>
                      {trabajo.texto}
                    </Link>
                  )}
                </div>
              </FilaConAcciones>
            );
          })}
        </ListaConAcciones>
      )}
    </>
  );
}
