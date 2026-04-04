import type { ScoredShop } from "./score.js";

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function tooSimilar(primary: ScoredShop, candidate: ScoredShop): boolean {
  const ta = new Set(primary.tagSlugs);
  const tb = new Set(candidate.tagSlugs);
  const sim = jaccard(ta, tb);
  const da = primary.distanceMeters;
  const db = candidate.distanceMeters;
  if (da != null && db != null && sim > 0.72 && Math.abs(da - db) < 900) {
    return true;
  }
  if (sim > 0.88) return true;
  return false;
}

/** Sorted scored list (desc total). Skips primary id. */
export function pickBackups(
  ranked: ScoredShop[],
  primary: ScoredShop,
  limit: number,
): ScoredShop[] {
  const out: ScoredShop[] = [];
  for (const s of ranked) {
    if (s.shop.id === primary.shop.id) continue;
    if (out.length >= limit) break;
    if (tooSimilar(primary, s)) continue;
    out.push(s);
  }
  if (out.length < limit) {
    for (const s of ranked) {
      if (s.shop.id === primary.shop.id) continue;
      if (out.some((o) => o.shop.id === s.shop.id)) continue;
      out.push(s);
      if (out.length >= limit) break;
    }
  }
  return out.slice(0, limit);
}
