import "dotenv/config";
import Fastify, { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import prismaPlugin from "./plugins/prisma.js";
import authRoutes from "./routes/auth.js";
import healthRoutes from "./routes/health.js";
import recommendationsRoutes from "./routes/recommendations.js";
import { userSchema, errorResponseSchema } from "./schemas/auth.js";
import { AppError, InternalServerError } from "./utils/errors.js";
import { createErrorResponse } from "./utils/response.js";

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  },
});

// Register shared schemas for reuse
fastify.addSchema(userSchema);
fastify.addSchema(errorResponseSchema);

// Register plugins
fastify.register(prismaPlugin);

// Register routes
fastify.register(authRoutes, { prefix: "/api/auth" });
fastify.register(recommendationsRoutes, { prefix: "/api" });
fastify.register(healthRoutes);

// Centralized error handler
fastify.setErrorHandler(
  (error: FastifyError | AppError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error(error);

    // Handle custom AppError instances
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(createErrorResponse(error.error, error.message));
    }

    // Handle Prisma errors
    // P2002: Unique constraint violation
    if (error.code === "P2002") {
      const target = (error as any).meta?.target;
      const field = Array.isArray(target) ? target.join(", ") : "field";
      return reply
        .status(409)
        .send(createErrorResponse("Conflict", `A record with this ${field} already exists`));
    }
    // P2025: Record not found
    if (error.code === "P2025") {
      return reply.status(404).send(createErrorResponse("Not Found", "The requested record was not found"));
    }
    // P2003: Foreign key constraint violation
    if (error.code === "P2003") {
      return reply
        .status(400)
        .send(createErrorResponse("Invalid Reference", "Referenced record does not exist"));
    }
    // P2014: Required relation violation
    if (error.code === "P2014") {
      return reply
        .status(400)
        .send(createErrorResponse("Invalid Relation", "The change would violate a required relation"));
    }

    // Handle Fastify validation errors
    if (error.validation) {
      return reply.status(400).send(
        createErrorResponse(
          "Validation Error",
          error.message || "Invalid request data"
        )
      );
    }

    // Handle JWT errors
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return reply.status(401).send(createErrorResponse("Authentication Error", "Invalid or expired token"));
    }

    // Default to 500 for unknown errors
    const internalError = new InternalServerError("An unexpected error occurred");
    return reply.status(500).send(createErrorResponse(internalError.error, internalError.message));
  }
);

// Environment variables
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

// Start server
async function start() {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  fastify.log.info(`${signal} received, shutting down gracefully...`);
  try {
    await fastify.close();
    process.exit(0);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Start the server
start();
