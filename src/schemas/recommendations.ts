export const postRecommendationsBodySchema = {
  type: "object",
  required: ["mode"],
  properties: {
    mode: { type: "string" },
    latitude: { type: "number" },
    longitude: { type: "number" },
    at: { type: "string" },
    timeZone: { type: "string" },
    searchRadiusMeters: { type: "number" },
    preferredTagIds: {
      type: "array",
      items: { type: "string" },
    },
    excludeShopIds: {
      type: "array",
      items: { type: "string" },
    },
    backupLimit: { type: "integer", minimum: 1, maximum: 12 },
  },
} as const;

export const postRecommendationsSchema = {
  body: postRecommendationsBodySchema,
} as const;
