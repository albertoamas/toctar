"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Respuesta al instante en todo el panel (17/11, pedido del dueño). El servidor está lejos (Alemania): cada pantalla,
// filtro o pestaña tarda al menos medio segundo en llegar, y mientras tanto la pantalla anterior quedaba quieta, como si
// el toque no hubiera servido. Ahora, en el mismo instante del toque en cualquier enlace del panel:
// - arriba aparece una barra de progreso fina (como la de GitHub o YouTube), hasta que llega la pantalla nueva;
// - el filtro, la pestaña o el módulo del menú tocado se marca enseguida (useDestinoPendiente), sin esperar al servidor.
// Va una sola vez, en el diseño del panel. Detecta el toque escuchando los clics en los enlaces (Link de Next lo hace
// por dentro con history, sin un evento propio); termina cuando cambia la dirección. El sitio público no lo necesita:
// sus páginas son estáticas y se precargan enteras.

type Pendiente = { destino: string; desde: string };

const Contexto = createContext<string | null>(null);

/** La dirección (ruta y búsqueda) a la que se está yendo, o null si no hay una navegación en curso. */
export function useDestinoPendiente(): string | null {
  return useContext(Contexto);
}

/** Ruta y búsqueda de un enlace, comparables entre sí ("/panel/x?a=1"): sin el dominio ni el "#". */
export function direccion(href: string): string {
  const url = new URL(href, "http://panel.local");
  return `${url.pathname}${url.search}`;
}

/** El último recurso: si la pantalla no llega en 20 s (sin conexión, un error), la barra se va igual. */
const TOPE_MS = 20_000;

export function NavegacionPendiente({ children }: { children: React.ReactNode }) {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const terminar = useCallback(() => setPendiente(null), []);

  useEffect(() => {
    function alTocar(e: MouseEvent) {
      // Solo el clic común: con Ctrl, Shift o la rueda se abre en otra pestaña y esta no cambia
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const enlace = (e.target as Element | null)?.closest?.("a");
      if (!enlace || !enlace.href || enlace.hasAttribute("download")) return;
      if (enlace.target && enlace.target !== "_self") return;
      const url = new URL(enlace.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/panel")) return;
      const desde = `${window.location.pathname}${window.location.search}`;
      const destino = `${url.pathname}${url.search}`;
      // El mismo lugar (o solo un "#"): no hay nada que esperar
      if (destino === desde) return;
      setPendiente({ destino, desde });
    }
    // En la captura: Link de Next cancela el clic (preventDefault) para navegar por dentro; aquí se ve antes
    document.addEventListener("click", alTocar, true);
    window.addEventListener("popstate", terminar);
    return () => {
      document.removeEventListener("click", alTocar, true);
      window.removeEventListener("popstate", terminar);
    };
  }, [terminar]);

  useEffect(() => {
    if (!pendiente) return;
    const tope = setTimeout(terminar, TOPE_MS);
    return () => clearTimeout(tope);
  }, [pendiente, terminar]);

  return (
    <Contexto.Provider value={pendiente?.destino ?? null}>
      {children}
      {/* La dirección actual (con su búsqueda) se lee en su propio Suspense: así el resto del panel se sigue
          pre-generando (Cache Components) */}
      <Suspense fallback={null}>
        <AlLlegar pendiente={pendiente} terminar={terminar} />
      </Suspense>
      {pendiente && (
        <>
          <div aria-hidden className="tt-progreso-navegacion" />
          <span role="status" className="sr-only">
            Cargando…
          </span>
        </>
      )}
    </Contexto.Provider>
  );
}

/** Termina la navegación en curso cuando la dirección deja de ser la del toque (llegó la pantalla nueva). */
function AlLlegar({ pendiente, terminar }: { pendiente: Pendiente | null; terminar: () => void }) {
  const ruta = usePathname();
  const busqueda = useSearchParams().toString();
  const actual = `${ruta}${busqueda ? `?${busqueda}` : ""}`;
  useEffect(() => {
    if (pendiente && actual !== pendiente.desde) terminar();
  }, [actual, pendiente, terminar]);
  return null;
}
