/**
 * Authentication request and response schemas
 */

// Shared schema IDs for reuse
export const schemas = {
  user: "user",
  error: "error",
} as const;

// Request Body Schemas
export const registerBodySchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: {
      type: "string",
      format: "email",
    },
    password: {
      type: "string",
      minLength: 8,
    },
    firstName: {
      type: "string",
    },
    lastName: {
      type: "string",
    },
    displayName: {
      type: "string",
    },
  },
} as const;

export const loginBodySchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: {
      type: "string",
      format: "email",
    },
    password: {
      type: "string",
    },
  },
} as const;

// Response Schemas
export const userSchema = {
  $id: schemas.user,
  type: "object",
  properties: {
    id: { type: "string" },
    email: { type: "string" },
    firstName: { type: "string" },
    lastName: { type: "string" },
    displayName: { type: "string" },
    createdAt: { type: "string" },
  },
} as const;

export const authSuccessResponseSchema = {
  type: "object",
  properties: {
    user: { $ref: `${schemas.user}#` },
    accessToken: { type: "string" },
    refreshToken: { type: "string" },
  },
} as const;

export const errorResponseSchema = {
  $id: schemas.error,
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
  },
} as const;

// Complete Route Schemas
export const registerSchema = {
  body: registerBodySchema,
  response: {
    201: authSuccessResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

export const loginSchema = {
  body: loginBodySchema,
  response: {
    200: authSuccessResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;
