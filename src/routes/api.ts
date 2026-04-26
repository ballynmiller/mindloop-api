import { FastifyPluginAsync } from "fastify";

import { getFavoriteShopIds, listFavorites, toggleFavorite } from "../favorites/service.js";
import { coffeeShopToFavoriteListDto } from "../favorites/shopDto.js";
import { getRecommendations, type GetRecommendationsBody } from "../recommendations/service.js";
import { postRecommendationsSchema } from "../schemas/recommendations.js";
import { extractBearerUserId } from "../utils/auth.js";
import { ValidationError } from "../utils/errors.js";
import { createErrorResponse, createUserResponse, USER_SELECT } from "../utils/response.js";

const apiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/me", { preHandler: fastify.requireUser }, async (request, reply) => {
    return reply.send({ user: createUserResponse(request.user!) });
  });

  fastify.get("/me/favorite-ids", { preHandler: fastify.requireUser }, async (request, reply) => {
    const shopIds = await getFavoriteShopIds(fastify.prisma, request.user!.id);
    return reply.send({ shopIds });
  });

  fastify.get<{
    Querystring: { page?: string; limit?: string; search?: string };
  }>("/me/favorites", { preHandler: fastify.requireUser }, async (request, reply) => {
    const { id: userId, timeZone } = request.user!;

    const page = Math.max(1, Math.floor(Number(request.query.page)) || 1);
    const limitRaw = Math.floor(Number(request.query.limit)) || 5;
    const limit = Math.min(50, Math.max(1, limitRaw));
    const search =
      typeof request.query.search === "string" && request.query.search.trim()
        ? request.query.search
        : undefined;

    const result = await listFavorites(fastify.prisma, userId, page, limit, search, timeZone);
    return reply.send(result);
  });

  fastify.post<{ Body: { coffeeShopId?: unknown } }>(
    "/me/favorites/toggle",
    { preHandler: fastify.requireUser },
    async (request, reply) => {
      const { id: userId, timeZone } = request.user!;

      const raw = request.body?.coffeeShopId;
      if (typeof raw !== "string" || !raw.trim()) {
        throw new ValidationError("coffeeShopId is required");
      }

      const result = await toggleFavorite(fastify.prisma, userId, raw.trim(), timeZone);
      return reply.send(result);
    },
  );

  fastify.post<{ Body: { tagIds?: unknown } }>(
    "/me/onboarding",
    { preHandler: fastify.requireUser },
    async (request, reply) => {
      const userId = request.user!.id;

      const raw = request.body?.tagIds;
      if (!Array.isArray(raw) || !raw.every((id): id is string => typeof id === "string")) {
        throw new ValidationError("tagIds must be an array of tag id strings");
      }

      const uniqueIds = [...new Set(raw)];

      if (uniqueIds.length > 0) {
        const valid = await fastify.prisma.tag.findMany({
          where: { id: { in: uniqueIds }, isActive: true, isPreference: true },
          select: { id: true },
        });
        if (valid.length !== uniqueIds.length) {
          throw new ValidationError("One or more tags are invalid or not available for preferences");
        }
      }

      const user = await fastify.prisma.$transaction(async (tx) => {
        await tx.userPreferredTag.deleteMany({ where: { userId } });
        if (uniqueIds.length > 0) {
          await tx.userPreferredTag.createMany({
            data: uniqueIds.map((tagId) => ({ userId, tagId, weight: 1 })),
          });
        }
        return tx.user.update({
          where: { id: userId },
          data: { onboardingCompletedAt: new Date() },
          select: USER_SELECT,
        });
      });

      return reply.send({ user: createUserResponse(user) });
    },
  );

  fastify.get<{ Params: { shopId: string } }>(
    "/shops/:shopId",
    { preHandler: fastify.requireUser },
    async (request, reply) => {
      const { timeZone } = request.user!;

      const shop = await fastify.prisma.coffeeShop.findFirst({
        where: { id: request.params.shopId, isActive: true },
        include: {
          tags: { include: { tag: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      });

      if (!shop) {
        return reply.status(404).send(createErrorResponse("Not Found", "Coffee shop not found"));
      }

      return reply.send({ shop: coffeeShopToFavoriteListDto(shop, timeZone) });
    },
  );

  fastify.put<{ Params: { shopId: string }; Body: { tagIds?: unknown } }>(
    "/shops/:shopId/tags",
    { preHandler: fastify.requireUser },
    async (request, reply) => {
      const { isAdmin, timeZone } = request.user!;

      if (!isAdmin) {
        return reply.status(403).send(createErrorResponse("Forbidden", "Admin access is required"));
      }

      const raw = request.body?.tagIds;
      if (!Array.isArray(raw) || !raw.every((id): id is string => typeof id === "string" && id.trim().length > 0)) {
        throw new ValidationError("tagIds must be an array of tag id strings");
      }
      const tagIds = [...new Set(raw.map((id) => id.trim()))];

      const [exists, validTags] = await Promise.all([
        fastify.prisma.coffeeShop.findFirst({
          where: { id: request.params.shopId, isActive: true },
          select: { id: true },
        }),
        tagIds.length > 0
          ? fastify.prisma.tag.findMany({
              where: { id: { in: tagIds }, isActive: true, isFilterable: true },
              select: { id: true },
            })
          : Promise.resolve([] as { id: string }[]),
      ]);

      if (!exists) {
        return reply.status(404).send(createErrorResponse("Not Found", "Coffee shop not found"));
      }
      if (tagIds.length > 0 && validTags.length !== tagIds.length) {
        throw new ValidationError("One or more tags are invalid or inactive");
      }

      await fastify.prisma.$transaction(async (tx) => {
        await tx.coffeeShopTag.deleteMany({
          where: { coffeeShopId: request.params.shopId },
        });
        if (tagIds.length > 0) {
          await tx.coffeeShopTag.createMany({
            data: tagIds.map((tagId) => ({
              coffeeShopId: request.params.shopId,
              tagId,
              source: "USER_CONFIRMED",
            })),
          });
        }
      });

      const shop = await fastify.prisma.coffeeShop.findFirstOrThrow({
        where: { id: request.params.shopId },
        include: {
          tags: { include: { tag: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      });

      return reply.send({ shop: coffeeShopToFavoriteListDto(shop, timeZone) });
    },
  );

  fastify.post<{ Body: GetRecommendationsBody }>(
    "/recommendations",
    { schema: postRecommendationsSchema },
    async (request, reply) => {
      const userId = extractBearerUserId(request.headers.authorization);

      const userDefaults = userId
        ? await fastify.prisma.user.findUnique({
            where: { id: userId },
            include: { preferredTags: true },
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
