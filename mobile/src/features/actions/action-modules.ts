export const ACTION_MODULES = {
  activity: {
    description: "Log movement that helped your body feel supported today.",
    title: "Activity"
  },
  connection: {
    description: "Capture meaningful moments with friends, family, or your support network.",
    title: "Connection Log"
  },
  expense: {
    description: "Capture a quick expense so money decisions stay visible and calm.",
    title: "Expense Log"
  },
  financial: {
    description: "Record a budgeting or savings step that helped you feel more in control.",
    title: "Budget / Savings"
  },
  focus: {
    description: "Track a stretch of focused work that moved something meaningful forward.",
    title: "Focus Session"
  },
  journal: {
    description: "Write a short reflection to slow down and notice what matters.",
    title: "Journal"
  },
  sleep: {
    description: "Log last night’s rest in one quick step.",
    title: "Sleep"
  },
  task: {
    description: "Capture an important task and mark it done when it is finished.",
    title: "Tasks"
  }
} as const;

export type ActionModuleKey = keyof typeof ACTION_MODULES;

export function isActionModuleKey(value: string): value is ActionModuleKey {
  return value in ACTION_MODULES;
}
