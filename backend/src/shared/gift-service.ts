import { GiftStatus, UserRole, type Gift, type Prisma } from "@prisma/client";

type GiftWithReservation = Gift & {
  reservedByUser?: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export const giftWithUserInclude = {
  reservedByUser: {
    select: {
      id: true,
      telegramId: true,
      username: true,
      firstName: true,
      lastName: true
    }
  }
} satisfies Prisma.GiftInclude;

export const giftResponse = (
  gift: GiftWithReservation,
  currentUserId: string,
  currentUserRole: UserRole
): Record<string, unknown> => {
  const isReservedByCurrentUser = gift.reservedByUserId === currentUserId;
  const canShowReservedBy = currentUserRole === UserRole.ADMIN || isReservedByCurrentUser;

  return {
    id: gift.id,
    title: gift.title,
    description: gift.description,
    imageUrl: gift.imageUrl,
    linkUrl: gift.linkUrl,
    price: gift.price ? gift.price.toString() : null,
    currency: gift.currency,
    priority: gift.priority,
    status: gift.status,
    reservedByUserId: isReservedByCurrentUser || currentUserRole === UserRole.ADMIN ? gift.reservedByUserId : null,
    reservedAt: gift.reservedAt,
    createdByUserId: currentUserRole === UserRole.ADMIN ? gift.createdByUserId : null,
    createdAt: gift.createdAt,
    updatedAt: gift.updatedAt,
    isReservedByCurrentUser,
    reservedByUser: canShowReservedBy ? gift.reservedByUser : null
  };
};

export const userVisibleStatuses: GiftStatus[] = [GiftStatus.ACTIVE, GiftStatus.RESERVED, GiftStatus.PURCHASED];
