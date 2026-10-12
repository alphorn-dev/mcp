import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server.js";

// Fake Alphorn endpoint: accepts the key "alp_good", records what it received.
const received: { auth?: string; body: unknown }[] = [];
const http = createHttpServer((req, res) => {
  let data = "";
  req.on("data", (c) => (data += c));
  req.on("end", () => {
    received.push({ auth: req.headers.authorization, body: JSON.parse(data) });
    const ok = req.headers.authorization === "Bearer alp_good";
    res.writeHead(ok ? 201 : 401, { "Content-Type": "application/json" });
    res.end(JSON.stringify(ok ? { messageId: "m1" } : { error: "Invalid API key" }));
  });
});
await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}/n/V1StGXR8_Z5jdHi6B-myT`;

async function call(apiKey: string, args: Record<string, unknown>) {
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await createServer({ webhookUrl: url, apiKey }).connect(serverT);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(clientT);
  try {
    return await client.callTool({ name: "send_notification", arguments: args });
  } finally {
    await client.close();
  }
}

test("sends the notification and reports the messageId", async () => {
  const res = await call("alp_good", { title: "my-app - done", message: "Tests pass", priority: 2, tags: ["ai-agent"] });
  assert.equal(res.isError, undefined);
  assert.match(JSON.stringify(res.content), /messageId m1/);
  assert.deepEqual(received.at(-1), {
    auth: "Bearer alp_good",
    body: { title: "my-app - done", message: "Tests pass", priority: 2, tags: ["ai-agent"] },
  });
});

test("turns a 401 into an actionable error", async () => {
  const res = await call("alp_bad", { message: "hi" });
  assert.equal(res.isError, true);
  assert.match(JSON.stringify(res.content), /HTTP 401.*ALPHORN_API_KEY/);
});

test("rejects an out-of-range priority before calling Alphorn", async () => {
  const before = received.length;
  const res = await call("alp_good", { message: "hi", priority: 9 });
  assert.equal(res.isError, true);
  assert.equal(received.length, before);
});

test.after(() => http.close());

test("VERSION matches package.json", async () => {
  const { readFile } = await import("node:fs/promises");
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const { VERSION } = await import("./server.js");
  assert.equal(VERSION, pkg.version);
});
