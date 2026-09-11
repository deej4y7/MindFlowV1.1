import { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { DashboardView } from "./components/DashboardView";
import { WellnessView } from "./components/WellnessView";
import { PlannerView } from "./components/PlannerView";
import { AssistantView } from "./components/AssistantView";
import { ProfileView } from "./components/ProfileView";
import { CampusSupportModal } from "./components/CampusSupportModal";
import { NewTaskModal } from "./components/NewTaskModal";
import { ForecastModal } from "./components/ForecastModal";
import { FocusTimerModal, FocusTimerSession } from "./components/FocusTimerModal";

import {
  INITIAL_TASKS,
  INITIAL_CHECK_IN,
  INITIAL_7_DAY_TREND,
  INITIAL_CRUNCH_WINDOW,
  INITIAL_ASSISTANT_MESSAGES,
} from "./data/initialData";
import { Task, WellnessCheckIn, DayTrend, CrunchWindow, RecommendationOutput } from "./types";
import { generateAdaptiveProposal } from "./domain/engine";
import { useAuth } from "./context/AuthContext";
import {
  saveTask,
  subscribeTasks,
  saveWellnessCheckIn,
  subscribeWellnessCheckIn,
  saveProposal,
} from "./lib/firebase";

export default function App() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline">("offline");
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Focus Timer Session State
  const [focusSession, setFocusSession] = useState<FocusTimerSession | null>(null);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isTimerMinimized, setIsTimerMinimized] = useState(false);

  const handleStartFocusSession = (task: Task, defaultMinutes?: number, breakMinutes?: number) => {
    setFocusSession({ task, defaultMinutes, breakMinutes });
    setIsTimerOpen(true);
    setIsTimerMinimized(false);
  };

  const handleCloseFocusSession = () => {
    setIsTimerOpen(false);
    setIsTimerMinimized(false);
    setFocusSession(null);
  };

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem("mindflow_tasks");
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });

  const [checkIn, setCheckIn] = useState<WellnessCheckIn>(() => {
    try {
      const saved = localStorage.getItem("mindflow_checkin");
      return saved ? JSON.parse(saved) : INITIAL_CHECK_IN;
    } catch {
      return INITIAL_CHECK_IN;
    }
  });

  const [trend, setTrend] = useState<DayTrend[]>(INITIAL_7_DAY_TREND);
  const [crunchWindow, setCrunchWindow] = useState<CrunchWindow>(INITIAL_CRUNCH_WINDOW);

  const [proposal, setProposal] = useState<RecommendationOutput>(() => {
    const cs301 = tasks.find((t) => t.id === "task-cs301") || tasks[0];
    return generateAdaptiveProposal(cs301, checkIn.wellnessComposite);
  });

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("mindflow_theme");
      return (saved as "light" | "dark") || "light";
    } catch {
      return "light";
    }
  });

  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isForecastOpen, setIsForecastOpen] = useState(false);

  // Sync theme with HTML root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("mindflow_theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Persist locally for immediate offline responsiveness
  useEffect(() => {
    try {
      localStorage.setItem("mindflow_tasks", JSON.stringify(tasks));
      localStorage.setItem("mindflow_checkin", JSON.stringify(checkIn));
    } catch {
      // ignore
    }
  }, [tasks, checkIn]);

  // Real-time Firestore synchronization when user is signed in
  useEffect(() => {
    if (!user) {
      setSyncStatus("offline");
      return;
    }

    setSyncStatus("syncing");

    // Subscribe to tasks collection
    const unsubTasks = subscribeTasks(
      user.uid,
      (remoteTasks) => {
        if (remoteTasks.length > 0) {
          setTasks(remoteTasks);
        } else {
          // If the user's remote tasks are empty, seed their starter tasks to Firestore
          INITIAL_TASKS.forEach((t) => {
            saveTask(user.uid, t).catch(console.error);
          });
        }
        setSyncStatus("synced");
      },
      (err) => {
        console.error("Firestore tasks subscription error:", err);
        setSyncStatus("offline");
      }
    );

    // Subscribe to wellness check-in collection
    const unsubCheckIn = subscribeWellnessCheckIn(
      user.uid,
      (remoteCheckIn) => {
        if (remoteCheckIn) {
          setCheckIn(remoteCheckIn);
          setTrend((prev) =>
            prev.map((item) =>
              item.day === "Today" ? { ...item, score: remoteCheckIn.wellnessComposite } : item
            )
          );
        } else {
          saveWellnessCheckIn(user.uid, INITIAL_CHECK_IN).catch(console.error);
        }
      },
      (err) => {
        console.error("Firestore wellness subscription error:", err);
      }
    );

    return () => {
      unsubTasks();
      unsubCheckIn();
    };
  }, [user]);

  // Toggle dark/light theme
  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Reset to default synthetic data
  const handleResetData = () => {
    setTasks(INITIAL_TASKS);
    setCheckIn(INITIAL_CHECK_IN);
    setTrend(INITIAL_7_DAY_TREND);
    setCrunchWindow(INITIAL_CRUNCH_WINDOW);
    const cs301 = INITIAL_TASKS.find((t) => t.id === "task-cs301") || INITIAL_TASKS[0];
    setProposal(generateAdaptiveProposal(cs301, INITIAL_CHECK_IN.wellnessComposite));
    localStorage.clear();

    if (user) {
      INITIAL_TASKS.forEach((t) => saveTask(user.uid, t).catch(console.error));
      saveWellnessCheckIn(user.uid, INITIAL_CHECK_IN).catch(console.error);
    }
  };

  // Manual explicit cloud sync action
  const handleManualSync = useCallback(async () => {
    if (!user) return;
    setIsManualSyncing(true);
    setSyncStatus("syncing");
    try {
      for (const t of tasks) {
        await saveTask(user.uid, t);
      }
      await saveWellnessCheckIn(user.uid, checkIn);
      await saveProposal(user.uid, proposal);
      setSyncStatus("synced");
    } catch (err) {
      console.error("Manual sync failed:", err);
      setSyncStatus("offline");
    } finally {
      setIsManualSyncing(false);
    }
  }, [user, tasks, checkIn, proposal]);

  // When checkIn is saved from WellnessView
  const handleSaveCheckIn = (updated: WellnessCheckIn) => {
    setCheckIn(updated);
    setTrend((prev) =>
      prev.map((item) => (item.day === "Today" ? { ...item, score: updated.wellnessComposite } : item))
    );

    // Re-calibrate proposal based on new capacity
    const cs301 = tasks.find((t) => t.id === "task-cs301") || tasks[0];
    const newProposal = generateAdaptiveProposal(cs301, updated.wellnessComposite);
    setProposal(newProposal);

    if (user) {
      saveWellnessCheckIn(user.uid, updated).catch(console.error);
      saveProposal(user.uid, newProposal).catch(console.error);
    }
  };

  // Toggle task completion
  const handleToggleTaskComplete = (taskId: string) => {
    let modifiedTask: Task | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const isDone = t.status === "completed";
          const updated: Task = {
            ...t,
            status: isDone ? "started" : "completed",
            remainingMinutes: isDone ? t.estimatedMinutes : 0,
          };
          modifiedTask = updated;
          return updated;
        }
        return t;
      })
    );

    if (user && modifiedTask) {
      saveTask(user.uid, modifiedTask).catch(console.error);
    }
  };

  // Toggle flexible work
  const handleToggleTaskFlexibility = (taskId: string) => {
    let modifiedTask: Task | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updated: Task = { ...t, isFlexible: !t.isFlexible };
          modifiedTask = updated;
          return updated;
        }
        return t;
      })
    );

    if (user && modifiedTask) {
      saveTask(user.uid, modifiedTask).catch(console.error);
    }
  };

  // Add new task
  const handleAddTask = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
    if (user) {
      saveTask(user.uid, newTask).catch(console.error);
    }
  };

  // Accept dashboard or assistant proposal
  const handleAcceptProposal = (card?: RecommendationOutput) => {
    const activeCard = card || proposal;
    const acceptedProposal = { ...activeCard, accepted: true };
    setProposal(acceptedProposal);

    let updatedTargetTask: Task | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === activeCard.focusTaskId) {
          const updated: Task = { ...t, status: "started" };
          updatedTargetTask = updated;
          return updated;
        }
        return t;
      })
    );

    if (user) {
      saveProposal(user.uid, acceptedProposal).catch(console.error);
      if (updatedTargetTask) {
        saveTask(user.uid, updatedTargetTask).catch(console.error);
      }
    }
  };

  // Dismiss dashboard proposal
  const handleDismissProposal = () => {
    const dismissedProposal = { ...proposal, dismissed: true };
    setProposal(dismissedProposal);
    if (user) {
      saveProposal(user.uid, dismissedProposal).catch(console.error);
    }
  };

  // Accept rebalance shift
  const handleAcceptRebalance = () => {
    setCrunchWindow((prev) => ({ ...prev, dismissed: true }));
    let shiftedTask: Task | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.course === "CS 310" || t.title.includes("Data Systems")) {
          const updated: Task = { ...t, deadlineText: "Shifted to Friday Oct 26 (Buffered)" };
          shiftedTask = updated;
          return updated;
        }
        return t;
      })
    );
    if (user && shiftedTask) {
      saveTask(user.uid, shiftedTask).catch(console.error);
    }
  };

  // Dismiss crunch card
  const handleDismissCrunch = () => {
    setCrunchWindow((prev) => ({ ...prev, dismissed: true }));
  };

  // Auto-chunk action from planner
  const handleAutoChunk = (task: Task) => {
    const newProposal = generateAdaptiveProposal(task, checkIn.wellnessComposite);
    setProposal(newProposal);
    if (user) {
      saveProposal(user.uid, newProposal).catch(console.error);
    }
    setCurrentTab("planner");
  };

  return (
    <div className="min-h-screen bg-bg-light text-on-surface font-body-md antialiased flex flex-col items-center transition-colors duration-200">
      <div className="w-full max-w-[390px] min-h-screen bg-bg-light relative flex flex-col shadow-xl sm:border-x sm:border-border-light/40">
        {/* Persistent App Header */}
        <Header
          currentTab={currentTab}
          onOpenProfile={() => setCurrentTab("profile")}
          onOpenSupport={() => setIsSupportOpen(true)}
          syncStatus={syncStatus}
        />

        {/* Primary Screen View */}
        <main className="flex-1 flex flex-col relative w-full px-gutter pt-16 pb-24 bg-bg-light">
          {currentTab === "dashboard" && (
            <DashboardView
              checkIn={checkIn}
              crunchWindow={crunchWindow}
              onAcceptProposal={handleAcceptProposal}
              onAcceptRebalance={handleAcceptRebalance}
              onDismissCrunch={handleDismissCrunch}
              onDismissProposal={handleDismissProposal}
              onNavigateToPlanner={() => setCurrentTab("planner")}
              onOpenSupport={() => setIsSupportOpen(true)}
              onStartFocusSession={handleStartFocusSession}
              onToggleTaskComplete={handleToggleTaskComplete}
              proposal={proposal}
              tasks={tasks}
            />
          )}

          {currentTab === "planner" && (
            <PlannerView
              onAutoChunk={handleAutoChunk}
              onOpenNewTask={() => setIsNewTaskOpen(true)}
              onStartFocusSession={handleStartFocusSession}
              onToggleTaskComplete={handleToggleTaskComplete}
              onToggleTaskFlexibility={handleToggleTaskFlexibility}
              tasks={tasks}
            />
          )}

          {currentTab === "assistant" && (
            <AssistantView
              checkIn={checkIn}
              messages={INITIAL_ASSISTANT_MESSAGES}
              onAcceptPlan={handleAcceptProposal}
              onOpenForecastModal={() => setIsForecastOpen(true)}
              onOpenSupport={() => setIsSupportOpen(true)}
              tasks={tasks}
            />
          )}

          {currentTab === "wellness" && (
            <WellnessView
              checkIn={checkIn}
              onSaveCheckIn={handleSaveCheckIn}
              trend={trend}
            />
          )}

          {currentTab === "profile" && (
            <ProfileView
              checkIn={checkIn}
              onOpenSupport={() => setIsSupportOpen(true)}
              onResetData={handleResetData}
              onToggleTheme={handleToggleTheme}
              tasks={tasks}
              theme={theme}
              onManualSync={handleManualSync}
              isSyncing={isManualSyncing}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        <BottomNav activeTab={currentTab} onTabChange={(tab) => setCurrentTab(tab)} />

        {/* Modals & Dialogs */}
        <CampusSupportModal
          isOpen={isSupportOpen}
          onClose={() => setIsSupportOpen(false)}
        />

        <NewTaskModal
          isOpen={isNewTaskOpen}
          onAddTask={handleAddTask}
          onClose={() => setIsNewTaskOpen(false)}
        />

        <ForecastModal
          crunchWindow={crunchWindow}
          isOpen={isForecastOpen}
          onApplyShift={handleAcceptRebalance}
          onClose={() => setIsForecastOpen(false)}
        />

        {/* Active Focus Session Timer Modal & Floating Widget */}
        {focusSession && (
          <FocusTimerModal
            isOpen={isTimerOpen}
            isMinimized={isTimerMinimized}
            onClose={handleCloseFocusSession}
            onCompleteTask={handleToggleTaskComplete}
            onMaximize={() => setIsTimerMinimized(false)}
            onMinimize={() => setIsTimerMinimized(true)}
            session={focusSession}
          />
        )}
      </div>
    </div>
  );
}
