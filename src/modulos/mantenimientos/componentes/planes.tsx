"use client";

import { useActionState, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { MenuMas } from "@/componentes/panel/menu-mas";
import { CancelarModal, ModalFormulario, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { fechaExiste, formatearFecha, sumarMeses } from "@/lib/fechas";
import type { EstadoFormulario } from "@/lib/formularios";
import { agregarMantenimiento, editarPlan } from "../acciones";
import { FormularioNoLeInteresa } from "./no-le-interesa";

// Pedido 21: los planes de mantenimiento en la ficha del cliente (P21-planes-mantenimiento.md §5). "Agregar
// mantenimiento" carga un servicio hecho antes del sistema (el pedido 17); cada plan sin agendar se edita (cada cuántos
// meses y el próximo) o se termina ("No le interesa") desde su menú "Más". Todo en modales, como el resto de la ficha.

type Vehiculo = { id: number; placa: string };
type ServicioConMantenimiento = { id: number; nombre: string; meses: number };

/** "Agregar mantenimiento", sin fondo en la cabecera de la sección (como "Editar"). */
export function AgregarMantenimiento(props: { clienteId: number; vehiculos: Vehiculo[]; servicios: ServicioConMantenimiento[]; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  const hidratado = useHidratado();
  return (
    <>
      {/* "Agregar", como en Vehículos: a 360 px el texto entero no entra junto al título */}
      <Button type="button" variant="ghost" disabled={!hidratado} aria-label="Agregar mantenimiento" onClick={() => setAbierto(true)}>
        <PlusIcon />
        Agregar
      </Button>
      <ModalFormulario titulo="Agregar mantenimiento" abierto={abierto} alCambiar={setAbierto}>
        <FormularioAgregar {...props} />
      </ModalFormulario>
    </>
  );
}

function FormularioAgregar({ clienteId, vehiculos, servicios, hoy }: { clienteId: number; vehiculos: Vehiculo[]; servicios: ServicioConMantenimiento[]; hoy: string }) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(agregarMantenimiento, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Controlados: el próximo se calcula a la vista y nada se pierde tras un error
  const [vehiculoId, setVehiculoId] = useState(vehiculos.length === 1 ? String(vehiculos[0].id) : "");
  const [servicioId, setServicioId] = useState(servicios.length === 1 ? String(servicios[0].id) : "");
  const [hecho, setHecho] = useState("");
  const [meses, setMeses] = useState(servicios.length === 1 ? String(servicios[0].meses) : "");
  const n = Number(meses);
  const proximo = fechaExiste(hecho) && Number.isInteger(n) && n >= 1 && n <= 24 ? sumarMeses(hecho, n) : null;

  function elegirServicio(id: string) {
    setServicioId(id);
    // La frecuencia del catálogo, que se puede cambiar para este vehículo
    const elegido = servicios.find((s) => String(s.id) === id);
    if (elegido) setMeses(String(elegido.meses));
  }

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label="Agregar mantenimiento">
      <input type="hidden" name="clienteId" value={clienteId} />
      {estado.mensaje && !estado.ok && <MensajeError id="agregar-error">{estado.mensaje}</MensajeError>}
      <p className="text-tinta-suave">Un servicio que el vehículo se hizo antes del sistema.</p>
      {vehiculos.length === 1 ? (
        <input type="hidden" name="vehiculoId" value={vehiculoId} />
      ) : (
        <Campo id="vehiculoId" etiqueta="Vehículo" error={e.vehiculoId}>
          <Selector id="vehiculoId" name="vehiculoId" value={vehiculoId} onChange={(ev) => setVehiculoId(ev.target.value)} aria-invalid={!!e.vehiculoId} aria-describedby={e.vehiculoId ? "vehiculoId-error" : undefined} className="max-w-xs">
            <option value="">Elige el vehículo</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>{v.placa}</option>
            ))}
          </Selector>
        </Campo>
      )}
      <Campo id="servicioId" etiqueta="Servicio que se hizo" error={e.servicioId}>
        <Selector id="servicioId" name="servicioId" value={servicioId} onChange={(ev) => elegirServicio(ev.target.value)} aria-invalid={!!e.servicioId} aria-describedby={e.servicioId ? "servicioId-error" : undefined} className="max-w-md">
          <option value="">Elige el servicio</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </Selector>
      </Campo>
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="hecho" etiqueta="Cuándo se hizo" error={e.hecho}>
          <Input id="hecho" name="hecho" type="date" max={hoy} value={hecho} onChange={(ev) => setHecho(ev.target.value)} aria-invalid={!!e.hecho} aria-describedby={e.hecho ? "hecho-error" : undefined} />
        </Campo>
        <CampoMeses valor={meses} onChange={setMeses} error={e.meses} />
      </div>
      <p aria-live="polite" className="font-semibold">
        {proximo ? `Próximo mantenimiento: ${formatearFecha(proximo)}${proximo < hoy ? " (ya venció: queda por avisar)" : ""}` : "Próximo mantenimiento: elige la fecha y los meses."}
      </p>
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Agregando…" : "Agregar mantenimiento"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}

/** El menú "Más" de un plan sin agendar: editarlo o terminarlo ("No le interesa"). */
export function MasPlan({ plan, hoy }: { plan: { id: number; intervaloMeses: number; fechaProgramada: string; servicio: string }; hoy: string }) {
  const [abierta, setAbierta] = useState<"editar" | "terminar" | null>(null);
  const cambiar = (abierto: boolean) => !abierto && setAbierta(null);
  return (
    <>
      <MenuMas
        acciones={[
          { texto: "Editar", alElegir: () => setAbierta("editar") },
          { texto: "No le interesa", alElegir: () => setAbierta("terminar") },
        ]}
      />
      <ModalFormulario titulo={`Mantenimiento de ${plan.servicio}`} abierto={abierta === "editar"} alCambiar={cambiar}>
        <FormularioEditar plan={plan} hoy={hoy} />
      </ModalFormulario>
      <ModalFormulario titulo="No le interesa" abierto={abierta === "terminar"} alCambiar={cambiar}>
        <FormularioNoLeInteresa id={plan.id} />
      </ModalFormulario>
    </>
  );
}

function FormularioEditar({ plan, hoy }: { plan: { id: number; intervaloMeses: number; fechaProgramada: string }; hoy: string }) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(editarPlan, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  const [meses, setMeses] = useState(String(plan.intervaloMeses));
  // Uno vencido se reprograma desde hoy
  const [proximo, setProximo] = useState(plan.fechaProgramada < hoy ? hoy : plan.fechaProgramada);

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label="Editar plan">
      <input type="hidden" name="id" value={plan.id} />
      {estado.mensaje && !estado.ok && <MensajeError id="plan-error">{estado.mensaje}</MensajeError>}
      <div className="grid gap-5 sm:grid-cols-2">
        <CampoMeses valor={meses} onChange={setMeses} error={e.meses} />
        <Campo id="proximo" etiqueta="Próximo mantenimiento" error={e.proximo} ayuda="Si cambia la fecha, se vuelve a avisar.">
          <Input
            id="proximo"
            name="proximo"
            type="date"
            min={hoy}
            max={sumarMeses(hoy, 24)}
            value={proximo}
            onChange={(ev) => setProximo(ev.target.value)}
            aria-invalid={!!e.proximo}
            aria-describedby={e.proximo ? "proximo-error" : "proximo-ayuda"}
          />
        </Campo>
      </div>
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar plan"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}

function CampoMeses({ valor, onChange, error }: { valor: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Campo id="meses" etiqueta="Cada" error={error}>
      <div className="flex items-center gap-2">
        <Input id="meses" name="meses" inputMode="numeric" autoComplete="off" value={valor} onChange={(ev) => onChange(ev.target.value)} aria-invalid={!!error} aria-describedby={error ? "meses-error" : undefined} className="max-w-24" />
        <span className="text-tinta-suave">meses</span>
      </div>
    </Campo>
  );
}
