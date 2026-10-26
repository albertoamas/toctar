"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { PencilIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { Button } from "@/componentes/ui/button";

// Fichas del panel en modo lectura (skill pantallas-panel, §2): cada sección muestra sus datos como texto y tiene
// "Editar", que abre su formulario en el mismo lugar. Dentro de una FichaEditable hay un solo formulario abierto a la
// vez: mientras una sección está abierta, las demás esconden su "Editar" (se guarda o se cancela primero, así nada de lo
// escrito se pierde y la pantalla muestra solo lo que se está haciendo).
// El formulario cierra su sección al guardar con useCerrarSeccion, y pone "Cancelar" (o "Listo") al lado de su botón
// con CancelarSeccion.

/** El primer control que puede recibir el foco (uno deshabilitado, como "Subir" en la primera fila, no lo recibe). */
const PRIMER_CONTROL = ["input:not([type=hidden])", "textarea", "select", "button"].map((c) => `${c}:not(:disabled)`).join(", ");

type EstadoFicha = {
  abierta: string | null;
  abrir: (id: string) => void;
  cerrar: (id: string) => void;
  /** Cada sección se anota al aparecer y se borra al irse: así una que desaparece no deja la ficha trabada. */
  registrar: (id: string) => () => void;
};
const Ficha = createContext<EstadoFicha | null>(null);
const Seccion = createContext<{ cerrar: () => void } | null>(null);

/** Agrupa las secciones de una ficha para que se abra una a la vez. `abierta`: la que empieza abierta. */
export function FichaEditable({ abierta: inicial = null, children }: { abierta?: string | null; children: React.ReactNode }) {
  const [abierta, setAbierta] = useState(inicial);
  const [presentes, setPresentes] = useState<ReadonlySet<string>>(new Set());
  // Estable: las secciones la usan en un efecto, y una nueva en cada render las anotaría y borraría sin parar
  const registrar = useCallback((id: string) => {
    setPresentes((antes) => new Set(antes).add(id));
    return () =>
      setPresentes((antes) => {
        const despues = new Set(antes);
        despues.delete(id);
        return despues;
      });
  }, []);
  const valor: EstadoFicha = {
    // La abierta cuenta mientras su sección siga en la ficha (si se fue al recargar, por ejemplo una variante que se
    // desactivó, las demás vuelven a ofrecer Editar). Antes de que se anote ninguna (la primera pintura), se le cree
    abierta: abierta !== null && (presentes.size === 0 || presentes.has(abierta)) ? abierta : null,
    abrir: setAbierta,
    // Solo si sigue abierta esa: un guardado que termina tarde no cierra otra
    cerrar: (id) => setAbierta((actual) => (actual === id ? null : actual)),
    registrar,
  };
  return <Ficha.Provider value={valor}>{children}</Ficha.Provider>;
}

type Props = {
  id: string;
  titulo: string;
  /** Título de nivel 2 (sección de la ficha) o 3 (dentro de otra sección). */
  nivel?: 2 | 3;
  /** Lo que dice "Editar" al lector de pantalla: "Editar precios de 1 año". */
  etiquetaEditar: string;
  /** Los datos como texto, cuando la sección está cerrada. */
  lectura: React.ReactNode;
  /** El formulario, cuando está abierta. */
  children: React.ReactNode;
};

export function SeccionEditable({ id, titulo, nivel = 2, etiquetaEditar, lectura, children }: Props) {
  const ficha = useContext(Ficha);
  const [sola, setSola] = useState(false);
  const abierta = ficha ? ficha.abierta === id : sola;
  // Otra sección de la ficha está abierta: esta no ofrece editar hasta que aquella se guarde o se cancele
  const otraAbierta = !!ficha && ficha.abierta !== null && !abierta;
  const hidratado = useHidratado();
  const registrar = ficha?.registrar;
  useEffect(() => registrar?.(id), [registrar, id]);
  const contenido = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  // El foco: al abrir (también si la ficha empieza con esta abierta), al primer campo; al cerrarse esta misma (guardar
  // o cancelar), de vuelta a su "Editar". Se compara con el estado anterior y no con una marca de "primera vez": así el
  // doble efecto del modo estricto no lo mueve dos veces
  const anterior = useRef(false);
  const cerroSola = useRef(false);
  useEffect(() => {
    if (anterior.current === abierta) return;
    anterior.current = abierta;
    if (abierta) contenido.current?.querySelector<HTMLElement>(PRIMER_CONTROL)?.focus();
    else if (cerroSola.current) boton.current?.focus();
    cerroSola.current = false;
  }, [abierta]);

  const abrir = () => (ficha ? ficha.abrir(id) : setSola(true));
  const cerrar = () => {
    cerroSola.current = true;
    if (ficha) ficha.cerrar(id);
    else setSola(false);
  };
  const Titulo = nivel === 3 ? "h3" : "h2";

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <Titulo id={`${id}-titulo`} className={nivel === 3 ? "text-lg font-semibold" : "font-heading text-2xl font-bold italic"}>
          {titulo}
        </Titulo>
        {!abierta && !otraAbierta && (
          <Button ref={boton} type="button" variant="outline" disabled={!hidratado} aria-label={etiquetaEditar} onClick={abrir}>
            <PencilIcon />
            Editar
          </Button>
        )}
      </div>
      <div ref={contenido}>{abierta ? <Seccion.Provider value={{ cerrar }}>{children}</Seccion.Provider> : lectura}</div>
    </section>
  );
}

/** Para el formulario de una sección: cierra la sección (después de guardar). Fuera de una sección no hace nada. */
export function useCerrarSeccion(): () => void {
  return useContext(Seccion)?.cerrar ?? sinSeccion;
}
const sinSeccion = () => {};

/**
 * "Cancelar" al lado del botón de guardar: cierra la sección sin guardar. "Listo" donde cada cambio ya se guardó al
 * momento (una lista que se edita fila por fila). Fuera de una sección no se muestra.
 */
export function CancelarSeccion({ texto = "Cancelar" }: { texto?: "Cancelar" | "Listo" }) {
  const seccion = useContext(Seccion);
  if (!seccion) return null;
  return (
    <Button type="button" variant="outline" onClick={seccion.cerrar}>
      {texto}
    </Button>
  );
}
