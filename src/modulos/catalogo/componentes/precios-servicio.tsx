"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { PencilIcon, PlusIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { MensajeError } from "@/componentes/panel/campo";
import { CabeceraSeccion } from "@/componentes/panel/cabecera-seccion";
import { CLASE_PILDORA, CLASE_PILDORA_ACTIVA } from "@/componentes/panel/filtros";
import { Insignia } from "@/componentes/panel/insignia";
import { ModalFormulario, useHayCambiosModal, useRenovarBaseModal } from "@/componentes/panel/modal-formulario";
import { ESTILO_ENCABEZADO_TABLA } from "@/componentes/panel/tabla-lista";
import { Button } from "@/componentes/ui/button";
import type { Tamano } from "@/modulos/configuracion/consultas";
import type { VarianteCatalogo } from "../consultas";
import { mostrarMonto, textoDias } from "../reglas";
import { FormularioPrecios } from "./formulario-precios";
import { PreciosVariante, SegunEvaluacion } from "./precios-variante";

// Los precios de un servicio del catálogo (HU-20; pulido 13.57, propuesta aprobada el 13/11, y su revisión del mismo día).
// Antes, una tarjeta por variante con sus tamaños, una debajo de la otra: con 5 variantes y 5 tamaños, 25 filas y unas 2,5
// pantallas de celular.
// - Con dos o más variantes: en la computadora, una tabla como las del panel (el encabezado gris de TablaLista; los
//   tamaños en filas, las variantes en columnas) y un solo "Editar precios" en el título; en el celular, píldoras para
//   elegir la variante y su tarjeta, con su "Editar".
// - Con una sola (la "Única" de un servicio nuevo), su tarjeta, como siempre.
// - Una variante sin ningún precio lo dice una vez ("Sin precios cargados") y su botón dice "Cargar precios".
// - El modal lleva las píldoras arriba para pasar de una variante a otra; con algo escrito, no cambia (se perdería).
// La negrita, con una regla: el nombre de la variante y el monto, en negrita; el tamaño y "Según evaluación", normales y
// en gris. Igual en la tabla y en la tarjeta.

type Props = {
  variantes: VarianteCatalogo[];
  tamanos: Tamano[];
  duracionServicio: number;
  /** Recién creado y sin precios: el modal de la primera variante se abre al cargar. */
  abrirPrimera: boolean;
  /** Lo demás del título de Precios ("Editar variantes"). */
  acciones: React.ReactNode;
  /** Debajo del título (las variantes desactivadas). */
  nota?: React.ReactNode;
};

