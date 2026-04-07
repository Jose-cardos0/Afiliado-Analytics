export type NotificationsPosition =
  | "top_left"
  | "top_center"
  | "top_right"
  | "bottom_left"
  | "bottom_center"
  | "bottom_right"
  | "center"
  | "middle_left"
  | "middle_right";

export const NOTIFICATIONS_POSITION_OPTIONS: {
  value: NotificationsPosition;
  label: string;
}[] = [
  { value: "top_left", label: "Topo · esquerda" },
  { value: "top_center", label: "Topo · centro" },
  { value: "top_right", label: "Topo · direita" },
  { value: "middle_left", label: "Meio da tela · esquerda" },
  { value: "center", label: "Centro da tela" },
  { value: "middle_right", label: "Meio da tela · direita" },
  { value: "bottom_left", label: "Rodapé · esquerda" },
  { value: "bottom_center", label: "Rodapé · centro" },
  { value: "bottom_right", label: "Rodapé · direita" },
];

const VALID = new Set<string>(NOTIFICATIONS_POSITION_OPTIONS.map((o) => o.value));

export const DEFAULT_NOTIFICATIONS_POSITION: NotificationsPosition = "top_right";

export function normalizeNotificationsEnabled(raw: unknown): boolean {
  return raw !== false;
}

export function normalizeNotificationsPosition(raw: unknown): NotificationsPosition {
  const s = String(raw ?? DEFAULT_NOTIFICATIONS_POSITION)
    .trim()
    .toLowerCase();
  if (s === "top") return "top_right";
  if (s === "bottom") return "bottom_right";
  if (VALID.has(s)) return s as NotificationsPosition;
  return DEFAULT_NOTIFICATIONS_POSITION;
}
