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

export type SubTag = {
  slug: string;
  label: string;
  /** Scoring signal strength. Negative values penalize this group. */
  weight: number;
  /** Shown in UI as a defining feature of this group. */
  primary: boolean;
};

export type IntentGroup = {
  id: RecommendationMode;
  label: string;
  subTags: SubTag[];
};

export const INTENT_GROUPS: IntentGroup[] = [
  {
    id: "work",
    label: "Work",
    subTags: [
      { slug: "quiet",           label: "Quiet",            weight: 15,  primary: true  },
      { slug: "wifi",            label: "WiFi",             weight: 12,  primary: true  },
      { slug: "calm",            label: "Calm",             weight: 10,  primary: true  },
      { slug: "outlets",         label: "Outlets",          weight: 10,  primary: true  },
      { slug: "work",            label: "Work-friendly",    weight: 10,  primary: true  },
      { slug: "minimalist",      label: "Minimalist",       weight: 8,   primary: false },
      { slug: "food",            label: "Food available",   weight: 4,   primary: false },
      { slug: "easy-parking",    label: "Easy parking",     weight: 3,   primary: false },
      { slug: "public-bathroom", label: "Public bathroom",  weight: 3,   primary: false },
    ],
  },
  {
    id: "chill",
    label: "Chill",
    subTags: [
      { slug: "cozy",            label: "Cozy",             weight: 18,  primary: true  },
      { slug: "calm",            label: "Calm",             weight: 16,  primary: true  },
      { slug: "chill",           label: "Chill vibe",       weight: 14,  primary: true  },
      { slug: "quiet",           label: "Quiet",            weight: 12,  primary: true  },
      { slug: "minimalist",      label: "Minimalist",       weight: 6,   primary: false },
      { slug: "food",            label: "Food available",   weight: 6,   primary: false },
      { slug: "public-bathroom", label: "Public bathroom",  weight: 5,   primary: false },
    ],
  },
  {
    id: "quick_stop",
    label: "Quick Stop",
    subTags: [
      { slug: "quick-stop",      label: "Quick stop",       weight: 18,  primary: true  },
      { slug: "easy-parking",    label: "Easy parking",     weight: 14,  primary: true  },
      { slug: "food",            label: "Food available",   weight: 10,  primary: true  },
      { slug: "wifi",            label: "WiFi",             weight: 8,   primary: false },
      { slug: "public-bathroom", label: "Public bathroom",  weight: 6,   primary: false },
    ],
  },
  {
    id: "meet",
    label: "Meet",
    subTags: [
      { slug: "meet",            label: "Meeting-friendly", weight: 16,  primary: true  },
      { slug: "cozy",            label: "Cozy",             weight: 10,  primary: true  },
      { slug: "calm",            label: "Calm",             weight: 8,   primary: true  },
      { slug: "wifi",            label: "WiFi",             weight: 8,   primary: true  },
      { slug: "food",            label: "Food available",   weight: 8,   primary: false },
      { slug: "quiet",           label: "Quiet",            weight: 6,   primary: false },
      { slug: "easy-parking",    label: "Easy parking",     weight: 5,   primary: false },
      { slug: "public-bathroom", label: "Public bathroom",  weight: 5,   primary: false },
      { slug: "modern",          label: "Modern",           weight: 4,   primary: false },
    ],
  },
];

/** Derived from INTENT_GROUPS — score.ts consumes this unchanged. */
export const MODE_TAG_WEIGHTS: Record<RecommendationMode, Record<string, number>> =
  Object.fromEntries(
    INTENT_GROUPS.map((g) => [
      g.id,
      Object.fromEntries(g.subTags.map((t) => [t.slug, t.weight])),
    ]),
  ) as Record<RecommendationMode, Record<string, number>>;
