#!/usr/bin/env node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ConvoClient } from "./convo-client.js";

const apiKey = process.env.CONVO_API_KEY;
if (!apiKey) {
  console.error("CONVO_API_KEY environment variable is required");
  process.exit(1);
}

const client = new ConvoClient(apiKey);

const server = new McpServer({
  name: "Convo",
  version: "1.0.3",
});

const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

// --- Helpers ---

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function text(str: string) {
  return { content: [{ type: "text" as const, text: str }] };
}

function err(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

async function getCachedKeypoints(id: string) {
  try {
    const result = await client.getKeypoints(id);
    return result.data;
  } catch {
    return null;
  }
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// --- Core Tools ---

server.tool(
  "meetings.list",
  "List your recent meetings. Search by title or filter by date.",
  {
    limit: z.number().min(1).max(100).optional().describe("Max results (default 20)"),
    search: z.string().optional().describe("Search meetings by title"),
    since: z.string().optional().describe("Only meetings after this date (ISO 8601)"),
  },
  readOnly,
  async ({ limit, search, since }) => {
    try {
      const result = await client.listConversations({ limit, search, since });
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

server.tool(
  "meetings.get_transcript",
  "Get the full transcript of a meeting with speaker names and timestamps.",
  {
    meeting_id: z.string().describe("The meeting/conversation ID"),
  },
  readOnly,
  async ({ meeting_id }) => {
    try {
      const result = await client.getTranscript(meeting_id);
      return ok(result.data);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

server.tool(
  "meetings.get_summary",
  "Get the summary of a meeting including key points, decisions, and action items. Generates automatically if not yet available.",
  {
    meeting_id: z.string().describe("The meeting/conversation ID"),
  },
  readOnly,
  async ({ meeting_id }) => {
    try {
      const result = await client.getKeypoints(meeting_id);
      return ok(result.data);
    } catch (e: any) {
      if (!e.message?.includes("not found") && !e.message?.includes("404")) {
        return err(e.message);
      }
      try {
        const result = await client.generateKeypoints(meeting_id);
        return ok(result.data);
      } catch (e2: any) {
        return err(e2.message);
      }
    }
  }
);

server.tool(
  "meetings.get_feedback",
  "Get AI coaching feedback for a meeting: communication score, strengths, growth areas, and talk-to-listen ratio. Generates automatically if not yet available.",
  {
    meeting_id: z.string().describe("The meeting/conversation ID"),
  },
  readOnly,
  async ({ meeting_id }) => {
    try {
      const result = await client.getFeedback(meeting_id);
      return ok(result.data);
    } catch (e: any) {
      if (!e.message?.includes("not found") && !e.message?.includes("404")) {
        return err(e.message);
      }
      try {
        const result = await client.generateFeedback(meeting_id);
        return ok(result.data);
      } catch (e2: any) {
        return err(e2.message);
      }
    }
  }
);

server.tool(
  "meetings.ask",
  "Ask any question about a specific meeting. The AI will answer based on the transcript.",
  {
    meeting_id: z.string().describe("The meeting/conversation ID"),
    question: z.string().max(500).describe("Your question about the meeting"),
  },
  readOnly,
  async ({ meeting_id, question }) => {
    try {
      const result = await client.queryConversation(meeting_id, question);
      return ok(result.data);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

server.tool(
  "meetings.draft_email",
  "Draft a follow-up email based on a meeting. References actual discussion points.",
  {
    meeting_id: z.string().describe("The meeting/conversation ID"),
    recipient_name: z.string().optional().describe("Name of the email recipient"),
    tone: z.enum(["professional", "casual", "concise"]).optional().describe("Email tone (default: professional)"),
  },
  readOnly,
  async ({ meeting_id, recipient_name, tone }) => {
    try {
      const result = await client.generateEmail(meeting_id, {
        recipientName: recipient_name,
        tone,
      });
      return ok(result.data);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

server.tool(
  "meetings.share",
  "Generate a shareable link for a meeting.",
  {
    meeting_id: z.string().describe("The meeting/conversation ID"),
  },
  readOnly,
  async ({ meeting_id }) => {
    try {
      const result = await client.shareConversation(meeting_id);
      return ok(result.data);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

server.tool(
  "calendar.upcoming",
  "Get upcoming meetings from your connected Google Calendar.",
  {
    max_results: z.number().min(1).max(50).optional().describe("Max events to return (default 10)"),
  },
  readOnly,
  async ({ max_results }) => {
    try {
      const result = await client.getCalendarEvents({ maxResults: max_results });
      return ok(result.data);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

server.tool(
  "account.info",
  "Get your Convo account info including subscription tier and API usage stats.",
  {},
  readOnly,
  async () => {
    try {
      const result = await client.getProfile();
      return ok(result.data);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- Cross-Meeting Intelligence Tools ---

server.tool(
  "intelligence.prepare",
  "Prepare a briefing for an upcoming meeting. Searches past meetings with a person or company, pulls summaries and open action items, and returns a consolidated briefing so you show up prepared.",
  {
    search: z.string().describe("Person name, company name, or topic to search past meetings for"),
    max_past_meetings: z.number().min(1).max(20).optional().describe("How many past meetings to look back through (default 10)"),
  },
  readOnly,
  async ({ search, max_past_meetings }) => {
    try {
      const limit = max_past_meetings || 10;
      const convos = await client.listConversations({ search, limit });
      const meetings = convos.data || [];

      if (meetings.length === 0) {
        return text(`No past meetings found matching "${search}".`);
      }

      const results = await Promise.allSettled(
        meetings.map((m: any) => getCachedKeypoints(m.id))
      );

      const briefing: any = {
        search,
        pastMeetings: [],
        allActionItems: [],
        allDecisions: [],
        allParticipants: new Set<string>(),
      };

      meetings.forEach((m: any, i: number) => {
        const kp = results[i].status === "fulfilled" ? results[i].value : null;
        const entry: any = {
          id: m.id,
          title: m.title,
          date: m.startTime,
          duration: m.duration,
        };

        if (kp?.keypoints) {
          entry.topics = kp.keypoints.sections?.map((s: any) => s.heading) || [];
          entry.decisions = kp.keypoints.decisions || [];
          entry.actionItems = kp.keypoints.actionItems || [];

          briefing.allDecisions.push(
            ...entry.decisions.map((d: string) => ({ decision: d, from: m.title, date: m.startTime }))
          );
          briefing.allActionItems.push(
            ...entry.actionItems.map((a: any) => ({ ...a, from: m.title, date: m.startTime }))
          );
          kp.keypoints.participants?.forEach((p: string) => briefing.allParticipants.add(p));
        } else {
          entry.summaryAvailable = false;
        }

        briefing.pastMeetings.push(entry);
      });

      const output = {
        briefing: `Meeting prep for "${search}"`,
        meetingsFound: meetings.length,
        participants: [...briefing.allParticipants],
        openActionItems: briefing.allActionItems,
        pastDecisions: briefing.allDecisions,
        meetingHistory: briefing.pastMeetings,
      };

      return ok(output);
    } catch (e: any) {
      return err(e.message);
    }
  }
);

server.tool(
  "intelligence.weekly_digest",
  "Get a consolidated digest of all your meetings over a time period. Includes total meeting time, all decisions made, all action items, and per-meeting summaries.",
  {
    days: z.number().min(1).max(90).optional().describe("Number of days to look back (default 7)"),
  },
  readOnly,
  async ({ days }) => {
    try {
      const since = daysAgo(days || 7);
      const convos = await client.listConversations({ since, limit: 100 });
      const meetings = convos.data || [];

      if (meetings.length === 0) {
        return text(`No meetings found in the last ${days || 7} days.`);
      }

      const results = await Promise.allSettled(
        meetings.map((m: any) => getCachedKeypoints(m.id))
      );

      let totalMinutes = 0;
      const allActionItems: any[] = [];
      const allDecisions: any[] = [];
      const meetingSummaries: any[] = [];

      meetings.forEach((m: any, i: number) => {
        totalMinutes += m.duration || 0;
        const kp = results[i].status === "fulfilled" ? results[i].value : null;

        const summary: any = {
          id: m.id,
          title: m.title,
          date: m.startTime,
          duration: m.duration,
        };

        if (kp?.keypoints) {
          summary.topics = kp.keypoints.sections?.map((s: any) => s.heading) || [];
          const decisions = kp.keypoints.decisions || [];
          const actionItems = kp.keypoints.actionItems || [];

          summary.decisionCount = decisions.length;
          summary.actionItemCount = actionItems.length;

          allDecisions.push(
            ...decisions.map((d: string) => ({ decision: d, from: m.title, date: m.startTime }))
          );
          allActionItems.push(
            ...actionItems.map((a: any) => ({ ...a, from: m.title, date: m.startTime }))
          );
        }

        meetingSummaries.push(summary);
      });

      return ok({
        period: `Last ${days || 7} days`,
        totalMeetings: meetings.length,
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        totalDecisions: allDecisions.length,
        totalActionItems: allActionItems.length,
        decisions: allDecisions,
        actionItems: allActionItems,
        meetings: meetingSummaries,
      });
    } catch (e: any) {
      return err(e.message);
    }
  }
);

server.tool(
  "intelligence.find_action_items",
  "Find all action items across your recent meetings. Shows who owns each item, priority, and which meeting it came from.",
  {
    days: z.number().min(1).max(90).optional().describe("Number of days to look back (default 14)"),
    owner: z.string().optional().describe("Filter action items by owner name"),
  },
  readOnly,
  async ({ days, owner }) => {
    try {
      const since = daysAgo(days || 14);
      const convos = await client.listConversations({ since, limit: 100 });
      const meetings = convos.data || [];

      if (meetings.length === 0) {
        return text(`No meetings found in the last ${days || 14} days.`);
      }

      const results = await Promise.allSettled(
        meetings.map((m: any) => getCachedKeypoints(m.id))
      );

      const actionItems: any[] = [];

      meetings.forEach((m: any, i: number) => {
        const kp = results[i].status === "fulfilled" ? results[i].value : null;
        if (!kp?.keypoints?.actionItems) return;

        for (const item of kp.keypoints.actionItems) {
          if (owner && item.owner?.toLowerCase() !== owner.toLowerCase()) continue;
          actionItems.push({
            item: item.item,
            owner: item.owner || "Unassigned",
            priority: item.priority || "unknown",
            confidence: item.confidence,
            meeting: m.title,
            meetingDate: m.startTime,
            meetingId: m.id,
          });
        }
      });

      const byPriority = { high: 0, medium: 0, low: 0, unknown: 0 };
      actionItems.forEach((a) => {
        const p = a.priority as keyof typeof byPriority;
        byPriority[p] = (byPriority[p] || 0) + 1;
      });

      return ok({
        period: `Last ${days || 14} days`,
        meetingsScanned: meetings.length,
        totalActionItems: actionItems.length,
        byPriority,
        ...(owner ? { filteredByOwner: owner } : {}),
        actionItems,
      });
    } catch (e: any) {
      return err(e.message);
    }
  }
);

// --- MCP Prompts ---

server.prompt(
  "meeting-prep",
  "Prepare for an upcoming meeting by reviewing past interactions with a person or company.",
  { name: z.string().describe("Person name, company name, or meeting topic") },
  ({ name }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `I have an upcoming meeting related to "${name}". Please use the intelligence.prepare tool to search for past meetings and give me a concise briefing. Include:\n\n1. A summary of our history (what we've discussed before)\n2. Any open action items I should follow up on\n3. Key decisions we've made in the past\n4. Suggested talking points for the upcoming meeting\n\nKeep it concise and actionable.`,
        },
      },
    ],
  })
);

server.prompt(
  "weekly-review",
  "Get a digest of all your meetings from the past week with decisions and action items.",
  {},
  () => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please use the intelligence.weekly_digest tool to get all my meetings from the last 7 days. Then give me:\n\n1. A brief overview of my week (total meetings, total time)\n2. The most important decisions made across all meetings\n3. All open action items grouped by owner\n4. Any patterns you notice (too many meetings? recurring topics?)\n\nBe concise.`,
        },
      },
    ],
  })
);

server.prompt(
  "follow-up-blitz",
  "Find recent meetings and draft follow-up emails for each one.",
  {
    days: z.string().optional().describe("Number of days to look back (default: 3)"),
  },
  ({ days }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please help me catch up on follow-ups. Use meetings.list to find all my meetings from the last ${days || "3"} days. For each meeting, check if it has a summary (use meetings.get_summary). For meetings that have summaries with action items, use meetings.draft_email to draft a follow-up email. Present each draft so I can review and send them.`,
        },
      },
    ],
  })
);

// --- MCP Resources ---

server.resource(
  "recent-meetings",
  "convo://meetings/recent",
  { description: "List of your recent meetings (last 7 days)" },
  async () => {
    const since = daysAgo(7);
    const result = await client.listConversations({ since, limit: 50 });
    return {
      contents: [
        {
          uri: "convo://meetings/recent",
          mimeType: "application/json",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

server.resource(
  "meeting-summary",
  new ResourceTemplate("convo://meetings/{id}/summary", { list: undefined }),
  { description: "Summary of a specific meeting including key points, decisions, and action items" },
  async (uri, { id }) => {
    const kp = await getCachedKeypoints(id as string);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(kp || { error: "No summary available for this meeting" }, null, 2),
        },
      ],
    };
  }
);

// Start

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start Convo MCP server:", err);
  process.exit(1);
});
