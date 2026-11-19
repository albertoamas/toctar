import {
  CalendarClockIcon,
  ChartColumnIcon,
  CalendarIcon,
  ContactIcon,
  FileTextIcon,
  GlobeIcon,
  HouseIcon,
  MessageSquareWarningIcon,
  ReceiptTextIcon,
  SettingsIcon,
  TagIcon,
  UsersIcon,
  WalletIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { Modulo } from "@/lib/permisos";

/** El ícono de cada módulo: el mismo en el menú y en los accesos del inicio, así se reconoce de un vistazo. */
export const ICONO_MODULO: Record<Modulo, LucideIcon> = {
  inicio: HouseIcon,
  agenda: CalendarIcon,
  ordenes: WrenchIcon,
  clientes: ContactIcon,
  cotizaciones: FileTextIcon,
  pagos: WalletIcon,
  gastos: ReceiptTextIcon,
  mantenimientos: CalendarClockIcon,
  reclamos: MessageSquareWarningIcon,
  sitio: GlobeIcon,
  catalogo: TagIcon,
  reportes: ChartColumnIcon,
  usuarios: UsersIcon,
  configuracion: SettingsIcon,
};
