"use client";

import { useState, useTransition } from "react";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Button } from "@/componentes/ui/button";
import { elegirParaPortada } from "../acciones/galeria";
import { Insignia } from "@/componentes/panel/insignia";
import { useCerrarModal } from "@/componentes/panel/modal-contexto";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { CancelarModal, PieModal } from "@/componentes/panel/modal-pie";
import { ItemGaleria, Miniatura } from "./galeria-comun";

// Galería (HU-09): qué trabajo con antes va en el comparador de la portada, y elegirlo (demo del 24/10).

/**
 * El trabajo de la portada, en su propia sección arriba (pulido 13.17): antes, una casa más entre los íconos de cada
 * tarjeta, con un párrafo que la explicaba. "Cambiar" abre la lista de los que pueden ir: con antes y que se ven en el sitio.
 * Sin elegir, el sitio muestra el primero con antes (2B.1).
 */
export function PortadaElegida({ items, portadaId, nombreDe }: { items: ItemGaleria[]; portadaId: number | null; nombreDe: (item: ItemGaleria) => string }) {
  const [abierto, setAbierto] = useState(false);
  const posibles = items.filter((i) => i.antes && i.enSitio);
  const elegida = items.find((i) => i.id === portadaId) ?? null;
  // Lo que se ve hoy en el sitio: el elegido o, sin elegir, el primero que puede ir
  const enSitio = elegida ?? posibles[0] ?? null;
  return (
    // En una fila también en el celular: la foto chica al lado del texto, para que la sección no empuje la galería
    <section aria-labelledby="portada-titulo" className="tt-tarjeta-panel flex flex-wrap items-center gap-3 p-4">
      {enSitio?.antes && (
        <span className="grid aspect-[2/1] w-28 shrink-0 grid-cols-2 gap-px overflow-hidden rounded-sm sm:w-48">
          {/* Sin etiquetas: en una miniatura tan chica no entran, y el par se entiende solo */}
          <Miniatura foto={enSitio.antes} alt="" />
          <Miniatura foto={enSitio.despues} alt="" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id="portada-titulo" className="tt-titulo-sub">En la portada</h2>
        {enSitio ? (
          <p className="text-sm">
            {nombreDe(enSitio)}
            {!elegida && <span className="text-tinta-suave"> (sin elegir: va el primero con antes y después)</span>}
          </p>
        ) : (
          <p className="text-sm text-tinta-suave">Para la portada hace falta un trabajo con foto de antes que se vea en el sitio.</p>
        )}
      </div>
      {posibles.length > 0 && (
        <Button type="button" variant="outline" onClick={() => setAbierto(true)} aria-label="Cambiar el trabajo de la portada">
          Cambiar
        </Button>
      )}
      <ModalFormulario tamano="mediano" titulo="El trabajo de la portada" abierto={abierto} alCambiar={setAbierto}>
        <ElegirPortada posibles={posibles} elegidaId={enSitio?.id ?? null} nombreDe={nombreDe} />
      </ModalFormulario>
    </section>
  );
}

function ElegirPortada({ posibles, elegidaId, nombreDe }: { posibles: ItemGaleria[]; elegidaId: number | null; nombreDe: (item: ItemGaleria) => string }) {
  const cerrar = useCerrarModal();
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <p className="text-sm text-tinta-suave">Arriba en la portada se compara un trabajo con antes y después. Solo los que se ven en el sitio.</p>
      <ul aria-label="Trabajos para la portada" className="flex flex-col gap-2">
        {posibles.map((item) => {
          const nombre = nombreDe(item);
          const actual = item.id === elegidaId;
          const contenido = (
            <>
              <span className="grid aspect-[2/1] w-28 shrink-0 grid-cols-2 gap-px overflow-hidden rounded-sm">
                <Miniatura foto={item.antes!} alt="" />
                <Miniatura foto={item.despues} alt="" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="text-xs font-semibold text-tinta-suave">{item.servicio}</span>
                <span className="line-clamp-2 text-sm">{nombre}</span>
              </span>
            </>
          );
          return (
            <li key={item.id}>
              {actual ? (
                <div className="flex items-center gap-3 rounded-lg border border-tinta p-2">
                  {contenido}
                  <Insignia tono="exito">En la portada</Insignia>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={pendiente}
                  aria-label={`Mostrar en la portada: ${nombre}`}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await elegirParaPortada(item.id);
                      avisarResultado(r);
                      if (r.ok) cerrar();
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-2 hover:bg-superficie focus-visible:outline-2 focus-visible:outline-[var(--foco)] disabled:opacity-60"
                >
                  {contenido}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <PieModal>
        <CancelarModal />
      </PieModal>
    </>
  );
}
