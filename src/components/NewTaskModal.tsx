import React, { useState } from "react";
import { Task, TaskPriority } from "../types";

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Task) => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({ isOpen, onClose, onAddTask }) => {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("CS 301");
  const [deadlineText, setDeadlineText] = useState("Due in 3 days");
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [isFlexible, setIsFlexible] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      course: course.trim(),
      deadlineAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      deadlineText,
      estimatedMinutes,
      remainingMinutes: estimatedMinutes,
      priority,
      status: "planned",
      isFlexible,
      isFixedDeadline: !isFlexible,
    };

    onAddTask(newTask);
    onClose();
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      role="dialog"
    >
      <div className="w-full max-w-[390px] bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border-light/30">
        <div className="p-5 border-b border-border-light/30 flex items-start justify-between bg-surface-container-low">
          <div>
            <span className="font-caption-eyebrow text-caption-eyebrow uppercase text-primary text-[10px] font-bold">
              Academic Assignment
            </span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface font-extrabold text-[18px]">
              Add New Task
            </h2>
          </div>
          <button
            aria-label="Close"
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[75vh]" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-on-surface font-semibold text-[13px]" htmlFor="task-title">
              Task Title
            </label>
            <input
              required
              className="h-12 px-3.5 rounded-xl bg-surface-alt border border-border-light/40 text-on-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary"
              id="task-title"
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dynamic Programming Problem Set"
              type="text"
              value={title}
            />
          </div>

          {/* Course and Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-label-md text-on-surface font-semibold text-[13px]" htmlFor="task-course">
                Course Code
              </label>
              <input
                className="h-12 px-3.5 rounded-xl bg-surface-alt border border-border-light/40 text-on-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary"
                id="task-course"
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. CS 301"
                type="text"
                value={course}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-md text-on-surface font-semibold text-[13px]" htmlFor="task-duration">
                Est. Minutes
              </label>
              <input
                className="h-12 px-3.5 rounded-xl bg-surface-alt border border-border-light/40 text-on-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary"
                id="task-duration"
                max={480}
                min={15}
                onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 60)}
                step={15}
                type="number"
                value={estimatedMinutes}
              />
            </div>
          </div>

          {/* Deadline label */}
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-on-surface font-semibold text-[13px]" htmlFor="task-deadline">
              Deadline Text
            </label>
            <input
              className="h-12 px-3.5 rounded-xl bg-surface-alt border border-border-light/40 text-on-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary"
              id="task-deadline"
              onChange={(e) => setDeadlineText(e.target.value)}
              placeholder="e.g. Due in 3 days (Oct 27)"
              type="text"
              value={deadlineText}
            />
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-on-surface font-semibold text-[13px]">
              Priority Tier
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  className={`h-10 rounded-xl font-label-sm text-[12px] font-bold capitalize transition-all cursor-pointer ${
                    priority === p
                      ? p === "urgent"
                        ? "bg-tertiary text-on-tertiary shadow-sm"
                        : "bg-primary text-on-primary shadow-sm"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                  onClick={() => setPriority(p)}
                  type="button"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Flexible Work Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-border-light/30">
            <div className="flex flex-col pr-2">
              <span className="font-label-md text-on-surface font-semibold text-[13px]">
                Flexible Work
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Permit load balancer to suggest pre-emptive scheduling
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer min-w-[44px] min-h-[44px] justify-center">
              <input
                checked={isFlexible}
                className="sr-only peer"
                onChange={() => setIsFlexible(!isFlexible)}
                type="checkbox"
              />
              <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[14px] after:left-[4px] after:bg-surface after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              className="flex-1 h-12 rounded-full bg-surface-container text-on-surface font-bold text-[13px] cursor-pointer"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="flex-1 h-12 rounded-full bg-primary text-on-primary font-bold text-[13px] shadow-md hover:bg-primary-container transition-colors cursor-pointer"
              type="submit"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
