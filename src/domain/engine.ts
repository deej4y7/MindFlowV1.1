import { WellnessTier, ChunkProposal, RecommendationOutput, Task } from "../types";

export const ENGINE_VERSION = "1.0.0";
export const BASE_SESSION_MINUTES = 50;
export const DEFAULT_CAPACITY_BUDGET_MINUTES = 120;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateWellnessComposite(energy: number, motivation: number, accomplishment: number): number {
  const comp = (energy + motivation + accomplishment) / 3;
  return Number(clamp(comp, 0, 10).toFixed(1));
}

export function getWellnessTier(w: number): WellnessTier {
  if (w >= 7.0) return "sustainable";
  if (w >= 4.0) return "strained";
  return "high_risk";
}

export function calculateRiskTrend(w: number, previousRiskTrend: number | null, alpha = 0.35): number {
  const dailyRisk = 10 - w;
  if (previousRiskTrend === null) return Number(dailyRisk.toFixed(1));
  const trend = alpha * dailyRisk + (1 - alpha) * previousRiskTrend;
  return Number(clamp(trend, 0, 10).toFixed(1));
}

export function calculateUrgency(remainingMinutes: number, daysRemaining: number, k = 1): number {
  const t = Math.max(1, daysRemaining);
  const urgency = (remainingMinutes / (t * 60)) * k;
  return clamp(urgency, 0, 10);
}

export function getChunkThresholdMinutes(w: number): number {
  if (w >= 7.0) return 90;
  if (w >= 4.0) return 50;
  return 25;
}

export function calculateSessionPlan(w: number, urgency = 5): { sessionLengthMinutes: number; recoveryBreakMinutes: number } {
  let f = 1.0;
  let recoveryBreak = 0;

  if (w >= 7.0) {
    f = 1.0;
    recoveryBreak = 5;
  } else if (w >= 4.0) {
    f = 0.7;
    recoveryBreak = 5;
  } else {
    f = 0.4;
    recoveryBreak = 5;
  }

  const g = clamp(1.0 + 0.2 * Math.min(1, urgency / 10), 0.8, 1.2);
  const rawSession = Math.round(BASE_SESSION_MINUTES * f * g);
  const sessionLengthMinutes = clamp(rawSession, 15, 50);

  return {
    sessionLengthMinutes,
    recoveryBreakMinutes: recoveryBreak,
  };
}

export function deriveContextualSubtasks(task: Task, count: number): string[] {
  const text = `${task.title} ${task.course}`.toLowerCase();

  // Coding / Software / Algorithms
  if (text.includes("algorithm") || text.includes("code") || text.includes("cs ") || text.includes("program") || text.includes("dev") || text.includes("system")) {
    const sequence = [
      "Problem Formulation & Architecture Setup",
      "Greedy vs DP Comparison & Core Logic",
      "Complexity Proof, Edge-Cases & Verification",
      "Synthesis, Code Cleanup & Bibliography",
    ];
    return sequence.slice(0, count);
  }

  // Design / UX / UI / Mockups
  if (text.includes("mockup") || text.includes("usability") || text.includes("design") || text.includes("ui") || text.includes("ux") || text.includes("prototype") || text.includes("wireframe")) {
    const sequence = [
      "User Journey & Low-Fidelity Layouts",
      "High-Fidelity Component States & Visual Flow",
      "Interactive Prototyping & Usability Checks",
      "Design System Export & Spec Documentation",
    ];
    return sequence.slice(0, count);
  }

  // Essays / Reports / Literature / Review
  if (text.includes("report") || text.includes("paper") || text.includes("essay") || text.includes("review") || text.includes("writing") || text.includes("eng ")) {
    const sequence = [
      "Literature Comparison & Outline Setup",
      "Core Argument Drafting & Evidence Synthesis",
      "Synthesis, Citations & Bibliography",
      "Final Proofreading & Rubric Verification",
    ];
    return sequence.slice(0, count);
  }

  // Problem Sets / Math / Physics / Calculations
  if (text.includes("math") || text.includes("problem set") || text.includes("calc") || text.includes("physics") || text.includes("stat") || text.includes("homework")) {
    const sequence = [
      "Core Formula Review & Questions 1–2 Setup",
      "Intermediate Computation & Step-by-Step Proofs",
      "Advanced Problems & Graphing Verification",
      "Solution Cross-Check & Final Submission Polish",
    ];
    return sequence.slice(0, count);
  }

  // Default progressive academic stages
  const defaultSequence = [
    "Phase 1: Scope, Setup & Key Objectives",
    "Phase 2: Core Execution & Drafting",
    "Phase 3: Verification & Detail Polish",
    "Phase 4: Final Submission Review",
  ];
  return defaultSequence.slice(0, count);
}

export function createChunkProposal(task: Task, w: number): ChunkProposal | null {
  const threshold = getChunkThresholdMinutes(w);
  const total = task.remainingMinutes;

  if (total <= threshold) return null;

  const count = Math.min(4, Math.ceil(total / threshold));
  const baseMinutes = Math.floor(total / count);
  const remainder = total % count;

  const chunkMinutes: number[] = [];
  for (let i = 0; i < count; i++) {
    chunkMinutes.push(baseMinutes + (i < remainder ? 1 : 0));
  }

  const titles = deriveContextualSubtasks(task, count);

  return {
    sourceTaskId: task.id,
    chunkCount: count,
    chunkMinutes,
    recommendedBreakMinutes: 5,
    titles,
  };
}

export function generateAdaptiveProposal(
  focusTask: Task,
  w: number,
  daysRemaining = 2
): RecommendationOutput {
  const urgency = calculateUrgency(focusTask.remainingMinutes, daysRemaining);
  const { sessionLengthMinutes, recoveryBreakMinutes } = calculateSessionPlan(w, urgency);
  const tier = getWellnessTier(w);
  const chunkProposal = createChunkProposal(focusTask, w);

  let reasoning = "";
  let microAction = "";

  if (tier === "sustainable") {
    reasoning = `Calculated urgency is moderate with ${daysRemaining} days remaining and your sustainable capacity allows a standard ${sessionLengthMinutes}m session.`;
    microAction = "Review primary algorithmic problem statement and outline base recursive cases.";
  } else if (tier === "strained") {
    reasoning = `Your current capacity indicates high demand density. A shorter, focused interval (${sessionLengthMinutes}m) keeps momentum without cognitive fatigue.`;
    microAction = "Read Section 3 problem statement and outline the 2 dynamic programming constraints on scratch paper.";
  } else {
    reasoning = `High academic strain detected. We recommend a gentle 15-20m micro-session to prevent overwhelm. You can always stop after the first block.`;
    microAction = "Skim the project rubric and bullet point 3 key submission checklist items.";
  }

  return {
    id: `rec-${Date.now()}`,
    sessionLengthMinutes,
    originalLengthMinutes: 50,
    focusTaskId: focusTask.id,
    focusTaskTitle: focusTask.title,
    focusTaskCourse: focusTask.course,
    chunkProposal,
    suggestRecoveryBreak: true,
    recoveryBreakMinutes,
    reasoning,
    microAction,
    tier,
  };
}
