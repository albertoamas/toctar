import { Campo } from "@/componentes/panel/campo";
import { Selector } from "@/componentes/panel/selector";
import type { EspacioDisponible } from "../consultas/espacios";

// El campo "Espacio" de una reserva (17/11): el mismo al agendar (HU-30), reprogramar (HU-31) y extender una orden
// (HU-34), que antes estaba copiado en las tres pantallas. Los espacios libres y la ayuda salen de useEspaciosLibres;
// mientras se buscan los de las fechas nuevas, la lista queda deshabilitada (no se elige uno que quizá ya no está libre).
// Sin "use client": lo usan componentes de cliente (le pasan una función), no una página.

export function CampoEspacio(props: { valor: string; alCambiar: (valor: string) => void; libres: EspacioDisponible[]; buscando: boolean; ayuda: string; error?: string }) {
  const { valor, alCambiar, libres, buscando, ayuda, error } = props;
  return (
    <Campo id="espacioId" etiqueta="Espacio" error={error} ayuda={ayuda}>
      <Selector
        id="espacioId"
        name="espacioId"
        value={valor}
        onChange={(ev) => alCambiar(ev.target.value)}
        disabled={buscando}
        aria-invalid={!!error}
        aria-describedby={error ? "espacioId-error" : "espacioId-ayuda"}
        className="max-w-xs"
      >
        <option value="">Elige el espacio</option>
        {libres.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nombre}
          </option>
        ))}
      </Selector>
    </Campo>
  );
}
