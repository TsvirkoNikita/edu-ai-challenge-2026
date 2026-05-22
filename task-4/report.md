# Report — ATC MCP Server

## Scheduling approach

The scheduler is a deterministic, priority-aware greedy algorithm operating over three resource calendars (runways, gates, ground crew) and a dependency DAG. All times are measured in seconds since `ATC_EPOCH_ISO`, never against the wall clock, so repeated runs with identical inputs produce bit-identical output.

### Pipeline

1. **Filter cancelled flights** out of the candidate set; they're tracked but never placed.
2. **Resolve dependencies.** Flights whose dependency is cancelled get an immediate `dependency_cancelled` reason; flights referencing an unknown id get `unknown_dependency`.
3. **Static feasibility check.** For each remaining flight, build the set of compatible runways (matching op type and meeting `requirements.minLength`). Zero compatible runways → mark `unscheduled` with `no_runway_supports_op_type` or `no_runway_with_required_length`. This handles the Heavy Hauler scenario without any wasted search.
4. **Topological order.** Build a dependency DAG on the feasible set. Flights in a dependency cycle are identified by `findTrueCycleMembers`, which performs a forward-reachability DFS within the unordered subset and marks only nodes that can reach themselves — flights that merely depend on a cycle member are handled in step 6 instead. True cycle members are marked `dependency_cycle`. Ties broken by submission sequence number for determinism.
5. **Greedy placement.** A ready-set is maintained (flights whose dependencies are already placed). Each iteration sorts the ready-set by `(priorityRank, submissionSeq, flightNumber)`, pops the best candidate, and finds the **earliest** `(start, runway, gate)` that satisfies every constraint:
   - **Runway calendar:** start ≥ `prev.endTime + separation(prev.opType, this.opType)`; end ≤ `next.startTime − separation(this.opType, next.opType)`. Three separation values (`takeoff`, `landing`, `mixed`).
   - **Gate calendar:** the gate is held for the op duration; arrivals additionally hold the gate for `ATC_GATE_TURNAROUND_SEC` past touchdown so a same-gate reuse cannot begin during turnaround.
   - **Ground crew:** the number of ops whose [start, end) intervals overlap a candidate window must stay below `ATC_GROUND_CREW_COUNT`. If exceeded, the cursor advances to the earliest end among the overlapping ops.
   - **Dependency buffer:** `start ≥ max(dep.endTime) + ATC_DEPENDENCY_BUFFER_SEC`.
   - **Horizon:** `end ≤ ATC_SCHEDULING_HORIZON_SEC`.
     Compatible runways are pre-filtered per flight before the search begins. For each (runway, gate) pair the algorithm alternates runway-slot ↔ gate-slot lookups (bounded to 32 iterations) until both agree, then collects the candidate; the loop short-circuits immediately if the candidate already starts at the theoretical earliest moment. The best `(start, runwayId, gateIndex)` lexicographic tuple wins; ties favour the alphabetically-earlier runway id and the lowest gate index.
6. **Propagate exclusion.** `propagateExclusion` performs a BFS over reverse-dependency edges starting from every flight excluded in steps 1–5. Any reachable dependent that has not already been excluded is marked `unscheduled` with reason `dependency_unscheduled: <rootFlightNumber>`, where the root is the original excluded ancestor. This ensures the queue is never silently incomplete regardless of whether the blocker was cancelled, infeasible, a cycle member, or horizon-exceeded.

### Bottleneck analysis

`analyze_bottleneck` walks the active (scheduled-only) dependency DAG. For each scheduled flight it memoises `(earliestStartOfChain, path)` and reports the chain that yields the largest `op.endTime − earliestStartOfChain`. That elapsed time naturally includes both operation durations and the dependency buffers that pushed each step forward.

### Determinism

Three discipline rules guarantee reproducibility:

- No `Date.now()` inside the scheduler; only `config.epochSec` and offsets.
- Every comparator falls back to a stable secondary key (submission sequence, then lexicographic id).
- Resource iteration is alphabetised before searching for slots.

A dedicated unit test serialises two runs over the same inputs and asserts string equality.

## Tools and techniques

- **TypeScript + Node 20**, ESM modules, strict compiler settings.
- **`@modelcontextprotocol/sdk` 1.29** for the MCP server, using `McpServer`, `registerTool`, and `registerResource` with Zod input schemas — schemas are also emitted as JSON Schema for client introspection.
- **`zod`** for env-var validation and tool input validation.
- **`dotenv`** for local `.env` loading.
- **`vitest`** for fast unit testing, including a determinism test and a config-validation suite.
- **stdio transport** — matches Claude Desktop and the MCP Inspector workflows out of the box.
- Resource design: three flat URIs (`atc://flights/queue`, `atc://runways`, `atc://timeline`) instead of templated resources, since the airport is a singleton.

## What worked

- The greedy `(priorityRank, submissionSeq, flightNumber)` tuple plus alternating runway/gate search is enough to satisfy every constraint while staying easy to reason about and trivial to test.
- Treating arrivals as gate-holders for the turnaround window made Scenario 3 fall out naturally — the connecting departure can't reuse the gate too soon even when it isn't formally a dependent.
- Modeling times as offsets from a configurable epoch let the test suite assert exact second values without timezone or clock fragility.
- Cancellation calling `computeSchedule` internally means a single MCP round-trip surfaces both the cancelled flight and the cascaded `dependency_cancelled` dependents.
- `propagateExclusion` + `findTrueCycleMembers` together give complete, accurate reasons for every unscheduled flight: dependents of cycle members, static-infeasible flights, and horizon-exceeded flights all receive a `dependency_unscheduled: <root>` reason that traces the blockage to its actual cause, without conflating downstream flights with true cycle participants.

## What did not / trade-offs

- **No "earliest start" parameter on submit.** All flights race from `t=0`. Realistic ATC would want a scheduled time, but the spec scenarios don't require it and adding it would have broadened the surface unnecessarily.
- **Ground crew is a flat concurrency counter,** not a per-skill pool. Treating crew as fungible keeps the constraint expressible in a single line and matched all required behaviours; a richer model (e.g. separate marshallers/fuelers) was deemed out of scope.
- **Runway capability is `length + ops`,** without weight class, ILS category, or wind direction. Sufficient for Heavy Hauler; trivially extensible if needed.
- **State is in-memory only.** A restart wipes flights. For the validation scenarios this is the right trade-off; persistence would require choosing a storage strategy and is a separate concern.
- **Bottleneck only considers scheduled flights,** matching the spec's "active scheduled dependency chain". When comparing chains of equal earliest-start the tie-break now prefers the longer chain (more hops), then lexicographic order, so the reported bottleneck is always the most structurally significant one. If the spec evolves to also consider hypothetical chains over unscheduled flights, the DAG walk could be reused on the full set.
- **Slot search bound** of 32 runway↔gate ping-pong iterations is generous in practice but is a hand-picked constant; an adversarial workload could theoretically need more. Adding a proper sweep over both calendars (instead of alternating fixed-point iteration) would close that gap; the early-exit on `start === earliest` means the typical case exits on the first iteration anyway.
