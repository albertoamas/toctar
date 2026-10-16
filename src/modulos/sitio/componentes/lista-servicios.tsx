"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, ImageOffIcon } from "lucide-react";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Button } from "@/componentes/ui/button";
import { moverServicio } from "../acciones";

// HU-07: servicios en el orden en que salen en el sitio. Se abren para editar.

type Fila = { id: number; nombre: string; resumen: string; visible: boolean; miniatura: string | null; variantes: number };

export function ListaServicios({ servicios }: { servicios: Fila[] }) {
  const [pendiente, iniciar] = useTransition();
  const mover = (id: number, direccion: "subir" | "bajar") =>
    iniciar(async () => {
      avisarResultado(await moverServicio({ id, direccion }));
    });

  if (servicios.length === 0) return <p className="text-tinta-suave">Todavía no hay servicios. Agrega el primero.</p>;

  return (
    <ol aria-label="Servicios del sitio" className="flex flex-col divide-y divide-border rounded-sm border border-border">
      {servicios.map((s, i) => (
        <li key={s.id} className="flex items-center gap-3 p-3">
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-superficie">
            {s.miniatura ? (
              <Image src={s.miniatura} alt="" width={64} height={64} unoptimized className="size-full object-cover" />
            ) : (
              <ImageOffIcon className="size-5 text-tinta-suave" aria-label="Sin foto" />
            )}
          </span>
          <Link href={`/panel/sitio/servicios/${s.id}`} className="flex min-w-0 flex-1 flex-col hover:underline">
            <span className="flex flex-wrap items-center gap-2 font-semibold">
              {s.nombre}
              {!s.visible && <span className="tt-insignia">Oculto</span>}
            </span>
            <span className="line-clamp-2 text-sm text-tinta-suave">{s.resumen}</span>
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
