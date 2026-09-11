import React, { useState } from "react";
import { Task, WellnessCheckIn, CrunchWindow, RecommendationOutput } from "../types";

interface DashboardViewProps {
  tasks: Task[];
  checkIn: WellnessCheckIn;
  crunchWindow: CrunchWindow;
  proposal: RecommendationOutput;
  onAcceptProposal: () => void;
  onDismissProposal: () => void;
  onAcceptRebalance: () => void;
  onDismissCrunch: () => void;
  onToggleTaskComplete: (taskId: string) => void;
  onOpenSupport: () => void;
  onNavigateToPlanner: () => void;
  onStartFocusSession?: (task: Task, defaultMinutes?: number, breakMinutes?: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  checkIn,
  crunchWindow,
  proposal,
  onAcceptProposal,
  onDismissProposal,
  onAcceptRebalance,
  onDismissCrunch,
  onToggleTaskComplete,
  onOpenSupport,
  onNavigateToPlanner,
  onStartFocusSession,
}) => {
  const [proposalAccepted, setProposalAccepted] = useState(proposal.accepted || false);
  const [rebalanceAccepted, setRebalanceAccepted] = useState(false);
  const [showRebalanceModal, setShowRebalanceModal] = useState(false);

  // Derive composite and tier details
  const w = checkIn.wellnessComposite;
  let tierLabel = "Sustainable Tier";
  let tierBadgeBg = "bg-secondary-container text-primary";
  let greetingSub = "Academic load aligns with sustainable capacity today.";

  if (w < 4.0) {
    tierLabel = "High-Risk Tier";
    tierBadgeBg = "bg-alert-soft text-tertiary";
    greetingSub = "High academic strain detected. Micro-chunks and campus support recommended.";
  } else if (w < 7.0) {
    tierLabel = "Moderate Strain";
    tierBadgeBg = "bg-surface-container text-on-surface";
    greetingSub = "Moderate workload strain. Calibrated to 25-minute focus intervals.";
  }

  // Calculate allocated minutes from active today's tasks
  const pendingTasks = tasks.filter((t) => t.status !== "completed");
  const priorityTasks = pendingTasks.slice(0, 3);
  const totalAllocatedMinutes = priorityTasks.reduce((acc, t) => acc + t.remainingMinutes, 0);
  const dailyCapacityMinutes = 120;
  const freeBufferMinutes = Math.max(0, dailyCapacityMinutes - totalAllocatedMinutes);
  const budgetPercent = Math.min(100, Math.round((totalAllocatedMinutes / dailyCapacityMinutes) * 100));

  const handleAcceptPlan = () => {
    setProposalAccepted(true);
    onAcceptProposal();
  };

  return (
    <div className="flex flex-col w-full gap-space-lg pb-10">
      {/* Date & Greeting Header */}
      <div className="flex flex-col gap-1">
        <span className="font-caption-eyebrow text-caption-eyebrow uppercase text-muted-light tracking-wider text-[12px]">
          WEDNESDAY, OCT 24
        </span>
        <h1 className="font-headline-xl text-headline-xl text-on-surface font-extrabold text-[24px]">
          Good morning, Andi
        </h1>
        <p className="font-body-md text-body-md text-secondary text-[15px]">
          {greetingSub}
        </p>
      </div>

      {/* Capacity & Wellness Summary Card */}
      <section
        aria-label="Wellness and Capacity Summary"
        className="flex flex-col bg-surface rounded-DEFAULT p-space-md shadow-sm gap-space-md border border-border-light/40"
      >
        <div className="flex items-start justify-between gap-space-sm">
          <div className="flex flex-col">
            <span className="font-caption-eyebrow text-caption-eyebrow text-muted-light uppercase tracking-wide text-[11px]">
              Current Capacity Balance
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-headline-xl text-headline-xl text-primary font-bold text-[28px]">
                {w.toFixed(1)}
              </span>
              <span className="font-body-sm text-body-sm text-secondary text-[14px]">
                / 10 composite
              </span>
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-label-sm text-label-sm text-[12px] font-bold ${tierBadgeBg}`}>
            {tierLabel}
          </span>
        </div>

        {/* Stable Energy Trend Strip */}
        <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container-low">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-primary text-[20px]">
              trending_up
            </span>
            <span className="font-body-sm text-body-sm text-on-surface font-semibold text-[13px]">
              Stable energy trend (+0.4)
            </span>
          </div>
          <div aria-hidden="true" className="w-20 h-6 flex items-end justify-between px-1">
            <div className="w-1.5 h-3 bg-secondary-fixed-dim rounded-full" />
            <div className="w-1.5 h-3.5 bg-secondary-fixed-dim rounded-full" />
            <div className="w-1.5 h-4 bg-secondary-fixed-dim rounded-full" />
            <div className="w-1.5 h-3 bg-secondary-fixed-dim rounded-full" />
            <div className="w-1.5 h-5 bg-primary rounded-full" />
            <div className="w-1.5 h-5 bg-primary rounded-full" />
            <div className="w-1.5 h-6 bg-primary rounded-full" />
          </div>
        </div>

        {/* Daily Work Budget Bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-body-sm">
            <span className="font-body-sm text-body-sm text-secondary text-[13px]">Daily Work Budget</span>
            <span className="font-numeric-data text-numeric-data font-bold text-on-surface text-[13px]">
              {dailyCapacityMinutes}m daily capacity
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-variant overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[12px]">
            <span className="font-label-sm text-label-sm text-muted-light">
              Allocated: {totalAllocatedMinutes}m
            </span>
            <span className="font-label-sm text-label-sm text-muted-light">
              Free buffer: {freeBufferMinutes}m
            </span>
          </div>
        </div>
      </section>

      {/* Adaptive Flow Proposal Card */}
      {!proposal.dismissed && (
        <section
          aria-labelledby="adaptive-proposal-title"
          className="flex flex-col bg-surface rounded-DEFAULT p-space-md shadow-sm gap-space-md relative overflow-hidden border border-border-light/40 transition-all"
          id="recommendation-gate"
        >
          <div className="flex items-start gap-space-sm">
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-caption-eyebrow text-caption-eyebrow text-primary uppercase text-[11px] font-bold">
                Adaptive Flow Proposal
              </span>
              <h2
                className="font-headline-md text-headline-md text-on-surface mt-0.5 font-bold text-[16px] leading-tight"
                id="adaptive-proposal-title"
              >
                Recommended Focus: {proposal.focusTaskTitle}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm text-[12px] font-semibold">
              <span className="material-symbols-outlined text-[16px]">schedule</span> {proposal.sessionLengthMinutes}m session
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low text-secondary font-label-sm text-label-sm text-[12px] font-semibold">
              <span className="material-symbols-outlined text-[16px]">pause_circle</span> {proposal.recoveryBreakMinutes}m recovery break
            </span>
          </div>

          <p className="font-body-md text-body-md text-on-surface-variant text-[14px] leading-relaxed">
            {proposal.reasoning}
          </p>

          <div className="p-2.5 rounded-xl bg-surface-container-low flex items-start gap-2">
            <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5 flex-shrink-0">info</span>
            <span className="font-body-sm text-body-sm text-secondary text-[13px]">
              Nothing changes in your Planner until you accept.
            </span>
          </div>

          {!proposalAccepted ? (
            <div className="flex items-center gap-space-sm pt-1">
              <button
                className="h-12 px-6 rounded-full bg-primary text-on-primary font-headline-md text-headline-md flex items-center justify-center flex-1 active:translate-y-0.5 transition-all shadow-sm hover:opacity-95 cursor-pointer font-bold text-[14px]"
                id="accept-plan-btn"
                onClick={handleAcceptPlan}
                type="button"
              >
                Accept Plan
              </button>
              <button
                className="h-12 px-4 rounded-full bg-transparent text-secondary hover:text-on-surface font-label-md text-label-md flex items-center justify-center cursor-pointer text-[14px]"
                id="dismiss-plan-btn"
                onClick={onDismissProposal}
                type="button"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="p-space-md rounded-xl bg-surface-container flex flex-col items-center text-center animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-[24px]">check_circle</span>
              </div>
              <span className="font-headline-md text-headline-md text-primary font-bold text-[15px]">
                Scheduled in Planner
              </span>
              <p className="font-body-sm text-body-sm text-secondary mt-1 text-[13px]">
                {proposal.focusTaskTitle} calibrated to {proposal.sessionLengthMinutes}m block.
              </p>
              <div className="flex items-center gap-3 mt-3 w-full justify-center">
                <button
                  className="h-10 px-4 rounded-full bg-primary text-on-primary font-bold text-[13px] flex items-center gap-1.5 shadow-sm cursor-pointer hover:opacity-95 transition-opacity active:translate-y-px"
                  onClick={() => {
                    const target = tasks.find((t) => t.id === proposal.focusTaskId) || tasks[0];
                    if (target && onStartFocusSession) {
                      onStartFocusSession(target, proposal.sessionLengthMinutes, proposal.recoveryBreakMinutes);
                    }
                  }}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                  <span>Start {proposal.sessionLengthMinutes}m Focus</span>
                </button>
                <button
                  className="text-primary font-label-sm text-label-sm font-bold underline cursor-pointer text-[12px]"
                  onClick={onNavigateToPlanner}
                  type="button"
                >
                  View Planner →
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 14-Day Load Balance Crunch Window Card */}
      {!crunchWindow.dismissed && (
        <section
          aria-labelledby="crunch-headline"
          className="flex flex-col bg-surface-container-low rounded-DEFAULT p-space-md gap-space-md border border-border-light/30"
          id="crunch-card"
        >
          <div className="flex items-start gap-space-sm">
            <div className="w-10 h-10 rounded-full bg-alert-soft flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-tertiary text-[22px]">calendar_view_week</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-caption-eyebrow text-caption-eyebrow text-tertiary uppercase text-[11px] font-bold">
                14-Day Load Balance
              </span>
              <h2
                className="font-headline-md text-headline-md text-on-surface mt-0.5 font-bold text-[16px] leading-tight"
                id="crunch-headline"
              >
                Upcoming Crunch Window detected: {crunchWindow.startDate} – {crunchWindow.endDate}
              </h2>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="font-body-md text-body-md text-on-surface-variant text-[14px]">
              Demand density exceeds daily capacity by {crunchWindow.peakDemandPercentage}% due to overlapping midterm deadlines.
            </p>
            <div className="p-space-sm rounded-xl bg-surface flex flex-col gap-1 border border-border-light/40">
              <span className="font-label-sm text-label-sm text-primary uppercase text-[11px] font-bold">
                Suggested Pre-Emptive Shift
              </span>
              <p className="font-body-sm text-body-sm text-on-surface font-semibold text-[13px]">
                Advance {crunchWindow.suggestedShift.taskTitle} to {crunchWindow.suggestedShift.targetDay}.
              </p>
            </div>
          </div>

          {!rebalanceAccepted ? (
            <div className="flex items-center gap-space-sm">
              <button
                className="h-11 px-5 rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center active:translate-y-0.5 transition-transform shadow-sm font-bold text-[14px] cursor-pointer"
                onClick={() => setShowRebalanceModal(true)}
                type="button"
              >
                Review Rebalance
              </button>
              <button
                className="h-11 px-4 rounded-full bg-transparent text-secondary hover:text-on-surface font-label-md text-label-md flex items-center justify-center cursor-pointer text-[14px]"
                id="dismiss-crunch-btn"
                onClick={onDismissCrunch}
                type="button"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-secondary-container/60 flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
              <span className="font-label-sm text-label-sm font-bold text-[13px]">
                Rebalance applied. Data Systems shifted to Friday Oct 26.
              </span>
            </div>
          )}
        </section>
      )}

      {/* Today's Priority Tasks List */}
      <section aria-labelledby="tasks-heading" className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-headline-lg text-headline-lg text-on-surface font-extrabold text-[18px]" id="tasks-heading">
            Today's Priority Tasks
          </h2>
          <span className="font-caption-eyebrow text-caption-eyebrow text-muted-light text-[12px] font-bold">
            {pendingTasks.length} PENDING
          </span>
        </div>

        <div className="flex flex-col gap-space-sm">
          {priorityTasks.map((task) => {
            const isCompleted = task.status === "completed";
            // Stripe color based on priority or course
            let stripeColor = "bg-primary";
            let courseColor = "text-primary";
            if (task.priority === "urgent") {
              stripeColor = "bg-tertiary";
              courseColor = "text-tertiary font-bold";
            } else if (task.course === "IT 240") {
              stripeColor = "bg-secondary";
              courseColor = "text-secondary";
            } else if (task.course === "ENG 205") {
              stripeColor = "bg-outline-variant";
              courseColor = "text-muted-light";
            }

            return (
              <article
                key={task.id}
                className={`flex flex-col bg-surface rounded-DEFAULT p-space-md shadow-sm gap-2 relative overflow-hidden border border-border-light/40 transition-all ${
                  isCompleted ? "opacity-60 line-through" : ""
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stripeColor}`} />
                <div className="flex items-start justify-between gap-space-sm pl-1">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-caption-eyebrow text-caption-eyebrow text-[11px] font-bold ${courseColor}`}>
                        {task.course}
                      </span>
                      {task.subtasks && task.subtasks.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm text-label-sm text-[11px] font-bold">
                          {task.subtasks.filter((s) => s.estimatedMinutes > 5).length} chunks
                        </span>
                      )}
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mt-1 font-bold text-[15px]">
                      {task.title}
                    </h3>
                  </div>
                  <button
                    aria-label={`Mark task ${task.title} ${isCompleted ? "incomplete" : "done"}`}
                    className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                      isCompleted
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-low hover:bg-secondary-container text-primary"
                    }`}
                    onClick={() => onToggleTaskComplete(task.id)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">check</span>
                  </button>
                </div>
                <div className="flex items-center justify-between pl-1 pt-1 text-secondary font-body-sm text-body-sm text-[13px]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">
                      {task.deadlineText.includes("Tomorrow") ? "schedule" : "event"}
                    </span>{" "}
                    {task.deadlineText}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-numeric-data text-numeric-data font-bold text-on-surface text-[13px]">
                      {task.remainingMinutes}m left
                    </span>
                    {!isCompleted && (
                      <button
                        aria-label={`Start focus session for ${task.title}`}
                        className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-secondary-container text-primary font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                        onClick={() =>
                          onStartFocusSession &&
                          onStartFocusSession(task, Math.min(task.remainingMinutes || 25, 30), 5)
                        }
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                        <span>Focus</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Campus Guidance Footer Banner */}
      <footer className="mt-2 p-space-md rounded-DEFAULT bg-surface-container-low flex flex-col items-center text-center gap-2 border border-border-light/30">
        <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-primary shadow-xs">
          <span className="material-symbols-outlined text-[20px]">spa</span>
        </div>
        <p className="font-body-sm text-body-sm text-secondary max-w-[320px] text-[13px]">
          Looking for campus guidance or student counseling? Access campus support resources anytime.
        </p>
        <button
          className="font-label-md text-label-md text-primary font-bold hover:underline min-h-[44px] flex items-center justify-center px-4 cursor-pointer text-[14px]"
          onClick={onOpenSupport}
          type="button"
        >
          Explore Campus Support →
        </button>
      </footer>

      {/* Rebalance Review Dialog / Sheet */}
      {showRebalanceModal && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center"
          role="dialog"
        >
          <div className="w-full max-w-[390px] bg-surface rounded-t-3xl p-5 shadow-2xl flex flex-col space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1 bg-surface-container-highest rounded-full mx-auto" />
            <div className="flex items-start justify-between">
              <div>
                <span className="font-caption-eyebrow text-caption-eyebrow text-tertiary uppercase text-[11px] font-bold">
                  Pre-emptive Rebalance
                </span>
                <h3 className="font-headline-lg text-headline-lg text-on-surface font-extrabold text-[18px]">
                  Advance Data Systems Review
                </h3>
              </div>
              <button
                aria-label="Close"
                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer"
                onClick={() => setShowRebalanceModal(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant text-[14px]">
              Shifting 60 minutes from Monday Oct 29 to Friday Oct 26 relieves 35% congestion before midterm week.
            </p>

            <div className="p-3 rounded-xl bg-surface-alt flex flex-col gap-2 border border-border-light/40">
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-secondary">Current Schedule</span>
                <span className="font-bold text-tertiary">Oct 29 (Peak: 180 min)</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-secondary">New Schedule</span>
                <span className="font-bold text-primary">Oct 26 (Buffer: 60 min)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                className="flex-1 h-12 rounded-full bg-surface-container text-on-surface font-label-md text-label-md flex items-center justify-center active:translate-y-px transition-all font-bold text-[14px] cursor-pointer"
                onClick={() => setShowRebalanceModal(false)}
                type="button"
              >
                Keep Existing
              </button>
              <button
                className="flex-1 h-12 rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center shadow-md active:translate-y-px transition-all font-bold text-[14px] cursor-pointer"
                onClick={() => {
                  setShowRebalanceModal(false);
                  setRebalanceAccepted(true);
                  onAcceptRebalance();
                }}
                type="button"
              >
                Confirm Rebalance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
