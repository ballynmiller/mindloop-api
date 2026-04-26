import fp from "fastify-plugin";
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { extractBearerUserId } from "../utils/auth.js";
import { AuthenticationError } from "../utils/errors.js";
import { USER_SELECT } from "../utils/response.js";

const AUTH_USER_SELECT = {
  ...USER_SELECT,
  timeZone: true,
} as const;

export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  isAdmin: boolean;
  timeZone: string;
  createdAt: Date;
  onboardingCompletedAt: Date | null;
};

declare module "fastify" {
  interface FastifyRequest {
    user: AuthenticatedUser | null;
  }
  interface FastifyInstance {
    requireUser: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest("user", null);

  fastify.decorate(
    "requireUser",
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const userId = extractBearerUserId(request.headers.authorization);
      if (!userId) throw new AuthenticationError("Missing or invalid token");

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: AUTH_USER_SELECT,
      });
      if (!user) throw new AuthenticationError("Missing or invalid token");

      request.user = user;
    },
  );
};

export default fp(authPlugin);
