# Agentic Patterns Cookbook

Production-grade TypeScript templates for building agentic SaaS with Vercel AI SDK, MCP, and Temporal. Each template is self-contained, generic (no domain-specific naming), and extensively commented with `// <CUSTOMISE>` markers.

## Templates

| File | Lines | Purpose |
|------|-------|---------|
| `tool-loop-vercel-ai.ts` | 184 | Minimal `generateText` and `streamText` tool loops with `smoothStream()` and `stepCountIs(10)` |
| `toolpick.ts` | 218 | Embedding-based tool selection: OpenAI text-embedding-3-small, cosine similarity, lazy re-indexing |
| `system-prompt-builder.ts` | 248 | Composable prompt blocks: identity, safety rules, tool routing, platform instructions, versioning |
| `platform-adapter.ts` | 203 | Normalize messages from web/Slack/WhatsApp/Telegram; format responses; resolve identity across platforms |
| `notification-context.ts` | 194 | Redis-backed (or in-memory) store for notification contexts with TTL; inject into system prompt |
| `draft-then-confirm.ts` | 219 | MCP tool pair for human-in-the-loop: `prepare_draft_*` + `confirm_send_*` with idempotency |
| `autonomous-worker.ts` | 291 | Temporal workflows for scheduled work: weekly insights, hourly jobs, per-minute flushers; Inngest/Bun cron variants |
| `tool-registry-with-annotations.ts` | 320 | Tool registry with READ_ONLY/WRITE/DESTRUCTIVE annotations; role-based filtering; audit logging |
| `external-app-meta-tools.ts` | 308 | Composio-style `search_tools` + `multi_execute` for discovering and executing external app actions |
| `mcp-server-public.ts` | 326 | Public MCP HTTP server with OAuth 2.1 + DPoP; multi-tenant rate limiting; Claude Desktop / ChatGPT integration |

**Total: 2,611 lines of template code (plus 998 lines of comments and docstrings).**

## Tech Stack

- **TypeScript strict**, no `any`
- **Zod** for all schemas
- **Vercel AI SDK v3+** (generateText, streamText, ToolLoopAgent)
- **MCP SDK** (@modelcontextprotocol)
- **Temporal TypeScript SDK** (workflow orchestration)
- **OpenAI embeddings** (text-embedding-3-small)
- **jose** (implied for JWT/DPoP token signing)

## Style Guide

1. **Top-of-file comment block**: What, When to use, Docs URL, Customization checklist
2. **Inline `// <CUSTOMISE>`** markers highlight required changes for your domain
3. **Generic domain vocab**: "records", "orders", "tasks", "customers" — no finance/invoice/transaction specifics
4. **Zod schemas** for all inputs; `import type` everywhere
5. **RFC 9457 Problem Detail** for error responses (in tool-loop-vercel-ai.ts)
6. **Inline docstrings** with parameter descriptions and return types

## Patterns Corroborated from Midday Codebase

- **Tool windowing** via `experimental_prepareStep` (seen in assistant-runtime.ts)
- **Toolpick integration** with `createToolIndex()` and embedding caching (tools.ts)
- **System prompt modularity** with identity blocks, safety rules, tool routing (prompt.ts, platform-rules.ts)
- **Platform-specific instructions** (dashboard, web, Slack, WhatsApp, Telegram, iMessage)
- **Notification context injection** (activity-notifications.ts pattern)
- **Tool annotations** (READ_ONLY, WRITE, DESTRUCTIVE) with scope checks (mcp/types.ts)
- **Draft-then-confirm workflow** implied by invoice send/remind patterns

## Patterns NOT Fully Corroborated

- **MCP HTTP server with OAuth 2.1 + DPoP**: Only in-memory MCP transport seen; public HTTP variant is extrapolated from MCP spec and OAuth 2.1 draft
- **Inngest + Bun cron alternates**: Temporal is the reference stack; Inngest/Bun variants are commented stubs based on their public APIs
- **Embedding cache with Redis TTL**: Only file-based cache (`fileCache()`) visible; Redis pattern is idiomatic but unverified against Midday

## Next Steps

1. Replace `// <CUSTOMISE>` sections with your domain logic
2. Connect to your actual API, database, and external services
3. Test with your Vercel AI SDK + MCP runtime
4. Deploy to Vercel, Docker, or your infrastructure
5. Integrate with Claude Desktop or ChatGPT plugins via `mcp-server-public.ts`

## License

Public domain — use freely in your agentic SaaS projects.
