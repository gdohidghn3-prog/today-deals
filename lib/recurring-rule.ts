import type {
  RecurringPerk,
  RecurringRule,
  RecurringSchedule,
  IntegrationTarget,
} from "@/types/perks";

const MS_DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_DAY);
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  const offset = (lastDay.getDay() - weekday + 7) % 7;
  return new Date(year, month, lastDay.getDate() - offset);
}

function nthWeekdayOfMonth(year: number, month: number, n: number, weekday: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

export function nextOccurrence(rule: RecurringRule, from: Date): Date | null {
  const today = startOfDay(from);
  for (let monthOffset = 0; monthOffset < 4; monthOffset++) {
    const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const y = base.getFullYear();
    const m = base.getMonth();

    if (rule.type === "monthly_day") {
      const lastDay = new Date(y, m + 1, 0).getDate();
      if (rule.day > lastDay) continue;
      const candidate = new Date(y, m, rule.day);
      if (candidate >= today) return candidate;
    } else if (rule.type === "monthly_last_weekday") {
      const candidate = lastWeekdayOfMonth(y, m, rule.weekday);
      if (candidate >= today) return candidate;
    } else if (rule.type === "monthly_nth_weekday") {
      const candidate = nthWeekdayOfMonth(y, m, rule.n, rule.weekday);
      if (candidate.getMonth() !== m) continue;
      if (candidate >= today) return candidate;
    } else if (rule.type === "weekly") {
      for (let i = 0; i < 7; i++) {
        const c = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i + monthOffset * 7);
        if (c.getDay() === rule.weekday) return c;
      }
    }
  }
  return null;
}

export interface ResolvedSchedule {
  date: Date | null;
  daysUntil: number | null;
  label: string;
  badge: "verified" | "needs_check" | "estimated_window";
}

export function resolveSchedule(perk: RecurringPerk, today: Date): ResolvedSchedule {
  const verifiedDays = daysBetween(new Date(perk.lastVerified), today);
  const isStale = verifiedDays > 90;
  const isEstimated = perk.verificationLevel === "estimated";
  const baseBadge: ResolvedSchedule["badge"] = isStale || isEstimated ? "needs_check" : "verified";

  if (perk.schedule.mode === "rule") {
    const date = nextOccurrence(perk.schedule.rule, today);
    return {
      date,
      daysUntil: date ? daysBetween(today, date) : null,
      label: date ? formatDateLabel(date, today) : "",
      badge: baseBadge,
    };
  }

  const w = perk.schedule;
  if (w.nextKnownStart) {
    const date = new Date(w.nextKnownStart);
    return {
      date,
      daysUntil: daysBetween(today, date),
      label: w.label,
      badge: w.confidence === "estimated" ? "estimated_window" : baseBadge,
    };
  }
  return {
    date: null,
    daysUntil: null,
    label: w.label,
    badge: "estimated_window",
  };
}

function formatDateLabel(date: Date, today: Date): string {
  const days = daysBetween(today, date);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const wk = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  if (days === 0) return `오늘 (${m}/${d} ${wk})`;
  if (days === 1) return `내일 (${m}/${d} ${wk})`;
  return `${m}/${d}(${wk}) · D-${days}`;
}

export interface FeaturedResult {
  perks: { perk: RecurringPerk; resolved: ResolvedSchedule }[];
  title: string;
}

function endOfThisWeek(today: Date): Date {
  const d = startOfDay(today);
  const dow = d.getDay();
  const daysToSun = (7 - dow) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + daysToSun);
}

export function selectFeatured(
  perks: RecurringPerk[],
  today: Date,
  limit = 5
): FeaturedResult {
  const isHomePerk = (p: RecurringPerk) => p.integrationTargets.includes("home");
  const isFresh = (p: RecurringPerk) =>
    p.verificationLevel === "confirmed" && daysBetween(new Date(p.lastVerified), today) <= 90;

  const candidates = perks
    .filter(isHomePerk)
    .filter(isFresh)
    .map((perk) => ({ perk, resolved: resolveSchedule(perk, today) }))
    .filter((x) => x.resolved.daysUntil !== null && x.resolved.daysUntil! >= 0);

  const weekEndDays = daysBetween(today, endOfThisWeek(today));

  const thisWeek = candidates
    .filter((x) => x.resolved.daysUntil! <= weekEndDays)
    .sort(sortByDayThenScore)
    .slice(0, limit);

  if (thisWeek.length > 0) {
    return { perks: thisWeek, title: "💎 이번주 놓치지 마세요" };
  }

  const within14 = candidates
    .filter((x) => x.resolved.daysUntil! <= 14)
    .sort(sortByDayThenScore)
    .slice(0, limit);

  if (within14.length > 0) {
    return { perks: within14, title: "💎 곧 챙길 정기 혜택" };
  }

  const within30 = candidates
    .filter((x) => x.resolved.daysUntil! <= 30)
    .sort(sortByDayThenScore)
    .slice(0, 1);

  if (within30.length > 0) {
    return { perks: within30, title: "💎 다가오는 정기 혜택" };
  }
  return { perks: [], title: "" };
}

function sortByDayThenScore(
  a: { perk: RecurringPerk; resolved: ResolvedSchedule },
  b: { perk: RecurringPerk; resolved: ResolvedSchedule }
): number {
  const dayDiff = (a.resolved.daysUntil ?? 999) - (b.resolved.daysUntil ?? 999);
  if (dayDiff !== 0) return dayDiff;
  return (b.perk.expectedSavingScore ?? 0) - (a.perk.expectedSavingScore ?? 0);
}

export function filterByTarget(
  perks: RecurringPerk[],
  target: IntegrationTarget
): RecurringPerk[] {
  return perks.filter((p) => p.integrationTargets.includes(target));
}

export function isExpired(schedule: RecurringSchedule, today: Date): boolean {
  if (schedule.mode !== "manual_window" || !schedule.nextKnownEnd) return false;
  return new Date(schedule.nextKnownEnd) < startOfDay(today);
}
