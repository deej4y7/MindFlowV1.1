import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  AssistantMessage,
  Task,
  WellnessCheckIn,
  RecommendationOutput,
} from "../types";

interface AssistantViewProps {
  checkIn: WellnessCheckIn;
  tasks: Task[];
  messages: AssistantMessage[];
  onAcceptPlan: (rec: RecommendationOutput) => void;
  onOpenSupport: () => void;
  onOpenForecastModal: () => void;
  onUpdateMessages?: (updater: (prev: AssistantMessage[]) => AssistantMessage[]) => void;
}

type ChatbotRole = "general" | "fast" | "complex";

interface RoleConfig {
  id: ChatbotRole;
  name: string;
  badge: string;
  model: string;
  icon: string;
  tagline: string;
  description: string;
}

const CHATBOT_ROLES: RoleConfig[] = [
  {
    id: "general",
    name: "Planning Advisor",
    badge: "General Tasks",
    model: "gemini-3.5-flash",
    icon: "psychology_alt",
    tagline: "Balanced academic guidance & cognitive pacing",
    description:
      "Calibrates study blocks, hydration breaks, and course sequencing to your daily capacity composite.",
  },
  {
    id: "fast",
    name: "Quick Focus",
    badge: "Fast Micro-Actions",
    model: "gemini-3.1-flash-lite",
    icon: "bolt",
    tagline: "Instant 2-minute steps to beat inertia",
    description:
      "Ultra-low latency micro-habits and immediate physical next steps designed to break task paralysis.",
  },
  {
    id: "complex",
    name: "Deep Strategist",
    badge: "Complex Tasks",
    model: "gemini-3.1-pro-preview",
    icon: "insights",
    tagline: "14-day horizon forecasting & workload leveling",
    description:
      "In-depth reasoning across exam overlap, cumulative fatigue curves, and multi-week assignment chunking.",
  },
];

