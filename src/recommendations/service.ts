import type { PrismaClient } from "../../generated/prisma/client.js";
import { ValidationError } from "../utils/errors.js";
import { getWalkingLegs } from "../utils/googleWalkingMatrix.js";
import { haversineMeters } from "./geo.js";
import {
  buildReasons,
  buildSummaryLine,
  confidenceFromScore,
  matchedPreferenceLabels,
  type ConfidenceLevel,
} from "./explain.js";
import { pickBackups } from "./diversify.js";
import { parseRecommendationMode, type RecommendationMode } from "./taxonomy.js";
import { scoreShop, type ScoredShop, type ShopRow } from "./score.js";
import { COFFEE_SHOP_PLACEHOLDER_IMAGE_URL } from "../utils/googlePlacesPhoto.js";

const DEFAULT_RADIUS_M = 80_000;
const MAX_RADIUS_M = 600_000;
const DEFAULT_BACKUP_LIMIT = 5;

export type GetRecommendationsBody = {
  mode: string;
  latitude?: number | null;
  longitude?: number | null;
  at?: string | null;
  timeZone?: string | null;
  searchRadiusMeters?: number | null;
  preferredTagIds?: string[] | null;
  excludeShopIds?: string[] | null;
  backupLimit?: number | null;
};

export type RecommendationShopDto = {
  shopId: string;
  name: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  /** Great-circle distance (haversine); used for ranking when routing is unavailable. */
  distanceMeters: number | null;
  /** Google Distance Matrix walking distance; null if API unavailable or leg failed. */
  walkingDistanceMeters: number | null;
  /** Walking duration from Google; seconds. */
  walkingDurationSeconds: number | null;
  isOpenNow: boolean;
  hoursKnown: boolean;
  closesAtLocal?: string;
  summaryLine: string;
  tags: { slug: string; name: string }[];
  imageUrl: string | null;
  reasons: string[];
  matchedPreferences: string[];
  confidence: ConfidenceLevel;
  ratingAvg: number | null;
  reviewCount: number | null;
  priceLevel: number | null;
};

export type RecommendationsMeta = {
  mode: RecommendationMode;
  searchRadiusMeters: number;
  fallback: null | "widened_radius" | "relaxed_filters" | "no_strong_match";
  timeZone: string;
};

export type RecommendationsResult = {
  primary: RecommendationShopDto | null;
  backups: RecommendationShopDto[];
  meta: RecommendationsMeta;
};

type UserPrefDefaults = {
  latitude: number | null;
  longitude: number | null;
  timeZone: string;
  city: string | null;
  state: string | null;
  preferredTags: { tagId: string; weight: number }[];
};

type PrismaShop = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  hours: unknown;
  wifiQuality: number | null;
  noiseLevel: number | null;
  outletAvailability: number | null;
  seatingComfort: number | null;
  parkingQuality: number | null;
  ratingAvg: number | null;
  reviewCount: number | null;
  priceLevel: number | null;
  tags: { tag: { id: string; slug: string; name: string } }[];
  images: { url: string }[];
};

function prismaToShopRow(row: PrismaShop): ShopRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    state: row.state,
    latitude: row.latitude,
    longitude: row.longitude,
    hours: row.hours,
    wifiQuality: row.wifiQuality,
    noiseLevel: row.noiseLevel,
    outletAvailability: row.outletAvailability,
    seatingComfort: row.seatingComfort,
    parkingQuality: row.parkingQuality,
    ratingAvg: row.ratingAvg,
    reviewCount: row.reviewCount,
    priceLevel: row.priceLevel,
    heroImageUrl: row.images[0]?.url ?? null,
    tags: row.tags,
  };
}

function toDto(
  mode: RecommendationMode,
  s: ScoredShop,
  preferredTagIds: Set<string>,
): RecommendationShopDto {
  const prefLabels = matchedPreferenceLabels(s, preferredTagIds);
  return {
    shopId: s.shop.id,
    name: s.shop.name,
    city: s.shop.city,
    state: s.shop.state,
    latitude: s.shop.latitude,
    longitude: s.shop.longitude,
    distanceMeters: s.distanceMeters,
    walkingDistanceMeters: null,
    walkingDurationSeconds: null,
    isOpenNow: s.openInfo.isOpenNow,
    hoursKnown: s.openInfo.hoursKnown,
    closesAtLocal: s.openInfo.closesAtToday,
    summaryLine: buildSummaryLine(mode, s),
    tags: s.shop.tags.map((t) => ({ slug: t.tag.slug, name: t.tag.name })),
    imageUrl: s.shop.heroImageUrl ?? COFFEE_SHOP_PLACEHOLDER_IMAGE_URL,
    reasons: buildReasons(mode, s, prefLabels),
    matchedPreferences: prefLabels,
    confidence: confidenceFromScore(s),
    ratingAvg: s.shop.ratingAvg,
    reviewCount: s.shop.reviewCount,
    priceLevel: s.shop.priceLevel,
  };
}

async function attachWalkingRoutes(
  userLat: number,
  userLon: number,
  primary: RecommendationShopDto | null,
  backups: RecommendationShopDto[],
): Promise<void> {
  const shops: RecommendationShopDto[] = [];
  if (primary) shops.push(primary);
  shops.push(...backups);

  const withCoords = shops.filter((s) => s.latitude != null && s.longitude != null);
  if (withCoords.length === 0) return;

  const legs = await getWalkingLegs(
    userLat,
    userLon,
    withCoords.map((s) => ({ latitude: s.latitude!, longitude: s.longitude! })),
  );

  for (let i = 0; i < withCoords.length; i++) {
    const leg = legs[i];
    if (leg) {
      withCoords[i].walkingDistanceMeters = leg.distanceMeters;
      withCoords[i].walkingDurationSeconds = leg.durationSeconds;
    }
  }
}

