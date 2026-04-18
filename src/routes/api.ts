import { FastifyPluginAsync } from "fastify";

import { getRecommendations, type GetRecommendationsBody } from "../recommendations/service.js";
import { postRecommendationsSchema } from "../schemas/recommendations.js";
import { verifyAccessToken } from "../utils/auth.js";
import { ValidationError } from "../utils/errors.js";
import { createErrorResponse, createUserResponse } from "../utils/response.js";

function bearerUserId(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  if (!match?.[1]) return null;
  const raw = match[1].trim();
  if (!raw) return null;
  const v = verifyAccessToken(raw);
  return v?.userId ?? null;
}

/**
 * `/api/me`, `/api/me/onboarding`, `/api/recommendations`.
 * `GET /api/tags` is registered on the root instance in `app.ts` so it is never dropped by
 * Fastify 5 plugin/prefix registration ordering.
 */
const apiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/me", async (request, reply) => {
    const userId = bearerUserId(request.headers.authorization);
    if (!userId) {
      return reply.status(401).send(createErrorResponse("Authentication Error", "Missing or invalid token"));
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        createdAt: true,
        onboardingCompletedAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send(createErrorResponse("Not Found", "User not found"));
    }

    return reply.send({ user: createUserResponse(user) });
  });

  fastify.post<{ Body: { tagIds?: unknown } }>("/me/onboarding", async (request, reply) => {
    const userId = bearerUserId(request.headers.authorization);
    if (!userId) {
      return reply.status(401).send(createErrorResponse("Authentication Error", "Missing or invalid token"));
    }

    const raw = request.body?.tagIds;
    if (!Array.isArray(raw) || !raw.every((id): id is string => typeof id === "string")) {
      throw new ValidationError("tagIds must be an array of tag id strings");
    }

    const uniqueIds = [...new Set(raw)];

    if (uniqueIds.length > 0) {
      const valid = await fastify.prisma.tag.findMany({
        where: {
          id: { in: uniqueIds },
          isActive: true,
          isPreference: true,
        },
        select: { id: true },
      });
      if (valid.length !== uniqueIds.length) {
        throw new ValidationError("One or more tags are invalid or not available for preferences");
      }
    }

    await fastify.prisma.$transaction(async (tx) => {
      await tx.userPreferredTag.deleteMany({ where: { userId } });
      if (uniqueIds.length > 0) {
        await tx.userPreferredTag.createMany({
          data: uniqueIds.map((tagId) => ({ userId, tagId, weight: 1 })),
        });
      }
      await tx.user.update({
        where: { id: userId },
        data: { onboardingCompletedAt: new Date() },
      });
    });

    const user = await fastify.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        createdAt: true,
        onboardingCompletedAt: true,
      },
    });

    return reply.send({ user: createUserResponse(user) });
  });

  fastify.post<{ Body: GetRecommendationsBody }>(
    "/recommendations",
    { schema: postRecommendationsSchema },
    async (request, reply) => {
      const userId = bearerUserId(request.headers.authorization);

      const userDefaults = userId
        ? await fastify.prisma.user.findUnique({
            where: { id: userId },
            include: {
              preferredTags: true,
            },
          })
        : null;

      const defaults =
        userDefaults == null
          ? null
          : {
              latitude: userDefaults.latitude,
              longitude: userDefaults.longitude,
              timeZone: userDefaults.timeZone,
              city: userDefaults.city,
              state: userDefaults.state,
              preferredTags: userDefaults.preferredTags.map((p) => ({
                tagId: p.tagId,
                weight: p.weight,
              })),
            };

      const { latitude: reqLat, longitude: reqLon, mode: reqMode } = request.body;
      request.log.info(
        {
          tag: "recommendations.coords",
          clientLatitude: reqLat,
          clientLongitude: reqLon,
          mode: reqMode,
          hasAuthUser: Boolean(userId),
        },
        "POST /recommendations — request coordinates (WGS84: lat, lng)",
      );

      const result = await getRecommendations(fastify.prisma, request.body, defaults);

      if (result.primary) {
        const p = result.primary;
        const hM = p.distanceMeters;
        const wM = p.walkingDistanceMeters;
        request.log.info(
          {
            tag: "recommendations.distances",
            clientLatitude: reqLat,
            clientLongitude: reqLon,
            shopName: p.name,
            shopLatitude: p.latitude,
            shopLongitude: p.longitude,
            haversineMeters: hM,
            haversineMiles: hM != null ? Math.round((hM / 1609.344) * 100) / 100 : null,
            walkingMeters: wM,
            walkingMiles: wM != null ? Math.round((wM / 1609.344) * 100) / 100 : null,
            walkingDurationSeconds: p.walkingDurationSeconds,
            googleWalkingPresent: wM != null,
          },
          "POST /recommendations — primary shop distance (haversine = straight line; walking = Google matrix when present)",
        );
      }

      return reply.send(result);
    },
  );
};

export default apiRoutes;
