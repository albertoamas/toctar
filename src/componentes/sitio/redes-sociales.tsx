import { cn } from "cn";
import type { Redes } from "@/db/esquema";
import { NOMBRE_RED, REDES } from "@/modulos/configuracion/esquemas";
import { EnlaceTikTok } from "./enlace-tiktok";
import { IconoRed } from "./iconos-marca";

// Redes del negocio (HU-04): solo las que cargó el dueño, en el orden de siempre.
// - "iconos": el pie. Botones de 44 × 44 px; el nombre lo leen los lectores de pantalla. TikTok, con su nombre y en
//   blanco (pedido 35: casi tan importante como WhatsApp).
// - "con-nombre": Contacto, donde hay lugar y el nombre confirma a dónde lleva cada enlace. Botones con borde (pedido 38).

export function RedesSociales({ redes, variante, className }: { redes: Redes; variante: "iconos" | "con-nombre"; className?: string }) {
  const cargadas = REDES.filter((r) => redes[r]);
  if (cargadas.length === 0) return null;
  return (
    <ul aria-label="Redes sociales" className={cn("flex flex-wrap items-center", variante === "iconos" ? "-mx-2.5 gap-1" : "gap-2", className)}>
      {cargadas.map((r) => (
        <li key={r}>
          {variante === "iconos" && r === "tiktok" ? (
            <EnlaceTikTok enlace={redes[r]} texto={NOMBRE_RED[r]} className="ml-2.5" />
          ) : variante === "iconos" ? (
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
            <a href={redes[r]} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 px-4 text-sm font-semibold shadow-[inset_0_0_0_1px_var(--borde)] hover:bg-superficie">
              <IconoRed red={r} className="size-5" />
              {NOMBRE_RED[r]}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
