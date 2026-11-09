import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { cn } from "cn";
import { contenidoFormulario } from "@/componentes/panel/contenido-formulario";
import { PreguntaSalir } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Lo que falta guardar en un formulario del panel (pulido 13.15). Tres piezas:
// - `useCambiosSinGuardar`: compara lo que tiene el formulario con lo que tenía al abrirse o al guardarse.
// - `BarraGuardar`: en un formulario largo (Crear usuario), el botón queda fijo abajo cuando hay algo escrito. Las fichas se
//   editan por partes en modales (C6): ya no hay un formulario largo de editar con el botón desactivado hasta un cambio.
// - `AvisoAlSalir`: pregunta antes de perderlos. En los flujos (crear, recibir, entregar), que siguen con su PieFormulario.
// No cubre el botón Atrás del navegador: el navegador no deja detenerlo sin trucos con el historial, que además usan los
// flujos en pasos.

type Estado = { ok?: boolean };

/**
 * Lo que tenía al dibujarse en el servidor, y no lo que tiene al hidratar: lo escrito antes de eso en un celular lento, o
 * lo que restaura el navegador al recargar, sí es un cambio. Una copia sin tocar el formulario. Los menús van con su valor
 * de ahora: React no marca la opción por defecto de uno controlado, y la copia caería en la primera.
 */
function contenidoAlDibujarse(formulario: HTMLFormElement): string {
  const copia = formulario.cloneNode(true) as HTMLFormElement;
  copia.reset();
  const menus = formulario.querySelectorAll("select");
  copia.querySelectorAll("select").forEach((menu, i) => (menu.value = menus[i].value));
  return contenidoFormulario(copia);
}

function useCambiosSinGuardar(formulario: RefObject<HTMLFormElement | null>, estado?: Estado): boolean {
  const [hay, setHay] = useState(false);
  const base = useRef<string | null>(null);

  useEffect(() => {
    const form = formulario.current;
    if (!form) return;
    base.current = contenidoAlDibujarse(form);
    let cuadro = 0;
    const revisar = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => setHay(contenidoFormulario(form) !== base.current));
    };
    // Lo que se escribe avisa; una lista (EditorLista) y los menús propios cambian un campo oculto, sin evento
    const observador = new MutationObserver(revisar);
    observador.observe(form, { subtree: true, childList: true, attributes: true, attributeFilter: ["value", "checked", "data-checked"] });
    for (const evento of ["input", "change", "click", "reset"]) form.addEventListener(evento, revisar);
    revisar();
    return () => {
      cancelAnimationFrame(cuadro);
      observador.disconnect();
      for (const evento of ["input", "change", "click", "reset"]) form.removeEventListener(evento, revisar);
    };
  }, [formulario]);

  // Guardado, lo que tiene ahora es la nueva base. Un cuadro después: React termina de poner los valores guardados
  useEffect(() => {
    const form = formulario.current;
    if (!estado?.ok || !form) return;
    const cuadro = requestAnimationFrame(() => {
      base.current = contenidoFormulario(form);
      setHay(false);
    });
    return () => cancelAnimationFrame(cuadro);
  }, [estado, formulario]);

  return hay;
}

/** A qué dirección de la app iría este clic, si saca de la pantalla; null si no (un enlace a otro sitio avisa el navegador). */
function destinoDelClic(evento: MouseEvent): string | null {
  if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return null;
  const enlace = (evento.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  // `data-sin-preguntar`: una salida que la pantalla misma propone ("Ver la ficha de este cliente", con su WhatsApp repetido)
  if (!enlace || enlace.hasAttribute("download") || enlace.hasAttribute("data-sin-preguntar") || (enlace.target && enlace.target !== "_self")) return null;
  const url = new URL(enlace.href);
  if (url.origin !== window.location.origin) return null;
  // Otra parte de la misma pantalla no saca de ella
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  // Una dirección con // al inicio se leería como de otro sitio: no se pasa al router
  if (url.pathname.startsWith("//")) return null;
  return url.pathname + url.search + url.hash;
}

/** Con cambios: pregunta antes de ir a otra pantalla del panel, y el navegador pregunta antes de recargar o cerrar. */
function PreguntarAlSalir({ hay }: { hay: boolean }) {
  const router = useRouter();
  // A dónde se iba: otra pantalla, o un formulario que saca del panel ("Cerrar sesión")
  const [destino, setDestino] = useState<string | HTMLFormElement | null>(null);

  useEffect(() => {
    if (!hay) return;
    const alSalir = (e: BeforeUnloadEvent) => e.preventDefault();
    // En captura: antes que el enlace de Next, que no navega si ya está prevenido. Sin detener el evento: el menú del
    // celular se cierra con este mismo clic
    const alClic = (e: MouseEvent) => {
      const formularioSalida = (e.target as Element | null)?.closest?.<HTMLButtonElement>("button[data-preguntar-salir]")?.form;
      const a = e.defaultPrevented ? null : (formularioSalida ?? destinoDelClic(e));
      if (!a) return;
      e.preventDefault();
      setDestino(a);
    };
    window.addEventListener("beforeunload", alSalir);
    document.addEventListener("click", alClic, true);
    return () => {
      window.removeEventListener("beforeunload", alSalir);
      document.removeEventListener("click", alClic, true);
    };
  }, [hay]);

  return (
    <PreguntaSalir
      abierta={destino !== null}
      texto="Tienes cambios sin guardar en esta pantalla. Si sales, se pierden."
      alSeguir={() => setDestino(null)}
      alSalir={() => {
        if (destino instanceof HTMLFormElement) destino.requestSubmit();
        else if (destino) router.push(destino as Route);
        setDestino(null);
      }}
    />
  );
}

/** Para un flujo con su propio pie: solo pregunta al salir. `ademas`: lo que no es un campo del formulario (la firma, una foto elegida). */
export function AvisoAlSalir({ formulario, estado, ademas = false }: { formulario: RefObject<HTMLFormElement | null>; estado?: Estado; ademas?: boolean }) {
  const hay = useCambiosSinGuardar(formulario, estado);
  return <PreguntarAlSalir hay={hay || ademas} />;
}

/**
 * El botón de un formulario largo de crear: siempre activo (tocarlo vacío muestra qué falta) y, con algo escrito, fijo abajo
 * a lo ancho del formulario y preguntando antes de salir.
 */
export function BarraGuardar(props: { formulario: RefObject<HTMLFormElement | null>; estado?: Estado; texto: string; enviando: boolean }) {
  const { formulario, estado, texto, enviando } = props;
  const hay = useCambiosSinGuardar(formulario, estado);
  return (
    <>
      <PreguntarAlSalir hay={hay} />
      <div data-pie-fijo={hay || undefined} className={cn("flex flex-wrap items-center gap-2", hay && "sticky bottom-0 z-10 border-t border-border bg-background px-4 py-3 max-sm:-mx-4")}>
        {/* Siempre en el documento: el lector de pantalla anuncia cuando cambia */}
        <p role="status" className="sr-only">
          {hay && "Hay cambios sin guardar."}
        </p>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : texto}
        </Button>
      </div>
    </>
  );
}
