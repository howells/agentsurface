/** Glossary categories in reading order. The docs glossary, its Markdown and the /glossary cards all group by these. */
export const glossaryCategories = [
  {
    description: "The model concepts everything else builds on.",
    id: "foundation",
    name: "Foundation",
  },
  {
    description: "What makes a website, app or API something an agent can find, read and use.",
    id: "agent-readiness",
    name: "Agent readiness",
  },
  {
    description: "How agents connect to data and services: APIs, protocols and retrieval.",
    id: "data-integration",
    name: "Data & integration",
  },
  {
    description: "How agents prove who they are and act with delegated, limited permission.",
    id: "auth-identity",
    name: "Auth & identity",
  },
  {
    description: "What an agent system is built from: loops, tools, orchestration and runtimes.",
    id: "agent-infrastructure",
    name: "Agent infrastructure",
  },
  {
    description: "How agents keep and recall information across turns and sessions.",
    id: "memory-knowledge",
    name: "Memory & knowledge",
  },
  {
    description: "Running agents in production: testing, tracing, safety and recovery.",
    id: "ops-lifecycle",
    name: "Ops & lifecycle",
  },
  {
    description: "How agents buy things and move money within agreed limits.",
    id: "payments",
    name: "Payments",
  },
] as const;

export type GlossaryCategory = (typeof glossaryCategories)[number]["name"];

