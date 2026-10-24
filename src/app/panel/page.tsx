import Link from "next/link";
import { primerNombre } from "@/modulos/clientes/reglas";
import { Suspense } from "react";
import { CalendarIcon, ChevronRightIcon, ContactIcon, GlobeIcon, InboxIcon, MessageSquareWarningIcon, SettingsIcon, TagIcon, UsersIcon, WalletIcon, WrenchIcon, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { Cargando } from "@/componentes/panel/cargando";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { MODULOS, nombreEnMenu, modulosDelMenu, type Modulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { contarPendientes } from "@/modulos/reclamos/consultas";

// Inicio del panel (S-4): saludo, reclamos pendientes (HU-17) y un acceso de un toque a cada módulo que la persona
// puede usar, los mismos del menú (pulido 4.1): en el celular, el menú queda detrás de un botón.
// Llega entera: el saludo lleva el nombre de la sesión.
export default function InicioPanel() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

/** Para qué sirve cada módulo, en una línea, y su ícono. Los que todavía no están aquí se muestran solo con el nombre. */
const ACCESOS: Partial<Record<Modulo, { icono: LucideIcon; descripcion: string }>> = {
  sitio: { icono: GlobeIcon, descripcion: "Servicios, textos, preguntas y fotos del sitio." },
  agenda: { icono: CalendarIcon, descripcion: "Qué espacio del taller está ocupado cada día; agendar y mover reservas." },
  ordenes: { icono: WrenchIcon, descripcion: "Los vehículos en el taller: recibir, trabajar, avisar y entregar." },
  pagos: { icono: WalletIcon, descripcion: "Quién debe todavía, desde cuándo, y cobrarle." },
  consultas: { icono: InboxIcon, descripcion: "Lo que preguntan los clientes, con sus fotos, hasta cotizarlo." },
  clientes: { icono: ContactIcon, descripcion: "Clientes y sus vehículos, para atenderlos con su historial." },
  catalogo: { icono: TagIcon, descripcion: "Precios por tamaño, duración y mantenimiento de cada servicio." },
  usuarios: { icono: UsersIcon, descripcion: "El personal del taller, sus roles y contraseñas." },
  configuracion: { icono: SettingsIcon, descripcion: "Datos del negocio, horario y parámetros." },
};

async function Contenido() {
  const usuario = await exigirModulo("inicio");
  // Los del menú, con Reclamos primero: es lo que pide atención.
  const modulos = modulosDelMenu(usuario)
    .filter((m) => m !== "inicio")
    .sort((a, b) => Number(b === "reclamos") - Number(a === "reclamos"));
  const pendientes = modulos.includes("reclamos") ? await contarPendientes() : 0;
  const nombre = primerNombre(usuario.nombre);

  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-heading text-4xl font-extrabold italic">Hola, {nombre}</h1>
      {modulos.length === 0 ? (
        // Un encargado al que todavía no le marcaron permisos (el técnico ya tiene sus órdenes, C4)
        <EstadoVacio>Por ahora no hay nada para ti en el panel. Pídele al dueño que te dé acceso a lo que vas a usar.</EstadoVacio>
      ) : (
        <ul className="grid max-w-4xl gap-3 md:grid-cols-2">
          {modulos.map((m) =>
            m === "reclamos" ? (
              <li key={m} className="md:col-span-2">
                <Acceso
                  href={pendientes > 0 ? "/panel/reclamos?ver=pendientes" : "/panel/reclamos"}
                  icono={MessageSquareWarningIcon}
                  titulo={pendientes > 0 ? `Reclamos pendientes: ${pendientes}` : "Reclamos"}
                  descripcion={pendientes > 0 ? "Llegaron desde el sitio. Respóndelos por WhatsApp." : "No hay reclamos pendientes."}
                  destacado={pendientes > 0}
                />
              </li>
            ) : (
              <li key={m}>
                <Acceso href={MODULOS[m].ruta} icono={ACCESOS[m]?.icono} titulo={nombreEnMenu(m)} descripcion={ACCESOS[m]?.descripcion} />
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function Acceso({
  href,
  icono: Icono,
  titulo,
  descripcion,
  destacado = false,
}: {
  href: string;
  icono?: LucideIcon;
  titulo: string;
  descripcion?: string;
  destacado?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-full min-h-11 items-center gap-4 rounded-sm border p-4 hover:bg-superficie",
        destacado ? "border-aviso bg-aviso/5" : "border-border",
      )}
    >
      {Icono && <Icono className={cn("size-6 shrink-0", destacado ? "text-aviso" : "text-tinta-suave")} aria-hidden />}
      <span className="flex flex-1 flex-col">
        <span className="font-semibold">{titulo}</span>
        {descripcion && <span className="text-sm text-tinta-suave">{descripcion}</span>}
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
    </Link>
  );
}
