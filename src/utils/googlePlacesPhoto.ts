/**
 * Google Places API (New) — fetch a publishable photo URL for a place.
 * @see https://developers.google.com/maps/documentation/places/web-service/place-photos
 */

const PLACES_BASE = "https://places.googleapis.com/v1";

export type PhotoFetchResult = {
  url: string;
  attributions: string[];
};

function placePath(placeIdOrName: string): string {
  const raw = placeIdOrName.startsWith("places/")
    ? placeIdOrName.slice("places/".length)
    : placeIdOrName;
  return `places/${encodeURIComponent(raw)}`;
}

/**
 * Text search; returns place resource id (`places/ChIJ…`) or null.
 */
export async function searchPlaceByText(
  textQuery: string,
  apiKey: string,
  locationBias?: { latitude: number; longitude: number; radiusMeters: number },
): Promise<string | null> {
  const body: Record<string, unknown> = { textQuery };
  if (locationBias) {
    body.locationBias = {
      circle: {
        center: { latitude: locationBias.latitude, longitude: locationBias.longitude },
        radius: locationBias.radiusMeters,
      },
    };
  }

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
