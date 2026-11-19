// Pure price math (no database, no screens), shared by billing and the admin
// pages, and covered by tests in tests/unit/pricing.test.ts.

/** Volume bracket: the whole count is priced at the bracket it falls in. */
export interface PriceTier {
  upTo: number | null;
  price: number;
}

/** Unit price for a count: the matching tier, else the plan's base price. */
export function unitPriceFor(tiers: PriceTier[], base: number, units: number): number {
  const sorted = [...tiers].sort((a, b) => (a.upTo ?? Infinity) - (b.upTo ?? Infinity));
  return sorted.find((t) => t.upTo === null || units <= t.upTo)?.price ?? base;
}

/** Tiers as the database stores them ({up_to, price}). Bad entries are dropped. */
export const toTiers = (raw: unknown): PriceTier[] =>
  Array.isArray(raw)
    ? raw
        .map((t: { up_to?: number | null; price?: number }) => ({ upTo: t?.up_to ?? null, price: Number(t?.price ?? 0) }))
        .filter((t) => Number.isFinite(t.price))
    : [];

export interface PeriodPlan {
  cycle: 'monthly' | 'yearly';
  pricePerStudent: number;
  tiers: PriceTier[];
  installments: number;
}

/** Platform fee for a period from actual usage (no minimum), split into installments for yearly plans. */
export function periodDue(plan: PeriodPlan | null, units: number): number {
  if (!plan) return 0;
  const total = units * unitPriceFor(plan.tiers, plan.pricePerStudent, units);
  return Math.round((total / (plan.cycle === 'yearly' ? Math.max(1, plan.installments) : 1)) * 100) / 100;
}
