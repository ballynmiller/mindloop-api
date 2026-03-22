import { FastifyPluginAsync } from "fastify";
import {
  normalizeEmail,
  hashPassword,
  verifyPassword,
  hashToken,
  generateTokens,
  getRefreshTokenExpiry,
} from "../utils/auth.js";
import { registerSchema, loginSchema } from "../schemas/auth.js";
import {
  createAuthSuccessResponse,
  createErrorResponse,
} from "../utils/response.js";
import {
  ConflictError,
  AuthenticationError,
  InternalServerError,
} from "../utils/errors.js";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register endpoint
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

      // Check if user already exists
      const existingUser = await fastify.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        throw new ConflictError("An account with this email already exists");
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user and auth identity in a transaction
      // Using proper transaction type for better type safety
      const result = await fastify.prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: normalizedEmail,
            firstName: firstName?.trim() || null,
            lastName: lastName?.trim() || null,
            displayName: displayName || null,
          },
          // Only select fields we need (best practice: avoid overfetching)
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
            createdAt: true,
          },
        });

        // Create auth identity
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

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(result.id);
      const refreshTokenHash = hashToken(refreshToken);
      const expiresAt = getRefreshTokenExpiry();

      // Create session
      await fastify.prisma.session.create({
        data: {
          userId: result.id,
          refreshTokenHash,
          expiresAt,
        },
      });

      return reply.status(201).send(createAuthSuccessResponse(result, accessToken, refreshToken));
    }
  );

  // Login endpoint
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

      // Find user by email
      // Only select fields we need (best practice: avoid overfetching)
      const user = await fastify.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new AuthenticationError("Invalid email or password");
      }

      // Find auth identity
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

      // Verify password
      const isValidPassword = await verifyPassword(password, authIdentity.passwordHash);

      if (!isValidPassword) {
        throw new AuthenticationError("Invalid email or password");
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id);
      const refreshTokenHash = hashToken(refreshToken);
      const expiresAt = getRefreshTokenExpiry();

      // Create session
      await fastify.prisma.session.create({
        data: {
          userId: user.id,
          refreshTokenHash,
          expiresAt,
        },
      });

      return reply.status(200).send(createAuthSuccessResponse(user, accessToken, refreshToken));
    }
  );
};

export default authRoutes;
