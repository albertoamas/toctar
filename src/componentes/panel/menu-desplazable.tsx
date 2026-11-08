"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

// El menú del panel cuando no entra (una pantalla baja, pulido 13.25): se desplaza solo él, y un degradado abajo dice que
// hay más (antes "Configuración" quedaba fuera de la vista sin ninguna señal). La opción actual queda a la vista: se la
// busca en el menú mismo (la marcada con aria-current) cuando llega, cuando cambia la marcada y cuando cambia el alto.
// No lee la ruta: va fuera de <Suspense> y, con Cache Components, leerla ahí rompe la compilación. Lo usan la barra
// lateral y la hoja del celular.

/** El alto del degradado: la opción actual se deja por encima, para que no quede tapada. */
const DEGRADADO = 40;

export function MenuDesplazable({ className, children }: { className?: string; children: React.ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  const [hayMas, setHayMas] = useState(false);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medirMas = () => setHayMas(el.scrollTop + el.clientHeight < el.scrollHeight - 2);

    // La opción actual, a la vista y por encima del degradado. Moviendo solo esta caja (scrollIntoView movería también la
    // hoja del celular o la página). Una sola vez cada vez que cambia la marcada
    let mostrada: string | null = null;
    const mostrarActual = () => {
      const actual = el.querySelector<HTMLAnchorElement>("a[aria-current=page]");
      const clave = actual?.getAttribute("href") ?? null;
      if (!actual || clave === mostrada) return;
      mostrada = clave;
      const a = actual.getBoundingClientRect();
      const c = el.getBoundingClientRect();
      if (a.bottom > c.bottom - DEGRADADO) el.scrollTop += a.bottom - (c.bottom - DEGRADADO);
      else if (a.top < c.top) el.scrollTop -= c.top - a.top;
    };
    const revisar = () => {
      mostrarActual();
      medirMas();
    };

    // El alto cambia con la ventana y con el menú, que llega después (dentro de <Suspense>): se mide la caja y lo que
    // tiene adentro, cambiando de elemento cuando se reemplaza
    const medida = new ResizeObserver(revisar);
    medida.observe(el);
    let adentro: Element | null = null;
    const seguirAdentro = () => {
      const nuevo = el.firstElementChild;
      if (nuevo === adentro) return;
      if (adentro) medida.unobserve(adentro);
      adentro = nuevo;
      if (adentro) medida.observe(adentro);
    };
    seguirAdentro();
    const cambios = new MutationObserver(() => {
      seguirAdentro();
      revisar();
    });
    cambios.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-current"] });
    // Al desplazar solo cambia si hay más abajo
    el.addEventListener("scroll", medirMas, { passive: true });
    revisar();
    return () => {
      el.removeEventListener("scroll", medirMas);
      medida.disconnect();
      cambios.disconnect();
    };
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={caja} data-menu-desplazable className={cn("min-h-0 flex-1 overflow-y-auto", className)}>
        {children}
      </div>
      {hayMas && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-fondo to-transparent" />}
    </div>
  );
}
