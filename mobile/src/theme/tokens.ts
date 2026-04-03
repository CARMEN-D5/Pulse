import { DomainKey } from "@velora/shared";

export const theme = {
  colors: {
    background: "#F8FAF1",
    backgroundAlt: "#F2F6EC",
    surface: "rgba(255, 255, 255, 0.62)",
    surfaceStrong: "rgba(255, 255, 255, 0.82)",
    surfaceMuted: "rgba(255, 255, 255, 0.48)",
    border: "rgba(255, 255, 255, 0.72)",
    borderMuted: "rgba(8, 106, 105, 0.10)",
    text: "#2E342A",
    textMuted: "#5B6156",
    textSoft: "#7B8277",
    primary: "#086A69",
    primaryPressed: "#005D5C",
    primarySoft: "#9CEBE8",
    secondary: "#4E607F",
    secondarySoft: "#D6E3FF",
    tertiary: "#983F72",
    tertiarySoft: "#FF98CD",
    success: "#2F8C68",
    warning: "#C48A2B",
    danger: "#AC3434",
    shadow: "rgba(8, 106, 105, 0.14)"
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40
  },
  radii: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    pill: 999
  }
} as const;

export const domainTheme: Record<
  DomainKey,
  {
    accent: string;
    soft: string;
    icon: string;
    shortLabel: string;
  }
> = {
  spirituality: {
    accent: theme.colors.primary,
    soft: "rgba(156, 235, 232, 0.34)",
    icon: "star-outline",
    shortLabel: "Spirit"
  },
  family_friends: {
    accent: theme.colors.secondary,
    soft: "rgba(214, 227, 255, 0.58)",
    icon: "account-group-outline",
    shortLabel: "Family"
  },
  work_productivity: {
    accent: "#50624C",
    soft: "rgba(221, 231, 212, 0.78)",
    icon: "briefcase-outline",
    shortLabel: "Work"
  },
  health: {
    accent: "#1E8E82",
    soft: "rgba(181, 241, 229, 0.54)",
    icon: "heart-pulse",
    shortLabel: "Health"
  },
  financial_wellbeing: {
    accent: theme.colors.tertiary,
    soft: "rgba(255, 152, 205, 0.32)",
    icon: "cash-multiple",
    shortLabel: "Finance"
  }
};

export function createShadow(depth: "sm" | "md" | "lg") {
  if (depth === "sm") {
    return {
      elevation: 2,
      shadowColor: "#086A69",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16
    };
  }

  if (depth === "lg") {
    return {
      elevation: 8,
      shadowColor: "#086A69",
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.18,
      shadowRadius: 28
    };
  }

  return {
    elevation: 4,
    shadowColor: "#086A69",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22
  };
}
