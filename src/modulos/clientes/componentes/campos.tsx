"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Campo } from "@/componentes/panel/campo";
import { MasDatos } from "@/componentes/panel/mas-datos";
import { useCerrarModal } from "@/componentes/panel/modal-contexto";
import { CampoConBusqueda } from "@/componentes/panel/campo-con-busqueda";
import { Selector } from "@/componentes/panel/selector";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { Tamano } from "@/modulos/configuracion/consultas";
import type { EstadoCliente } from "../acciones";
import {
  aniosParaElegir,
  type CatalogoVehiculos,
  filtrarMarcas,
  marcaExacta,
  marcasParaElegir,
} from "../catalogo-vehiculos";
import { ANCHO_DATO } from "@/componentes/panel/anchos";

// Campos de cliente y de vehículo (HU-21): los usan el alta y la ficha (HU-23). Componentes de cliente: se usan
// dentro de formularios con useActionState.

type PropsCampos = {
  estado: EstadoCliente;
  /** Valores iniciales (al editar). */
  iniciales?: Record<string, string>;
  /** Prefijo de los nombres de campo, para tener dos formularios en la misma página. */
  prefijo?: string;
  /** Solo lo justo para atender a alguien nuevo (nombre y WhatsApp; placa y tamaño): la nueva consulta (C2). */
  compacto?: boolean;
  /** Lo opcional plegado detrás de "Agregar …": el alta (pulido 8.2). */
  plegar?: boolean;
  /** A dónde lleva el aviso de repetido. Por defecto, a la ficha del cliente. */
  enlaceExistente?: EnlaceExistente;
  /**
   * Con la placa de otro cliente, a dónde lleva "Cambiar de dueño a este cliente" (pedido 37): en la ficha de un cliente,
   * donde el vehículo puede pasar a él. Sin esto, solo el enlace a la ficha del dueño.
   */
  cambioDeDueno?: (existente: { id: number; vehiculoId: number }) => Route | null;
  /** Avisa el tamaño elegido (la cotización recalcula el precio sugerido). */
  alCambiarTamano?: (tamanoId: string) => void;
};

export type EnlaceExistente = (existente: { id: number; nombre: string }) => { href: Route; texto: string };

const aLaFicha: EnlaceExistente = (e) => ({ href: `/panel/clientes/${e.id}`, texto: `Abrir la ficha de ${e.nombre}` });

/** Si el dato ya es de otro cliente, el enlace a su ficha (RF-23). */
export function Existente({ estado, campo, enlace = aLaFicha }: { estado: EstadoCliente; campo: string; enlace?: EnlaceExistente }) {
  const existente = estado.existentes?.[campo];
  if (!existente) return null;
  const { href, texto } = enlace(existente);
  return (
    // Va debajo del Campo, después de su error: primero se lee qué pasó y después la salida
    // La salida que la misma pantalla propone: no pregunta (data-sin-preguntar, cambios-sin-guardar.tsx)
    <Link href={href} data-sin-preguntar className="-mt-4 inline-flex min-h-11 items-center self-start text-sm font-semibold underline">
      {texto}
    </Link>
  );
}

/** La placa es de otro cliente y se puede pasar a este (pedido 37): "Cambiar de dueño a este cliente". */
function CambioDeDueno({ estado, campo, href }: { estado: EstadoCliente; campo: string; href?: (e: { id: number; vehiculoId: number }) => Route | null }) {
  const existente = estado.existentes?.[campo];
  // Dentro de un modal, se cierra al irse: al volver a la ficha, no queda abierto
  const cerrar = useCerrarModal();
  const destino = href && existente?.vehiculoId ? href({ id: existente.id, vehiculoId: existente.vehiculoId }) : null;
  if (!destino) return null;
  return (
    <Link href={destino} onClick={cerrar} data-sin-preguntar className="-mt-4 inline-flex min-h-11 items-center self-start text-sm font-semibold underline">
      Cambiar de dueño a este cliente
    </Link>
  );
}

/** Algún campo trae un valor (lo enviado, o el guardado al editar) o un error: lo plegado empieza abierto. */
const conAlgo = (valores: Partial<Record<string, string>>, errores: Partial<Record<string, string>>, campos: string[]) => campos.some((c) => !!valores[c] || !!errores[c]);
const conError = (errores: Partial<Record<string, string>>, campos: string[]) => campos.some((c) => !!errores[c]);

