import { FastifyPluginAsync } from "fastify";
import { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import fp from "fastify-plugin";
import { normalizePgConnectionString } from "../utils/pgConnectionString.js";

// Extend FastifyInstance to include prisma
declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/**
 * `pg` + `PrismaPg` need a direct PostgreSQL URL. `DATABASE_URL` is often
 * `prisma+postgres://...` (Accelerate), which the driver cannot use — connects
 * will stall or fail. Prefer `DIRECT_URL` (same pattern as `prisma/seed.ts`).
 */
function resolveDriverConnectionString(): string {
  const direct = process.env.DIRECT_URL?.trim();
  const database = process.env.DATABASE_URL?.trim();
  const raw = direct || database;
  if (!raw) {
    throw new Error("Missing DATABASE_URL (or DIRECT_URL for the pg driver when using Accelerate).");
  }
  if (!direct && database?.startsWith("prisma+")) {
    throw new Error(
      "DATABASE_URL uses Prisma Accelerate (prisma+postgres). Set DIRECT_URL to a postgres:// connection string for the server `pg` pool.",
    );
  }
  return normalizePgConnectionString(raw);
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const pool = new Pool({
    connectionString: resolveDriverConnectionString(),
    connectionTimeoutMillis: 30_000,
  });

  // Create Prisma adapter for PostgreSQL
  const adapter = new PrismaPg(pool);

  // Configure Prisma Client with best practices
  // Note: Connection pooling is handled by the pg Pool
  // For production, configure DATABASE_URL with connection pool parameters:
  // postgresql://user:password@host:port/database?connection_limit=10&pool_timeout=20
  const prisma = new PrismaClient({
    adapter,
    // Logging configuration based on environment
    log:
      process.env.NODE_ENV === "development"
        ? [
            { level: "query", emit: "event" },
            { level: "error", emit: "stdout" },
            { level: "warn", emit: "stdout" },
          ]
        : [{ level: "error", emit: "stdout" }],
    // Error formatting for better error messages
    errorFormat: process.env.NODE_ENV === "development" ? "pretty" : "minimal",
  });

  // Log queries in development (useful for debugging and optimization)
  if (process.env.NODE_ENV === "development") {
    prisma.$on("query" as never, (e: Prisma.QueryEvent) => {
      fastify.log.debug(
        {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        },
        "Prisma Query"
      );
    });
  }

  // Make Prisma Client available throughout the application
  fastify.decorate("prisma", prisma);

  // Test database connection on startup
  try {
    await prisma.$connect();
    fastify.log.info("Prisma Client connected successfully");
  } catch (error) {
    fastify.log.error(error, "Failed to connect to database");
    throw error;
  }

  // Gracefully disconnect Prisma and close pool on server shutdown
  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
    await pool.end();
    fastify.log.info("Prisma Client and connection pool disconnected");
  });
};

export default fp(prismaPlugin);
