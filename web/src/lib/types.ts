export type UserRole = "USER" | "ADMIN";
export type GiftStatus = "ACTIVE" | "RESERVED" | "PURCHASED" | "HIDDEN" | "ARCHIVED";
export type GiftPriority = "LOW" | "MEDIUM" | "HIGH";

export type User = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  role: UserRole;
};

export type Gift = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  price: string | null;
  currency: string | null;
  priority: GiftPriority | null;
  status: GiftStatus;
  reservedByUserId: string | null;
  reservedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isReservedByCurrentUser: boolean;
  reservedByUser:
    | {
        id: string;
        telegramId: string;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
      }
    | null;
};

export type AdminReservation = {
  gift: {
    id: string;
    title: string;
    imageUrl: string | null;
  };
  reservedBy: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  reservedAt: string | null;
};

export type ApiErrorPayload = {
  statusCode: number;
  code: string;
  message: string;
};
