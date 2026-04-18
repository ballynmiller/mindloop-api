export type RecommendationMode = "work" | "chill" | "quick_stop" | "meet";

export const RECOMMENDATION_MODES: RecommendationMode[] = ["work", "chill", "quick_stop", "meet"];

export function parseRecommendationMode(raw: string): RecommendationMode | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (s === "quick-coffee") return "quick_stop";
  if (
    s === "work" ||
    s === "chill" ||
    s === "meet" ||
    s === "quick_stop" ||
    s === "quick-stop"
  ) {
    return s === "quick-stop" ? "quick_stop" : (s as RecommendationMode);
  }
  return null;
}

/** Tag slug → points toward this mode (may be negative). */
export const MODE_TAG_WEIGHTS: Record<RecommendationMode, Record<string, number>> = {
  work: {
    quiet: 15,
    wifi: 12,
    outlets: 10,
    work: 10,
    modern: 6,
    calm: 10,
    minimalist: 8,
    "easy-parking": 3,
    "quick-stop": -6,
    cozy: 2,
    meet: 4,
    chill: 3,
    food: 4,
    "public-bathroom": 3,
  },
  chill: {
    cozy: 18,
    calm: 16,
    quiet: 12,
    chill: 14,
    modern: 4,
    wifi: 3,
    outlets: 2,
    "quick-stop": -10,
    work: -4,
    meet: 4,
    minimalist: 6,
    food: 6,
    "public-bathroom": 5,
  },
  quick_stop: {
    "quick-stop": 18,
    "easy-parking": 14,
    wifi: 8,
    meet: 4,
    modern: 5,
    quiet: 4,
    outlets: 5,
    work: -2,
    cozy: 3,
    calm: 2,
    minimalist: 4,
    chill: 2,
    food: 10,
    "public-bathroom": 6,
  },
  meet: {
    meet: 16,
    cozy: 10,
    wifi: 8,
    quiet: 6,
    modern: 8,
    "quick-stop": -12,
    work: -3,
    outlets: 6,
    calm: 8,
    minimalist: 7,
    "easy-parking": 5,
    chill: 4,
    food: 8,
    "public-bathroom": 5,
  },
};
