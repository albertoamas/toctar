"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GRIS_SIN_ELEGIR, ListaConNuevo, NUEVO } from "@/componentes/panel/lista-con-nuevo";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Button, buttonVariants } from "@/componentes/ui/button";

// Elegir de una lista en un paso que lleva a otra dirección (el nuevo dueño de un vehículo; el cliente y el vehículo de
// Nueva reserva para quien no registra clientes): la misma lista que los flujos (ListaConNuevo, 24/11), con su pie.
// Tocar marca; "Siguiente", en gris hasta elegir, lleva a la dirección de la marcada. Si hay "Nuevo…", también lleva a la
// suya.

type Tarjeta = { clave: string | number; href: Route; titulo: string; esPlaca?: boolean; detalle?: string | null; /** Una foto (pedido 58). */ miniatura?: string | null };

type Props = {
  id: string;
  titulo: string;
  encima?: React.ReactNode;
  debajo?: React.ReactNode;
  etiqueta: string;
  tarjetas: Tarjeta[];
  nuevo?: { titulo: string; detalle?: string; href: Route } | null;
  /** El texto del botón que confirma: "Siguiente: vehículo". */
  siguiente: string;
  /** "Atrás", al paso anterior; sin él, no hay. */
  atras?: Route | null;
  /** La que llega marcada: la única de la lista (un vehículo solo). */
  marcada?: string | number | null;
};

export function TarjetasParaElegir({ id, titulo, encima, debajo, etiqueta, tarjetas, nuevo, siguiente, atras, marcada }: Props) {
  const router = useRouter();
  const [elegida, setElegida] = useState<string | null>(marcada != null ? String(marcada) : null);
  const [yendo, setYendo] = useState(false);
  const destino = elegida === NUEVO ? nuevo?.href : tarjetas.find((t) => String(t.clave) === elegida)?.href;

  return (
    <>
      <ListaConNuevo
        id={id}
        titulo={titulo}
        encima={encima}
        debajo={debajo}
        etiqueta={etiqueta}
        opciones={tarjetas.map((t) => ({ clave: String(t.clave), titulo: t.titulo, esPlaca: t.esPlaca, detalle: t.detalle, miniatura: t.miniatura }))}
        nuevo={nuevo}
        elegida={elegida}
        alElegir={setElegida}
      />
      <PieFormulario pegado>
        <div className="flex gap-2">
          {atras && (
            <Link href={atras} className={buttonVariants({ variant: "outline" })}>
              Atrás
            </Link>
          )}
          <Button
            type="button"
            disabled={!destino || yendo}
            className={GRIS_SIN_ELEGIR}
            onClick={() => {
              if (!destino) return;
              setYendo(true);
              router.push(destino);
            }}
          >
            {siguiente}
          </Button>
        </div>
      </PieFormulario>
    </>
  );
}
