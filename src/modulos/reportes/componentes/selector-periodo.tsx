"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "cn";
import { useHidratado } from "@/componentes/hidratado";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/componentes/ui/dropdown-menu";
import { ANCHO_DATO } from "@/componentes/panel/anchos";
import { Campo } from "@/componentes/panel/campo";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { CancelarModal, PieModal } from "@/componentes/panel/modal-pie";
import { useCerrarModal } from "@/componentes/panel/modal-contexto";
import { rangoValido } from "../reglas";

// Las fechas de Reportes (v2, 19/11, prototipo aprobado). En la computadora, un control segmentado con los seis
// períodos; en el celular, un selector compacto que los abre en un menú. "Elegir fechas" abre un modal con desde y
// hasta (en el celular, la hoja desde abajo). Lo elegido va en la dirección (?periodo=, y desde/hasta para un rango):
// se comparte, Atrás funciona y se aplica a todo lo de la pestaña. El servidor vuelve a revisar el rango.

export type OpcionPeriodo = { clave: string; texto: string; href: string };

/** Por qué un rango no sirve, en palabras. */
function porQueNo(desde: string, hasta: string, hoy: string): string {
  if (desde > hasta) return "«Desde» tiene que ser antes de «Hasta».";
  if (hasta > hoy) return "No se puede elegir un día que todavía no llegó.";
  return "Elige fechas de hasta un año.";
}

export function SelectorPeriodo(props: { opciones: OpcionPeriodo[]; activa: string; texto: string; vista: string | null; desde: string; hasta: string; hoy: string }) {
  const { opciones, activa, texto, vista, desde, hasta, hoy } = props;
  const router = useRouter();
  const hidratado = useHidratado();
  const [, iniciar] = useTransition();
  const [eligiendo, setEligiendo] = useState(false);
  const ir = (href: string) => iniciar(() => router.push(href as Route));
  return (
    <>
      {/* Computadora: los seis a la vista */}
      <div role="group" aria-label="Fechas" className="hidden w-fit flex-wrap gap-0.5 rounded-lg bg-neutro-fondo p-1 sm:flex">
        {opciones.map((o) => (
          <Link
            key={o.clave}
            href={o.href as Route}
            aria-current={activa === o.clave ? "true" : undefined}
            className={cn("flex h-8 items-center rounded-md px-3.5 text-[0.8125rem] font-medium whitespace-nowrap text-tinta-suave hover:text-tinta", activa === o.clave && "bg-fondo font-semibold text-tinta shadow-sm")}
          >
            {o.texto}
          </Link>
        ))}
        <button
          type="button"
          disabled={!hidratado}
          onClick={() => setEligiendo(true)}
          aria-pressed={activa === "rango"}
          className={cn("flex h-8 items-center rounded-md px-3.5 text-[0.8125rem] font-medium whitespace-nowrap text-tinta-suave hover:text-tinta", activa === "rango" && "bg-fondo font-semibold text-tinta shadow-sm")}
        >
          {activa === "rango" ? texto : "Elegir fechas"}
        </button>
      </div>
      {/* Celular: un selector compacto, a lo ancho */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="outline" disabled={!hidratado} aria-label={`Fechas: ${texto}`} className="h-11 w-full justify-between gap-2 text-base" />}>
            <span className="flex min-w-0 items-center gap-2">
              <CalendarIcon aria-hidden className="text-tinta-suave" />
              <span className="truncate">{texto}</span>
            </span>
            <ChevronDownIcon aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-(--anchor-width)">
            <DropdownMenuRadioGroup
              value={activa}
              onValueChange={(clave) => {
                if (clave === "rango") return setEligiendo(true);
                const o = opciones.find((x) => x.clave === clave);
                if (o) ir(o.href);
              }}
            >
              {[...opciones, { clave: "rango", texto: "Elegir fechas", href: "" }].map((o) => (
                <DropdownMenuRadioItem key={o.clave} value={o.clave} className="min-h-11 text-base">
                  {o.texto}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ModalFormulario titulo="Elegir fechas" abierto={eligiendo} alCambiar={setEligiendo}>
        <FormularioFechas
          desde={activa === "rango" ? desde : sumarDiasCliente(hoy, -29)}
          hasta={activa === "rango" ? hasta : hoy}
          hoy={hoy}
          alElegir={(d, h) => {
            const p = new URLSearchParams([...(vista ? [["vista", vista] as [string, string]] : []), ["periodo", "rango"], ["desde", d], ["hasta", h]]);
            ir(`/panel/reportes?${p.toString()}`);
          }}
        />
      </ModalFormulario>
    </>
  );
}

/** Un día más o menos, en el navegador (las fechas van como texto, "2026-11-19"). */
function sumarDiasCliente(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Desde y hasta, dentro del modal: revisa el rango antes de ir y lo dice si no sirve. */
function FormularioFechas({ desde: desdeInicial, hasta: hastaInicial, hoy, alElegir }: { desde: string; hasta: string; hoy: string; alElegir: (desde: string, hasta: string) => void }) {
  const cerrar = useCerrarModal();
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!desde || !hasta) return setError("Elige las dos fechas.");
        if (!rangoValido(desde, hasta, hoy)) return setError(porQueNo(desde, hasta, hoy));
        setError(null);
        cerrar();
        alElegir(desde, hasta);
      }}
    >
      <div className="flex flex-wrap gap-4">
        <Campo id="reporte-desde" etiqueta="Desde">
          <Input id="reporte-desde" type="date" value={desde} max={hoy} min="2000-01-01" onChange={(e) => setDesde(e.target.value)} className={ANCHO_DATO.fecha} />
        </Campo>
        <Campo id="reporte-hasta" etiqueta="Hasta">
          <Input id="reporte-hasta" type="date" value={hasta} max={hoy} min="2000-01-01" onChange={(e) => setHasta(e.target.value)} className={ANCHO_DATO.fecha} />
        </Campo>
      </div>
      <p role={error ? "alert" : undefined} className={error ? "text-sm font-semibold text-peligro" : "text-sm text-tinta-suave"}>
        {error ?? "Hasta un año. Se compara con los mismos días justo antes."}
      </p>
      <PieModal>
        <Button type="submit">Ver estas fechas</Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}
