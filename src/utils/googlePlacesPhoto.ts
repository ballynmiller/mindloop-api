/**
 * Google Places API (New) — fetch a publishable photo URL for a place.
 * @see https://developers.google.com/maps/documentation/places/web-service/place-photos
 */

const PLACES_BASE = "https://places.googleapis.com/v1";

/**
 * Editorial fallback when there is no venue-specific Google photo — café interior (Unsplash).
 * Use from seed, recommendations hero fallback, and backfill when Places match/photo fails.
 */
export const COFFEE_SHOP_PLACEHOLDER_IMAGE_URL =
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80&auto=format&fit=crop";

/** Reject text-search hits in another metro (e.g. Portland “Hinterland” when seeding Maple Grove). */
const MAX_DISTANCE_FROM_SEED_M = 150_000;
/** Accept a result with no token overlap only if it is this close to our seeded coordinates. */
const CLOSE_ENOUGH_WITHOUT_NAME_MATCH_M = 550;

const GENERIC_NAME_TOKENS = new Set([
  "coffee",
  "cafe",
  "maple",
  "grove",
  "the",
  "and",
  "donuts",
  "bagels",
  "espresso",
  "minnesota",
  "shop",
  "unit",
  "suite",
  "ste",
  "road",
  "street",
  "boulevard",
  "blvd",
  "north",
  "south",
  "east",
  "west",
  "drive",
  "lane",
  "parkway",
  "pkwy",
  "cir",
  "circle",
]);

export type PhotoFetchResult = {
  url: string;
  attributions: string[];
};

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function significantTokensFromShopName(shopName: string): string[] {
  return shopName
    .replace(/[—–-]/g, " ")
    .split(/[\s&,]+/)
    .map((w) => w.replace(/[^a-z0-9]/gi, "").toLowerCase())
    .filter((w) => w.length >= 4 && w !== "co" && !GENERIC_NAME_TOKENS.has(w));
}

function displayNameMatchesShopTokens(displayName: string, shopName: string): boolean {
  const d = displayName.toLowerCase();
  const tokens = significantTokensFromShopName(shopName);
  return tokens.some((t) => d.includes(t));
}

function placePath(placeIdOrName: string): string {
  const raw = placeIdOrName.startsWith("places/")
    ? placeIdOrName.slice("places/".length)
    : placeIdOrName;
  return `places/${encodeURIComponent(raw)}`;
}

type PlaceSearchHit = {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
};

/**
 * Text search; returns place resource id (`places/ChIJ…`) or null.
 * Prefer {@link resolvePlaceIdForCoffeeShop} for backfill — the first hit is often wrong when
 * the business name does not match any Google listing (Places may return a nearby cafe instead).
 */
export async function searchPlaceByText(
  textQuery: string,
  apiKey: string,
  locationBias?: { latitude: number; longitude: number; radiusMeters: number },
): Promise<string | null> {
  const body: Record<string, unknown> = {
    textQuery,
    pageSize: 20,
    ...(locationBias
      ? {
          locationBias: {
            circle: {
              center: { latitude: locationBias.latitude, longitude: locationBias.longitude },
              radius: locationBias.radiusMeters,
            },
          },
          rankPreference: "DISTANCE",
        }
      : {}),
  };

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Places searchText failed ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as { places?: { id?: string }[] };
  const id = data.places?.[0]?.id;
  return id ?? null;
}

/**
 * Resolves a Place id for a seeded shop: requires either a display-name match on a non-generic
 * token from {@param shopName}, or a very close coordinate match. Avoids attaching another venue’s
 * photo (e.g. “Hinterland…” search returning Bean Co Cafe first).
 */
export async function resolvePlaceIdForCoffeeShop(
  textQuery: string,
  shopName: string,
  seedLatitude: number,
  seedLongitude: number,
  apiKey: string,
  locationBias: { latitude: number; longitude: number; radiusMeters: number },
): Promise<string | null> {
  const body = {
    textQuery,
    pageSize: 20,
    locationBias: {
      circle: {
        center: { latitude: locationBias.latitude, longitude: locationBias.longitude },
        radius: locationBias.radiusMeters,
      },
    },
    rankPreference: "DISTANCE",
  };

  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.location",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Places searchText failed ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as { places?: PlaceSearchHit[] };
  const places = data.places ?? [];

  type Scored = { id: string; distanceM: number };
  const candidates: Scored[] = [];

  for (const p of places) {
    const id = p.id;
    if (!id) continue;
    const plat = p.location?.latitude;
    const plng = p.location?.longitude;
    if (plat == null || plng == null) continue;

    const distanceM = haversineMeters(seedLatitude, seedLongitude, plat, plng);
    if (distanceM > MAX_DISTANCE_FROM_SEED_M) continue;

    const label = p.displayName?.text ?? "";
    const nameOk = displayNameMatchesShopTokens(label, shopName);
    const closeOk = distanceM <= CLOSE_ENOUGH_WITHOUT_NAME_MATCH_M;
    if (!nameOk && !closeOk) continue;

    candidates.push({ id, distanceM });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.distanceM - b.distanceM);
  return candidates[0]!.id;
}

/**
 * GET place details; resolve first photo to a CDN URL via the photo media redirect.
 */
export async function getFirstEstablishmentPhoto(
  placeIdOrName: string,
  apiKey: string,
): Promise<PhotoFetchResult | null> {
  const path = placePath(placeIdOrName);
  const detailRes = await fetch(`${PLACES_BASE}/${path}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "photos",
    },
  });

  if (!detailRes.ok) {
    const errText = await detailRes.text();
    throw new Error(`Places get place failed ${detailRes.status}: ${errText.slice(0, 500)}`);
  }

  const place = (await detailRes.json()) as {
    photos?: { name: string; authorAttributions?: { displayName: string }[] }[];
  };
  const photo = place.photos?.[0];
  if (!photo?.name) return null;

  const mediaUrl = `${PLACES_BASE}/${photo.name}/media?maxHeightPx=1600`;
  const mediaRes = await fetch(mediaUrl, {
    redirect: "manual",
    headers: { "X-Goog-Api-Key": apiKey },
  });

  const loc = mediaRes.headers.get("location");
  if (loc) {
    const attributions = photo.authorAttributions?.map((a) => a.displayName) ?? [];
    return { url: loc, attributions };
  }

  return null;
}

export function isUnsplashPlaceholder(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("images.unsplash.com");
}
