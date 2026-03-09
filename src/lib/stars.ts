const STAR_FILLED = "\u2605"; // ★
const STAR_EMPTY = "\u2606"; // ☆

export function renderStars(count: number, total = 3): string {
  return STAR_FILLED.repeat(count) + STAR_EMPTY.repeat(total - count);
}
