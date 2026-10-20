import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Pestanas } from "@/componentes/panel/pestanas";
import { buttonVariants } from "@/componentes/ui/button";
import { exigirModulo } from "@/lib/sesion";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { ListaConsultas } from "@/modulos/consultas/componentes/lista-consultas";
import { contarPorVista, listarConsultas } from "@/modulos/consultas/consultas";
import { VISTAS, type Vista } from "@/modulos/consultas/reglas";

export const metadata: Metadata = { title: "Consultas" };

// HU-24 y HU-28: las consultas por estado, las que llevan más tiempo sin movimiento primero, con los días desde el
// último. Las abiertas que se enfrían se resaltan. Dueño o encargado con el permiso "consultas"; el técnico nunca (RN-12).
export default function PaginaConsultas({ searchParams }: PageProps<"/panel/consultas">) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-4xl font-extrabold italic">Consultas</h1>
        {/* Enlace con forma de botón: lleva a otra pantalla */}
        <Link href="/panel/consultas/nueva" className={cn(buttonVariants())}>
          <PlusIcon />
          Nueva consulta
        </Link>
      </div>
      <Suspense fallback={<Cargando />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const TITULOS: Record<Vista, string> = { abiertas: "Abiertas", confirmadas: "Confirmadas", perdidas: "Perdidas" };
const VACIOS: Record<Vista, string> = {
  abiertas: "No hay consultas abiertas.",
  confirmadas: "No hay consultas confirmadas.",
  perdidas: "No hay consultas perdidas.",
};
const enlace = (vista: Vista) => (vista === "abiertas" ? "/panel/consultas" : `/panel/consultas?vista=${vista}`);

async function Lista({ searchParams }: Pick<PageProps<"/panel/consultas">, "searchParams">) {
  await exigirModulo("consultas");
  const { vista: pedida } = await searchParams;
  const vista: Vista = typeof pedida === "string" && pedida in VISTAS ? (pedida as Vista) : "abiertas";
  const [consultas, cantidades, parametros] = await Promise.all([listarConsultas(VISTAS[vista]), contarPorVista(), obtenerParametros()]);

  return (
    <>
      <Pestanas
        etiqueta="Consultas por estado"
        activa={enlace(vista)}
        pestanas={(Object.keys(VISTAS) as Vista[]).map((v) => ({ href: enlace(v), texto: `${TITULOS[v]} (${cantidades[v]})` }))}
      />
      {consultas.length === 0 ? (
        <EstadoVacio>{VACIOS[vista]}</EstadoVacio>
      ) : (
        <ListaConsultas consultas={consultas} umbral={parametros.dias_consulta_fria} />
      )}
    </>
  );
}
