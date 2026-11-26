import type { Route } from "next";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { buscarClientes } from "../consultas";
import { coincidenciaDeCliente, normalizarBusqueda } from "../reglas";
import { Buscador } from "@/componentes/panel/buscador";
import { TarjetasParaElegir } from "@/componentes/panel/tarjetas-para-elegir";

// Elegir al cliente con el buscador de Clientes (HU-22): la nueva cotización (pedido 23) y la reserva directa (HU-30). La
// elección va en la dirección (`hrefCliente`); "Cliente nuevo" es opcional (la reserva pide un cliente ya registrado).
// Recorrido visual del 20/11 (a pedido del dueño): en tarjetas, como el vehículo en el paso siguiente. Del 24/11: con su
// WhatsApp debajo del nombre (con dos clientes del mismo nombre no se sabía cuál era; las placas no, el vehículo se elige
// después) o, si se buscó por placa, con cuál coincidió ("Placa 1234ABC"); se marca y se confirma con "Siguiente";
// "Cliente nuevo" va arriba, junto al buscador; y sin buscar, los 8 más recientes.

/** Sin buscar, cuántos clientes se ofrecen: los más recientes. */
const RECIENTES = 8;

type Props = {
  q: string;
  /** A dónde lleva elegir un cliente, por ejemplo "/panel/cotizaciones/nueva?cliente=12". */
  hrefCliente: (id: number) => Route;
  /** Si se puede registrar ahí mismo: la dirección de "Cliente nuevo". */
  hrefNuevo?: Route;
  /** El título de la sección. Por defecto, "Cliente". */
  titulo?: string;
  /** Quien no se puede elegir: el dueño actual, al cambiar de dueño un vehículo (pedido 37). */
  excepto?: number;
  /** El texto del botón que confirma. Por defecto, "Siguiente: vehículo". */
  siguiente?: string;
};

/**
 * Los clientes para elegir en un paso (24/11): los que coinciden con la búsqueda o, sin buscar, los más recientes, con su
 * WhatsApp (o con qué coincidió), y la nota de debajo ("No hay…", "Son los más recientes…"). La usan ElegirCliente y los
 * formularios de Nueva cotización y Nueva reserva, que llenan "Cliente nuevo" ahí mismo.
 */
export async function clientesParaElegir(q: string, conNuevo: boolean, excepto?: number): Promise<{ opciones: { id: number; titulo: string; detalle: string }[]; nota: string | null }> {
  const { clientes, hayMas } = await buscarClientes(q, false, excepto, q.trim() ? undefined : RECIENTES);
  const otros = excepto ? "otros clientes" : "clientes";
  const sugerencia = conNuevo ? " Regístralo con «Cliente nuevo»." : " Regístralo primero en Clientes.";
  const busqueda = normalizarBusqueda(q);
  const nota =
    clientes.length === 0
      ? q.trim()
        ? `No hay ${otros} con «${q.trim()}».${sugerencia}`
        : `Todavía no hay ${otros}.${sugerencia}`
      : hayMas
        ? q.trim()
          ? "Hay más clientes: escribe algo más preciso para encontrar el que buscas."
          : "Son los más recientes: busca para encontrar a otro."
        : null;
  return {
    opciones: clientes.map((c) => ({ id: c.id, titulo: c.nombre, detalle: coincidenciaDeCliente(c, busqueda) ?? formatearWhatsApp(c.telefono) })),
    nota,
  };
}

/** La nota de la lista de clientes, debajo de las tarjetas. */
function NotaClientes({ nota }: { nota: string | null }) {
  return nota ? <p className="border-t border-border px-4 py-3 text-sm text-tinta-suave">{nota}</p> : null;
}

export async function ElegirCliente({ q, hrefCliente, hrefNuevo, titulo = "Cliente", excepto, siguiente = "Siguiente: vehículo" }: Props) {
  const { opciones, nota } = await clientesParaElegir(q, !!hrefNuevo, excepto);
  return (
    // En su tarjeta con el título adentro, como las demás secciones (C7, 18/11): el buscador arriba y la lista sin su marco
    <TarjetasParaElegir
      id="cliente"
      titulo={titulo}
      encima={
        <div className="px-4 pt-4 sm:px-5">
          <Buscador />
        </div>
      }
      debajo={<NotaClientes nota={nota} />}
      etiqueta="Elegir cliente"
      tarjetas={opciones.map((c) => ({ clave: c.id, href: hrefCliente(c.id), titulo: c.titulo, detalle: c.detalle }))}
      nuevo={hrefNuevo ? { titulo: "Cliente nuevo", detalle: "Registrar a alguien que todavía no está", href: hrefNuevo } : null}
      siguiente={siguiente}
    />
  );
}
