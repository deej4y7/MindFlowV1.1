import React from "react";
import { useAuth } from "../context/AuthContext";

interface HeaderProps {
  currentTab: string;
  onOpenSupport: () => void;
  onOpenProfile: () => void;
  syncStatus?: "synced" | "syncing" | "offline";
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onOpenSupport, onOpenProfile, syncStatus = "synced" }) => {
  const { user } = useAuth();

  const tabTitles: Record<string, string> = {
    dashboard: "Dashboard",
    planner: "Planner",
    assistant: "Assistant",
    wellness: "Wellness",
    profile: "Profile",
  };

  return (
    <header className="fixed top-0 w-full max-w-[390px] z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-border-light/30">
      <div className="h-16 px-gutter flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          <img
            alt="MindFlow Brand Mark"
            className="h-8 w-auto object-contain flex-shrink-0"
            src="https://lh3.googleusercontent.com/aida/AEtjO1XwRNbyFRA9FSMXRmej5OP6jEud0AsCahdJQe3qPmsBfuINa6fjYqWKidPkMfHP4r5j6enviQcvx9yBdPhM3Cj_AmG4t1fP2pjcDkBLWAliRWNCgAIdjaj2J0yEuCq4ftFIKYiOLK7a-yvXHSVRmuEvTwqvt-tSTwBjxZbSSJ4Vz0vFy6quQkOU5KI1Hq9GlUYSMw8v755nnxQj4VTZaeZRcPa2horA1vlY-uyn2MRAmp-9wgpw2aghdvRa"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-lg text-headline-lg text-primary truncate tracking-tight font-extrabold text-[20px]">
                MindFlow
              </span>
              {user && (
                <span
                  title={syncStatus === "syncing" ? "Syncing with Firestore..." : "Connected to Firestore"}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded-full"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === "syncing" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                  Cloud
                </span>
              )}
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant truncate text-[12px]">
              {tabTitles[currentTab] || "Dashboard"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-xs flex-shrink-0">
          <button
            aria-label="Campus Resources and Support"
            className="h-10 px-2.5 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center gap-1.5 text-secondary hover:text-primary transition-colors cursor-pointer"
            onClick={onOpenSupport}
            title="Campus & Wellness Resources"
            type="button"
          >
            <span className="material-symbols-outlined text-[19px] text-primary">spa</span>
            <span className="font-label-sm text-label-sm text-primary hidden sm:inline font-bold">Support</span>
          </button>
          <button
            aria-label={user ? `Open Profile (${user.displayName || user.email})` : "Sign In or View Profile"}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-on-primary hover:opacity-90 transition-all cursor-pointer overflow-hidden border border-border-light/40 shadow-xs"
            onClick={onOpenProfile}
            title={user ? `Logged in as ${user.displayName || user.email}` : "Click to sign in with Google"}
            type="button"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User Avatar"}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : user ? (
              <span className="font-bold text-[13px] text-on-primary">
                {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
              </span>
            ) : (
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
