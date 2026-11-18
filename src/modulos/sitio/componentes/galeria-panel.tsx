"use client";

import { useState } from "react";
import { UploadIcon } from "lucide-react";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { VisorFotos } from "@/componentes/panel/visor-fotos";
import { Button } from "@/componentes/ui/button";
import { nombreDelTrabajo } from "../galeria";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { BarraLista } from "@/componentes/panel/barra-lista";
import { CLASE_PILDORA, CLASE_PILDORA_ACTIVA } from "@/componentes/panel/pildora";
import { cn } from "cn";
import type { Foto, ItemGaleria, Servicio } from "./galeria-comun";
import { PortadaElegida } from "./galeria-portada";
import { SubirFotos } from "./galeria-subir";
import { Tarjeta } from "./galeria-tarjeta";

// HU-09: galería de antes y después (RF-12). Se sube un par o una foto sola, asociada a un servicio,
// y se ordena, oculta, edita o elimina. Las fotos se achican en el celular antes de subir.
// Un trabajo con antes se elige para el comparador de la portada (pedido de la demo del 24/10).
// La pantalla, partida en archivos (17/11): la portada elegida en galeria-portada, cada trabajo en
// galeria-tarjeta, subir en galeria-subir y lo que comparten en galeria-comun.

export function GaleriaPanel({ items, servicios, portadaId }: { items: ItemGaleria[]; servicios: Servicio[]; portadaId: number | null }) {
  const [filtro, setFiltro] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const visibles = filtro ? items.filter((i) => String(i.servicioId) === filtro) : items;
  // El trabajo que se ve en grande: con las flechas se pasa a los demás de la lista a la vista (pulido 13.16)
  const [abierto, setAbierto] = useState<number | null>(null);
  const nombreDe = (item: ItemGaleria) => nombreDelTrabajo(item.descripcion, item.servicio, items.indexOf(item) + 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Button type="button" onClick={() => setSubiendo(true)}>
          <UploadIcon />
          Subir fotos
        </Button>
      </div>
      {/* Pulido 13.61 (14/11): en un modal, que en el celular sube desde abajo. Antes, el formulario reemplazaba el botón
          en medio de la página y empujaba la portada elegida y la lista */}
      <ModalFormulario titulo="Subir fotos" abierto={subiendo} alCambiar={setSubiendo}>
        <SubirFotos servicios={servicios} />
      </ModalFormulario>

      {items.length > 0 && <PortadaElegida items={items} portadaId={portadaId} nombreDe={nombreDe} />}

      {/* Barra de las listas (10/11): qué fotos se ven, en píldoras con su cuenta como los filtros de Órdenes (antes, un
          menú del sistema "Ver fotos de" a la derecha) */}
      {items.length > 0 && (
        <BarraLista
          filtros={
            <div role="group" aria-label="Ver fotos de" className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              {[{ id: "", nombre: "Todas", cuenta: items.length }, ...servicios.map((s) => ({ id: String(s.id), nombre: s.nombre, cuenta: items.filter((i) => String(i.servicioId) === String(s.id)).length }))]
                .filter((o) => o.id === "" || o.cuenta > 0 || o.id === filtro)
                .map((o) => (
                  <button key={o.id} type="button" aria-pressed={filtro === o.id} onClick={() => setFiltro(o.id)} className={cn(CLASE_PILDORA, filtro === o.id && CLASE_PILDORA_ACTIVA)}>
                    {o.nombre}
                    <span className={cn("font-medium tabular-nums", filtro === o.id ? "text-fondo/75" : "text-tinta-suave")}> {o.cuenta}</span>
                  </button>
                ))}
            </div>
          }
        />
      )}

      {items.length === 0 && !subiendo && <EstadoVacio>Todavía no hay fotos. Sube la primera de un trabajo terminado.</EstadoVacio>}
      {items.length > 0 && visibles.length === 0 && <EstadoVacio>No hay fotos de ese servicio todavía.</EstadoVacio>}
      {filtro && visibles.length > 1 && <p className="text-sm text-tinta-suave">Para cambiar el orden, mira todos los servicios.</p>}

      {/* En el celular, una por renglón: así entran los 5 íconos y editar tiene lugar (pulido 4.7) */}
      {visibles.length > 0 && (
        <ol aria-label="Fotos de la galería" className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {visibles.map((item, i) => (
            <Tarjeta
              key={item.id}
              item={item}
              servicios={servicios}
              primero={i === 0}
              ultimo={i === visibles.length - 1}
              ordenable={!filtro}
              enPortada={item.id === portadaId}
              alAbrir={() => setAbierto(i)}
              // Su lugar en la lista completa (no cambia al filtrar): distingue a los que no tienen descripción
              numero={items.indexOf(item) + 1}
            />
          ))}
        </ol>
      )}
      <VisorFotos
        fotos={visibles.map((item) => ({ ...item.despues, alt: nombreDe(item), leyenda: `${item.servicio}: ${nombreDe(item)}` }))}
        abierta={abierto}
        alCambiar={setAbierto}
        titulo="Galería"
        cosa="trabajo"
        contenido={(i) => <TrabajoEnGrande item={visibles[i]} nombre={nombreDe(visibles[i])} />}
      />
    </div>
  );
}

/** Un trabajo en el visor: el antes y el después lado a lado (uno sobre otro en el celular), o el resultado solo. */
function TrabajoEnGrande({ item, nombre }: { item: ItemGaleria; nombre: string }) {
  const foto = (f: Foto, alt: string, etiqueta?: string) => (
    <figure className="relative bg-superficie">
      {/* eslint-disable-next-line @next/next/no-img-element -- las fotos ya vienen en WebP, como en el resto del panel */}
      <img src={f.url} alt={alt} width={f.ancho ?? undefined} height={f.alto ?? undefined} className="mx-auto max-h-[60dvh] w-full object-contain" />
      {etiqueta && <figcaption className="absolute top-2 left-2 rounded-sm bg-negro/75 px-2 py-0.5 text-sm font-semibold text-blanco">{etiqueta}</figcaption>}
    </figure>
  );
  return item.antes ? (
    <div className="grid gap-2 sm:grid-cols-2">
      {foto(item.antes, `Antes: ${nombre}`, "Antes")}
      {foto(item.despues, `Después: ${nombre}`, "Después")}
    </div>
  ) : (
    foto(item.despues, nombre)
  );
}
