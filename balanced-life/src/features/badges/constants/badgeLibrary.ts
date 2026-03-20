/**
 * Badge Library — 18 unlockable achievements.
 *
 * Categories:
 *  - Streak (7): consistency milestones
 *  - Score (3): balance score targets
 *  - Missions (3): action completion milestones
 *  - Engagement (3): weekly tier achievements
 *  - Special (2): rare combo achievements
 */

import { BadgeDefinition } from "../types/badge.types";

export const BADGE_LIBRARY: BadgeDefinition[] = [
  // ── Streak Badges ──
  {
    id: "first-checkin",
    title: "First Step",
    description: "Complete your first daily check-in",
    emoji: "🌱",
    category: "streak",
  },
  {
    id: "streak-3",
    title: "Getting Started",
    description: "Maintain a 3-day check-in streak",
    emoji: "🔥",
    category: "streak",
  },
  {
    id: "streak-7",
    title: "One Week Strong",
    description: "Maintain a 7-day check-in streak",
    emoji: "💪",
    category: "streak",
  },
  {
    id: "streak-14",
    title: "Two Week Warrior",
    description: "Maintain a 14-day check-in streak",
    emoji: "⚡",
    category: "streak",
  },
  {
    id: "streak-30",
    title: "Monthly Master",
    description: "Maintain a 30-day check-in streak",
    emoji: "🏆",
    category: "streak",
  },
  {
    id: "streak-60",
    title: "Unstoppable",
    description: "Maintain a 60-day check-in streak",
    emoji: "💎",
    category: "streak",
  },
  {
    id: "streak-90",
    title: "Legend",
    description: "Maintain a 90-day check-in streak",
    emoji: "👑",
    category: "streak",
  },

  // ── Score Badges ──
  {
    id: "score-50",
    title: "Getting There",
    description: "Reach a Balance Score of 50",
    emoji: "📈",
    category: "score",
  },
  {
    id: "score-65",
    title: "Well Balanced",
    description: "Reach a Balance Score of 65",
    emoji: "⚖️",
    category: "score",
  },
  {
    id: "score-80",
    title: "Thriving",
    description: "Reach a Balance Score of 80",
    emoji: "🌟",
    category: "score",
  },

  // ── Mission Badges ──
  {
    id: "first-mission",
    title: "Action Taker",
    description: "Complete your first weekly mission",
    emoji: "✅",
    category: "missions",
  },
  {
    id: "missions-week-complete",
    title: "Mission Accomplished",
    description: "Complete all missions in a single week",
    emoji: "🎯",
    category: "missions",
  },
  {
    id: "missions-10",
    title: "Mission Veteran",
    description: "Complete 10 missions total",
    emoji: "🎖️",
    category: "missions",
  },

  // ── Engagement Badges ──
  {
    id: "first-bronze",
    title: "Bronze Week",
    description: "Earn Bronze tier in weekly engagement",
    emoji: "🥉",
    category: "engagement",
  },
  {
    id: "first-silver",
    title: "Silver Week",
    description: "Earn Silver tier in weekly engagement",
    emoji: "🥈",
    category: "engagement",
  },
  {
    id: "first-gold",
    title: "Gold Week",
    description: "Earn Gold tier in weekly engagement",
    emoji: "🥇",
    category: "engagement",
  },

  // ── Special Badges ──
  {
    id: "perfect-week",
    title: "Perfect Week",
    description: "Check in all 7 days and complete all missions in one week",
    emoji: "💯",
    category: "special",
  },
  {
    id: "balanced-life",
    title: "Balanced Life",
    description: "All 5 domains at 65 or above at the same time",
    emoji: "🌈",
    category: "special",
  },
];

/** Get badge definition by ID */
export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_LIBRARY.find((b) => b.id === id);
}

/** Get badges by category */
export function getBadgesByCategory(category: BadgeDefinition["category"]): BadgeDefinition[] {
  return BADGE_LIBRARY.filter((b) => b.category === category);
}
