import "dotenv/config";
import Fastify, { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";
import healthRoutes from "./routes/health.js";
import { userSchema, errorResponseSchema } from "./schemas/auth.js";
import { AppError, InternalServerError } from "./utils/errors.js";
import { createErrorResponse } from "./utils/response.js";

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");
const enablePrettyLogs = !isProduction && process.env.PRETTY_LOGS !== "0";

const fastify = Fastify({
  logger: enablePrettyLogs
    ? {
        level: logLevel,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {
        level: logLevel,
      },
});

fastify.addSchema(userSchema);
fastify.addSchema(errorResponseSchema);

fastify.setErrorHandler(
  (error: FastifyError | AppError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error(error);

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(createErrorResponse(error.error, error.message));
    }

    // P2002: unique constraint, P2025: record not found, P2003: FK violation, P2014: required relation
    if (error.code === "P2002") {
      const target = (error as any).meta?.target;
      const field = Array.isArray(target) ? target.join(", ") : "field";
      return reply
        .status(409)
        .send(createErrorResponse("Conflict", `A record with this ${field} already exists`));
    }
    if (error.code === "P2025") {
      return reply.status(404).send(createErrorResponse("Not Found", "The requested record was not found"));
    }
    if (error.code === "P2003") {
      return reply
        .status(400)
        .send(createErrorResponse("Invalid Reference", "Referenced record does not exist"));
    }
    if (error.code === "P2014") {
      return reply
        .status(400)
        .send(createErrorResponse("Invalid Relation", "The change would violate a required relation"));
    }

    if (error.validation) {
      return reply.status(400).send(
        createErrorResponse("Validation Error", error.message || "Invalid request data")
      );
    }

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return reply.status(401).send(createErrorResponse("Authentication Error", "Invalid or expired token"));
    }

    const internalError = new InternalServerError("An unexpected error occurred");
    return reply.status(500).send(createErrorResponse(internalError.error, internalError.message));
  }
);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

async function registerApplication(): Promise<void> {
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);

  // Registered on the root app so GET /api/tags always exists (Fastify 5 + prefixed plugins
  // has been unreliable for this route in production).
  fastify.get("/api/tags", async (_request, reply) => {
    const tags = await fastify.prisma.tag.findMany({
      where: { isActive: true, isPreference: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: { select: { id: true, name: true, slug: true, sortOrder: true } },
      },
    });
    return reply.send({ tags });
  });

  await fastify.register(authRoutes, { prefix: "/api/auth" });
  await fastify.register(apiRoutes, { prefix: "/api" });
  await fastify.register(healthRoutes);
}

async function start() {
  try {
    await registerApplication();
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

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

start();
