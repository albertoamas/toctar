import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { ImageUpIcon, KeyRoundIcon } from "lucide-react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { AvisarPorWhatsApp } from "@/componentes/panel/avisar-whatsapp";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { ENLACE_TEXTO } from "@/componentes/panel/enlace-texto";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { diaYHora, fechaEnBolivia, formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { puede, puedeVerModulo, puedeVerOrden } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, formatearWhatsApp } from "@/lib/whatsapp";
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { obtenerDatosPublicos, obtenerPlantillas } from "@/modulos/configuracion/consultas";
import { opcionesDeServicio } from "@/modulos/cotizaciones/consultas";
import { MasOrden } from "@/modulos/ordenes/componentes/acciones-orden";
import { AgregarAdicional } from "@/modulos/ordenes/componentes/agregar-adicional";
import { AvancesOrden } from "@/modulos/ordenes/componentes/avances-orden";
import { EstadoOrden } from "@/modulos/ordenes/componentes/estado-orden";
import { ComoLlego } from "@/modulos/ordenes/componentes/como-llego";
import { FirmaDeEntrega } from "@/modulos/ordenes/componentes/firma-entrega";
import { FotosOrden } from "@/modulos/ordenes/componentes/fotos-orden";
import { registrarAvisoListo } from "@/modulos/ordenes/acciones";
import { avancesDeTrabajo, firmaDeTrabajo, revisionDeTrabajo, fotosDeTrabajo, obtenerOrden, publicadaDeOrden } from "@/modulos/ordenes/consultas";
import { mensajeListo } from "@/modulos/ordenes/mensajes";
import { esOrden, estaAbierta, estaAtrasada, pasosDeOrden, puedeExtenderse, puedePublicarse } from "@/modulos/ordenes/reglas";
import { MontosTrabajo } from "@/modulos/pagos/componentes/montos-trabajo";

export const metadata: Metadata = { title: "Orden" };

