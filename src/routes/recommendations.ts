import { FastifyPluginAsync } from "fastify";
import { verifyAccessToken } from "../utils/auth.js";
import { getRecommendations, type GetRecommendationsBody } from "../recommendations/service.js";
import { postRecommendationsSchema } from "../schemas/recommendations.js";

function bearerUserId(header: string | undefined): string | null {
  if (!header || !header.startsWith("Bearer ")) return null;
  const raw = header.slice(7).trim();
  if (!raw) return null;
  const v = verifyAccessToken(raw);
  return v?.userId ?? null;
}

const recommendationsRoutes: FastifyPluginAsync = async (fastify) => {
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

export default recommendationsRoutes;
