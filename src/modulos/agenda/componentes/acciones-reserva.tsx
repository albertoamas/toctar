"use client";

import { useActionState, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarIcon, XIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { cancelarReserva, reprogramarReserva } from "../acciones";
import { useEspaciosLibres } from "./espacios-libres";

// HU-31: reprogramar o cancelar una reserva agendada (RF-39). Cada una se abre aparte, como "Desactivar" en otras
// pantallas: no se toca sin querer. Reprogramar ofrece solo los espacios libres en las nuevas fechas (sin contar la
// propia reserva); cancelar pide el motivo y avisa que el adelanto no se devuelve (RN-05).

type Props = {
  id: number;
  fechaInicio: string;
  fechaFin: string;
  espacioId: number;
  hoy: string;
  /** Lo pagado, si quien mira ve pagos: para avisar cuánto queda como ingreso al cancelar. */
  pagado: string | null;
};

export function AccionesReserva(props: Props) {
  const [abierta, setAbierta] = useState<"reprogramar" | "cancelar" | null>(null);
  const router = useRouter();
  const ruta = usePathname();
  // Hecho el cambio, sin "?agendada=1": el aviso de recién agendada ya no corresponde
  const alTerminar = (hecho?: boolean) => {
    setAbierta(null);
    if (hecho) router.replace(ruta);
  };
  if (abierta === "reprogramar") return <Reprogramar {...props} alTerminar={alTerminar} />;
  if (abierta === "cancelar") return <Cancelar {...props} alTerminar={alTerminar} />;
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={() => setAbierta("reprogramar")}>
        <CalendarIcon />
        Reprogramar
      </Button>
      <Button type="button" variant="outline" onClick={() => setAbierta("cancelar")}>
        <XIcon />
        Cancelar reserva
      </Button>
    </div>
  );
}

function Reprogramar({ id, fechaInicio: inicioActual, fechaFin: finActual, espacioId: espacioActual, hoy, alTerminar }: Props & { alTerminar: (hecho?: boolean) => void }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(reprogramarReserva, (r) => r.ok && alTerminar(true)),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Controlados: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const [fechaInicio, setFechaInicio] = useState(inicioActual < hoy ? hoy : inicioActual);
  const [fechaFin, setFechaFin] = useState(finActual < hoy ? hoy : finActual);
  const { libres, buscando, ayuda } = useEspaciosLibres(fechaInicio, fechaFin, { excepto: id });
  // El elegido vale mientras siga libre en las fechas de ahora (el actual lo está: no se cuenta la propia reserva)
  const [espacioElegido, setEspacioId] = useState(String(espacioActual));
  const espacioId = libres.some((x) => String(x.id) === espacioElegido) ? espacioElegido : "";

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5 rounded-sm border border-border p-4" noValidate aria-labelledby="reprogramar-titulo">
      <h2 id="reprogramar-titulo" className="font-heading text-2xl font-bold italic">Reprogramar</h2>
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && !estado.ok && <MensajeError id="reprogramar-error">{estado.mensaje}</MensajeError>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="fechaInicio" etiqueta="Ingresa el" error={e.fechaInicio}>
          <Input id="fechaInicio" name="fechaInicio" type="date" min={hoy} value={fechaInicio} onChange={(ev) => setFechaInicio(ev.target.value)} aria-invalid={!!e.fechaInicio} aria-describedby={e.fechaInicio ? "fechaInicio-error" : undefined} />
        </Campo>
        <Campo id="fechaFin" etiqueta="Entrega aproximada" error={e.fechaFin}>
          <Input id="fechaFin" name="fechaFin" type="date" min={fechaInicio} value={fechaFin} onChange={(ev) => setFechaFin(ev.target.value)} aria-invalid={!!e.fechaFin} aria-describedby={e.fechaFin ? "fechaFin-error" : undefined} />
        </Campo>
      </div>
      <Campo
        id="espacioId"
        etiqueta="Espacio"
        error={e.espacioId}
        ayuda={ayuda}
      >
        <Selector
          id="espacioId"
          name="espacioId"
          value={espacioId}
          onChange={(ev) => setEspacioId(ev.target.value)}
          disabled={buscando}
          aria-invalid={!!e.espacioId}
          aria-describedby={e.espacioId ? "espacioId-error" : "espacioId-ayuda"}
          className="max-w-xs"
        >
          <option value="">Elige el espacio</option>
          {libres.map((x) => (
            <option key={x.id} value={x.id}>{x.nombre}</option>
          ))}
        </Selector>
      </Campo>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={enviando || buscando}>
          {enviando ? "Moviendo…" : "Mover reserva"}
        </Button>
        <Button type="button" variant="outline" onClick={() => alTerminar()}>
          Volver
        </Button>
      </div>
    </form>
  );
}

function Cancelar({ id, pagado, alTerminar }: Props & { alTerminar: (hecho?: boolean) => void }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(cancelarReserva, (r) => r.ok && alTerminar(true)),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  const [motivo, setMotivo] = useState("");
  const aviso =
    pagado === null
      ? "Si dejó adelanto, no se devuelve: queda como ingreso."
      : pagado === "0.00"
        ? "No dejó adelanto."
        : `El adelanto no se devuelve: ${mostrarMonto(pagado)} Bs quedan como ingreso.`;

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5 rounded-sm border border-border p-4" noValidate aria-labelledby="cancelar-titulo">
      <h2 id="cancelar-titulo" className="font-heading text-2xl font-bold italic">Cancelar reserva</h2>
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && !estado.ok && <MensajeError id="cancelar-error">{estado.mensaje}</MensajeError>}
      <p>{aviso}</p>
      <Campo id="motivo" etiqueta="Motivo" error={e.motivo} ayuda="Queda en la reserva y, si vino de una consulta, la consulta pasa a perdida.">
        <Textarea id="motivo" name="motivo" rows={2} value={motivo} onChange={(ev) => setMotivo(ev.target.value)} aria-invalid={!!e.motivo} aria-describedby={e.motivo ? "motivo-error" : "motivo-ayuda"} />
      </Campo>
      <div className="flex flex-wrap gap-2">
        {/* Rojo de "no se deshace": libera el espacio y deja la reserva cerrada */}
        <Button type="submit" variant="destructive" disabled={enviando}>
          {enviando ? "Cancelando…" : "Cancelar reserva"}
        </Button>
        <Button type="button" variant="outline" onClick={() => alTerminar()}>
          Volver
        </Button>
      </div>
    </form>
  );
}
