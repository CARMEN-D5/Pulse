export const DOMAIN_KEYS = [
  "spirituality",
  "family_friends",
  "work_productivity",
  "health",
  "financial_wellbeing"
] as const;

export type DomainKey = (typeof DOMAIN_KEYS)[number];

export const DOMAIN_LABELS: Record<DomainKey, string> = {
  spirituality: "Spirituality",
  family_friends: "Family and Friends",
  work_productivity: "Work/Productivity",
  health: "Health",
  financial_wellbeing: "Financial Wellbeing"
};
