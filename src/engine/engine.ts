import {
  CATEGORIES,
  EMOJIS,
  type Emoji,
  type EmojiCategory,
} from "./emojiData";

export interface SearchOptions {
  category?: EmojiCategory | "all";
  limit?: number;
}

/**
 * Rank a single emoji against a normalized query. Higher is more relevant.
 * Returns 0 when the emoji does not match at all.
 */
export function scoreEmoji(emoji: Emoji, query: string): number {
  const q = query.trim().toLowerCase();
  if (q === "") return 1;

  const name = emoji.name.toLowerCase();
  let score = 0;

  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 60;
  else if (name.includes(q)) score += 30;

  for (const keyword of emoji.keywords) {
    const k = keyword.toLowerCase();
    if (k === q) score += 50;
    else if (k.startsWith(q)) score += 25;
    else if (k.includes(q)) score += 10;
  }

  // Allow matching the literal emoji character (e.g. pasting "🔥").
  if (emoji.char === q) score += 100;

  return score;
}

/**
 * Search the emoji catalog by free-text query with optional category filter.
 * Results are sorted by descending relevance, then alphabetically by name for
 * stable ordering.
 */
export function searchEmojis(
  query: string,
  options: SearchOptions = {},
): Emoji[] {
  const { category = "all", limit } = options;

  const pool =
    category === "all"
      ? EMOJIS
      : EMOJIS.filter((e) => e.category === category);

  const scored = pool
    .map((emoji) => ({ emoji, score: scoreEmoji(emoji, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.emoji.name.localeCompare(b.emoji.name);
    })
    .map((entry) => entry.emoji);

  return typeof limit === "number" ? scored.slice(0, limit) : scored;
}

export interface CategoryCount {
  category: EmojiCategory;
  count: number;
}

/** Count how many emojis exist per category, in canonical category order. */
export function countByCategory(): CategoryCount[] {
  return CATEGORIES.map((category) => ({
    category,
    count: EMOJIS.filter((e) => e.category === category).length,
  }));
}

export interface Composition {
  slots: string[];
}

export const MAX_COMPOSITION_SLOTS = 12;

export function emptyComposition(): Composition {
  return { slots: [] };
}

/** Append an emoji character to a composition, respecting the max length. */
export function addToComposition(
  composition: Composition,
  char: string,
): Composition {
  if (composition.slots.length >= MAX_COMPOSITION_SLOTS) {
    return composition;
  }
  return { slots: [...composition.slots, char] };
}

/** Remove the emoji at a given index (no-op for out-of-range indices). */
export function removeFromComposition(
  composition: Composition,
  index: number,
): Composition {
  if (index < 0 || index >= composition.slots.length) {
    return composition;
  }
  return { slots: composition.slots.filter((_, i) => i !== index) };
}

/** Render a composition to a plain string suitable for copy/paste. */
export function renderComposition(composition: Composition): string {
  return composition.slots.join("");
}
