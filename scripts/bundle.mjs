// Builds alphorn.mcpb (MCP Bundle for Claude Desktop and Smithery) from the
// version published on npm, so the bundle always matches the npm package.
// Run after `npm publish`: `pnpm bundle`.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
for (const file of ["manifest.json", "server.json"]) {
  const v = JSON.parse(readFileSync(file, "utf8")).version;
  if (v !== version) throw new Error(`${file} has version ${v}, package.json has ${version}`);
}

const dir = "build/bundle";
rmSync("build", { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
for (const file of ["manifest.json", "README.md", "LICENSE"]) copyFileSync(file, `${dir}/${file}`);
// Own package.json, or npm would walk up and install into this repo's node_modules.
writeFileSync(`${dir}/package.json`, JSON.stringify({ private: true }));

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: "inherit" });
run("npm", ["install", "--omit=dev", "--no-package-lock", "--no-save", `@alphorn/mcp@${version}`], dir);
run("npx", ["-y", "@anthropic-ai/mcpb@2.1.2", "pack", dir, "alphorn.mcpb"]);
