/**
 * Difficulty tiers. The app is for mixed-age game nights, so every deck is
 * authored across all three and the chosen tier widens or narrows the pool.
 */
export type Tier = "little" | "family" | "tricky";

export const TIERS: { id: Tier; label: string; blurb: string; emoji: string }[] =
  [
    {
      id: "little",
      label: "Little Kids",
      blurb: "Simple words everyone under 7 will know",
      emoji: "🧸",
    },
    {
      id: "family",
      label: "Family",
      blurb: "The everyone-plays setting",
      emoji: "🏡",
    },
    {
      id: "tricky",
      label: "Tricky",
      blurb: "Harder words for older kids and grown-ups",
      emoji: "🧠",
    },
  ];

/**
 * Which tiers a setting actually draws from. Each choice includes the tier
 * below it so the pool stays big, without dropping toddler words into the
 * grown-ups' game.
 */
export function tiersFor(tier: Tier): Tier[] {
  switch (tier) {
    case "little":
      return ["little"];
    case "family":
      return ["little", "family"];
    case "tricky":
      return ["family", "tricky"];
  }
}

/** One entry in any deck. */
export type Entry = {
  text: string;
  tier: Tier;
};

/** Convenience for authoring decks: `t("Elephant", "little")`. */
export function t(text: string, tier: Tier): Entry {
  return { text, tier };
}

export function filterByTier(entries: Entry[], tier: Tier): Entry[] {
  const allowed = new Set(tiersFor(tier));
  return entries.filter((e) => allowed.has(e.tier));
}

/** A themed pack of entries the player picks before a round. */
export type DeckCategory = {
  id: string;
  name: string;
  emoji: string;
  entries: Entry[];
};

/**
 * Categories that still have enough material at the chosen tier. A pack with
 * two words left is worse than no pack at all, so thin ones are hidden.
 */
export function usableCategories(
  categories: DeckCategory[],
  tier: Tier,
  minimum = 6,
): DeckCategory[] {
  return categories
    .map((c) => ({ ...c, entries: filterByTier(c.entries, tier) }))
    .filter((c) => c.entries.length >= minimum);
}