export function CamposCliente({ estado, iniciales = {}, compacto, plegar, enlaceExistente }: PropsCampos) {
  const v = estado.valores ?? iniciales;
  const e = estado.errores ?? {};
  const describir = (campo: string, ayuda = false) => (e[campo] ? `${campo}-error` : ayuda ? `${campo}-ayuda` : undefined);
  const mas = !compacto && <MasDatosCliente estado={estado} iniciales={iniciales} />;
  return (
    <>
      {/* Una columna (Nuevo cliente, 17/11): cada ayuda queda debajo de su campo y no empuja al de al lado */}
      <Campo id="nombre" etiqueta="Nombre" error={e.nombre}>
        <Input id="nombre" name="nombre" autoComplete="off" defaultValue={v.nombre} aria-invalid={!!e.nombre} aria-describedby={describir("nombre")} />
      </Campo>
      <Campo id="telefono" etiqueta="WhatsApp" error={e.telefono} ayuda="Celular de Bolivia, 8 dígitos.">
        {/* El +591 dentro del campo, como prefijo: el campo arranca en el borde, como los demás */}
        <div className={`relative ${ANCHO_DATO.telefono}`}>
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-tinta-suave" aria-hidden>
            +591
          </span>
          <Input
            id="telefono"
            name="telefono"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="71234567"
            defaultValue={v.telefono}
            aria-invalid={!!e.telefono}
            aria-describedby={describir("telefono", true)}
            className="pl-14"
          />
        </div>
      </Campo>
      <Existente estado={estado} campo="telefono" enlace={enlaceExistente} />
      {plegar && mas ? (
        <MasDatos texto="Agregar correo, NIT y notas" titulo="Correo, NIT y notas" modo={Object.keys(iniciales).length > 0 ? "cambiar" : "agregar"} abierto={conAlgo(v, e, ["correo", "nit", "razonSocial", "notas"])} conError={conError(e, ["correo", "nit", "razonSocial", "notas"])}>
          {mas}
        </MasDatos>
      ) : (
        mas
      )}
    </>
  );
}

function MasDatosCliente({ estado, iniciales = {} }: PropsCampos) {
  const v = estado.valores ?? iniciales;
  const e = estado.errores ?? {};
  const describir = (campo: string, ayuda = false) => (e[campo] ? `${campo}-error` : ayuda ? `${campo}-ayuda` : undefined);
  return (
    <>
      <Campo id="correo" etiqueta="Correo" opcional error={e.correo}>
        <Input id="correo" name="correo" type="email" autoCapitalize="none" spellCheck={false} placeholder="nombre@correo.com" defaultValue={v.correo} aria-invalid={!!e.correo} aria-describedby={describir("correo")} />
      </Campo>
      {/* NIT y razón social juntos, en una fila si entran (C7, 18/11): van de la mano en la factura */}
      <div className="grid gap-5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <Campo id="nit" etiqueta="NIT" opcional error={e.nit}>
          <Input className={ANCHO_DATO.placa} id="nit" name="nit" inputMode="numeric" autoComplete="off" defaultValue={v.nit} aria-invalid={!!e.nit} aria-describedby={describir("nit")} />
        </Campo>
        <Campo id="razonSocial" etiqueta="Razón social" opcional error={e.razonSocial}>
          <Input id="razonSocial" name="razonSocial" autoComplete="off" defaultValue={v.razonSocial} aria-invalid={!!e.razonSocial} aria-describedby={describir("razonSocial")} />
        </Campo>
      </div>
      <Campo id="notas" etiqueta="Notas" opcional error={e.notas} ayuda="Por ejemplo, cómo prefiere que lo contacten.">
        <Textarea id="notas" name="notas" rows={2} defaultValue={v.notas} aria-invalid={!!e.notas} aria-describedby={describir("notas", true)} />
      </Campo>
    </>
  );
}

