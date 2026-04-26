export class AppError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, "Validation Error", message);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Invalid credentials") {
    super(401, "Authentication Error", message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "Conflict", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(404, "Not Found", message);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error") {
    super(500, "Internal Server Error", message, false);
  }
}
