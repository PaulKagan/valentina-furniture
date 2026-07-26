import { effectivePrice } from "./pricing";

/**
 * "Similar items" scoring — pure, client-safe (no DB imports).
 *
 * Given a reference product (or a set of active filters) and a candidate
 * pool, rank candidates by how close they are. Scoring is deliberately
 * simple and explainable rather than clever:
 *
 *   same category            +50   (strongest signal for furniture)
 *   same category branch     +30   (sibling subcategory)
 *   each shared color        +12   (capped at 24)
 *   price within ±20% / ±40% +20 / +10
 *   similar width (±20%)     +10   (fits the same space)
 *   in stock                 +8    (don't recommend what can't be bought)
 *
 * Anything scoring 0 is dropped: showing unrelated products is worse
 * than showing nothing.
 */

export type SimilarCandidate = {
  id: number;
  categoryId: number | null;
  colors: string[];
  price: string;
  salePrice: string | null;
  widthCm: number | null;
  inStock: boolean;
};

export type SimilarRef = {
  id?: number;
  categoryId?: number | null;
  /** category + descendants, for the "same branch" bonus */
  branchIds?: number[];
  colors?: string[];
  price?: number | null;
  widthCm?: number | null;
};

function score(candidate: SimilarCandidate, ref: SimilarRef): number {
  let s = 0;

  if (ref.categoryId != null && candidate.categoryId === ref.categoryId) {
    s += 50;
  } else if (
    ref.branchIds?.length &&
    candidate.categoryId != null &&
    ref.branchIds.includes(candidate.categoryId)
  ) {
    s += 30;
  }

  if (ref.colors?.length && candidate.colors.length) {
    const shared = candidate.colors.filter((c) => ref.colors!.includes(c)).length;
    s += Math.min(shared * 12, 24);
  }

  if (ref.price != null && ref.price > 0) {
    const price = effectivePrice(candidate);
    const diff = Math.abs(price - ref.price) / ref.price;
    if (diff <= 0.2) s += 20;
    else if (diff <= 0.4) s += 10;
  }

  if (ref.widthCm && candidate.widthCm) {
    const diff = Math.abs(candidate.widthCm - ref.widthCm) / ref.widthCm;
    if (diff <= 0.2) s += 10;
  }

  if (candidate.inStock) s += 8;

  return s;
}

/**
 * Best matches for a reference, excluding the reference itself.
 * Returns at most `limit` candidates, highest score first.
 */
export function pickSimilar<T extends SimilarCandidate>(
  candidates: T[],
  ref: SimilarRef,
  limit = 4
): T[] {
  return candidates
    .filter((c) => c.id !== ref.id)
    .map((c) => ({ item: c, s: score(c, ref) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || effectivePrice(a.item) - effectivePrice(b.item))
    .slice(0, limit)
    .map((x) => x.item);
}
