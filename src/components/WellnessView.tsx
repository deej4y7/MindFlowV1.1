import React, { useState } from "react";
import { WellnessCheckIn, DayTrend } from "../types";
import { calculateWellnessComposite, getWellnessTier } from "../domain/engine";

interface WellnessViewProps {
  checkIn: WellnessCheckIn;
  trend: DayTrend[];
  onSaveCheckIn: (updated: WellnessCheckIn) => void;
}

export const WellnessView: React.FC<WellnessViewProps> = ({ checkIn, trend, onSaveCheckIn }) => {
  const [energy, setEnergy] = useState(checkIn.energy);
  const [motivation, setMotivation] = useState(checkIn.motivation);
  const [accomplishment, setAccomplishment] = useState(checkIn.accomplishment);
  const [note, setNote] = useState(checkIn.note || "");
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const currentW = calculateWellnessComposite(energy, motivation, accomplishment);
  const tier = getWellnessTier(currentW);

  let tierBadgeClass = "px-3 py-1 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm shadow-xs flex items-center gap-1 font-bold text-[12px]";
  let tierDotClass = "w-2 h-2 rounded-full bg-primary inline-block";
  let tierLabel = "Sustainable Capacity";
  let tierGuidance = "Your capacity is in a healthy range. Standard 40-50 minute focus sessions and standard task chunking are recommended.";

  if (tier === "strained") {
    tierBadgeClass = "px-3 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm shadow-xs flex items-center gap-1 font-bold text-[12px]";
    tierDotClass = "w-2 h-2 rounded-full bg-secondary inline-block";
    tierLabel = "Moderate Strain";
    tierGuidance = "You are carrying some strain today. MindFlow suggests 25-minute focus intervals and deferring lower-priority tasks.";
  } else if (tier === "high_risk") {
    tierBadgeClass = "px-3 py-1 rounded-full bg-alert-soft text-tertiary font-label-sm text-label-sm shadow-xs flex items-center gap-1 font-bold text-[12px]";
    tierDotClass = "w-2 h-2 rounded-full bg-tertiary inline-block";
    tierLabel = "High-Risk Strain";
    tierGuidance = "Your capacity is significantly strained. Micro-chunking (10-15 min tasks) and campus wellness breaks are strongly encouraged.";
  }

  const handleSave = () => {
    const updated: WellnessCheckIn = {
      ...checkIn,
      energy,
      motivation,
      accomplishment,
      wellnessComposite: currentW,
      note,
      recordedAt: new Date().toISOString(),
    };
    onSaveCheckIn(updated);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2500);
  };

  return (
    <div className="flex flex-col w-full gap-space-lg pb-10">
      {/* Eyebrow & Title */}
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center gap-1.5 text-primary">
          <span className="material-symbols-outlined text-[18px]">spa</span>
          <span className="font-caption-eyebrow text-caption-eyebrow tracking-widest uppercase text-[11px] font-bold">
            Daily Check-In
          </span>
        </div>
        <h2 className="font-headline-xl text-headline-xl text-on-surface font-extrabold text-[24px]">
          How is your capacity today?
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant text-[14px]">
          A brief 30-second reflection to calibrate your daily study workload.
        </p>
        <div className="mt-space-xs inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-surface-container text-on-surface-variant shadow-xs">
          <span className="material-symbols-outlined text-[15px] text-secondary">info</span>
          <span className="font-label-sm text-label-sm text-secondary text-[11px]">
            Self-management proxy • Not a clinical diagnostic or crisis tool.
          </span>
        </div>
      </div>

      {/* Sliders Container */}
      <div className="flex flex-col gap-space-md">
        {/* Energy Slider */}
        <div className="p-space-md rounded-DEFAULT bg-surface shadow-sm flex flex-col gap-space-sm border border-border-light/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">bolt</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold text-[15px]">
                  Energy (E)
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                  Physical &amp; mental vitality
                </p>
              </div>
            </div>
            <span className="font-numeric-data text-numeric-data text-primary font-bold px-2 py-0.5 rounded-full bg-surface-container text-[13px]">
              {energy.toFixed(1)} / 10
            </span>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="relative flex items-center h-11">
              <input
                aria-label="Energy level slider"
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-surface-container accent-primary focus:outline-none"
                max={10}
                min={0}
                onChange={(e) => setEnergy(parseFloat(e.target.value))}
                step={0.5}
                type="range"
                value={energy}
              />
            </div>
            <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm text-[12px]">
              <span>Low energy</span>
              <span>Well rested</span>
            </div>
          </div>
        </div>

        {/* Motivation Slider */}
        <div className="p-space-md rounded-DEFAULT bg-surface shadow-sm flex flex-col gap-space-sm border border-border-light/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">psychology</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold text-[15px]">
                  Motivation (M)
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                  Drive &amp; engagement with coursework
                </p>
              </div>
            </div>
            <span className="font-numeric-data text-numeric-data text-primary font-bold px-2 py-0.5 rounded-full bg-surface-container text-[13px]">
              {motivation.toFixed(1)} / 10
            </span>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="relative flex items-center h-11">
              <input
                aria-label="Motivation level slider"
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-surface-container accent-primary focus:outline-none"
                max={10}
                min={0}
                onChange={(e) => setMotivation(parseFloat(e.target.value))}
                step={0.5}
                type="range"
                value={motivation}
              />
            </div>
            <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm text-[12px]">
              <span>Distant / Overwhelmed</span>
              <span>Engaged / Ready</span>
            </div>
          </div>
        </div>

        {/* Accomplishment Slider */}
        <div className="p-space-md rounded-DEFAULT bg-surface shadow-sm flex flex-col gap-space-sm border border-border-light/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold text-[15px]">
                  Sense of Accomplishment (A)
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                  Confidence in academic progress
                </p>
              </div>
            </div>
            <span className="font-numeric-data text-numeric-data text-primary font-bold px-2 py-0.5 rounded-full bg-surface-container text-[13px]">
              {accomplishment.toFixed(1)} / 10
            </span>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="relative flex items-center h-11">
              <input
                aria-label="Accomplishment level slider"
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-surface-container accent-primary focus:outline-none"
                max={10}
                min={0}
                onChange={(e) => setAccomplishment(parseFloat(e.target.value))}
                step={0.5}
                type="range"
                value={accomplishment}
              />
            </div>
            <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm text-[12px]">
              <span>Stuck</span>
              <span>Productive</span>
            </div>
          </div>
        </div>
      </div>

      {/* Composite Score & Trend Section */}
      <div className="p-space-md rounded-DEFAULT bg-surface shadow-sm flex flex-col gap-space-md border border-border-light/40">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-caption-eyebrow text-caption-eyebrow text-secondary uppercase text-[11px] font-bold">
              Composite Score
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-headline-xl text-headline-xl text-primary font-extrabold text-[24px]">
                W = {currentW.toFixed(1)}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant text-[13px]">
                / 10
              </span>
            </div>
          </div>
          <span className={tierBadgeClass}>
            <span className={tierDotClass} />
            {tierLabel}
          </span>
        </div>

        <div className="p-3 rounded-[12px] bg-surface-container-low flex items-start gap-2.5">
          <span className="material-symbols-outlined text-primary text-[20px] flex-shrink-0 mt-0.5">
            check_circle
          </span>
          <p className="font-body-sm text-body-sm text-on-surface text-[13px] leading-relaxed">
            {tierGuidance}
          </p>
        </div>

        {/* 7-Day Trend Chart */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface font-bold text-[13px]">
              7-Day Trend
            </span>
            <div className="flex items-center gap-1 text-success">
              <span className="material-symbols-outlined text-[16px]">
                {currentW >= 7 ? "trending_up" : currentW >= 4 ? "trending_flat" : "trending_down"}
              </span>
              <span className="font-label-sm text-label-sm font-semibold text-[12px]">
                {currentW >= 7 ? "Stable capacity" : currentW >= 4 ? "Moderate capacity" : "Strained capacity"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            {trend.map((item) => {
              const isToday = item.day === "Today";
              const scoreVal = isToday ? currentW : item.score;
              const widthPct = Math.min(100, Math.max(0, scoreVal * 10));

              return (
                <div key={item.day} className="flex items-center gap-2">
                  <span
                    className={`w-8 font-caption-eyebrow text-caption-eyebrow text-[11px] ${
                      isToday ? "text-primary font-bold" : "text-on-surface-variant"
                    }`}
                  >
                    {item.day}
                  </span>
                  <div
                    className={`flex-1 h-3 rounded-full overflow-hidden ${
                      isToday ? "bg-surface-container" : "bg-surface-container-low"
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isToday ? "bg-primary" : "bg-secondary-fixed-dim"
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span
                    className={`w-8 text-right font-numeric-data text-numeric-data text-[12px] ${
                      isToday ? "text-primary font-bold" : "text-on-surface-variant"
                    }`}
                  >
                    {scoreVal.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accordion: Optional Private Note */}
      <div className="rounded-DEFAULT bg-surface shadow-sm overflow-hidden border border-border-light/40">
        <button
          aria-expanded={accordionOpen}
          className="w-full p-space-md flex items-center justify-between text-left hover:bg-surface-container-low transition-colors cursor-pointer"
          onClick={() => setAccordionOpen(!accordionOpen)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">edit_note</span>
            <span className="font-label-md text-label-md text-on-surface font-semibold text-[14px]">
              Add optional private note
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm text-secondary px-2 py-0.5 rounded-full bg-surface-container text-[11px]">
              local only
            </span>
            <span
              className="material-symbols-outlined text-secondary text-[20px] transition-transform duration-200"
              style={{ transform: accordionOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              expand_more
            </span>
          </div>
        </button>
        {accordionOpen && (
          <div className="px-space-md pb-space-md flex flex-col gap-2 animate-fade-in">
            <textarea
              className="w-full p-3 text-body-md font-body-md rounded-[12px] bg-surface-alt text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface shadow-xs resize-none text-[14px] border border-border-light/30"
              onChange={(e) => setNote(e.target.value)}
              placeholder="Jot down context (e.g. slept late, busy lab morning)... Never sent to AI."
              rows={3}
              value={note}
            />
            <span className="font-label-sm text-label-sm text-on-surface-variant text-[11px]">
              Notes stay isolated strictly within your device secure storage.
            </span>
          </div>
        )}
      </div>

      {/* Save Action & Privacy Note */}
      <div className="flex flex-col gap-space-sm">
        <button
          className="h-12 w-full rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-sm active:translate-y-px transition-all flex items-center justify-center gap-2 hover:bg-primary-container cursor-pointer font-bold text-[14px]"
          onClick={handleSave}
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">save</span>
          <span>Save Today's Check-In</span>
        </button>

        {showToast && (
          <div className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-full bg-secondary-container text-primary font-label-sm text-label-sm self-center shadow-sm animate-fade-in font-bold text-[12px]">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Saved to local storage</span>
          </div>
        )}

        <div className="flex items-start gap-2 px-space-sm pt-1">
          <span className="material-symbols-outlined text-secondary text-[16px] flex-shrink-0 mt-0.5">
            lock
          </span>
          <p className="font-label-sm text-label-sm text-on-surface-variant leading-tight text-[11px]">
            Your wellness scores are stored with local-first privacy. Raw E/M/A scores are never sent to external AI services.
          </p>
        </div>
      </div>
    </div>
  );
};
