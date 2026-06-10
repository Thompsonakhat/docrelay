DocRelay is a Telegram support bot that answers user questions using stored FAQs and support documents. It tracks source snippets, offers escalation to human support, stores feedback, and provides admin tools for content management and analytics.

Public commands:

1) /start
What it does: Starts the bot and explains how to ask support questions.
Arguments: none
Usage: /start

2) /help
What it does: Shows the supported commands and support scope.
Arguments: none
Usage: /help

3) /ask
What it does: Answers a support question using indexed FAQs and documents.
Arguments: question text
Usage: /ask How do I reset my password?

4) /faq
What it does: Shows top FAQs or FAQs matching a keyword.
Arguments: optional keyword
Usage: /faq billing

5) /sources
What it does: Shows the sources used for the last answer.
Arguments: none
Usage: /sources

6) /escalate
What it does: Escalates the current conversation to human support.
Arguments: optional reason
Usage: /escalate I still need help with billing

7) /feedback
What it does: Rates the last answer and optionally adds a comment.
Arguments: rating and optional comment
Usage: /feedback helpful Solved my problem

8) /status
What it does: Shows the status of the user’s latest open support ticket.
Arguments: none
Usage: /status

9) /reset
What it does: Clears stored conversation memory for the current user.
Arguments: none
Usage: /reset

10) /memory
What it does: Shows the short stored memory summary for the current user.
Arguments: none
Usage: /memory

11) /forgetme
What it does: Clears the user’s stored memory summary and message memory.
Arguments: none
Usage: /forgetme

Admin commands:

12) /admin
What it does: Shows the available admin actions.
Arguments: none
Usage: /admin

13) /addfaq
What it does: Adds a FAQ entry.
Arguments: Question | Answer
Usage: /addfaq How do I cancel? | Open billing settings and choose cancel.

14) /upload
What it does: Accepts a text message or uploaded text-like document for indexing.
Arguments: optional caption metadata with uploaded file
Usage: /upload

15) /reindex
What it does: Rebuilds the retrieval index for FAQs and documents.
Arguments: none
Usage: /reindex

16) /review
What it does: Reviews unanswered, low-confidence, or poorly rated questions.
Arguments: none
Usage: /review

17) /analytics
What it does: Shows support volume, answer quality, and escalation summaries.
Arguments: none
Usage: /analytics

Environment variables:

1) TELEGRAM_BOT_TOKEN
Used for: Telegram bot authentication
Required: yes

2) MONGODB_URI
Used for: persistence, memory, FAQs, docs, tickets, analytics
Required: no, but strongly recommended

3) COOKMYBOTS_AI_ENDPOINT
Used for: CookMyBots AI Gateway base URL
Required: yes for AI answers

4) COOKMYBOTS_AI_KEY
Used for: CookMyBots AI Gateway authentication
Required: yes for AI answers

5) ADMIN_USER_IDS
Used for: Telegram admin authorization
Required: no

6) SUPPORT_CHAT_ID
Used for: notifying a support/admin chat when a ticket is escalated
Required: no

7) AI_TIMEOUT_MS
Used for: AI request timeout in milliseconds
Required: no

8) AI_MAX_RETRIES
Used for: retry count for AI gateway calls
Required: no

9) CONCURRENCY
Used for: optional general runtime tuning
Required: no

10) CONFIDENCE_THRESHOLD
Used for: grounded answer confidence threshold
Required: no

11) MAX_CONTEXT_TURNS
Used for: memory turns loaded into AI context
Required: no

12) MEMORY_LOG_INTERVAL_MS
Used for: periodic memory usage logs
Required: no

13) DOCS_STORAGE_DIR
Used for: local storage for uploaded support documents
Required: no

Basic setup:

1) Install dependencies with npm install.
2) Copy .env.sample to .env.
3) Set TELEGRAM_BOT_TOKEN.
4) Set COOKMYBOTS_AI_ENDPOINT and COOKMYBOTS_AI_KEY.
5) Optionally set MONGODB_URI and ADMIN_USER_IDS.
6) Run npm run dev for development or npm start for production.
