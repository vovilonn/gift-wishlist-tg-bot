import type { User } from "@prisma/client";

import { adminTelegramIds, env } from "./env";
import { sendTelegramMessage } from "./telegram-api";

const formatName = (user: {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}): string => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fullName) {
    return fullName;
  }
  if (user.username) {
    return `@${user.username}`;
  }
  return "Unknown user";
};

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);

export const notifyAdminsAboutReservation = async (params: {
  giftId: string;
  giftTitle: string;
  user: User;
  reservedAt: Date;
}): Promise<void> => {
  const text = `🎁 Новая бронь\n\nПодарок: ${params.giftTitle}\nПользователь: ${formatName(params.user)}${
    params.user.username ? ` / @${params.user.username}` : ""
  }\nДата: ${formatDate(params.reservedAt)}`;

  const buttonUrl = `${env.WEB_APP_URL}/gift/${params.giftId}`;
  const tasks = [...adminTelegramIds].map((adminId) =>
    sendTelegramMessage(adminId, text, {
      inline_keyboard: [[{ text: "Открыть подарок", url: buttonUrl }]]
    }).catch(() => undefined)
  );
  await Promise.all(tasks);
};

export const notifyAdminsAboutCancellation = async (params: {
  giftId: string;
  giftTitle: string;
  user: User;
  cancelledAt: Date;
}): Promise<void> => {
  const text = `↩️ Бронь отменена\n\nПодарок: ${params.giftTitle}\nПользователь: ${formatName(params.user)}${
    params.user.username ? ` / @${params.user.username}` : ""
  }\nДата: ${formatDate(params.cancelledAt)}`;

  const buttonUrl = `${env.WEB_APP_URL}/gift/${params.giftId}`;
  const tasks = [...adminTelegramIds].map((adminId) =>
    sendTelegramMessage(adminId, text, {
      inline_keyboard: [[{ text: "Открыть подарок", url: buttonUrl }]]
    }).catch(() => undefined)
  );
  await Promise.all(tasks);
};

export const notifyUserMessage = async (telegramId: string, text: string): Promise<void> => {
  await sendTelegramMessage(telegramId, text).catch(() => undefined);
};
