import type { Route } from "next";
import { CabeceraSeccion } from "@/componentes/panel/cabecera-seccion";
import { BotonCambiar } from "@/componentes/panel/resumen-paso";
import { DatosVehiculo } from "./datos-vehiculo";

// Para quién es lo que se arma en un flujo en pasos (Nueva reserva, pulido final del 09/11): el cliente y su vehículo en
// una sola tarjeta, cada fila con su "Cambiar" (por su dirección o, desde un formulario, `alCambiar`). En dos tarjetas
// con su título ocupaban unos 300 px del celular, la del cliente solo para un nombre, y las fechas del último paso
// quedaban abajo. Sin estado: se usa desde el servidor con `href`; `alCambiar`, solo desde un componente de cliente.
// También en Nueva cotización ("Cotización para", con el WhatsApp del cliente debajo de su nombre) y en Nueva versión, sin
// "Cambiar" (sin `href` ni `alCambiar`, la fila no lo muestra): una versión es de la misma cotización.

type Cambio = { href?: Route; alCambiar?: () => void };

type Props = {
  /** El título se llama `{id}-titulo` y nombra a la sección: uno distinto si van dos en la misma pantalla. */
  id?: string;
  titulo?: string;
  /** `detalle`: una línea debajo del nombre (su WhatsApp). */
  cliente: { nombre: string; detalle?: string } & Cambio;
  /** Todavía sin elegir (el paso Vehículo): solo la fila del cliente. */
  vehiculo: ({ placa: string; detalle: (string | number)[]; tamano: string } & Cambio) | null;
};

export function ResumenClienteVehiculo({ id = "para-quien", titulo = "Reserva para", cliente, vehiculo }: Props) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3">
      <CabeceraSeccion id={id} titulo={titulo} />
      <div className="tt-tarjeta-panel flex flex-col divide-y divide-border">
        <div className="flex min-h-12 items-center justify-between gap-3 py-1 pr-2 pl-4">
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold break-words">{cliente.nombre}</span>
            {cliente.detalle && <span className="text-sm text-tinta-suave">{cliente.detalle}</span>}
          </span>
          <BotonCambiar href={cliente.href} alCambiar={cliente.alCambiar} etiqueta="Cambiar cliente" />
        </div>
        {vehiculo && (
          <div className="flex items-start justify-between gap-3 py-2 pr-2 pl-4">
            <span className="flex min-w-0 flex-col">
              <DatosVehiculo placa={vehiculo.placa} detalle={vehiculo.detalle} tamano={vehiculo.tamano} />
            </span>
            <BotonCambiar href={vehiculo.href} alCambiar={vehiculo.alCambiar} etiqueta="Cambiar vehículo" />
          </div>
        )}
      </div>
    </section>
  );
}
