import type { Route } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { cn } from "cn";
import { CLASE_TARJETA_PARA_ELEGIR, TarjetasParaElegir } from "@/componentes/panel/tarjetas-para-elegir";

// El paso "Vehículo" de Nueva reserva (recorrido visual del 20/11, a pedido del dueño): siempre a la vista, también con
// un solo vehículo (antes se elegía solo y no se veía con qué auto se reservaba). Las mismas tarjetas apiladas de Nueva
// cotización: la placa y, debajo, sus datos y su tamaño. Tocar una pasa directo a los servicios. Al final, "Otro
// vehículo": sus datos se escriben en el paso siguiente y se registra con la reserva, como en Nueva cotización.

type VehiculoParaElegir = { id: number; placa: string; detalle: string; href: Route };

export function ElegirVehiculoReserva({
  vehiculos,
  otro,
}: {
  vehiculos: VehiculoParaElegir[];
  /** "Otro vehículo": solo quien ve Clientes y arma reservas sin cotización. */
  otro: Route | null;
}) {
  return (
    <TarjetasParaElegir etiqueta="Elegir vehículo" tarjetas={vehiculos.map((v) => ({ clave: v.id, href: v.href, titulo: v.placa, esPlaca: true, detalle: v.detalle }))}>
      {otro && (
        <li>
          <Link href={otro} className={cn(CLASE_TARJETA_PARA_ELEGIR, "border-dashed border-input")}>
            <PlusIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-semibold">Otro vehículo</span>
              <span className="text-sm text-tinta-suave">Registrar uno nuevo</span>
            </span>
          </Link>
        </li>
      )}
    </TarjetasParaElegir>
  );
}
