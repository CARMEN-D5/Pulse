import { DomainId } from "../../../config/domains";

export interface AssessmentQuestion {
  id: number;
  domain: DomainId;
  text: string;
  reverseScored?: boolean;
}

export const ANSWER_OPTIONS = [
  { value: 1, label: "Never", score: 0 },
  { value: 2, label: "Rarely", score: 2.5 },
  { value: 3, label: "Sometimes", score: 5 },
  { value: 4, label: "Often", score: 7.5 },
  { value: 5, label: "Always", score: 10 },
] as const;

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // Spirituality (1-5)
  { id: 1, domain: "spirituality", text: "How often do you feel your life has meaning or purpose?" },
  { id: 2, domain: "spirituality", text: "How often do you reflect on your personal values or beliefs?" },
  { id: 3, domain: "spirituality", text: "How often do you experience inner peace or calm?" },
  { id: 4, domain: "spirituality", text: "How often do you engage in activities that nourish your spirit?" },
  { id: 5, domain: "spirituality", text: "How aligned do you feel your daily actions are with your values?" },

  // Family & Friends / Social (6-10)
  { id: 6, domain: "social", text: "How satisfied are you with your relationships with family or close friends?" },
  { id: 7, domain: "social", text: "How often do you spend meaningful time with people important to you?" },
  { id: 8, domain: "social", text: "How supported do you feel by family or friends?" },
  { id: 9, domain: "social", text: "How comfortable are you sharing personal challenges with someone close?" },
  { id: 10, domain: "social", text: "How connected do you feel to the people who matter most in your life?" },

  // Work / Productivity (11-15)
  { id: 11, domain: "productivity", text: "How satisfied are you with your work, study, or daily responsibilities?" },
  { id: 12, domain: "productivity", text: "How motivated do you feel about your work or goals?" },
  { id: 13, domain: "productivity", text: "How manageable is your workload?" },
  { id: 14, domain: "productivity", text: "How productive do you feel most days?" },
  { id: 15, domain: "productivity", text: "How meaningful do you find your work or daily activities?" },

  // Health (16-20)
  { id: 16, domain: "health", text: "How would you rate your overall physical health?" },
  { id: 17, domain: "health", text: "How often do you engage in physical activity or exercise?" },
  { id: 18, domain: "health", text: "How well do you manage stress in your daily life?" },
  { id: 19, domain: "health", text: "How well do you sleep most nights?" },
  { id: 20, domain: "health", text: "How would you rate your overall mental and emotional wellbeing?" },

  // Financial (21-25)
  { id: 21, domain: "financial", text: "How secure do you feel about your current financial situation?" },
  { id: 22, domain: "financial", text: "How well are you able to manage your expenses?" },
  { id: 23, domain: "financial", text: "How confident are you about your future financial stability?" },
  { id: 24, domain: "financial", text: "How often do financial worries cause you stress?", reverseScored: true },
  { id: 25, domain: "financial", text: "How satisfied are you with your ability to save or build financial security?" },
];

export const TOTAL_QUESTIONS = ASSESSMENT_QUESTIONS.length;
