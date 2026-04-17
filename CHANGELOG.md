# Changelog

All notable changes to agentify are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-04-17

### Added

- **6 Discipline Guides** (~60 pages):
  - Tool Design (250 lines): Principles for building atomic, understandable agent-grade tools
  - Orchestration (250 lines): Single vs. multi-agent systems, queues, event streams, deployments
  - Evaluation (250 lines): Metrics, pass@k evaluation, red-teaming, production monitoring
  - Retrievability (250 lines): Hybrid search, chunking, RAGAS evaluation, latency optimization
  - Proactive Agents (200 lines): Event-driven scheduling, state management, notifications
  - Agentic Patterns (300 lines): Index of 10 transferable patterns with rationales and examples

- **11-Dimension Framework**: Structured thinking across tool design, orchestration, evaluation, retrievability, proactive agents, patterns, safety, observability, cost, latency, and UX

- **42+ Templates**:
  - Invoice approval workflows (single-agent and multi-agent)
  - Transaction categorization (few-shot, confidence-based)
  - Reconciliation agent (hierarchical decomposition)
  - Support ticket classifier
  - Multi-turn dialogue assistant
  - Data retrieval and synthesis agents
  - Batch processing pipelines
  - Examples for each major pattern

- **Comprehensive Cookbook**:
  - Tool Composition pattern: chain simple tools
  - Reflection & Self-Correction: agent review before commit
  - Hierarchical Decomposition: breaking down large goals
  - Few-Shot Prompting: teaching via examples
  - Constraint-Driven Reasoning: rules in tools, not prompts
  - Error Recovery Loops: graceful fallbacks
  - Retrieval-Augmented Generation (RAG): ground reasoning in data
  - Multi-Turn Dialogue: conversation context management
  - Agentic Loops with Telemetry: instrumentation and observability
  - Staged Reasoning with Confidence: decision routing by confidence threshold

- **Reference Materials**:
  - `house-style.md`: Bun + TypeScript + Next.js + Turborepo + Biome + Drizzle conventions
  - `tool-design.md`: Design principles and anti-patterns
  - `safety.md`: Guardrails, compliance, audit trails, human-in-the-loop patterns
  - `observability.md`: Logging, tracing, metrics, dashboards (OpenTelemetry + Sentry)
  - `eval-cookbook.md`: Evalite, RAGAS, custom harnesses
  - `retrieval-cookbook.md`: Qdrant, Pinecone, Weaviate, Milvus setups
  - `orchestration-cookbook.md`: Temporal, Trigger.dev, Inngest examples
  - `error-handling.md`: Error codes, recovery strategies, escalation paths
  - `prompt-engineering.md`: Few-shot, chain-of-thought, role-playing patterns

- **Full Fumadocs Site**:
  - ≥60 MDX pages with searchable content
  - Dark mode, offline support, sidebar navigation
  - Syntax highlighting for TypeScript/Python code blocks
  - Auto-generated from markdown source

- **Specification Compliance**:
  - Full `AGENTS.md` spec with tool schema, agent schema, and orchestration patterns
  - RFC 9457 (Problem Details for HTTP APIs) error format
  - MCP 2025-11-25 compatibility
  - A2A v1.0 RC alignment

- **Core Libraries** (`/packages/`):
  - `@agentify/eval`: Pass@k evaluation harness, RAGAS metrics, golden-set tracking
  - `@agentify/tools`: Tool validator (Zod schemas, error codes, idempotency checks)
  - `@agentify/orchestrate`: Queue adapters (BullMQ, Trigger.dev), workflow definitions
  - `@agentify/retrieve`: Hybrid search client, chunking utilities, reranking
  - `@agentify/observe`: Structured logging, OpenTelemetry integration, Sentry bridges

- **8+10 Specialist Sub-Agents**:
  - 8 core agents: invoice-approver, transaction-categorizer, reconciler, support-classifier, data-synthesizer, tax-calculator, audit-logger, notification-router
  - 10 pattern-specific agents: composition-example, reflection-example, decomposition-example, few-shot-example, constraint-example, recovery-example, rag-example, dialogue-example, telemetry-example, confidence-example

- **Installation Guide** (`INSTALL.md`):
  - Plugin marketplace installation
  - Git clone and setup
  - Local dev server (bun run dev)
  - Project structure overview

- **CLI (`/agentify` slash command)**:
  - `design`: Generate multi-agent architecture
  - `evaluate`: Run pass@k evaluation on agents
  - `optimize`: Cost and latency optimization suggestions
  - `style`: House style linting and formatting
  - `scaffold`: Generate starter agents from patterns

### Changed

- Dimensions expanded from 8 to 11 (added Proactive Agents, Patterns, UX)
- MCP specification updated to 2025-11-25 release (from previous version)
- RFC 7807 (Problem Details) upgraded to RFC 9457 (more comprehensive)
- Deprecated: Direct agent-to-agent HTTP calls; all multi-agent communication now queue/event-based
- Tool schema now requires explicit error codes and recovery hints

### Fixed

- Removed ambiguity in tool composition examples
- Clarified when to use single agent vs. multi-agent (decision tree added)
- Updated all code examples to Bun 1.3+ and TypeScript 6.0+ syntax
- Corrected RAGAS metric definitions (context precision/recall)
- House style guide now reflects Biome 2.4+ configuration (no ESLint/Prettier references)

---

## Legend

- **Added**: New features, guides, templates, or libraries
- **Changed**: Modifications to existing functionality or specifications
- **Fixed**: Corrections to documentation, examples, or compatibility notes
- **Removed**: Deprecated or removed features

---

## Roadmap (Future Releases)

- **1.1.0** (Q3 2026): Multi-language support (Python, Go), benchmarking suite
- **1.2.0** (Q4 2026): Visual workflow designer, real-time collaboration
- **2.0.0** (2027): Formal verification of agent safety, synthetic data generation
