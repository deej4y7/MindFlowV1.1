import React from "react";
import { CAMPUS_SUPPORT_RESOURCES } from "../data/initialData";

interface CampusSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CampusSupportModal: React.FC<CampusSupportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      role="dialog"
    >
      <div className="w-full max-w-[390px] max-h-[85vh] bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border-light/30">
        {/* Header */}
        <div className="p-5 border-b border-border-light/30 flex items-start justify-between bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">spa</span>
            </div>
            <div>
              <span className="font-caption-eyebrow text-caption-eyebrow uppercase text-primary text-[10px] font-bold">
                Student Wellbeing Directory
              </span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-extrabold text-[18px]">
                Campus Support Resources
              </h2>
            </div>
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

        {/* Advisory Disclaimer */}
        <div className="px-5 py-2.5 bg-secondary-container/40 flex items-start gap-2 border-b border-secondary-container/60">
          <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 flex-shrink-0">
            health_and_safety
          </span>
          <p className="text-[12px] text-on-secondary-container leading-tight">
            MindFlow is a self-management tool, not a clinical or emergency service. Please contact these verified campus teams for personalized care.
          </p>
        </div>

        {/* Resources Scroll List */}
        <div className="p-5 overflow-y-auto space-y-3.5 no-scrollbar flex-1">
          {CAMPUS_SUPPORT_RESOURCES.map((res) => (
            <div
              key={res.id}
              className={`p-3.5 rounded-2xl flex flex-col gap-2 border transition-all ${
                res.isCrisis
                  ? "bg-alert-soft/50 border-tertiary/30"
                  : "bg-surface-alt border-border-light/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span
                    className={`font-label-sm text-[11px] font-bold uppercase tracking-wider ${
                      res.isCrisis ? "text-tertiary" : "text-primary"
                    }`}
                  >
                    {res.category}
                  </span>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold text-[15px] mt-0.5">
                    {res.name}
                  </h3>
                </div>
                {res.isCrisis && (
                  <span className="px-2 py-0.5 rounded-full bg-tertiary text-on-tertiary font-bold text-[10px] tracking-wide">
                    24/7
                  </span>
                )}
              </div>

              <p className="text-[13px] text-on-surface-variant leading-relaxed">
                {res.description}
              </p>

              <div className="flex flex-col gap-1 pt-1 text-[12px] text-secondary">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">call</span>
                  <span className="font-bold text-on-surface">{res.contact}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">schedule</span>
                  <span>{res.hours}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">location_on</span>
                  <span>{res.location}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end">
                <a
                  className={`h-9 px-4 rounded-full flex items-center gap-1 text-[12px] font-bold shadow-xs transition-transform active:translate-y-px ${
                    res.isCrisis
                      ? "bg-tertiary text-on-tertiary"
                      : "bg-primary text-on-primary"
                  }`}
                  href={`tel:${res.contact.replace(/[^0-9]/g, "")}`}
                >
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  <span>{res.isCrisis ? "Call / Text Now" : "Connect"}</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-light/30 bg-surface flex justify-center">
          <button
            className="w-full h-11 rounded-full bg-surface-container font-label-md text-on-surface font-bold text-[13px] cursor-pointer"
            onClick={onClose}
            type="button"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
};
