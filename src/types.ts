export type Id = string;
export type IsoUtcDateTime = string;
export type LocalDateKey = string; // YYYY-MM-DD
export type TaskStatus = "planned" | "started" | "delayed" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type WellnessTier = "sustainable" | "strained" | "high_risk";

export interface Subtask {
  id: Id;
  taskId: Id;
  title: string;
  estimatedMinutes: number;
  status: TaskStatus;
  recommendedBreakMinutes: number | null;
  sortOrder: number;
}

export interface Task {
  id: Id;
  title: string;
  course: string;
  deadlineAt: IsoUtcDateTime;
  deadlineText: string;
  estimatedMinutes: number;
  remainingMinutes: number;
  priority: TaskPriority;
  status: TaskStatus;
  isFlexible: boolean;
  isFixedDeadline: boolean;
  plannedStartDate?: LocalDateKey;
  subtasks?: Subtask[];
  completedAt?: IsoUtcDateTime | null;
}

export interface WellnessCheckIn {
  id: Id;
  recordedAt: IsoUtcDateTime;
  energy: number; // 0-10
  motivation: number; // 0-10
  accomplishment: number; // 0-10
  wellnessComposite: number; // W = (E + M + A) / 3
  riskTrend: number; // R (0-10)
  note?: string;
  dateLabel: string;
}

export interface DayTrend {
  day: string;
  score: number;
  dateKey: string;
  isToday?: boolean;
}

export interface ChunkProposal {
  sourceTaskId: Id;
  chunkCount: number;
  chunkMinutes: number[];
  recommendedBreakMinutes: number;
  titles: string[];
}

export interface RecommendationOutput {
  id: string;
  sessionLengthMinutes: number;
  originalLengthMinutes?: number;
  focusTaskId: Id | null;
  focusTaskTitle: string;
  focusTaskCourse: string;
  chunkProposal: ChunkProposal | null;
  suggestRecoveryBreak: boolean;
  recoveryBreakMinutes: number;
  reasoning: string;
  microAction: string;
  tier: WellnessTier;
  accepted?: boolean;
  dismissed?: boolean;
}

export interface CrunchWindow {
  startDate: string;
  endDate: string;
  peakDemandPercentage: number;
  suggestedShift: {
    taskTitle: string;
    durationMinutes: number;
    targetDay: string;
  };
  dismissed?: boolean;
}

export interface SupportResource {
  id: Id;
  name: string;
  category: "Counseling" | "Crisis Line" | "Academic Support" | "Accessibility" | "Health";
  description: string;
  contact: string;
  hours: string;
  location: string;
  isCrisis?: boolean;
  verified: boolean;
}

export interface AssistantMessage {
  id: string;
  sender: "user" | "assistant";
  timestamp: string;
  text?: string;
  actionCard?: RecommendationOutput;
  forecastInsight?: boolean;
  modelUsed?: string;
  roleUsed?: string;
  isFallback?: boolean;
}
