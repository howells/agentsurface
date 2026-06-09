export interface GlossaryTerm {
  id: string;
  acronym: string;
  name: string;
  category: string;
  definition: string;
  detail: string;
}

export const glossaryTerms: GlossaryTerm[] = [
  // Foundation
  {
    acronym: "LLM",
    category: "Foundation",
    definition: "A neural network trained on vast text that predicts and generates language.",
    detail:
      "LLMs are the reasoning engines behind AI assistants. They don't store facts like a database — they compress statistical patterns from training data into billions of numerical weights. At inference time, they generate text token by token based on probability. GPT-4, Claude, and Gemini are all LLMs. The 'large' refers to parameter count (billions), which correlates loosely with capability.",
    id: "llm",
    name: "Large Language Model",
  },
  {
    acronym: "Token",
    category: "Foundation",
    definition: "The unit an LLM reads and writes — roughly ¾ of a word.",
    detail:
      "LLMs don't process characters or words directly — they work with tokens, which are chunks of text defined by a vocabulary (usually 50k–100k entries). 'Unbelievable' might be one token; 'supercalifragilistic' might be four. Tokens matter because they determine cost (you pay per token), speed, and context window limits. 1 million tokens is roughly 750,000 words — about ten novels.",
    id: "token",
    name: "Token",
  },
  {
    acronym: "Context",
    category: "Foundation",
    definition: "Everything the model can 'see' at once — its working memory.",
    detail:
      "The context window is the maximum amount of text an LLM can process in a single request. It includes the system prompt, conversation history, tool results, and any injected documents. Models with larger context windows (200k+ tokens) can reason over entire codebases or legal documents in one shot. Information outside the window is invisible to the model — there's no background retention between requests.",
    id: "context-window",
    name: "Context Window",
  },
  {
    acronym: "PE",
    category: "Foundation",
    definition: "Crafting inputs to reliably steer model behaviour.",
    detail:
      "Prompt engineering is the practice of designing instructions, examples, and constraints that make LLM outputs more accurate, consistent, and useful. Techniques include chain-of-thought prompting (ask the model to reason step-by-step), few-shot examples (show 2-3 input/output pairs), and role framing (assign a persona). As models improve, prompts can become simpler — but for complex workflows, careful prompt design remains a key lever.",
    id: "prompt-engineering",
    name: "Prompt Engineering",
  },
  // Memory & Knowledge
  {
    acronym: "RAG",
    category: "Memory & Knowledge",
    definition:
      "Pulls live knowledge into a prompt at inference time rather than baking it into weights.",
    detail:
      "RAG solves the staleness problem: LLMs have a training cutoff and can't know what happened yesterday. Instead of retraining, RAG retrieves relevant documents from a knowledge base and stuffs them into the context window before generating an answer. The model sees the retrieved text and can cite it. RAG pipelines typically embed a query, search a vector store, rerank results, and then pass the top chunks to the LLM.",
    id: "rag",
    name: "Retrieval-Augmented Generation",
  },
  {
    acronym: "Embed",
    category: "Memory & Knowledge",
    definition:
      "A list of numbers that captures the meaning of text in a form machines can compare.",
    detail:
      "An embedding model converts text into a dense numerical vector — typically 768–3072 floating-point numbers. Texts with similar meaning produce vectors that are geometrically close. This lets you find 'documents about the same topic' without exact keyword matches. Embeddings are the foundation of semantic search, RAG, deduplication, and recommendation systems. Popular embedding models include OpenAI's text-embedding-3-large and Cohere's Embed v3.",
    id: "embedding",
    name: "Embedding",
  },
  {
    acronym: "VectorDB",
    category: "Memory & Knowledge",
    definition: "A store optimised for finding semantically similar embeddings at scale.",
    detail:
      "Traditional databases find exact matches. A vector database finds nearest neighbours — the N embeddings geometrically closest to a query vector. This is how RAG retrieves 'relevant' chunks without knowing the exact words in them. Popular options include Pinecone, Weaviate, Qdrant, pgvector (Postgres extension), and Chroma. Most support metadata filtering so you can combine semantic search with structured conditions (e.g., 'similar to this query AND from the last 30 days').",
    id: "vector-db",
    name: "Vector Database",
  },
  {
    acronym: "KG",
    category: "Memory & Knowledge",
    definition: "A network of entities and the typed relationships between them.",
    detail:
      "Where a vector database finds similar documents, a knowledge graph models how things connect. Nodes represent entities (Product, Brand, Category, Supplier); edges represent relationships (MADE_BY, BELONGS_TO, SUBSTITUTES). KGs enable multi-hop reasoning — 'find all suppliers of ingredients used in products certified organic in the EU' — that's hard to do with vector search alone. KGs and RAG are often combined: the graph provides structure, vectors provide semantic search.",
    id: "knowledge-graph",
    name: "Knowledge Graph",
  },
  // Agent Infrastructure
  {
    acronym: "MCP",
    category: "Agent Infrastructure",
    definition: "An open standard for connecting AI agents to tools, data, and services.",
    detail:
      "MCP is to agents what USB is to devices — a universal connector. Any AI client (Claude, Cursor, Copilot) can connect to any MCP server and automatically discover its tools. You build the server once; every MCP-compatible agent can use it without custom integration. MCP servers expose tools (actions), resources (data), and prompts (templates). Servers can run locally or as HTTP services. The protocol handles capability discovery, input validation, and streaming responses.",
    id: "mcp",
    name: "Model Context Protocol",
  },
  {
    acronym: "Tools",
    category: "Agent Infrastructure",
    definition: "Structured mechanism for an LLM to invoke external actions and return results.",
    detail:
      "LLMs can't directly query databases or call APIs — but they can emit a structured 'I want to call this function with these arguments' response. The host application executes the actual call, returns the result, and the model incorporates it into its response. This is function calling (OpenAI terminology) or tool use (Anthropic/Google). Tools transform an LLM from a text generator into an agent that can take real-world actions: search the web, write files, send emails, query APIs.",
    id: "tool-calling",
    name: "Tool / Function Calling",
  },
  {
    acronym: "Agent",
    category: "Agent Infrastructure",
    definition: "An LLM in a loop — perceives, reasons, acts, and observes consequences.",
    detail:
      "An AI agent is not just a chatbot — it's a system where an LLM autonomously decides what actions to take (tool calls), observes the results, and iterates until a goal is reached. Agents can browse the web, write and run code, manage files, and coordinate with other agents. The key elements are: a model (the reasoner), tools (the hands), memory (context), and an orchestrator (the loop). Reliability drops as loop length grows — short, bounded tasks are where agents shine today.",
    id: "agent",
    name: "AI Agent",
  },
  {
    acronym: "Orch.",
    category: "Agent Infrastructure",
    definition: "Coordinating multiple agents, tools, and models to complete a complex task.",
    detail:
      "When a single agent can't complete a task end-to-end, orchestration breaks it across specialised agents. A planner agent decomposes the goal; specialist agents execute subtasks; a synthesiser combines results. Frameworks like Mastra, LangGraph, and CrewAI provide state machines, retry logic, and handoff protocols. Agent-to-agent communication is increasingly standardised via A2A and ACP protocols. Orchestration adds reliability at the cost of latency and complexity.",
    id: "orchestration",
    name: "Orchestration",
  },
  // Data & Integration
  {
    acronym: "API",
    category: "Data & Integration",
    definition:
      "A contract that lets software talk to software — the connective tissue of the web.",
    detail:
      "APIs define how to request data or trigger actions: the URL, method (GET/POST), parameters, and response format. REST APIs return JSON over HTTP; GraphQL lets callers specify exactly the shape of data they want. For AI agents, API quality matters enormously — good OpenAPI specs let agents discover and use your services without human guidance. An API without machine-readable docs is invisible to agents; one with clear schemas, operationIds, and descriptions is a first-class citizen of the agentic web.",
    id: "api",
    name: "Application Programming Interface",
  },
  {
    acronym: "ETL/ELT",
    category: "Data & Integration",
    definition: "Pipelines that move and reshape data from sources to destinations.",
    detail:
      "ETL extracts data from source systems, transforms it to fit the target schema, then loads it. ELT loads raw data first, transforms later — the modern approach enabled by cheap compute in data warehouses. For AI: ETL/ELT pipelines feed training sets, populate vector databases, keep knowledge graphs fresh, and sync product catalogs into RAG systems. Without well-designed pipelines, your AI applications reason over stale or inconsistent data. Tools include dbt, Airbyte, Fivetran, and AWS Glue.",
    id: "etl",
    name: "Extract, Transform, Load",
  },
  {
    acronym: "PIM/MDM",
    category: "Data & Integration",
    definition: "Central systems of record for product data and enterprise entity definitions.",
    detail:
      "A PIM (Product Information Manager) is the canonical source for product attributes — names, descriptions, specs, images, pricing, certifications. MDM extends this to any master entity: customers, suppliers, locations, materials. For AI agents, PIM/MDM quality is a multiplier — an agent browsing your catalog is only as good as the data it retrieves. Agents benefit most when PIM data has structured attributes (not long unstructured descriptions), standardised taxonomies, and machine-readable export formats.",
    id: "pim-mdm",
    name: "Product Info & Master Data Management",
  },
  {
    acronym: "Schema",
    category: "Data & Integration",
    definition: "The structure, vocabulary, and hierarchy that give data meaning.",
    detail:
      "A schema defines the shape of data (fields, types, constraints). A taxonomy organises concepts into a hierarchy (Animal > Mammal > Dog). An ontology goes further — it defines relationships between concepts (Dog IS-A Mammal, Dog CAN bark). These distinctions matter for AI because structured, well-defined data is dramatically easier for models to reason over than free-text. Schema.org provides shared vocabularies for web content; JSON-LD embeds them in HTML so agents can parse meaning without scraping.",
    id: "schema",
    name: "Schema / Ontology / Taxonomy",
  },
  // Agent Readiness
  {
    acronym: "AEO",
    category: "Agent Readiness",
    definition: "Making your software discoverable, navigable, and operable by AI agents.",
    detail:
      "Just as SEO made websites findable by search engines, AEO makes software legible to AI agents. It covers: structured context files (AGENTS.md, CLAUDE.md), machine-readable discovery endpoints (llms.txt, .well-known), agent-friendly APIs with OpenAPI specs, MCP servers for direct tool access, and content negotiation (serving Markdown when an agent requests it). AEO is the discipline this entire site is built around — the 11 Surface dimensions are its scoring rubric.",
    id: "aeo",
    name: "Agent Engine Optimisation",
  },
  {
    acronym: "llms.txt",
    category: "Agent Readiness",
    definition: "A plain-text file at a site's root that maps content for LLM consumption.",
    detail:
      "Proposed by Jeremy Howard in 2024, llms.txt is the robots.txt for the agent era. Where robots.txt tells crawlers what not to index, llms.txt tells LLMs what to read and in what order. It's a Markdown file listing the most important pages on a site with brief descriptions — a curated map rather than a sitemap dump. Many documentation sites and developer tools now publish both llms.txt (index) and llms-full.txt (full content concatenated) so agents can ingest the whole site in one request.",
    id: "llms-txt",
    name: "llms.txt",
  },
  {
    acronym: "Ground",
    category: "Agent Readiness",
    definition: "Anchoring LLM outputs to verified, up-to-date source material.",
    detail:
      "An ungrounded LLM reasons from its training weights — which may be stale, biased, or simply wrong for your domain. Grounding connects model outputs to external truth sources: a product database, a live API, a document store. RAG is the most common grounding technique. Grounding is why agents with tool access are more reliable than standalone models for factual tasks — they can verify claims against live data rather than hallucinating from memory.",
    id: "grounding",
    name: "Grounding",
  },
  {
    acronym: "Guard",
    category: "Agent Readiness",
    definition: "Constraints that keep AI agents within safe, intended boundaries.",
    detail:
      "Guardrails are the safety and compliance layer around AI systems. They can be input filters (block prompt injection attempts), output validators (ensure responses match a schema, don't leak PII), action constraints (an agent can read files but not delete them), or cost caps (stop after N tokens or N tool calls). Hard guardrails halt execution; soft guardrails log violations for review. As agents take on higher-stakes tasks — writing code, sending emails, executing transactions — guardrail design becomes a core engineering concern.",
    id: "guardrails",
    name: "Guardrails",
  },
  // Ops & Lifecycle
  {
    acronym: "LLMOps",
    category: "Ops & Lifecycle",
    definition: "The discipline of deploying, monitoring, and improving AI systems in production.",
    detail:
      "LLMOps extends DevOps principles to AI: version-control your prompts, track model changes like code changes, monitor output quality over time, and build eval pipelines to catch regressions. Unlike traditional software, AI systems degrade silently — a model update or data drift can change behaviour without a clear error. LLMOps tooling (Langfuse, Braintrust, Helicone, Arize) provides observability for this fuzzy layer. Evals — automated tests that score model outputs against criteria — are the unit tests of LLMOps.",
    id: "llmops",
    name: "LLM Operations",
  },
  {
    acronym: "SFT",
    category: "Ops & Lifecycle",
    definition: "Adapting a pretrained model to a specific domain or task using targeted training.",
    detail:
      "Fine-tuning continues training an already-capable base model on a smaller, curated dataset — typically thousands of input/output pairs that demonstrate the desired behaviour. It can make a model faster, cheaper, more consistent, or better at domain-specific tasks. It does NOT reliably add new knowledge (RAG is better for that) — it shapes style and behaviour. Fine-tuning is often misused as a first resort; most problems are better solved with prompt engineering or RAG before reaching for the training budget.",
    id: "fine-tuning",
    name: "Fine-Tuning",
  },
  {
    acronym: "Infer",
    category: "Ops & Lifecycle",
    definition: "Running a trained model to produce outputs — the live serving layer.",
    detail:
      "Training teaches the model; inference is using it. Every API call to Claude or GPT-4 is an inference request. Inference cost and latency are the primary operational concerns for AI products: larger models are more capable but slower and costlier per token. Optimisation techniques include quantisation (reducing numerical precision), batching (processing multiple requests together), caching (reusing computation for repeated prefixes), and speculative decoding (using a smaller model to draft tokens a larger model verifies).",
    id: "inference",
    name: "Inference",
  },
  {
    acronym: "A2A",
    category: "Ops & Lifecycle",
    definition: "Protocols for agents to discover, delegate to, and collaborate with other agents.",
    detail:
      "As agent systems grow, agents need to call other agents — a research agent might delegate to a web-search agent, which delegates to a summarisation agent. A2A (Google's Agent-to-Agent protocol) and ACP (Agent Communication Protocol) standardise how agents advertise capabilities, accept tasks, stream progress, and return results. Without standards, every multi-agent integration is bespoke. With them, agents from different vendors and frameworks can compose. A2A is to agent networks what APIs are to web services.",
    id: "a2a",
    name: "Agent-to-Agent",
  },
];

export const featuredTermIds = ["mcp", "rag", "aeo", "llm", "tool-calling", "grounding"];
