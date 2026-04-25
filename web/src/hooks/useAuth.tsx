import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { authDemo, authTelegramWebApp } from "../lib/api";
import { applyTelegramTheme, getTelegramWebApp } from "../lib/telegram";
import type { User } from "../lib/types";

type AuthContextValue = {
  user: User;
  token: string;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthBootstrapState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; user: User; token: string };

export const useAuthBootstrap = (): AuthBootstrapState => {
  const [state, setState] = useState<AuthBootstrapState>({ status: "loading" });

  useEffect(() => {
    const bootstrap = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const demoRequested = queryParams.get("demo") === "1";
      const demoEnabled = import.meta.env.VITE_ENABLE_DEMO_AUTH === "true" || demoRequested;
      const demoRole = queryParams.get("role") === "admin" ? "ADMIN" : "USER";
      const webApp = getTelegramWebApp();
      const initData = webApp?.initData || import.meta.env.VITE_DEV_INIT_DATA;

      if (webApp) {
        applyTelegramTheme(webApp);
        webApp.ready();
        webApp.expand();
      }

      try {
        if (!initData) {
          if (!demoEnabled) {
            setState({
              status: "error",
              message: "Откройте приложение через Telegram-бота, чтобы продолжить."
            });
            return;
          }

          const auth = await authDemo({
            role: demoRole,
            key: import.meta.env.VITE_DEMO_AUTH_KEY
          });
          setState({
            status: "ready",
            user: auth.user,
            token: auth.token
          });
          return;
        }

        const auth = await authTelegramWebApp(initData);
        setState({
          status: "ready",
          user: auth.user,
          token: auth.token
        });
      } catch (error) {
        const fallbackMessage = "Не удалось выполнить авторизацию. Проверьте подключение и повторите попытку.";
        setState({
          status: "error",
          message: error instanceof Error ? error.message || fallbackMessage : fallbackMessage
        });
      }
    };

    void bootstrap();
  }, []);

  return state;
};

export const AuthProvider = ({
  initialUser,
  token,
  children
}: {
  initialUser: User;
  token: string;
  children: ReactNode;
}) => {
  const [user, setUser] = useState(initialUser);
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      setUser
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