// HU-33 y HU-34: la orden (RF-40 a RF-42). El dueño y el encargado con "Órdenes" ven todas; el técnico, solo las suyas
// y sin precios ni pagos ni el teléfono del cliente (RN-12). Arriba, el paso siguiente; después, cómo llegó, las fotos
// por etapa y la historia. Pulido 11.2: lo poco usado (extender la entrega, volver un paso) en "Más", con modales.
export default function PaginaOrden({ params, searchParams }: PageProps<"/panel/ordenes/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/ordenes">Órdenes</EnlaceVolver>
      <Suspense fallback={<Cargando />}>
        <Detalle params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Detalle({ params, searchParams }: Pick<PageProps<"/panel/ordenes/[id]">, "params" | "searchParams">) {
  const usuario = await exigirModulo("ordenes");
  const [{ id }, { recibido, entregado, publicado }] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  const tecnico = usuario.rol === "tecnico";
  const o = await obtenerOrden(Number(id), puedeVerModulo(usuario, "pagos"));
  if (!o) notFound();
  if (!puedeVerOrden(usuario, o.tecnicoId)) redirect("/panel/sin-acceso");
  const verAgenda = puedeVerModulo(usuario, "agenda");
  // Todavía es una reserva (o se canceló): se ve en la agenda, si quien entra la ve
  if (!esOrden(o.estado)) {
    if (!verAgenda) notFound();
    redirect(`/panel/agenda/${o.id}`);
  }
  const verFicha = puedeVerModulo(usuario, "clientes");
  const abierta = estaAbierta(o.estado);
  const hoy = fechaEnBolivia();
  const yo = Number(usuario.id);
  // Recién ahora, con el acceso verificado, se firman los enlaces de las fotos
  const conAviso = o.estado === "listo" && puede(usuario, "avisar_cliente");
  // Sumar servicios: solo el dueño, mientras la orden está abierta (RF-43)
  const conAdicional = abierta && puede(usuario, "agregar_adicional");
  // Publicar sus fotos en la galería del sitio: solo el dueño, ya entregada (HU-41)
  const conGaleria = o.estado === "entregado" && puede(usuario, "publicar_en_galeria");
  const [fotos, avances, negocio, plantillas, opciones, publicada, revision, firma] = await Promise.all([
    fotosDeTrabajo(o.id),
    avancesDeTrabajo(o.id),
    conAviso ? obtenerDatosPublicos() : null,
    conAviso ? obtenerPlantillas() : null,
    conAdicional ? opcionesDeServicio(o.tamanoId) : [],
    conGaleria ? publicadaDeOrden(o.id) : null,
    revisionDeTrabajo(o.id),
    o.estado === "entregado" ? firmaDeTrabajo(o.id) : null,
  ]);
  // Lista: el aviso al cliente por WhatsApp (HU-35) con el mensaje de Configuración (HU-40), con el saldo solo si
  // quien avisa lo ve
  const aviso = negocio && plantillas && {
    enlace: enlaceWhatsApp(
      o.telefono,
      mensajeListo({ plantilla: plantillas.listo, negocio: negocio.nombre, cliente: o.cliente, vehiculo: o, saldo: o.montos?.saldo.saldo ?? null }),
    ),
    avisado: o.avisadoListoAt ? `Avisado el ${diaYHora(o.avisadoListoAt)}${o.avisadoListoPor ? ` por ${o.avisadoListoPor}` : ""}` : null,
  };
  // Una vez: ya publicada, se ordena u oculta en Sitio web > Galería (y si se quita de ahí, se puede volver a publicar)
  const sePuedePublicar = conGaleria && !publicada && puedePublicarse(o.estado, fotos.map((f) => f.etapa));
  const deEtapa = (etapa: (typeof fotos)[number]["etapa"]) =>
    fotos.filter((f) => f.etapa === etapa).map((f) => ({ ...f, puedeQuitar: etapa !== "ingreso" && (usuario.rol === "dueno" || f.subidoPor === yo) }));
  const avisada = o.avisadoListoAt !== null;
  const { anterior } = pasosDeOrden(o.estado);
  const extender =
    puedeExtenderse(o.estado) && puede(usuario, "extender_entrega") ? { fechaInicio: o.fechaInicio, fechaFin: o.fechaFin, espacioId: o.espacioId, espacio: o.espacio, hoy } : undefined;
  // Entregada: cuándo, quién y, para quien ve pagos, el saldo que quedó y quién lo autorizó (RN-13)
  const entrega =
    o.estado === "entregado" && o.entregadoAt
      ? `Entregado el ${diaYHora(o.entregadoAt)}${o.entregadoPor ? ` por ${o.entregadoPor}` : ""}.${o.montos && o.autorizoSaldo && o.saldoAlEntregar ? ` Con saldo de ${mostrarMonto(o.saldoAlEntregar)} Bs, autorizado por ${o.autorizoSaldo}.` : ""}`
      : null;
  const entregar = o.estado === "listo" && puede(usuario, "entregar_vehiculo");
  // "Más" solo si tiene algo que ofrecer (el técnico, en una recibida, no tiene nada)
  const conMas = abierta && (!!anterior || !!extender);
  const detalle = detalleVehiculo(o);

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <EncabezadoPagina
        titulo={o.placa}
        estado={
          <>
            <span className="tt-insignia">{NOMBRE_ESTADO_TRABAJO[o.estado]}</span>
            {estaAtrasada(o, hoy) && <span className="tt-insignia tt-insignia--aviso">Atrasada</span>}
          </>
        }
        accion={
          (!tecnico || conMas) && (
            <div className="flex flex-wrap gap-2">
              {!tecnico && (
                <a href={enlaceWhatsApp(o.telefono)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
                  <IconoWhatsApp />
                  Escribir por WhatsApp
                </a>
              )}
              {conMas && <MasOrden id={o.id} anterior={anterior} extender={extender} avisada={avisada} />}
            </div>
          )
        }
      >
        {entrega}
      </EncabezadoPagina>
      {recibido && o.estado === "recibido" && <AvisoEnPagina>Vehículo recibido. La orden está en «Recibidas».</AvisoEnPagina>}
      {entregado && o.estado === "entregado" && (
        <AvisoEnPagina>
          {o.saldoAlEntregar && o.montos && o.autorizoSaldo ? `Vehículo entregado con saldo de ${mostrarMonto(o.saldoAlEntregar)} Bs.` : "Vehículo entregado."}
        </AvisoEnPagina>
      )}
      {publicado && publicada && <AvisoEnPagina>Publicado en la galería. Lo ordenas u ocultas en Sitio web &gt; Galería.</AvisoEnPagina>}
      {(sePuedePublicar || publicada) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {sePuedePublicar && (
            <Link href={`/panel/ordenes/${o.id}/publicar`} className={cn(buttonVariants({ variant: "outline" }))}>
              <ImageUpIcon />
              Publicar en la galería
            </Link>
          )}
          {publicada && (
            <Link href="/panel/sitio/galeria" className="tt-area-toque text-sm underline underline-offset-4">
              Publicada en la galería ({publicada.fotos === 1 ? "1 foto" : `${publicada.fotos} fotos`}
              {publicada.visible ? "" : ", oculta"})
            </Link>
          )}
        </div>
      )}
      {abierta && (
        <div className="flex max-w-3xl flex-col gap-4">
          <EstadoOrden id={o.id} estado={o.estado} editable />
          {/* Lista: el paso siguiente es avisar y, ya avisada, entregar. Un solo rojo: el que toca ahora */}
          {(aviso || entregar) && (
            <div className="flex flex-wrap items-start gap-2">
              {entregar && (avisada || !aviso) && <EnlaceEntregar id={o.id} principal />}
              {aviso && <AvisarPorWhatsApp enlace={aviso.enlace} avisado={aviso.avisado} registrarAction={registrarAvisoListo.bind(null, { id: o.id })} />}
              {entregar && aviso && !avisada && <EnlaceEntregar id={o.id} />}
            </div>
          )}
        </div>
      )}

      {/* En la computadora: a la izquierda el trabajo (cómo llegó, fotos y avances); a la derecha los datos y, debajo, los
          montos. En el celular, en ese orden: datos, trabajo y montos */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:grid-rows-[auto_1fr] lg:items-start">
        {/* La placa ya está en el título: el vehículo dice su modelo y su tamaño, con la etiqueta (como la reserva) */}
        <div className="flex flex-col gap-2 rounded-sm border border-border p-4 lg:col-start-2 lg:row-start-1">
          <dl aria-label="Datos de la orden" className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3">
            <dt className="text-tinta-suave">Entrega</dt>
            <dd className="flex flex-col">
              <span className="font-semibold">{o.fechaFin === hoy ? "Hoy" : formatearFecha(o.fechaFin)}</span>
              <span className="text-sm text-tinta-suave">aproximada</span>
            </dd>
            <dt className="text-tinta-suave">Espacio</dt>
            <dd className="font-semibold">{o.espacio}</dd>
            <dt className="text-tinta-suave">Técnico</dt>
            <dd>{o.tecnico ?? <span className="text-tinta-suave">Sin asignar</span>}</dd>
            <dt className="text-tinta-suave">Ingresó</dt>
            <dd className="flex flex-col">
              {o.recibidoAt && <span>{formatearFechaHora(o.recibidoAt)}</span>}
              {o.recibidoPor && <span className="text-sm text-tinta-suave">recibió {o.recibidoPor}</span>}
            </dd>
            <dt className="text-tinta-suave">Cliente</dt>
            <dd className="flex flex-col">
              <span className="font-semibold">{o.cliente}</span>
              {!tecnico && <span className="text-sm text-tinta-suave">{formatearWhatsApp(o.telefono)}</span>}
            </dd>
            <dt className="text-tinta-suave">Vehículo</dt>
            <dd className="flex flex-col">
              {detalle.length > 0 && <span>{detalle.join(" ")}</span>}
              <span className="text-sm text-tinta-suave">Tamaño: {o.tamano}</span>
            </dd>
          </dl>
          {/* Los enlaces, de 44 px y fuera de la lista: la ficha del cliente (con Clientes) y la reserva (con Agenda) */}
          {verFicha && (
            <Link href={`/panel/clientes/${o.clienteId}`} className={ENLACE_TEXTO}>
              Ver ficha del cliente
            </Link>
          )}
          {verAgenda && (
            <Link href={`/panel/agenda/${o.id}`} className={ENLACE_TEXTO}>
              Ver la reserva
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-10 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <ComoLlego revision={revision} observaciones={o.observacionesIngreso} />
          {firma && <FirmaDeEntrega firma={firma} />}
          {/* Con "Pagos", los servicios van con sus precios en el bloque de montos; si no, solo los nombres */}
          {!o.montos && (
            <section aria-labelledby="servicios-titulo" className="flex flex-col gap-2">
              <h2 id="servicios-titulo" className="font-heading text-2xl font-bold italic">Servicios</h2>
              <ul className="list-disc pl-5">
                {o.servicios.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="fotos-titulo" className="flex flex-col gap-6">
            <h2 id="fotos-titulo" className="font-heading text-2xl font-bold italic">Fotos</h2>
            {/* Cerrada y sin ninguna: una línea, no cuatro */}
            {fotos.length === 0 && !abierta ? (
              <p className="text-tinta-suave">Sin fotos.</p>
            ) : (
              <>
                <FotosOrden trabajoId={o.id} etapa="ingreso" fotos={deEtapa("ingreso")} editable={false} textoVacio="Se recibió sin fotos de ingreso." />
                <FotosOrden trabajoId={o.id} etapa="antes" fotos={deEtapa("antes")} editable={abierta} compacta textoVacio="Sin fotos de antes." />
                <FotosOrden trabajoId={o.id} etapa="durante" fotos={deEtapa("durante")} editable={abierta} compacta textoVacio="Sin fotos del trabajo." />
                <FotosOrden trabajoId={o.id} etapa="despues" fotos={deEtapa("despues")} editable={abierta} compacta textoVacio="Sin fotos de después." />
              </>
            )}
          </section>
          <AvancesOrden id={o.id} avances={avances.map((a) => ({ id: a.id, nota: a.nota, autor: a.autor, cuando: formatearFechaHora(a.createdAt) }))} editable={abierta} />
        </div>

        {/* Abierta también después de la entrega: una entregada con saldo se cobra aquí (RN-13, HU-37) */}
        {o.montos && (
          <div className="flex flex-col gap-10 lg:col-start-2 lg:row-start-2">
            <MontosTrabajo trabajoId={o.id} montos={o.montos} cerrado={false} hoy={hoy} agregar={conAdicional && <AgregarAdicional id={o.id} opciones={opciones} />} />
          </div>
        )}
      </div>
    </div>
  );
}

/** "Entregar vehículo": un enlace con forma de botón que lleva a la entrega, con el saldo y el cobro. */
function EnlaceEntregar({ id, principal }: { id: number; principal?: boolean }) {
  return (
    <Link href={`/panel/ordenes/${id}/entregar`} className={cn(buttonVariants({ variant: principal ? "default" : "outline" }))}>
      <KeyRoundIcon />
      Entregar vehículo
    </Link>
  );
}
