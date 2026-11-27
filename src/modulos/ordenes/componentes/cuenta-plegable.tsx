"use client";

import { useState } from "react";
import { cn } from "cn";
import { ChevronDownIcon } from "lucide-react";

/**
 * Los servicios y los pagos al entregar (recorrido visual, 21/11): en el celular, plegados en "Ver la cuenta", porque al
 * entregar importa el saldo, que ya dice el aviso de arriba, y la firma quedaba a unos 800 px. Con el costado (desde
 * @4xl), siempre a la vista. Lo de adentro se dibuja una sola vez.
 */
export function CuentaPlegable({ total, children }: { total: string; children: React.ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => setAbierta((a) => !a)}
        className="tt-tarjeta-panel flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-left font-semibold @4xl:hidden"
      >
        <span>
          {abierta ? "Ocultar la cuenta" : "Ver la cuenta"} <span className="font-normal text-tinta-suave tabular-nums">· {total}</span>
        </span>
        <ChevronDownIcon aria-hidden className={cn("size-5 shrink-0 text-tinta-suave", abierta && "rotate-180")} />
      </button>
      <div className={cn("flex-col gap-6 @4xl:flex", abierta ? "flex" : "hidden")}>{children}</div>
    </div>
  );
}
