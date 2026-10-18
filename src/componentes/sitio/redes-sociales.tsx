import { cn } from "cn";
import type { Redes } from "@/db/esquema";
import { NOMBRE_RED, REDES } from "@/modulos/configuracion/esquemas";
import { IconoRed } from "./iconos-marca";

// Redes del negocio (HU-04): solo las que cargó el dueño, en el orden de siempre.
// - "iconos": el pie. Botones de 44 × 44 px; el nombre lo leen los lectores de pantalla.
// - "con-nombre": Contacto, donde hay lugar y el nombre confirma a dónde lleva cada enlace.

export function RedesSociales({ redes, variante, className }: { redes: Redes; variante: "iconos" | "con-nombre"; className?: string }) {
  const cargadas = REDES.filter((r) => redes[r]);
  if (cargadas.length === 0) return null;
  return (
    <ul aria-label="Redes sociales" className={cn("flex flex-wrap", variante === "iconos" ? "-mx-2.5 gap-1" : "gap-x-6 gap-y-1", className)}>
      {cargadas.map((r) => (
        <li key={r}>
          {variante === "iconos" ? (
            <a
              href={redes[r]}
              target="_blank"
              rel="noreferrer"
              aria-label={`TocTar en ${NOMBRE_RED[r]}`}
              className="grid size-11 place-items-center text-tinta-suave hover:text-tinta"
            >
              <IconoRed red={r} className="size-[22px]" />
            </a>
          ) : (
            <a href={redes[r]} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 font-semibold hover:underline">
              <IconoRed red={r} className="size-5" />
              {NOMBRE_RED[r]}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