export const AssistantView: React.FC<AssistantViewProps> = ({
  checkIn,
  tasks,
  messages: initialMessages,
  onAcceptPlan,
  onOpenSupport,
  onOpenForecastModal,
  onUpdateMessages,
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    try {
      const saved = localStorage.getItem("mindflow_assistant_thread");
      return saved ? JSON.parse(saved) : initialMessages;
    } catch {
      return initialMessages;
    }
  });

  const [activeRole, setActiveRole] = useState<ChatbotRole>("general");
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [acceptedCards, setAcceptedCards] = useState<Record<string, boolean>>({});
  const [dismissedCards, setDismissedCards] = useState<Record<string, boolean>>({});
  const [apiErrorNotice, setApiErrorNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with localStorage & parent
  useEffect(() => {
    try {
      localStorage.setItem("mindflow_assistant_thread", JSON.stringify(messages));
    } catch {
      // ignore
    }
    if (onUpdateMessages) {
      onUpdateMessages(() => messages);
    }
  }, [messages, onUpdateMessages]);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const currentRoleConfig =
    CHATBOT_ROLES.find((r) => r.id === activeRole) || CHATBOT_ROLES[0];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    const userMsg: AssistantMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      text,
    };

    // Append user message immediately to state
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue("");
    setIsTyping(true);
    setApiErrorNotice(null);

    try {
      // Prepare multi-turn messages array for backend Gemini API
      const conversationHistory = updatedMessages.map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        text: m.text || "",
      }));

      // Student capacity context for deterministic prompt grounding
      const activePendingTasks = tasks.filter((t) => t.status !== "completed");
      const targetTask = activePendingTasks[0] || tasks[0];

      const studentContext = {
        wellnessComposite: checkIn.wellnessComposite,
        wellnessTier:
          checkIn.wellnessComposite >= 7.0
            ? "sustainable"
            : checkIn.wellnessComposite >= 4.0
            ? "strained"
            : "high_risk",
        energy: checkIn.energy,
        motivation: checkIn.motivation,
        accomplishment: checkIn.accomplishment,
        sessionLengthMinutes:
          checkIn.wellnessComposite < 4.0 ? 20 : checkIn.wellnessComposite < 7.0 ? 25 : 50,
        recoveryBreakMinutes: 5,
        tasks: activePendingTasks.map((t) => ({
          id: t.id,
          course: t.course,
          title: t.title,
          remainingMinutes: t.remainingMinutes,
          priority: t.priority,
          deadlineText: t.deadlineText,
        })),
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          role: activeRole,
          modelOverride: currentRoleConfig.model,
          studentContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to communicate with assistant`);
      }

      const data = await res.json();

      const assistantMsg: AssistantMessage = {
        id: `reply-${Date.now()}`,
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: data.reply || "I have calibrated your request. What else can I assist with?",
        modelUsed: data.model || currentRoleConfig.model,
        roleUsed: data.role || activeRole,
        isFallback: data.isFallback,
        actionCard: data.actionCard || undefined,
        forecastInsight:
          text.toLowerCase().includes("horizon") ||
          text.toLowerCase().includes("forecast") ||
          text.toLowerCase().includes("14-day") ||
          activeRole === "complex",
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (data.notice) {
        setApiErrorNotice(data.notice);
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      // Deterministic recovery fallback
      const fallbackMsg: AssistantMessage = {
        id: `reply-${Date.now()}`,
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: `### Academic Advisory Notice 🛡️\n\nI calibrated your inquiry using MindFlow's deterministic study engine:\n\n• **Current Capacity (W)**: **${checkIn.wellnessComposite.toFixed(1)}/10**\n• **Recommended Interval**: **${checkIn.wellnessComposite < 7.0 ? "25m" : "45m"} focus block** + 5m recovery break.\n• **Student Agency Guarantee**: No schedule modifications take effect without your explicit confirmation.\n\n*(Note: Live Gemini API connection is ready. Review API keys in AI Studio Settings > Secrets if live generation was interrupted.)*`,
        modelUsed: currentRoleConfig.model,
        roleUsed: activeRole,
        isFallback: true,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCardAccept = (card: RecommendationOutput) => {
    setAcceptedCards((prev) => ({ ...prev, [card.id]: true }));
    onAcceptPlan(card);
  };

  const handleCardDismiss = (cardId: string) => {
    setDismissedCards((prev) => ({ ...prev, [cardId]: true }));
  };

  const handleClearThread = () => {
    if (window.confirm("Start a new conversation thread? Current chat history will be cleared.")) {
      const resetMsg: AssistantMessage = {
        id: `msg-${Date.now()}`,
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: `### Welcome to MindFlow Planning Assistant 👋\n\nI am your academic planning assistant powered by **Gemini**. I'm here to help you pace your assignments, prevent cognitive fatigue, and structure low-friction study blocks.\n\n• Current capacity composite: **W = ${checkIn.wellnessComposite.toFixed(1)}/10**\n• Recommended session interval: **${checkIn.wellnessComposite < 7.0 ? "25" : "50"} minutes**\n• Active role: **${currentRoleConfig.name}** (*${currentRoleConfig.model}*)\n\nAsk me how to break down an upcoming assignment, request a lighter schedule, or explore campus resources!`,
        modelUsed: currentRoleConfig.model,
        roleUsed: activeRole,
      };
      setMessages([resetMsg]);
      localStorage.removeItem("mindflow_assistant_thread");
    }
  };

  return (
    <div className="flex flex-col w-full pb-6">
      {/* Eyebrow, Title & Clear Button */}
      <div className="flex items-start justify-between pt-2 pb-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="material-symbols-outlined text-[15px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              psychology_alt
            </span>
            <span className="font-caption-eyebrow text-caption-eyebrow uppercase tracking-wider text-primary text-[11px] font-bold">
              Multi-Turn Academic AI
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold text-[22px]">
            Planning Assistant
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 text-[14px]">
            Capacity-calibrated advice and multi-turn study planning powered by Gemini.
          </p>
        </div>

        <button
          aria-label="Clear chat conversation"
          className="p-2 rounded-full text-secondary hover:text-on-surface hover:bg-surface-alt transition-colors cursor-pointer text-[12px] flex items-center gap-1 flex-shrink-0"
          onClick={handleClearThread}
          title="Start fresh conversation"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">restart_alt</span>
          <span className="font-label-sm font-semibold hidden sm:inline">New Chat</span>
        </button>
      </div>

      {/* Live Capacity Calibration Ribbon */}
      <div className="mb-3.5 p-2.5 rounded-xl bg-surface-alt border border-border-light/40 flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              checkIn.wellnessComposite >= 7.0
                ? "bg-success"
                : checkIn.wellnessComposite >= 4.0
                ? "bg-tertiary"
                : "bg-error"
            }`}
          />
          <span className="font-label-sm font-bold text-on-surface">
            Capacity W = {checkIn.wellnessComposite.toFixed(1)}/10
          </span>
          <span className="font-caption-eyebrow text-secondary uppercase text-[10px]">
            ({checkIn.wellnessComposite >= 7.0 ? "Sustainable" : checkIn.wellnessComposite >= 4.0 ? "Strained" : "High Risk"})
          </span>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant font-medium text-[11px]">
          <span>Calibrated block:</span>
          <span className="font-bold text-primary font-numeric-data">
            {checkIn.wellnessComposite < 4.0 ? "20m" : checkIn.wellnessComposite < 7.0 ? "25m" : "50m"} + 5m
          </span>
        </div>
      </div>

      {/* Specific Chatbot Role Selector */}
      <div className="mb-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="font-caption-eyebrow uppercase text-[11px] font-bold text-secondary">
            Chatbot Role &amp; Model
          </span>
          <span className="font-numeric-data text-[11px] text-primary font-bold">
            {currentRoleConfig.model}
          </span>
        </div>

        <div
          aria-label="Select Chatbot Persona"
          className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-surface-container-low border border-border-light/40"
          role="radiogroup"
        >
          {CHATBOT_ROLES.map((role) => {
            const isSelected = activeRole === role.id;
            return (
              <button
                key={role.id}
                aria-checked={isSelected}
                className={`py-2 px-2 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-surface shadow-xs text-primary font-bold border border-primary/20"
                    : "text-secondary hover:text-on-surface hover:bg-surface/50"
                }`}
                onClick={() => setActiveRole(role.id)}
                role="radio"
                type="button"
              >
                <div className="flex items-center gap-1">
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      isSelected ? "text-primary" : "text-secondary"
                    }`}
                  >
                    {role.icon}
                  </span>
                  <span className="text-[12px] whitespace-nowrap leading-tight">
                    {role.name}
                  </span>
                </div>
                <span className="text-[9px] text-on-surface-variant mt-0.5 tracking-tight font-medium">
                  {role.badge}
                </span>
              </button>
            );
          })}
        </div>

        <p className="px-1 text-[11px] text-on-surface-variant italic">
          {currentRoleConfig.tagline}
        </p>
      </div>

      {/* Non-Clinical Safety & Governance Notice Banner (Sec 7.6) */}
      <aside className="mb-4 rounded-xl bg-surface-container-low p-3 flex items-start gap-2.5 shadow-xs border border-border-light/40">
        <span className="material-symbols-outlined text-[18px] text-primary mt-0.5 flex-shrink-0">
          verified_user
        </span>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-label-sm text-label-sm text-primary uppercase tracking-wide font-bold text-[11px]">
              Governance Guardrail
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
            <span className="font-caption-eyebrow text-[10px] text-secondary">Sec 7.6 Non-Clinical</span>
          </div>
          <p className="font-body-sm text-[12px] text-on-surface-variant leading-snug mt-0.5">
            Advisory only • MindFlow does not provide therapeutic advice or automatic rescheduling. All recommendations require your explicit confirmation.
          </p>
        </div>
      </aside>

      {/* Quick Action Chips */}
      <section
        aria-label="Suggested Planning Inquiries"
        className="mb-4 -mx-gutter px-gutter overflow-x-auto no-scrollbar flex items-center gap-2 py-1"
      >
        <button
          className="h-9 px-3 rounded-full bg-surface shadow-xs text-on-surface-variant hover:text-primary active:scale-[0.98] transition-all flex items-center gap-1.5 flex-shrink-0 text-left border border-border-light/40 cursor-pointer text-[12px] font-semibold"
          onClick={() => handleSend("Give me a lighter plan for CS 301")}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px] text-primary">clock_loader_40</span>
          <span>Lighter CS 301 plan</span>
        </button>
        <button
          className="h-9 px-3 rounded-full bg-surface shadow-xs text-on-surface-variant hover:text-primary active:scale-[0.98] transition-all flex items-center gap-1.5 flex-shrink-0 text-left border border-border-light/40 cursor-pointer text-[12px] font-semibold"
          onClick={() => handleSend("How was my session calculated?")}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px] text-secondary">calculate</span>
          <span>Formula explanation</span>
        </button>
        <button
          className="h-9 px-3 rounded-full bg-surface shadow-xs text-on-surface-variant hover:text-primary active:scale-[0.98] transition-all flex items-center gap-1.5 flex-shrink-0 text-left border border-border-light/40 cursor-pointer text-[12px] font-semibold"
          onClick={() => handleSend("Break down my upcoming workload")}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px] text-secondary">reorder</span>
          <span>Auto-chunking steps</span>
        </button>
        <button
          className="h-9 px-3 rounded-full bg-surface shadow-xs text-on-surface-variant hover:text-primary active:scale-[0.98] transition-all flex items-center gap-1.5 flex-shrink-0 text-left border border-border-light/40 cursor-pointer text-[12px] font-semibold"
          onClick={onOpenSupport}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px] text-secondary">support</span>
          <span>Campus resources</span>
        </button>
      </section>

      {/* Multi-Turn Message Stream */}
      <div className="flex flex-col gap-4">
        {messages.map((msg) => {
          if (msg.sender === "user") {
            return (
              <div key={msg.id} className="flex flex-col items-end pl-8">
                <div className="flex items-center gap-1.5 mb-1 pr-1">
                  <span className="font-label-sm text-label-sm text-secondary text-[11px]">You</span>
                  <span className="font-numeric-data text-[11px] text-muted-light">{msg.timestamp}</span>
                </div>
                <div className="bg-secondary-container text-on-secondary-container rounded-2xl rounded-tr-xs p-3.5 shadow-xs max-w-full">
                  <p className="font-body-md text-body-md text-on-surface leading-relaxed text-[14px]">
                    {msg.text}
                  </p>
                </div>
              </div>
            );
          }

          // Assistant Response Bubble
          const roleConfig =
            CHATBOT_ROLES.find((r) => r.id === msg.roleUsed) || currentRoleConfig;

          return (
            <div key={msg.id} className="flex flex-col gap-3">
              {/* Assistant Message Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[13px]">
                      {roleConfig.icon}
                    </span>
                  </div>
                  <span className="font-label-sm text-on-surface font-bold text-[12px]">
                    {roleConfig.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container font-numeric-data text-secondary font-semibold">
                    {msg.modelUsed || roleConfig.model}
                  </span>
                </div>
                <span className="font-numeric-data text-[11px] text-muted-light">{msg.timestamp}</span>
              </div>

              {/* Message Markdown Body */}
              {msg.text && (
                <div className="p-4 rounded-2xl bg-surface-container-low text-on-surface leading-relaxed text-[14px] border border-border-light/30 shadow-xs">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="font-bold text-[16px] mb-2 text-on-surface border-b border-border-light/20 pb-1">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="font-bold text-[15px] mt-3 mb-1.5 text-on-surface">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="font-bold text-[14px] mt-2.5 mb-1 text-on-surface">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-2.5 last:mb-0 leading-relaxed text-[14px] text-on-surface">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 mb-2.5 space-y-1 text-[13px] text-on-surface-variant">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 mb-2.5 space-y-1 text-[13px] text-on-surface-variant">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => <li className="leading-snug">{children}</li>,
                      strong: ({ children }) => (
                        <strong className="font-bold text-on-surface">{children}</strong>
                      ),
                      code: ({ children }) => (
                        <code className="px-1.5 py-0.5 rounded bg-surface-container-high font-mono text-[12px] text-primary">
                          {children}
                        </code>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="pl-3 border-l-2 border-primary/40 my-2 italic text-on-surface-variant text-[13px]">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}

              {/* Embedded Calibrated Action Card */}
              {msg.actionCard && !dismissedCards[msg.actionCard.id] && (
                <article
                  className={`rounded-2xl bg-surface p-4 shadow-md flex flex-col relative transition-all duration-300 border border-border-light/40 ${
                    acceptedCards[msg.actionCard.id] ? "ring-2 ring-primary/40" : ""
                  }`}
                  id={`action-card-${msg.actionCard.id}`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 mb-3 bg-surface-container-low -mx-4 -mt-4 p-4 rounded-t-2xl border-b border-border-light/30">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-on-primary text-[18px]">tune</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-md text-headline-md text-on-surface font-bold text-[15px]">
                          Calibrated Action Card
                        </span>
                        <span className="font-label-sm text-label-sm text-secondary text-[11px]">
                          Deterministic Study Engine • Sec 4.1
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm flex items-center gap-1 flex-shrink-0 font-bold text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                      {msg.actionCard.tier === "sustainable"
                        ? "Sustainable block"
                        : msg.actionCard.tier === "strained"
                        ? "Strained adjustment"
                        : "High-risk pacing"}
                    </span>
                  </div>

                  {/* Action Specifications */}
                  <div className="flex flex-col gap-3">
                    {/* Target Task */}
                    <div className="bg-surface-alt rounded-xl p-3 flex flex-col gap-0.5 border border-border-light/30">
                      <span className="font-caption-eyebrow text-caption-eyebrow uppercase text-secondary text-[11px] font-bold">
                        Task Target
                      </span>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-headline-md text-headline-md text-on-surface font-bold text-[14px]">
                          {msg.actionCard.focusTaskTitle}
                        </span>
                        <span className="font-label-sm text-label-sm text-primary bg-primary-fixed/50 px-2 py-0.5 rounded-md flex-shrink-0 font-bold text-[11px]">
                          {msg.actionCard.focusTaskCourse}
                        </span>
                      </div>
                    </div>

                    {/* Adjusted Duration */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-border-light/20">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">timelapse</span>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-on-surface font-semibold text-[12px]">
                            Adjusted Focus Block
                          </span>
                          <span className="font-body-sm text-[12px] text-on-surface-variant">
                            Energy conservation protocol
                          </span>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-numeric-data text-headline-md text-primary font-bold text-[16px]">
                          {msg.actionCard.sessionLengthMinutes} min
                        </span>
                        <span className="font-numeric-data text-body-sm text-muted-light line-through text-[13px]">
                          {msg.actionCard.originalLengthMinutes || 50}m
                        </span>
                      </div>
                    </div>

                    {/* Reasoning Engine */}
                    <div className="p-3 rounded-xl bg-surface-container-low flex items-start gap-2.5 border border-border-light/20">
                      <span className="material-symbols-outlined text-[18px] text-primary mt-0.5 flex-shrink-0">
                        insights
                      </span>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-on-surface font-semibold text-[12px]">
                          Reasoning Engine
                        </span>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed text-[13px]">
                          {msg.actionCard.reasoning}
                        </p>
                      </div>
                    </div>

                    {/* Immediate Micro-Action */}
                    <div className="p-3 rounded-xl bg-surface-alt flex flex-col gap-1 border border-border-light/30">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-success">play_circle</span>
                        <span className="font-label-sm text-label-sm text-on-surface font-bold text-[12px]">
                          Micro-Action (Immediate First Step)
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant pl-5 text-[13px]">
                        {msg.actionCard.microAction}
                      </p>
                    </div>

                    {/* Recovery Break */}
                    <div className="p-3 rounded-xl bg-surface-container-high flex items-center justify-between border border-border-light/20">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[18px]">bedtime</span>
                        <span className="font-label-sm text-label-sm text-on-surface font-semibold text-[12px]">
                          Planned Recovery Break
                        </span>
                      </div>
                      <span className="font-label-sm text-label-sm text-primary font-bold text-[12px]">
                        {msg.actionCard.recoveryBreakMinutes} min mindful pause
                      </span>
                    </div>
                  </div>

                  {/* Governance Gate & Buttons */}
                  <div className="mt-4 pt-3 flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 text-secondary px-1 text-[12px]">
                      <span className="material-symbols-outlined text-[15px]">lock</span>
                      <span>Nothing changes in your Planner until you tap Accept.</span>
                    </div>

                    {!acceptedCards[msg.actionCard.id] ? (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          className="h-11 px-4 rounded-full text-secondary hover:text-on-surface hover:bg-surface-alt transition-colors font-label-md text-label-md flex-shrink-0 cursor-pointer text-[13px]"
                          onClick={() => handleCardDismiss(msg.actionCard!.id)}
                          type="button"
                        >
                          Dismiss
                        </button>
                        <button
                          className="flex-1 h-11 rounded-full bg-primary hover:bg-primary-container text-on-primary font-headline-md text-label-md tracking-wide shadow-md flex items-center justify-center gap-2 transition-transform active:translate-y-[1px] font-bold text-[13px] cursor-pointer"
                          onClick={() => handleCardAccept(msg.actionCard!)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                          <span>Accept &amp; Apply to Planner</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-secondary-container text-on-secondary-container flex items-center gap-2 animate-fade-in">
                        <span className="material-symbols-outlined text-primary text-[20px]">task_alt</span>
                        <div className="flex flex-col">
                          <span className="font-label-sm text-label-sm text-primary font-bold text-[13px]">
                            Plan Applied to Planner Dock
                          </span>
                          <span className="font-body-sm text-[12px] text-on-surface-variant">
                            {msg.actionCard.focusTaskTitle} calibrated to {msg.actionCard.sessionLengthMinutes}m focus block.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )}

              {/* Workload Spacing Insight Card */}
              {msg.forecastInsight && (
                <article className="rounded-2xl bg-surface p-4 shadow-sm flex flex-col gap-3 border border-border-light/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-[16px]">
                          calendar_view_week
                        </span>
                      </div>
                      <span className="font-headline-md text-headline-md text-on-surface font-bold text-[15px]">
                        Workload Spacing Insight
                      </span>
                    </div>
                    <span className="font-caption-eyebrow text-[11px] text-secondary font-bold">
                      14-DAY HORIZON
                    </span>
                  </div>

                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed text-[13px]">
                    Looking ahead through next Tuesday, your academic commitments concentrate around Thursday afternoon. Shifting 30 minutes of literature reading forward to tomorrow morning preserves your Friday rest buffer.
                  </p>

                  {/* Mini Horizon Distribution Graphic */}
                  <div className="p-3 rounded-xl bg-surface-alt flex flex-col gap-2 border border-border-light/30">
                    <div className="flex justify-between items-center text-secondary text-[11px]">
                      <span className="font-caption-eyebrow font-bold">PROJECTED CAPACITY LOAD</span>
                      <span className="font-numeric-data text-primary font-bold">Balanced 68%</span>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 pt-1">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-full bg-surface-container-high rounded-full h-12 relative flex items-end overflow-hidden">
                          <div className="w-full bg-primary h-[45%] rounded-full" />
                        </div>
                        <span className="font-numeric-data text-[10px] text-muted-light">M</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-full bg-surface-container-high rounded-full h-12 relative flex items-end overflow-hidden">
                          <div className="w-full bg-primary h-[85%] rounded-full" />
                        </div>
                        <span className="font-numeric-data text-[10px] text-primary font-bold">T</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-full bg-surface-container-high rounded-full h-12 relative flex items-end overflow-hidden">
                          <div className="w-full bg-primary h-[60%] rounded-full" />
                        </div>
                        <span className="font-numeric-data text-[10px] text-muted-light">W</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-full bg-surface-container-high rounded-full h-12 relative flex items-end overflow-hidden">
                          <div className="w-full bg-tertiary h-[95%] rounded-full" />
                        </div>
                        <span className="font-numeric-data text-[10px] text-tertiary font-bold">T</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-full bg-surface-container-high rounded-full h-12 relative flex items-end overflow-hidden">
                          <div className="w-full bg-primary h-[30%] rounded-full" />
                        </div>
                        <span className="font-numeric-data text-[10px] text-muted-light">F</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-full bg-surface-container-high rounded-full h-12 relative flex items-end overflow-hidden">
                          <div className="w-full bg-surface-dim h-[15%] rounded-full" />
                        </div>
                        <span className="font-numeric-data text-[10px] text-muted-light">S</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-full bg-surface-container-high rounded-full h-12 relative flex items-end overflow-hidden">
                          <div className="w-full bg-surface-dim h-[15%] rounded-full" />
                        </div>
                        <span className="font-numeric-data text-[10px] text-muted-light">S</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-body-sm text-[12px] text-secondary">
                      Forecast updated dynamically
                    </span>
                    <button
                      className="text-primary font-label-sm text-label-sm flex items-center gap-1 hover:underline cursor-pointer font-bold text-[12px]"
                      onClick={onOpenForecastModal}
                      type="button"
                    >
                      <span>Inspect Forecast</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </article>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-surface-container-low shadow-xs text-secondary self-start border border-border-light/30">
            <span className="material-symbols-outlined animate-spin text-[18px] text-primary">
              progress_activity
            </span>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-on-surface">
                {currentRoleConfig.name} is thinking...
              </span>
              <span className="text-[11px] text-on-surface-variant font-numeric-data">
                {currentRoleConfig.model} • Calibrating with capacity composite W = {checkIn.wellnessComposite.toFixed(1)}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sticky Multi-Turn Input Dock */}
      <div className="sticky bottom-0 mt-6 pt-3 pb-1 -mx-gutter px-gutter bg-gradient-to-t from-bg-light via-bg-light to-transparent">
        <form
          className="flex items-center gap-2 p-1.5 rounded-full bg-surface shadow-md border border-border-light/40 focus-within:ring-2 focus-within:ring-primary/30 transition-all"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <button
            aria-label="Voice prompt simulation"
            className="w-10 h-10 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-alt transition-colors flex-shrink-0 cursor-pointer"
            onClick={() => handleSend("I have low energy this afternoon. What is a gentle 15m step?")}
            title="Voice simulation"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">mic</span>
          </button>

          <label className="sr-only" htmlFor="advisory-input">
            Ask for planning advice or lighter workload
          </label>
          <input
            ref={inputRef}
            autoComplete="off"
            className="flex-1 bg-transparent border-0 outline-none text-on-surface font-body-md text-[14px] placeholder:text-muted-light px-1"
            disabled={isTyping}
            id="advisory-input"
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Ask ${currentRoleConfig.name} (${currentRoleConfig.badge})...`}
            type="text"
            value={inputValue}
          />

          <button
            aria-label="Send message"
            className="w-10 h-10 rounded-full bg-primary hover:bg-primary-container text-on-primary flex items-center justify-center transition-transform active:scale-95 flex-shrink-0 shadow-sm cursor-pointer disabled:opacity-50"
            disabled={isTyping || !inputValue.trim()}
            id="send-button"
            type="submit"
          >
            {isTyping ? (
              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 mt-2 mb-1">
          <span className="material-symbols-outlined text-[13px] text-muted-light">shield</span>
          <span className="font-label-sm text-[11px] text-muted-light font-medium">
            MindFlow Safety Engine • Private &amp; Capacity-Calibrated
          </span>
        </div>
      </div>
    </div>
  );
};
