import Anthropic from "@anthropic-ai/sdk";
import Task from "../models/Task.js";
import DailyReport from "../models/DailyReport.js";
import Project from "../models/Project.js";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function startOfRange(scope) {
  const start = new Date();
  if (scope === "week") {
    start.setDate(start.getDate() - 7);
  } else {
    start.setHours(0, 0, 0, 0); // "today" — midnight of the current day
  }
  return start;
}

// Build a plain-language summary from raw stats alone — no AI call.
// Used both when there's no API key and when the live AI call fails for any reason,
// so a demo never shows a broken screen.
function buildFallbackSummary({ tasks, reports, scopeLabel }) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const notStarted = tasks.filter((t) => t.status === "not_started").length;
  const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

  const contributors = [...new Set(reports.map((r) => r.user?.name || "Someone"))];

  const lines = [];
  lines.push(
    `Progress ${scopeLabel}: ${completed} of ${total} tasks completed (${rate}%).` +
      (inProgress ? ` ${inProgress} in progress.` : "") +
      (notStarted ? ` ${notStarted} not started.` : "") +
      (blocked ? ` ${blocked} blocked — needs attention.` : "")
  );

  if (contributors.length > 0) {
    lines.push(`${reports.length} report(s) submitted by: ${contributors.join(", ")}.`);
  } else {
    lines.push(`No daily reports submitted ${scopeLabel} yet.`);
  }

  if (blocked > 0) {
    lines.push("Recommend checking in on blocked tasks before the next sync.");
  }

  return lines.join(" ");
}

async function buildAiSummary({ tasks, reports, scopeLabel, projectTitle }) {
  const taskLines = tasks
    .map(
      (t) =>
        `- "${t.title}" — ${t.status}${t.assignedUser?.name ? `, assigned to ${t.assignedUser.name}` : ""}${t.deadline ? `, due ${new Date(t.deadline).toLocaleDateString()}` : ""}`
    )
    .join("\n");

  const reportLines = reports
    .map((r) => `- ${r.user?.name || "Someone"}: "${r.workDone}"${r.blockers ? ` (blocker: ${r.blockers})` : ""}`)
    .join("\n");

  const prompt = `You are summarizing progress for a software team project${projectTitle ? ` called "${projectTitle}"` : ""}, scoped to ${scopeLabel}.

Tasks:
${taskLines || "(no tasks)"}

Daily reports submitted:
${reportLines || "(no reports submitted)"}

Write a short (3-5 sentence) plain-English progress summary a project manager could read in 10 seconds. Mention completion rate, call out anyone blocked, and name who's been active. No headers, no bullet points, just prose.`;

  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || !textBlock.text) {
    throw new Error("AI response had no text content");
  }
  return textBlock.text.trim();
}

// @desc    Generate a progress summary for a project (or org-wide for a Manager),
//          using AI when available and falling back to a computed summary otherwise
// @route   POST /api/summary
// @body    { project?: projectId, scope?: "today" | "week" }
export const generateSummary = async (req, res) => {
  try {
    const { project, scope = "today" } = req.body;
    const scopeLabel = scope === "week" ? "this week" : "today";
    const since = startOfRange(scope);

    const taskFilter = project ? { project } : {};
    const reportFilter = { date: { $gte: since } };
    if (project) reportFilter.project = project;

    // Team Leaders can only summarize a project they lead (never the whole organisation)
    if (req.user.role === "team_leader") {
      if (!project) {
        return res.status(400).json({ message: "Choose a project to summarize" });
      }
      const owns = await Project.exists({ _id: project, leader: req.user._id });
      if (!owns) {
        return res.status(403).json({ message: "You can only summarize projects you lead" });
      }
    }

    const [tasks, reports, projectDoc] = await Promise.all([
      Task.find(taskFilter).populate("assignedUser", "name"),
      DailyReport.find(reportFilter).populate("user", "name"),
      project ? Project.findById(project).select("title") : Promise.resolve(null),
    ]);

    const context = { tasks, reports, scopeLabel, projectTitle: projectDoc?.title };

    if (!anthropic) {
      return res
        .status(200)
        .json({ summary: buildFallbackSummary(context), source: "fallback", reason: "no_api_key" });
    }

    try {
      const summary = await buildAiSummary(context);
      return res.status(200).json({ summary, source: "ai" });
    } catch (aiError) {
      console.error("AI summary call failed, using fallback:", aiError.message);
      return res
        .status(200)
        .json({ summary: buildFallbackSummary(context), source: "fallback", reason: "ai_call_failed" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to generate summary", error: error.message });
  }
};
