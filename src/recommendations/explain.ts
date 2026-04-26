import { INTENT_GROUPS, type RecommendationMode } from "./taxonomy.js";
import type { ScoredShop } from "./score.js";

export type ConfidenceLevel = "high" | "medium" | "low";

export function confidenceFromScore(s: ScoredShop): ConfidenceLevel {
  const comp = s.breakdown.completeness;
  if (comp >= 9 && s.openInfo.hoursKnown) return "high";
  if (comp >= 5) return "medium";
  return "low";
}

const PRETTY_TAG: Record<string, string> = {
  minimalist: "Minimalist vibe",
  calm: "Calm",
  quiet: "Low noise",
  cozy: "Cozy atmosphere",
  wifi: "Strong Wi‑Fi",
  outlets: "Plenty of outlets",
  modern: "Modern feel",
  "easy-parking": "Easy parking",
  food: "Food available",
  "public-bathroom": "Public restroom",
};

const MODE_SLUG_SET: Record<RecommendationMode, Set<string>> = Object.fromEntries(
  INTENT_GROUPS.map((g) => [g.id, new Set(g.subTags.map((t) => t.slug))]),
) as Record<RecommendationMode, Set<string>>;

export function matchedPreferenceLabels(
  mode: RecommendationMode,
  scored: ScoredShop,
  preferredTagIds: Set<string>,
): string[] {
  const validSlugs = MODE_SLUG_SET[mode];
  const out: string[] = [];
  for (const rel of scored.shop.tags) {
    if (!preferredTagIds.has(rel.tag.id)) continue;
    if (!validSlugs.has(rel.tag.slug)) continue;
    const label = PRETTY_TAG[rel.tag.slug] ?? rel.tag.name;
    if (!out.includes(label)) out.push(label);
  }
  return out.slice(0, 6);
}

function formatClose(hhmm: string): string {
  const p = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!p) return hhmm;
  let h = Number(p[1]);
  const m = p[2];
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ap}`;
}

export function buildSummaryLine(mode: RecommendationMode, scored: ScoredShop): string {
  const slugs = new Set(scored.tagSlugs);
  const parts: string[] = [];
  if (slugs.has("quiet") || (scored.shop.noiseLevel != null && scored.shop.noiseLevel >= 4)) {
    parts.push("Quiet");
  }
  if (mode === "work") parts.push("great for focus");
  if (mode === "chill") parts.push("easy to unwind");
  if (mode === "quick_stop") parts.push("quick stop");
  if (mode === "meet") parts.push("great for catching up");
  if (parts.length === 0) {
    return "A solid pick for right now.";
  }
  const head = parts.slice(0, 2).join(", ");
  const tail = parts.length > 2 ? parts[2] : parts[parts.length - 1];
  if (parts.length >= 3) return `${head}, ${tail}.`;
  return `${head}.`;
}

export function buildReasons(
  mode: RecommendationMode,
  scored: ScoredShop,
  preferredLabels: string[],
): string[] {
  const reasons: string[] = [];
  const km = scored.distanceMeters != null ? scored.distanceMeters / 1000 : null;
  if (km != null && km < 2.5) {
    reasons.push("Close to you");
  }
  if (scored.openInfo.hoursKnown && scored.openInfo.isOpenNow) {
    if (scored.openInfo.closesAtToday) {
      reasons.push(`Open now — closes ${formatClose(scored.openInfo.closesAtToday)}`);
    } else {
      reasons.push("Open now");
    }
  }
  if (mode === "work" && (scored.shop.wifiQuality ?? 0) >= 4) {
    reasons.push("Strong Wi‑Fi for focused work");
  }
  if (mode === "work" && scored.tagSlugs.includes("quiet")) {
    reasons.push("Quiet space for deep work");
  }
  if (mode === "chill" && scored.tagSlugs.some((t) => t === "cozy" || t === "calm")) {
    reasons.push("Relaxed vibe for chilling");
  }
  if (mode === "quick_stop" && scored.tagSlugs.includes("easy-parking")) {
    reasons.push("Quick, convenient stop");
  }
  if (mode === "meet" && scored.tagSlugs.some((t) => t === "cozy" || t === "calm")) {
    reasons.push("Comfortable for conversations");
  }
  for (const label of preferredLabels.slice(0, 3)) {
    const line = `Matches your preference: ${label}`;
    if (!reasons.includes(line)) reasons.push(line);
  }
  return reasons.slice(0, 4);
}
