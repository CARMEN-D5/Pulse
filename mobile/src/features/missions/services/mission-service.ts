import AsyncStorage from "@react-native-async-storage/async-storage";
import { type DomainKey } from "@velora/shared";

import { type DashboardSnapshot } from "@/features/summary/services/summary-service";

export type WeeklyMission = {
  actionLabel: string;
  body: string;
  completionLabel: string;
  domainKey?: DomainKey;
  iconName: string;
  id: string;
  route: string;
  title: string;
};

type StoredMissionState = Record<string, boolean>;

const STORAGE_PREFIX = "velora:weekly-missions";

function getMissionStorageKey(userId: string, weekKey: string) {
  return `${STORAGE_PREFIX}:${userId}:${weekKey}`;
}

function createDomainMission(
  weekKey: string,
  domainKey: DomainKey,
  config: Omit<WeeklyMission, "domainKey" | "id">
): WeeklyMission {
  return {
    ...config,
    domainKey,
    id: `${weekKey}:${domainKey}:${config.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
  };
}

export function deriveWeeklyMissions(snapshot: DashboardSnapshot | null): WeeklyMission[] {
  const weekKey = snapshot?.lifeSummary?.weekStartLocalDate ?? "setup-week";

  if (!snapshot?.lifeSummary || !snapshot.domainSummaries.length) {
    return [
      {
        actionLabel: "Open check-in",
        body: "Fill all five daily check-ins so VELORA can build your first official weekly picture.",
        completionLabel: "Daily rhythm started",
        iconName: "checkbox-marked-circle-outline",
        id: `${weekKey}:starter-checkin`,
        route: "/(app)/(tabs)/check-in",
        title: "Start your weekly rhythm"
      },
      {
        actionLabel: "Log an action",
        body: "Capture one meaningful action in any domain to begin shaping your first weekly summary.",
        completionLabel: "First action logged",
        iconName: "rocket-launch-outline",
        id: `${weekKey}:starter-action`,
        route: "/(app)/(tabs)/actions",
        title: "Create your first proof point"
      }
    ];
  }

  const weakestDomainKey = snapshot.lifeSummary.weakestDomainKey ?? snapshot.domainSummaries[0]?.domainKey;
  const strongestDomainKey =
    snapshot.lifeSummary.strongestDomainKey ?? snapshot.domainSummaries[0]?.domainKey;

  const domainMissionConfigs: Record<
    DomainKey,
    Omit<WeeklyMission, "domainKey" | "id">
  > = {
    spirituality: {
      actionLabel: "Open journal",
      body: "Write one honest reflection or mindfulness note to give this domain a steadier signal this week.",
      completionLabel: "Reflection captured",
      iconName: "star-four-points-circle-outline",
      route: "/(app)/actions/journal",
      title: "Reconnect with stillness"
    },
    family_friends: {
      actionLabel: "Open connection log",
      body: "Record one meaningful conversation or supportive reach-out while this area needs extra care.",
      completionLabel: "Connection logged",
      iconName: "account-heart-outline",
      route: "/(app)/actions/connection",
      title: "Strengthen one relationship"
    },
    work_productivity: {
      actionLabel: "Open tasks",
      body: "Complete one important task or focused work block to rebuild momentum where it’s slipping.",
      completionLabel: "Work mission done",
      iconName: "briefcase-check-outline",
      route: "/(app)/actions/task",
      title: "Create one clean win"
    },
    health: {
      actionLabel: "Open health actions",
      body: "Log one movement or sleep-supporting action to stabilize your health score this week.",
      completionLabel: "Health mission done",
      iconName: "heart-pulse",
      route: "/(app)/actions/activity",
      title: "Protect your energy"
    },
    financial_wellbeing: {
      actionLabel: "Open finance actions",
      body: "Log one budget review, savings action, or expense check-in to bring clarity back to this domain.",
      completionLabel: "Finance mission done",
      iconName: "cash-check",
      route: "/(app)/actions/financial",
      title: "Do one money reset"
    }
  };

  const missions: WeeklyMission[] = [];

  if (weakestDomainKey) {
    missions.push(createDomainMission(weekKey, weakestDomainKey, domainMissionConfigs[weakestDomainKey]));
  }

  if (strongestDomainKey) {
    const sustainConfig: Record<DomainKey, Omit<WeeklyMission, "domainKey" | "id">> = {
      spirituality: {
        actionLabel: "Open journal",
        body: "Repeat the spiritual practice that is already helping you stay balanced this week.",
        completionLabel: "Anchor habit repeated",
        iconName: "weather-sunset-up",
        route: "/(app)/actions/journal",
        title: "Protect your strongest habit"
      },
      family_friends: {
        actionLabel: "Open connection log",
        body: "Double down on the relationship habit that is already supporting your balance.",
        completionLabel: "Support habit repeated",
        iconName: "account-multiple-check-outline",
        route: "/(app)/actions/connection",
        title: "Reinforce your support system"
      },
      work_productivity: {
        actionLabel: "Open focus sessions",
        body: "Repeat one focused block so your strongest domain keeps lifting the rest of the week.",
        completionLabel: "Focus block repeated",
        iconName: "timer-cog-outline",
        route: "/(app)/actions/focus",
        title: "Keep your momentum warm"
      },
      health: {
        actionLabel: "Open sleep log",
        body: "Repeat one health-supporting habit so your best domain stays stable, not accidental.",
        completionLabel: "Health rhythm protected",
        iconName: "run-fast",
        route: "/(app)/actions/sleep",
        title: "Hold your healthy baseline"
      },
      financial_wellbeing: {
        actionLabel: "Open expense log",
        body: "Keep your current financial clarity by recording one more money action this week.",
        completionLabel: "Money rhythm protected",
        iconName: "bank-check-outline",
        route: "/(app)/actions/expense",
        title: "Preserve your money rhythm"
      }
    };

    const sustainMission = createDomainMission(weekKey, strongestDomainKey, sustainConfig[strongestDomainKey]);

    if (!missions.some((mission) => mission.id === sustainMission.id)) {
      missions.push(sustainMission);
    }
  }

  missions.push({
    actionLabel: "Open check-in",
    body: "Complete today’s five-domain check-in to keep your streak alive and sharpen next week’s mission choices.",
    completionLabel: "Daily rhythm protected",
    iconName: "calendar-check-outline",
    id: `${weekKey}:daily-rhythm`,
    route: "/(app)/(tabs)/check-in",
    title: "Lock in your daily rhythm"
  });

  return missions;
}

export async function loadMissionCompletionState(userId: string, weekKey: string) {
  const raw = await AsyncStorage.getItem(getMissionStorageKey(userId, weekKey));

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as StoredMissionState;
  } catch {
    return {};
  }
}

export async function saveMissionCompletionState(
  userId: string,
  weekKey: string,
  state: StoredMissionState
) {
  await AsyncStorage.setItem(getMissionStorageKey(userId, weekKey), JSON.stringify(state));
}
