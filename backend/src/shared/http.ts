import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodSchema, z } from "zod";

import { badRequest } from "./errors";

export const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<void> | void): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

export const parseBody = <T>(schema: ZodSchema<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR");
  }
  return parsed.data;
};

export const parseQuery = <T>(schema: ZodSchema<T>, value: unknown): T => parseBody(schema, value);

export type ParsedInput<T extends ZodSchema> = z.infer<T>;