export function PreciosServicio({ variantes, tamanos, duracionServicio, abrirPrimera, acciones, nota }: Props) {
  const hidratado = useHidratado();
  const [elegida, setElegida] = useState(variantes[0].id);
  // La variante del modal, si está abierto. Hasta que la persona toque algo, la primera si empieza abierta (al cargar: el
  // diálogo pone el foco en su primer campo), como en SeccionConEditar
  const [abierta, setAbierta] = useState<number | null | undefined>(undefined);
  const enModal = abierta === undefined ? (abrirPrimera && hidratado ? variantes[0].id : null) : abierta;
  const varianteEnModal = variantes.find((v) => v.id === enModal);
  const variante = variantes.find((v) => v.id === elegida) ?? variantes[0];
  const varias = variantes.length > 1;
  // La duración propia solo se dice si alguna variante ocupa distinto que el servicio
  const conDuracionPropia = variantes.some((v) => v.duracionDias !== null && v.duracionDias !== duracionServicio);

  // Las variantes sin ningún precio: lo dicen una vez
  const vacias = new Set(variantes.filter((v) => tamanos.every((t) => v.precios[t.id] === undefined)).map((v) => v.id));
  // La del modal pasa a ser también la de la tarjeta del celular: al cerrar, se ve lo que se acaba de guardar
  const abrir = (id: number) => {
    setAbierta(id);
    setElegida(id);
  };
  const cargar = vacias.has(variante.id);

  return (
    <section aria-labelledby="precios-titulo" className="flex flex-col gap-3">
      <CabeceraSeccion id="precios" titulo="Precios">
        <div className="flex flex-wrap items-center gap-1">
          {acciones}
          {/* Con varias, en la computadora: uno solo para toda la tabla (en el celular, el de la tarjeta) */}
          {varias && (
            <Button type="button" variant="ghost" disabled={!hidratado} onClick={() => abrir(variante.id)} className="hidden md:inline-flex">
              <PencilIcon />
              Editar precios
            </Button>
          )}
        </div>
      </CabeceraSeccion>
      {nota}

      {varias && (
        <>
          {/* Celular: qué variante se ve */}
          <Pildoras variantes={variantes} elegida={variante.id} alElegir={setElegida} className="md:hidden" />
          {/* Computadora: todas juntas, para comparar, como las tablas del panel */}
          <div className="tt-tarjeta-panel hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm tabular-nums">
              <caption className="sr-only">Precios por tamaño de vehículo y variante</caption>
              <thead className={ESTILO_ENCABEZADO_TABLA}>
                <tr>
                  <th scope="col" className="px-4 py-2.5">
                    Tamaño
                  </th>
                  {variantes.map((v) => (
                    <th key={v.id} scope="col" className="px-4 py-2.5 text-right whitespace-nowrap">
                      {v.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tamanos.map((t, fila) => (
                  <tr key={t.id}>
                    {/* El tamaño, en un renglón si entra (desde 1280 px); si no, en dos como mucho */}
                    <th scope="row" className="min-w-40 px-4 py-3 font-normal text-tinta-suave xl:whitespace-nowrap">
                      {t.nombre}
                    </th>
                    {variantes.map((v) => {
                      if (vacias.has(v.id)) {
                        // Una sola vez por variante, a lo alto de la columna
                        return fila === 0 ? (
                          <td key={v.id} rowSpan={tamanos.length} className="px-4 py-3 text-right align-middle text-tinta-suave">
                            Sin precios cargados
                          </td>
                        ) : null;
                      }
                      const monto = v.precios[t.id];
                      return (
                        // "Según evaluación" se parte en dos renglones solo si no entra
                        <td key={v.id} className={cn("px-4 py-3 text-right", monto !== null && "whitespace-nowrap")}>
                          {monto === undefined ? <Insignia tono="aviso">Sin cargar</Insignia> : monto === null ? <SegunEvaluacion /> : <span className="font-semibold">{mostrarMonto(monto)} Bs</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              {conDuracionPropia && (
                <tfoot className="border-t border-border">
                  <tr>
                    <th scope="row" className="px-4 py-3 font-normal text-tinta-suave">
                      Ocupa
                    </th>
                    {variantes.map((v) => (
                      <td key={v.id} className="px-4 py-3 text-right whitespace-nowrap">
                        {textoDias(v.duracionDias ?? duracionServicio)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* La tarjeta de una variante: la única, o en el celular la elegida */}
      <section aria-labelledby={`precios-${variante.id}-titulo`} className={cn("tt-tarjeta-panel flex flex-col gap-2 p-4", varias && "md:hidden")}>
        <CabeceraSeccion id={`precios-${variante.id}`} titulo={variante.nombre} nivel={3}>
          <Button type="button" variant="ghost" disabled={!hidratado} aria-label={`${cargar ? "Cargar" : "Editar"} precios de ${variante.nombre}`} onClick={() => abrir(variante.id)}>
            {cargar ? <PlusIcon /> : <PencilIcon />}
            {cargar ? "Cargar precios" : "Editar"}
          </Button>
        </CabeceraSeccion>
        {cargar ? <p className="text-tinta-suave">Sin precios cargados.</p> : <PreciosVariante variante={variante} tamanos={tamanos} duracionServicio={duracionServicio} />}
      </section>

      <ModalFormulario titulo={varianteEnModal ? `Precios de ${varianteEnModal.nombre}` : "Precios"} abierto={!!varianteEnModal} alCambiar={(a) => !a && setAbierta(null)}>
        {varianteEnModal && (
          <div className="flex flex-col gap-4">
            {varias && <VariantesEnModal variantes={variantes} elegida={varianteEnModal} alElegir={abrir} />}
            <FormularioPrecios key={varianteEnModal.id} variante={varianteEnModal} tamanos={tamanos} duracionServicio={duracionServicio} />
          </div>
        )}
      </ModalFormulario>
    </section>
  );
}

/**
 * Las píldoras del modal: pasan a otra variante. Con algo sin guardar no cambia (se perdería lo escrito): lo dice. Si
 * hay cambios se mide igual que al cerrar el modal (lo escrito contra lo que había), así deshacerlo vuelve a dejar pasar.
 */
function VariantesEnModal({ variantes, elegida, alElegir }: { variantes: VarianteCatalogo[]; elegida: VarianteCatalogo; alElegir: (id: number) => void }) {
  const hayCambios = useHayCambiosModal();
  const renovarBase = useRenovarBaseModal();
  const [aviso, setAviso] = useState(false);
  // Con la variante nueva ya dibujada, lo suyo es lo guardado: pasar de una a otra no es un cambio al cerrar
  useEffect(() => renovarBase(), [elegida.id, renovarBase]);
  const elegir = (id: number) => {
    if (id === elegida.id) return;
    if (hayCambios()) return setAviso(true);
    setAviso(false);
    alElegir(id);
  };
  return (
    <div className="flex flex-col gap-2">
      <Pildoras variantes={variantes} elegida={elegida.id} alElegir={elegir} describe={aviso ? "precios-variante-aviso" : undefined} />
      {/* Siempre en la página: el lector anuncia el aviso cuando aparece */}
      <div role="status">{aviso && <MensajeError id="precios-variante-aviso">Guarda o cancela los cambios de {elegida.nombre} para pasar a otra variante.</MensajeError>}</div>
    </div>
  );
}

/** Las variantes para elegir una: en el celular, la que se ve; en el modal, la que se edita. */
function Pildoras({ variantes, elegida, alElegir, className, describe }: { variantes: VarianteCatalogo[]; elegida: number; alElegir: (id: number) => void; className?: string; describe?: string }) {
  return (
    <div role="group" aria-label="Variante" aria-describedby={describe} className={cn("flex flex-wrap gap-2", className)}>
      {variantes.map((v) => (
        <button key={v.id} type="button" aria-pressed={v.id === elegida} onClick={() => alElegir(v.id)} className={cn(CLASE_PILDORA, "touch-manipulation", v.id === elegida && CLASE_PILDORA_ACTIVA)}>
          {v.nombre}
        </button>
      ))}
    </div>
  );
}
