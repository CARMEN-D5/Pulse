import { DomainId } from "../../../config/domains";

export interface AssessmentQuestion {
  id: number;
  domain: DomainId;
  text: string;
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
  { id: 1, domain: "spirituality", text: "How often do you feel your life has a clear sense of meaning?" },
  { id: 2, domain: "spirituality", text: "How often do your daily actions reflect your core values?" },
  { id: 3, domain: "spirituality", text: "How often do you make time to reflect on what matters most to you?" },
  { id: 4, domain: "spirituality", text: "How often do you feel at peace within yourself?" },
  { id: 5, domain: "spirituality", text: "How often do you do things that strengthen your sense of purpose?" },

  // Family & Friends / Social (6-10)
  { id: 6, domain: "social", text: "How often do you feel connected to the people who matter most to you?" },
  { id: 7, domain: "social", text: "How often do you spend meaningful time with family or close friends?" },
  { id: 8, domain: "social", text: "How often do you feel supported by people close to you?" },
  { id: 9, domain: "social", text: "How often do you feel comfortable opening up to someone you trust?" },
  { id: 10, domain: "social", text: "How often do your relationships leave you feeling valued and cared for?" },

  // Work / Productivity (11-15)
  { id: 11, domain: "productivity", text: "How often do you feel clear about your priorities?" },
  { id: 12, domain: "productivity", text: "How often do you make meaningful progress on your work, study, or responsibilities?" },
  { id: 13, domain: "productivity", text: "How often do you feel motivated to do the things you need to do?" },
  { id: 14, domain: "productivity", text: "How often does your workload feel manageable?" },
  { id: 15, domain: "productivity", text: "How often do your work, study, or daily responsibilities feel worthwhile?" },

  // Health (16-20)
  { id: 16, domain: "health", text: "How often do you feel physically well and energised?" },
  { id: 17, domain: "health", text: "How often do you get enough restful sleep?" },
  { id: 18, domain: "health", text: "How often do you make time for exercise or physical activity?" },
  { id: 19, domain: "health", text: "How often do you manage stress in healthy ways?" },
  { id: 20, domain: "health", text: "How often do you feel mentally and emotionally well?" },

  // Financial (21-25)
  { id: 21, domain: "financial", text: "How often do you feel in control of your day-to-day spending?" },
  { id: 22, domain: "financial", text: "How often do you feel financially secure in your current situation?" },
  { id: 23, domain: "financial", text: "How often do you make financial decisions that support your long-term goals?" },
  { id: 24, domain: "financial", text: "How often do you feel confident about your financial future?" },
  { id: 25, domain: "financial", text: "How often are you able to save money or build financial stability?" },
];

export const TOTAL_QUESTIONS = ASSESSMENT_QUESTIONS.length;
