import { getOpenNowFromHoursJson } from "../recommendations/hours.js";
import type { RecommendationShopDto } from "../recommendations/service.js";
import { COFFEE_SHOP_PLACEHOLDER_IMAGE_URL } from "../utils/googlePlacesPhoto.js";

const DEFAULT_TZ = "America/Chicago";

type BusyHourBucket = { label: string; level: number };

export type ShopDetailDto = RecommendationShopDto & {
  photoUrls: string[];
  opensAtLocal: string | null;
  parkingAvailable: boolean;
  busyHours: BusyHourBucket[] | null;
};

type ShopForDto = {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  hours: unknown;
  busyHours: unknown;
  ratingAvg: number | null;
  reviewCount: number | null;
  priceLevel: number | null;
  tags: { tag: { slug: string; name: string } }[];
  images: { url: string }[];
};

function parseBusyHours(raw: unknown): BusyHourBucket[] | null {
  if (!Array.isArray(raw)) return null;
  const buckets: BusyHourBucket[] = [];
  for (const b of raw) {
    if (
      typeof b === "object" && b !== null &&
      typeof (b as Record<string, unknown>).label === "string" &&
      typeof (b as Record<string, unknown>).level === "number"
    ) {
      buckets.push(b as BusyHourBucket);
    }
  }
  return buckets.length > 0 ? buckets : null;
}

/**
 * Maps a shop row to the DTO shape used by the shop detail and favorites endpoints.
 */
export function coffeeShopToFavoriteListDto(
  shop: ShopForDto,
  timeZone: string = DEFAULT_TZ,
): ShopDetailDto {
  const at = new Date();
  const openInfo = getOpenNowFromHoursJson(shop.hours, at, timeZone);
  const imageUrl = shop.images[0]?.url ?? COFFEE_SHOP_PLACEHOLDER_IMAGE_URL;
  const summary =
    shop.description?.trim() ||
    `${shop.name} in ${shop.city}.`;

  return {
    shopId: shop.id,
    name: shop.name,
    city: shop.city,
    state: shop.state,
    latitude: shop.latitude,
    longitude: shop.longitude,
    distanceMeters: null,
    walkingDistanceMeters: null,
    walkingDurationSeconds: null,
    isOpenNow: openInfo.isOpenNow,
    hoursKnown: openInfo.hoursKnown,
    closesAtLocal: openInfo.closesAtToday,
    opensAtLocal: openInfo.opensAtToday ?? null,
    summaryLine: summary,
    tags: shop.tags.map((t) => ({ slug: t.tag.slug, name: t.tag.name })),
    imageUrl,
    photoUrls: shop.images.map((i) => i.url),
    parkingAvailable: shop.tags.some((t) => t.tag.slug === "parking"),
    reasons: [],
    matchedPreferences: [],
    confidence: "medium",
    ratingAvg: shop.ratingAvg,
    reviewCount: shop.reviewCount,
    priceLevel: shop.priceLevel,
    busyHours: parseBusyHours(shop.busyHours),
  };
}
