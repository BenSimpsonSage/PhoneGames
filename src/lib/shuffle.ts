/** Fisher-Yates. Returns a new array; never mutates the input deck. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Draws from a deck without repeating until the deck is exhausted, then
 * reshuffles. Plain `Math.random()` picking feels broken to kids — the same
 * word coming up twice in one round reads as a bug, not as chance.
 */
export class Dealer<T> {
  private pile: T[] = [];

  constructor(private readonly source: readonly T[]) {
    this.pile = shuffle(source);
  }

  next(): T | undefined {
    if (this.source.length === 0) return undefined;
    if (this.pile.length === 0) this.pile = shuffle(this.source);
    return this.pile.pop();
  }

  /** How many are left before the deck loops around. */
  get remaining(): number {
    return this.pile.length;
  }
}
