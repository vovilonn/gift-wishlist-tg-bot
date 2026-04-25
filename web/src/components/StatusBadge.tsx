import type { Gift } from "../lib/types";
import { Badge } from "./ui/badge";

const statusText: Record<Gift["status"], string> = {
  ACTIVE: "Свободен",
  RESERVED: "Забронировано",
  PURCHASED: "Куплен",
  HIDDEN: "Скрыт",
  ARCHIVED: "Архив"
};

const statusClass: Record<Gift["status"], "neutral" | "success" | "warning" | "accent" | "muted"> = {
  ACTIVE: "success",
  RESERVED: "warning",
  PURCHASED: "neutral",
  HIDDEN: "accent",
  ARCHIVED: "muted"
};

export const StatusBadge = ({ gift }: { gift: Gift }) => {
  if (gift.status === "RESERVED" && gift.isReservedByCurrentUser) {
    return <Badge variant="accent">Забронирован вами</Badge>;
  }
  return <Badge variant={statusClass[gift.status]}>{statusText[gift.status]}</Badge>;
};
