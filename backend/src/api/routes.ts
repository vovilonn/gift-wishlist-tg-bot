import { lookup } from "node:dns/promises";
import * as net from "node:net";
import type { Express, NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { GiftPriority, GiftStatus, Prisma, ReservationAction, UserRole } from "@prisma/client";
import { ZodError, z } from "zod";

import { adminOnlyMiddleware, authMiddleware, createAuthToken } from "../shared/auth";
import { env } from "../shared/env";
import { ApiError, badRequest, conflict, forbidden, notFound } from "../shared/errors";
import { giftResponse, giftWithUserInclude, userVisibleStatuses } from "../shared/gift-service";
import { asyncHandler } from "../shared/http";
import { notifyAdminsAboutCancellation, notifyAdminsAboutReservation, notifyUserMessage } from "../shared/notifications";
import { prisma } from "../shared/prisma";
import { verifyTelegramInitData } from "../shared/telegram-init-data";
import { upsertUserFromTelegramProfile, userResponse } from "../shared/user-service";

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

const reserveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request) => request.user?.id ?? request.ip ?? "unknown"
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request) => request.user?.id ?? request.ip ?? "unknown"
});

const authSchema = z.object({
  initData: z.string().min(1)
});

const demoAuthSchema = z.object({
  role: z.nativeEnum(UserRole).default(UserRole.USER),
  key: z.string().optional(),
  firstName: z.string().trim().min(1).max(40).optional()
});

const imageProxySchema = z.object({
  url: z.string().url()
});

const giftFilterSchema = z.object({
  status: z.nativeEnum(GiftStatus).optional(),
  onlyMine: z
    .preprocess((value) => (value === "true" ? true : value === "false" ? false : value), z.boolean().optional())
    .default(false),
  search: z.string().trim().max(120).optional(),
  sort: z
    .enum(["createdAt_desc", "createdAt_asc", "price_asc", "price_desc", "priority_desc"])
    .optional()
    .default("createdAt_desc")
});

const giftCreateSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  linkUrl: z.string().url().optional().nullable(),
  price: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((value) => (value === null || value === undefined ? null : String(value))),
  currency: z.string().trim().max(10).optional().nullable(),
  priority: z.nativeEnum(GiftPriority).optional().nullable()
});

const giftUpdateSchema = giftCreateSchema
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, "At least one field is required");

const normalizeTextField = (value: string | null | undefined): string | null | undefined =>
  value === undefined ? undefined : value || null;

const toPrismaDecimal = (value: string | number | null | undefined): Prisma.Decimal | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  return new Prisma.Decimal(String(value));
};

const ensureGiftVisibleToUser = <T extends { status: GiftStatus }>(gift: T | null, userRole: UserRole): T => {
  if (!gift) {
    throw notFound("Gift is not found", "GIFT_NOT_FOUND");
  }
  if (userRole !== UserRole.ADMIN && (gift.status === GiftStatus.HIDDEN || gift.status === GiftStatus.ARCHIVED)) {
    throw notFound("Gift is not found", "GIFT_NOT_FOUND");
  }
  return gift;
};

const giftsOrderBy = (sort?: z.infer<typeof giftFilterSchema>["sort"]): Prisma.GiftOrderByWithRelationInput[] => {
  switch (sort) {
    case "createdAt_asc":
      return [{ createdAt: "asc" }];
    case "price_asc":
      return [{ price: "asc" }, { createdAt: "desc" }];
    case "price_desc":
      return [{ price: "desc" }, { createdAt: "desc" }];
    case "priority_desc":
      return [{ priority: "desc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
};

const getIdParam = (request: Request): string => {
  const id = request.params.id;
  if (typeof id === "string" && id.length > 0) {
    return id;
  }
  if (Array.isArray(id) && id.length > 0) {
    return id[0];
  }
  throw badRequest("Invalid id parameter", "VALIDATION_ERROR");
};

const isPrivateIPv4 = (ip: string): boolean => {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
};

const isPrivateIPv6 = (ip: string): boolean =>
  ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80");

const isPrivateAddress = (ip: string): boolean => {
  const ipVersion = net.isIP(ip);
  if (ipVersion === 4) {
    return isPrivateIPv4(ip);
  }
  if (ipVersion === 6) {
    return isPrivateIPv6(ip.toLowerCase());
  }
  return false;
};

const ensurePublicImageUrl = async (rawUrl: string): Promise<URL> => {
  const targetUrl = new URL(rawUrl);
  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    throw badRequest("Only http/https image URLs are allowed", "IMAGE_INVALID_URL");
  }

  const hostname = targetUrl.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "0.0.0.0"
  ) {
    throw forbidden("This image host is not allowed", "IMAGE_HOST_FORBIDDEN");
  }

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw forbidden("This image host is not allowed", "IMAGE_HOST_FORBIDDEN");
    }
    return targetUrl;
  }

  const resolved = await lookup(hostname, { all: true, verbatim: true }).catch(() => null);
  if (!resolved || !resolved.length || resolved.some((address) => isPrivateAddress(address.address))) {
    throw forbidden("This image host is not allowed", "IMAGE_HOST_FORBIDDEN");
  }

  return targetUrl;
};

