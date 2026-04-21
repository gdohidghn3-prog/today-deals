"use client";

import { useMemo } from "react";
import recurringData from "@/data/recurring-perks.json";
import type { RecurringPerk, IntegrationTarget } from "@/types/perks";
import { selectFeatured, resolveSchedule, filterByTarget } from "@/lib/recurring-rule";
import RecurringPerkCard from "./RecurringPerkCard";

const PERKS = recurringData as RecurringPerk[];

export function UpcomingPerksFeatured() {
  const today = useMemo(() => new Date(), []);
  const result = useMemo(() => selectFeatured(PERKS, today, 5), [today]);

  if (result.perks.length === 0) return null;

  const title = result.fallbackTitle ?? "💎 이번주 놓치지 마세요";

  return (
    <section className="mb-6 -mx-4 px-4">
      <h2 className="text-base font-bold text-[#1A1A2E] mb-3">{title}</h2>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
        {result.perks.map(({ perk, resolved }) => (
          <div key={perk.id} className="snap-start">
            <RecurringPerkCard perk={perk} resolved={resolved} variant="featured" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function CategoryRecurringPerks({
  target,
  title,
  emoji,
}: {
  target: IntegrationTarget;
  title: string;
  emoji?: string;
}) {
  const today = useMemo(() => new Date(), []);
  const items = useMemo(() => {
    return filterByTarget(PERKS, target).map((perk) => ({
      perk,
      resolved: resolveSchedule(perk, today),
    }));
  }, [target, today]);

  if (items.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-base font-bold text-[#1A1A2E] mb-3">
        {emoji ? `${emoji} ` : ""}
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ perk, resolved }) => (
          <RecurringPerkCard key={perk.id} perk={perk} resolved={resolved} variant="compact" />
        ))}
      </div>
    </section>
  );
}
