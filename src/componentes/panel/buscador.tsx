"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";

// El buscador de las listas del panel (HU-22; antes BuscadorClientes, aunque busca también placas, números y fechas): va
// en la barra de la lista (BarraLista). Los resultados aparecen mientras se escribe. El texto va a la dirección (?q=) y la lista la arma el servidor;
// la pausa evita una consulta por cada tecla. La dirección se puede compartir o recargar sin perder la búsqueda.

const PAUSA_MS = 300;

/** `etiqueta` y `ejemplo`: lo que se puede buscar, si no es solo un cliente (Cotizaciones también busca por número). */
export function Buscador({ etiqueta = "Buscar por nombre, teléfono o placa", ejemplo = "Nombre, teléfono o placa" }: { etiqueta?: string; ejemplo?: string }) {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const [texto, setTexto] = useState(parametros.get("q") ?? "");
  const [buscando, iniciar] = useTransition();
  const espera = useRef<ReturnType<typeof setTimeout>>(undefined);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(espera.current), []);

  function cambiar(valor: string, sinPausa = false) {
    setTexto(valor);
    clearTimeout(espera.current);
    espera.current = setTimeout(() => {
      const nuevos = new URLSearchParams(parametros);
      // Otra búsqueda empieza en la primera página (las listas con páginas, como las órdenes entregadas)
      nuevos.delete("pagina");
      if (valor.trim()) nuevos.set("q", valor);
      else nuevos.delete("q");
      const consulta = nuevos.toString();
      // replace: la búsqueda no llena el historial del botón Atrás
      iniciar(() => router.replace(consulta ? `${ruta}?${consulta}` : ruta, { scroll: false }));
    }, sinPausa ? 0 : PAUSA_MS);
  }

  return (
    <div className="relative w-full">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-tinta-suave" aria-hidden />
      <Input
        ref={campo}
        type="search"
        value={texto}
        onChange={(e) => cambiar(e.target.value)}
        aria-label={etiqueta}
        // Corto: el largo se cortaba a 360 px. El lector de pantalla oye la etiqueta completa
        placeholder={ejemplo}
        autoComplete="off"
        spellCheck={false}
        aria-busy={buscando}
        // Sin la ✕ de Chrome (azul, fuera de la marca): la de abajo mide 44 px con pantalla táctil
        className="pr-10 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {texto && (
        <Button type="button" variant="ghost" size="icon" aria-label="Borrar la búsqueda" onClick={() => {
            cambiar("", true);
            campo.current?.focus(); // para seguir escribiendo enseguida
          }} className="absolute top-0 right-0">
          <XIcon />
        </Button>
      )}
    </div>
  );
}
