import { getOpenNowFromHoursJson } from "../recommendations/hours.js";
import type { RecommendationShopDto } from "../recommendations/service.js";
import { COFFEE_SHOP_PLACEHOLDER_IMAGE_URL } from "../utils/googlePlacesPhoto.js";

const DEFAULT_TZ = "America/Chicago";

type ShopForDto = {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  hours: unknown;
  ratingAvg: number | null;
  reviewCount: number | null;
  priceLevel: number | null;
  tags: { tag: { slug: string; name: string } }[];
  images: { url: string }[];
};

/**
 * Maps a shop row to the same DTO shape used by recommendations (distances null; no walking legs).
 */
export function coffeeShopToFavoriteListDto(
  shop: ShopForDto,
  timeZone: string = DEFAULT_TZ,
): RecommendationShopDto {
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
    summaryLine: summary,
    tags: shop.tags.map((t) => ({ slug: t.tag.slug, name: t.tag.name })),
    imageUrl,
    reasons: [],
    matchedPreferences: [],
    confidence: "medium",
    ratingAvg: shop.ratingAvg,
    reviewCount: shop.reviewCount,
    priceLevel: shop.priceLevel,
  };
}
