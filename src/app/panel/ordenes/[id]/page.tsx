import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { ImageUpIcon, KeyRoundIcon } from "lucide-react";
import { AvisoFlotante } from "@/componentes/panel/aviso-flotante";
import { AvisarPorWhatsApp } from "@/componentes/panel/avisar-whatsapp";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { ListaDatos } from "@/componentes/panel/lista-datos";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { PasosTrabajo } from "@/componentes/panel/pasos-trabajo";
import { Insignia } from "@/componentes/panel/insignia";
import { ENLACE_TEXTO } from "@/componentes/panel/enlace-texto";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { diaYHora, fechaEnBolivia, formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, formatearWhatsApp } from "@/lib/whatsapp";
import { pasoDelTrabajo } from "@/modulos/agenda/pasos";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
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
import { puedeQuitarFoto, esOrden, estaAbierta, estaAtrasada, pasosDeOrden, puedeExtenderse, puedePublicarse } from "@/modulos/ordenes/reglas";
import { MontosTrabajo } from "@/modulos/pagos/componentes/montos-trabajo";

export const metadata: Metadata = { title: "Orden" };

// HU-33 y HU-34: la orden (RF-40 a RF-42). El dueño y el encargado con "Órdenes" ven todas (pedido 32: sin técnico
// asignado); los precios y los pagos, solo con "Pagos" (RN-12). Arriba, el paso siguiente; después, cómo llegó, las fotos
// por etapa y la historia. Pulido 11.2: lo poco usado (extender la entrega, volver un paso) en "Más", con modales.
// C6 (sistema-del-panel.md §2 y §3): el paso siguiente, uno solo en rojo, en el encabezado (empezar, marcar lista, avisar,
// entregar); un solo WhatsApp a la vista; cada parte con su título arriba de su tarjeta.
export default function PaginaOrden({ params, searchParams }: PageProps<"/panel/ordenes/[id]">) {
  return (
    <PaginaPanel tipo="ficha">
      <Suspense fallback={<Cargando volver={{ href: "/panel/ordenes", texto: "Órdenes" }} />}>
        <Detalle params={params} searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Detalle({ params, searchParams }: Pick<PageProps<"/panel/ordenes/[id]">, "params" | "searchParams">) {
  const usuario = await exigirModulo("ordenes");
  const [{ id }, { recibido, entregado, publicado }] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  const o = await obtenerOrden(Number(id), puedeVerModulo(usuario, "pagos"));
  if (!o) notFound();
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
    fotos.filter((f) => f.etapa === etapa).map((f) => ({ ...f, puedeQuitar: puedeQuitarFoto(etapa, o.estado) && (usuario.rol === "dueno" || f.subidoPor === yo) }));
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
  // Con "Avisar" en el encabezado, escribir sin el mensaje de aviso queda en "Más": un solo WhatsApp a la vista
  const escribirEnMas = abierta && aviso ? enlaceWhatsApp(o.telefono) : undefined;
  // "Más" solo si tiene algo que ofrecer (una recibida que no se puede extender no tiene nada)
  const conMas = (abierta && (!!anterior || !!extender)) || !!escribirEnMas;
  const detalle = detalleVehiculo(o);
  // El paso siguiente, uno solo en rojo, y lo demás con borde. Lista: avisar y, ya avisada, entregar
  const acciones = (
    <div className="flex flex-wrap gap-2">
      {abierta && <EstadoOrden id={o.id} estado={o.estado} editable />}
      {entregar && (avisada || !aviso) && <EnlaceEntregar id={o.id} principal />}
      {abierta && aviso && <AvisarPorWhatsApp enlace={aviso.enlace} avisado={aviso.avisado} conDetalle={false} registrarAction={registrarAvisoListo.bind(null, { id: o.id })} />}
      {entregar && aviso && !avisada && <EnlaceEntregar id={o.id} />}
      {sePuedePublicar && (
        <Link href={`/panel/ordenes/${o.id}/publicar`} className={cn(buttonVariants({ variant: "outline" }))}>
          <ImageUpIcon />
          Publicar en la galería
        </Link>
      )}
      {!escribirEnMas && (
        <a href={enlaceWhatsApp(o.telefono)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
          <IconoWhatsApp />
          Escribir por WhatsApp
        </a>
      )}
      {conMas && <MasOrden id={o.id} anterior={anterior} extender={extender} avisada={avisada} escribir={escribirEnMas} />}
    </div>
  );
  // Debajo del título: cuándo se entregó o se avisó, y si ya está en la galería
  const contexto = (entrega || aviso?.avisado || publicada) && (
    <>
      {entrega ?? aviso?.avisado}
      {publicada && (
        <>
          {(entrega || aviso?.avisado) && " "}
          <Link href="/panel/sitio/galeria" className="tt-area-toque underline underline-offset-4">
            Publicada en la galería ({publicada.fotos === 1 ? "1 foto" : `${publicada.fotos} fotos`}
            {publicada.visible ? "" : ", oculta"})
          </Link>
        </>
      )}
    </>
  );

  return (
    <>
      <EncabezadoPagina
        volver={{ href: "/panel/ordenes", texto: "Órdenes" }}
        titulo={o.placa}
        estado={
          <>
            <Insignia tono={TONO_ESTADO_TRABAJO[o.estado]}>{NOMBRE_ESTADO_TRABAJO[o.estado]}</Insignia>
            {estaAtrasada(o, hoy) && <Insignia tono="aviso">Atrasada</Insignia>}
          </>
        }
        accion={acciones}
      >
        {contexto}
      </EncabezadoPagina>
      {/* Los pasos del trabajo (pedido 31): sin cotización, empieza en "Reservada" */}
      {o.estado !== "cancelado" && <PasosTrabajo paso={pasoDelTrabajo({ trabajo: o.estado }) ?? 0} conCotizacion={o.consultaId !== null} />}
      {recibido && o.estado === "recibido" && <AvisoFlotante mensaje="Vehículo recibido. La orden está en «Recibidas»." />}
      {entregado && o.estado === "entregado" && (
        <AvisoFlotante mensaje={o.saldoAlEntregar && o.montos && o.autorizoSaldo ? `Vehículo entregado con saldo de ${mostrarMonto(o.saldoAlEntregar)} Bs.` : "Vehículo entregado."} />
      )}
      {publicado && publicada && <AvisoFlotante mensaje="Publicado en la galería. Lo ordenas u ocultas en Sitio web > Galería." />}

      {/* Principal y datos (§2), según el ancho del área de trabajo: a la izquierda el trabajo (cómo llegó, fotos y
          avances); a la derecha los datos y, debajo, los montos. En el celular, en ese orden: datos, trabajo y montos */}
      <div className="grid items-start gap-8 @4xl:grid-cols-[minmax(0,1fr)_22rem] @4xl:grid-rows-[auto_1fr]">
        <div className="@4xl:col-start-2 @4xl:row-start-1">
          <Seccion id="datos" titulo="Datos">
            <div className="flex flex-col gap-2">
              {/* La placa ya está en el título: el vehículo dice su modelo y su tamaño (como la reserva) */}
              <ListaDatos
                nombre="Datos de la orden"
                filas={[
                  // La entrega aproximada sirve mientras está en el taller; entregada, el encabezado ya dice cuándo
                  o.estado !== "entregado" && [
                    "Entrega",
                    <span key="entrega" className="flex flex-col">
                      <span className="font-semibold">{o.fechaFin === hoy ? "Hoy" : formatearFecha(o.fechaFin)}</span>
                      <span className="text-sm text-tinta-suave">aproximada</span>
                    </span>,
                  ],
                  ["Espacio", <span key="espacio" className="font-semibold">{o.espacio}</span>],
                  [
                    "Ingresó",
                    <span key="ingreso" className="flex flex-col">
                      {o.recibidoAt && <span>{formatearFechaHora(o.recibidoAt)}</span>}
                      {o.recibidoPor && <span className="text-sm text-tinta-suave">recibió {o.recibidoPor}</span>}
                    </span>,
                  ],
                  [
                    "Cliente",
                    <span key="cliente" className="flex flex-col">
                      <span className="font-semibold">{o.cliente}</span>
                      <span className="text-sm text-tinta-suave">{formatearWhatsApp(o.telefono)}</span>
                    </span>,
                  ],
                  [
                    "Vehículo",
                    <span key="vehiculo" className="flex flex-col">
                      {detalle.length > 0 && <span>{detalle.join(" ")}</span>}
                      <span className="text-sm text-tinta-suave">Tamaño: {o.tamano}</span>
                    </span>,
                  ],
                ]}
              />
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
          </Seccion>
        </div>

        <div className="flex flex-col gap-8 @4xl:col-start-1 @4xl:row-span-2 @4xl:row-start-1">
          <ComoLlego revision={revision} observaciones={o.observacionesIngreso} />
          {firma && <FirmaDeEntrega firma={firma} />}
          {/* Con "Pagos", los servicios van con sus precios en el bloque de montos; si no, solo los nombres */}
          {!o.montos && (
            <Seccion id="servicios" titulo="Servicios">
              <ul className="list-disc pl-5">
                {o.servicios.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Seccion>
          )}
          <Seccion id="fotos" titulo="Fotos">
            {/* Cerrada y sin ninguna: una línea, no dos */}
            {fotos.length === 0 && !abierta ? (
              <p className="text-tinta-suave">Sin fotos.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Pedido 27: dos momentos, inicio y final; los detalles de cómo llegó, con su foto, están en el checklist. Las
                    de ingreso y durante, de antes del pedido, se siguen viendo en su lugar del tiempo, sin subir más */}
                {deEtapa("ingreso").length > 0 && <FotosOrden trabajoId={o.id} etapa="ingreso" fotos={deEtapa("ingreso")} editable={false} textoVacio="" />}
                <FotosOrden trabajoId={o.id} etapa="antes" fotos={deEtapa("antes")} editable={abierta} textoVacio="Sin fotos de inicio." />
                {deEtapa("durante").length > 0 && <FotosOrden trabajoId={o.id} etapa="durante" fotos={deEtapa("durante")} editable={false} textoVacio="" />}
                <FotosOrden trabajoId={o.id} etapa="despues" fotos={deEtapa("despues")} editable={abierta} textoVacio="Sin fotos del final." />
              </div>
            )}
          </Seccion>
          <AvancesOrden id={o.id} avances={avances.map((a) => ({ id: a.id, nota: a.nota, autor: a.autor, cuando: formatearFechaHora(a.createdAt) }))} editable={abierta} />
        </div>

        {/* Abierta también después de la entrega: una entregada con saldo se cobra aquí (RN-13, HU-37) */}
        {o.montos && (
          <div className="flex flex-col gap-8 @4xl:col-start-2 @4xl:row-start-2">
            <MontosTrabajo trabajoId={o.id} montos={o.montos} cerrado={false} hoy={hoy} agregar={conAdicional && <AgregarAdicional id={o.id} opciones={opciones} />} />
          </div>
        )}
      </div>
    </>
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