function filterByRadius(
  shops: ShopRow[],
  userLat: number,
  userLon: number,
  radiusM: number,
): ShopRow[] {
  return shops.filter((s) => {
    if (s.latitude == null || s.longitude == null) return false;
    return haversineMeters(userLat, userLon, s.latitude, s.longitude) <= radiusM;
  });
}

function filterByCity(shops: ShopRow[], city: string, state: string): ShopRow[] {
  const v = shops.filter((s) => s.latitude != null && s.longitude != null);
  const loc = v.filter((s) => s.city === city && s.state === state);
  return loc.length > 0 ? loc : v;
}

export async function getRecommendations(
  prisma: PrismaClient,
  body: GetRecommendationsBody,
  userDefaults: UserPrefDefaults | null,
): Promise<RecommendationsResult> {
  const mode = parseRecommendationMode(body.mode);
  if (!mode) {
    throw new ValidationError(
      "Invalid mode. Use work, chill, quick_stop (or quick-stop), or meet.",
    );
  }

  const at = body.at ? new Date(body.at) : new Date();
  if (Number.isNaN(at.getTime())) {
    throw new ValidationError("Invalid at datetime");
  }

  const timeZone =
    (body.timeZone && body.timeZone.trim()) ||
    userDefaults?.timeZone ||
    "America/Chicago";

  const latProvided = body.latitude !== undefined && body.latitude !== null;
  const lonProvided = body.longitude !== undefined && body.longitude !== null;
  if (latProvided !== lonProvided) {
    throw new ValidationError("latitude and longitude must be provided together");
  }

  const userLat = latProvided ? body.latitude! : userDefaults?.latitude ?? null;
  const userLon = lonProvided ? body.longitude! : userDefaults?.longitude ?? null;

  const preferredWeights = new Map<string, number>();
  if (userDefaults?.preferredTags?.length) {
    for (const p of userDefaults.preferredTags) {
      preferredWeights.set(p.tagId, p.weight);
    }
  }
  if (body.preferredTagIds?.length) {
    for (const id of body.preferredTagIds) {
      if (!preferredWeights.has(id)) preferredWeights.set(id, 1);
    }
  }

  const preferredTagIds = new Set(preferredWeights.keys());
  const excludeIds = new Set(body.excludeShopIds ?? []);

  let radius = Math.min(
    Math.max(body.searchRadiusMeters ?? DEFAULT_RADIUS_M, 1_000),
    MAX_RADIUS_M,
  );
  let fallback: RecommendationsMeta["fallback"] = null;

  const backupLimit = Math.min(
    Math.max(body.backupLimit ?? DEFAULT_BACKUP_LIMIT, 1),
    12,
  );

  const raw = await prisma.coffeeShop.findMany({
    where: { isActive: true },
    include: {
      tags: { include: { tag: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });

  const shopRows = raw
    .filter((r) => !excludeIds.has(r.id))
    .map((r) => prismaToShopRow(r as PrismaShop));

  const scoreCtxBase = {
    mode,
    at,
    timeZone,
    userLat,
    userLon,
    preferredTagWeights: preferredWeights,
  };

  const sortRanked = (list: ShopRow[]) =>
    list
      .map((shop) => scoreShop(shop, scoreCtxBase))
      .sort((a, b) =>
        b.total !== a.total
          ? b.total - a.total
          : a.shop.id.localeCompare(b.shop.id),
      );

  let pool = shopRows.filter((s) => s.latitude != null && s.longitude != null);

  if (userLat != null && userLon != null) {
    let filtered = filterByRadius(pool, userLat, userLon, radius);
    if (filtered.length === 0) {
      while (filtered.length === 0 && radius < MAX_RADIUS_M) {
        radius = Math.min(radius * 2, MAX_RADIUS_M);
        fallback = "widened_radius";
        filtered = filterByRadius(pool, userLat, userLon, radius);
      }
      pool = filtered.length > 0 ? filtered : pool;
    } else {
      pool = filtered;
    }
  } else if (userDefaults?.city && userDefaults.state) {
    pool = filterByCity(shopRows, userDefaults.city, userDefaults.state);
    fallback = "relaxed_filters";
  }

  let ranked = sortRanked(pool);

  if (ranked.length === 0 && shopRows.length > 0) {
    pool = shopRows.filter((s) => s.latitude != null && s.longitude != null);
    ranked = sortRanked(pool);
    fallback = "relaxed_filters";
  }

  if (ranked.length === 0) {
    return {
      primary: null,
      backups: [],
      meta: { mode, searchRadiusMeters: radius, fallback: "no_strong_match", timeZone },
    };
  }

  const primaryScored = ranked[0];
  const backupsScored = pickBackups(ranked, primaryScored, backupLimit);

  const primaryDto = toDto(mode, primaryScored, preferredTagIds);
  const backupDtos = backupsScored.map((s) => toDto(mode, s, preferredTagIds));

  if (userLat != null && userLon != null) {
    await attachWalkingRoutes(userLat, userLon, primaryDto, backupDtos);
  }

  return {
    primary: primaryDto,
    backups: backupDtos,
    meta: {
      mode,
      searchRadiusMeters: radius,
      fallback,
      timeZone,
    },
  };
}
