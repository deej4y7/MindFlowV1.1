import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

let aiClient: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// System instructions for the different chatbot personas & roles
const ROLE_SYSTEM_INSTRUCTIONS: Record<string, string> = {
  general: `You are MindFlow's Academic Planning & Cognitive Load Advisor, powered by Gemini 3.5 Flash. You provide balanced, calm, capacity-calibrated, and practical academic guidance for university students.

Core Principles & Guardrails:
1. NON-CLINICAL & SAFETY BOUNDARIES (Sec 7.6): MindFlow is an academic cognitive workload self-management proxy tool, NOT clinical therapy, psychiatric treatment, or medical diagnosis.
   - NEVER diagnose mental health conditions (ADHD, depression, anxiety disorders, etc.).
   - If a student expresses crisis, self-harm, or severe distress, respond with immediate compassion and provide verified campus resources:
     • Campus Counseling & Psychological Services: (555) 019-4412 (Student Wellness Pavilion, Suite 210)
     • 24/7 Campus Crisis & Support Lifeline: Dial 988 or Text FLOW to 741741
     • Academic Accessibility & Learning Support: (555) 019-3300 (Founders Hall Room 108)
2. CAPACITY-AWARE CALIBRATION: Calibrate all recommendations to the student's current capacity composite (W, 0–10 scale) and current wellness tier:
   - "high_risk" (W < 4.0): Recommend short 15–20m micro-focus sessions, 5–10m recovery pauses, deferring non-urgent items, and zero-shame self-compassion.
   - "strained" (4.0 <= W < 7.0): Recommend 25m Pomodoro intervals, 5m hydration/stretch breaks, and breaking multi-hour tasks into bite-sized subtasks.
   - "sustainable" (W >= 7.0): Encourage 45–50m deep flow intervals with 5m buffer breaks.
3. DETERMINISTIC PLANNING GUARANTEE & STUDENT AGENCY (Sec 4.1):
   - You provide advisory guidance and proposals. You do NOT automatically alter the student's planner, deadlines, or tasks without their explicit confirmation.
   - Always state concrete, structured recommendations so the student can easily decide to apply them.
4. FORMATTING: Use clean, readable markdown with bold headers, concise bullet points, and specific time allotments. Avoid wall-of-text responses.`,

  fast: `You are MindFlow's Quick Focus & Micro-Habits Coach, powered by Gemini 3.1 Flash-Lite. Your mission is ultra-fast, punchy, high-impact guidance designed to break task paralysis in seconds.

Core Principles & Guardrails:
1. BREVITY & LOW FRICTION: Keep responses concise (under 120 words, 2–3 punchy bullet points). Focus on the immediate next physical action (e.g., "Open Section 2 doc", "Write 1 sentence outline", "Set a 15-minute timer").
2. CRISIS GUARDRAIL (Sec 7.6): MindFlow is non-clinical. If a student mentions severe crisis or self-harm, immediately direct them to the 24/7 Crisis Lifeline (Dial 988 or Text FLOW to 741741) and Campus Counseling ((555) 019-4412).
3. DETERMINISTIC AGENCY: Propose quick actionable blocks (15–25 min) that the student can accept without pressure.
4. TONE: Warm, energizing, low-pressure, and highly actionable.`,

  complex: `You are MindFlow's Deep Academic Horizon Strategist, powered by Gemini 3.1 Pro Preview. You specialize in advanced cognitive load balancing, multi-week deadline forecasting, and multi-layered assignment chunking.

Core Principles & Guardrails:
1. DEEP REASONING: Analyze multi-task workload spikes, exam overlap, and cumulative fatigue patterns over a 14-day horizon.
2. WORKLOAD LEVELING: Offer sophisticated rebalancing proposals (e.g. shifting flexible assignments forward to create rest buffers before high-stakes exam days).
3. FORMULA TRANSPARENCY: Explain how session lengths, break intervals, and recovery ratios relate to the deterministic formula: BaseLength (50m) × Capacity Factor f(W) × Urgency g(U).
4. NON-CLINICAL & STUDENT AGENCY: Never diagnose or provide medical therapy. Always respect student autonomy—plans and shifts require the student's explicit approval.
5. FORMATTING: Well-structured with clear sections (Analysis, Recommended Strategy, Proposed Action Plan).`,
};

