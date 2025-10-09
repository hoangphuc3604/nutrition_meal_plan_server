const enum ErrorCodes {
  NotFound = 404,
  InternalServerError = 500,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  Conflict = 409,
  Invalid = 422,
}

export const enum ReasonStatus {
  NotFound = "Not Found",
  InternalServerError = "Internal Server Error",
  BadRequest = "Bad Request",
  Unauthorized = "Unauthorized",
  Forbidden = "Forbidden",
  Conflict = "Conflict",
  Invalid = "Invalid",
}

class ErrorResponse extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ConflictError extends ErrorResponse {
  constructor(message: ReasonStatus.Conflict = ReasonStatus.Conflict, details?: any) {
    super(message, ErrorCodes.Conflict, details);
  }
}

export class BadRequestError extends ErrorResponse {
  constructor(message: string = ReasonStatus.BadRequest, details?: any) {
    super(message, ErrorCodes.BadRequest, details);
  }
}

export class UnauthorizedError extends ErrorResponse {
  constructor(message: string = ReasonStatus.Unauthorized, details?: any) {
    super(message, ErrorCodes.Unauthorized, details);
  }
}

export class InvalidError extends ErrorResponse {
  constructor(message: string = ReasonStatus.Invalid, details?: any) {
    super(message, ErrorCodes.Invalid, details);
  }
}

export class NotFoundError extends ErrorResponse {
  constructor(message: string = ReasonStatus.NotFound, details?: any) {
    super(message, ErrorCodes.NotFound, details);
  }
}

export class InternalServerError extends ErrorResponse {
  constructor(message: string = ReasonStatus.InternalServerError, details?: any) {
    super(message, ErrorCodes.InternalServerError, details);
  }
}
