import type { AdminReservation, ApiErrorPayload, Gift, GiftPriority, GiftStatus, User } from "./types";

const API_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.statusCode = payload.statusCode;
    this.code = payload.code;
  }
}

const buildUrl = (path: string, query?: Record<string, string | number | boolean | undefined>): string => {
  const base = `${API_URL}${path}`;
  if (!query) {
    return base;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  const queryString = params.toString();
  return queryString ? `${base}?${queryString}` : base;
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
  token?: string,
  query?: Record<string, string | number | boolean | undefined>
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {})
      }
    });
  } catch {
    throw new Error("Сервис временно недоступен. Проверьте подключение и повторите попытку.");
  }

  if (!response.ok) {
    const fallback: ApiErrorPayload = {
      statusCode: response.status,
      code: "UNKNOWN_ERROR",
      message: "Не удалось выполнить запрос."
    };

    let payload: ApiErrorPayload = fallback;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = fallback;
    }
    throw new ApiClientError(payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const authTelegramWebApp = (initData: string): Promise<{ user: User; token: string }> =>
  request("/auth/telegram-webapp", {
    method: "POST",
    body: JSON.stringify({ initData })
  });

export const authDemo = (payload: { role?: "USER" | "ADMIN"; key?: string; firstName?: string }): Promise<{ user: User; token: string }> =>
  request("/auth/demo", {
    method: "POST",
    body: JSON.stringify(payload)
  });

export const getMe = (token: string): Promise<User> => request("/me", {}, token);

export const getGifts = (
  token: string,
  query?: {
    status?: GiftStatus;
    onlyMine?: boolean;
    search?: string;
    sort?: "createdAt_desc" | "createdAt_asc" | "price_asc" | "price_desc" | "priority_desc";
  }
): Promise<Gift[]> => request("/gifts", {}, token, query);

export const getGiftById = (token: string, id: string): Promise<Gift> => request(`/gifts/${id}`, {}, token);

export const reserveGift = (token: string, id: string): Promise<Gift> =>
  request(`/gifts/${id}/reserve`, { method: "POST" }, token);

export const cancelGiftReservation = (token: string, id: string): Promise<Gift> =>
  request(`/gifts/${id}/cancel-reservation`, { method: "POST" }, token);

export const createGift = (
  token: string,
  payload: {
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    linkUrl?: string | null;
    price?: string | null;
    currency?: string | null;
    priority?: GiftPriority | null;
  }
): Promise<Gift> =>
  request(
    "/admin/gifts",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    token
  );

export const updateGift = (
  token: string,
  id: string,
  payload: Partial<{
    title: string;
    description: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    price: string | null;
    currency: string | null;
    priority: GiftPriority | null;
  }>
): Promise<Gift> =>
  request(
    `/admin/gifts/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload)
    },
    token
  );

export const adminAction = (
  token: string,
  giftId: string,
  action:
    | "release-reservation"
    | "mark-purchased"
    | "mark-active"
    | "hide"
    | "archive"
    | "restore"
): Promise<Gift> =>
  request(
    `/admin/gifts/${giftId}/${action}`,
    {
      method: "POST"
    },
    token
  );

export const getAdminReservations = (token: string): Promise<AdminReservation[]> =>
  request("/admin/reservations", {}, token);
