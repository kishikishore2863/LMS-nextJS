export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Sign in required") {
    super("unauthorized", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(reason = "forbidden") {
    super("forbidden", `Not allowed: ${reason}`, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(what = "Resource") {
    super("not_found", `${what} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("conflict", message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("validation", message, 400);
  }
}
