#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const webhookUrl = process.env.ALPHORN_WEBHOOK_URL;
const apiKey = process.env.ALPHORN_API_KEY || undefined;

// stdout carries the MCP protocol, so all diagnostics go to stderr.
if (!webhookUrl || !URL.canParse(webhookUrl)) {
  console.error(
    "alphorn-mcp: set ALPHORN_WEBHOOK_URL to your webhook's Endpoint URL, e.g. https://app.alphorn.dev/n/V1StGXR8_Z5jdHi6B-myT",
  );
  process.exit(1);
}

await createServer({ webhookUrl, apiKey }).connect(new StdioServerTransport());
