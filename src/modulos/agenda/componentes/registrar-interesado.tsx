"use client";

import Image from "next/image";
import { useActionState, useRef } from "react";
import { MensajeError } from "@/componentes/panel/campo";
import { AvisoAlSalir } from "@/componentes/panel/cambios-sin-guardar";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Button } from "@/componentes/ui/button";
import { useFocoEnError } from "@/componentes/foco-en-error";
import type { UrlsFoto } from "@/lib/fotos";
import { formatearWhatsApp } from "@/lib/whatsapp";
import type { EstadoCliente } from "@/modulos/clientes/acciones";
import type { CatalogoVehiculos } from "@/modulos/clientes/catalogo-vehiculos";
import { CamposCliente, CamposVehiculo } from "@/modulos/clientes/componentes/campos";
import { PREFIJO_VEHICULO } from "@/modulos/clientes/valores";
import type { Tamano } from "@/modulos/configuracion/consultas";
import { registrarInteresado } from "../registrar-interesado";

// Pedido 31, parte 2 (P31b-cotizacion-rapida.md): reservar la cotización de un interesado empieza por registrarlo, con
// lo que la cotización ya tiene escrito (nombre, WhatsApp y tamaño). Del vehículo falta la placa: lo que se escribió al
// cotizar y la foto, si la hay, ayudan a reconocerlo.

type Props = {
  cotizacionId: number;
  nombre: string;
  telefono: string;
  /** Lo que se escribió del vehículo al cotizar ("Hilux blanca"). */
  vehiculo: string | null;
  tamanoId: number;
  /** El cliente que ya tiene ese WhatsApp: la cotización queda con él, sin escribir sus datos. */
  clienteExistente: { id: number; nombre: string } | null;
  foto: UrlsFoto | null;
  tamanos: Tamano[];
  catalogo: CatalogoVehiculos;
  volver: string | null;
};

export function RegistrarInteresado(props: Props) {
  const { cotizacionId, nombre, telefono, vehiculo, tamanoId, clienteExistente, foto, tamanos, catalogo, volver } = props;
  const formulario = useRef<HTMLFormElement>(null);
  const [estado, accion, enviando] = useActionState<EstadoCliente, FormData>(registrarInteresado, {});
  useFocoEnError(formulario, estado);
  // Los datos que ya tiene la cotización, escritos; tras un error, los que se mandaron
  const iniciales = { nombre, telefono: formatearWhatsApp(telefono), [`${PREFIJO_VEHICULO}tamanoId`]: String(tamanoId) };

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="cotizacionId" value={cotizacionId} />
      {volver && <input type="hidden" name="volver" value={volver} />}
      {estado.mensaje && <MensajeError id="registrar-error">{estado.mensaje}</MensajeError>}

      <SeccionFormulario titulo="Cliente" claseContenido="gap-6">
        {clienteExistente ? (
          <p>
            Ese WhatsApp ya es de <span className="font-semibold">{clienteExistente.nombre}</span>: la cotización queda con él.
          </p>
        ) : (
          <CamposCliente estado={estado} iniciales={iniciales} compacto />
        )}
      </SeccionFormulario>

      <SeccionFormulario titulo="Vehículo" claseContenido="gap-6">
        {(vehiculo || foto) && (
          <div className="flex items-center gap-3">
            {foto && (
              <a href={foto.url} target="_blank" rel="noreferrer" className="shrink-0">
                <Image src={foto.miniatura} alt="Foto del vehículo al cotizar" width={96} height={72} unoptimized className="h-18 w-24 rounded-sm object-cover" />
              </a>
            )}
            <p className="text-sm text-tinta-suave">{vehiculo ? `Al cotizar: ${vehiculo}` : "La foto de cuando vino a cotizar."}</p>
          </div>
        )}
        <CamposVehiculo estado={estado} iniciales={iniciales} prefijo={PREFIJO_VEHICULO} tamanos={tamanos} catalogo={catalogo} />
      </SeccionFormulario>

      <AvisoAlSalir formulario={formulario} estado={estado} />
      <PieFormulario>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Registrando…" : "Registrar y seguir"}
        </Button>
      </PieFormulario>
    </form>
  );
}
