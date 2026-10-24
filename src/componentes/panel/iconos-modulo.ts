import {
  CalendarClockIcon,
  CalendarIcon,
  ContactIcon,
  GlobeIcon,
  HouseIcon,
  InboxIcon,
  MessageSquareWarningIcon,
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
  consultas: InboxIcon,
  pagos: WalletIcon,
  mantenimientos: CalendarClockIcon,
  reclamos: MessageSquareWarningIcon,
  sitio: GlobeIcon,
  catalogo: TagIcon,
  usuarios: UsersIcon,
  configuracion: SettingsIcon,
};
