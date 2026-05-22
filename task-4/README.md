# ATC MCP Server

An AI-ready Air Traffic Control [Model Context Protocol](https://modelcontextprotocol.io) server. It accepts flight plans, computes deterministic conflict-free schedules across configurable runways, gates, and ground crew, and exposes the airport state to MCP clients through tools and resources.

The focus is on **scheduling logic and coordination**, not on aircraft physics or a visual interface.

## Requirements

- Node.js 18.17+ (Node 20+ recommended)
- npm

## Install and build

```powershell
cd task-4
npm install
npm run build
```

Run the test suite:

```powershell
npm test
```

## Run the server

The server speaks MCP over **stdio**. Configuration is read from environment variables (see below). A `.env` file in the `task-4/` folder is loaded automatically.

```powershell
# Copy the sample env, edit as needed, then run.
Copy-Item .env.example .env
npm start
# or for an unbuilt run:
npm run dev
```

### Connect from an MCP client

**MCP Inspector** (recommended for manual testing):

```powershell
npm run inspect
```

**Claude Desktop / any MCP-compatible client.** Add an entry to the client's MCP server config:

```jsonc
{
  "mcpServers": {
    "atc": {
      "command": "node",
      "args": ["C:/Projects/edu-ai-challenge-2026/task-4/dist/index.js"],
      "env": {
        "ATC_RUNWAYS": "[{\"id\":\"09L\",\"length\":3500,\"ops\":\"both\"},{\"id\":\"09R\",\"length\":2400,\"ops\":\"both\"}]",
        "ATC_GATE_COUNT": "4",
        "ATC_GROUND_CREW_COUNT": "3",
        "ATC_SEPARATION_TAKEOFF_SEC": "90",
        "ATC_SEPARATION_LANDING_SEC": "120",
        "ATC_SEPARATION_MIXED_SEC": "150",
        "ATC_GATE_TURNAROUND_SEC": "1800",
        "ATC_DEPENDENCY_BUFFER_SEC": "600",
        "ATC_SCHEDULING_HORIZON_SEC": "86400",
        "ATC_ARRIVAL_DURATION_SEC": "300",
        "ATC_DEPARTURE_DURATION_SEC": "240",
        "ATC_EPOCH_ISO": "2026-05-18T06:00:00Z",
      },
    },
  },
}
```

Startup is fail-fast: if any required env var is missing or invalid, the server prints an aggregated error and exits.

## Configuration (environment variables)

| Variable                     | Type               | Required                            | Description                                                                                                                                                     |
| ---------------------------- | ------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ATC_RUNWAYS`                | JSON array         | yes                                 | Runway definitions. Each item: `{ "id": string, "length": positive int (meters), "ops": "arrival" \| "departure" \| "both" }`. Ids must be unique.              |
| `ATC_GATE_COUNT`             | int ≥ 1            | yes                                 | Number of gates available (named `G1`, `G2`, ...).                                                                                                              |
| `ATC_GROUND_CREW_COUNT`      | int ≥ 1            | yes                                 | Maximum number of operations that may be active concurrently.                                                                                                   |
| `ATC_SEPARATION_TAKEOFF_SEC` | int ≥ 0            | yes                                 | Separation buffer between two takeoffs on the same runway.                                                                                                      |
| `ATC_SEPARATION_LANDING_SEC` | int ≥ 0            | yes                                 | Separation buffer between two landings on the same runway.                                                                                                      |
| `ATC_SEPARATION_MIXED_SEC`   | int ≥ 0            | yes                                 | Separation buffer between a takeoff and a landing on the same runway.                                                                                           |
| `ATC_GATE_TURNAROUND_SEC`    | int ≥ 0            | yes                                 | How long an arriving aircraft holds its gate after touchdown.                                                                                                   |
| `ATC_DEPENDENCY_BUFFER_SEC`  | int ≥ 0            | yes                                 | Minimum gap after a dependency completes before a dependent flight may start.                                                                                   |
| `ATC_SCHEDULING_HORIZON_SEC` | int ≥ 1            | yes                                 | Maximum future window (seconds from epoch) into which flights may be placed.                                                                                    |
| `ATC_ARRIVAL_DURATION_SEC`   | int ≥ 1            | yes                                 | Default duration of an arrival (touchdown → vacated).                                                                                                           |
| `ATC_DEPARTURE_DURATION_SEC` | int ≥ 1            | yes                                 | Default duration of a departure (taxi/takeoff).                                                                                                                 |
| `ATC_EPOCH_ISO`              | ISO 8601 timestamp | no (default `1970-01-01T00:00:00Z`) | Anchor used to convert internal scheduling seconds to absolute timestamps. Times in tool/resource responses are expressed as both "seconds from epoch" and ISO. |

## MCP tools

All tools return a single text content item containing a JSON document.

### `submit_flight`

Submit a new arrival or departure into the queue.

| Field                    | Type                              | Notes                                            |
| ------------------------ | --------------------------------- | ------------------------------------------------ |
| `flightNumber`           | string                            | Unique.                                          |
| `opType`                 | `"arrival"` \| `"departure"`      |                                                  |
| `priority`               | `"high"` \| `"medium"` \| `"low"` | Default `"medium"`.                              |
| `dependencies`           | string[]                          | Optional. Flight numbers this flight depends on. |
| `requirements.minLength` | int (meters)                      | Optional. Minimum runway length required.        |

Returns `{ ok, flight }`. The flight starts in status `pending`.

### `generate_schedule`

Recompute the schedule from the current queue and config. Replaces any prior schedule. Deterministic for identical inputs. Returns `{ ok, schedule: { scheduled, unscheduled, completionTime, completionIso } }`.

### `get_airport_status`

Returns a structured snapshot:

- `countsByStatus` and `countsByOpType`
- `runwayUsage[]` and `gateUsage[]`
- `constraints` (gate count, crew count, horizon, capacity flags)
- `blocked` flights with reasons
- `completionTime` / `completionIso` of the active schedule

### `cancel_flight`

Marks a flight as cancelled and immediately re-runs `generate_schedule`. Returns the cancelled flight, the dependents that flipped to unscheduled with reason `dependency_cancelled`, and the new schedule.

| Field          | Type   | Notes                           |
| -------------- | ------ | ------------------------------- |
| `flightNumber` | string | Required.                       |
| `reason`       | string | Optional human-readable reason. |

### `analyze_bottleneck`

Returns the longest active dependency chain in the current schedule: ordered flight list plus total elapsed duration (operation times + dependency buffers). Returns `chain: null` if no schedule exists yet.

## MCP resources

All resources return `application/json`.

| URI                   | Description                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `atc://flights/queue` | Every known flight with its current status (`pending`, `scheduled`, `unscheduled`, `cancelled`) and reason. Includes grouped index by status. |
| `atc://runways`       | Runway definitions, capabilities, and the ops currently placed on each runway (start/end times in both seconds-from-epoch and ISO).           |
| `atc://timeline`      | Chronological list of all scheduled operations across runways and gates, plus the schedule completion time.                                   |

## Validation scenarios

The repo ships with vitest tests covering the three required scenarios plus edge cases. Run `npm test` to execute them.

- **Scenario 1 — Morning Rush:** mixed arrivals/departures of varying priority all get scheduled with no runway or gate overlap and with higher priorities placed earlier.
- **Scenario 2 — Heavy Hauler:** an oversized departure stays in the queue as `unscheduled` with reason `no_runway_with_required_length`, while other valid flights schedule normally. A second sub-test verifies `no_runway_supports_op_type`.
- **Scenario 3 — Connecting Flight:** an outbound that depends on an inbound starts no earlier than the inbound's end time plus `ATC_DEPENDENCY_BUFFER_SEC`. Cancellation of the inbound cascades the outbound to `unscheduled` with reason `dependency_cancelled`.
- **Edge cases:** determinism (two runs produce identical output), dependency cycles, gate-turnaround enforcement, unknown dependencies, config validation (missing env, invalid JSON, valid load), and dependency-exclusion propagation — verifying that dependents of static-infeasible flights, cycle members, and cancelled flights each receive a traceable `dependency_unscheduled: <root>` reason.

## Project layout

```
task-4/
├── src/
│   ├── index.ts             # MCP server entry (stdio)
│   ├── config.ts            # Env-var validation
│   ├── types.ts             # Domain types
│   ├── state.ts             # In-memory store
│   ├── scheduler.ts         # Deterministic scheduler
│   ├── bottleneck.ts        # Longest dependency chain
│   ├── server/
│   │   ├── tools.ts         # 5 MCP tools
│   │   └── resources.ts     # 3 MCP resources
│   └── __tests__/           # vitest scenarios + edge cases
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
└── README.md / report.md
```
