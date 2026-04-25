type TelegramThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
};

type TelegramWebApp = {
  initData: string;
  themeParams?: TelegramThemeParams;
  ready: () => void;
  expand: () => void;
};

type TelegramGlobal = {
  WebApp?: TelegramWebApp;
};

declare global {
  interface Window {
    Telegram?: TelegramGlobal;
  }
}

export const getTelegramWebApp = (): TelegramWebApp | null => window.Telegram?.WebApp ?? null;

export const applyTelegramTheme = (webApp: TelegramWebApp): void => {
  const root = document.documentElement;
  const theme = webApp.themeParams;

  if (!theme) {
    return;
  }

  if (theme.bg_color) root.style.setProperty("--tg-bg", theme.bg_color);
  if (theme.text_color) root.style.setProperty("--tg-text", theme.text_color);
  if (theme.secondary_bg_color) root.style.setProperty("--tg-surface", theme.secondary_bg_color);
  if (theme.hint_color) root.style.setProperty("--tg-muted", theme.hint_color);
  if (theme.button_color) root.style.setProperty("--tg-primary", theme.button_color);
  if (theme.button_text_color) root.style.setProperty("--tg-primary-text", theme.button_text_color);
};
