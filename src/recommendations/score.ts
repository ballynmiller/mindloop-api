import { haversineMeters } from "./geo.js";
import { getOpenNowFromHoursJson, type OpenNowResult } from "./hours.js";
import { MODE_TAG_WEIGHTS, type RecommendationMode } from "./taxonomy.js";

export type ShopTagRel = { tag: { id: string; slug: string; name: string } };

export type ShopRow = {
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
  /** First hero image URL when loaded from Prisma */
  heroImageUrl?: string | null;
  tags: ShopTagRel[];
};

export type ScoringContext = {
  mode: RecommendationMode;
  at: Date;
  timeZone: string;
  userLat: number | null;
  userLon: number | null;
  /** Prisma Tag id -> weight */
  preferredTagWeights: Map<string, number>;
};

export type ScoreBreakdown = {
  modeFit: number;
  preferenceFit: number;
  distance: number;
  open: number;
  quality: number;
  completeness: number;
};

export type ScoredShop = {
  shop: ShopRow;
  total: number;
  breakdown: ScoreBreakdown;
  distanceMeters: number | null;
  openInfo: OpenNowResult;
  tagSlugs: string[];
};

const DISTANCE_POINTS_MAX = 30;

function distancePointsFromKm(km: number): number {
  return DISTANCE_POINTS_MAX / (1 + km);
}

export function modeFitScore(mode: RecommendationMode, tagSlugs: Set<string>): number {
  const table = MODE_TAG_WEIGHTS[mode];
  let sum = 0;
  for (const slug of tagSlugs) {
    const w = table[slug];
    if (w !== undefined) sum += w;
  }
  return sum;
}

function preferenceFit(
  shopTagIds: Set<string>,
  preferredTagWeights: Map<string, number>,
): number {
  let sum = 0;
  for (const [tagId, weight] of preferredTagWeights) {
    if (shopTagIds.has(tagId)) sum += 5 * weight;
  }
  return Math.min(sum, 22);
}

function qualityFit(mode: RecommendationMode, shop: ShopRow): number {
  let q = 0;
  const w = shop.wifiQuality;
  const n = shop.noiseLevel;
  const o = shop.outletAvailability;
  const s = shop.seatingComfort;
  const p = shop.parkingQuality;

  if (mode === "work") {
    if (w != null) q += w * 2.2;
    if (n != null) q += n * 2.8;
    if (o != null) q += o * 2;
    if (s != null) q += s * 1.2;
  } else if (mode === "chill") {
    if (s != null) q += s * 2.5;
    if (n != null) q += n * 1.5;
    if (w != null) q += w * 0.8;
  } else if (mode === "quick_stop") {
    if (p != null) q += p * 3;
    if (n != null) q += n * 0.8;
    if (w != null) q += w * 1;
  } else if (mode === "meet") {
    if (s != null) q += s * 3;
    if (p != null) q += p * 1.5;
    if (w != null) q += w * 1.2;
  }
  return q;
}

function completenessScore(shop: ShopRow, openInfo: OpenNowResult): number {
  let c = 0;
  if (shop.latitude != null && shop.longitude != null) c += 4;
  if (openInfo.hoursKnown) c += 4;
  if (shop.tags.length > 0) c += 3;
  const qFields = [
    shop.wifiQuality,
    shop.noiseLevel,
    shop.outletAvailability,
    shop.seatingComfort,
    shop.parkingQuality,
  ].filter((x) => x != null).length;
  c += Math.min(qFields, 5) * 1.2;
  return c;
}

export function scoreShop(shop: ShopRow, ctx: ScoringContext): ScoredShop {
  const tagSlugs = shop.tags.map((t) => t.tag.slug);
  const slugSet = new Set(tagSlugs);
  const tagIds = new Set(shop.tags.map((t) => t.tag.id));

  const m = modeFitScore(ctx.mode, slugSet);
  const pref = preferenceFit(tagIds, ctx.preferredTagWeights);

  let distanceMeters: number | null = null;
  let distPts = 12;
  if (
    ctx.userLat != null &&
    ctx.userLon != null &&
    shop.latitude != null &&
    shop.longitude != null
  ) {
    distanceMeters = haversineMeters(ctx.userLat, ctx.userLon, shop.latitude, shop.longitude);
    distPts = distancePointsFromKm(distanceMeters / 1000);
  }

  const openInfo = getOpenNowFromHoursJson(shop.hours, ctx.at, ctx.timeZone);
  let openPts = 5;
  if (openInfo.hoursKnown) {
    openPts = openInfo.isOpenNow ? 14 : -25;
  }

  const qual = qualityFit(ctx.mode, shop);
  const comp = completenessScore(shop, openInfo);

  const breakdown: ScoreBreakdown = {
    modeFit: m,
    preferenceFit: pref,
    distance: distPts,
    open: openPts,
    quality: qual,
    completeness: comp,
  };

  const total =
    breakdown.modeFit +
    breakdown.preferenceFit +
    breakdown.distance +
    breakdown.open +
    breakdown.quality +
    breakdown.completeness * 0.35;

  return {
    shop,
    total,
    breakdown,
    distanceMeters,
    openInfo,
    tagSlugs,
  };
}
