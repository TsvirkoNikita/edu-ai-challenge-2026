#!/usr/bin/env node
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { AirportStore } from "./state.js";
import { registerTools } from "./server/tools.js";
import { registerResources } from "./server/resources.js";

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (e) {
    // Use stderr so we don't interfere with stdio MCP transport on stdout.
    process.stderr.write(`[atc-mcp-server] ${(e as Error).message}\n`);
    process.exit(1);
  }

  const store = new AirportStore();
  const server = new McpServer(
    { name: "atc-mcp-server", version: "1.0.0" },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions:
        "AI-ready Air Traffic Control. Submit flights via submit_flight, then call generate_schedule to compute a deterministic schedule. Inspect resources atc://flights/queue, atc://runways, atc://timeline.",
    },
  );

  registerTools(server, { store, config });
  registerResources(server, { store, config });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(
    `[atc-mcp-server] ready (runways=${config.runways.length}, gates=${config.gateCount}, crew=${config.groundCrewCount})\n`,
  );
}

main().catch((e) => {
  process.stderr.write(
    `[atc-mcp-server] fatal: ${(e as Error).stack ?? (e as Error).message}\n`,
  );
  process.exit(1);
});
