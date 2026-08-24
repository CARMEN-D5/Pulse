import { TUTORIAL_TARGETS as TARGET } from "./tutorialTargets";

// Central tutorial catalogue. Bump a tutorial's version whenever existing
// users should see materially changed guidance again.

const ROUTES = {
  home: { view: "home" },
  features: { view: "features" },
  finance: { view: "finance" },
  todo: { view: "todo" },
  activity: { view: "domain", domain: "health" },
  journal: { view: "domain", domain: "spirituality" },
  relationships: { view: "domain", domain: "relationships" },
  missions: { view: "missions" },
  social: { view: "social" },
  profile: { view: "profile" },
};

const onRoute = (route, steps) =>
  // Route ownership is authoritative for the tutorial, even if an older
  // step object still contains a stale route field.
  steps.map((step) => ({ interaction: "explanation", ...step, route }));

export const TUTORIALS = {
  appOverview: {
    version: 1,
    title: "Welcome to Pulse",
    steps: onRoute(ROUTES.home, [
      {
        route: { view: "home" },
        target: TARGET.home.dailyMissions,
        title: "Your daily missions",
        body: "Pulse gives you three small missions each day, with extra attention on the life areas that need it most.",
      },
      {
        route: { view: "home" },
        target: TARGET.home.domainCard,
        title: "Your five life areas",
        body: "See your scores across five life areas. Switch between Diagram and Details to view your balance in different ways.",
      },
      {
        route: { view: "home" },
        target: TARGET.navigation.features,
        title: "Tools",
        body: "Features is the quickest way to open your journal, to-do list, budget, activity tracker and missions.",
      },
      {
        route: { view: "home" },
        target: TARGET.navigation.social,
        title: "Social",
        body: "Share daily check-ins and achievements, connect with friends and send direct messages.",
      },
      {
        route: { view: "home" },
        target: TARGET.navigation.profile,
        title: "Progress and help",
        body: "Profile shows your score trends. You can replay any tutorial later from Settings → Help & tutorials.",
        ctaLabel: "Got it",
      },
    ]),
  },

  features: {
    version: 1,
    title: "Pulse tools",
    steps: onRoute(ROUTES.features, [
      {
        route: { view: "features" },
        target: TARGET.features.list,
        title: "Everything in one place",
        body: "Each card opens a focused tool. Journal supports spirituality, To-do supports productivity, Budget supports finance and Activity supports health.",
      },
      {
        route: { view: "features" },
        target: TARGET.features.missions,
        title: "Daily Missions",
        body: "Open Daily Missions here whenever you want a full-screen view or need to review mission history.",
        ctaLabel: "Explore tools",
      },
    ]),
  },

  financeSpending: {
    version: 1,
    title: "Budget Tracker",
    steps: onRoute(ROUTES.finance, [
      {
        route: { view: "finance" },
        target: TARGET.budget.tabs,
        title: "Spending and Saving",
        body: "Use Spending for budgets and expenses. Switch to Saving for goals and saving records.",
        before: "showSpending",
      },
      {
        route: { view: "finance" },
        target: TARGET.budget.settings,
        title: "Set your monthly budgets",
        body: "Open Settings to set a monthly limit for each category and manage the accounts you spend from.",
        before: "closeSettings",
      },
      {
        route: { view: "finance" },
        target: TARGET.budget.categoryLimits,
        host: "financeSettings",
        title: "Category limits",
        body: "Enter the most you want to spend in each category each month, then press Save.",
        before: "openSettings",
      },
      {
        route: { view: "finance" },
        target: TARGET.budget.summary,
        title: "Understand your month",
        body: "The chart, calendar and category bars compare this month's spending with the budgets you set.",
        before: "closeSettings",
      },
      {
        route: { view: "finance" },
        target: TARGET.budget.addExpense,
        title: "Record an expense",
        body: "Enter an amount, choose its category and account, select the date and press Add expense.",
        before: "showAddExpense",
        ctaLabel: "Try it now",
      },
    ]),
  },

  savingOverview: {
    version: 2,
    title: "Saving Plans",
    steps: onRoute(ROUTES.finance, [
      {
        route: { view: "finance" },
        target: TARGET.saving.planArea,
        before: "showSaving",
        title: "Create a saving goal",
        body: "A saving plan helps you work toward a target. Add a name, amount, due date, icon and colour, then track your progress here.",
      },
      {
        route: { view: "finance" },
        target: TARGET.saving.createPlan,
        before: "showSaving",
        title: "Start your first plan",
        body: "Tap Create a saving plan, enter your goal details, and save it. You can update the plan whenever your goal changes.",
        ctaLabel: "Try it now",
        finish: "openPlan",
      },
      {
        route: { view: "finance" },
        target: TARGET.saving.calendar,
        before: "showSaving",
        title: "View and edit saving records",
        body: "Tap a date to view its saving records. Long-press today or any of the previous 7 days to add or edit a record. Future dates can't be edited.",
        ctaLabel: "Got it",
      },
    ]),
  },

  todo: {
    version: 1,
    title: "To-do List",
    steps: onRoute(ROUTES.todo, [
      {
        route: { view: "todo" },
        target: TARGET.todo.form,
        title: "Add a task",
        body: "Give the task a name, optional description, due date and priority, then press Add.",
      },
      {
        route: { view: "todo" },
        target: TARGET.todo.filters,
        title: "Find the right tasks",
        body: "Switch between Pending, Completed and All. You can sort the list by due date or priority.",
      },
      {
        route: { view: "domain", activeDomain: "health" },
        target: TARGET.todo.list,
        title: "Complete and manage tasks",
        body: "Tap a checkbox when a task is done. Existing tasks can also be edited or deleted.",
        ctaLabel: "Try it now",
      },
    ]),
  },

  activity: {
    version: 1,
    title: "Physical Activity",
    steps: onRoute(ROUTES.activity, [
      {
        route: { view: "domain", activeDomain: "health" },
        target: TARGET.activity.pages,
        title: "New, History and Templates",
        body: "Choose New to log a workout, History to review past workouts, or Templates to reuse a saved workout.",
        before: "showNew",
      },
      {
        route: { view: "domain", activeDomain: "health" },
        target: TARGET.activity.form,
        title: "Cardio or strength",
        body: "Choose Cardio or Strength. Track duration and distance for cardio, or sets, reps and weight for strength.",
        before: "showNew",
      },
      {
        route: { view: "domain", activeDomain: "spirituality" },
        target: TARGET.activity.submit,
        title: "Save your activity",
        body: "Complete the workout details, then tap Add. Your activity contributes to your Health score.",
        before: "showNew",
        ctaLabel: "Try it now",
      },
    ]),
  },

  journal: {
    version: 1,
    title: "Mood and Journal",
    steps: onRoute(ROUTES.journal, [
      {
        route: { view: "domain", activeDomain: "spirituality" },
        target: TARGET.journal.today,
        title: "Daily mood check-in",
        body: "Choose how you feel today. Your mood is also logged as a Spirituality reflection.",
      },
      {
        route: { view: "domain", activeDomain: "spirituality" },
        target: TARGET.journal.week,
        title: "Your seven-day pattern",
        body: "The weekly chart helps you notice changes in mood instead of judging a single day in isolation.",
      },
      {
        route: { view: "domain", activeDomain: "relationships" },
        target: TARGET.journal.entries,
        title: "Journal entries",
        body: "Add a short reflection and emotion tags after choosing a mood. Journal details stay on this device.",
        ctaLabel: "Log today's mood",
        finish: "startCheckin",
      },
    ]),
  },

  relationships: {
    version: 1,
    title: "Family & Friends",
    steps: onRoute(ROUTES.relationships, [
      {
        route: { view: "domain", activeDomain: "relationships" },
        target: TARGET.domain.reflection,
        title: "Reflect on today",
        body: "Rate how connected and supported you felt. Reflections contribute to this domain's weekly score.",
      },
      {
        route: { view: "missions" },
        target: TARGET.domain.actions,
        title: "Log meaningful actions",
        body: "Record a connection or relationship mission after you complete it. Actions and consistency help your score grow.",
        ctaLabel: "Try it now",
      },
    ]),
  },

  missions: {
    version: 1,
    title: "Daily Missions",
    steps: onRoute(ROUTES.missions, [
      {
        route: { view: "missions" },
        target: TARGET.missions.list,
        title: "Three focused actions",
        body: "Pulse chooses three different-domain missions each day and prioritises your lowest-scoring areas for the week.",
      },
      {
        route: { view: "missions" },
        target: TARGET.missions.list,
        title: "Track completion",
        body: "Tap a checkbox when you finish a mission. You can tap it again to undo the completion.",
      },
      {
        route: { view: "social" },
        target: TARGET.missions.history,
        title: "Review your history",
        body: "History summarises this week, progress by domain and all-time mission completion.",
        ctaLabel: "Try it now",
      },
    ]),
  },

  social: {
    version: 1,
    title: "Social",
    steps: onRoute(ROUTES.social, [
      {
        route: { view: "social" },
        target: TARGET.social.tabs,
        title: "Feed, Today and Messages",
        body: "Feed contains posts from you and your friends. Today is your daily check-in. Messages contains friends, requests and conversations.",
      },
      {
        route: { view: "profile" },
        target: TARGET.social.content,
        title: "Share and connect safely",
        body: "Posts, likes, comments and direct messages are limited to accepted friends. Search by email from Messages to add someone.",
        ctaLabel: "Explore Social",
      },
    ]),
  },

  profile: {
    version: 1,
    title: "Profile and Progress",
    steps: onRoute(ROUTES.profile, [
      {
        route: { view: "profile" },
        target: TARGET.profile.analytics,
        title: "See how you are changing",
        body: "Choose a time range and domain to explore score trends, growth and strategic insights.",
      },
      {
        target: TARGET.profile.settings,
        title: "Settings and tutorials",
        body: "Open Settings to find Help & tutorials, generate sample analytics data or log out.",
        ctaLabel: "Done",
      },
    ]),
  },
};

export const TUTORIAL_ORDER = [
  "appOverview",
  "features",
  "financeSpending",
  "savingOverview",
  "todo",
  "activity",
  "journal",
  "relationships",
  "missions",
  "social",
  "profile",
];

export function tutorialNeedsShowing(progress, tutorialId) {
  const tutorial = TUTORIALS[tutorialId];
  if (!tutorial) return false;
  return Number(progress?.[tutorialId]?.version || 0) < tutorial.version;
}

export function routeMatches(currentRoute, requiredRoute) {
  if (!requiredRoute || !currentRoute) return true;
  return (
    currentRoute.view === requiredRoute.view &&
    (!requiredRoute.domain || currentRoute.domain === requiredRoute.domain)
  );
}

export function firstTutorialRoute(tutorialId) {
  return TUTORIALS[tutorialId]?.steps?.[0]?.route || null;
}
