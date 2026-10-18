import Link from "next/link";
import { Suspense } from "react";
import { ChevronRightIcon, MessageSquareWarningIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { contarPendientes } from "@/modulos/reclamos/consultas";

// Inicio del panel (S-4). Por ahora: saludo y reclamos pendientes (HU-17), para quien puede verlos.
export default function InicioPanel() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-heading text-4xl font-extrabold italic">Inicio</h1>
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </section>
  );
}

async function Contenido() {
  const usuario = await exigirModulo("inicio");
  const verReclamos = puedeVerModulo(usuario, "reclamos");
  const pendientes = verReclamos ? await contarPendientes() : 0;

  return (
    <>
      <p className="text-tinta-suave">Hola, {usuario.nombre}.</p>
      {verReclamos && (
        <Link
          href={pendientes > 0 ? "/panel/reclamos?ver=pendientes" : "/panel/reclamos"}
          className="flex max-w-md items-center gap-4 rounded-sm border border-border p-4 hover:bg-superficie"
        >
          <MessageSquareWarningIcon className={pendientes > 0 ? "size-6 shrink-0 text-aviso" : "size-6 shrink-0 text-tinta-suave"} aria-hidden />
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">{pendientes > 0 ? `Reclamos pendientes: ${pendientes}` : "No hay reclamos pendientes."}</span>
            <span className="text-sm text-tinta-suave">{pendientes > 0 ? "Llegaron desde el sitio. Respóndelos por WhatsApp." : "Ver todos los reclamos"}</span>
          </span>
          <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
        </Link>
      )}
    </>
  );
}
