import React, { useState } from "react";
import { Task } from "../types";
import { createChunkProposal } from "../domain/engine";
import { FocusTimerModal, FocusTimerSession } from "./FocusTimerModal";

interface PlannerViewProps {
  tasks: Task[];
  onToggleTaskComplete: (taskId: string) => void;
  onToggleTaskFlexibility: (taskId: string) => void;
  onOpenNewTask: () => void;
  onAutoChunk: (task: Task) => void;
  onStartFocusSession?: (task: Task, defaultMinutes?: number, breakMinutes?: number) => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  tasks,
  onToggleTaskComplete,
  onToggleTaskFlexibility,
  onOpenNewTask,
  onAutoChunk,
  onStartFocusSession,
}) => {
  const [filter, setFilter] = useState<"all" | "today" | "week" | "flexible">("all");
  const [showChunkModal, setShowChunkModal] = useState(false);
  const [selectedChunkTask, setSelectedChunkTask] = useState<Task>(() => {
    return tasks.find((t) => t.id === "task-cs301") || tasks[0];
  });
  const [chunkLocked, setChunkLocked] = useState(false);
  const [localTimerSession, setLocalTimerSession] = useState<FocusTimerSession | null>(null);
  const [isLocalMinimized, setIsLocalMinimized] = useState(false);

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filter === "today") return t.deadlineText.toLowerCase().includes("today");
    if (filter === "week") return !t.deadlineText.toLowerCase().includes("today");
    if (filter === "flexible") return t.isFlexible;
    return true;
  });

  const totalMinutes = tasks
    .filter((t) => t.status !== "completed")
    .reduce((acc, t) => acc + t.remainingMinutes, 0);

  const startTimer = (task: Task) => {
    const focusMins = task.remainingMinutes > 0 ? Math.min(task.remainingMinutes, 45) : 25;
    if (onStartFocusSession) {
      onStartFocusSession(task, focusMins, 5);
    } else {
      setLocalTimerSession({ task, defaultMinutes: focusMins, breakMinutes: 5 });
      setIsLocalMinimized(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-md pb-12">
      {/* Header Block */}
      <section className="flex flex-col space-y-space-xs pt-space-xs">
        <span className="font-caption-eyebrow text-caption-eyebrow text-primary uppercase tracking-widest text-[11px] font-bold">
          Academic Schedule
        </span>
        <h1 className="font-headline-xl text-headline-xl text-on-surface font-extrabold text-[24px]">
          Planner &amp; Tasks
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant text-[14px]">
          Manage assignments, deadlines, and smart task chunking.
        </p>
      </section>

      {/* Filter Chips (Horizontal Scrolling) */}
      <section className="w-full overflow-x-auto no-scrollbar -mx-gutter px-gutter">
        <div className="flex items-center gap-2 min-w-max py-1">
          <button
            aria-pressed={filter === "all"}
            className={`h-11 px-4 rounded-full font-label-md text-label-md flex items-center justify-center transition-all cursor-pointer font-semibold text-[13px] ${
              filter === "all"
                ? "bg-secondary-container text-primary shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-primary"
            }`}
            onClick={() => setFilter("all")}
            type="button"
          >
            All Tasks ({tasks.length})
          </button>
          <button
            aria-pressed={filter === "today"}
            className={`h-11 px-4 rounded-full font-label-md text-label-md flex items-center justify-center transition-all cursor-pointer font-semibold text-[13px] ${
              filter === "today"
                ? "bg-secondary-container text-primary shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-primary"
            }`}
            onClick={() => setFilter("today")}
            type="button"
          >
            Due Today ({tasks.filter((t) => t.deadlineText.toLowerCase().includes("today")).length})
          </button>
          <button
            aria-pressed={filter === "week"}
            className={`h-11 px-4 rounded-full font-label-md text-label-md flex items-center justify-center transition-all cursor-pointer font-semibold text-[13px] ${
              filter === "week"
                ? "bg-secondary-container text-primary shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-primary"
            }`}
            onClick={() => setFilter("week")}
            type="button"
          >
            This Week ({tasks.filter((t) => !t.deadlineText.toLowerCase().includes("today")).length})
          </button>
          <button
            aria-pressed={filter === "flexible"}
            className={`h-11 px-4 rounded-full font-label-md text-label-md flex items-center justify-center transition-all cursor-pointer font-semibold text-[13px] ${
              filter === "flexible"
                ? "bg-secondary-container text-primary shadow-sm"
                : "bg-surface-container text-on-surface-variant hover:text-primary"
            }`}
            onClick={() => setFilter("flexible")}
            type="button"
          >
            Flexible Work ({tasks.filter((t) => t.isFlexible).length})
          </button>
        </div>
      </section>

      {/* Primary Action Bar */}
      <section className="w-full">
        <button
          className="w-full h-12 rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-2 shadow-md hover:bg-primary-container active:translate-y-px transition-all font-bold text-[14px] cursor-pointer"
          id="open-new-task-btn"
          onClick={onOpenNewTask}
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">add_task</span>
          <span>Add New Task</span>
        </button>
      </section>

      {/* Smart Auto-Chunking Proposal Banner */}
      <section className="w-full rounded-2xl bg-surface-container-low p-4 shadow-sm relative overflow-hidden flex flex-col space-y-3 border border-border-light/30">
        {!chunkLocked ? (
          <>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider font-bold text-[11px]">
                    Smart Assist
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="font-caption-eyebrow text-caption-eyebrow text-on-surface-variant text-[11px]">
                    Capacity Optimal
                  </span>
                </div>
                <p className="font-headline-md text-headline-md text-on-surface text-[15px] leading-snug font-bold">
                  Chunk Proposal Ready
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed text-[13px]">
                  <span className="font-semibold text-on-surface">CS 301 Report</span> (80m remaining) can be divided into two 40-minute focused blocks with a 5-minute recovery break based on your capacity.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                className="h-11 px-4 rounded-full bg-primary-container text-on-primary font-label-md text-label-md flex items-center gap-1.5 shadow-sm active:translate-y-px transition-all font-bold text-[13px] cursor-pointer"
                id="preview-chunks-btn"
                onClick={() => setShowChunkModal(true)}
                type="button"
              >
                <span>Preview Chunks</span>
                <span className="material-symbols-outlined text-[18px]">splitscreen</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 p-1 text-primary animate-fade-in">
            <span className="material-symbols-outlined text-[22px]">check_circle</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md font-bold text-[14px]">
                Chunk schedule locked.
              </span>
              <span className="text-[12px] text-secondary">
                Calibrated to 40m study blocks with 5m physiological resets.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Task List Section */}
      <section aria-label="Task list" className="flex flex-col space-y-space-md">
        <div className="flex items-center justify-between px-1">
          <span className="font-caption-eyebrow text-caption-eyebrow text-secondary uppercase tracking-wider text-[11px] font-bold">
            Scheduled Workload
          </span>
          <span className="font-numeric-data text-numeric-data text-on-surface-variant text-xs">
            Total: {totalMinutes} min
          </span>
        </div>

        {/* Task Cards */}
        {filteredTasks.map((task) => {
          const isDone = task.status === "completed";

          // If Task 1 (CS 301): has structured chunks
          if (task.id === "task-cs301") {
            return (
              <article
                key={task.id}
                className={`w-full bg-surface rounded-2xl p-4 shadow-[0_2px_8px_rgba(22,32,32,0.08)] flex flex-col space-y-3.5 border border-border-light/40 transition-opacity ${
                  isDone ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-primary font-bold text-[11px]">
                        {task.course}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary font-label-sm text-label-sm flex items-center gap-1 font-bold text-[11px]">
                        <span className="material-symbols-outlined text-[14px]">priority_high</span>
                        High Priority
                      </span>
                    </div>
                    <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight font-bold text-[16px]">
                      {task.title}
                    </h2>
                    <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm mt-1 text-[13px]">
                      <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
                      <span>{task.deadlineText}</span>
                    </div>
                  </div>
                  <button
                    aria-label="Task options"
                    className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedChunkTask(task);
                      setShowChunkModal(true);
                    }}
                    title="Auto-chunk options"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                </div>

                {/* Time Metrics & Progress */}
                <div className="bg-surface-alt rounded-xl p-3 flex flex-col space-y-2 border border-border-light/30">
                  <div className="flex items-center justify-between text-on-surface-variant text-[13px]">
                    <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                      {task.remainingMinutes} min remaining
                    </span>
                    <span className="font-numeric-data text-numeric-data text-xs text-secondary">
                      Est: {task.estimatedMinutes} min
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: "50%" }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-primary flex items-center gap-1 text-[12px] font-bold">
                      <span className="material-symbols-outlined text-[14px]">timelapse</span>
                      Status: Started (50%)
                    </span>
                    <span className="font-caption-eyebrow text-caption-eyebrow text-xs text-secondary font-semibold">
                      Chunking active
                    </span>
                  </div>
                </div>

                {/* Subtasks / Smart Chunks Section */}
                <div className="flex flex-col space-y-2 pt-1" id="cs301-chunks">
                  <div className="flex items-center justify-between">
                    <span className="font-caption-eyebrow text-caption-eyebrow text-secondary uppercase text-[11px] font-bold">
                      Structured Focus Chunks
                    </span>
                    <span className="font-numeric-data text-numeric-data text-xs text-on-surface-variant">
                      2 chunks + 1 rest
                    </span>
                  </div>

                  {/* Chunk 1 */}
                  <div className="p-3 rounded-xl bg-surface-container flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">bolt</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-md text-label-md text-on-surface truncate font-semibold text-[14px]">
                          Greedy vs DP Comparison
                        </span>
                        <span className="font-numeric-data text-numeric-data text-xs text-secondary">
                          40 min • Focused work
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-surface text-primary font-label-sm text-label-sm flex-shrink-0 shadow-xs font-bold text-[11px]">
                      In Progress
                    </span>
                  </div>

                  {/* Recovery Break */}
                  <div className="px-3 py-2 rounded-xl bg-secondary-container/40 flex items-center justify-between gap-2 border border-secondary-container/60">
                    <div className="flex items-center gap-2.5 text-secondary">
                      <span className="material-symbols-outlined text-[18px] text-primary">self_improvement</span>
                      <span className="font-body-sm text-body-sm text-on-secondary-container text-[13px]">
                        5 min recovery break
                      </span>
                    </div>
                    <span className="font-caption-eyebrow text-caption-eyebrow text-xs text-primary font-bold">
                      RECHARGE
                    </span>
                  </div>

                  {/* Chunk 2 */}
                  <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-surface text-on-surface-variant flex items-center justify-center flex-shrink-0 shadow-xs">
                        <span className="material-symbols-outlined text-[18px]">edit_note</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-md text-label-md text-on-surface truncate font-semibold text-[14px]">
                          Complexity proof &amp; citations
                        </span>
                        <span className="font-numeric-data text-numeric-data text-xs text-secondary">
                          40 min • Synthesis
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-surface text-on-surface-variant font-label-sm text-label-sm flex-shrink-0 shadow-xs text-[11px]">
                      Planned
                    </span>
                  </div>
                </div>

                {/* Task Action Controls */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2.5 min-h-[44px] cursor-pointer py-1 select-none">
                    <input
                      checked={isDone}
                      className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                      onChange={() => onToggleTaskComplete(task.id)}
                      type="checkbox"
                    />
                    <span className="font-label-md text-label-md text-on-surface font-semibold text-[13px]">
                      Mark Complete
                    </span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      className="h-11 px-3 rounded-full text-secondary hover:bg-surface-container font-label-md text-label-md flex items-center gap-1 transition-colors cursor-pointer text-[13px]"
                      onClick={() => {
                        setSelectedChunkTask(task);
                        setShowChunkModal(true);
                      }}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">tune</span>
                      <span>Auto-chunk</span>
                    </button>
                    <button
                      className="h-11 px-3 rounded-full text-primary hover:bg-surface-container-low font-label-md text-label-md flex items-center gap-1 transition-colors cursor-pointer text-[13px]"
                      onClick={() => onAutoChunk(task)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          }

          // If Task 2 (IT 240 Usability): Flexible switch
          if (task.id === "task-it240") {
            return (
              <article
                key={task.id}
                className={`w-full bg-surface rounded-2xl p-4 shadow-[0_2px_8px_rgba(22,32,32,0.08)] flex flex-col space-y-3 border border-border-light/40 transition-opacity ${
                  isDone ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-secondary font-bold text-[11px]">
                        {task.course}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold text-[11px]">
                        Medium Priority
                      </span>
                    </div>
                    <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight font-bold text-[16px]">
                      {task.title}
                    </h2>
                    <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm mt-1 text-[13px]">
                      <span className="material-symbols-outlined text-[16px] text-secondary">event</span>
                      <span>Due in 4 days (Oct 28)</span>
                    </div>
                  </div>
                  <button
                    aria-label="Task options"
                    className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                    onClick={() => onAutoChunk(task)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                </div>

                <div className="bg-surface-alt rounded-xl p-3 flex items-center justify-between border border-border-light/30">
                  <div className="flex items-center gap-2 text-on-surface text-[13px]">
                    <span className="material-symbols-outlined text-[18px] text-secondary">hourglass_empty</span>
                    <span className="font-body-sm text-body-sm font-semibold">{task.remainingMinutes} min remaining</span>
                  </div>
                  <span className="font-caption-eyebrow text-caption-eyebrow text-xs text-secondary font-bold">
                    Ready to buffer
                  </span>
                </div>

                {/* Flexible Reschedule Toggle Switch */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low min-h-[48px]">
                  <div className="flex flex-col pr-2">
                    <span className="font-label-md text-label-md text-on-surface font-semibold text-[14px]">
                      Flexible Work
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                      Can be moved earlier to reduce load spikes
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer min-w-[44px] min-h-[44px] justify-center">
                    <input
                      checked={task.isFlexible}
                      className="sr-only peer"
                      onChange={() => onToggleTaskFlexibility(task.id)}
                      type="checkbox"
                    />
                    <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[14px] after:left-[4px] after:bg-surface after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 min-h-[44px] cursor-pointer py-1 select-none">
                    <input
                      checked={isDone}
                      className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                      onChange={() => onToggleTaskComplete(task.id)}
                      type="checkbox"
                    />
                    <span className="font-label-md text-label-md text-on-surface font-semibold text-[13px]">
                      Mark Complete
                    </span>
                  </label>
                </div>
              </article>
            );
          }

          // If Task 3 (ENG 205 Urgent Task): Alert styling with Start Now button
          if (task.id === "task-eng205") {
            return (
              <article
                key={task.id}
                className={`w-full bg-surface rounded-2xl p-4 shadow-[0_2px_8px_rgba(22,32,32,0.08)] flex flex-col space-y-3 border border-border-light/40 transition-opacity ${
                  isDone ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-secondary font-bold text-[11px]">
                        {task.course}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FFE1D9] text-[#862208] font-label-sm text-label-sm flex items-center gap-1 font-bold text-[11px]">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        Urgent
                      </span>
                    </div>
                    <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight font-bold text-[16px]">
                      {task.title}
                    </h2>
                    <div className="flex items-center gap-1.5 text-tertiary font-body-sm text-body-sm font-semibold mt-1 text-[13px]">
                      <span className="material-symbols-outlined text-[16px]">alarm</span>
                      <span>{task.deadlineText}</span>
                    </div>
                  </div>
                  <button
                    aria-label="Task options"
                    className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedChunkTask(task);
                      setShowChunkModal(true);
                    }}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-error-container/30 border border-error-container/40">
                  <div className="flex items-center gap-2 text-on-surface text-[13px]">
                    <span className="material-symbols-outlined text-[18px] text-tertiary">timer</span>
                    <span className="font-body-sm text-body-sm font-semibold">Duration: {task.remainingMinutes} min</span>
                  </div>
                  <button
                    className="h-11 px-4 rounded-full bg-tertiary text-on-tertiary font-label-sm text-label-sm flex items-center gap-1 shadow-sm active:translate-y-px transition-all font-bold text-[13px] cursor-pointer"
                    onClick={() => startTimer(task)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                    <span>Start Now</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 min-h-[44px] cursor-pointer py-1 select-none">
                    <input
                      checked={isDone}
                      className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                      onChange={() => onToggleTaskComplete(task.id)}
                      type="checkbox"
                    />
                    <span className="font-label-md text-label-md text-on-surface font-semibold text-[13px]">
                      Mark Complete
                    </span>
                  </label>
                </div>
              </article>
            );
          }

          // Standard task card for any other tasks
          return (
            <article
              key={task.id}
              className={`w-full bg-surface rounded-2xl p-4 shadow-[0_2px_8px_rgba(22,32,32,0.08)] flex flex-col space-y-3 border border-border-light/40 transition-opacity ${
                isDone ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-secondary font-bold text-[11px]">
                      {task.course}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant text-[11px]">
                      {task.priority.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight font-bold text-[15px]">
                    {task.title}
                  </h2>
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-body-sm mt-1 text-[13px]">
                    <span className="material-symbols-outlined text-[16px] text-secondary">event</span>
                    <span>{task.deadlineText}</span>
                  </div>
                </div>
                <button
                  aria-label="Task options"
                  className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedChunkTask(task);
                    setShowChunkModal(true);
                  }}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">more_vert</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-alt border border-border-light/30">
                <div className="flex items-center gap-2 text-on-surface text-[13px]">
                  <span className="material-symbols-outlined text-[18px] text-secondary">schedule</span>
                  <span className="font-body-sm text-body-sm font-semibold">{task.remainingMinutes} min remaining</span>
                </div>
                <button
                  className="text-primary font-label-sm text-label-sm font-bold hover:underline cursor-pointer text-[12px]"
                  onClick={() => startTimer(task)}
                  type="button"
                >
                  Focus Session →
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 min-h-[44px] cursor-pointer py-1 select-none">
                  <input
                    checked={isDone}
                    className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                    onChange={() => onToggleTaskComplete(task.id)}
                    type="checkbox"
                  />
                  <span className="font-label-md text-label-md text-on-surface font-semibold text-[13px]">
                    Mark Complete
                  </span>
                </label>
              </div>
            </article>
          );
        })}
      </section>

      {/* Deterministic Planning Rules PRD Guarantee Footer */}
      <footer className="w-full pt-2 pb-4">
        <div className="p-3.5 rounded-2xl bg-surface-container-low flex items-start gap-3 text-on-surface-variant border border-border-light/30">
          <span className="material-symbols-outlined text-[20px] text-primary flex-shrink-0 mt-0.5">
            verified_user
          </span>
          <p className="font-body-sm text-body-sm text-xs leading-relaxed text-secondary text-[12px]">
            <strong className="text-on-surface font-bold">Deterministic planning rules:</strong> Task modifications, splits, and rebalancing are never applied without your explicit confirmation.
          </p>
        </div>
      </footer>

      {/* Modal: Preview Chunks Bottom Sheet */}
      {showChunkModal && selectedChunkTask && (() => {
        const proposal = createChunkProposal(selectedChunkTask, 7.2);
        return (
          <div
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center"
            role="dialog"
          >
            <div className="w-full max-w-[390px] bg-surface rounded-t-3xl p-5 shadow-2xl flex flex-col space-y-4 animate-in slide-in-from-bottom duration-200 border-t border-border-light/30">
              <div className="w-12 h-1 bg-surface-container-highest rounded-full mx-auto" />
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-caption-eyebrow text-caption-eyebrow text-primary uppercase text-[11px] font-bold">
                    Proposal Review
                  </span>
                  <h3 className="font-headline-lg text-headline-lg text-on-surface font-extrabold text-[18px]">
                    {selectedChunkTask.course}: {selectedChunkTask.title} Splits
                  </h3>
                </div>
                <button
                  aria-label="Close"
                  className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer"
                  onClick={() => setShowChunkModal(false)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant text-[14px]">
                {proposal
                  ? `This split aligns with your 45-minute sustained focus threshold and schedules a light physiological reset.`
                  : `This assignment (${selectedChunkTask.remainingMinutes} min) fits comfortably within your focus threshold without requiring subtask fragmentation.`}
              </p>

              {proposal ? (
                <div className="flex flex-col space-y-2 max-h-[45vh] overflow-y-auto no-scrollbar">
                  {proposal.titles.map((title, idx) => (
                    <React.Fragment key={idx}>
                      <div className="p-3 rounded-xl bg-surface-alt flex items-center justify-between border border-border-light/30">
                        <span className="font-label-md text-label-md text-on-surface font-semibold text-[13px] flex-1 pr-2">
                          {idx + 1}. {title}
                        </span>
                        <span className="font-numeric-data text-numeric-data text-xs text-primary font-bold flex-shrink-0">
                          {proposal.chunkMinutes[idx]} min
                        </span>
                      </div>
                      {idx < proposal.titles.length - 1 && (
                        <div className="p-2.5 rounded-xl bg-secondary-container/50 flex items-center justify-between border border-secondary-container/60">
                          <span className="font-body-sm text-body-sm text-on-secondary-container text-[13px]">
                            Rest &amp; Hydration Interval
                          </span>
                          <span className="font-numeric-data text-numeric-data text-xs text-primary font-bold">
                            {proposal.recommendedBreakMinutes} min
                          </span>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-surface-container-low text-on-surface-variant text-[13px]">
                  Estimated duration: <strong>{selectedChunkTask.remainingMinutes} minutes</strong>. Ready for a single focused flow session.
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  className="flex-1 h-12 rounded-full bg-surface-container text-on-surface font-label-md text-label-md flex items-center justify-center active:translate-y-px transition-all font-bold text-[14px] cursor-pointer"
                  onClick={() => setShowChunkModal(false)}
                  type="button"
                >
                  Keep Single Block
                </button>
                <button
                  className="flex-1 h-12 rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center shadow-md active:translate-y-px transition-all font-bold text-[14px] cursor-pointer"
                  onClick={() => {
                    setShowChunkModal(false);
                    setChunkLocked(true);
                  }}
                  type="button"
                >
                  Accept Plan
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Local Fallback Focus Timer Modal if not managed by parent */}
      {localTimerSession && (
        <FocusTimerModal
          isOpen={Boolean(localTimerSession)}
          isMinimized={isLocalMinimized}
          onClose={() => setLocalTimerSession(null)}
          onCompleteTask={(taskId) => {
            onToggleTaskComplete(taskId);
            setLocalTimerSession(null);
          }}
          onMaximize={() => setIsLocalMinimized(false)}
          onMinimize={() => setIsLocalMinimized(true)}
          session={localTimerSession}
        />
      )}
    </div>
  );
};
