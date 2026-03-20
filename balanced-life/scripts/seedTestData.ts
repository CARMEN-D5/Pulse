/**
 * Seed 30 days of test data for all features.
 *
 * Usage:
 *   npx ts-node scripts/seedTestData.ts <userId> best
 *   npx ts-node scripts/seedTestData.ts <userId> worst
 *
 * Best case: Daily check-ins, high scores (4-5), consistent improvement, all missions completed
 * Worst case: Sporadic check-ins, low scores (1-2), declining trend, missions skipped
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyAnWM_1i1lvbRHjIus8CpM6g5M-BnikLoU",
  authDomain: "pulse-2531d.firebaseapp.com",
  projectId: "pulse-2531d",
  storageBucket: "pulse-2531d.firebasestorage.app",
  messagingSenderId: "203993728644",
  appId: "1:203993728644:web:83c9df348fa24faedde4d1",
});
const db = getFirestore(app);

type DomainId = "spirituality" | "health" | "financial" | "social" | "productivity";
const DOMAIN_IDS: DomainId[] = ["spirituality", "health", "financial", "social", "productivity"];

// === Mission templates (subset for seeding) ===
const MISSION_TEMPLATES: Record<DomainId, { id: string; title: string; description: string; estimatedMinutes: number }[]> = {
  spirituality: [
    { id: "sp-01", title: "Write down 3 things you're grateful for", description: "Reflect on what's going well.", estimatedMinutes: 5 },
    { id: "sp-02", title: "Meditate for 10 minutes", description: "Focus on your breathing.", estimatedMinutes: 10 },
    { id: "sp-03", title: "Spend 15 minutes in nature", description: "Go for a walk outside.", estimatedMinutes: 15 },
  ],
  social: [
    { id: "so-01", title: "Call a friend or family member", description: "Catch up with someone.", estimatedMinutes: 15 },
    { id: "so-02", title: "Send an appreciation message", description: "Tell someone you value them.", estimatedMinutes: 5 },
    { id: "so-03", title: "Plan a catch-up with a friend", description: "Schedule time together.", estimatedMinutes: 10 },
  ],
  productivity: [
    { id: "pr-01", title: "Plan tomorrow's top 3 tasks", description: "Write your priorities.", estimatedMinutes: 5 },
    { id: "pr-02", title: "Declutter your workspace", description: "Clear your desk.", estimatedMinutes: 15 },
    { id: "pr-03", title: "Do a 25-minute focus sprint", description: "Pomodoro on your top task.", estimatedMinutes: 25 },
  ],
  health: [
    { id: "he-01", title: "Do a 20-minute workout", description: "Any exercise you enjoy.", estimatedMinutes: 20 },
    { id: "he-02", title: "Drink 8 glasses of water today", description: "Stay hydrated.", estimatedMinutes: 5 },
    { id: "he-03", title: "Go to bed 30 minutes earlier", description: "Improve sleep quality.", estimatedMinutes: 5 },
  ],
  financial: [
    { id: "fi-01", title: "Review your spending this week", description: "Check your bank statements.", estimatedMinutes: 10 },
    { id: "fi-02", title: "Set a savings goal for this month", description: "Pick a target amount.", estimatedMinutes: 10 },
    { id: "fi-03", title: "Cancel one unused subscription", description: "Audit recurring charges.", estimatedMinutes: 10 },
  ],
};

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekId(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ========================================================
// BEST CASE scenario
// ========================================================
function generateBestCase(baseScores: Record<DomainId, number>) {
  const days: {
    date: string;
    daysAgo: number;
    domainScores: Record<DomainId, number>;
    balanceScore: number;
    checkInAnswers: Record<DomainId, number>;
    streakCount: number;
    skipped: boolean;
  }[] = [];

  const current = { ...baseScores };
  let streak = 0;

  for (let i = 29; i >= 0; i--) {
    // Best case: check in every single day (100% consistency)
    streak++;

    const dayProgress = (30 - i) / 30;
    const answers: Record<DomainId, number> = {} as any;

    for (const id of DOMAIN_IDS) {
      // Best case: mostly 4s and 5s, improving over time
      // Start: average ~3.5, End: average ~4.5
      const baseTendency = 3.5 + dayProgress * 1.0;
      const noise = (Math.random() - 0.3) * 1.0; // slight upward bias
      answers[id] = clamp(Math.round(baseTendency + noise), 3, 5);
    }

    // Daily EMA
    for (const id of DOMAIN_IDS) {
      const signal = ((answers[id] - 1) / 4) * 100;
      const raw = 0.12 * signal + 0.88 * current[id];
      const movement = clamp(raw - current[id], -3, 3);
      current[id] = clamp(Math.round((current[id] + movement) * 10) / 10, 0, 100);
    }

    // Geometric mean
    const scores = DOMAIN_IDS.map((id) => Math.max(current[id], 1));
    const product = scores.reduce((acc, s) => acc * s, 1);
    const balanceScore = Math.round(Math.pow(product, 1 / 5));

    days.push({
      date: dateStr(i),
      daysAgo: i,
      domainScores: { ...current },
      balanceScore,
      checkInAnswers: answers,
      streakCount: streak,
      skipped: false,
    });
  }

  return days;
}

// ========================================================
// WORST CASE scenario
// ========================================================
function generateWorstCase(baseScores: Record<DomainId, number>) {
  const days: {
    date: string;
    daysAgo: number;
    domainScores: Record<DomainId, number>;
    balanceScore: number;
    checkInAnswers: Record<DomainId, number>;
    streakCount: number;
    skipped: boolean;
  }[] = [];

  const current = { ...baseScores };
  let streak = 0;

  for (let i = 29; i >= 0; i--) {
    // Worst case: only ~40% check-in rate, frequent gaps
    const checksIn = Math.random() < 0.40;

    if (!checksIn && i > 0) {
      streak = 0;
      days.push({
        date: dateStr(i),
        daysAgo: i,
        domainScores: { ...current },
        balanceScore: Math.round(Math.pow(
          DOMAIN_IDS.map((id) => Math.max(current[id], 1)).reduce((a, s) => a * s, 1),
          0.2
        )),
        checkInAnswers: {} as any,
        streakCount: 0,
        skipped: true,
      });
      continue;
    }

    streak++;

    const dayProgress = (30 - i) / 30;
    const answers: Record<DomainId, number> = {} as any;

    for (const id of DOMAIN_IDS) {
      // Worst case: mostly 1s and 2s, declining or flat
      // Start: average ~2.5, End: average ~1.5
      const baseTendency = 2.5 - dayProgress * 1.0;
      const noise = (Math.random() - 0.7) * 1.0; // slight downward bias
      answers[id] = clamp(Math.round(baseTendency + noise), 1, 3);
    }

    // Daily EMA
    for (const id of DOMAIN_IDS) {
      const signal = ((answers[id] - 1) / 4) * 100;
      const raw = 0.12 * signal + 0.88 * current[id];
      const movement = clamp(raw - current[id], -3, 3);
      current[id] = clamp(Math.round((current[id] + movement) * 10) / 10, 0, 100);
    }

    // Geometric mean
    const scores = DOMAIN_IDS.map((id) => Math.max(current[id], 1));
    const product = scores.reduce((acc, s) => acc * s, 1);
    const balanceScore = Math.round(Math.pow(product, 1 / 5));

    days.push({
      date: dateStr(i),
      daysAgo: i,
      domainScores: { ...current },
      balanceScore,
      checkInAnswers: answers,
      streakCount: streak,
      skipped: true,
    });
  }

  return days;
}

// ========================================================
// Generate weekly mission sets
// ========================================================
function generateMissionSets(
  days: { date: string; daysAgo: number; domainScores: Record<DomainId, number>; skipped: boolean }[],
  scenario: "best" | "worst"
) {
  // Group days into weeks by weekId
  const weekMap = new Map<string, { weekId: string; domainScores: Record<DomainId, number>; daysAgo: number }>();

  for (const day of days) {
    const wid = getWeekId(day.daysAgo);
    if (!weekMap.has(wid)) {
      weekMap.set(wid, { weekId: wid, domainScores: day.domainScores, daysAgo: day.daysAgo });
    }
  }

  const missionSets: {
    weekId: string;
    generatedAt: string;
    targetDomains: DomainId[];
    missions: {
      id: string;
      templateId: string;
      domain: DomainId;
      title: string;
      description: string;
      estimatedMinutes: number;
      status: "pending" | "completed" | "skipped";
      completedAt?: string;
    }[];
    completedCount: number;
    totalCount: number;
  }[] = [];

  let prevTemplateIds: string[] = [];

  for (const [weekId, weekData] of weekMap) {
    // Find 2 weakest domains
    const sorted = [...DOMAIN_IDS].sort(
      (a, b) => (weekData.domainScores[a] ?? 0) - (weekData.domainScores[b] ?? 0)
    );
    const targetDomains = sorted.slice(0, 2);

    // Pick missions (2 from weakest, 1 from second weakest)
    const missions: typeof missionSets[0]["missions"] = [];
    const distribution = [2, 1];

    for (let d = 0; d < targetDomains.length; d++) {
      const domain = targetDomains[d];
      const count = distribution[d];
      const available = MISSION_TEMPLATES[domain].filter(
        (m) => !prevTemplateIds.includes(m.id)
      );
      const pool = available.length >= count ? available : MISSION_TEMPLATES[domain];
      const selected = pool.slice(0, count);

      for (const t of selected) {
        let status: "pending" | "completed" | "skipped" = "pending";
        let completedAt: string | undefined;

        if (scenario === "best") {
          // Best case: all completed
          status = "completed";
          completedAt = new Date().toISOString();
        } else {
          // Worst case: mostly skipped or pending
          const r = Math.random();
          if (r < 0.6) status = "skipped";
          else if (r < 0.8) status = "pending";
          else {
            status = "completed";
            completedAt = new Date().toISOString();
          }
        }

        missions.push({
          id: `${weekId}-${t.id}`,
          templateId: t.id,
          domain,
          title: t.title,
          description: t.description,
          estimatedMinutes: t.estimatedMinutes,
          status,
          ...(completedAt ? { completedAt } : {}),
        });
      }
    }

    prevTemplateIds = missions.map((m) => m.templateId);
    const completedCount = missions.filter((m) => m.status === "completed").length;

    missionSets.push({
      weekId,
      generatedAt: new Date().toISOString(),
      targetDomains,
      missions,
      completedCount,
      totalCount: missions.length,
    });
  }

  return missionSets;
}

// ========================================================
// Main seed function
// ========================================================
async function seed() {
  const userId = process.argv[2];
  const scenario = process.argv[3] as "best" | "worst";

  if (!userId || !["best", "worst"].includes(scenario)) {
    console.error("Usage: npx ts-node scripts/seedTestData.ts <userId> <best|worst>");
    console.error("\nScenarios:");
    console.error("  best   — 30-day streak, high scores (4-5), all missions completed");
    console.error("  worst  — ~40% check-in rate, low scores (1-2), missions skipped");
    console.error("\nGet your userId: Firebase Console → Firestore → users → (document ID)");
    process.exit(1);
  }

  // Starting scores differ by scenario
  const baseScores: Record<DomainId, number> =
    scenario === "best"
      ? { spirituality: 55, health: 52, financial: 48, social: 60, productivity: 50 }
      : { spirituality: 45, health: 40, financial: 35, social: 50, productivity: 42 };

  console.log(`\n🎯 Seeding 30 days of ${scenario.toUpperCase()} CASE data for user: ${userId}\n`);

  const days =
    scenario === "best"
      ? generateBestCase(baseScores)
      : generateWorstCase(baseScores);

  // --- Seed daily snapshots and check-ins ---
  let checkInCount = 0;

  for (const day of days) {
    // Always write snapshot (score state for that day)
    await setDoc(doc(db, "users", userId, "dailySnapshots", day.date), {
      date: day.date,
      domainScores: day.domainScores,
      balanceScore: day.balanceScore,
      streakCount: day.streakCount,
      createdAt: Timestamp.now(),
    });

    // Only write check-in if user actually checked in
    if (!day.skipped && Object.keys(day.checkInAnswers).length > 0) {
      await setDoc(doc(db, "users", userId, "checkIns", day.date), {
        answers: day.checkInAnswers,
        date: day.date,
        createdAt: Timestamp.now(),
      });
      checkInCount++;
      console.log(`  ✓ ${day.date}  Balance: ${day.balanceScore}  Streak: ${day.streakCount}  Answers: [${DOMAIN_IDS.map((id) => day.checkInAnswers[id]).join(",")}]`);
    } else {
      console.log(`  ○ ${day.date}  Balance: ${day.balanceScore}  (skipped)`);
    }
  }

  // --- Seed weekly missions ---
  const missionSets = generateMissionSets(days, scenario);

  console.log(`\n📋 Seeding ${missionSets.length} weekly mission sets...\n`);

  for (const set of missionSets) {
    await setDoc(doc(db, "users", userId, "weeklyMissions", set.weekId), set);
    const statusSummary = set.missions.map((m) => `${m.status}`).join(", ");
    console.log(`  ✓ ${set.weekId}  Targets: [${set.targetDomains.join(", ")}]  Missions: ${set.completedCount}/${set.totalCount} completed  (${statusSummary})`);
  }

  // --- Update user profile with latest state ---
  const latest = days[days.length - 1];
  const latestMissions = missionSets[missionSets.length - 1];

  await setDoc(
    doc(db, "users", userId),
    {
      latestDomainScores: latest.domainScores,
      latestBalanceScore: latest.balanceScore,
      lastCheckInDate: latest.date,
      streakData: {
        currentStreak: latest.streakCount,
        lastCheckInDate: latest.date,
      },
    },
    { merge: true }
  );

  // --- Summary ---
  console.log(`\n${"=".repeat(55)}`);
  console.log(`✅ ${scenario.toUpperCase()} CASE seed complete!`);
  console.log(`${"=".repeat(55)}`);
  console.log(`  Check-ins:       ${checkInCount}/30 days (${Math.round(checkInCount / 30 * 100)}%)`);
  console.log(`  Mission sets:    ${missionSets.length} weeks`);
  console.log(`  Final streak:    ${latest.streakCount} days`);
  console.log(`  Final Balance:   ${latest.balanceScore}`);
  console.log(`  Domain scores:`);
  for (const id of DOMAIN_IDS) {
    const start = baseScores[id];
    const end = latest.domainScores[id];
    const arrow = end > start ? "↑" : end < start ? "↓" : "→";
    console.log(`    ${id.padEnd(14)} ${start} → ${end} ${arrow}`);
  }
  console.log();

  process.exit(0);
}

seed().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
