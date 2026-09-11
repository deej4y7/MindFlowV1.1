import React, { useState, useEffect, useRef } from "react";
import { Task } from "../types";

export interface FocusTimerSession {
  task: Task;
  defaultMinutes?: number;
  breakMinutes?: number;
}

interface FocusTimerModalProps {
  session: FocusTimerSession;
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onCompleteTask: (taskId: string) => void;
}

export const FocusTimerModal: React.FC<FocusTimerModalProps> = ({
  session,
  isOpen,
  isMinimized,
  onClose,
  onMinimize,
  onMaximize,
  onCompleteTask,
}) => {
  const { task, defaultMinutes = 25, breakMinutes = 5 } = session;

  // Selected interval in minutes
  const [configuredFocusMinutes, setConfiguredFocusMinutes] = useState(
    defaultMinutes > 0 ? defaultMinutes : 25
  );
  const [configuredBreakMinutes] = useState(
    breakMinutes > 0 ? breakMinutes : 5
  );

  const [mode, setMode] = useState<"focus" | "break" | "celebrate">("focus");
  const [totalSeconds, setTotalSeconds] = useState(configuredFocusMinutes * 60);
  const [secondsRemaining, setSecondsRemaining] = useState(configuredFocusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(0);

  // Sync state if defaultMinutes changes when opening for another task
  useEffect(() => {
    const mins = defaultMinutes > 0 ? defaultMinutes : 25;
    setConfiguredFocusMinutes(mins);
    setMode("focus");
    setTotalSeconds(mins * 60);
    setSecondsRemaining(mins * 60);
    setIsRunning(true);
  }, [task.id, defaultMinutes]);

  // Audio Chime utility using Web Audio API
  const playChime = (chimeType: "focus_complete" | "break_complete") => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const now = ctx.currentTime;
      const frequencies =
        chimeType === "focus_complete" ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.001, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.85);
      });
    } catch {
      // Audio notification fallback
    }
  };

  // Main countdown timer interval
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (secondsRemaining === 0 && isRunning) {
      // Timer finished!
      setIsRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);

      if (mode === "focus") {
        playChime("focus_complete");
        setCompletedCycles((c) => c + 1);
        // Transition to recovery break
        setMode("break");
        const breakSecs = configuredBreakMinutes * 60;
        setTotalSeconds(breakSecs);
        setSecondsRemaining(breakSecs);
        setIsRunning(true);
      } else if (mode === "break") {
        playChime("break_complete");
        setMode("celebrate");
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, secondsRemaining, mode, configuredBreakMinutes]);

  if (!isOpen) return null;

  // Formatting minutes and seconds
  const displayMinutes = Math.floor(secondsRemaining / 60);
  const displaySeconds = secondsRemaining % 60;
  const timeFormatted = `${displayMinutes.toString().padStart(2, "0")}:${displaySeconds
    .toString()
    .padStart(2, "0")}`;

  // SVG circular ring calculation
  const circleRadius = 78;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const progressRatio = totalSeconds > 0 ? (totalSeconds - secondsRemaining) / totalSeconds : 0;
  const strokeDashoffset = circleCircumference * (1 - progressRatio);

  // Actions
  const togglePlayPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    const secs = (mode === "focus" ? configuredFocusMinutes : configuredBreakMinutes) * 60;
    setTotalSeconds(secs);
    setSecondsRemaining(secs);
  };

  const handleAddFiveMinutes = () => {
    setSecondsRemaining((prev) => prev + 300);
    setTotalSeconds((prev) => prev + 300);
  };

  const handleChangeInterval = (mins: number) => {
    setConfiguredFocusMinutes(mins);
    if (mode === "focus") {
      setIsRunning(false);
      setTotalSeconds(mins * 60);
      setSecondsRemaining(mins * 60);
    }
  };

  const handleStartBreak = () => {
    setMode("break");
    const breakSecs = configuredBreakMinutes * 60;
    setTotalSeconds(breakSecs);
    setSecondsRemaining(breakSecs);
    setIsRunning(true);
  };

  const handleBackToFocus = () => {
    setMode("focus");
    const focusSecs = configuredFocusMinutes * 60;
    setTotalSeconds(focusSecs);
    setSecondsRemaining(focusSecs);
    setIsRunning(true);
  };

  const handleCompleteAndExit = () => {
    onCompleteTask(task.id);
    onClose();
  };

  // Minimized Floating Pill View
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[360px] bg-surface/95 backdrop-blur-md border border-primary/30 shadow-xl rounded-full p-2 flex items-center justify-between cursor-pointer hover:border-primary transition-all animate-fade-in"
        onClick={onMaximize}
        role="dialog"
        aria-label="Minimized Focus Timer"
      >
        <div className="flex items-center gap-2.5 pl-2 min-w-0 flex-1">
          <div className="relative w-8 h-8 flex-shrink-0 flex items-center justify-center">
            <svg className="w-8 h-8 -rotate-90">
              <circle
                cx="16"
                cy="16"
                r="13"
                className="text-surface-container stroke-current"
                strokeWidth="3"
                fill="none"
              />
              <circle
                cx="16"
                cy="16"
                r="13"
                className={`${mode === "break" ? "text-amber-500" : "text-primary"} stroke-current transition-all duration-300`}
                strokeWidth="3"
                strokeDasharray={2 * Math.PI * 13}
                strokeDashoffset={2 * Math.PI * 13 * (1 - progressRatio)}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span
              className={`absolute w-2 h-2 rounded-full ${
                isRunning ? (mode === "break" ? "bg-amber-500" : "bg-primary") : "bg-muted-light"
              } ${isRunning ? "animate-ping" : ""}`}
            />
          </div>

          <div className="flex flex-col min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <span className="font-caption-eyebrow uppercase text-[10px] font-bold text-primary truncate">
                {mode === "break" ? "Recovery Break" : "Focus Session"}
              </span>
              <span className="text-[10px] text-muted-light">• {task.course}</span>
            </div>
            <span className="font-headline-md font-bold text-on-surface text-[12px] truncate">
              {task.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 pr-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="font-numeric-data font-bold text-[14px] text-primary px-1">
            {timeFormatted}
          </span>
          <button
            aria-label={isRunning ? "Pause timer" : "Resume timer"}
            className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center cursor-pointer hover:opacity-90"
            onClick={togglePlayPause}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isRunning ? "pause" : "play_arrow"}
            </span>
          </button>
          <button
            aria-label="Expand timer"
            className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center cursor-pointer hover:bg-surface-container-high"
            onClick={onMaximize}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_full</span>
          </button>
        </div>
      </div>
    );
  }

  // Full Expanded Modal View
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
    >
      <div className="w-full max-w-[370px] bg-surface rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4 border border-border-light/40 relative animate-in zoom-in-95 duration-150">
        {/* Top Header Actions */}
        <div className="w-full flex items-center justify-between">
          <button
            aria-label="Minimize timer"
            className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant hover:text-primary flex items-center justify-center cursor-pointer transition-colors"
            onClick={onMinimize}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close_fullscreen</span>
          </button>

          <span className="font-caption-eyebrow uppercase text-[11px] font-bold tracking-wider text-primary">
            {mode === "focus"
              ? "Active Focus Block"
              : mode === "break"
              ? "Calibrated Recovery Break"
              : "Flow State Complete"}
          </span>

          <button
            aria-label="Close session"
            className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant hover:text-tertiary flex items-center justify-center cursor-pointer transition-colors"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Task Title & Details */}
        <div className="flex flex-col items-center max-w-[300px]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary text-[11px] font-bold">
              {task.course}
            </span>
            {completedCycles > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-secondary-container text-primary text-[11px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">done_all</span>
                <span>{completedCycles} chunk{completedCycles > 1 ? "s" : ""} done</span>
              </span>
            )}
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold text-[16px] leading-snug line-clamp-2">
            {task.title}
          </h2>
        </div>

        {/* Mode Selector Pill if in setup / ready state */}
        <div className="flex items-center p-1 rounded-full bg-surface-container-low border border-border-light/30">
          <button
            className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
              mode === "focus"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-secondary hover:text-on-surface"
            }`}
            onClick={handleBackToFocus}
            type="button"
          >
            Focus Block
          </button>
          <button
            className={`px-3 py-1 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
              mode === "break"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-secondary hover:text-on-surface"
            }`}
            onClick={handleStartBreak}
            type="button"
          >
            Recovery Break ({configuredBreakMinutes}m)
          </button>
        </div>

        {/* Circular Countdown Display */}
        <div className="relative w-48 h-48 flex items-center justify-center my-1">
          <svg className="w-48 h-48 -rotate-90">
            {/* Background Track */}
            <circle
              cx="96"
              cy="96"
              r={circleRadius}
              className="text-surface-container stroke-current"
              strokeWidth="7"
              fill="none"
            />
            {/* Animated Progress Ring */}
            <circle
              cx="96"
              cy="96"
              r={circleRadius}
              className={`${
                mode === "break" ? "text-amber-500" : "text-primary"
              } stroke-current transition-all duration-500`}
              strokeWidth="7"
              strokeDasharray={circleCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          {/* Time & State in center of circle */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`font-numeric-data font-extrabold text-[36px] tracking-tight ${
                mode === "break" ? "text-amber-600 dark:text-amber-400" : "text-primary"
              }`}
            >
              {timeFormatted}
            </span>
            <span className="text-[12px] font-medium text-secondary flex items-center gap-1 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRunning ? (mode === "break" ? "bg-amber-500" : "bg-primary") : "bg-muted-light"
                } ${isRunning ? "animate-pulse" : ""}`}
              />
              <span>{isRunning ? (mode === "break" ? "Resting" : "In Flow") : "Paused"}</span>
            </span>
          </div>
        </div>

        {/* Interval Selection Chips (when paused or in focus mode) */}
        {mode === "focus" && (
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {[15, 25, 40, 50].map((mins) => (
              <button
                key={mins}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border ${
                  configuredFocusMinutes === mins
                    ? "bg-primary-fixed text-primary border-primary/30"
                    : "bg-surface-alt text-on-surface-variant hover:bg-surface-container border-border-light/30"
                }`}
                onClick={() => handleChangeInterval(mins)}
                type="button"
              >
                {mins}m
              </button>
            ))}
            <button
              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-surface-container text-primary hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-0.5"
              onClick={handleAddFiveMinutes}
              type="button"
            >
              +5m
            </button>
          </div>
        )}

        {/* Mindful Advice Prompt */}
        <p className="font-body-sm text-body-sm text-on-surface-variant text-[13px] px-2 leading-relaxed">
          {mode === "focus"
            ? "Calibrated to protect your cognitive stamina. Single-tasking with zero context switches."
            : mode === "break"
            ? "Deep breath. Step away from the screen, stretch, or hydrate."
            : "Chunk complete! Great momentum. Log as complete or transition to the next block."}
        </p>

        {/* Primary Controls Row */}
        <div className="flex items-center gap-3 w-full pt-1">
          <button
            aria-label="Reset timer block"
            className="w-12 h-12 rounded-full bg-surface-container text-secondary hover:text-on-surface flex items-center justify-center cursor-pointer transition-colors"
            onClick={handleReset}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">replay</span>
          </button>

          <button
            className={`flex-1 h-12 rounded-full font-bold text-[14px] flex items-center justify-center gap-2 shadow-md active:translate-y-px transition-all cursor-pointer ${
              mode === "break"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-primary hover:opacity-95 text-on-primary"
            }`}
            onClick={togglePlayPause}
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isRunning ? "pause" : "play_arrow"}
            </span>
            <span>{isRunning ? "Pause Session" : "Start Focus"}</span>
          </button>

          <button
            aria-label="Mark task complete"
            className="h-12 px-3.5 rounded-full bg-secondary-container hover:bg-secondary-container/80 text-primary font-bold text-[12px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
            onClick={handleCompleteAndExit}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">done</span>
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
