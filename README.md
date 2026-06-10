# DocRelay Bot

A Telegram support assistant that answers user questions using your indexed FAQs and support documents, cites sources, and escalates unclear cases to human support.

## Features

- Grounded support answers from FAQs and uploaded documents
- Source tracking for the last answer via `/sources`
- Human escalation via `/escalate`
- Feedback capture via `/feedback`
- Admin FAQ creation, upload intake, reindex jobs, review queue, and analytics
- MongoDB-backed long-term memory and support data
- Telegram long polling with restart safety and conflict backoff
- Production-safe logs and graceful fallback when AI or MongoDB is missing

## Architecture

- `src/index.js` boots the bot, validates config, clears webhook, and starts polling safely
- `src/bot.js` creates the grammY bot and wires commands first, then the support agent
- `src/commands/*` contains Telegram command handlers
- `src/features/agent.js` handles non-command support messages
- `src/lib/*` contains config, logging, DB, and shared helpers
- `src/services/*` contains support retrieval, answer orchestration, tickets, analytics, and admin services

## Setup

### Prerequisites

- Node.js 18+
- A Telegram bot token
- MongoDB connection string for persistence
- CookMyBots AI Gateway credentials for AI answers

### Install

bash
npm install


### Configure

Copy `.env.sample` to `.env` and set values:

- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `MONGODB_URI` - MongoDB connection string
- `COOKMYBOTS_AI_ENDPOINT` - CookMyBots AI base URL, for example `https://api.cookmybots.com/api/ai`
- `COOKMYBOTS_AI_KEY` - CookMyBots AI key
- `ADMIN_USER_IDS` - comma-separated Telegram user IDs allowed to run admin commands
- `SUPPORT_CHAT_ID` - optional Telegram chat ID for admin/support ticket notifications
- `AI_TIMEOUT_MS` - optional AI timeout in ms
- `AI_MAX_RETRIES` - optional retry count for AI calls
- `CONCURRENCY` - optional general concurrency setting
- `CONFIDENCE_THRESHOLD` - optional confidence threshold for grounded answers
- `MAX_CONTEXT_TURNS` - optional memory turns to inject
- `MEMORY_LOG_INTERVAL_MS` - optional memory log interval
- `DOCS_STORAGE_DIR` - optional local storage directory for uploaded docs

### Run

bash
npm run dev


### Start

bash
npm start


## Commands

- `/start` - welcome and quick usage
- `/help` - command list and support scope
- `/ask <question>` - ask a support question
- `/faq [keyword]` - list FAQs or search by keyword
- `/sources` - show sources for the last answer
- `/escalate [reason]` - create a human support ticket
- `/status` - check open support ticket status
- `/feedback <rating> [comment]` - rate the last answer
- `/reset` - clear remembered conversation memory
- `/memory` - show remembered profile summary
- `/forgetme` - clear remembered profile and memory
- `/admin` - show admin actions
- `/addfaq Question | Answer` - add a FAQ entry
- `/upload` - upload a text document or captioned file for indexing
- `/reindex` - rebuild the FAQ and document retrieval index
- `/review` - review low-confidence or poorly rated questions
- `/analytics` - summary metrics

## Integrations

- Telegram Bot API via grammY
- CookMyBots AI Gateway:
  - `POST /chat`
  - `POST /embeddings`
- MongoDB for persistence

The bot logs AI call start, success, and failure without printing secrets. Errors are shortened for users and logged in detail for operators.

## Database

Collections used:

- `users`
- `conversations`
- `messages`
- `documents`
- `documentchunks`
- `faqs`
- `supporttickets`
- `feedback`
- `adminjobs`
- `memory_messages`
- `user_profiles`
- `user_memory`

Indexes are created only on application fields and never on `_id`.

## Deployment

Deploy as a single Node service on Render or similar.

Required env vars:

- `TELEGRAM_BOT_TOKEN`
- `COOKMYBOTS_AI_ENDPOINT`
- `COOKMYBOTS_AI_KEY`

Recommended:

- `MONGODB_URI`
- `ADMIN_USER_IDS`

The bot defaults to long polling and clears webhook state before polling.

## Troubleshooting

- If startup says `TELEGRAM_BOT_TOKEN` is missing, set it in env and redeploy.
- If AI answers are unavailable, verify `COOKMYBOTS_AI_ENDPOINT` and `COOKMYBOTS_AI_KEY`.
- If MongoDB is missing, the bot still runs with in-memory fallback for memory features.
- Use `/help` to confirm commands are registered.
- Watch startup logs for env presence checks, DB status, polling retries, and memory usage.

## Extending

Add new commands in `src/commands/` and they will be auto-registered by `src/commands/loader.js`. Put shared logic in `src/services/` or `src/lib/` and keep command modules small.
