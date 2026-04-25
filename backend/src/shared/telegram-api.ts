import { env } from "./env";

type TelegramReplyMarkup = {
  inline_keyboard?: Array<Array<Record<string, unknown>>>;
};

const telegramApiUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

export const sendTelegramMessage = async (
  chatId: string | number,
  text: string,
  replyMarkup?: TelegramReplyMarkup
): Promise<void> => {
  const response = await fetch(`${telegramApiUrl}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {})
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API sendMessage failed: ${response.status} ${body}`);
  }
};
