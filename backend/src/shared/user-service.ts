import { UserRole } from "@prisma/client";

import { isAdminTelegramId } from "./env";
import { prisma } from "./prisma";

export type TelegramProfile = {
  id: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

export const upsertUserFromTelegramProfile = async (profile: TelegramProfile) => {
  const telegramId = String(profile.id);
  const role = isAdminTelegramId(telegramId) ? UserRole.ADMIN : UserRole.USER;

  return prisma.user.upsert({
    where: {
      telegramId
    },
    update: {
      username: profile.username ?? null,
      firstName: profile.first_name ?? null,
      lastName: profile.last_name ?? null,
      photoUrl: profile.photo_url ?? null,
      role,
      lastSeenAt: new Date()
    },
    create: {
      telegramId,
      username: profile.username ?? null,
      firstName: profile.first_name ?? null,
      lastName: profile.last_name ?? null,
      photoUrl: profile.photo_url ?? null,
      role,
      lastSeenAt: new Date()
    }
  });
};

export const userResponse = (user: {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  role: UserRole;
}) => ({
  id: user.id,
  telegramId: user.telegramId,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  photoUrl: user.photoUrl,
  role: user.role
});
