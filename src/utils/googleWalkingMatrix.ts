/**
 * Google Distance Matrix API (walking). Uses the same API key as Places if
 * GOOGLE_MAPS_API_KEY is unset — enable "Distance Matrix API" on that key in Google Cloud.
 */

const MAX_DESTINATIONS_PER_REQUEST = 25;
const MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json";

export type WalkingLeg = {
  distanceMeters: number;
  durationSeconds: number;
};

function mapsApiKey(): string | undefined {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    undefined
  );
}

type MatrixElement = {
  status: string;
  distance?: { value: number };
  duration?: { value: number };
};

type MatrixResponse = {
  status: string;
  rows?: { elements: MatrixElement[] }[];
};

/**
 * Walking legs from one origin to many destinations (order preserved).
 * Returns null entries when routing fails for that destination or the API errors.
 */
export async function getWalkingLegs(
  originLat: number,
  originLon: number,
  destinations: readonly { latitude: number; longitude: number }[],
): Promise<(WalkingLeg | null)[]> {
  if (destinations.length === 0) return [];

  const key = mapsApiKey();
  if (!key) {
    return destinations.map(() => null);
  }

  const out: (WalkingLeg | null)[] = [];

  for (let offset = 0; offset < destinations.length; offset += MAX_DESTINATIONS_PER_REQUEST) {
    const batch = destinations.slice(offset, offset + MAX_DESTINATIONS_PER_REQUEST);
    const destParam = batch.map((d) => `${d.latitude},${d.longitude}`).join("|");

    const url = new URL(MATRIX_URL);
    url.searchParams.set("origins", `${originLat},${originLon}`);
    url.searchParams.set("destinations", destParam);
    url.searchParams.set("mode", "walking");
    url.searchParams.set("units", "metric");
    url.searchParams.set("key", key);

    let data: MatrixResponse;
    try {
      const res = await fetch(url.toString());
      data = (await res.json()) as MatrixResponse;
    } catch {
      for (const _ of batch) out.push(null);
      continue;
    }

    if (data.status !== "OK") {
      console.warn(
        "[googleWalkingMatrix] Distance Matrix status:",
        data.status,
        url.toString().replace(/key=[^&]+/, "key=(redacted)"),
      );
      for (const _ of batch) out.push(null);
      continue;
    }

    const elements = data.rows?.[0]?.elements ?? [];
    for (let j = 0; j < batch.length; j++) {
      const el = elements[j];
      if (
        el?.status === "OK" &&
        el.distance != null &&
        el.duration != null &&
        Number.isFinite(el.distance.value) &&
        Number.isFinite(el.duration.value)
      ) {
        out.push({
          distanceMeters: el.distance.value,
          durationSeconds: el.duration.value,
        });
      } else {
        out.push(null);
      }
    }
  }

  return out;
}
