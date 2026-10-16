"use client";

import { useActionState, useState } from "react";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { EditorLista } from "@/componentes/panel/editor-lista";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarContenido } from "../acciones";
import { PAGINAS, type CampoContenido, type ContenidoPagina, type Pagina } from "../contenido";

// HU-08: textos de una página del sitio. Los campos salen del registro (src/modulos/sitio/contenido.ts).

const guardarConAviso = conAviso(guardarContenido);

export function FormularioContenido({ pagina, contenido }: { pagina: Pagina; contenido: ContenidoPagina }) {
  const def = PAGINAS[pagina];
  const campos = def.campos as readonly CampoContenido[];
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarConAviso, {});
  const [listas, setListas] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(campos.filter((c) => c.tipo === "lista").map((c) => [c.clave, contenido[c.clave] as string[]])),
  );
  const v = estado.valores;
  const e = estado.errores ?? {};

  return (
    <form action={accion} className="flex flex-col gap-5" noValidate aria-labelledby={`${pagina}-titulo`}>
      <input type="hidden" name="pagina" value={pagina} />
      <div className="flex flex-col gap-1">
        <h2 id={`${pagina}-titulo`} className="font-heading text-2xl font-bold italic">{def.titulo}</h2>
        <p className="text-sm text-tinta-suave">{def.descripcion}</p>
      </div>

      {campos.map((c) => {
        const id = `${pagina}-${c.clave}`;
        const describir = e[c.clave] ? `${id}-error` : c.ayuda ? `${id}-ayuda` : undefined;
        if (c.tipo === "lista") {
          return (
            <fieldset key={c.clave} className="flex flex-col gap-2">
              <legend className="mb-2 flex flex-col gap-1">
                <span className="text-sm font-semibold">{c.etiqueta}</span>
                {c.ayuda && <span className="text-sm text-tinta-suave">{c.ayuda}</span>}
              </legend>
              <EditorLista
                nombre={c.clave}
                etiqueta="Motivo"
                valor={listas[c.clave]}
                onChange={(nuevo) => setListas((l) => ({ ...l, [c.clave]: nuevo }))}
                nueva={() => ""}
                maximo={c.maxItems}
                textoAgregar={c.agregar}
                errores={e}
                fila={(texto, cambiar, i) => <Input value={texto} onChange={(ev) => cambiar(ev.target.value)} aria-label={`Motivo ${i + 1}`} />}
              />
            </fieldset>
          );
        }
        const valor = v?.[c.clave] ?? (contenido[c.clave] as string);
        return (
          <Campo key={c.clave} id={id} etiqueta={c.etiqueta} error={e[c.clave]} ayuda={c.ayuda}>
            {c.tipo === "linea" ? (
              <Input id={id} name={c.clave} defaultValue={valor} aria-invalid={!!e[c.clave]} aria-describedby={describir} />
            ) : (
              <Textarea id={id} name={c.clave} rows={c.max > 500 ? 6 : 3} defaultValue={valor} aria-invalid={!!e[c.clave]} aria-describedby={describir} />
            )}
          </Campo>
        );
      })}

      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : `Guardar ${def.titulo.toLowerCase()}`}
        </Button>
      </div>
    </form>
  );
}
