import React from "react";
import { CrunchWindow } from "../types";

interface ForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
  crunchWindow: CrunchWindow;
  onApplyShift: () => void;
}

export const ForecastModal: React.FC<ForecastModalProps> = ({
  isOpen,
  onClose,
  crunchWindow,
  onApplyShift,
}) => {
  if (!isOpen) return null;

  const horizonDays = [
    { day: "Wed", date: "Oct 24", minutes: 80, capacity: 120, isToday: true },
    { day: "Thu", date: "Oct 25", minutes: 90, capacity: 120 },
    { day: "Fri", date: "Oct 26", minutes: 60, capacity: 120, buffer: true },
    { day: "Sat", date: "Oct 27", minutes: 40, capacity: 120 },
    { day: "Sun", date: "Oct 28", minutes: 160, capacity: 120, crunch: true },
    { day: "Mon", date: "Oct 29", minutes: 180, capacity: 120, crunch: true },
    { day: "Tue", date: "Oct 30", minutes: 150, capacity: 120, crunch: true },
    { day: "Wed", date: "Oct 31", minutes: 75, capacity: 120 },
    { day: "Thu", date: "Nov 01", minutes: 80, capacity: 120 },
    { day: "Fri", date: "Nov 02", minutes: 50, capacity: 120 },
    { day: "Sat", date: "Nov 03", minutes: 30, capacity: 120 },
    { day: "Sun", date: "Nov 04", minutes: 40, capacity: 120 },
    { day: "Mon", date: "Nov 05", minutes: 90, capacity: 120 },
    { day: "Tue", date: "Nov 06", minutes: 60, capacity: 120 },
  ];

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      role="dialog"
    >
      <div className="w-full max-w-[390px] max-h-[85vh] bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border-light/30">
        <div className="p-5 border-b border-border-light/30 flex items-start justify-between bg-surface-container-low">
          <div>
            <span className="font-caption-eyebrow text-caption-eyebrow uppercase text-primary text-[10px] font-bold">
              14-Day Capacity Model
            </span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface font-extrabold text-[18px]">
              Workload Forecast
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

        <div className="p-5 overflow-y-auto space-y-4 no-scrollbar flex-1">
          {/* Crunch Notice */}
          <div className="p-3.5 rounded-2xl bg-alert-soft flex items-start gap-2.5 border border-tertiary/20">
            <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5">
              warning
            </span>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm font-bold text-tertiary text-[12px]">
                Crunch Window: {crunchWindow.startDate} – {crunchWindow.endDate}
              </span>
              <p className="text-[12px] text-on-surface-variant mt-0.5 leading-relaxed">
                Projected demand is 165m/day against your 120m capacity threshold due to 2 overlapping submission cutoffs.
              </p>
            </div>
          </div>

          {/* Daily Graph */}
          <div className="p-4 rounded-2xl bg-surface-alt flex flex-col gap-2.5 border border-border-light/30">
            <div className="flex justify-between items-center text-[12px]">
              <span className="font-bold text-on-surface">Daily Demand vs. 120m Target</span>
              <span className="text-secondary font-mono text-[11px]">14 Days</span>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {horizonDays.slice(0, 7).map((d) => {
                const ratio = Math.min(100, Math.round((d.minutes / d.capacity) * 100));
                return (
                  <div key={d.date} className="flex items-center gap-2 text-[12px]">
                    <span
                      className={`w-14 font-mono text-[11px] ${
                        d.isToday ? "font-bold text-primary" : "text-secondary"
                      }`}
                    >
                      {d.day} {d.date.slice(4)}
                    </span>
                    <div className="flex-1 h-3 rounded-full bg-surface-container-high overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          d.crunch ? "bg-tertiary" : d.isToday ? "bg-primary" : "bg-primary/70"
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                    <span
                      className={`w-12 text-right font-mono text-[11px] ${
                        d.crunch ? "font-bold text-tertiary" : "text-on-surface-variant"
                      }`}
                    >
                      {d.minutes}m
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggested Rebalance Plan */}
          <div className="p-4 rounded-2xl bg-surface-container-low flex flex-col gap-2 border border-border-light/40">
            <span className="font-label-sm text-primary uppercase text-[11px] font-bold">
              Suggested Rebalance Plan
            </span>
            <p className="text-[13px] text-on-surface font-semibold">
              Advance Data Systems review (60m) to Friday Oct 26.
            </p>
            <p className="text-[12px] text-secondary">
              Friday Oct 26 has 60m of unallocated capacity, smoothing out Monday's peak load.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-border-light/30 bg-surface flex gap-2">
          <button
            className="flex-1 h-12 rounded-full bg-surface-container font-label-md text-on-surface font-bold text-[13px] cursor-pointer"
            onClick={onClose}
            type="button"
          >
            Dismiss
          </button>
          <button
            className="flex-1 h-12 rounded-full bg-primary text-on-primary font-label-md font-bold text-[13px] shadow-md hover:bg-primary-container transition-colors cursor-pointer"
            onClick={() => {
              onApplyShift();
              onClose();
            }}
            type="button"
          >
            Apply Rebalance
          </button>
        </div>
      </div>
    </div>
  );
};