export function CamposVehiculo(props: PropsCampos & { tamanos: Tamano[]; /** Las marcas de la lista (pedido 52). */ catalogo: CatalogoVehiculos }) {
  const { estado, iniciales = {}, prefijo = "", compacto, plegar, enlaceExistente, cambioDeDueno, alCambiarTamano, tamanos, catalogo } = props;
  const v = estado.valores ?? iniciales;
  const e = estado.errores ?? {};
  const n = (campo: string) => prefijo + campo;
  const describir = (campo: string) => (e[n(campo)] ? `${n(campo)}-error` : undefined);
  // El tamaño, en un menú desplegable como la marca y el año (20/11, a pedido del dueño: las tarjetas ocupaban casi una
  // pantalla del celular). Debajo, los modelos del elegido: es lo que ayuda a elegirlo bien, y el tamaño decide el
  // precio. Controlado: no se pierde tras un error.
  const [tamanoId, setTamanoId] = useState(v[n("tamanoId")] ?? "");
  const ejemplosTamano = tamanos.find((t) => String(t.id) === tamanoId)?.descripcion;
  // React reinicia el formulario al terminar la acción y el menú volvía a "Elige el tamaño" aunque el estado siguiera
  // con el elegido: después de cada envío se vuelve a poner (el reinicio pasa antes que los efectos)
  const menuTamano = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (menuTamano.current && menuTamano.current.value !== tamanoId) menuTamano.current.value = tamanoId;
  }, [estado, tamanoId]);
  // Pedido 52: la marca de la lista (con búsqueda) y el año en un selector. El modelo y el color, texto simple (el color
  // con botones de los frecuentes se quitó el 20/11, a pedido del dueño)

  // Marca, modelo, año y color: a la vista, o plegados detrás de "Agregar …" en el alta. Una columna, como el resto
  const opcionales = !compacto && (
    <>
      <Campo id={n("marca")} etiqueta="Marca" opcional error={e[n("marca")]}>
        <CampoConBusqueda
          id={n("marca")}
          nombre={n("marca")}
          opciones={marcasParaElegir(catalogo.marcas, v[n("marca")])}
          filtrar={filtrarMarcas}
          exacta={marcaExacta}
          valorInicial={v[n("marca")] ?? ""}
          agregar
          placeholder="Elige la marca"
          invalido={!!e[n("marca")]}
          aria-describedby={describir("marca")}
        />
      </Campo>
      <Campo id={n("modelo")} etiqueta="Modelo" opcional error={e[n("modelo")]}>
        <Input id={n("modelo")} name={n("modelo")} autoComplete="off" defaultValue={v[n("modelo")]} aria-invalid={!!e[n("modelo")]} aria-describedby={describir("modelo")} />
      </Campo>
      <Campo id={n("anio")} etiqueta="Año" opcional error={e[n("anio")]}>
        <Selector id={n("anio")} name={n("anio")} defaultValue={v[n("anio")] ?? ""} aria-invalid={!!e[n("anio")]} aria-describedby={describir("anio")} className={ANCHO_DATO.placa}>
          <option value="">Elige el año</option>
          {aniosParaElegir().map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Selector>
      </Campo>
      <Campo id={n("color")} etiqueta="Color" opcional error={e[n("color")]}>
        <Input id={n("color")} name={n("color")} autoComplete="off" defaultValue={v[n("color")]} aria-invalid={!!e[n("color")]} aria-describedby={describir("color")} />
      </Campo>
    </>
  );
  const principales = (
    <>
      <Campo id={n("placa")} etiqueta="Placa" error={e[n("placa")]}>
        <Input
          id={n("placa")}
          name={n("placa")}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          defaultValue={v[n("placa")]}
          aria-invalid={!!e[n("placa")]}
          aria-describedby={describir("placa")}
          className={ANCHO_DATO.placa}
        />
      </Campo>
      <Existente estado={estado} campo={n("placa")} enlace={enlaceExistente} />
      <CambioDeDueno estado={estado} campo={n("placa")} href={cambioDeDueno} />
      <Campo id={n("tamanoId")} etiqueta="Tamaño" error={e[n("tamanoId")]} ayuda={ejemplosTamano || undefined}>
        <Selector
          ref={menuTamano}
          id={n("tamanoId")}
          name={n("tamanoId")}
          value={tamanoId}
          onChange={(ev) => {
            setTamanoId(ev.target.value);
            alCambiarTamano?.(ev.target.value);
          }}
          aria-invalid={!!e[n("tamanoId")]}
          className="sm:max-w-sm"
        >
          <option value="">Elige el tamaño</option>
          {tamanos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </Selector>
      </Campo>
    </>
  );
  if (!plegar || !opcionales) return (
    <>
      {principales}
      {opcionales}
    </>
  );
  return (
    <>
      {principales}
      {/* Al editar un vehículo, lo guardado no se borra al cerrar: "Listo" en lugar de "Quitar" */}
      <MasDatos
        texto="Agregar marca, modelo, año y color"
        titulo="Marca, modelo, año y color"
        modo={Object.keys(iniciales).length > 0 ? "cambiar" : "agregar"}
        abierto={conAlgo(v, e, ["marca", "modelo", "anio", "color"].map(n))}
        conError={conError(e, ["marca", "modelo", "anio", "color"].map(n))}
      >
        {opcionales}
      </MasDatos>
    </>
  );
}
