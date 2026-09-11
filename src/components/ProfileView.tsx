import React, { useState } from "react";
import { WellnessCheckIn, Task } from "../types";
import { useAuth } from "../context/AuthContext";

interface ProfileViewProps {
  checkIn: WellnessCheckIn;
  tasks: Task[];
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onResetData: () => void;
  onOpenSupport: () => void;
  onManualSync?: () => void;
  isSyncing?: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  checkIn,
  tasks,
  theme,
  onToggleTheme,
  onResetData,
  onOpenSupport,
  onManualSync,
  isSyncing = false,
}) => {
  const { user, profile, signIn, signOut, updateAcademicGoal, loading: authLoading } = useAuth();
  const [dailyReminder, setDailyReminder] = useState(true);
  const [crunchAlerts, setCrunchAlerts] = useState(true);
  const [quietHours, setQuietHours] = useState(true);
  const [academicGoal, setAcademicGoal] = useState(
    profile?.academicGoal || "Maintain 3.8 GPA in BSIT while balancing mental wellness"
  );
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [exportToast, setExportToast] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signIn();
    } catch (err: unknown) {
      console.error("Sign in failed:", err);
      setAuthError(err instanceof Error ? err.message : "Failed to sign in with Google");
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    try {
      await signOut();
    } catch (err: unknown) {
      console.error("Sign out failed:", err);
      setAuthError(err instanceof Error ? err.message : "Failed to sign out");
    }
  };

  const handleSaveGoal = async () => {
    setIsSavingGoal(true);
    try {
      await updateAcademicGoal(academicGoal);
    } catch (err) {
      console.error("Failed to save goal:", err);
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      student: user?.displayName || "Student",
      email: user?.email || "Local User",
      app: "MindFlow v1.0.0",
      compliance: "Non-clinical self-management proxy (Sec 7.6)",
      wellnessHistory: [checkIn],
      tasks,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindflow-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExportToast(true);
    setTimeout(() => setExportToast(false), 2500);
  };

  return (
    <div className="flex flex-col w-full gap-space-lg pb-12">
      {/* Profile Header */}
      <div className="flex items-center gap-4 pt-2">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || "User"}
            className="w-16 h-16 rounded-full object-cover shadow-sm border-2 border-primary/20"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center text-2xl font-bold shadow-sm">
            {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "A"}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-extrabold text-[22px] truncate">
            {user?.displayName || "Student"}
          </h1>
          <span className="font-body-sm text-body-sm text-secondary text-[13px] truncate">
            {user?.email || "Academic Profile • BSIT"}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${user ? "bg-emerald-500 animate-pulse" : "bg-muted-light"}`} />
            <span className="font-label-sm text-label-sm text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
              {user ? "Cloud Firestore Persistence Active" : "Local Vault (Offline)"}
            </span>
          </div>
        </div>
      </div>

      {/* Firebase Account Card */}
      <section className="p-space-md rounded-2xl bg-surface shadow-sm flex flex-col gap-3 border border-border-light/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-caption-eyebrow text-caption-eyebrow text-secondary uppercase text-[11px] font-bold">
              Firebase Authentication
            </span>
          </div>
          {user && (
            <span className="text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
              Connected
            </span>
          )}
        </div>

        {user ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-alt border border-border-light/30">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="font-label-md text-on-surface font-semibold text-[13px] truncate">
                  {user.displayName || "Google User"}
                </span>
                <span className="font-body-sm text-secondary text-[12px] truncate">
                  {user.email}
                </span>
                <span className="text-[10px] text-muted-light mt-0.5">
                  UID: {user.uid.slice(0, 12)}...
                </span>
              </div>
              <button
                className="px-3 py-1.5 rounded-full bg-error-container/20 text-tertiary hover:bg-error-container/40 text-[12px] font-bold transition-colors cursor-pointer"
                onClick={handleSignOut}
                type="button"
              >
                Sign Out
              </button>
            </div>

            {onManualSync && (
              <button
                className="w-full h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-bold text-[13px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-border-light/30"
                onClick={onManualSync}
                disabled={isSyncing}
                type="button"
              >
                <span className={`material-symbols-outlined text-[18px] ${isSyncing ? "animate-spin" : ""}`}>
                  sync
                </span>
                <span>{isSyncing ? "Syncing with Cloud..." : "Sync All Data to Firestore"}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="text-[12px] text-secondary leading-relaxed">
              Sign in with your Google Account to securely sync your coursework tasks, wellness capacity logs, and adaptive study proposals across devices.
            </p>
            <button
              className="w-full h-11 rounded-full bg-primary hover:opacity-95 text-on-primary font-bold text-[13px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              onClick={handleSignIn}
              disabled={authLoading}
              type="button"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{authLoading ? "Connecting..." : "Sign In with Google"}</span>
            </button>
          </div>
        )}

        {authError && (
          <div className="p-2.5 rounded-xl bg-error-container/30 text-tertiary text-[12px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span className="truncate">{authError}</span>
          </div>
        )}
      </section>

      {/* Academic Goal Card */}
      <section className="p-space-md rounded-2xl bg-surface shadow-sm flex flex-col gap-2 border border-border-light/40">
        <div className="flex items-center justify-between">
          <span className="font-caption-eyebrow text-caption-eyebrow text-secondary uppercase text-[11px] font-bold">
            Academic Goal
          </span>
          <span className="material-symbols-outlined text-[18px] text-primary">school</span>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 p-2.5 rounded-xl bg-surface-alt font-body-sm text-on-surface text-[13px] border border-border-light/30 focus:outline-none focus:ring-1 focus:ring-primary"
            onChange={(e) => setAcademicGoal(e.target.value)}
            value={academicGoal}
          />
          {user && (
            <button
              className="px-3 py-2 rounded-xl bg-primary text-on-primary font-bold text-[12px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              onClick={handleSaveGoal}
              disabled={isSavingGoal}
              type="button"
            >
              {isSavingGoal ? "Saving..." : "Save"}
            </button>
          )}
        </div>
        <span className="text-[11px] text-muted-light">
          Synced with Firestore to contextualize study recommendations.
        </span>
      </section>

      {/* Interface & Preferences */}
      <section className="flex flex-col gap-3">
        <h2 className="font-headline-md text-headline-md text-on-surface font-bold text-[16px] px-1">
          Preferences &amp; Display
        </h2>

        <div className="rounded-2xl bg-surface p-space-md shadow-sm flex flex-col gap-3 border border-border-light/40">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between min-h-[44px]">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                {theme === "dark" ? "dark_mode" : "light_mode"}
              </span>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-semibold text-[14px]">
                  Appearance Theme
                </span>
                <span className="text-[12px] text-on-surface-variant">
                  {theme === "dark" ? "Dark Mode (Deep Slate)" : "Light Mode (Calm Warm Neutral)"}
                </span>
              </div>
            </div>
            <button
              className="px-3 py-1.5 rounded-full bg-surface-container font-label-sm text-label-sm text-primary font-bold cursor-pointer hover:bg-secondary-container transition-colors text-[12px]"
              onClick={onToggleTheme}
              type="button"
            >
              {theme === "dark" ? "Switch Light" : "Switch Dark"}
            </button>
          </div>

          <div className="h-px bg-border-light/40 w-full" />

          {/* Daily Reminder */}
          <div className="flex items-center justify-between min-h-[44px]">
            <div className="flex flex-col pr-2">
              <span className="font-label-md text-label-md text-on-surface font-semibold text-[14px]">
                Daily Check-In Reminder
              </span>
              <span className="text-[12px] text-on-surface-variant">
                Calm 8:30 AM notification prompt
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer min-w-[44px] min-h-[44px] justify-center">
              <input
                checked={dailyReminder}
                className="sr-only peer"
                onChange={() => setDailyReminder(!dailyReminder)}
                type="checkbox"
              />
              <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[14px] after:left-[4px] after:bg-surface after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>

          <div className="h-px bg-border-light/40 w-full" />

          {/* Crunch Window Alerts */}
          <div className="flex items-center justify-between min-h-[44px]">
            <div className="flex flex-col pr-2">
              <span className="font-label-md text-label-md text-on-surface font-semibold text-[14px]">
                14-Day Crunch Alerts
              </span>
              <span className="text-[12px] text-on-surface-variant">
                Notice when 3+ consecutive days exceed 130% load
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer min-w-[44px] min-h-[44px] justify-center">
              <input
                checked={crunchAlerts}
                className="sr-only peer"
                onChange={() => setCrunchAlerts(!crunchAlerts)}
                type="checkbox"
              />
              <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[14px] after:left-[4px] after:bg-surface after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>

          <div className="h-px bg-border-light/40 w-full" />

          {/* Quiet Hours */}
          <div className="flex items-center justify-between min-h-[44px]">
            <div className="flex flex-col pr-2">
              <span className="font-label-md text-label-md text-on-surface font-semibold text-[14px]">
                Quiet Rest Hours
              </span>
              <span className="text-[12px] text-on-surface-variant">
                10:00 PM – 7:00 AM (suppress study notifications)
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer min-w-[44px] min-h-[44px] justify-center">
              <input
                checked={quietHours}
                className="sr-only peer"
                onChange={() => setQuietHours(!quietHours)}
                type="checkbox"
              />
              <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[14px] after:left-[4px] after:bg-surface after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>
        </div>
      </section>

      {/* Cloud & Data Ownership */}
      <section className="flex flex-col gap-3">
        <h2 className="font-headline-md text-headline-md text-on-surface font-bold text-[16px] px-1">
          Cloud &amp; Data Ownership
        </h2>

        <div className="rounded-2xl bg-surface p-space-md shadow-sm flex flex-col gap-3 border border-border-light/40">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">cloud_done</span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-semibold text-[14px]">
                Cloud Firestore &amp; Secure Storage
              </span>
              <p className="text-[12px] text-secondary leading-relaxed mt-0.5">
                Your coursework tasks and wellness capacity checkpoints are securely stored with role-based document access rules. Only your authenticated Google account can access or modify your records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              className="flex-1 h-11 px-4 rounded-full bg-surface-container hover:bg-secondary-container text-primary font-label-md text-label-md flex items-center justify-center gap-1.5 transition-colors font-bold text-[13px] cursor-pointer"
              onClick={handleExport}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export All (JSON)</span>
            </button>
            <button
              className="h-11 px-4 rounded-full bg-surface-alt hover:bg-error-container/40 text-secondary hover:text-tertiary font-label-md text-label-md flex items-center justify-center transition-colors text-[13px] cursor-pointer"
              onClick={onResetData}
              type="button"
            >
              Reset Data
            </button>
          </div>

          {exportToast && (
            <div className="p-2.5 rounded-xl bg-secondary-container text-primary flex items-center gap-2 text-[12px] font-bold animate-fade-in">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>Backup downloaded to your device</span>
            </div>
          )}
        </div>
      </section>

      {/* Campus Resources Link Button */}
      <section className="w-full">
        <button
          className="w-full h-12 rounded-full bg-surface-container-low hover:bg-surface-container text-primary font-bold text-[14px] flex items-center justify-center gap-2 border border-border-light/40 transition-colors cursor-pointer"
          onClick={onOpenSupport}
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">spa</span>
          <span>Open Campus Support Directory</span>
        </button>
      </section>

      {/* Non-Diagnostic Product Disclosure */}
      <footer className="p-3.5 rounded-2xl bg-surface-container-low flex items-start gap-3 border border-border-light/30">
        <span className="material-symbols-outlined text-[20px] text-secondary mt-0.5">info</span>
        <p className="text-[12px] text-on-surface-variant leading-relaxed">
          MindFlow is an academic workload self-management proxy tool. It does not provide clinical diagnosis, mental health therapy, or crisis intervention services.
        </p>
      </footer>
    </div>
  );
};
