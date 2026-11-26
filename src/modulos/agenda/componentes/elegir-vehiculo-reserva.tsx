import type { Route } from "next";
import { TarjetasParaElegir } from "@/componentes/panel/tarjetas-para-elegir";

// El paso "Vehículo" de Nueva reserva (recorrido visual del 20/11, a pedido del dueño): siempre a la vista, también con
// un solo vehículo (antes se elegía solo y no se veía con qué auto se reservaba). Las mismas tarjetas apiladas de Nueva
// cotización: la placa y, debajo, sus datos y su tamaño. Del 24/11: se marca (con uno solo, ya viene marcado) y se
// confirma con "Siguiente: servicios". Al final, "Otro vehículo": sus datos se escriben en el paso siguiente y se
// registra con la reserva, como en Nueva cotización.

type VehiculoParaElegir = { id: number; placa: string; detalle: string; href: Route; /** Su foto (pedido 58): null, sin foto. */ miniatura: string | null };

export function ElegirVehiculoReserva({
  vehiculos,
  otro,
  atras,
}: {
  vehiculos: VehiculoParaElegir[];
  /** "Otro vehículo": solo quien ve Clientes y arma reservas sin cotización. */
  otro: Route | null;
  /** "Atrás", a elegir otro cliente (desde un mantenimiento no se cambia). */
  atras?: Route;
}) {
  return (
    <TarjetasParaElegir
      id="vehiculo"
      titulo="Vehículo"
      etiqueta="Elegir vehículo"
      tarjetas={vehiculos.map((v) => ({ clave: v.id, href: v.href, titulo: v.placa, esPlaca: true, detalle: v.detalle, miniatura: v.miniatura }))}
      nuevo={otro ? { titulo: "Otro vehículo", detalle: "Registrar uno nuevo", href: otro } : null}
      siguiente="Siguiente: servicios"
      atras={atras}
      marcada={vehiculos.length === 1 ? vehiculos[0].id : null}
    />
  );
}
