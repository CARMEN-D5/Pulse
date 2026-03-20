/**
 * Seed 30 days of fake daily snapshots and check-ins for testing.
 *
 * Usage:
 *   npx ts-node scripts/seedTestData.ts <userId>
 *
 * Get your userId from Firestore Console → users → (document ID)
 * e.g.: npx ts-node scripts/seedTestData.ts VZh1YxslnhXNef71qaOHTQZxeVp2
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

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Generate realistic 30-day score history.
 * Scores generally improve over time with some dips.
 */
function generateScoreHistory(baseScores: Record<DomainId, number>) {
  const days: {
    date: string;
    domainScores: Record<DomainId, number>;
    balanceScore: number;
    checkInAnswers: Record<DomainId, number>;
    streakCount: number;
  }[] = [];

  const current = { ...baseScores };
  let streak = 0;

  for (let i = 29; i >= 0; i--) {
    // 90% chance of checking in
    if (Math.random() < 0.10 && i > 0) {
      streak = 0;
      continue;
    }
    streak++;

    // Generate check-in answers (1-5)
    // Gradually bias toward higher answers as days progress (improvement arc)
    const dayProgress = (30 - i) / 30; // 0 at start, 1 at end
    const answers: Record<DomainId, number> = {} as any;

    for (const id of DOMAIN_IDS) {
      // Base tendency: map current score to 1-5 range, bias upward over time
      const baseTendency = 2.5 + dayProgress * 1.0; // starts ~2.5, ends ~3.5
      const noise = (Math.random() - 0.5) * 2; // -1 to +1
      // Add some domain-specific personality
      const domainBoost = id === "social" ? 0.3 : id === "financial" ? -0.2 : 0;
      answers[id] = clamp(Math.round(baseTendency + noise + domainBoost), 1, 5);
    }

    // Daily EMA update
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
      domainScores: { ...current },
      balanceScore,
      checkInAnswers: answers,
      streakCount: streak,
    });
  }

  return days;
}

async function seed() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: npx ts-node scripts/seedTestData.ts <userId>");
    console.error("\nFind your userId in Firebase Console → Firestore → users → (document ID)");
    process.exit(1);
  }

  // Starting scores — realistic assessment results
  const baseScores: Record<DomainId, number> = {
    spirituality: 55,
    health: 48,
    financial: 42,
    social: 62,
    productivity: 50,
  };

  console.log(`\nSeeding 30 days of test data for user: ${userId}\n`);

  const days = generateScoreHistory(baseScores);

  for (const day of days) {
    await setDoc(doc(db, "users", userId, "dailySnapshots", day.date), {
      date: day.date,
      domainScores: day.domainScores,
      balanceScore: day.balanceScore,
      streakCount: day.streakCount,
      createdAt: Timestamp.now(),
    });

    await setDoc(doc(db, "users", userId, "checkIns", day.date), {
      answers: day.checkInAnswers,
      date: day.date,
      createdAt: Timestamp.now(),
    });

    console.log(`  ✓ ${day.date}  Balance: ${day.balanceScore}  Streak: ${day.streakCount}`);
  }

  // Update user profile with latest scores
  const latest = days[days.length - 1];
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

  console.log(`\n✅ Done! Seeded ${days.length} days.`);
  console.log(`Latest Balance Score: ${latest.balanceScore}`);
  console.log(`Domain scores:`, latest.domainScores);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
