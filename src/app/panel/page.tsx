import Link from "next/link";
import { Suspense } from "react";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { ICONO_MODULO } from "@/componentes/panel/iconos-modulo";
import { cantidad } from "@/lib/cantidad";
import { fechaConDia, fechaEnBolivia } from "@/lib/fechas";
import { MODULOS, modulosDelMenu, nombreEnMenu, puedeVerModulo, type Modulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { primerNombre } from "@/modulos/clientes/reglas";
import { type DatosFila } from "@/componentes/panel/fila-lista";
import { BloqueDelDia } from "@/modulos/inicio/componentes/bloque-del-dia";
import { ingresosDeHoy } from "@/modulos/inicio/consultas";
import { ordenesDelDia, textoEntregaAtrasada, textoIngresoAtrasado } from "@/modulos/inicio/reglas";
import { contarSinAvisar } from "@/modulos/mantenimientos/consultas";
import { DIAS_PROXIMOS } from "@/modulos/mantenimientos/reglas";
import { ordenesAbiertas } from "@/modulos/ordenes/consultas";
import { rutaTrabajo } from "@/modulos/ordenes/reglas";
import { contarPendientes } from "@/modulos/reclamos/consultas";

// Inicio del panel. Para el dueño y el encargado, lo del día (HU-39, RF-52): reclamos, ingresos, entregas, listas sin
// avisar y mantenimientos, cada bloque solo si quien entra ve ese módulo, sin montos ni teléfonos (RN-12). Debajo, un
// acceso de un toque a cada módulo, en el orden del menú (pulido 4.1: en el celular el menú queda detrás de un botón).
// El técnico ve solo sus accesos (sus órdenes). Llega entera: el saludo lleva el nombre de la sesión.
export default function InicioPanel() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

/** Para qué sirve cada módulo, en una línea. El ícono es el del menú. */
const DESCRIPCION: Partial<Record<Modulo, string>> = {
  agenda: "Qué espacio del taller está ocupado cada día; agendar y mover reservas.",
  ordenes: "Los vehículos en el taller: recibir, trabajar, avisar y entregar.",
  clientes: "Clientes y sus vehículos, para atenderlos con su historial.",
  cotizaciones: "Armar y enviar cotizaciones; quedan aceptadas al agendarlas.",
  pagos: "Quién debe todavía, desde cuándo, y cobrarle.",
  mantenimientos: "A quién le toca volver: avisarle y agendarlo.",
  reclamos: "Lo que llega desde el sitio: responder y cerrar.",
  sitio: "La página de cada servicio, los textos, las preguntas y las fotos del sitio.",
  catalogo: "Los servicios: agregarlos, sus variantes y los precios por tamaño.",
  usuarios: "El personal del taller, sus roles y contraseñas.",
  configuracion: "Datos del negocio, el taller, los parámetros y los mensajes.",
};

async function Contenido() {
  const usuario = await exigirModulo("inicio");
  const hoy = fechaEnBolivia();
  const modulos = modulosDelMenu(usuario).filter((m) => m !== "inicio");
  // Lo del día es del dueño y del encargado; el técnico trabaja desde sus órdenes
  const ve = (m: Modulo) => usuario.rol !== "tecnico" && puedeVerModulo(usuario, m);
  const [reclamos, ingresos, abiertas, mantenimientos] = await Promise.all([
    ve("reclamos") ? contarPendientes() : null,
    ve("agenda") ? ingresosDeHoy(hoy) : null,
    ve("ordenes") ? ordenesAbiertas() : null,
    ve("mantenimientos") ? contarSinAvisar(hoy) : null,
  ]);
  const ordenes = abiertas && ordenesDelDia(abiertas, hoy);
  const conDia = [reclamos, ingresos, ordenes, mantenimientos].some((b) => b !== null);

  return (
    <section className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="tt-titulo-pagina">Hola, {primerNombre(usuario.nombre)}</h1>
        <p className="text-tinta-suave">{fechaConDia(hoy)}</p>
      </div>

      {conDia && (
        <div className="grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-8 lg:grid-cols-2">
          {reclamos !== null && (
            <BloqueDelDia
              id="reclamos"
              titulo="Reclamos pendientes"
              contar={false}
              vacio="Nada pendiente."
              filas={
                reclamos > 0
                  ? [{ href: "/panel/reclamos?ver=pendientes", titulo: cantidad(reclamos, "pendiente", "pendientes"), detalles: ["Llegaron desde el sitio. Respóndelos por WhatsApp."] }]
                  : []
              }
            />
          )}
          {ingresos && (
            <BloqueDelDia
              id="ingresos"
              titulo="Ingresos de hoy"
              vacio="Nada para hoy."
              filas={ingresos.map(
                (i): DatosFila => ({
                  href: rutaTrabajo(i.id, "agendado", ve("ordenes")),
                  titulo: i.placa,
                  detalles: [[i.cliente, i.espacio, i.horaIngreso].filter(Boolean).join(", ")],
                  aviso: textoIngresoAtrasado(i.fechaInicio, hoy),
                }),
              )}
            />
          )}
          {ordenes && (
            <BloqueDelDia
              id="entregas"
              titulo="Entregas de hoy"
              vacio="Nada para hoy."
              filas={ordenes.entregas.map(
                (e): DatosFila => ({
                  href: rutaTrabajo(e.id, e.estado, true),
                  titulo: e.placa,
                  detalles: [e.cliente],
                  aviso: textoEntregaAtrasada(e, hoy),
                  estado: NOMBRE_ESTADO_TRABAJO[e.estado],
                  tonoEstado: TONO_ESTADO_TRABAJO[e.estado],
                }),
              )}
            />
          )}
          {ordenes && (
            <BloqueDelDia
              id="listas"
              titulo="Listas sin avisar"
              vacio="Nada pendiente."
              filas={ordenes.listas.map((l): DatosFila => ({ href: rutaTrabajo(l.id, l.estado, true), titulo: l.placa, detalles: [l.cliente] }))}
            />
          )}
          {mantenimientos && (
            <BloqueDelDia
              id="mantenimientos"
              titulo="Mantenimientos por avisar"
              contar={false}
              vacio="Nada pendiente."
              filas={
                mantenimientos.vencidos + mantenimientos.proximos > 0
                  ? [
                      {
                        href: "/panel/mantenimientos",
                        titulo: `${cantidad(mantenimientos.vencidos, "vencido", "vencidos")}, ${cantidad(mantenimientos.proximos, "próximo", "próximos")}`,
                        detalles: [`Sin avisar todavía. Los próximos vencen en ${DIAS_PROXIMOS} días o menos.`],
                      },
                    ]
                  : []
              }
            />
          )}
        </div>
      )}

      {modulos.length === 0 ? (
        // Un encargado al que todavía no le marcaron permisos (el técnico ya tiene sus órdenes, C4)
        <EstadoVacio>Por ahora no hay nada para ti en el panel. Pídele al dueño que te dé acceso a lo que vas a usar.</EstadoVacio>
      ) : (
        <nav aria-label="Ir a" className="flex max-w-5xl flex-col gap-3">
          {conDia && <h2 className="tt-titulo-seccion">Ir a</h2>}
          <ul className="grid gap-3 md:grid-cols-2">
            {modulos.map((m) => (
              <li key={m}>
                <Acceso href={MODULOS[m].ruta} icono={ICONO_MODULO[m]} titulo={nombreEnMenu(m, usuario.rol)} descripcion={DESCRIPCION[m]} />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </section>
  );
}

function Acceso({ href, icono: Icono, titulo, descripcion }: { href: string; icono: LucideIcon; titulo: string; descripcion?: string }) {
  return (
    <Link href={href} className="flex h-full min-h-11 items-center gap-4 tt-tarjeta-panel p-4 hover:bg-superficie">
      <Icono className="size-6 shrink-0 text-tinta-suave" aria-hidden />
      <span className="flex flex-1 flex-col">
        <span className="font-semibold">{titulo}</span>
        {descripcion && <span className="text-sm text-tinta-suave">{descripcion}</span>}
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
    </Link>
  );
}
