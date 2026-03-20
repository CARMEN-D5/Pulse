/**
 * Domain definitions for the 5 life balance areas.
 * These are used throughout the app for scoring, display, and navigation.
 */

export type DomainId =
  | "spirituality"
  | "health"
  | "financial"
  | "social"
  | "productivity";

export interface DomainConfig {
  id: DomainId;
  label: string;
  description: string;
  icon: string; // icon name from your icon library
  color: string; // hex colour
  lightColor: string; // lighter variant for backgrounds
  checkInQuestion: string;
}

export const DOMAINS: Record<DomainId, DomainConfig> = {
  spirituality: {
    id: "spirituality",
    label: "Mental / Spirituality",
    description: "Inner fulfilment, self-awareness, personal meaning, and interests",
    icon: "brain",
    color: "#8B5CF6",
    lightColor: "#EDE9FE",
    checkInQuestion: "Did you do something today that connected you to your values or sense of purpose?",
  },
  health: {
    id: "health",
    label: "Physical Health",
    description: "Exercise, sleep, nutrition, and physical wellbeing",
    icon: "heart-pulse",
    color: "#EF4444",
    lightColor: "#FEE2E2",
    checkInQuestion: "Did you take care of your physical or mental health today?",
  },
  financial: {
    id: "financial",
    label: "Financial",
    description: "Budget management, spending habits, and financial confidence",
    icon: "wallet",
    color: "#10B981",
    lightColor: "#D1FAE5",
    checkInQuestion: "Did you make a positive financial decision today?",
  },
  social: {
    id: "social",
    label: "Social Connection",
    description: "Friendships, family relationships, and community",
    icon: "users",
    color: "#F59E0B",
    lightColor: "#FEF3C7",
    checkInQuestion: "Did you connect with family or friends today?",
  },
  productivity: {
    id: "productivity",
    label: "Productivity",
    description: "Work, study, personal goals, and task management",
    icon: "target",
    color: "#3B82F6",
    lightColor: "#DBEAFE",
    checkInQuestion: "Did you make meaningful progress in your work or responsibilities today?",
  },
};

export const DOMAIN_IDS = Object.keys(DOMAINS) as DomainId[];
export const DOMAIN_COUNT = DOMAIN_IDS.length;
