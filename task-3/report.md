# AI Learning Assistant Bot — Development Report

## Overview

This project implements an AI-powered personal learning assistant delivered as a Telegram bot, built entirely within n8n. The bot allows users to submit learning material URLs, receive intelligent summaries, and take comprehension quizzes generated from that content.

---

## Tools and Techniques Used

### Platform
- **n8n** — used as the sole workflow automation platform. All logic, routing, AI invocation, and data persistence are handled through n8n nodes without any external backend services.

### Telegram Integration
- **Telegram Trigger node** — listens for both `message` and `callback_query` updates, enabling the bot to handle text commands and inline button interactions in a single trigger.
- **Telegram node** — used for sending welcome messages, summaries, error messages, and quiz results.
- **HTTP Request node (POST to Telegram API)** — used directly for sending messages with inline keyboards (reply_markup), since the native Telegram node does not support inline keyboard construction dynamically. This was necessary for the quiz answer buttons and the topic selection list.

### AI Agents
- **Two distinct LangChain Agent nodes** (Teacher Agent and Examiner Agent), each backed by an **OpenAI Chat Model node** powered by n8n's built-in free OpenAI API credits.
- **Structured Output Parsers** (Summary Parser and Quiz Parser) — each agent uses a `outputParserStructured` node with a JSON schema example. This enforces consistent, machine-readable output from the AI, avoiding the need for fragile text parsing downstream.

### Routing and Logic
- **Switch node** (`Route Command`) — routes incoming messages to the correct handler based on command text (`/start`, `/learn`, `/quiz`) or the presence of a `callback_query`.
- **If nodes** — used for conditional branching: validating URL presence, checking whether fetched content is educational, and checking whether a user has saved materials.
- **Code nodes** — used for URL extraction via regex, formatting quiz questions and answers into Telegram-compatible button structures, processing user answers, and computing quiz scores.

### Data Persistence
- **n8n DataTable nodes** — used as the persistence layer for both `learning_materials` and `quizzes` tables. Tables are created on first use with `createIfNotExists`, making the workflow self-initialising. All data survives between sessions without any external database.

---

## What Worked Well

### Structured Output Parsing
Attaching structured output parsers to both AI agents was one of the most effective decisions. Rather than asking the model to return free-form text and parsing it manually, the agents consistently return a predictable JSON schema. This made downstream node access (`$(\"Teacher Agent\").item.json.output.keyPoints`) reliable and eliminated edge-case failures from inconsistent model responses.

### Content Validation Before Saving
The Teacher Agent is prompted to first decide whether the submitted URL contains educational content at all. The `isLearningMaterial` flag in its output is then checked by an If node before any data is written to the table. This prevents the bot from saving homepages, paywalled articles, login pages, or irrelevant content and gives users a clear error message instead of a confusing empty summary.

### Self-Initialising Tables
Using `createIfNotExists` on both DataTable nodes means the workflow works immediately after import without any manual setup. The first `/learn` or `/quiz` command triggers table creation automatically.

### Separation of AI Roles
Keeping Teacher and Examiner as separate agent nodes with different system prompts and output schemas made the prompts simpler and more focused. Each agent has one clear job, which improved output quality compared to a single general-purpose agent.

### Callback Query Flow
Routing `callback_query` events through the same Telegram trigger and then branching via `Parse Callback` → `Route Callback` allowed the entire quiz interaction (topic selection, per-question answer capture, results) to be handled without requiring a second trigger or webhook.

---

## What Did Not Work / Challenges

### Inline Keyboard Limitations in the Native Telegram Node
The native n8n Telegram node does not support building inline keyboards dynamically from array data. This required falling back to raw HTTP POST requests to the Telegram Bot API for any message that needed inline buttons. The workaround functions correctly but adds verbosity and requires the bot token to be available as an n8n variable (`$vars.BOT_TOKEN`).

### DataTable Array Fields
The DataTable node stores all values as strings. Fields like `answers` (initialised as `[]`) and `keyPoints` must be JSON-stringified on write and parsed on read. This adds boilerplate in Code nodes and is a source of bugs if a node writes without stringifying. A convention of always using `JSON.stringify()` on write and `JSON.parse()` on read was adopted consistently.

### Quiz Session Lookup
The active quiz session is retrieved by matching `userId` and `completed = false`. If a user abandons a quiz and starts a new one, the old incomplete session could interfere. A practical mitigation would be to mark stale sessions complete before creating a new one, but this was not implemented to keep the flow concise.

### No Streaming or Typing Indicator
n8n agent nodes do not support streaming responses. For long AI-processing steps (content analysis, quiz generation), users experience a silent delay. A "processing" message sent before invoking the AI would improve perceived responsiveness but would require an additional Telegram node before each agent call.

---

## Notable Decisions

### Using n8n DataTable Instead of an External Database
Rather than connecting to Supabase, PostgreSQL, or another external store, the built-in DataTable node was chosen. This keeps the workflow entirely self-contained and importable with zero infrastructure setup. The trade-off is that DataTable has limited query capabilities and no indexing, which would become a bottleneck at scale.

### Single Telegram Trigger for All Interaction Types
Combining message and callback_query handling in one trigger, then routing via a Switch node, keeps the workflow as a single flow rather than two parallel automations. This makes it easier to trace execution and avoids duplication of shared nodes.

### Prompt Design for the Teacher Agent
The Teacher Agent prompt explicitly lists non-educational content types (homepage, login page, paywall, news feed) and instructs the model to set `isLearningMaterial: false` for those cases. This defensive prompting reduces false positives where the model might try to summarise an error page or redirect target.

### Regex-Based URL Extraction
URL extraction from the `/learn` command uses a simple regex in a Code node rather than relying on the AI to parse the command. This is faster, deterministic, and avoids consuming AI tokens for a trivial parsing task.
