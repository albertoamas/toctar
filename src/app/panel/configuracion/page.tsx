import type { Metadata } from "next";
import { Suspense } from "react";
import { MessageCircleIcon, SlidersHorizontalIcon, StoreIcon, WarehouseIcon } from "lucide-react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { TarjetasSeccion } from "@/componentes/panel/tarjetas-seccion";
import { exigirModulo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Configuración" };

// Configuración (pedido 26): "¿Qué quieres cambiar?" con una tarjeta por parte; al entrar, solo los campos de esa parte.
// Solo el dueño (módulo "configuracion").
export default function PaginaConfiguracion() {
  return (
    <PaginaPanel tipo="portada">
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </PaginaPanel>
  );
}

async function Contenido() {
  await exigirModulo("configuracion");
  return (
    <>
      <EncabezadoPagina titulo="Configuración">¿Qué quieres cambiar?</EncabezadoPagina>
      <TarjetasSeccion
        etiqueta="Partes de la configuración"
        tarjetas={[
          { href: "/panel/configuracion/negocio", icono: StoreIcon, titulo: "Negocio", descripcion: "Nombre, WhatsApp, dirección, horario, redes y logo." },
          { href: "/panel/configuracion/taller", icono: WarehouseIcon, titulo: "Taller", descripcion: "Los espacios, los tamaños de vehículo y el checklist." },
          { href: "/panel/configuracion/parametros", icono: SlidersHorizontalIcon, titulo: "Parámetros", descripcion: "Las cotizaciones (adelanto, validez, condiciones del PDF) y la agenda." },
          { href: "/panel/configuracion/mensajes", icono: MessageCircleIcon, titulo: "Mensajes", descripcion: "Los mensajes de WhatsApp: listo, saldo y mantenimiento." },
        ]}
      />
    </>
  );
}
