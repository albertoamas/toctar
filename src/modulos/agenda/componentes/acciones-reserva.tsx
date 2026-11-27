"use client";

import { useActionState, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { MenuMas } from "@/componentes/panel/menu-mas";
import { useCerrarModal } from "@/componentes/panel/modal-contexto";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { CancelarModal, PieModal } from "@/componentes/panel/modal-pie";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { cancelarReserva, reprogramarReserva } from "../acciones";
import { ANCHO_DATO } from "@/componentes/panel/anchos";
import { DatoClave } from "@/componentes/panel/dato-clave";
import { fechaConDia, fechaConMes } from "@/lib/fechas";

// HU-31: reprogramar o cancelar una reserva agendada (RF-39). Pulido 10.3: se usan poco y van en el menú "Más" del
// encabezado, cada una con su formulario en un modal (como "Marcar como perdida"). Reprogramar pide las nuevas fechas
// (pedido 55: sin espacio ni límite por día); cancelar pide el motivo y avisa que el adelanto no se
// devuelve (RN-05).

type Props = {
  id: number;
  fechaInicio: string;
  fechaFin: string;
  hoy: string;
  /** Lo pagado, si quien mira ve pagos: para avisar cuánto queda como ingreso al cancelar. */
  pagado: string | null;
};

export function MasReserva(props: Props) {
  const [abierta, setAbierta] = useState<"reprogramar" | "cancelar" | null>(null);
  const cambiar = (abierto: boolean) => !abierto && setAbierta(null);
  return (
    <>
      <MenuMas
        acciones={[
          { texto: "Reprogramar", alElegir: () => setAbierta("reprogramar") },
          { texto: "Cancelar reserva", alElegir: () => setAbierta("cancelar") },
        ]}
      />
      <ModalFormulario titulo="Reprogramar" abierto={abierta === "reprogramar"} alCambiar={cambiar}>
        <Reprogramar {...props} />
      </ModalFormulario>
      <ModalFormulario titulo="Cancelar reserva" abierto={abierta === "cancelar"} alCambiar={cambiar}>
        <Cancelar {...props} />
      </ModalFormulario>
    </>
  );
}

/** Al terminar: cierra el modal y, si está, quita "?agendada=1" (el aviso de recién agendada ya no corresponde). */
function useAlTerminar() {
  const cerrar = useCerrarModal();
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  return () => {
    cerrar();
    if (parametros.has("agendada")) router.replace(ruta);
  };
}

function Reprogramar({ id, fechaInicio: inicioActual, fechaFin: finActual, hoy }: Props) {
  const alTerminar = useAlTerminar();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(reprogramarReserva, (r) => r.ok && alTerminar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Controlados: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const [fechaInicio, setFechaInicio] = useState(inicioActual < hoy ? hoy : inicioActual);
  const [fechaFin, setFechaFin] = useState(finActual < hoy ? hoy : finActual);

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label="Reprogramar">
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && !estado.ok && <MensajeError id="reprogramar-error">{estado.mensaje}</MensajeError>}
      {/* El día de ahora (20/11: "11/12" solo no decía qué día era) */}
      <DatoClave
        etiqueta="Ahora"
        valor={`${inicioActual === finActual ? diaCorto(inicioActual, hoy) : `${diaCorto(inicioActual, hoy)} al ${diaCorto(finActual, hoy)}`}`}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="fechaInicio" etiqueta="Ingresa el" error={e.fechaInicio}>
          <Input className={ANCHO_DATO.fecha} id="fechaInicio" name="fechaInicio" type="date" min={hoy} value={fechaInicio} onChange={(ev) => setFechaInicio(ev.target.value)} aria-invalid={!!e.fechaInicio} aria-describedby={e.fechaInicio ? "fechaInicio-error" : undefined} />
        </Campo>
        <Campo id="fechaFin" etiqueta="Entrega aproximada" error={e.fechaFin}>
          <Input className={ANCHO_DATO.fecha} id="fechaFin" name="fechaFin" type="date" min={fechaInicio} value={fechaFin} onChange={(ev) => setFechaFin(ev.target.value)} aria-invalid={!!e.fechaFin} aria-describedby={e.fechaFin ? "fechaFin-error" : undefined} />
        </Campo>
      </div>
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Moviendo…" : "Mover reserva"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}

function Cancelar({ id, pagado }: Props) {
  const alTerminar = useAlTerminar();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(cancelarReserva, (r) => r.ok && alTerminar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  const [motivo, setMotivo] = useState("");
  // Un solo aviso del adelanto (20/11: el monto se repetía en un recuadro y en la frase de abajo)
  const conAdelanto = pagado !== null && pagado !== "0.00";
  const aviso =
    pagado === null
      ? "Si dejó adelanto, no se devuelve: queda como ingreso."
      : pagado === "0.00"
        ? "No dejó adelanto."
        : `El adelanto de ${mostrarMonto(pagado)} Bs no se devuelve: queda como ingreso.`;

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label="Cancelar reserva">
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && !estado.ok && <MensajeError id="cancelar-error">{estado.mensaje}</MensajeError>}
      {conAdelanto ? <p className="rounded-lg bg-peligro-fondo px-3 py-2.5 font-medium text-peligro">{aviso}</p> : <p>{aviso}</p>}
      <Campo id="motivo" etiqueta="Motivo" error={e.motivo} ayuda="Queda en la reserva. Si vino de una cotización, pasa a perdida.">
        <Textarea id="motivo" name="motivo" rows={2} value={motivo} onChange={(ev) => setMotivo(ev.target.value)} aria-invalid={!!e.motivo} aria-describedby={e.motivo ? "motivo-error" : "motivo-ayuda"} />
      </Campo>
      {/* El foco empieza en el motivo (obligatorio): ahí un Enter escribe, no confirma */}
      <PieModal>
        {/* Contorno rojo de "no se deshace": libera su lugar y deja la reserva cerrada */}
        <Button type="submit" variant="destructive" disabled={enviando}>
          {enviando ? "Cancelando…" : "Cancelar reserva"}
        </Button>
        <CancelarModal texto="Volver" />
      </PieModal>
    </form>
  );
}

/** "Vie 11 dic.": el día corto, con el nombre de la semana. */
function diaCorto(fecha: string, hoy: string): string {
  return fecha === hoy ? "Hoy" : `${fechaConDia(fecha).slice(0, 3)} ${fechaConMes(fecha, hoy)}`;
}

