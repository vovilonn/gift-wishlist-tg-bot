export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, message: string, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const badRequest = (message: string, code = "VALIDATION_ERROR"): ApiError =>
  new ApiError(400, message, code);
export const unauthorized = (message = "Unauthorized", code = "UNAUTHORIZED"): ApiError =>
  new ApiError(401, message, code);
export const forbidden = (message = "Forbidden", code = "FORBIDDEN"): ApiError =>
  new ApiError(403, message, code);
export const notFound = (message = "Not Found", code = "NOT_FOUND"): ApiError =>
  new ApiError(404, message, code);
export const conflict = (message: string, code: string): ApiError => new ApiError(409, message, code);
