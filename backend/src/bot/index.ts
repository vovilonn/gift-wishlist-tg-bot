import { GiftStatus, UserRole } from "@prisma/client";
import { Markup, Telegraf } from "telegraf";

import { env } from "../shared/env";
import { prisma } from "../shared/prisma";
import { upsertUserFromTelegramProfile } from "../shared/user-service";

const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);

const mainKeyboard = (isAdmin: boolean) => {
  if (isAdmin) {
    return Markup.inlineKeyboard([
      [Markup.button.webApp("🎁 Открыть вишлист", env.WEB_APP_URL)],
      [Markup.button.webApp("➕ Добавить подарок", `${env.WEB_APP_URL}/admin/gifts/new`)],
      [Markup.button.callback("📌 Посмотреть брони", "admin_reservations")]
    ]);
  }
  return Markup.inlineKeyboard([[Markup.button.webApp("🎁 Открыть вишлист", env.WEB_APP_URL)]]);
};

const adminReservationKeyboard = Markup.inlineKeyboard([
  [Markup.button.webApp("Открыть админ-панель", `${env.WEB_APP_URL}/admin/reservations`)],
  [Markup.button.callback("Обновить", "admin_reservations")]
]);

const reservationsMessage = async (): Promise<string> => {
  const reservedGifts = await prisma.gift.findMany({
    where: { status: GiftStatus.RESERVED },
    include: {
      reservedByUser: true
    },
    orderBy: {
      reservedAt: "asc"
    }
  });

  if (!reservedGifts.length) {
    return "Пока никто ничего не забронировал.";
  }

  const lines = reservedGifts.map((gift, index) => {
    const reservedBy = gift.reservedByUser;
    const fullName = [reservedBy?.firstName, reservedBy?.lastName].filter(Boolean).join(" ").trim();
    const userName = reservedBy?.username ? `@${reservedBy.username}` : "без username";

    return `${index + 1}. ${gift.title}\nЗабронировал: ${fullName || userName}\nДата: ${
      gift.reservedAt ? formatDate(gift.reservedAt) : "-"
    }`;
  });

  return `📌 Активные брони:\n\n${lines.join("\n\n")}`;
};

const syncUser = async (from: {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}) =>
  upsertUserFromTelegramProfile({
    id: from.id,
    username: from.username,
    first_name: from.first_name,
    last_name: from.last_name
  });

bot.start(async (ctx) => {
  const from = ctx.from;
  if (!from) {
    return;
  }

  const user = await syncUser(from);
  const isAdmin = user.role === UserRole.ADMIN;

  const text = isAdmin
    ? "Привет! Ты админ семейного wishlist 🎁\n\nТы можешь открыть список подарков, добавить новый подарок и посмотреть, кто что забронировал."
    : "Привет! Это семейный wishlist подарков 🎁\n\nЗдесь можно посмотреть список подарков и забронировать тот, который ты хочешь подарить.";

  await ctx.reply(text, mainKeyboard(isAdmin));
});

bot.command("reservations", async (ctx) => {
  if (!ctx.from) {
    return;
  }
  const user = await syncUser(ctx.from);
  if (user.role !== UserRole.ADMIN) {
    await ctx.reply("У тебя нет доступа к этому действию.");
    return;
  }
  const message = await reservationsMessage();
  await ctx.reply(message, adminReservationKeyboard);
});

bot.action("admin_reservations", async (ctx) => {
  if (!ctx.from) {
    return;
  }

  const user = await syncUser(ctx.from);
  if (user.role !== UserRole.ADMIN) {
    await ctx.answerCbQuery("У тебя нет доступа к этому действию.");
    return;
  }

  const message = await reservationsMessage();
  await ctx.answerCbQuery();
  try {
    await ctx.editMessageText(message, adminReservationKeyboard);
  } catch {
    await ctx.reply(message, adminReservationKeyboard);
  }
});

bot.catch((error) => {
  console.error("Bot error:", error);
});

bot
  .launch()
  .then(() => {
    console.log("Bot started");
  })
  .catch((error) => {
    console.error("Failed to launch bot:", error);
    process.exit(1);
  });

const stop = async () => {
  bot.stop("SIGTERM");
  await prisma.$disconnect();
};

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
