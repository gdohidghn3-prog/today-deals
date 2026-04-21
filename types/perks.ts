export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type RecurringRule =
  | { type: "monthly_day"; day: number }
  | { type: "monthly_last_weekday"; weekday: Weekday }
  | { type: "monthly_nth_weekday"; n: number; weekday: Weekday }
  | { type: "weekly"; weekday: Weekday };

export type RecurringSchedule =
  | { mode: "rule"; rule: RecurringRule }
  | {
      mode: "manual_window";
      cadence: "monthly" | "quarterly" | "seasonal";
      nextKnownStart?: string;
      nextKnownEnd?: string;
      label: string;
      confidence: "confirmed" | "estimated";
    };

export type IntegrationTarget = "home" | "culture" | "convenience" | "oliveyoung";
export type VerificationLevel = "confirmed" | "estimated";

export interface RecurringPerk {
  id: string;
  title: string;
  brand: string;
  category: string;
  schedule: RecurringSchedule;
  description: string;
  expectedDiscountText?: string;
  expectedSavingScore?: number;
  officialUrl: string;
  notes?: string;
  lastVerified: string;
  verificationLevel: VerificationLevel;
  integrationTargets: IntegrationTarget[];
}

export type BirthdayCategory =
  | "cafe"
  | "bakery"
  | "convenience"
  | "movie"
  | "beauty"
  | "book";

export interface BirthdayPerk {
  id: string;
  brand: string;
  membership: string;
  benefit: string;
  membershipUrl: string;
  category: BirthdayCategory;
  eligibility?: string;
  issueWindow?: string;
  requiresJoinBefore?: string;
  claimMethod?: string;
  notes?: string;
  lastVerified: string;
  verificationLevel: VerificationLevel;
}
