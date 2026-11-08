"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

// El menú del panel cuando no entra (una pantalla baja, pulido 13.25): se desplaza solo él, y un degradado abajo dice que
// hay más (antes "Configuración" quedaba fuera de la vista sin ninguna señal). La opción actual queda a la vista: se la
// busca en el menú mismo (la marcada con aria-current) cuando llega, cuando cambia la marcada y cuando cambia el alto.
// No lee la ruta: va fuera de <Suspense> y, con Cache Components, leerla ahí rompe la compilación. Lo usan la barra
// lateral y la hoja del celular.

export function MenuDesplazable({ className, children }: { className?: string; children: React.ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  const [hayMas, setHayMas] = useState(false);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    // El enlace que ya se mostró: se lleva a la vista una sola vez cada vez que cambia el marcado
    let mostrado: string | null = null;
    const revisar = () => {
      setHayMas(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
      const actual = el.querySelector<HTMLAnchorElement>("a[aria-current=page]");
      const clave = actual?.getAttribute("href") ?? null;
      if (actual && clave !== mostrado) {
        mostrado = clave;
        actual.scrollIntoView({ block: "nearest" });
      }
    };
    revisar();
    el.addEventListener("scroll", revisar, { passive: true });
    // El alto cambia con la ventana; el menú llega después (dentro de <Suspense>) y la opción marcada cambia al navegar
    const medida = new ResizeObserver(revisar);
    medida.observe(el);
    const cambios = new MutationObserver(() => {
      if (el.firstElementChild) medida.observe(el.firstElementChild);
      revisar();
    });
    cambios.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-current"] });
    return () => {
      el.removeEventListener("scroll", revisar);
      medida.disconnect();
      cambios.disconnect();
    };
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={caja} className={cn("min-h-0 flex-1 overflow-y-auto", className)}>
        {children}
      </div>
      {hayMas && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-fondo to-transparent" />}
    </div>
  );
}
