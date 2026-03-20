import { DomainId } from "../../../config/domains";

/** A micro action template from the library */
export interface MissionTemplate {
  id: string;
  domain: DomainId;
  title: string;
  description: string;
  estimatedMinutes: number;
}

/** Status of an assigned mission */
export type MissionStatus = "pending" | "completed" | "skipped";

/** An assigned mission for the user's week */
export interface AssignedMission {
  id: string;
  templateId: string;
  domain: DomainId;
  title: string;
  description: string;
  estimatedMinutes: number;
  status: MissionStatus;
  completedAt?: string; // ISO date
}

/** A week's mission set stored in Firestore */
export interface WeeklyMissionSet {
  weekId: string; // e.g. "2026-W12"
  generatedAt: string;
  targetDomains: DomainId[];
  missions: AssignedMission[];
  completedCount: number;
  totalCount: number;
}
