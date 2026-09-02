// Stable semantic keys shared by tutorial definitions and live UI targets.
// Keep these names tied to product concepts rather than layout positions so
// ordinary spacing and responsive-layout changes do not invalidate tutorials.
export const TUTORIAL_TARGETS = {
  home: {
    dailyMissions: "home.dailyMissions",
    domainCard: "home.domainCard",
  },
  navigation: {
    home: "navigation.homeTab",
    features: "navigation.featuresTab",
    social: "navigation.socialTab",
    profile: "navigation.profileTab",
  },
  features: {
    list: "features.toolList",
    missions: "features.dailyMissionsTool",
  },
  budget: {
    tabs: "budget.spendingSavingTabs",
    settings: "budget.settingsButton",
    categoryLimits: "budget.settings.categoryLimits",
    summary: "budget.monthSummary",
    addExpense: "budget.addExpenseForm",
  },
  saving: {
    planArea: "saving.planArea",
    createPlan: "saving.createPlanButton",
    calendar: "saving.calendar",
  },
  todo: {
    form: "todo.addForm",
    filters: "todo.filters",
    list: "todo.taskList",
  },
  activity: {
    pages: "activity.pageTabs",
    form: "activity.form",
    submit: "activity.submitButton",
  },
  journal: {
    today: "journal.today",
    week: "journal.week",
    entries: "journal.entries",
  },
  domain: {
    reflection: "domain.reflection",
    actions: "domain.actions",
  },
  missions: {
    list: "missions.list",
    history: "missions.historyButton",
  },
  social: {
    tabs: "social.tabs",
    content: "social.content",
  },
  profile: {
    analytics: "profile.analytics",
    settings: "profile.settingsButton",
  },
};
