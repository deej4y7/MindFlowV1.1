import React from "react";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "planner", label: "Planner", icon: "event_upcoming" },
    { id: "assistant", label: "Assistant", icon: "auto_awesome" },
    { id: "wellness", label: "Wellness", icon: "favorite" },
    { id: "profile", label: "Profile", icon: "person" },
  ];

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 w-full max-w-[390px] z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(22,32,32,0.06)] border-t border-border-light/30"
    >
      <div className="flex items-center justify-around h-16 px-space-xs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center min-w-[56px] h-12 rounded-[14px] px-1 transition-all group cursor-pointer ${
                isActive
                  ? "text-primary font-bold bg-secondary-container/60"
                  : "text-on-surface-variant hover:text-primary"
              }`}
              onClick={() => onTabChange(tab.id)}
              type="button"
            >
              <span
                className={`material-symbols-outlined text-[24px] ${
                  isActive ? "material-symbols-fill" : ""
                }`}
              >
                {tab.icon}
              </span>
              <span className="font-label-sm text-label-sm mt-0.5 tracking-tight text-[11px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
