import { FastifyPluginAsync } from "fastify";
import {
  normalizeEmail,
  hashPassword,
  verifyPasswordResult,
  hashToken,
  generateTokens,
  getRefreshTokenExpiry,
  verifyRefreshToken,
} from "../utils/auth.js";
import { registerSchema, loginSchema, refreshSchema } from "../schemas/auth.js";
import { createAuthSuccessResponse, createErrorResponse, USER_SELECT } from "../utils/response.js";
import { ConflictError, AuthenticationError } from "../utils/errors.js";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{
    Body: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
    };
  }>(
    "/register",
    { schema: registerSchema },
    async (request, reply) => {
      const { email, password, firstName, lastName, displayName } = request.body;
      const normalizedEmail = normalizeEmail(email);

      const existingUser = await fastify.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingUser) {
        throw new ConflictError("An account with this email already exists");
      }

      const passwordHash = await hashPassword(password);

      const result = await fastify.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: normalizedEmail,
            firstName: firstName?.trim() || null,
            lastName: lastName?.trim() || null,
            displayName: displayName || null,
          },
          select: USER_SELECT,
        });

        await tx.authIdentity.create({
          data: {
            userId: user.id,
            provider: "EMAIL",
            providerUserId: normalizedEmail,
            passwordHash,
          },
        });

        return user;
      });

      const { accessToken, refreshToken } = generateTokens(result.id);
      const refreshTokenHash = hashToken(refreshToken);
      const expiresAt = getRefreshTokenExpiry();

      await fastify.prisma.session.create({
        data: { userId: result.id, refreshTokenHash, expiresAt },
      });

      return reply.status(201).send(createAuthSuccessResponse(result, accessToken, refreshToken));
    }
  );

  fastify.post<{
    Body: {
      email: string;
      password: string;
    };
  }>(
    "/login",
    { schema: loginSchema },
    async (request, reply) => {
      const { email, password } = request.body;
      const normalizedEmail = normalizeEmail(email);

      const user = await fastify.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: USER_SELECT,
      });
      if (!user) {
        throw new AuthenticationError("Invalid email or password");
      }

      const authIdentity = await fastify.prisma.authIdentity.findUnique({
        where: {
          provider_providerUserId: {
            provider: "EMAIL",
            providerUserId: normalizedEmail,
          },
        },
      });
      if (!authIdentity || !authIdentity.passwordHash) {
        throw new AuthenticationError("Invalid email or password");
      }

      const { ok: isValidPassword, needsRehash } = await verifyPasswordResult(
        password,
        authIdentity.passwordHash,
      );
      if (!isValidPassword) {
        throw new AuthenticationError("Invalid email or password");
      }

      if (needsRehash) {
        await fastify.prisma.authIdentity.update({
          where: { id: authIdentity.id },
          data: { passwordHash: await hashPassword(password) },
        });
      }

      const { accessToken, refreshToken } = generateTokens(user.id);
      const refreshTokenHash = hashToken(refreshToken);
      const expiresAt = getRefreshTokenExpiry();

      await fastify.prisma.session.create({
        data: { userId: user.id, refreshTokenHash, expiresAt },
      });

      return reply.status(200).send(createAuthSuccessResponse(user, accessToken, refreshToken));
    }
  );

  fastify.post<{ Body: { refreshToken: string } }>(
    "/refresh",
    { schema: refreshSchema },
    async (request, reply) => {
      const raw = request.body.refreshToken?.trim();
      if (!raw) {
        return reply.status(400).send(createErrorResponse("Validation Error", "refreshToken is required"));
      }

      const verified = verifyRefreshToken(raw);
      if (!verified) {
        return reply.status(401).send(createErrorResponse("Authentication Error", "Invalid or expired refresh token"));
      }

      const refreshTokenHash = hashToken(raw);
      const session = await fastify.prisma.session.findUnique({
        where: { refreshTokenHash },
        include: { user: { select: USER_SELECT } },
      });

      if (!session || session.revokedAt != null || session.expiresAt < new Date()) {
        return reply.status(401).send(createErrorResponse("Authentication Error", "Invalid or expired refresh token"));
      }
      if (session.userId !== verified.userId) {
        return reply.status(401).send(createErrorResponse("Authentication Error", "Invalid or expired refresh token"));
      }

      const { accessToken, refreshToken } = generateTokens(session.userId);
      const newRefreshHash = hashToken(refreshToken);
      const expiresAt = getRefreshTokenExpiry();

      await fastify.prisma.$transaction(async (tx) => {
        await tx.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
        await tx.session.create({
          data: { userId: session.userId, refreshTokenHash: newRefreshHash, expiresAt },
        });
      });

      return reply.status(200).send(createAuthSuccessResponse(session.user, accessToken, refreshToken));
    }
  );
};

export default authRoutes;
