import crypto from "node:crypto";

import { badRequest, unauthorized } from "./errors";

export type TelegramInitDataUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

export type VerifiedTelegramInitData = {
  user: TelegramInitDataUser;
  authDate: number;
  queryId?: string;
};

const toDataCheckString = (params: URLSearchParams): string =>
  [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

const getSecretKey = (botToken: string): Buffer =>
  crypto.createHmac("sha256", "WebAppData").update(botToken).digest();

const buildHexHmac = (secret: Buffer, dataCheckString: string): string =>
  crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

export const verifyTelegramInitData = (
  initData: string,
  botToken: string,
  maxAgeSeconds: number
): VerifiedTelegramInitData => {
  if (!initData) {
    throw badRequest("initData is required", "TELEGRAM_INIT_DATA_INVALID");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw unauthorized("Invalid Telegram initData hash", "TELEGRAM_INIT_DATA_INVALID");
  }

  const dataCheckString = toDataCheckString(params);
  const secretKey = getSecretKey(botToken);
  const calculatedHash = buildHexHmac(secretKey, dataCheckString);

  const hashBuffer = Buffer.from(hash, "hex");
  const calculatedBuffer = Buffer.from(calculatedHash, "hex");

  if (hashBuffer.length !== calculatedBuffer.length || !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)) {
    throw unauthorized("Invalid Telegram initData signature", "TELEGRAM_INIT_DATA_INVALID");
  }

  const authDateRaw = params.get("auth_date");
  const authDate = Number(authDateRaw);

  if (!authDateRaw || Number.isNaN(authDate)) {
    throw unauthorized("Invalid Telegram auth_date", "TELEGRAM_INIT_DATA_INVALID");
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > maxAgeSeconds) {
    throw unauthorized("Telegram initData is expired", "TELEGRAM_INIT_DATA_INVALID");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw unauthorized("Telegram user is missing", "TELEGRAM_INIT_DATA_INVALID");
  }

  let user: TelegramInitDataUser;
  try {
    user = JSON.parse(userRaw) as TelegramInitDataUser;
  } catch {
    throw unauthorized("Invalid Telegram user payload", "TELEGRAM_INIT_DATA_INVALID");
  }

  if (!user.id) {
    throw unauthorized("Invalid Telegram user id", "TELEGRAM_INIT_DATA_INVALID");
  }

  return {
    user,
    authDate,
    queryId: params.get("query_id") ?? undefined
  };
};

export const buildSignedInitDataForTest = (
  payload: Record<string, string>,
  botToken: string
): string => {
  const params = new URLSearchParams(payload);
  const dataCheckString = toDataCheckString(params);
  const secretKey = getSecretKey(botToken);
  const hash = buildHexHmac(secretKey, dataCheckString);
  params.set("hash", hash);
  return params.toString();
};