export const registerRoutes = (app: Express): void => {
  app.get(
    "/health",
    asyncHandler(async (_request, response) => {
      response.json({
        status: "ok"
      });
    })
  );

  app.get(
    "/assets/image",
    asyncHandler(async (request, response) => {
      const { url } = imageProxySchema.parse(request.query);
      const targetUrl = await ensurePublicImageUrl(url);
      const upstream = await fetch(targetUrl.toString(), {
        signal: AbortSignal.timeout(8_000),
        redirect: "follow",
        headers: {
          "user-agent": "GiftWishlistBot/1.0 (+image-proxy)"
        }
      }).catch(() => null);

      if (!upstream || !upstream.ok) {
        throw notFound("Image is not available", "IMAGE_NOT_FOUND");
      }

      const contentType = upstream.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().startsWith("image/")) {
        throw badRequest("Provided URL is not an image", "IMAGE_INVALID_TYPE");
      }

      const data = Buffer.from(await upstream.arrayBuffer());
      if (data.byteLength > env.IMAGE_PROXY_MAX_BYTES) {
        throw badRequest("Image is too large", "IMAGE_TOO_LARGE");
      }

      response.setHeader("content-type", contentType);
      response.setHeader("cache-control", "public, max-age=3600");
      response.send(data);
    })
  );

  app.post(
    "/auth/demo",
    authLimiter,
    asyncHandler(async (request, response) => {
      if (!env.ENABLE_DEMO_AUTH) {
        throw forbidden("Demo auth is disabled", "DEMO_AUTH_DISABLED");
      }

      const body = demoAuthSchema.parse(request.body);
      if (env.DEMO_AUTH_KEY && body.key !== env.DEMO_AUTH_KEY) {
        throw forbidden("Invalid demo auth key", "DEMO_AUTH_FORBIDDEN");
      }

      const role = body.role;
      const telegramId = `demo-${role.toLowerCase()}`;

      const user = await prisma.user.upsert({
        where: { telegramId },
        update: {
          role,
          firstName: body.firstName ?? "Demo",
          lastSeenAt: new Date()
        },
        create: {
          telegramId,
          username: `demo_${role.toLowerCase()}`,
          firstName: body.firstName ?? "Demo",
          role,
          lastSeenAt: new Date()
        }
      });

      response.json({
        user: userResponse(user),
        token: createAuthToken(user)
      });
    })
  );

  app.post(
    "/auth/telegram-webapp",
    authLimiter,
    asyncHandler(async (request, response) => {
      const body = authSchema.parse(request.body);
      const verified = verifyTelegramInitData(body.initData, env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_INITDATA_MAX_AGE_SECONDS);
      const user = await upsertUserFromTelegramProfile(verified.user);

      response.json({
        user: userResponse(user),
        token: createAuthToken(user)
      });
    })
  );

  app.get(
    "/me",
    authMiddleware,
    asyncHandler(async (request, response) => {
      response.json(userResponse(request.user!));
    })
  );

  app.get(
    "/gifts",
    authMiddleware,
    asyncHandler(async (request, response) => {
      const currentUser = request.user!;
      const query = giftFilterSchema.parse(request.query);
      const whereConditions: Prisma.GiftWhereInput[] = [];

      if (query.search) {
        whereConditions.push({
          OR: [
            { title: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } }
          ]
        });
      }

      if (query.onlyMine) {
        whereConditions.push({ reservedByUserId: currentUser.id });
        if (!query.status) {
          whereConditions.push({ status: { in: [GiftStatus.RESERVED, GiftStatus.PURCHASED] } });
        }
      }

      if (query.status) {
        if (currentUser.role !== UserRole.ADMIN && !userVisibleStatuses.includes(query.status)) {
          throw forbidden("У тебя нет доступа к этому действию.", "FORBIDDEN");
        }
        whereConditions.push({ status: query.status });
      } else if (currentUser.role !== UserRole.ADMIN) {
        whereConditions.push({ status: { in: userVisibleStatuses } });
      } else {
        whereConditions.push({ status: { not: GiftStatus.ARCHIVED } });
      }

      const gifts = await prisma.gift.findMany({
        where: whereConditions.length ? { AND: whereConditions } : undefined,
        include: giftWithUserInclude,
        orderBy: giftsOrderBy(query.sort)
      });

      response.json(
        gifts.map((gift) => giftResponse(gift, currentUser.id, currentUser.role))
      );
    })
  );

  app.get(
    "/gifts/:id",
    authMiddleware,
    asyncHandler(async (request, response) => {
      const giftId = getIdParam(request);
      const gift = await prisma.gift.findUnique({
        where: { id: giftId },
        include: giftWithUserInclude
      });
      const visibleGift = ensureGiftVisibleToUser(gift, request.user!.role);

      response.json(giftResponse(visibleGift, request.user!.id, request.user!.role));
    })
  );

  app.post(
    "/gifts/:id/reserve",
    authMiddleware,
    reserveLimiter,
    asyncHandler(async (request, response) => {
      const currentUser = request.user!;
      const giftId = getIdParam(request);
      const reservedAt = new Date();

      const updateResult = await prisma.gift.updateMany({
        where: {
          id: giftId,
          status: GiftStatus.ACTIVE,
          reservedByUserId: null
        },
        data: {
          status: GiftStatus.RESERVED,
          reservedByUserId: currentUser.id,
          reservedAt
        }
      });

      if (updateResult.count === 0) {
        const currentGift = await prisma.gift.findUnique({ where: { id: giftId } });
        ensureGiftVisibleToUser(currentGift, currentUser.role);
        throw conflict("Этот подарок уже успели забронировать.", "GIFT_ALREADY_RESERVED");
      }

      await prisma.reservationHistory.create({
        data: {
          giftId,
          userId: currentUser.id,
          action: ReservationAction.RESERVED
        }
      });

      const gift = await prisma.gift.findUnique({
        where: { id: giftId },
        include: giftWithUserInclude
      });

      if (!gift) {
        throw notFound("Gift is not found", "GIFT_NOT_FOUND");
      }

      await Promise.all([
        notifyAdminsAboutReservation({
          giftId,
          giftTitle: gift.title,
          user: currentUser,
          reservedAt
        }),
        notifyUserMessage(currentUser.telegramId, `Ты забронировал подарок: ${gift.title} 🎁`)
      ]);

      response.json(giftResponse(gift, currentUser.id, currentUser.role));
    })
  );

  app.post(
    "/gifts/:id/cancel-reservation",
    authMiddleware,
    reserveLimiter,
    asyncHandler(async (request, response) => {
      const currentUser = request.user!;
      const giftId = getIdParam(request);
      const gift = await prisma.gift.findUnique({
        where: { id: giftId },
        include: giftWithUserInclude
      });
      const visibleGift = ensureGiftVisibleToUser(gift, currentUser.role);

      if (visibleGift.status !== GiftStatus.RESERVED || !visibleGift.reservedByUserId) {
        throw conflict("Gift is not reserved", "GIFT_NOT_AVAILABLE");
      }

      if (visibleGift.reservedByUserId !== currentUser.id) {
        throw forbidden("Ты не можешь отменить чужую бронь.", "GIFT_NOT_RESERVED_BY_YOU");
      }

      const cancelledAt = new Date();

      const updatedGift = await prisma.gift.update({
        where: { id: giftId },
        data: {
          status: GiftStatus.ACTIVE,
          reservedByUserId: null,
          reservedAt: null
        },
        include: giftWithUserInclude
      });

      await prisma.reservationHistory.create({
        data: {
          giftId,
          userId: currentUser.id,
          action: ReservationAction.CANCELLED_BY_USER
        }
      });

      await Promise.all([
        notifyAdminsAboutCancellation({
          giftId,
          giftTitle: visibleGift.title,
          user: currentUser,
          cancelledAt
        }),
        notifyUserMessage(currentUser.telegramId, `Ты отменил бронь подарка: ${visibleGift.title}`)
      ]);

      response.json(giftResponse(updatedGift, currentUser.id, currentUser.role));
    })
  );

  app.post(
    "/admin/gifts",
    authMiddleware,
    adminOnlyMiddleware,
    adminLimiter,
    asyncHandler(async (request, response) => {
      const currentUser = request.user!;
      const body = giftCreateSchema.parse(request.body);

      const gift = await prisma.gift.create({
        data: {
          title: body.title,
          description: normalizeTextField(body.description),
          imageUrl: normalizeTextField(body.imageUrl),
          linkUrl: normalizeTextField(body.linkUrl),
          price: toPrismaDecimal(body.price),
          currency: normalizeTextField(body.currency),
          priority: body.priority ?? null,
          status: GiftStatus.ACTIVE,
          createdByUserId: currentUser.id
        },
        include: giftWithUserInclude
      });

      response.status(201).json(giftResponse(gift, currentUser.id, currentUser.role));
    })
  );

  app.patch(
    "/admin/gifts/:id",
    authMiddleware,
    adminOnlyMiddleware,
    adminLimiter,
    asyncHandler(async (request, response) => {
      const currentUser = request.user!;
      const body = giftUpdateSchema.parse(request.body);
      const giftId = getIdParam(request);

      const exists = await prisma.gift.findUnique({ where: { id: giftId }, select: { id: true } });
      if (!exists) {
        throw notFound("Gift is not found", "GIFT_NOT_FOUND");
      }

      const data: Prisma.GiftUpdateInput = {};
      if ("title" in body) data.title = body.title;
      if ("description" in body) data.description = normalizeTextField(body.description);
      if ("imageUrl" in body) data.imageUrl = normalizeTextField(body.imageUrl);
      if ("linkUrl" in body) data.linkUrl = normalizeTextField(body.linkUrl);
      if ("price" in body) data.price = toPrismaDecimal(body.price);
      if ("currency" in body) data.currency = normalizeTextField(body.currency);
      if ("priority" in body) data.priority = body.priority ?? null;

      const gift = await prisma.gift.update({
        where: { id: giftId },
        data,
        include: giftWithUserInclude
      });

      response.json(giftResponse(gift, currentUser.id, currentUser.role));
    })
  );

  app.post(
    "/admin/gifts/:id/release-reservation",
    authMiddleware,
    adminOnlyMiddleware,
    adminLimiter,
    asyncHandler(async (request, response) => {
      const currentUser = request.user!;
      const giftId = getIdParam(request);
      const gift = await prisma.gift.findUnique({ where: { id: giftId }, include: giftWithUserInclude });
      if (!gift) {
        throw notFound("Gift is not found", "GIFT_NOT_FOUND");
      }
      if (gift.status !== GiftStatus.RESERVED) {
        throw conflict("Gift is not reserved", "GIFT_NOT_AVAILABLE");
      }

      const updatedGift = await prisma.gift.update({
        where: { id: gift.id },
        data: {
          status: GiftStatus.ACTIVE,
          reservedByUserId: null,
          reservedAt: null
        },
        include: giftWithUserInclude
      });

      await prisma.reservationHistory.create({
        data: {
          giftId: gift.id,
          userId: currentUser.id,
          action: ReservationAction.RELEASED_BY_ADMIN
        }
      });

      response.json(giftResponse(updatedGift, currentUser.id, currentUser.role));
    })
  );

  app.post(
    "/admin/gifts/:id/mark-purchased",
    authMiddleware,
    adminOnlyMiddleware,
    adminLimiter,
    asyncHandler(async (request, response) => {
      const currentUser = request.user!;
      const giftId = getIdParam(request);
      const gift = await prisma.gift.findUnique({ where: { id: giftId }, include: giftWithUserInclude });
      if (!gift) {
        throw notFound("Gift is not found", "GIFT_NOT_FOUND");
      }
      if (gift.status !== GiftStatus.ACTIVE && gift.status !== GiftStatus.RESERVED) {
        throw conflict("Gift cannot be marked as purchased", "GIFT_NOT_AVAILABLE");
      }

      const updatedGift = await prisma.gift.update({
        where: { id: gift.id },
        data: {
          status: GiftStatus.PURCHASED
        },
        include: giftWithUserInclude
      });

      await prisma.reservationHistory.create({
        data: {
          giftId: gift.id,
          userId: currentUser.id,
          action: ReservationAction.MARKED_PURCHASED
        }
      });

      response.json(giftResponse(updatedGift, currentUser.id, currentUser.role));
    })
  );

  app.post(
    "/admin/gifts/:id/mark-active",
    authMiddleware,
    adminOnlyMiddleware,
    adminLimiter,
    asyncHandler(async (request, response) => {
      const currentUser = request.user!;
      const giftId = getIdParam(request);
      const gift = await prisma.gift.findUnique({ where: { id: giftId }, include: giftWithUserInclude });
      if (!gift) {
        throw notFound("Gift is not found", "GIFT_NOT_FOUND");
      }
      if (gift.status === GiftStatus.ACTIVE) {
        throw conflict("Gift is already active", "GIFT_NOT_AVAILABLE");
      }

      const updatedGift = await prisma.gift.update({
        where: { id: gift.id },
        data: {
          status: GiftStatus.ACTIVE,
          reservedByUserId: null,
          reservedAt: null
        },
        include: giftWithUserInclude
      });

      await prisma.reservationHistory.create({
        data: {
          giftId: gift.id,
          userId: currentUser.id,
          action: ReservationAction.MARKED_ACTIVE
        }
      });

      response.json(giftResponse(updatedGift, currentUser.id, currentUser.role));
    })
  );

  app.post(
    "/admin/gifts/:id/hide",
    authMiddleware,
    adminOnlyMiddleware,
    adminLimiter,
    asyncHandler(async (request, response) => {
      const currentUser = request.user!;
      const giftId = getIdParam(request);
      const gift = await prisma.gift.findUnique({ where: { id: giftId }, include: giftWithUserInclude });
      if (!gift) {
        throw notFound("Gift is not found", "GIFT_NOT_FOUND");
      }
      if (gift.status !== GiftStatus.ACTIVE) {
        throw conflict("Скрывать можно только активный подарок", "GIFT_NOT_AVAILABLE");
      }

      const updatedGift = await prisma.gift.update({
        where: { id: gift.id },
        data: {
          status: GiftStatus.HIDDEN
        },
        include: giftWithUserInclude
      });

      response.json(giftResponse(updatedGift, currentUser.id, currentUser.role));
    })
  );

  app.post(
    "/admin/gifts/:id/archive",
    authMiddleware,
    adminOnlyMiddleware,
    adminLimiter,
    asyncHandler(async (request, response) => {
      const currentUser = request.user!;
      const giftId = getIdParam(request);
      const gift = await prisma.gift.findUnique({ where: { id: giftId }, include: giftWithUserInclude });
      if (!gift) {
        throw notFound("Gift is not found", "GIFT_NOT_FOUND");
      }
      if (gift.status === GiftStatus.ARCHIVED) {
        throw conflict("Gift is already archived", "GIFT_NOT_AVAILABLE");
      }

      const updatedGift = await prisma.gift.update({
        where: { id: gift.id },
        data: {
          status: GiftStatus.ARCHIVED
        },
        include: giftWithUserInclude
      });

      response.json(giftResponse(updatedGift, currentUser.id, currentUser.role));
    })
  );

  app.post(
    "/admin/gifts/:id/restore",
    authMiddleware,
    adminOnlyMiddleware,
    adminLimiter,
    asyncHandler(async (request, response) => {
      const currentUser = request.user!;
      const giftId = getIdParam(request);
      const gift = await prisma.gift.findUnique({ where: { id: giftId }, include: giftWithUserInclude });
      if (!gift) {
        throw notFound("Gift is not found", "GIFT_NOT_FOUND");
      }
      if (gift.status !== GiftStatus.ARCHIVED) {
        throw conflict("Gift is not archived", "GIFT_NOT_AVAILABLE");
      }

      const updatedGift = await prisma.gift.update({
        where: { id: gift.id },
        data: {
          status: GiftStatus.ACTIVE,
          reservedByUserId: null,
          reservedAt: null
        },
        include: giftWithUserInclude
      });

      response.json(giftResponse(updatedGift, currentUser.id, currentUser.role));
    })
  );

  app.get(
    "/admin/reservations",
    authMiddleware,
    adminOnlyMiddleware,
    asyncHandler(async (_request, response) => {
      const reservations = await prisma.gift.findMany({
        where: {
          status: GiftStatus.RESERVED
        },
        orderBy: {
          reservedAt: "asc"
        },
        include: giftWithUserInclude
      });

      response.json(
        reservations.map((gift) => ({
          gift: {
            id: gift.id,
            title: gift.title,
            imageUrl: gift.imageUrl
          },
          reservedBy: gift.reservedByUser,
          reservedAt: gift.reservedAt
        }))
      );
    })
  );
};

export const errorHandler = (error: unknown, _request: Request, response: Response, _next: NextFunction): void => {
  if (error instanceof ZodError) {
    response.status(400).json({
      statusCode: 400,
      message: error.issues.map((issue) => issue.message).join("; "),
      code: "VALIDATION_ERROR"
    });
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      statusCode: error.statusCode,
      message: error.message,
      code: error.code
    });
    return;
  }

  response.status(500).json({
    statusCode: 500,
    message: "Internal server error",
    code: "INTERNAL_SERVER_ERROR"
  });
};
