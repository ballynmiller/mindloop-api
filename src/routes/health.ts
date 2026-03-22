import { FastifyPluginAsync } from "fastify";

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (request, reply) => {
    return reply.status(200).send({ status: "ok" });
  });
};

export default healthRoutes;
