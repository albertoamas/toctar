import type { Metadata, Route } from "next";
import { ChevronRightIcon } from "lucide-react";
import { Suspense } from "react";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { DatosDeFila, FilaConAcciones, ListaEnTarjeta } from "@/componentes/panel/fila-lista";
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
import { TablaAcciones } from "@/componentes/panel/tabla-acciones";
import { CeldaDoble } from "@/componentes/panel/tabla-lista";

export const metadata: Metadata = { title: "Saldos pendientes" };

// HU-37: quién debe todavía (RF-47). El dueño o el encargado con "Pagos". Las órdenes entregadas con saldo, la más
// antigua primero; desde cada una se le escribe al cliente por WhatsApp y se registra el pago ahí mismo (quien tiene
// "Pagos" y no "Órdenes" no podría cobrar desde la orden). "Ver la orden" (o la reserva) para quien puede abrirla.
// Pulido 12.1: en cada fila, WhatsApp y "Registrar pago" con borde (un rojo por fila competía con los demás) y
// "Ver la orden" como enlace; en la computadora, las acciones a la derecha del texto.
// Pedido 30: se busca por cliente, teléfono o placa y se ordena por la más antigua, el mayor monto o el cliente. El total
// por cobrar sigue arriba, de todas.
// Pulido final (10/11): en el celular cada fila ocupaba unos 255 px, con WhatsApp, "Registrar pago" y "Ver la orden"
// uno debajo del otro. Ahora el cliente, el auto y la fecha son el enlace a la orden (con "›", como toda fila del
// panel; sin enlace si quien mira no puede abrirla) y los dos botones van lado a lado.
export default function PaginaSaldos({ searchParams }: PageProps<"/panel/pagos">) {
  return (
    <PaginaPanel tipo="lista">
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

  // En la tabla y en las tarjetas: en el celular, "WhatsApp" a secas para que entren los dos botones
  const botonWhatsApp = (s: (typeof saldos)[number], vehiculo: { marca: string | null; modelo: string | null; placa: string }) => (
    <a
      href={enlaceWhatsApp(s.telefono, mensajeSaldo({ plantilla: plantillas.saldo, negocio: negocio.nombre, cliente: s.cliente, vehiculo, saldo: s.saldo }))}
      target="_blank"
      rel="noreferrer"
      className={cn(buttonVariants({ variant: "outline" }))}
    >
      <IconoWhatsApp />
      <span>
        <span className="sr-only sm:not-sr-only">Escribir por </span>WhatsApp
      </span>
    </a>
  );

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
        <>
          {/* En la computadora, una tabla con sus acciones, como las otras listas del panel (inventario-pantallas.md,
              cambio 1); más angosto, las tarjetas */}
          <TablaAcciones
            etiqueta="Órdenes con saldo"
            columnas={[
              { titulo: "Cliente y vehículo", ancho: "minmax(0,1.4fr)" },
              { titulo: "Entregada", ancho: "minmax(0,1fr)" },
              { titulo: "Saldo", ancho: "7rem", alinear: "derecha" },
            ]}
            anchoAcciones="23rem"
            filas={saldos.map((s) => {
              const entregada = fechaEnBolivia(s.entregadoAt);
              const vehiculo = { marca: s.marca, modelo: s.modelo, placa: s.placa };
              const trabajo = enlaceTrabajo(s.id, "entregado", ve);
              return {
                clave: s.id,
                href: trabajo?.href,
                etiqueta: trabajo ? `${trabajo.texto}: ${s.cliente}, ${mostrarMonto(s.saldo)} Bs` : undefined,
                celdas: [
                  <CeldaDoble key="c" principal={s.cliente} secundario={vehiculoEnLista(vehiculo)} fuerte />,
                  <CeldaDoble key="e" principal={fechaCorta(entregada, hoy)} secundario={textoHace(entregada, hoy)} normal />,
                  <span key="s" className="font-semibold whitespace-nowrap tabular-nums">
                    {mostrarMonto(s.saldo)} Bs
                  </span>,
                ],
                acciones: (
                  <>
                    {botonWhatsApp(s, vehiculo)}
                    <RegistrarPago trabajoId={s.id} saldo={s.saldo} hoy={hoy} conPagos />
                  </>
                ),
              };
            })}
          />
          <div className="@4xl:hidden">
          <ListaEnTarjeta etiqueta="Órdenes con saldo">
            {saldos.map((s) => {
              const entregada = fechaEnBolivia(s.entregadoAt);
              const vehiculo = { marca: s.marca, modelo: s.modelo, placa: s.placa };
              const trabajo = enlaceTrabajo(s.id, "entregado", ve);
              const datos = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-semibold">{s.cliente}</span>
                      <span className="text-sm text-tinta-suave">{vehiculoEnLista(vehiculo)}</span>
                    </div>
                    <span className="flex shrink-0 items-center gap-1">
                      <span className="tt-placa text-xl whitespace-nowrap">{mostrarMonto(s.saldo)} Bs</span>
                      {/* Solo en el celular: en la computadora, a la derecha vienen los botones y parecería apuntarles */}
                      {trabajo && <ChevronRightIcon className="size-5 text-tinta-suave lg:hidden" aria-hidden />}
                    </span>
                  </div>
                  <p className="text-sm">
                    Entregada el {fechaCorta(entregada, hoy)}, {textoHace(entregada, hoy)}
                  </p>
                </>
              );
              return (
                <FilaConAcciones key={s.id}>
                  {/* Qué abre y de quién, corto: el lector no lee toda la fila antes de decirlo */}
                  <DatosDeFila href={trabajo?.href} etiqueta={trabajo ? `${trabajo.texto}: ${s.cliente}, ${mostrarMonto(s.saldo)} Bs` : undefined}>
                    {datos}
                  </DatosDeFila>
                  {/* Lado a lado también en el celular ("WhatsApp" a secas para que entren); si no entran (320 px), uno por
                      renglón, a lo ancho */}
                  <div className="flex flex-wrap gap-2 *:flex-1 lg:flex-nowrap lg:*:flex-none">
                    {botonWhatsApp(s, vehiculo)}
                    <RegistrarPago trabajoId={s.id} saldo={s.saldo} hoy={hoy} conPagos />
                  </div>
                </FilaConAcciones>
              );
            })}
          </ListaEnTarjeta>
          </div>
        </>
      )}
    </>
  );
}
