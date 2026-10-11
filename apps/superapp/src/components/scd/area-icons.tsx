import {
  Bus, CalendarDays, CircleDollarSign, FileText, Gauge, Handshake, House, LayoutGrid, MapPinned, Package, SquarePlus, Star, Table, Trophy, Users,
  type LucideIcon,
} from "lucide-react";

import type { AreaIcon } from "@/lib/areas";

/** One drawn icon set (lucide, 1.8 stroke) for every area, as on the Visual Master boards. */
export const AREA_ICON: Record<AreaIcon, LucideIcon> = {
  calendar: CalendarDays,
  trophy: Trophy,
  plus: SquarePlus,
  home: House,
  grid: LayoutGrid,
  table: Table,
  bus: Bus,
  box: Package,
  file: FileText,
  coin: CircleDollarSign,
  users: Users,
  gauge: Gauge,
  star: Star,
  handshake: Handshake,
  map: MapPinned,
};
