"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, ImageOffIcon } from "lucide-react";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Button } from "@/componentes/ui/button";
import type { Direccion } from "@/lib/orden";
import { moverServicio } from "../acciones";
import { Insignia } from "@/componentes/panel/insignia";

// HU-07: servicios en el orden en que salen en el sitio. Se abren para editar su página.

type Fila = { id: number; nombre: string; resumen: string; visible: boolean; miniatura: string | null };

export function ListaServicios({ servicios }: { servicios: Fila[] }) {
  const [pendiente, iniciar] = useTransition();
  const mover = (id: number, direccion: Direccion) =>
    iniciar(async () => {
      avisarResultado(await moverServicio({ id, direccion }));
    });

  if (servicios.length === 0) return <EstadoVacio>Todavía no hay servicios. El dueño los agrega en Catálogo y precios.</EstadoVacio>;

  return (
    <ol aria-label="Servicios del sitio" className="flex flex-col divide-y divide-border tt-tarjeta-panel">
      {servicios.map((s, i) => (
        <li key={s.id} className="flex items-center gap-3 p-3">
          {/* Toda la fila abre el servicio, también la foto (pulido 4.2); las flechas quedan aparte */}
          <Link href={`/panel/sitio/servicios/${s.id}`} className="group flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-superficie">
              {s.miniatura ? (
                <Image src={s.miniatura} alt="" width={64} height={64} unoptimized className="size-full object-cover" />
              ) : (
                <ImageOffIcon className="size-5 text-tinta-suave" aria-hidden />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-2 font-semibold group-hover:underline">
                {s.nombre}
                {!s.visible && <Insignia>Oculto</Insignia>}
              </span>
              {/* Uno recién creado en el catálogo no tiene resumen: es lo que falta para mostrarlo */}
              <span className="line-clamp-2 text-sm text-tinta-suave">{s.resumen || "Falta completar su página."}</span>
              {/* Al final, para que el lector de pantalla diga primero el nombre del servicio */}
              {!s.miniatura && <span className="sr-only">Sin foto.</span>}
            </span>
          </Link>
          <span className="flex shrink-0 flex-col sm:flex-row">
            <Button type="button" variant="ghost" size="icon" disabled={pendiente || i === 0} aria-label={`Subir ${s.nombre}`} onClick={() => mover(s.id, "subir")}>
              <ArrowUpIcon />
            </Button>
            <Button type="button" variant="ghost" size="icon" disabled={pendiente || i === servicios.length - 1} aria-label={`Bajar ${s.nombre}`} onClick={() => mover(s.id, "bajar")}>
              <ArrowDownIcon />
            </Button>
          </span>
        </li>
      ))}
    </ol>
  );
}
