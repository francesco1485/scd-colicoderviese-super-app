import {
  Activity,
  Building2,
  CircleDollarSign,
  ClipboardList,
  GalleryVerticalEnd,
  LayoutDashboard,
  Map,
  Radio,
  type LucideIcon,
} from "lucide-react";

export type TemplateId = "T01" | "T02" | "T03" | "T04" | "T05" | "T06" | "T07" | "T08";

export type TemplateDefinition = {
  id: TemplateId;
  code: string;
  label: string;
  note: string;
  icon: LucideIcon;
};

export const templates: TemplateDefinition[] = [
  { id: "T01", code: "PUBLIC_EDITORIAL", label: "Public Editorial", note: "Gerarchia pubblica e racconto istituzionale", icon: GalleryVerticalEnd },
  { id: "T02", code: "OPERATIONAL_HOME", label: "Operational Home", note: "Priorità, segnali e azioni di giornata", icon: LayoutDashboard },
  { id: "T03", code: "DOMAIN_HUB", label: "Domain Hub", note: "Vista aggregata per area operativa", icon: Building2 },
  { id: "T04", code: "ENTITY_DETAIL", label: "Entity Detail", note: "Profilo verificabile di una singola entità", icon: ClipboardList },
  { id: "T05", code: "SPATIAL_WORKSPACE", label: "Spatial Workspace", note: "Formazione, mobilità e impianti in 2D", icon: Map },
  { id: "T06", code: "COMMUNICATION_HUB", label: "Communication Hub", note: "Flussi editoriali e approvazioni", icon: Radio },
  { id: "T07", code: "DATA_FINANCE", label: "Data & Finance", note: "Lettura economica con provenienza esplicita", icon: CircleDollarSign },
  { id: "T08", code: "PROJECT_DEVELOPMENT", label: "Project Development", note: "Avanzamento, dipendenze e decisioni", icon: Activity },
];

export const demoRows = [
  { id: "ENTITY-DEMO-01", area: "Area Nord", status: "DA VERIFICARE", owner: "UTENTE-DEMO-A", signal: "62" },
  { id: "ENTITY-DEMO-02", area: "Area Lago", status: "IN REVISIONE", owner: "UTENTE-DEMO-B", signal: "48" },
  { id: "ENTITY-DEMO-03", area: "Area Territorio", status: "PRONTO PER REVIEW", owner: "UTENTE-DEMO-C", signal: "74" },
];