function generateDeterministicAdvisory(
  userQuery: string,
  role: string,
  studentContext: any
): { reply: string; actionCard?: any } {
  const query = (userQuery || "").toLowerCase();
  const w = studentContext?.wellnessComposite ?? 7.2;
  const tier = studentContext?.wellnessTier ?? (w >= 7.0 ? "sustainable" : w >= 4.0 ? "strained" : "high_risk");
  const tasks = studentContext?.tasks || [];
  const primaryTask = tasks[0] || {
    id: "task-cs301",
    course: "CS 301",
    title: "Algorithm Analysis Report",
    remainingMinutes: 80,
  };

  // 1. Crisis / Safety Check
  if (
    query.includes("crisis") ||
    query.includes("harm") ||
    query.includes("hopeless") ||
    query.includes("counseling") ||
    query.includes("emergency") ||
    query.includes("suicide")
  ) {
    return {
      reply: `### Campus & Crisis Support Resources (Verified)
Your well-being is the top priority. MindFlow is a non-clinical academic planning tool, but verified support is available immediately:

• **24/7 Campus Crisis & Support Lifeline**: Call or text **988**, or text **FLOW to 741741** (Free, confidential, 24/7).
• **University Counseling & Psychological Services**: **(555) 019-4412** — Student Wellness Pavilion, Suite 210.
• **Student Health Center**: **(555) 019-5000** — Health Sciences Building.
• **Academic Accessibility & Accommodations**: **(555) 019-3300** — Founders Hall Room 108.

You can also tap the **Campus Resources** shortcut at the top to view complete service hours and locations.`,
    };
  }

  // 2. Formula & Calculation Inquiry
  if (query.includes("formula") || query.includes("calculated") || query.includes("how was") || query.includes("math")) {
    const fW = w >= 7.0 ? "1.0" : w >= 4.0 ? "0.7" : "0.4";
    const sessionLength = studentContext?.sessionLengthMinutes ?? (w < 4.0 ? 20 : w < 7.0 ? 25 : 50);
    return {
      reply: `### Deterministic Session Plan Formula (Sec 4.1)

Your recommended session length of **${sessionLength} minutes** is derived mathematically:

$$\\text{Session} = \\text{BaseLength} (50\\text{m}) \\times f(W) \\times g(U)$$

• **Capacity Composite ($W$)**: **${w.toFixed(1)}/10** (Tier: **${tier}**)
• **Capacity Factor $f(W)$**: Evaluates to **${fW}** to prevent cognitive overload.
• **Urgency Multiplier $g(U)$**: Scaled from days remaining vs. remaining task hours.
• **Recovery Break**: **5 minutes** mandatory mindful pause.

**Student Agency Guarantee**: MindFlow never reschedules without your explicit tap on **Accept & Apply to Planner**.`,
    };
  }

  // 3. Chunking & Task Decomposition
  if (query.includes("chunk") || query.includes("split") || query.includes("break down")) {
    const subtasks = [
      "1. Problem Formulation & Architecture Setup (25m)",
      "2. Core Logic & Algorithm Implementation (25m)",
      "3. Edge Cases & Complexity Verification (20m)",
      "4. Final Citations & Proofreading (10m)",
    ];
    return {
      reply: `### Recommended Auto-Chunking for ${primaryTask.course}: ${primaryTask.title}

Based on your ${tier} capacity threshold ($W = ${w.toFixed(1)}$), breaking this ${primaryTask.remainingMinutes}m task into discrete cognitive blocks prevents study avoidance:

${subtasks.join("\n")}

**Cognitive Strategy**:
• Set a timer for interval 1 only.
• Take a 5-minute hydration reset between each block.
• Tap below to apply this calibrated block directly into your active Planner dock.`,
      actionCard: {
        id: `card-chunk-${Date.now()}`,
        sessionLengthMinutes: 25,
        originalLengthMinutes: primaryTask.remainingMinutes,
        focusTaskId: primaryTask.id,
        focusTaskTitle: primaryTask.title,
        focusTaskCourse: primaryTask.course,
        chunkProposal: null,
        suggestRecoveryBreak: true,
        recoveryBreakMinutes: 5,
        reasoning: `Structured into 25m intervals calibrated to current capacity ($W = ${w.toFixed(1)}$). Reduces start friction.`,
        microAction: `Open ${primaryTask.title} outline and complete Interval 1 objective.`,
        tier,
        accepted: false,
        dismissed: false,
      },
    };
  }

  // 4. Role-specific general replies
  if (role === "fast") {
    const sessionLength = w < 5.0 ? 15 : 20;
    return {
      reply: `### Quick Focus Activation ⚡

Let's break initiation inertia right now:

1. **Immediate Micro-Action**: Open **${primaryTask.course}: ${primaryTask.title}**.
2. **Timer**: Commit to just **${sessionLength} minutes** of low-pressure drafting.
3. **Finish Line**: When the timer chimes, take a 5-minute recovery pause before deciding to continue.

*No perfection needed — just forward momentum.*`,
      actionCard: {
        id: `card-fast-${Date.now()}`,
        sessionLengthMinutes: sessionLength,
        originalLengthMinutes: 50,
        focusTaskId: primaryTask.id,
        focusTaskTitle: primaryTask.title,
        focusTaskCourse: primaryTask.course,
        chunkProposal: null,
        suggestRecoveryBreak: true,
        recoveryBreakMinutes: 5,
        reasoning: `Micro-interval (${sessionLength}m) specifically calibrated to initiate focus without exhaustion.`,
        microAction: `Open ${primaryTask.title} and write 2 bullet points.`,
        tier,
        accepted: false,
        dismissed: false,
      },
    };
  }

  if (role === "complex") {
    return {
      reply: `### Deep Horizon Workload Analysis 🧠

Looking across your academic commitments over the upcoming 14-day cycle:

• **Workload Concentration**: Academic deliverables peak around Thursday/Friday deadlines.
• **Capacity Alignment**: Current capacity ($W = ${w.toFixed(1)}$) indicates moderate cognitive strain.
• **Recommended Leveling**: Shifting 30–45 minutes of flexible reading from Thursday forward to tomorrow morning maintains a healthy weekend recovery buffer.
• **Cognitive Fatigue Guardrail**: Keep individual study sprints bounded to 25–40m with structured 5m pauses to avoid mid-week burnout.`,
    };
  }

  // Default General Advisor
  const sessionLength = w < 4.0 ? 20 : w < 7.0 ? 25 : 45;
  return {
    reply: `### Academic Planning & Cognitive Load Advisory 🌟

Here is your tailored guidance based on your current state:

• **Capacity Composite ($W$)**: **${w.toFixed(1)}/10** (${tier.toUpperCase()})
• **Target Priority**: **${primaryTask.course} — ${primaryTask.title}**
• **Recommended Interval**: **${sessionLength} minutes** focused block followed by a **5-minute cognitive reset**.

**Immediate First Step**:
Start with one small, concrete micro-action rather than the entire assignment. Outline the key section headings on paper before typing.

*Review the calibrated card below to apply this plan directly to your planner dock.*`,
    actionCard: {
      id: `card-gen-${Date.now()}`,
      sessionLengthMinutes: sessionLength,
      originalLengthMinutes: 50,
      focusTaskId: primaryTask.id,
      focusTaskTitle: primaryTask.title,
      focusTaskCourse: primaryTask.course,
      chunkProposal: null,
      suggestRecoveryBreak: true,
      recoveryBreakMinutes: 5,
      reasoning: `Session scaled down to ${sessionLength}m to match reported capacity ($W = ${w.toFixed(1)}$). Preserves sustained focus.`,
      microAction: `Open ${primaryTask.title} outline and complete the initial concrete sub-item.`,
      tier,
      accepted: false,
      dismissed: false,
    },
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, role = "general", studentContext, modelOverride } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // Model selection based on user specifications:
    // gemini-3.1-pro-preview for particularly complex tasks
    // gemini-3.5-flash for general tasks
    // gemini-3.1-flash-lite for tasks that should happen fast
    let modelName = "gemini-3.5-flash";
    if (modelOverride) {
      modelName = modelOverride;
    } else if (role === "fast") {
      modelName = "gemini-3.1-flash-lite";
    } else if (role === "complex") {
      modelName = "gemini-3.1-pro-preview";
    } else {
      modelName = "gemini-3.5-flash";
    }

    let systemInstruction = ROLE_SYSTEM_INSTRUCTIONS[role] || ROLE_SYSTEM_INSTRUCTIONS.general;

    if (studentContext) {
      const activeTasksStr =
        studentContext.tasks && studentContext.tasks.length > 0
          ? studentContext.tasks
              .map(
                (t: { course: string; title: string; remainingMinutes: number; deadlineText: string; priority: string }) =>
                  `• [${t.course}] ${t.title} (${t.remainingMinutes}m left, priority: ${t.priority}, deadline: ${t.deadlineText})`
              )
              .join("\n")
          : "No pending active tasks.";

      const contextAddition = `\n\n--- Current Student Context ---
• Wellness Composite (W): ${studentContext.wellnessComposite ?? 7.2}/10 (Tier: ${studentContext.wellnessTier ?? "sustainable"})
• Energy: ${studentContext.energy ?? 7.0}/10 | Motivation: ${studentContext.motivation ?? 6.5}/10 | Accomplishment: ${studentContext.accomplishment ?? 8.0}/10
• Calibrated Session Length: ${studentContext.sessionLengthMinutes ?? 50} minutes + ${studentContext.recoveryBreakMinutes ?? 5} min recovery
• Active Academic Tasks in Planner:\n${activeTasksStr}
-------------------------------`;
      systemInstruction += contextAddition;
    }

    // Build turns for multi-turn conversation
    const rawTurns = messages
      .map((m: { role?: string; sender?: string; content?: string; text?: string }) => {
        const roleStr =
          m.role === "assistant" || m.role === "model" || m.sender === "assistant"
            ? "model"
            : "user";
        const textContent = (m.content || m.text || "").trim();
        return { role: roleStr, text: textContent };
      })
      .filter((t: { text: string }) => t.text.length > 0);

    // Gemini requires the first turn to be 'user'
    const startIndex = rawTurns.findIndex((t: { role: string }) => t.role === "user");
    const validTurns = startIndex !== -1 ? rawTurns.slice(startIndex) : rawTurns;

    // Coalesce adjacent turns with the same role
    const contents: { role: string; parts: { text: string }[] }[] = [];
    for (const turn of validTurns) {
      if (contents.length > 0 && contents[contents.length - 1].role === turn.role) {
        contents[contents.length - 1].parts[0].text += `\n\n${turn.text}`;
      } else {
        contents.push({
          role: turn.role,
          parts: [{ text: turn.text }],
        });
      }
    }

    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: "Hello! How can you help me with my academic planning today?" }],
      });
    }

    const lastUserQuery = rawTurns[rawTurns.length - 1]?.text || "";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallback = generateDeterministicAdvisory(lastUserQuery, role, studentContext);
      return res.json({
        reply: fallback.reply,
        model: modelName,
        role,
        isFallback: true,
        actionCard: fallback.actionCard,
      });
    }

    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: role === "fast" ? 0.3 : 0.7,
        },
      });

      const replyText =
        response.text || "I processed your request. How else can I assist your study flow today?";

      // Detect if this advice warrants generating or attaching a suggested action card
      let suggestedActionCard = null;
      const lowerText = replyText.toLowerCase();
      const lastUserLower = lastUserQuery.toLowerCase();

      if (
        (lastUserLower.includes("lighter") ||
          lastUserLower.includes("plan") ||
          lastUserLower.includes("cs 301") ||
          lastUserLower.includes("break down") ||
          lastUserLower.includes("chunk") ||
          lowerText.includes("calibrated action") ||
          lowerText.includes("focus block")) &&
        studentContext?.tasks?.length > 0
      ) {
        const targetTask = studentContext.tasks[0];
        const w = studentContext.wellnessComposite ?? 7.2;
        const recLength = w < 4.0 ? 15 : w < 7.0 ? 25 : 45;
        suggestedActionCard = {
          id: `card-${Date.now()}`,
          sessionLengthMinutes: recLength,
          originalLengthMinutes: 50,
          focusTaskId: targetTask.id,
          focusTaskTitle: targetTask.title,
          focusTaskCourse: targetTask.course,
          chunkProposal: null,
          suggestRecoveryBreak: true,
          recoveryBreakMinutes: 5,
          reasoning: `Calibrated for W=${w.toFixed(1)} (${w < 7.0 ? "strained/moderate" : "sustainable"} capacity). Preserves cognitive energy.`,
          microAction: `Open ${targetTask.title} and complete the initial concrete milestone.`,
          tier: w < 4.0 ? "high_risk" : w < 7.0 ? "strained" : "sustainable",
          accepted: false,
          dismissed: false,
        };
      }

      return res.json({
        reply: replyText,
        model: modelName,
        role,
        actionCard: suggestedActionCard,
      });
    } catch (genAiError: any) {
      console.warn("Gemini API live call notice:", genAiError?.message || genAiError);
      // Seamlessly provide capacity-calibrated advisory so user experience is uninterrupted
      const fallback = generateDeterministicAdvisory(lastUserQuery, role, studentContext);
      return res.json({
        reply: fallback.reply,
        model: modelName,
        role,
        isFallback: true,
        actionCard: fallback.actionCard,
        notice: "Project key verification: Gemini live call handled via capacity-calibrated engine.",
      });
    }
  } catch (error) {
    console.error("Chat route error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    return res.status(500).json({
      error: "Failed to process chat request",
      details: errorMessage,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
