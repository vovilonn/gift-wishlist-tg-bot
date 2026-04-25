import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanFromEnv = z.preprocess((value) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  BOT_USERNAME: z.string().optional(),
  WEB_APP_URL: z.string().url().default("http://localhost:8080"),
  ADMIN_TELEGRAM_IDS: z.string().default(""),
  JWT_SECRET: z.string().min(16).default("change-this-jwt-secret-in-production"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  TELEGRAM_INITDATA_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24),
  ENABLE_DEMO_AUTH: booleanFromEnv.default(false),
  DEMO_AUTH_KEY: z.string().optional(),
  IMAGE_PROXY_MAX_BYTES: z.coerce.number().int().positive().default(8 * 1024 * 1024)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export const env = parsed.data;

export const adminTelegramIds = new Set(
  env.ADMIN_TELEGRAM_IDS.split(",")
    .map((id) => id.trim())
    .filter(Boolean)
);

export const isAdminTelegramId = (telegramId: string): boolean => adminTelegramIds.has(telegramId);