export interface GlossaryTerm {
  id: string;
  acronym: string;
  name: string;
  category: GlossaryCategory;
  definition: string;
  detail: string;
  /** Exact surface forms matched in docs prose to auto-link this term. Acronyms are case-sensitive. */
  aliases: string[];
  href?: string;
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    id: "llm",
    acronym: "LLM",
    name: "Large Language Model",
    category: "Foundation",
    definition: "A neural network trained on vast text that predicts and generates language.",
    detail:
      "LLMs don't store facts like a database; they compress statistical patterns from training data into billions of numerical weights. At inference time they generate text token by token based on probability. The 'large' refers to parameter count, which correlates loosely with capability. Claude, GPT and Gemini are all LLMs.",
    aliases: ["LLM", "LLMs", "large language model", "large language models"],
  },
  {
    id: "token",
    acronym: "Token",
    name: "Token",
    category: "Foundation",
    definition: "The unit an LLM reads and writes, roughly three-quarters of a word.",
    detail:
      "LLMs don't process characters or words directly; they work with tokens, chunks of text defined by a vocabulary of tens of thousands of entries. Tokens matter because they determine cost, speed, and context window limits. A million tokens is roughly 750,000 words, about ten novels.",
    aliases: ["token", "tokens", "tokenisation", "tokenization"],
  },
  {
    id: "context-window",
    acronym: "Context",
    name: "Context Window",
    category: "Foundation",
    definition: "Everything the model can see at once, its working memory.",
    detail:
      "The context window is the maximum amount of text an LLM can process in a single request: the system prompt, conversation history, tool results, and any injected documents. Information outside the window is invisible to the model; there is no background retention between requests.",
    aliases: ["context window", "context windows"],
  },
  {
    id: "structured-output",
    acronym: "Structured Output",
    name: "Structured Output",
    category: "Foundation",
    definition: "A model response constrained to a fixed schema instead of free text.",
    detail:
      "Structured output removes a class of parsing failures by having the model return exactly the shape a schema declares - useful for classification, extraction, or any step where the result needs to be consumed as data rather than read as prose. Because the task is narrow and well-specified, it's often a good fit for a cheaper model than the one handling open-ended reasoning elsewhere in the same agent.",
    aliases: ["structured output", "structured outputs"],
    href: "/docs/agents/prompts-and-configuration#structured-output",
  },
  {
    id: "reasoning-effort",
    acronym: "Reasoning Effort",
    name: "Reasoning Effort",
    category: "Foundation",
    definition: "A per-call setting on reasoning models that trades latency for deliberation.",
    detail:
      "Raising effort makes a reasoning model spend more time deliberating before it answers, at the cost of latency; lowering it answers faster but with less deliberation. It's a per-call knob, not a global default - raise it for genuinely hard steps and leave it low elsewhere.",
    aliases: ["reasoning effort", "effort setting"],
    href: "/docs/tooling-catalog/model-providers-and-gateways#model-choice-axes",
  },
  {
    id: "prompt-engineering",
    acronym: "PE",
    name: "Prompt Engineering",
    category: "Foundation",
    definition: "Crafting inputs to reliably steer model behaviour.",
    detail:
      "Prompt engineering designs instructions, examples, and constraints that make LLM outputs more accurate, consistent, and useful. Techniques include chain-of-thought prompting, few-shot examples, and role framing. Careful prompt design remains a key lever for complex workflows even as models improve.",
    aliases: ["prompt engineering"],
  },
  {
    id: "rag",
    acronym: "RAG",
    name: "Retrieval-Augmented Generation",
    category: "Memory & knowledge",
    definition:
      "Pulls live knowledge into a prompt at inference time rather than baking it into weights.",
    detail:
      "RAG solves the staleness problem: an LLM has a training cutoff and cannot know what happened after it. Instead of retraining, RAG retrieves relevant documents from a knowledge base and adds them to the context window before generating an answer. A typical pipeline embeds a query, searches a vector store, reranks results, and passes the top chunks to the model.",
    aliases: ["RAG", "retrieval-augmented generation"],
  },
  {
    id: "embedding",
    acronym: "Embed",
    name: "Embedding",
    category: "Memory & knowledge",
    definition:
      "A list of numbers that captures the meaning of text in a form machines can compare.",
    detail:
      "An embedding model converts text into a dense numerical vector, typically 768 to 3072 floating-point numbers. Texts with similar meaning produce vectors that sit close together, which lets software find semantically related content without exact keyword matches. Embeddings underpin semantic search, RAG, deduplication, and recommendation systems.",
    aliases: ["embedding", "embeddings", "embedding model"],
  },
  {
    id: "reranking",
    acronym: "Rerank",
    name: "Reranking",
    category: "Memory & knowledge",
    definition: "A second, more precise pass that reorders retrieved results by relevance.",
    detail:
      "Vector search returns candidates quickly but imprecisely. A reranker scores each candidate against the query with a slower, more accurate model and reorders the list before it reaches the LLM. Reranking is a common way to raise RAG answer quality without changing the underlying retrieval index.",
    aliases: ["rerank", "reranking", "reranker", "rerankers"],
  },
  {
    id: "vector-db",
    acronym: "VectorDB",
    name: "Vector Database",
    category: "Memory & knowledge",
    definition: "A store optimised for finding semantically similar embeddings at scale.",
    detail:
      "A traditional database finds exact matches; a vector database finds nearest neighbours, the embeddings geometrically closest to a query vector. This is how RAG retrieves relevant chunks without knowing their exact wording. Most vector databases support metadata filtering, combining semantic search with structured conditions.",
    aliases: ["vector database", "vector databases", "vector store", "vector stores"],
  },
  {
    id: "knowledge-graph",
    acronym: "KG",
    name: "Knowledge Graph",
    category: "Memory & knowledge",
    definition: "A network of entities and the typed relationships between them.",
    detail:
      "Where a vector database finds similar documents, a knowledge graph models how things connect: nodes represent entities, edges represent relationships. Knowledge graphs enable multi-hop reasoning that is hard to do with vector search alone, and are often combined with RAG, where the graph provides structure and vectors provide semantic search.",
    aliases: ["knowledge graph", "knowledge graphs"],
  },
  {
    id: "mcp",
    acronym: "MCP",
    name: "Model Context Protocol",
    category: "Agent infrastructure",
    definition:
      "An open protocol for connecting agent clients to tools, data, and reusable prompts.",
    detail:
      "An MCP server describes the capabilities it offers so a compatible client can discover and call them. Servers can run locally or be reached over HTTP. Support varies by client and protocol version, so authentication, tools, and results still need testing in the clients customers use.",
    aliases: ["MCP", "Model Context Protocol"],
    href: "/docs/mcp-servers",
  },
  {
    id: "tool-calling",
    acronym: "Tools",
    name: "Tool / Function Calling",
    category: "Agent infrastructure",
    definition: "Structured mechanism for an LLM to invoke external actions and return results.",
    detail:
      "An LLM cannot directly query a database or call an API, but it can emit a structured request to call a named function with given arguments. The host application executes the actual call, returns the result, and the model incorporates it into its response. This is what turns a text generator into an agent that can take real-world actions.",
    aliases: ["tool calling", "function calling", "tool use"],
    href: "/docs/tool-design",
  },
  {
    id: "agent",
    acronym: "Agent",
    name: "AI Agent",
    category: "Agent infrastructure",
    definition: "An LLM in a loop: it perceives, reasons, acts, and observes consequences.",
    detail:
      "An AI agent is not just a chatbot; it is a system where an LLM decides what actions to take, observes the results, and iterates until a goal is reached. The key elements are a model (the reasoner), tools (the hands), memory (context), and an orchestrator (the loop). Reliability drops as loop length grows, so short, bounded tasks are where agents perform most reliably today.",
    aliases: ["AI agent", "AI agents", "agent loop"],
    href: "/docs/agents",
  },
  {
    id: "orchestration",
    acronym: "Orch.",
    name: "Orchestration",
    category: "Agent infrastructure",
    definition: "Coordinating model calls, tools, and workflow steps to complete a task.",
    detail:
      "An orchestrator decides what runs next, carries state between steps, and handles retries, limits, and handoffs. It can support one agent or several. A fixed workflow suits predictable steps; an agent can make decisions where the next step depends on the result. More agents are useful only when their separate responsibilities justify the added coordination.",
    aliases: ["orchestration", "orchestrator"],
    href: "/docs/agents",
  },
  {
    id: "agent-skills",
    acronym: "Skills",
    name: "Agent Skills",
    category: "Agent infrastructure",
    definition: "Instructions and supporting files that teach an agent how to perform a task.",
    detail:
      "A skill explains when to use it, the steps to follow, and any tools or reference material needed. It can package a team's working practices for compatible coding agents. Instructions do not grant credentials or override the permissions enforced by the host or service.",
    aliases: ["agent skill", "agent skills", "SKILL.md"],
    href: "/docs/discovery/agent-skills",
  },
  {
    id: "agent-plugins",
    acronym: "Plugins",
    name: "Agent Plugins",
    category: "Agent infrastructure",
    definition: "Installable packages of related agent tools, skills, and connections.",
    detail:
      "A plugin bundles capabilities for a particular agent platform and describes how to install and configure them. Platform formats differ, so a working package in one host does not guarantee compatibility with another.",
    aliases: ["agent plugin", "agent plugins"],
    href: "/docs/discovery/commercial-and-entity-discovery",
  },
  {
    id: "webmcp",
    acronym: "WebMCP",
    name: "Web Model Context Protocol",
    category: "Agent infrastructure",
    definition: "A proposed browser interface that lets a page offer tools to visiting agents.",
    detail:
      "A compatible browser can discover named actions in the current page and call them with defined inputs. The tools operate in the page's context. Browser support is still evolving; this is distinct from running a remote MCP server and should complement accessible controls.",
    aliases: ["WebMCP"],
    href: "/docs/protocols/webmcp",
  },
  {
    id: "mcp-apps",
    acronym: "MCP Apps",
    name: "Interactive Views in MCP Clients",
    category: "Agent infrastructure",
    definition:
      "Interactive interfaces displayed alongside tool results in a compatible MCP client.",
    detail:
      "An MCP App can show a chart, selection interface, or editable result inside a conversation. The host controls how the view loads and what it can access. A service must test host compatibility, accessibility, and security boundaries as well as its tool responses.",
    aliases: ["MCP Apps"],
    href: "/docs/agentic-ui/mcp-apps",
  },
  {
    id: "a2a",
    acronym: "A2A",
    name: "Agent-to-Agent",
    category: "Ops & lifecycle",
    definition: "Protocols for agents to discover, delegate to, and collaborate with other agents.",
    detail:
      "As agent systems grow, agents need to call other agents: a research agent might delegate to a search agent, which delegates to a summarisation agent. A2A and related protocols standardise how agents advertise capabilities, accept tasks, stream progress, and return results, so agents from different vendors and frameworks can compose.",
    aliases: ["A2A", "Agent-to-Agent", "Agent2Agent"],
  },
  {
    id: "durable-execution",
    acronym: "Durable",
    name: "Durable Execution",
    category: "Ops & lifecycle",
    definition: "Running a non-deterministic agent loop inside a replay-safe workflow engine.",
    detail:
      "An agent loop is non-deterministic: the same input can produce different model output, tool results vary, and the step count isn't known in advance. A durable workflow engine assumes replaying recorded history reproduces the same code path. Durable execution reconciles the two by treating each model and tool call as a recorded, memoized step, so a crash and restart resumes from history instead of re-running everything.",
    aliases: ["durable execution"],
    href: "/docs/agents/durable-execution",
  },
  {
    id: "human-in-the-loop",
    acronym: "HITL",
    name: "Human-in-the-Loop",
    category: "Ops & lifecycle",
    definition: "A design where a person must review or approve a step before an agent proceeds.",
    detail:
      "Human-in-the-loop puts a checkpoint in front of consequential or irreversible actions: a spend above a threshold, a delete, a message sent externally. It trades autonomy for a safety margin, and only works if the agent can genuinely pause and wait, not just log a warning and continue.",
    aliases: ["human-in-the-loop", "human in the loop"],
    href: "/docs/agents/guardrails",
  },
  {
    id: "guardrails",
    acronym: "Guard",
    name: "Guardrails",
    category: "Ops & lifecycle",
    definition: "Deterministic checks that wrap an agent loop to keep it within safe boundaries.",
    detail:
      "Runtime guardrails are code, not model behaviour: input processors sanitise what goes in, output processors gate what comes out, before either reaches the user or a tool. Model refusals vary by prompt and drift across versions and cannot be audited, so enforcement belongs in a deterministic layer that runs every time, sequenced and budgeted for latency and cost.",
    aliases: ["guardrail", "guardrails", "runtime guardrails"],
    href: "/docs/agents/guardrails",
  },
  {
    id: "lethal-trifecta",
    acronym: "Trifecta",
    name: "Lethal Trifecta",
    category: "Ops & lifecycle",
    definition:
      "The combination of private-data access, untrusted-content exposure, and an outbound channel that makes an agent exploitable.",
    detail:
      "Any agent with all three properties at once - access to private data, exposure to untrusted content, and a way to send data out - can be steered by text injected into that untrusted content into exfiltrating the data it holds. The attacker never needs to compromise the model, only to get text in front of it. The fix is removing one leg, usually the outbound channel, rather than hardening all three.",
    aliases: ["lethal trifecta"],
    href: "/docs/agents/guardrails#the-lethal-trifecta",
  },
  {
    id: "prompt-injection",
    acronym: "Injection",
    name: "Prompt Injection",
    category: "Ops & lifecycle",
    definition: "Instructions hidden in external content that try to redirect an agent's behavior.",
    detail:
      "A retrieved page might tell an agent to reveal private data or ignore the user's request. Treat that content as untrusted data and enforce permissions outside the model. Testing should cover attempted redirects as well as ordinary input errors.",
    aliases: ["prompt injection"],
    href: "/docs/testing/red-teaming",
  },
  {
    id: "evals",
    acronym: "Evals",
    name: "Agent Evaluations",
    category: "Ops & lifecycle",
    definition: "Automated tests that score an agent's plan, tool calls, and final result.",
    detail:
      "An LLM eval measures a single turn against a reference answer. An agent eval measures multi-step execution: whether the agent reached a correct end state by making correct decisions at each step. A three-layer framework separates reasoning (plan quality), action (tool selection and parameters), and execution (task completion), because each layer can fail independently and a single pass/fail score hides which one broke.",
    aliases: [
      "eval",
      "evals",
      "evaluation",
      "evaluations",
      "agent evaluation",
      "agent evaluations",
    ],
    href: "/docs/testing/evaluation-framework",
  },
  {
    id: "traces",
    acronym: "Traces",
    name: "Traces",
    category: "Ops & lifecycle",
    definition:
      "A recorded timeline of an agent run: which tools ran, in what order, with what results.",
    detail:
      "A trace is the source of truth for debugging an agent: the model calls, tool calls, arguments, results, and errors that made up a run, usually captured as OpenTelemetry spans. The relevant GenAI semantic conventions are still under active development, so treat attribute names as likely to shift and record which convention snapshot a given instrumentation targets.",
    aliases: ["trace", "traces", "tracing"],
    href: "/docs/testing/observability",
  },
  {
    id: "llmops",
    acronym: "LLMOps",
    name: "LLM Operations",
    category: "Ops & lifecycle",
    definition: "The discipline of deploying, monitoring, and improving AI systems in production.",
    detail:
      "LLMOps extends DevOps principles to AI: version-control prompts, track model changes like code changes, monitor output quality over time, and build eval pipelines to catch regressions. AI systems can degrade silently, where a model update or data drift changes behaviour without a clear error, which is why evals and traces matter as much as conventional monitoring.",
    aliases: ["LLMOps"],
  },
  {
    id: "fine-tuning",
    acronym: "SFT",
    name: "Fine-Tuning",
    category: "Ops & lifecycle",
    definition: "Adapting a pretrained model to a specific domain or task using targeted training.",
    detail:
      "Fine-tuning continues training an already-capable base model on a smaller, curated dataset, typically thousands of input/output pairs that demonstrate the desired behaviour. It can make a model faster, cheaper, more consistent, or better at domain-specific tasks, but it does not reliably add new knowledge; RAG is better for that. Most problems are better solved with prompt engineering or RAG before reaching for a training budget.",
    aliases: ["fine-tuning", "fine tuning", "SFT"],
  },
  {
    id: "inference",
    acronym: "Infer",
    name: "Inference",
    category: "Ops & lifecycle",
    definition: "Running a trained model to produce outputs, the live serving layer.",
    detail:
      "Training teaches the model; inference is using it. Every API call to an LLM is an inference request. Inference cost and latency are the primary operational concerns for AI products: larger models are more capable but slower and costlier per token. Optimisation techniques include quantisation, batching, caching, and speculative decoding.",
    aliases: ["inference"],
  },
  {
    id: "sandbox",
    acronym: "Sandbox",
    name: "Test Environment",
    category: "Ops & lifecycle",
    definition:
      "An isolated environment for trying operations without affecting production customers.",
    detail:
      "A sandbox can provide test credentials, sample records, and simulated payments. It lets agents exercise changes and failure recovery before using live services. Document differences from production so a passing test is not mistaken for proof of every live behavior.",
    aliases: ["sandbox", "sandboxes", "test environment"],
    href: "/docs/testing/evaluation-framework",
  },
  {
    id: "rate-limits",
    acronym: "Rate limits",
    name: "Request Limits",
    category: "Ops & lifecycle",
    definition: "Limits on how often a client can call a service.",
    detail:
      "A service may cap requests within a time window or limit concurrent work. Documented quotas and retry timing let agents slow down when they reach the limit. Repeatedly retrying immediately can prolong the failure or exhaust a budget.",
    aliases: ["rate limit", "rate limits", "rate limiting"],
    href: "/docs/error-handling/retry-patterns",
  },
  {
    id: "api",
    acronym: "API",
    name: "Application Programming Interface",
    category: "Data & integration",
    definition:
      "A defined way for software to request data or perform an action in another system.",
    detail:
      "An API describes the operations available, the inputs each accepts, and the results or errors it returns. For example, a shop might offer operations to search products, prepare a cart, and check an order. Clear documentation and consistent responses help agents use those operations correctly.",
    aliases: ["API", "APIs"],
    href: "/docs/api-surface",
  },
  {
    id: "openapi",
    acronym: "OpenAPI",
    name: "OpenAPI Specification",
    category: "Data & integration",
    definition: "A machine-readable description of an HTTP API.",
    detail:
      "It lists operations, inputs, responses, authentication requirements, and errors. Agents and developer tools can use it to construct requests. The specification must describe the API that actually runs; publishing a file alone does not make the operations work.",
    aliases: ["OpenAPI", "OpenAPI Specification"],
    href: "/docs/api-surface/openapi-for-agents",
  },
  {
    id: "graphql",
    acronym: "GraphQL",
    name: "GraphQL",
    category: "Data & integration",
    definition: "An API query language that lets callers choose which fields they receive.",
    detail:
      "A typed schema describes the data and operations available. Queries read data; mutations can change it. Agents need field descriptions, pagination rules, and clear errors to use the schema. A successful HTTP response can still contain GraphQL errors.",
    aliases: ["GraphQL"],
    href: "/docs/api-surface/retrieval-and-job-contracts",
  },
  {
    id: "api-catalog",
    acronym: "API Catalog",
    name: "RFC 9727 API Catalog",
    category: "Data & integration",
    definition: "A well-known endpoint that inventories an organisation's APIs through linksets.",
    detail:
      "Published at /.well-known/api-catalog, the RFC 9727 API Catalog lists an organisation's APIs so agents and tooling can discover them in one place. It does not replace an OpenAPI document for any single API, and does not turn an HTML developer page into a machine-readable contract; each listed API still needs its own accurate description.",
    aliases: ["RFC 9727", "API catalog", "API Catalog", "api-catalog"],
    href: "/docs/discovery/well-known-endpoints",
  },
  {
    id: "sdk",
    acronym: "SDK",
    name: "Software Development Kit",
    category: "Data & integration",
    definition: "Libraries and supporting tools for integrating a service into an application.",
    detail:
      "An SDK can provide typed functions, authentication helpers, and examples around an API. It saves developers and coding agents from rebuilding common integration code. Its supported API versions and maintenance status should be clear.",
    aliases: ["SDK", "SDKs"],
    href: "/docs/discovery/commercial-and-entity-discovery",
  },
  {
    id: "cli",
    acronym: "CLI",
    name: "Command-Line Interface",
    category: "Data & integration",
    definition: "A way to operate software by entering commands in a terminal.",
    detail:
      "Coding agents can use a CLI in scripts and automated workflows. Explicit arguments, structured output, meaningful exit codes, and a way to run without interactive prompts make commands easier to use reliably.",
    aliases: ["CLI", "CLIs", "command-line interface"],
    href: "/docs/cli-design",
  },
  {
    id: "etl",
    acronym: "ETL/ELT",
    name: "Extract, Transform, Load",
    category: "Data & integration",
    definition: "Pipelines that move and reshape data from sources to destinations.",
    detail:
      "ETL extracts data from source systems, transforms it to fit the target schema, then loads it. ELT loads raw data first and transforms later, the more common approach once warehouse compute became cheap. These pipelines feed training sets, populate vector databases, and keep knowledge graphs and RAG systems fresh; a poorly designed pipeline means an AI application reasons over stale or inconsistent data.",
    aliases: ["ETL", "ELT"],
  },
  {
    id: "pim-mdm",
    acronym: "PIM/MDM",
    name: "Product Info & Master Data Management",
    category: "Data & integration",
    definition: "Central systems of record for product data and enterprise entity definitions.",
    detail:
      "A PIM (Product Information Manager) is the canonical source for product attributes: names, descriptions, specs, images, pricing, certifications. MDM extends this to any master entity, such as customers, suppliers, and locations. An agent browsing a catalog is only as good as the data it retrieves, so structured attributes and standardised taxonomies matter more than long unstructured descriptions.",
    aliases: ["PIM", "MDM", "master data management"],
  },
  {
    id: "schema",
    acronym: "Schema",
    name: "Schema / Ontology / Taxonomy",
    category: "Data & integration",
    definition: "The structure, vocabulary, and hierarchy that give data meaning.",
    detail:
      "A schema defines the shape of data: fields, types, constraints. A taxonomy organises concepts into a hierarchy. An ontology goes further and defines relationships between concepts. Structured, well-defined data is dramatically easier for a model to reason over than free text; Schema.org provides shared vocabularies for web content, and JSON-LD embeds them in HTML.",
    aliases: ["taxonomy", "ontology"],
  },
  {
    id: "pagination",
    acronym: "Pagination",
    name: "Paged Results",
    category: "Data & integration",
    definition:
      "Returning a large collection in smaller portions with a way to request the next portion.",
    detail:
      "A response includes a cursor or another continuation mechanism. Predictable ordering and stable item identifiers help agents work through results without omissions or duplicates, especially when the collection changes between requests.",
    aliases: ["pagination"],
    href: "/docs/api-surface/retrieval-and-job-contracts",
  },
  {
    id: "webhooks",
    acronym: "Webhooks",
    name: "Event Notifications",
    category: "Data & integration",
    definition: "HTTP messages a service sends when a subscribed event occurs.",
    detail:
      "For example, an order service can notify a client when a shipment leaves the warehouse. Receivers should verify the sender, handle duplicate deliveries, and recover from missed events. A webhook reports an event; the current record remains the source for its latest state.",
    aliases: ["webhook", "webhooks"],
    href: "/docs/api-surface/webhooks-events",
  },
  {
    id: "aeo",
    acronym: "AEO",
    name: "Answer Engine Optimization",
    category: "Agent readiness",
    definition: "Making content easier for answer engines to find, interpret, and cite.",
    detail:
      "Answer engine optimization concerns how search and AI answer systems retrieve and describe content: crawlable pages, clear facts, structured data, trustworthy sources. Agent readiness is broader; an agent may also need to sign in, perform actions, recover from errors, or pay, and visibility alone does not establish that those tasks work.",
    aliases: ["AEO", "answer engine optimization", "answer engine optimisation"],
    href: "/docs/discovery/aeo-checklist",
  },
  {
    id: "content-signals",
    acronym: "Content Signals",
    name: "Content-use Preferences",
    category: "Agent readiness",
    definition: "Declarations of whether content may be used for search, AI input, or training.",
    detail:
      "Crawler rules describe access to a page. Content Signals separately express permitted uses after retrieval through search, ai-input, and ai-train values. They communicate policy to systems that honour it; they do not enforce access controls or guarantee compliance.",
    aliases: ["Content Signals", "content signal"],
    href: "/docs/discovery/robots-txt#content-signals",
  },
  {
    id: "dns-aid",
    acronym: "DNS-AID",
    name: "DNS for AI Discovery",
    category: "Agent readiness",
    definition: "An emerging way to advertise agent services through a domain's DNS records.",
    detail:
      "DNS normally helps software locate servers. DNS-AID proposes records that also advertise agent services and their connection details, so a compatible client can discover services from a known domain. It remains an individual Internet-Draft, and publishing records does not grant access or prove the service works.",
    aliases: ["DNS-AID"],
    href: "/docs/discovery/dns-discovery",
  },
  {
    id: "llms-txt",
    acronym: "llms.txt",
    name: "llms.txt",
    category: "Agent readiness",
    definition: "A Markdown index that points agents to a site's important documentation.",
    detail:
      "A site can publish llms.txt at its root with a short introduction and links to relevant pages. It helps clients that read this convention find focused documentation. It does not set crawler permissions or guarantee search rankings, citations, or adoption by every agent.",
    aliases: ["llms.txt"],
    href: "/docs/discovery/llms-txt",
  },
  {
    id: "grounding",
    acronym: "Ground",
    name: "Grounding",
    category: "Agent readiness",
    definition: "Anchoring LLM outputs to verified, up-to-date source material.",
    detail:
      "An ungrounded LLM reasons from its training weights, which may be stale, biased, or simply wrong for a given domain. Grounding connects model outputs to external truth sources: a product database, a live API, a document store. RAG is the most common grounding technique, and it is why agents with tool access are more reliable than standalone models for factual tasks; they can verify claims against live data rather than recalling from memory.",
    aliases: ["grounding", "grounded"],
  },
  {
    id: "json-ld",
    acronym: "JSON-LD",
    name: "JavaScript Object Notation for Linked Data",
    category: "Agent readiness",
    definition: "Structured labels that describe what the information on a web page means.",
    detail:
      "A page can use JSON-LD and a shared vocabulary such as Schema.org to identify a product, its brand, its price, and the relationships between them. These labels help software interpret the page. They should match the visible facts and never invent ratings or reviews.",
    aliases: ["JSON-LD"],
    href: "/docs/discovery/structured-data",
  },
  {
    id: "robots-txt",
    acronym: "robots.txt",
    name: "Crawler Rules",
    category: "Agent readiness",
    definition: "A file that tells cooperating crawlers which URLs they may fetch.",
    detail:
      "Different rules can apply to search crawlers, training crawlers, and other automated visitors. robots.txt is a voluntary crawling convention, not access control: private information still needs authentication. Firewall rules can also block agents even when robots.txt allows them.",
    aliases: ["robots.txt"],
    href: "/docs/discovery/robots-txt",
  },
  {
    id: "markdown",
    acronym: "Markdown",
    name: "Markdown",
    category: "Agent readiness",
    definition: "A plain-text format for headings, links, lists, and other document structure.",
    detail:
      "Markdown keeps a document readable without most of a website's interface markup. A Markdown version can help an agent retrieve focused content, provided it preserves the original facts, links, and source information.",
    aliases: ["Markdown"],
    href: "/docs/discovery/content-negotiation",
  },
  {
    id: "content-negotiation",
    acronym: "Formats",
    name: "Content Negotiation",
    category: "Agent readiness",
    definition: "Letting a client request a particular representation of the same resource.",
    detail:
      "For example, a browser may request HTML while an agent requests Markdown through an HTTP Accept header. The server chooses a supported format and labels the response. Caches must distinguish these formats so a person does not unexpectedly receive raw Markdown.",
    aliases: ["content negotiation"],
    href: "/docs/discovery/content-negotiation",
  },
  {
    id: "agents-md",
    acronym: "AGENTS.md",
    name: "AGENTS.md",
    category: "Agent readiness",
    definition: "A cross-tool baseline file that tells a coding agent how to work in a repository.",
    detail:
      "AGENTS.md documents a project's conventions, commands, and boundaries in one place that most coding agents read by default. Tool-specific files such as CLAUDE.md or Cursor rules can layer overlays on top of it, but AGENTS.md is the file most repositories need and nothing else.",
    aliases: ["AGENTS.md"],
    href: "/docs/context-files/agents-md",
  },
  {
    id: "oauth",
    acronym: "OAuth",
    name: "Delegated Authorization",
    category: "Auth & identity",
    definition: "A way to give an application limited access without sharing a user's password.",
    detail:
      "A customer can approve access to selected capabilities, such as reading orders. The client then uses an access token when calling the API. The service must enforce the granted permissions, expiry, and account boundaries. OAuth grants access; it is not by itself a complete user identity protocol.",
    aliases: ["OAuth", "OAuth 2.0", "OAuth 2.1"],
    href: "/docs/authentication/oauth-for-agents",
  },
  {
    id: "pkce",
    acronym: "PKCE",
    name: "Proof Key for Code Exchange",
    category: "Auth & identity",
    definition: "A safeguard that binds an OAuth authorization request to its code exchange.",
    detail:
      "PKCE prevents authorization-code interception attacks by requiring the client to prove it holds a secret generated at the start of the flow when it later exchanges the code for a token. It is mandatory in OAuth 2.1, even for confidential clients, and is the standard choice for user-delegated MCP access alongside the Authorization Code grant.",
    aliases: ["PKCE", "Proof Key for Code Exchange"],
    href: "/docs/authentication/oauth-for-agents#authorization-code--pkce",
  },
  {
    id: "dcr",
    acronym: "DCR",
    name: "Dynamic Client Registration",
    category: "Auth & identity",
    definition: "A way for an OAuth client to register itself with a server automatically.",
    detail:
      "Rather than a developer manually registering an application in a dashboard, Dynamic Client Registration lets a client register itself with the authorization server at connection time and receive credentials programmatically. It matters for MCP clients, which often connect to servers they have not been registered with in advance.",
    aliases: ["DCR", "Dynamic Client Registration"],
    href: "/docs/authentication/mcp-auth-model",
  },
  {
    id: "scopes",
    acronym: "Scopes",
    name: "Permission Scopes",
    category: "Auth & identity",
    definition: "Named permissions that define what an access token is allowed to do.",
    detail:
      "A token might allow reading orders while forbidding refunds. The server must check those permissions on every protected operation and ensure the caller can access the requested account or record. A scope written in documentation provides no protection unless it is enforced.",
    aliases: ["scope", "scopes", "permission scope", "permission scopes"],
    href: "/docs/authentication/agent-identity",
  },
  {
    id: "auth-md",
    acronym: "auth.md",
    name: "Agent Registration Guidance",
    category: "Auth & identity",
    definition: "A published walkthrough of how an agent can register for a service.",
    detail:
      "The auth.md protocol connects readable setup instructions with metadata describing accepted identity methods and endpoints. An agent can discover how to register, obtain access, and involve the user when an account needs claiming. Advertised flows must exist and enforce normal authorization checks.",
    aliases: ["auth.md"],
    href: "/docs/authentication/auth-md",
  },
  {
    id: "web-bot-auth",
    acronym: "Bot Auth",
    name: "Web Bot Auth",
    category: "Auth & identity",
    definition: "Signed HTTP requests that help a website verify which bot sent them.",
    detail:
      "The sender signs a request and publishes verification keys. The receiving service checks the signature and applies its own access rules. Verifying a bot's identity does not give it permission to read a customer's private data or spend their money.",
    aliases: ["Web Bot Auth"],
    href: "/docs/authentication/agent-identity#web-bot-auth",
  },
  {
    id: "id-jag",
    acronym: "ID-JAG",
    name: "Identity Assertion JWT Authorization Grant",
    category: "Auth & identity",
    definition: "A signed identity assertion used to request access from another service.",
    detail:
      "A trusted issuer describes an identity in an audience-bound JWT. The receiving service verifies the assertion and decides what access may follow. In auth.md, the provider assertion goes to the identity endpoint; registration and the later token exchange are separate steps.",
    aliases: ["ID-JAG"],
    href: "/docs/authentication/auth-md",
  },
  {
    id: "idempotency",
    acronym: "Idempotency",
    name: "Safe Repeated Requests",
    category: "Ops & lifecycle",
    definition: "Making a repeated request have the same intended effect as a single request.",
    detail:
      "If an order request times out, the caller may not know whether it succeeded. An idempotency key lets the server recognize the retry and return the earlier outcome instead of placing a second order. The API must document how long keys remain valid and how changed inputs are handled.",
    aliases: ["idempotency", "idempotency key", "idempotency keys", "idempotent"],
    href: "/docs/error-handling/idempotency",
  },
  {
    id: "rfc-9457",
    acronym: "Problem Details",
    name: "RFC 9457 Problem Details",
    category: "Ops & lifecycle",
    definition: "The current standard for structured HTTP error responses that agents can parse.",
    detail:
      "RFC 9457 standardises an error response shape with five core fields: type (a stable URI), title, status, detail, and instance. An agent should branch on type, never on title or detail, since those are meant for people. Extensions such as is_retriable, retry_after_ms, suggestions, and trace_id let a server give an agent enough to recover automatically.",
    aliases: ["RFC 9457", "Problem Details", "problem details"],
    href: "/docs/error-handling/rfc-9457",
  },
  {
    id: "ucp",
    acronym: "UCP",
    name: "Universal Commerce Protocol",
    category: "Payments",
    definition: "A protocol for connecting agent platforms with merchant commerce capabilities.",
    detail:
      "UCP describes capabilities such as checkout, identity linking, and order management. It lets compatible systems exchange purchase information through defined contracts. A merchant still needs supported payment integrations and must enforce its business rules and the buyer's authority.",
    aliases: ["UCP", "Universal Commerce Protocol"],
    href: "/docs/agentic-commerce/checkout-protocols",
  },
  {
    id: "acp",
    acronym: "ACP",
    name: "Agentic Commerce Protocol",
    category: "Payments",
    definition: "A protocol for agent-assisted checkout and related commerce operations.",
    detail:
      "ACP provides defined interfaces for preparing and completing purchases with a merchant. The integration must handle totals, customer approval, payment, and order results. Use the version and binding supported by the actual agent client and payment provider.",
    aliases: ["ACP", "Agentic Commerce Protocol"],
    href: "/docs/agentic-commerce/checkout-protocols",
  },
  {
    id: "ap2",
    acronym: "AP2",
    name: "Agent Payments Protocol",
    category: "Payments",
    definition: "A protocol for expressing and verifying authorization in agent-led payments.",
    detail:
      "AP2 uses signed mandates to record purchase intent and authorization. Participants verify the evidence required by their payment flow. A signed mandate, a completed payment, and delivery of the purchased item are separate facts.",
    aliases: ["AP2", "Agent Payments Protocol"],
    href: "/docs/agentic-commerce/payments",
  },
  {
    id: "payment-mandate",
    acronym: "Mandate",
    name: "Payment Mandate",
    category: "Payments",
    definition: "A record of what someone has authorized an agent to buy or spend.",
    detail:
      "A mandate can bind permission to an amount, merchant, purpose, or expiry, depending on the protocol. The receiving system verifies that permission before proceeding. An agent preparing a cart does not itself establish authority to pay.",
    aliases: ["payment mandate", "payment mandates"],
    href: "/docs/agentic-commerce/payments",
  },
  {
    id: "mpp",
    acronym: "MPP",
    name: "Machine Payments Protocol",
    category: "Payments",
    definition: "An HTTP payment protocol for paid resources such as API calls and content.",
    detail:
      "A server presents a payment challenge, the client responds with a payment credential, and the server verifies it before supplying the resource. Price, spending limits, receipts, and recovery after failed delivery all need defined behavior.",
    aliases: ["MPP", "Machine Payments Protocol"],
    href: "/docs/agentic-commerce/payments",
  },
  {
    id: "x402",
    acronym: "x402",
    name: "HTTP Payment Protocol",
    category: "Payments",
    definition: "A protocol that uses HTTP 402 responses to request payment for a resource.",
    detail:
      "The response tells a compatible client what payment is required. The client provides payment information, which is verified under the supported scheme before access is granted. Check the payment network, asset, settlement process, and retry behavior required by the integration.",
    aliases: ["x402"],
    href: "/docs/agentic-commerce/payments",
  },
  {
    id: "dpop",
    acronym: "DPoP",
    name: "Demonstrating Proof of Possession",
    category: "Auth & identity",
    definition:
      "A mechanism that binds an access token to the client holding a private key, so a stolen token alone is not enough to use it.",
    detail:
      "The client signs a proof for each request with a key it holds; the server validates the proof against the token before accepting it. This stops a leaked bearer token from being replayed by an attacker who does not hold the matching key. DPoP is independent of MCP but is the concrete piece of the emerging agent workload-identity work that is ready to implement today.",
    aliases: ["DPoP", "Demonstrating Proof of Possession", "DPoP proof", "DPoP proofs"],
    href: "/docs/authentication/dpop",
  },
  {
    id: "jwt",
    acronym: "JWT",
    name: "JSON Web Token",
    category: "Auth & identity",
    definition:
      "A signed, compact token format used to carry claims such as identity and permissions between parties.",
    detail:
      "A JWT has a header, a payload of claims, and a signature, and a receiving service validates the signature and checks claims such as issuer, audience, and expiry before trusting it. Agents encounter JWTs as OAuth access tokens, identity assertions, and delegation grants; validating them correctly, not just decoding them, is what prevents a forged or stale token being accepted.",
    aliases: ["JWT", "JWTs", "JSON Web Token"],
    href: "/docs/authentication/oauth-for-agents#jwt-validation",
  },
  {
    id: "jwks",
    acronym: "JWKS",
    name: "JSON Web Key Set",
    category: "Auth & identity",
    definition: "A published set of public keys a service uses to verify signed tokens.",
    detail:
      "A JWKS endpoint lets a relying party fetch the current signing keys for an issuer rather than hardcoding them, so keys can rotate without breaking verification. Protected Resource Metadata and agent identity documents typically point to a JWKS URL alongside the issuer.",
    aliases: ["JWKS", "JSON Web Key Set"],
    href: "/docs/authentication/protected-resource-metadata",
  },
  {
    id: "oidc",
    acronym: "OIDC",
    name: "OpenID Connect",
    category: "Auth & identity",
    definition:
      "An identity layer built on top of OAuth that adds a standard way to authenticate a user, not just authorize access.",
    detail:
      "Where OAuth grants scoped access to resources, OIDC adds an ID token that asserts who the user is. Agent systems that need to know which human is behind a request, rather than only what that request is allowed to do, layer OIDC on top of the OAuth flow they already use.",
    aliases: ["OIDC", "OpenID Connect"],
  },
  {
    id: "token-exchange",
    acronym: "Token Exchange",
    name: "Token Exchange",
    category: "Auth & identity",
    definition:
      "An OAuth extension that lets a service trade one token for another with a narrower or different scope.",
    detail:
      "Token exchange (RFC 8693) is how a sub-agent gets a scoped-down token for a delegated task, or how a service acts on behalf of a user without holding the user's original credential. The exchanged token can carry an actor chain, so a downstream service can see both the original caller and the service acting on its behalf.",
    aliases: ["token exchange", "Token Exchange"],
    href: "/docs/authentication/token-exchange",
  },
  {
    id: "obo",
    acronym: "OBO",
    name: "On-Behalf-Of Delegation",
    category: "Auth & identity",
    definition:
      "A token exchange pattern where a service acts for a specific user rather than as itself.",
    detail:
      "An on-behalf-of token carries both the calling service's identity and the user it is acting for, so a downstream API can enforce the user's permissions rather than the service's broader ones. It is the shape token exchange takes when a human, not another agent, is the party being delegated for.",
    aliases: ["On-Behalf-Of", "on-behalf-of"],
    href: "/docs/authentication/token-exchange#use-case-user-delegation-on-behalf-of",
  },
  {
    id: "prm",
    acronym: "PRM",
    name: "Protected Resource Metadata",
    category: "Auth & identity",
    definition:
      "An OAuth metadata document that tells a client which authorization server, scopes, and rules apply to a protected API.",
    detail:
      "Protected Resource Metadata (RFC 9728) is published at a well-known location so an agent can discover how to get a token before calling an API, rather than being told out of band. MCP servers use it as the standard way to point clients at their authorization server.",
    aliases: ["Protected Resource Metadata", "PRM"],
    href: "/docs/authentication/protected-resource-metadata",
  },
  {
    id: "cimd",
    acronym: "CIMD",
    name: "Client ID Metadata Document",
    category: "Auth & identity",
    definition:
      "An OAuth client registration mechanism where a client's identity is a URL pointing to a metadata document, rather than a pre-registered ID.",
    detail:
      "A Client ID Metadata Document lets a client and authorization server work together without a prior relationship, since the client ID itself resolves to the client's registered details. It is the OAuth working group's recommended replacement for dynamic client registration, which is deprecated in the current MCP specification.",
    aliases: ["Client ID Metadata Document", "Client ID Metadata Documents", "CIMD"],
    href: "/docs/authentication/mcp-auth-model#client-id-metadata-documents",
  },
  {
    id: "workload-identity",
    acronym: "Workload Identity",
    name: "Workload Identity",
    category: "Auth & identity",
    definition:
      "A credential that proves what an agent is running as, distinct from the human who authorized it.",
    detail:
      "Web Bot Auth and OAuth answer who sent a request or who authorized it; workload identity answers what process is making the call and how it proves that to another service. This is still a forming line of standards work built on the ID-JAG grant, and is not yet ready to build against.",
    aliases: ["Workload Identity", "workload identity", "Workload Identity Federation"],
    href: "/docs/authentication/agent-identity#workload-identity-for-agents",
  },
  {
    id: "wimse",
    acronym: "WIMSE",
    name: "Workload Identity in Multi-Service Environments",
    category: "Auth & identity",
    definition:
      "An IETF working group defining how workloads prove their identity to each other within a trust domain.",
    detail:
      "WIMSE covers how a process obtains and presents identity credentials, such as X.509 certificates or JWTs, to authenticate to other services. A related, separate draft applies these ideas specifically to AI agents, but it remains an individual submission with no working-group standing.",
    aliases: ["WIMSE"],
    href: "/docs/authentication/agent-identity#workload-identity-for-agents",
  },
  {
    id: "m2m",
    acronym: "M2M",
    name: "Machine-to-Machine Authorization",
    category: "Auth & identity",
    definition:
      "An OAuth flow for a service acting as itself, with no human present to approve access.",
    detail:
      "The Client Credentials grant is the standard M2M flow: a service authenticates directly with its own credentials and receives a token scoped to its own permissions. It is distinct from user-delegated flows such as Authorization Code with PKCE, which exist because a human is present to consent.",
    aliases: ["M2M", "machine-to-machine"],
    href: "/docs/authentication/oauth-for-agents",
  },
  {
    id: "replay-protection",
    acronym: "Replay Protection",
    name: "Replay Protection",
    category: "Auth & identity",
    definition:
      "Defences that stop a captured request from being resubmitted and accepted a second time.",
    detail:
      "A DPoP proof carries a unique identifier (a JTI) and a timestamp that a server checks against ones it has already seen, so a copied request fails even if the underlying token is still valid. Combined with idempotency keys, replay protection covers both a malicious resubmission and an accidental client retry.",
    aliases: ["replay protection", "DPoP JTI"],
    href: "/docs/authentication/idempotency-and-replay#replay-protection-via-dpop-jti",
  },
  {
    id: "did",
    acronym: "DID",
    name: "Decentralized Identifier",
    category: "Auth & identity",
    definition:
      "A self-sovereign identifier that resolves to keys and endpoints without a central registry.",
    detail:
      "A DID lets an agent prove who it is and establish an encrypted channel by resolving the identifier itself, rather than looking it up in a company-run directory. It underpins draft peer-to-peer agent protocols such as ANP, which use DID-based identity in place of a shared platform account.",
    aliases: ["DID", "DIDs", "Decentralized Identifier"],
    href: "/docs/protocols/comparison",
  },
  {
    id: "ard",
    acronym: "ARD",
    name: "Agentic Resource Discovery",
    category: "Agent readiness",
    definition:
      "A specification for advertising where a site's agent-facing discovery document lives.",
    detail:
      "ARD defines an Agentmap directive in robots.txt, an HTML link tag, and a DNS service binding as the ways to point at a discovery document, published at /.well-known/ard.json. It keeps the predecessor AI Catalog path as an optional fallback, but a consumer only needs to check that fallback if it also targets the older format.",
    aliases: ["ARD", "Agentic Resource Discovery"],
    href: "/docs/discovery/catalogs-and-feeds#ard-and-ai-catalog",
  },
  {
    id: "ai-catalog",
    acronym: "AI Catalog",
    name: "AI Catalog",
    category: "Agent readiness",
    definition:
      "An earlier, separate specification for advertising a site's agent discovery document at /.well-known/ai-catalog.json.",
    detail:
      "AI Catalog predates ARD and uses its own path and link relation. ARD's current specification keeps this path as an optional fallback a consumer may additionally consult, so publish it only if you also want to support AI Catalog-native consumers directly.",
    aliases: ["AI Catalog"],
    href: "/docs/discovery/catalogs-and-feeds#ard-and-ai-catalog",
  },
  {
    id: "nlweb",
    acronym: "NLWeb",
    name: "NLWeb",
    category: "Agent readiness",
    definition:
      "A server-side protocol for exposing structured content through natural-language query endpoints.",
    detail:
      "NLWeb's reference implementation answers natural-language queries with structured results and source URLs, as a server-side retrieval surface. It serves a different execution context to WebMCP, which exposes tools inside a browser page rather than through a server endpoint.",
    aliases: ["NLWeb"],
    href: "/docs/discovery/catalogs-and-feeds#nlweb-feeds-and-query-endpoints",
  },
  {
    id: "rsl",
    acronym: "RSL",
    name: "Really Simple Licensing",
    category: "Agent readiness",
    definition:
      "A ratified standard for attaching machine-readable licence terms, including price, to content.",
    detail:
      "RSL lets a publisher state pay-per-crawl, subscription, pay-per-inference, attribution, or free-use terms via robots.txt, an HTTP header, an HTML tag, an RSS feed, or a media file. Reach for RSL when Content Signals' plain yes/no preference isn't enough and you need to state a price or a specific licence condition.",
    aliases: ["RSL", "Really Simple Licensing"],
    href: "/docs/discovery/robots-txt#rsl-and-the-ietf-aipref-drafts",
  },
  {
    id: "well-known",
    acronym: ".well-known",
    name: "Well-Known URI",
    category: "Agent readiness",
    definition: "A standard URL path prefix reserved for machine-readable metadata about a site.",
    detail:
      "RFC 8615 reserves /.well-known/ so unrelated discovery documents, such as an API catalog, OAuth metadata, or an agent card, can live at predictable, non-colliding locations without a site inventing its own convention. Most agent discovery mechanisms in this guide publish under it.",
    aliases: [".well-known", "well-known URI", "well-known endpoint", "well-known endpoints"],
    href: "/docs/discovery/well-known-endpoints",
  },
  {
    id: "sitemap",
    acronym: "Sitemap",
    name: "XML Sitemap",
    category: "Agent readiness",
    definition:
      "An XML file listing a site's URLs so crawlers can discover pages without following every link.",
    detail:
      "A sitemap describes every URL a publisher wants crawled, unlike llms.txt, which curates only the most important pages for an agent's limited context. The two serve different consumers and are not substitutes for each other.",
    aliases: ["sitemap", "sitemaps", "sitemap.xml", "XML sitemap"],
    href: "/docs/discovery/content-structure#sitemap-optimization",
  },
  {
    id: "freshness",
    acronym: "Freshness",
    name: "Content Freshness",
    category: "Agent readiness",
    definition: "Machine-readable signals showing when content was published or last verified.",
    detail:
      "A visible last-updated date is not machine-readable on its own; an agent needs a structured date field or header it can parse to decide whether to trust or re-fetch a page. This is distinct from page-level freshness signals such as HTTP caching headers, which describe delivery, not editorial accuracy.",
    aliases: ["freshness", "content freshness"],
    href: "/docs/retrievability/freshness-and-provenance#freshness",
  },
  {
    id: "provenance",
    acronym: "Provenance",
    name: "Content Provenance",
    category: "Agent readiness",
    definition:
      "Machine-readable attribution showing where a piece of content came from and who is accountable for it.",
    detail:
      "Provenance data lets an agent cite a source and a reader trace a claim back to its origin, which matters most for content that will be quoted or acted on. It is usually expressed alongside freshness data so an agent can judge both how current and how trustworthy a source is.",
    aliases: ["provenance", "content provenance"],
    href: "/docs/retrievability/freshness-and-provenance#provenance",
  },
  {
    id: "agent-card",
    acronym: "AgentCard",
    name: "AgentCard",
    category: "Agent infrastructure",
    definition:
      "A JSON document an A2A agent publishes at a well-known URL describing its identity and capabilities.",
    detail:
      "Before delegating a task, a peer agent fetches the target's AgentCard to learn its capabilities, authentication requirements, and endpoint, the way an OpenAPI document describes a conventional API. It is A2A's discovery mechanism and works across organizational boundaries without pre-shared secrets.",
    aliases: ["AgentCard", "agent-card.json"],
    href: "/docs/protocols/a2a#agentcard-structure",
  },
  {
    id: "aaif",
    acronym: "AAIF",
    name: "Agentic AI Foundation",
    category: "Agent infrastructure",
    definition: "The Linux Foundation body that now governs MCP, A2A, and related agent protocols.",
    detail:
      "MCP and A2A were both donated by their original vendors to the Linux Foundation and now sit under the AAIF alongside sibling projects, rather than under any single company. That shifts stewardship to a vendor-neutral steering process, though it does not by itself change either protocol's technical content.",
    aliases: ["AAIF", "Agentic AI Foundation"],
    href: "/docs/protocols/mcp#origin-and-governance",
  },
  {
    id: "anp",
    acronym: "ANP",
    name: "Agent Network Protocol",
    category: "Agent infrastructure",
    definition:
      "A draft protocol for peer-to-peer agent identity and communication using decentralized identifiers.",
    detail:
      "ANP proposes self-sovereign agent identity via DIDs and end-to-end encrypted, agent-to-agent messaging without a shared platform. It remains a draft and is one to watch rather than depend on.",
    aliases: ["ANP", "Agent Network Protocol"],
    href: "/docs/protocols/comparison",
  },
  {
    id: "oasf",
    acronym: "OASF",
    name: "Open Agent Schema Framework",
    category: "Agent infrastructure",
    definition:
      "A normalized schema for describing agent and tool capabilities, aimed at package-registry-style discovery.",
    detail:
      "OASF is AGNTCY's discovery component: it standardizes how an agent or tool describes what it does, so a consumer can search by capability rather than by publisher. The schemas have not converged on a stable version and the surrounding registry tooling is still nascent.",
    aliases: ["OASF", "Open Agent Schema Framework"],
    href: "/docs/protocols/emerging-standards",
  },
  {
    id: "agntcy",
    acronym: "AGNTCY",
    name: "AGNTCY",
    category: "Agent infrastructure",
    definition:
      "A Linux Foundation project building shared cross-organization infrastructure for agent discovery, identity, messaging, and observability.",
    detail:
      "Donated by Cisco in 2025 and backed by Cisco, Dell, Google Cloud, Oracle, and Red Hat among others, AGNTCY's discovery component is OASF. It is infrastructure to watch rather than a finished, stable dependency to build on today.",
    aliases: ["AGNTCY"],
    href: "/docs/protocols/emerging-standards",
  },
  {
    id: "sep",
    acronym: "SEP",
    name: "MCP Spec Enhancement Proposal",
    category: "Agent infrastructure",
    definition:
      "The formal change-proposal process the MCP steering group uses to evolve the specification.",
    detail:
      "Each significant change to MCP, such as removing protocol-level sessions or adding MCP Apps, ships as a numbered SEP that the community can reference. Citing a SEP number pins a claim to a specific, reviewable change rather than a vague description of new behaviour.",
    aliases: ["SEP", "Spec Enhancement Proposal"],
    href: "/docs/protocols/mcp",
  },
  {
    id: "arazzo",
    acronym: "Arazzo",
    name: "Arazzo",
    category: "Data & integration",
    definition: "An OpenAPI Initiative specification for describing multi-step API workflows.",
    detail:
      "Where OpenAPI describes individual operations, Arazzo sequences several of them into a workflow, with control flow and data passed between steps. It complements MCP by giving a tool-building layer a machine-readable description of a multi-call process, rather than requiring an agent to infer the sequence from separate operation docs.",
    aliases: ["Arazzo"],
    href: "/docs/api-surface/arazzo-workflows",
  },
  {
    id: "tool-annotations",
    acronym: "Annotations",
    name: "MCP Tool Annotations",
    category: "Agent infrastructure",
    definition:
      "Metadata hints on an MCP tool describing whether it reads, writes, or has other side effects.",
    detail:
      "The four standard hints (read-only, destructive, idempotent, open-world) tell a client and a human reviewer what a tool call might do before it runs, so an agent can gate risky calls behind approval. Annotations are hints, not enforced contracts, and clients should default to the worst case when a tool omits them.",
    aliases: ["tool annotations", "MCP annotations", "the four hints"],
    href: "/docs/mcp-servers/annotations#the-four-hints",
  },
  {
    id: "capability-declaration",
    acronym: "Capabilities",
    name: "Capability Declaration",
    category: "Agent infrastructure",
    definition:
      "The part of a protocol handshake where a client and server each state which optional features they support.",
    detail:
      "MCP clients and servers declare capabilities such as sampling, resource subscriptions, or elicitation during initialization, so neither side calls a feature the other doesn't implement. Getting this declaration right avoids silent failures where a client assumes support that was never advertised.",
    aliases: ["capability declaration"],
    href: "/docs/protocols/mcp#capability-declaration",
  },
  {
    id: "llm-as-judge",
    acronym: "LLM-as-Judge",
    name: "LLM-as-Judge",
    category: "Ops & lifecycle",
    definition:
      "Using a model to grade another model's output against criteria a rule-based check can't express.",
    detail:
      "Model-based grading suits outputs like open-ended summaries or tone, which a fixed answer can't score, but it carries documented biases such as favouring longer or earlier-listed answers. The grading model should differ from, and ideally be stronger than, the model being evaluated to avoid the two rating each other's blind spots the same way.",
    aliases: ["LLM-as-judge", "LLM-as-a-judge", "model-based grading"],
    href: "/docs/testing/llm-as-judge",
  },
  {
    id: "red-teaming",
    acronym: "Red-Teaming",
    name: "Red-Teaming",
    category: "Ops & lifecycle",
    definition:
      "Deliberately attacking an agent system before launch to find where it can be manipulated.",
    detail:
      "Red-teaming tests prompt injection, jailbreaks, and other adversarial inputs against an agent, distinct from runtime guardrails, which defend production traffic after launch. Continuous red-teaming in CI catches regressions a one-off pre-launch pass would miss.",
    aliases: ["red-teaming", "red team", "red-team"],
    href: "/docs/testing/red-teaming",
  },
  {
    id: "failure-mode-taxonomy",
    acronym: "Taxonomy",
    name: "Failure-Mode Taxonomy",
    category: "Ops & lifecycle",
    definition:
      "A named set of categories for why an agent fails, tracked as a first-class artifact.",
    detail:
      "Rather than treating failed eval cases as an undifferentiated pile, a failure-mode taxonomy classifies each one against categories such as extraction, reasoning, or rule application - so the classification itself becomes the input to prioritizing what to fix next, not a byproduct of triage.",
    aliases: ["failure-mode taxonomy", "failure mode taxonomy"],
    href: "/docs/testing/evaluation-framework#failure-mode-taxonomy",
  },
  {
    id: "owasp-llm-top-10",
    acronym: "OWASP LLM Top 10",
    name: "OWASP Top 10 for LLM Applications",
    category: "Ops & lifecycle",
    definition: "A ranked list of the most common security risks in LLM-powered applications.",
    detail:
      "Maintained by OWASP, it covers risks such as prompt injection, insecure output handling, and excessive agency, giving red-teaming and guardrail work a shared checklist to map coverage against rather than inventing categories from scratch.",
    aliases: ["OWASP LLM Top 10", "OWASP Top 10 for LLM Applications"],
    href: "/docs/testing/red-teaming#owasp-llm-top-10-mapping",
  },
  {
    id: "shadow-evaluation",
    acronym: "Shadow Eval",
    name: "Shadow Evaluation",
    category: "Ops & lifecycle",
    definition:
      "Running a new model or prompt version against live traffic without letting its output reach users.",
    detail:
      "A shadow evaluation compares the candidate's responses to the current production version on real, not synthetic, inputs, surfacing regressions a fixed test set would miss. Because nothing the candidate produces is shown to a user, it carries none of the risk of a live A/B test.",
    aliases: ["shadow evaluation", "shadow eval"],
    href: "/docs/testing/ci-integration#shadow-evaluation",
  },
  {
    id: "pass-at-k",
    acronym: "pass@k",
    name: "Pass at k",
    category: "Ops & lifecycle",
    definition:
      "A metric measuring the chance an agent succeeds at least once across k independent attempts.",
    detail:
      "Where a single pass/fail run hides how consistent an agent is, pass@k runs the same task k times and reports the success rate, exposing flaky behaviour a one-shot eval would miss. It matters most for tasks with non-deterministic model output, where a single failing run may not reflect the agent's real reliability.",
    aliases: ["pass@k", "pass-at-k"],
    href: "/docs/testing/vitest-harness#measuring-passk-locally",
  },
  {
    id: "eval-driven-development",
    acronym: "EDD",
    name: "Eval-Driven Development",
    category: "Ops & lifecycle",
    definition:
      "Writing evals for an agent behaviour before implementing it, the eval equivalent of test-driven development.",
    detail:
      "A failing eval defines the target behaviour up front, and the agent is built or the prompt iterated until it passes, the same discipline TDD applies to conventional code. It works best on capability evals with a clear pass bar, less well on open-ended behaviour where the target itself is still being discovered.",
    aliases: ["eval-driven development", "Eval-Driven Development"],
    href: "/docs/testing/evaluation-framework#eval-driven-development",
  },
  {
    id: "cuj",
    acronym: "CUJ",
    name: "Critical User Journey",
    category: "Ops & lifecycle",
    definition:
      "A workflow an agent should be able to complete end-to-end, used as the unit of regression testing for API changes.",
    detail:
      "Before changing an operation description or schema, test whether the change regresses existing CUJs rather than only checking the API still returns a valid response. A CUJ regression is a behaviour break even when nothing about the underlying operation's correctness changed.",
    aliases: ["CUJ", "CUJs", "critical user journey", "critical user journeys"],
    href: "/docs/api-surface/api-versioning#testing-cujs-against-description-changes",
  },
  {
    id: "subagent",
    acronym: "Subagent",
    name: "Subagent",
    category: "Agent infrastructure",
    definition:
      "A separate agent invoked by a parent agent to handle a bounded piece of a larger task.",
    detail:
      "A subagent runs with its own context and tools, then returns a result to the parent rather than sharing the parent's full conversation history. UIs that surface agent activity need to show subagent work distinctly, since collapsing it into the parent's stream hides which agent actually did what.",
    aliases: ["subagent", "subagents", "sub-agent"],
    href: "/docs/agentic-ui/session-control#subagent-surfacing",
  },
  {
    id: "working-memory",
    acronym: "Working Memory",
    name: "Working Memory",
    category: "Memory & knowledge",
    definition:
      "The state an agent keeps for the duration of a single task, discarded once it completes.",
    detail:
      "Working memory holds intermediate results, current plan, and scratch state for the task at hand, distinct from message history, which is the raw conversation, and semantic recall, which persists across sessions. Modelling it explicitly, rather than letting it live only in prompt text, makes an agent's reasoning easier to inspect and resume.",
    aliases: ["working memory"],
    href: "/docs/agents/memory#working-memory",
  },
  {
    id: "semantic-recall",
    acronym: "Semantic Recall",
    name: "Semantic Recall",
    category: "Memory & knowledge",
    definition:
      "Retrieving relevant facts or past interactions by meaning rather than by exact match, usually via embeddings.",
    detail:
      "Semantic recall lets an agent pull in a fact or a past conversation that's relevant to the current task without the user restating it, the same mechanism RAG uses for documents applied to an agent's own memory. It's what separates an agent that remembers a user's stated preference from one that starts fresh every session.",
    aliases: ["semantic recall"],
    href: "/docs/agents/memory#semantic-recall",
  },
  {
    id: "context-rot",
    acronym: "Context Rot",
    name: "Context Rot",
    category: "Memory & knowledge",
    definition:
      "Output quality falling as context grows, well before the model's advertised limit.",
    detail:
      "Context rot is measurable degradation, not a hard cutoff at the context window's stated size - a model can get noticeably worse partway through a window that technically still has room. It's one of five named context failure modes alongside poisoning, distraction, confusion, and clash, and it motivates keeping context lean by design rather than trusting the window's advertised size.",
    aliases: ["context rot"],
    href: "/docs/agents/memory#context-failure-modes",
  },
  {
    id: "context-poisoning",
    acronym: "Context Poisoning",
    name: "Context Poisoning",
    category: "Memory & knowledge",
    definition: "An error that enters context and gets treated as true for the rest of the run.",
    detail:
      "Once a wrong fact or a hallucinated result lands in context, the model tends to build on it rather than question it, compounding into further wrong steps. It's one of five named context failure modes covered under memory - the others are distraction, confusion, clash, and rot.",
    aliases: ["context poisoning"],
    href: "/docs/agents/memory#context-failure-modes",
  },
  {
    id: "observational-memory",
    acronym: "Observational Memory",
    name: "Observational Memory",
    category: "Memory & knowledge",
    definition:
      "Facts an agent records about a user or environment by watching behaviour, not by being told directly.",
    detail:
      "Where semantic recall stores what was said, observational memory stores what was noticed: patterns in how a user works, corrections they made, or choices they repeated. It needs the same accuracy discipline as any other stored fact, since a wrong inference compounds every time the agent acts on it.",
    aliases: ["observational memory"],
    href: "/docs/agents/memory#observational-memory",
  },
  {
    id: "procedural-memory",
    acronym: "Procedural Memory",
    name: "Procedural Memory",
    category: "Memory & knowledge",
    definition:
      "Learned steps for doing a recurring task, stored so the agent doesn't re-derive them each time.",
    detail:
      "Procedural memory is closer to a saved skill or runbook than a fact: once an agent has worked out the right sequence of tool calls for a task, storing that sequence lets it skip the trial and error next time. It's the agent-memory analogue of a cached plan rather than a cached answer.",
    aliases: ["procedural memory"],
    href: "/docs/agents/memory#procedural-memory",
  },
  {
    id: "message-history",
    acronym: "Message History",
    name: "Message History",
    category: "Memory & knowledge",
    definition:
      "The raw sequence of messages exchanged in a conversation, the simplest form of agent memory.",
    detail:
      "Message history is what fills the context window by default: every user message, assistant reply, and tool call and result, in order. It's necessary but not sufficient for a capable agent, since it grows unbounded and doesn't survive past the context window without summarization or another memory type carrying the durable parts forward.",
    aliases: ["message history"],
    href: "/docs/agents/memory#message-history",
  },
  {
    id: "fan-out-fan-in",
    acronym: "Fan-Out/Fan-In",
    name: "Fan-Out / Fan-In",
    category: "Agent infrastructure",
    definition:
      "An orchestration pattern that runs several agents concurrently, then combines their results.",
    detail:
      "Fan-out dispatches the same or related work to multiple agents in parallel; fan-in waits for and merges what comes back. It suits tasks that decompose into independent pieces, such as researching several sources at once, where a sequential loop would just add latency without adding correctness.",
    aliases: ["fan-out", "fan-in", "fan-out/fan-in", "fan-out / fan-in"],
    href: "/docs/agents/orchestration#concurrent-fan-out--fan-in",
  },
  {
    id: "handoff",
    acronym: "Handoff",
    name: "Handoff (Routing)",
    category: "Agent infrastructure",
    definition:
      "An orchestration pattern where one agent transfers a task to another better suited to handle it.",
    detail:
      "A handoff passes control and context to a different agent, rather than the first agent staying in the loop and delegating a sub-task. It suits systems with clearly separable specialisms, such as routing a billing question away from a general support agent.",
    aliases: ["handoff", "handoffs"],
    href: "/docs/agents/orchestration#handoff-routing",
  },
  {
    id: "supervisor-pattern",
    acronym: "Supervisor",
    name: "Supervisor Pattern",
    category: "Agent infrastructure",
    definition:
      "An orchestration pattern where one agent plans and delegates work to others but doesn't do the work itself.",
    detail:
      "A supervisor agent breaks a task into pieces, assigns them to worker agents, and assembles the results, staying in control of sequencing throughout. It differs from a handoff in that the supervisor keeps the task rather than transferring it away.",
    aliases: ["supervisor pattern", "supervisor agent"],
    href: "/docs/agents/orchestration#supervisor",
  },
  {
    id: "council-pattern",
    acronym: "Council",
    name: "Council Pattern",
    category: "Agent infrastructure",
    definition:
      "An orchestration pattern where several agents independently answer the same question and a result is chosen from among them.",
    detail:
      "Running the same task through multiple agents, or the same agent multiple times, and comparing or voting on the outputs trades extra cost for higher confidence on a single answer. It suits high-stakes decisions where the cost of the extra calls is justified by the cost of getting the decision wrong.",
    aliases: ["council pattern", "council of agents"],
    href: "/docs/agents/orchestration#council",
  },
  {
    id: "swarm-pattern",
    acronym: "Swarm",
    name: "Swarm (Peer-to-Peer Handoff)",
    category: "Agent infrastructure",
    definition:
      "An orchestration pattern where agents hand tasks directly to each other with no central supervisor.",
    detail:
      "Instead of a supervisor routing work, agents in a swarm pass a task peer-to-peer based on which one is best placed to continue it. It removes the supervisor as a bottleneck but makes the overall flow harder to trace, since there's no single place that shows the whole plan.",
    aliases: ["swarm pattern", "swarm"],
    href: "/docs/agents/orchestration#swarm-peer-to-peer-handoff",
  },
  {
    id: "model-routing",
    acronym: "Model Routing",
    name: "Model Routing",
    category: "Agent infrastructure",
    definition:
      "Sending different steps of an agent loop to different models based on cost, speed, or capability needs.",
    detail:
      "A cheap, fast model can handle simple classification or extraction steps while a stronger model is reserved for the steps that need real reasoning, cutting cost without lowering quality where it matters. This is a routing decision made by the orchestrator, not a property of any single model call.",
    aliases: ["model routing"],
    href: "/docs/agents/frameworks#model-routing",
  },
  {
    id: "dynamic-agent",
    acronym: "Dynamic Agent",
    name: "Dynamic Agent (Runtime Configuration)",
    category: "Agent infrastructure",
    definition:
      "An agent whose tool set, memory recall depth, and model choice are resolved from runtime context instead of hard-coded per segment.",
    detail:
      "Resolving configuration - not just prompt text - from context such as user role or plan tier at request time avoids maintaining a separate near-duplicate agent per segment, which tends to drift as each copy is patched independently. The trade-off is predictability: a statically configured agent behaves the same for everyone, which is easier to test and explain, while a dynamically configured one can behave differently for two users on the same request.",
    aliases: ["dynamic agent", "dynamic agent configuration", "runtime configuration"],
    href: "/docs/agents/prompts-and-configuration#dynamic-agent-configuration",
  },
  {
    id: "mid-run-steering",
    acronym: "Mid-Run Steering",
    name: "Mid-Run Steering",
    category: "Agent infrastructure",
    definition:
      "Letting a user redirect or correct an agent while it's still working, rather than only before or after a run.",
    detail:
      "Without mid-run steering, a user who spots a mistake has to wait for the run to finish, or kill it and start over, losing whatever the agent had already done correctly. Supporting it well means the agent can accept new input mid-loop without losing track of the state it had already built up.",
    aliases: ["mid-run steering"],
    href: "/docs/agentic-ui/session-control#mid-run-steering",
  },
  {
    id: "code-execution-mode",
    acronym: "Code Mode",
    name: "Code Execution Mode",
    category: "Agent infrastructure",
    definition:
      "Having an agent write and run code against a set of APIs, instead of calling each API through a separate tool call.",
    detail:
      "Rather than making a tool call per operation, the agent writes a short program that chains several calls together and runs it in a sandbox, returning only the final result. It cuts the token and round-trip cost of a long tool-calling sequence, at the cost of needing a code execution environment the agent can trust.",
    aliases: ["code execution mode", "code mode"],
    href: "/docs/mcp-servers/code-execution",
  },
  {
    id: "dynamic-tool-loading",
    acronym: "Dynamic Tool Loading",
    name: "Dynamic Tool Loading",
    category: "Agent infrastructure",
    definition:
      "Exposing only the tools relevant to the current task instead of an agent's full tool set at all times.",
    detail:
      "Loading tools on demand keeps the token cost of tool definitions down and reduces the chance an agent picks the wrong tool from a long, mostly-irrelevant list. It trades a small amount of orchestration complexity, deciding which tools to load when, for a smaller and more relevant working set.",
    aliases: ["dynamic tool loading"],
    href: "/docs/tool-design/token-budget#dynamic-tool-loading",
  },
  {
    id: "tool-curation",
    acronym: "Tool Curation",
    name: "Tool Curation",
    category: "Agent infrastructure",
    definition:
      "Deliberately managing which tools an agent has access to, rather than exposing every available tool by default.",
    detail:
      "A large, uncurated tool set slows an agent's tool selection and raises the chance of picking the wrong one; role-based tool kits and read-only versus mutating splits are two common ways to curate. Tool curation is an ongoing discipline, not a one-time setup, since sprawl returns as integrations are added.",
    aliases: ["tool curation"],
    href: "/docs/tool-design/tool-curation",
  },
  {
    id: "dry-run",
    acronym: "Dry-Run",
    name: "Dry-Run Mode",
    category: "Agent infrastructure",
    definition: "A way to preview what a tool call would do without actually doing it.",
    detail:
      "A dry-run flag returns the effect a mutating call would have, such as the order it would create, without committing it, letting an agent or a human confirm intent before a destructive action runs for real. It's a cheaper safety mechanism than full undo support for actions that are expensive or impossible to reverse.",
    aliases: ["dry-run", "dry-run mode", "dry run"],
    href: "/docs/tool-design/idempotency-and-safety#dry-run-modes",
  },
  {
    id: "bearer-token",
    acronym: "Bearer Token",
    name: "Bearer Token",
    category: "Auth & identity",
    definition:
      "A token that grants access to whoever presents it, with no proof that the presenter is the party it was issued to.",
    detail:
      "A bearer token is the simplest OAuth access token shape, and the easiest to misuse: anyone who obtains it, by theft or leak, can use it exactly as the legitimate holder could. DPoP exists specifically to close this gap for tokens that protect sensitive resources.",
    aliases: ["bearer token", "bearer tokens"],
    href: "/docs/mcp-servers/authentication#approach-1-bearer-token",
  },
  {
    id: "identity-proxy",
    acronym: "Identity Proxy",
    name: "Identity Proxy",
    category: "Auth & identity",
    definition:
      "A server-side component that authenticates users and issues its own tokens to downstream MCP tools.",
    detail:
      "Instead of every tool implementing OAuth directly, an identity proxy sits in front of them, handles the authorization flow once, and forwards a token or session the tools trust. It centralizes auth logic at the cost of adding a component every request has to pass through.",
    aliases: ["identity proxy"],
    href: "/docs/mcp-servers/authentication#approach-2-identity-proxy",
  },
  {
    id: "defense-in-depth",
    acronym: "Defense in Depth",
    name: "Defense in Depth",
    category: "Agent infrastructure",
    definition:
      "Layering independent security checks so a single failure doesn't fully compromise a system.",
    detail:
      "For an MCP server this means input validation, scope checks, and output filtering each stand on their own, so a bug in one layer doesn't leave the server fully exposed. It's a design discipline rather than a specific mechanism, applied wherever a single point of enforcement would be a single point of failure.",
    aliases: ["defense in depth"],
    href: "/docs/mcp-servers/architecture#defense-in-depth",
  },
  {
    id: "accessibility-tree",
    acronym: "Accessibility Tree",
    name: "Accessibility Tree",
    category: "Agent readiness",
    definition:
      "A structured, semantic view of a page's interactive elements that assistive tools and browser agents read instead of raw pixels.",
    detail:
      "A browser agent that reads the accessibility tree can identify buttons, fields, and links by role and label rather than by visual position, the same information screen readers rely on. Pages with poor semantic markup degrade for both a screen reader user and a browser agent at once.",
    aliases: ["accessibility tree"],
    href: "/docs/agentic-ui/browser-agent-accessibility#accessibility-tree-injection",
  },
  {
    id: "bm25",
    acronym: "BM25",
    name: "BM25",
    category: "Memory & knowledge",
    definition:
      "A classic keyword-ranking algorithm that scores documents by term frequency, balanced against document length.",
    detail:
      "BM25 predates embeddings and still outperforms vector search on exact-term queries, such as a product code or an error string, where meaning-based similarity isn't the point. Retrieval systems increasingly combine BM25 with embeddings so exact matches and semantic matches each cover the other's weak spot.",
    aliases: ["BM25"],
  },
  {
    id: "circuit-breaker",
    acronym: "Circuit Breaker",
    name: "Circuit Breaker",
    category: "Ops & lifecycle",
    definition:
      "A pattern that stops retrying a failing service after repeated failures, rather than retrying indefinitely.",
    detail:
      "After a threshold of consecutive failures, a circuit breaker stops sending requests for a cool-down period and then probes with a single request to check recovery, instead of hammering a degraded dependency. It complements exponential backoff: backoff spaces out retries, a circuit breaker decides when to stop retrying altogether.",
    aliases: ["circuit breaker", "circuit breakers"],
    href: "/docs/error-handling/retry-patterns#circuit-breakers",
  },
];

/** Terms grouped by category, in category order, A to Z within each. */
export function glossaryByCategory() {
  return glossaryCategories.map((category) => ({
    ...category,
    terms: glossaryTerms
      .filter((term) => term.category === category.name)
      .toSorted((a, b) => a.name.localeCompare(b.name)),
  }));
}
