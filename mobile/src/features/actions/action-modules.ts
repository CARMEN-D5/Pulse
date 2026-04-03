export const ACTION_MODULES = {
  activity: {
    description: "Record exercise or movement that should feed the Health action score.",
    title: "Activity"
  },
  connection: {
    description: "Capture meaningful moments with friends, family, or your support network.",
    title: "Connection Log"
  },
  expense: {
    description: "Log quick expenses that contribute to Financial Wellbeing awareness.",
    title: "Expense Log"
  },
  financial: {
    description: "Record budget reviews, savings steps, or other financial improvement actions.",
    title: "Budget / Savings"
  },
  focus: {
    description: "Track deep work sessions that normalize into the Work/Productivity domain.",
    title: "Focus Session"
  },
  journal: {
    description: "Write a reflection entry for the Spirituality domain.",
    title: "Journal"
  },
  sleep: {
    description: "Capture a quick sleep record using the current time as the wake time for V1.",
    title: "Sleep"
  },
  task: {
    description: "Create and complete important tasks for Work/Productivity.",
    title: "Tasks"
  }
} as const;

export type ActionModuleKey = keyof typeof ACTION_MODULES;

export function isActionModuleKey(value: string): value is ActionModuleKey {
  return value in ACTION_MODULES;
}
