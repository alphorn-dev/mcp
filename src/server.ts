import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export type Config = {
  /** Full webhook endpoint, e.g. https://app.alphorn.dev/n/V1StGXR8_Z5jdHi6B-myT (or a self-hosted base URL). */
  webhookUrl: string;
  /** Webhook API key (`alp_...`). Optional: webhooks can be created without one. */
  apiKey?: string;
};

export const VERSION = "0.1.1";

// The tool description is what an agent reads when deciding whether and how to notify,
// so it states when to use it, not just what it does.
const DESCRIPTION = `Send a notification to the user through Alphorn. It is delivered to the channels the user configured (for example Slack, Telegram, email, SMS, or push), so it reaches them even when they are away from this session.

Use it when:
- a long-running task finishes or fails,
- you are blocked on a decision or permission and the user may not be watching,
- the user asks to be notified, pinged, or alerted.

Do not use it for routine progress updates. Never include secrets, tokens, or file contents.`;

// Plain-English hints for the statuses the Alphorn endpoint returns, so the agent can recover or tell the user.
const STATUS_HINTS: Record<number, string> = {
  400: "Alphorn rejected the request body.",
  401: "The API key is missing or invalid. Ask the user to check ALPHORN_API_KEY.",
  403: "The webhook is disabled in Alphorn. Ask the user to enable it.",
  404: "No webhook exists at this URL. Ask the user to check ALPHORN_WEBHOOK_URL.",
  413: "The notification is too large. Send a shorter message.",
  429: "The Alphorn message quota is exhausted. Do not retry; tell the user.",
  508: "Alphorn detected a notification loop and dropped the message.",
};

export function createServer(config: Config): McpServer {
  const server = new McpServer({ name: "alphorn", version: VERSION });

  server.registerTool(
    "send_notification",
    {
      title: "Send notification",
      description: DESCRIPTION,
      inputSchema: {
        title: z
          .string()
          .max(200)
          .optional()
          .describe('Short title. Start with the project name, e.g. "my-app - tests passing".'),
        message: z
          .string()
          .min(1)
          .max(4000)
          .describe("What happened and what you need from the user, in one or two sentences."),
        priority: z
          .number()
          .int()
          .min(1)
          .max(5)
          .optional()
          .describe("1 (lowest) to 5 (urgent). Use 2 when finished, 3 when you need input, 4 when blocked or failed."),
        tags: z
          .array(z.string())
          .optional()
          .describe('Tags the user can filter and route on, e.g. ["ai-agent", "completed"].'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ title, message, priority, tags }) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

      let res: Response;
      try {
        res = await fetch(config.webhookUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ title, message, priority, tags }),
          signal: AbortSignal.timeout(10_000),
        });
      } catch (err) {
        return failure(`Could not reach Alphorn at ${new URL(config.webhookUrl).origin}: ${(err as Error).message}`);
      }

      if (res.status === 201) {
        const { messageId } = (await res.json().catch(() => ({}))) as { messageId?: string };
        return { content: [{ type: "text", text: `Notification sent${messageId ? ` (messageId ${messageId})` : ""}.` }] };
      }

      const body = (await res.text().catch(() => "")).slice(0, 500);
      return failure(`Alphorn returned HTTP ${res.status}. ${STATUS_HINTS[res.status] ?? ""} ${body}`.trim());
    },
  );

  return server;
}

function failure(text: string) {
  return { isError: true, content: [{ type: "text" as const, text }] };
}
