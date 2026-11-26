"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { AvisoAlSalir } from "@/componentes/panel/cambios-sin-guardar";
import { ConResumen } from "@/componentes/panel/con-resumen";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Button } from "@/componentes/ui/button";
import { formatearWhatsApp } from "@/lib/whatsapp";
import type { Tamano } from "@/modulos/configuracion/consultas";
import { crearCliente, type EstadoCliente } from "../acciones";
import { CamposCliente, CamposVehiculo } from "./campos";
import { ResumenClienteVehiculo } from "./resumen-cliente-vehiculo";
import type { CatalogoVehiculos } from "@/modulos/clientes/catalogo-vehiculos";

// HU-21: alta de un cliente con, opcional, su primer vehículo (lo normal es registrarlo con su auto). Pulido 8.2: a la
// vista, lo del caso común; correo, NIT y notas, plegados detrás de "Agregar …". El vehículo, completo (26/11).
// 26/11 (recorrido visual): con la forma de Nueva cotización y Nueva reserva. Las tarjetas una debajo de la otra (lado
// a lado, la del cliente quedaba corta junto a la del vehículo) y, en la computadora, "Así queda" al costado
// (ConResumen), que se llena mientras se escribe. "Crear cliente", en el pie fijo abajo.

type Vista = { nombre: string; telefono: string; placa: string; tamano: string; detalle: string[] };

const VACIA: Vista = { nombre: "", telefono: "", placa: "", tamano: "", detalle: [] };

export function FormularioNuevoCliente({ tamanos, catalogo }: { tamanos: Tamano[]; catalogo: CatalogoVehiculos }) {
  const [estado, accion, enviando] = useActionState<EstadoCliente, FormData>(crearCliente, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  // Lo escrito, para "Así queda": se lee del formulario en cada cambio (los campos no son controlados)
  const [vista, setVista] = useState<Vista>(VACIA);
  const leer = useCallback(() => {
    if (!formulario.current) return;
    const d = new FormData(formulario.current);
    const texto = (campo: string) => String(d.get(campo) ?? "").trim();
    const tamanoId = texto("vehiculo-tamanoId");
    setVista({
      nombre: texto("nombre"),
      telefono: texto("telefono").replace(/\D/g, ""),
      placa: texto("vehiculo-placa").toUpperCase().replace(/[\s.\-]/g, ""),
      tamano: tamanos.find((t) => String(t.id) === tamanoId)?.nombre ?? "",
      detalle: [[texto("vehiculo-marca"), texto("vehiculo-modelo")].filter(Boolean).join(" "), texto("vehiculo-anio"), texto("vehiculo-color")].filter(Boolean),
    });
  }, [tamanos]);
  // Después de un error, React reinicia el formulario con lo enviado: se vuelve a leer
  useEffect(() => {
    leer();
  }, [estado, leer]);

  const telefono = vista.telefono.length === 8 ? formatearWhatsApp(`591${vista.telefono}`) : vista.telefono ? `+591 ${vista.telefono}` : "Sin WhatsApp todavía";
  const resumen = (
    <ResumenClienteVehiculo
      id="asi-queda"
      titulo="Así queda"
      // Lo que falta, en gris: que no se lea como un dato
      cliente={{ nombre: vista.nombre || <span className="font-normal text-tinta-suave">Sin nombre todavía</span>, detalle: telefono }}
      vehiculo={vista.placa ? { placa: vista.placa, detalle: vista.detalle, tamano: vista.tamano || "sin elegir" } : null}
      extra={!vista.placa && <span className="text-sm text-tinta-suave">Sin vehículo</span>}
    />
  );

  return (
    // Cada cambio actualiza "Así queda", con el onChange de React (en un texto, cada letra). No con onInput: en el menú
    // del tamaño llega antes que su onChange y, al redibujar, React le volvía a poner el tamaño de antes (26/11)
    <form ref={formulario} action={accion} onChange={leer} className="flex flex-col gap-6" noValidate>
      <ConResumen etiqueta="Así queda el cliente" resumen={resumen}>
        <SeccionFormulario titulo="Cliente" claseContenido="gap-6">
          <CamposCliente estado={estado} plegar />
        </SeccionFormulario>
        <SeccionFormulario titulo="Vehículo (opcional)" claseContenido="gap-6">
          {/* Todo a la vista (26/11), como "Otro vehículo" en Nueva cotización y Nueva reserva (pedido 40) */}
          <CamposVehiculo estado={estado} prefijo="vehiculo-" tamanos={tamanos} catalogo={catalogo} />
        </SeccionFormulario>
      </ConResumen>
      <AvisoAlSalir formulario={formulario} estado={estado} />
      <PieFormulario pegado>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Creando…" : "Crear cliente"}
        </Button>
      </PieFormulario>
    </form>
  );
}
