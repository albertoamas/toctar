import { startTransition, useEffect, useState } from "react";
import { Campo } from "@/componentes/panel/campo";
import { ElegirFoto } from "@/componentes/panel/elegir-foto";
import { Selector } from "@/componentes/panel/selector";
import { achicarFoto } from "@/componentes/panel/subida-foto";
import { ANCHO_DATO } from "@/componentes/panel/anchos";
import { Input } from "@/componentes/ui/input";
import { BYTES_MAXIMOS_FOTO } from "@/lib/formato-fotos";
import type { EstadoCliente } from "@/modulos/clientes/acciones";
import { type EnlaceExistente, Existente } from "@/modulos/clientes/componentes/campos";
import type { Tamano } from "@/modulos/configuracion/consultas";
import { ERROR_FOTO_INTERESADO } from "../esquemas";

// Componente de cliente: se usa dentro del formulario de Nueva cotización (recibe funciones como props).
// Pedido 31, parte 2 (P31b-cotizacion-rapida.md): el vehículo de alguien nuevo, sin registrarlo. La placa (lo que el
// dueño quiere saber del auto, 22/11), el tamaño, que da el precio, y una foto opcional. Al reservar se registra con esto.

type Props = {
  /** Para el aviso de placa repetida, con su enlace (como en el vehículo de un cliente). */
  estado: EstadoCliente;
  enlaceExistente: EnlaceExistente;
  tamanos: Tamano[];
  valores: Record<string, string>;
  errores: Record<string, string>;
  /** Otro tamaño, otro precio sugerido. */
  alCambiarTamano: (tamanoId: string) => void;
  foto: { vista: string | null; elegir: (archivo: File | null) => void };
};

export function CamposVehiculoInteresado({ estado, enlaceExistente, tamanos, valores, errores: e, alCambiarTamano, foto }: Props) {
  const [tamanoId, setTamanoId] = useState(valores.interesadoTamanoId ?? "");
  const ejemplos = tamanos.find((t) => String(t.id) === tamanoId)?.descripcion;
  return (
    <>
      <Campo id="interesadoPlaca" etiqueta="Placa" error={e.interesadoPlaca}>
        <Input
          id="interesadoPlaca"
          name="interesadoPlaca"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          defaultValue={valores.interesadoPlaca}
          aria-invalid={!!e.interesadoPlaca}
          aria-describedby={e.interesadoPlaca ? "interesadoPlaca-error" : undefined}
          className={ANCHO_DATO.placa}
        />
      </Campo>
      <Existente estado={estado} campo="interesadoPlaca" enlace={enlaceExistente} />
      <Campo id="interesadoTamanoId" etiqueta="Tamaño" error={e.interesadoTamanoId} ayuda={ejemplos || undefined}>
        <Selector
          id="interesadoTamanoId"
          name="interesadoTamanoId"
          value={tamanoId}
          onChange={(ev) => {
            setTamanoId(ev.target.value);
            alCambiarTamano(ev.target.value);
          }}
          aria-invalid={!!e.interesadoTamanoId}
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
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">
          Foto del vehículo <span className="font-normal text-tinta-suave">(opcional)</span>
        </p>
        <ElegirFoto id="foto" de="del vehículo" vista={foto.vista} alElegir={foto.elegir} quitable error={e.foto} />
      </div>
    </>
  );
}

/**
 * La foto del vehículo del interesado: se elige con vista previa y va achicada al enviar (una de celular pesa 4–12 MB).
 * Sin foto, o sin JavaScript todavía, el formulario va como siempre.
 */
export function useFotoInteresado(accion: (datos: FormData) => void) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState<string>();
  // La vista previa ocupa memoria mientras exista: se libera al cambiarla y al cerrar el formulario
  useEffect(() => () => void (vista && URL.revokeObjectURL(vista)), [vista]);

  function elegir(nuevo: File | null) {
    setArchivo(nuevo);
    setVista(nuevo ? URL.createObjectURL(nuevo) : null);
    setError(undefined);
  }

  /** Para el `onSubmit` del formulario: con foto, la achica y la agrega; si no, deja que el formulario siga solo. */
  async function enviar(ev: React.SyntheticEvent<HTMLFormElement, SubmitEvent>, conFoto: boolean) {
    if (!conFoto || !archivo) return;
    ev.preventDefault();
    const datos = new FormData(ev.currentTarget);
    setPreparando(true);
    const achicada = await achicarFoto(archivo);
    setPreparando(false);
    // Si no se pudo achicar y pesa demasiado, ni se manda: el servidor la rechazaría
    if (achicada.size > BYTES_MAXIMOS_FOTO) return setError(ERROR_FOTO_INTERESADO);
    datos.set("foto", achicada);
    startTransition(() => accion(datos));
  }

  return { vista, elegir, preparando, error, enviar };
}
