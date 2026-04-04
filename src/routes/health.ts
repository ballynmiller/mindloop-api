import { FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (_request, reply) => {
    return reply.status(200).send({ status: "ok" });
  });

  fastify.get("/health/ready", async (request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return reply.status(200).send({ status: "ok", database: true });
    } catch (error) {
      request.log.warn({ err: error }, "readiness check failed");
      return reply.status(503).send({ status: "error", database: false });
    }
  });
};

export default healthRoutes;
