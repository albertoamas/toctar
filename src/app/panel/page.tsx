import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { CalendarPlusIcon, ChevronRightIcon, FilePlusIcon, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { AvisarPorWhatsApp } from "@/componentes/panel/avisar-whatsapp";
import { Cargando } from "@/componentes/panel/cargando";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { ICONO_MODULO } from "@/componentes/panel/iconos-modulo";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { buttonVariants } from "@/componentes/ui/button";
import { cantidad } from "@/lib/cantidad";
import { diasEntre, fechaConDia, fechaEnBolivia } from "@/lib/fechas";
import { MODULOS, modulosDelMenu, nombreEnMenu, puede, puedeVerModulo, type Modulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { conDesde } from "@/lib/volver";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { primerNombre } from "@/modulos/clientes/reglas";
import { obtenerDatosPublicos, obtenerParametros, obtenerPlantillas } from "@/modulos/configuracion/consultas";
import { cotizacionesPendientes, cotizacionesPorReservar } from "@/modulos/cotizaciones/consultas/lista";
import { bs, diasDesde, sinRespuesta, textoDias } from "@/modulos/cotizaciones/reglas";
import { Bienvenida, type Cifra } from "@/modulos/inicio/componentes/bienvenida";
import { ListaInicio, type FilaInicio } from "@/modulos/inicio/componentes/lista-inicio";
import { cobradoPorDia, ingresosDeHoy } from "@/modulos/inicio/consultas";
import { fraseDelDia, numerosDelDia, repartirDia, saludoDeLaHora, type FilaDelDia } from "@/modulos/inicio/reglas";
import { contarSinAvisar } from "@/modulos/mantenimientos/consultas";
import { registrarAvisoListo } from "@/modulos/ordenes/acciones/estado";
import { obtenerOrden, ordenesAbiertas } from "@/modulos/ordenes/consultas";
import { mensajeListo } from "@/modulos/ordenes/mensajes";
import { enlaceTrabajo, rutaTrabajo } from "@/modulos/ordenes/reglas";
import { saldosPendientes } from "@/modulos/pagos/consultas";
import { reclamosPorAtender } from "@/modulos/reclamos/consultas";
import { acumuladoDesde, cambioPorcentual, nombreMes, periodoDe } from "@/modulos/reportes/reglas";

/** Lo que se abre desde Inicio vuelve a Inicio (pedido 43). */
const INICIO = "/panel";

// Inicio del panel (HU-39, RF-52; pedido 26, etapas/P26-rediseno-panel.md; recorrido visual del 19/11, prototipo 3
// aprobado). Para el dueño y el encargado:
// - Arriba, la bienvenida: el saludo según la hora, el día en una frase (lo que llega, lo que se entrega y si algo se
//   atrasó), las dos tareas de todos los días y hasta tres números (en el taller, por cobrar y lo cobrado en el mes).
// - Debajo, sin repetir: "Urgente" (lo atrasado y los reclamos) y "Hoy" (lo que llega, lo que se entrega y las listas
//   por avisar), cada fila con su botón donde se hace algo; y "Pendientes" (saldos, cotizaciones sin respuesta o sin
//   fecha y mantenimientos vencidos), cada fila a su lista.
// Cada parte, solo si quien entra ve ese módulo: los montos, solo con Pagos, Cotizaciones o Reportes (RN-12). Llega
// entera: el saludo lleva el nombre de la sesión. Pedido 31 (P31-flujo-de-un-trabajo.md §2 C1): "Pendientes" suma las
// cotizaciones aceptadas sin fecha, para reservarlas.
export default function InicioPanel() {
  return (
    <PaginaPanel tipo="portada">
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </PaginaPanel>
  );
}

/** La hora en Bolivia (0 a 23), para el saludo. */
const horaEnBolivia = () => Number(new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", hour: "numeric", hourCycle: "h23" }).format(new Date()));

async function Contenido() {
  const usuario = await exigirModulo("inicio");
  const hoy = fechaEnBolivia();
  const ahora = new Date();
  const saludo = `${saludoDeLaHora(horaEnBolivia())}, ${primerNombre(usuario.nombre)}`;
  const modulos = modulosDelMenu(usuario).filter((m) => m !== "inicio");
  const ve = (m: Modulo) => puedeVerModulo(usuario, m);
  // Lo cobrado en el mes, contra los mismos días del mes pasado (como "Este mes" de Reportes): solo con Reportes
  const mes = ve("reportes") ? periodoDe({ periodo: "mes" }, hoy) : null;
  const [ingresos, abiertas, saldos, pendientes, aceptadas, mantenimientos, reclamos, parametros, cobradoMes, cobradoAntes] = await Promise.all([
    ve("agenda") ? ingresosDeHoy(hoy) : null,
    ve("ordenes") ? ordenesAbiertas() : null,
    ve("pagos") ? saldosPendientes() : null,
    ve("cotizaciones") ? cotizacionesPendientes() : null,
    ve("cotizaciones") ? cotizacionesPorReservar() : null,
    ve("mantenimientos") ? contarSinAvisar(hoy) : null,
    ve("reclamos") ? reclamosPorAtender(1) : null,
    // Los días sin respuesta de una cotización: solo hacen falta con Cotizaciones
    ve("cotizaciones") ? obtenerParametros() : null,
    mes ? cobradoPorDia(mes.inicio, mes.fin) : null,
    mes ? cobradoPorDia(mes.antes.inicio, mes.antes.fin) : null,
  ]);
  const conDia = [ingresos, abiertas, saldos, pendientes, mantenimientos, reclamos].some((b) => b !== null);

  if (!conDia) {
    return (
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="tt-titulo-pagina">{saludo}</h1>
          <p className="text-sm text-tinta-suave">{fechaConDia(hoy)}</p>
        </div>
        {modulos.length === 0 ? (
          // Un encargado al que todavía no le marcaron permisos
          <EstadoVacio>Por ahora no hay nada para ti en el panel. Pídele al dueño que te dé acceso a lo que vas a usar.</EstadoVacio>
        ) : (
          <nav aria-label="Ir a" className="grid max-w-3xl gap-3 md:grid-cols-2">
            {modulos.map((m) => (
              <Acceso key={m} href={MODULOS[m].ruta as Route} icono={ICONO_MODULO[m]} titulo={nombreEnMenu(m)} />
            ))}
          </nav>
        )}
      </section>
    );
  }

  const sinResponder = parametros
    ? (pendientes ?? []).filter((c) => sinRespuesta(c.estado, diasDesde(c.ultimoMovimientoAt, ahora), parametros.dias_cotizacion_sin_respuesta))
    : [];
  const dia = repartirDia(ingresos ?? [], abiertas ?? [], hoy);
  const numeros = numerosDelDia(ingresos, abiertas, hoy);
  const veDia = ingresos !== null || abiertas !== null;
  const frase = fraseDelDia({ lleganHoy: numeros.lleganHoy, seEntreganHoy: numeros.seEntreganHoy, atrasados: dia.urgentes.length });

  // Los botones de las filas: recibir y entregar van a su pantalla; avisar abre WhatsApp con el mensaje de "Vehículo
  // listo" y lo deja registrado, como en la ficha de la orden (con el saldo solo si quien avisa ve Pagos)
  const recibe = ve("ordenes") && puede(usuario, "recibir_vehiculo");
  const entrega = ve("ordenes") && puede(usuario, "entregar_vehiculo");
  const porAvisar = ve("ordenes") && puede(usuario, "avisar_cliente") ? dia.hoy.filter((f) => f.paso === "avisar") : [];
  const [negocio, plantillas, ordenesPorAvisar] = await Promise.all([
    porAvisar.length > 0 ? obtenerDatosPublicos() : null,
    porAvisar.length > 0 ? obtenerPlantillas() : null,
    Promise.all(porAvisar.map((f) => obtenerOrden(f.id, ve("pagos")))),
  ]);
  const enlacesAviso = new Map<number, string>();
  if (negocio && plantillas) {
    for (const o of ordenesPorAvisar) {
      if (!o) continue;
      const mensaje = mensajeListo({ plantilla: plantillas.listo, negocio: negocio.nombre, cliente: o.cliente, vehiculo: o, saldo: o.montos?.saldo.saldo ?? null });
      enlacesAviso.set(o.id, enlaceWhatsApp(o.telefono, mensaje));
    }
  }
  const boton = (href: Route, texto: string, etiqueta: string) => (
    <Link href={href} className={buttonVariants({ variant: "accion" })} aria-label={etiqueta}>
      {texto}
    </Link>
  );
  const botonDe = (f: FilaDelDia) => {
    if (f.paso === "recibir" && recibe) return boton(conDesde(`/panel/ordenes/${f.id}/recibir` as Route, INICIO), "Recibir", `Recibir ${f.placa}`);
    if (f.paso === "entregar" && entrega) return boton(conDesde(`/panel/ordenes/${f.id}/entregar` as Route, INICIO), "Entregar", `Entregar ${f.placa}`);
    const aviso = f.paso === "avisar" ? enlacesAviso.get(f.id) : undefined;
    if (aviso) return <AvisarPorWhatsApp enlace={aviso} avisado={null} enLista registrarAction={registrarAvisoListo.bind(null, { id: f.id })} />;
    // En el taller sin un paso que se haga desde aquí: su orden (o su reserva, si quien mira no ve Órdenes)
    if (f.paso === "ver" || f.paso === "recibir") {
      const enlace = enlaceTrabajo(f.id, f.estado, { ordenes: ve("ordenes"), agenda: ve("agenda") });
      return enlace ? boton(conDesde(enlace.href, INICIO), enlace.texto.replace("Ver la ", "Ver "), `${enlace.texto} de ${f.placa}`) : undefined;
    }
    return undefined;
  };
  const vehiculo = (f: FilaDelDia, tono: "peligro" | "aviso"): FilaInicio => ({
    clave: `trabajo-${f.id}`,
    href: conDesde(rutaTrabajo(f.id, f.estado, ve("ordenes")), INICIO),
    titulo: f.placa,
    cliente: f.cliente,
    detalle: f.detalle,
    alerta: f.aviso ? { texto: f.aviso, tono } : undefined,
    accion: botonDe(f),
  });

  // Lo urgente: lo que se atrasó y los reclamos (un cliente que espera respuesta)
  const urgentes: FilaInicio[] = [
    ...dia.urgentes.map((f) => vehiculo(f, "peligro")),
    ...unoOVarios(
      reclamos?.primeros ?? [],
      reclamos?.total ?? 0,
      (r) => {
        const href = conDesde(`/panel/reclamos/${r.id}` as Route, INICIO);
        return {
          clave: "reclamos",
          href,
          titulo: `Reclamo de ${r.nombre}`,
          detalle: [r.servicio ?? r.placa, `llegó ${textoDias(diasDesde(r.createdAt, ahora))}`].join(", "),
          accion: boton(href, "Responder", `Responder el reclamo de ${r.nombre}`),
        };
      },
      (r) => ({
        clave: "reclamos",
        href: "/panel/reclamos",
        titulo: cantidad(reclamos?.total ?? 0, "reclamo pendiente", "reclamos pendientes"),
        detalle: `El más antiguo: ${r.nombre}, llegó ${textoDias(diasDesde(r.createdAt, ahora))}`,
      }),
    ),
  ];

  // Lo que espera, sin apuro de hoy: una fila por tipo (18/11), que abre su lista (o el caso, si es uno solo)
  const saldosPorAntiguedad = [...(saldos ?? [])].sort((x, y) => x.entregadoAt.getTime() - y.entregadoAt.getTime());
  const porCobrar = saldosPorAntiguedad.reduce((suma, x) => suma + Number(x.saldo), 0);
  const reservarDe = (c: { id: number; cotizacionId: number }) => (ve("agenda") ? `/panel/agenda/nueva?cotizacion=${c.cotizacionId}` : `/panel/cotizaciones/${c.id}`);
  const cobrarDe = (s: { id: number }) => enlaceTrabajo(s.id, "entregado", { ordenes: ve("ordenes"), agenda: ve("agenda") })?.href ?? "/panel/pagos";
  const pendientesDeAtender: FilaInicio[] = [
    ...unoOVarios(
      saldosPorAntiguedad,
      saldosPorAntiguedad.length,
      (s) => ({
        clave: "saldos",
        href: conDesde(cobrarDe(s) as Route, INICIO),
        titulo: `Saldo de ${s.cliente}`,
        detalle: `${bs(s.saldo)}, entregada ${textoDias(diasDesde(s.entregadoAt, ahora))}`,
      }),
      (s) => ({
        clave: "saldos",
        href: "/panel/pagos",
        titulo: `${saldosPorAntiguedad.length} saldos por cobrar`,
        detalle: `${bs(porCobrar.toFixed(2))}; el más antiguo, ${s.cliente}`,
      }),
    ),
    ...unoOVarios(
      sinResponder,
      sinResponder.length,
      (c) => ({
        clave: "sin-respuesta",
        href: conDesde(`/panel/cotizaciones/${c.id}` as Route, INICIO),
        titulo: `Cotización de ${c.cliente}`,
        detalle: `${bs(c.total)}, sin respuesta hace ${cantidad(diasDesde(c.ultimoMovimientoAt, ahora), "día", "días")}`,
      }),
      (c) => ({
        clave: "sin-respuesta",
        href: "/panel/cotizaciones",
        titulo: `${sinResponder.length} cotizaciones sin respuesta`,
        detalle: `La más antigua, de ${c.cliente}: hace ${cantidad(diasDesde(c.ultimoMovimientoAt, ahora), "día", "días")}`,
      }),
    ),
    // Aceptadas sin fecha (pedido 31): falta reservarlas. Reservar lo hace quien ve la Agenda; si no, la abre para verla
    ...unoOVarios(
      aceptadas ?? [],
      aceptadas?.length ?? 0,
      (c) => ({
        clave: "aceptadas",
        href: conDesde(reservarDe(c) as Route, INICIO),
        titulo: `Cotización aceptada de ${c.cliente}`,
        detalle: `${bs(c.total)}, falta reservarla`,
      }),
      (c) => ({
        clave: "aceptadas",
        href: ve("agenda") ? "/panel/agenda" : "/panel/cotizaciones?vista=aceptadas",
        titulo: `${aceptadas?.length ?? 0} cotizaciones aceptadas sin reservar`,
        detalle: `Falta darles fecha; la que más espera, de ${c.cliente}`,
      }),
    ),
    ...(mantenimientos && mantenimientos.vencidos > 0
      ? [
          {
            clave: "mantenimientos",
            href: "/panel/mantenimientos" as Route,
            titulo: cantidad(mantenimientos.vencidos, "mantenimiento vencido", "mantenimientos vencidos"),
            detalle: "Sin avisar todavía",
          },
        ]
      : []),
  ];

  // Los números de la bienvenida, cada uno a su lista
  const cifras: Cifra[] = [];
  if (abiertas) {
    const listas = abiertas.filter((o) => o.estado === "listo").length;
    cifras.push({
      href: "/panel/ordenes",
      titulo: "En el taller",
      valor: String(abiertas.length),
      nota: abiertas.length === 0 ? "Ningún vehículo" : listas > 0 ? cantidad(listas, "lista para entregar", "listas para entregar") : "Ninguno listo todavía",
    });
  }
  if (saldos) {
    cifras.push({
      href: "/panel/pagos",
      titulo: "Por cobrar",
      valor: bs(porCobrar.toFixed(2)),
      nota: saldos.length > 0 ? cantidad(saldos.length, "entregada con saldo", "entregadas con saldo") : "Nadie debe",
    });
  }
  let delMes: (Cifra & { acumulado: number[] }) | null = null;
  if (mes && cobradoMes && cobradoAntes) {
    const total = cobradoMes.reduce((s, d) => s + d.total, 0);
    const antes = cobradoAntes.reduce((s, d) => s + d.total, 0);
    const cambio = cambioPorcentual(total, antes);
    const mesAnterior = nombreMes(mes.antes.inicio.slice(0, 7)).split(" de ")[0];
    delMes = {
      href: "/panel/reportes",
      titulo: "Cobrado este mes",
      valor: bs(total.toFixed(2)),
      nota:
        cambio === null ? (
          `Sin cobros en ${mesAnterior} para comparar`
        ) : (
          <>
            <span className={cn("font-semibold", cambio >= 0 ? "text-exito" : "text-peligro")}>
              {cambio >= 0 ? "↑" : "↓"} {Math.abs(cambio)} %
            </span>{" "}
            contra {mesAnterior} a esta fecha
          </>
        ),
      acumulado: acumuladoDesde(cobradoMes, mes.inicio, diasEntre(mes.inicio, hoy) + 1),
    };
  }

  const acciones = (ve("cotizaciones") || ve("agenda")) && (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
      {ve("cotizaciones") && (
        <Link href={conDesde("/panel/cotizaciones/nueva", INICIO)} className={cn(buttonVariants({ variant: "outline" }), "min-w-0 max-sm:px-2", !ve("agenda") && "col-span-2")}>
          <FilePlusIcon />
          Nueva cotización
        </Link>
      )}
      {ve("agenda") && (
        <Link href={conDesde("/panel/agenda/nueva", INICIO)} className={cn(buttonVariants(), "min-w-0 max-sm:px-2", !ve("cotizaciones") && "col-span-2")}>
          <CalendarPlusIcon />
          Nueva reserva
        </Link>
      )}
    </div>
  );

  // Los reclamos van en "Urgente": sin nada más que ver (un encargado solo con Reclamos), "Urgente" se muestra igual
  const conPendientes = pendientes !== null || saldos !== null || mantenimientos !== null;
  const conUrgente = urgentes.length > 0 || (!veDia && !conPendientes);
  return (
    <section className="flex flex-col gap-4 @3xl:gap-6">
      <Bienvenida
        saludo={saludo}
        fecha={fechaConDia(hoy)}
        dia={frase.dia}
        atrasos={veDia ? frase.atrasos : null}
        hayAtrasos={dia.urgentes.length > 0}
        acciones={acciones}
        cifras={cifras}
        mes={delMes}
      />
      {/* El mismo orden en el celular y en la computadora: Urgente, Hoy y Pendientes. En pantalla grande, Pendientes a la
          derecha */}
      <div className={cn("grid items-start gap-4 @3xl:gap-6", conPendientes && (conUrgente || veDia) && "@4xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]")}>
        {(conUrgente || veDia) && (
          <div className="flex min-w-0 flex-col gap-4 @3xl:gap-6">
            {conUrgente && <ListaInicio id="urgente" titulo="Urgente" filas={urgentes} vacio="Nada urgente." urgente />}
            {veDia && <ListaInicio id="hoy" titulo="Hoy" filas={dia.hoy.map((f) => vehiculo(f, "aviso"))} vacio="Hoy no llega ni se entrega ningún vehículo." />}
          </div>
        )}
        {conPendientes && <ListaInicio id="pendientes" titulo="Pendientes" filas={pendientesDeAtender} vacio="Nada pendiente." conCuenta={false} />}
      </div>
    </section>
  );
}

/** Con un solo caso, su fila; con varios, una fila que los resume (18/11). */
function unoOVarios<T>(lista: T[], total: number, uno: (e: T) => FilaInicio, varios: (primero: T) => FilaInicio): FilaInicio[] {
  return lista.length === 0 ? [] : total === 1 ? [uno(lista[0])] : [varios(lista[0])];
}

function Acceso({ href, icono: Icono, titulo }: { href: Route; icono: LucideIcon; titulo: string }) {
  return (
    <Link href={href} className="tt-tarjeta-panel flex min-h-11 items-center gap-4 p-4 hover:border-tinta-suave/50">
      <Icono className="size-6 shrink-0 text-tinta-suave" aria-hidden />
      <span className="flex-1 font-semibold">{titulo}</span>
      <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
    </Link>
  );
}
