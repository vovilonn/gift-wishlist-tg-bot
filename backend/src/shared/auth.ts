import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { UserRole, type User } from "@prisma/client";

import { env } from "./env";
import { forbidden, unauthorized } from "./errors";
import { prisma } from "./prisma";

type AuthJwtPayload = {
  sub: string;
  telegramId: string;
  role: UserRole;
};

const getBearerToken = (authorization?: string): string | null => {
  if (!authorization) {
    return null;
  }
  const [type, token] = authorization.split(" ");
  if (type !== "Bearer" || !token) {
    return null;
  }
  return token;
};

export const createAuthToken = (user: User): string =>
  jwt.sign(
    {
      sub: user.id,
      telegramId: user.telegramId,
      role: user.role
    } as AuthJwtPayload,
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
  );

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = getBearerToken(req.header("authorization"));
    if (!token) {
      throw unauthorized();
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as AuthJwtPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      throw unauthorized();
    }

    req.user = user;
    next();
  } catch {
    next(unauthorized());
  }
};

export const adminOnlyMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    next(unauthorized());
    return;
  }
  if (req.user.role !== UserRole.ADMIN) {
    next(forbidden("У тебя нет доступа к этому действию.", "FORBIDDEN"));
    return;
  }
  next();
};
