export interface GlossaryTerm {
  id: string;
  acronym: string;
  name: string;
  category: string;
  definition: string;
  detail: string;
  href?: string;
}

export const glossaryTerms: GlossaryTerm[] = [
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
  {
    acronym: "MCP",
    category: "Agent Infrastructure",
    definition:
      "An open protocol for connecting agent clients to tools, data, and reusable prompts.",
    detail:
      "An MCP server describes the capabilities it offers so a compatible client can discover and call them. Servers can run locally or be reached over HTTP. Support varies by client and protocol version, so authentication, tools, and results still need testing in the clients customers use.",
    id: "mcp",
    name: "Model Context Protocol",
    href: "/docs/mcp-servers",
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
    definition: "Coordinating model calls, tools, and workflow steps to complete a task.",
    detail:
      "An orchestrator decides what runs next, carries state between steps, and handles retries, limits, and handoffs. It can support one agent or several. A fixed workflow suits predictable steps; an agent can make decisions where the next step depends on the result. More agents are useful only when their separate responsibilities justify the added coordination.",
    id: "orchestration",
    name: "Orchestration",
    href: "/docs/multi-agent",
  },
  {
    acronym: "API",
    category: "Data & Integration",
    definition:
      "A defined way for software to request data or perform an action in another system.",
    detail:
      "An API describes the operations available, the inputs each accepts, and the results or errors it returns. For example, a shop might offer operations to search products, prepare a cart, and check an order. Clear documentation and consistent responses help agents use those operations correctly.",
    id: "api",
    name: "Application Programming Interface",
    href: "/docs/api-surface",
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
  {
    acronym: "AEO",
    category: "Agent Readiness",
    definition: "Making content easier for answer engines to find, interpret, and cite.",
    detail:
      "Answer engine optimization concerns how search and AI answer systems retrieve and describe your content. It includes crawlable pages, clear facts, structured data, and trustworthy sources. Agent readiness is broader: an agent may also need to sign in, perform actions, recover from errors, or pay. Visibility does not establish that those tasks work.",
    id: "aeo",
    name: "Answer Engine Optimization",
    href: "/docs/discovery/aeo-checklist",
  },
  {
    acronym: "llms.txt",
    category: "Agent Readiness",
    definition: "A Markdown index that points agents to a site's important documentation.",
    detail:
      "A site can publish llms.txt at its root with a short introduction and links to relevant pages. It helps clients that read this convention find focused documentation. It does not set crawler permissions or guarantee search rankings, citations, or adoption by every agent.",
    id: "llms-txt",
    name: "llms.txt",
    href: "/docs/discovery/llms-txt",
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
  {
    id: "openapi",
    acronym: "OpenAPI",
    name: "OpenAPI Specification",
    category: "Data & Integration",
    definition: "A machine-readable description of an HTTP API.",
    detail:
      "It lists operations, inputs, responses, authentication requirements, and errors. Agents and developer tools can use it to construct requests. The specification must describe the API that actually runs; publishing a file alone does not make the operations work.",
    href: "/docs/api-surface/openapi-for-agents",
  },
  {
    id: "graphql",
    acronym: "GraphQL",
    name: "GraphQL",
    category: "Data & Integration",
    definition: "An API query language that lets callers choose which fields they receive.",
    detail:
      "A typed schema describes the data and operations available. Queries read data; mutations can change it. Agents need field descriptions, pagination rules, and clear errors to use the schema. A successful HTTP response can still contain GraphQL errors.",
    href: "/docs/api-surface/retrieval-and-job-contracts",
  },
  {
    id: "json-ld",
    acronym: "JSON-LD",
    name: "JavaScript Object Notation for Linked Data",
    category: "Agent Readiness",
    definition: "Structured labels that describe what the information on a web page means.",
    detail:
      "A page can use JSON-LD and a shared vocabulary such as Schema.org to identify a product, its brand, its price, and the relationships between them. These labels help software interpret the page. They should match the visible facts and never invent ratings or reviews.",
    href: "/docs/discovery/structured-data",
  },
  {
    id: "robots-txt",
    acronym: "robots.txt",
    name: "Crawler Rules",
    category: "Agent Readiness",
    definition: "A file that tells cooperating crawlers which URLs they may fetch.",
    detail:
      "Different rules can apply to search crawlers, training crawlers, and other automated visitors. robots.txt is a voluntary crawling convention, not access control: private information still needs authentication. Firewall rules can also block agents even when robots.txt allows them.",
    href: "/docs/discovery/robots-txt",
  },
  {
    id: "markdown",
    acronym: "Markdown",
    name: "Markdown",
    category: "Agent Readiness",
    definition: "A plain-text format for headings, links, lists, and other document structure.",
    detail:
      "Markdown keeps a document readable without most of a website's interface markup. A Markdown version can help an agent retrieve focused content, provided it preserves the original facts, links, and source information.",
    href: "/docs/discovery/content-negotiation",
  },
  {
    id: "content-negotiation",
    acronym: "Formats",
    name: "Content Negotiation",
    category: "Agent Readiness",
    definition: "Letting a client request a particular representation of the same resource.",
    detail:
      "For example, a browser may request HTML while an agent requests Markdown through an HTTP Accept header. The server chooses a supported format and labels the response. Caches must distinguish these formats so a person does not unexpectedly receive raw Markdown.",
    href: "/docs/discovery/content-negotiation",
  },
  {
    id: "agent-skills",
    acronym: "Skills",
    name: "Agent Skills",
    category: "Agent Infrastructure",
    definition: "Instructions and supporting files that teach an agent how to perform a task.",
    detail:
      "A skill explains when to use it, the steps to follow, and any tools or reference material needed. It can package a team's working practices for compatible coding agents. Instructions do not grant credentials or override the permissions enforced by the host or service.",
    href: "/docs/discovery/agent-skills",
  },
  {
    id: "agent-plugins",
    acronym: "Plugins",
    name: "Agent Plugins",
    category: "Agent Infrastructure",
    definition: "Installable packages of related agent tools, skills, and connections.",
    detail:
      "A plugin bundles capabilities for a particular agent platform and describes how to install and configure them. Platform formats differ, so a working package in one host does not guarantee compatibility with another.",
    href: "/docs/discovery/commercial-and-entity-discovery",
  },
  {
    id: "sdk",
    acronym: "SDK",
    name: "Software Development Kit",
    category: "Data & Integration",
    definition: "Libraries and supporting tools for integrating a service into an application.",
    detail:
      "An SDK can provide typed functions, authentication helpers, and examples around an API. It saves developers and coding agents from rebuilding common integration code. Its supported API versions and maintenance status should be clear.",
    href: "/docs/discovery/commercial-and-entity-discovery",
  },
  {
    id: "cli",
    acronym: "CLI",
    name: "Command-Line Interface",
    category: "Data & Integration",
    definition: "A way to operate software by entering commands in a terminal.",
    detail:
      "Coding agents can use a CLI in scripts and automated workflows. Explicit arguments, structured output, meaningful exit codes, and a way to run without interactive prompts make commands easier to use reliably.",
    href: "/docs/cli-design",
  },
  {
    id: "webmcp",
    acronym: "WebMCP",
    name: "Web Model Context Protocol",
    category: "Agent Infrastructure",
    definition: "A proposed browser interface that lets a page offer tools to visiting agents.",
    detail:
      "A compatible browser can discover named actions in the current page and call them with defined inputs. The tools operate in the page's context. Browser support is still evolving; this is distinct from running a remote MCP server and should complement accessible controls.",
    href: "/docs/protocols/webmcp",
  },
  {
    id: "mcp-apps",
    acronym: "MCP Apps",
    name: "Interactive Views in MCP Clients",
    category: "Agent Infrastructure",
    definition:
      "Interactive interfaces displayed alongside tool results in a compatible MCP client.",
    detail:
      "An MCP App can show a chart, selection interface, or editable result inside a conversation. The host controls how the view loads and what it can access. A service must test host compatibility, accessibility, and security boundaries as well as its tool responses.",
    href: "/docs/agentic-ui/mcp-apps",
  },
  {
    id: "oauth",
    acronym: "OAuth",
    name: "Delegated Authorization",
    category: "Auth & Identity",
    definition: "A way to give an application limited access without sharing a user's password.",
    detail:
      "A customer can approve access to selected capabilities, such as reading orders. The client then uses an access token when calling the API. The service must enforce the granted permissions, expiry, and account boundaries. OAuth grants access; it is not by itself a complete user identity protocol.",
    href: "/docs/authentication/oauth-for-agents",
  },
  {
    id: "scopes",
    acronym: "Scopes",
    name: "Permission Scopes",
    category: "Auth & Identity",
    definition: "Named permissions that define what an access token is allowed to do.",
    detail:
      "A token might allow reading orders while forbidding refunds. The server must check those permissions on every protected operation and ensure the caller can access the requested account or record. A scope written in documentation provides no protection unless it is enforced.",
    href: "/docs/authentication/agent-identity",
  },
  {
    id: "auth-md",
    acronym: "auth.md",
    name: "Agent Registration Guidance",
    category: "Auth & Identity",
    definition: "A published walkthrough of how an agent can register for a service.",
    detail:
      "The auth.md protocol connects readable setup instructions with metadata describing accepted identity methods and endpoints. An agent can discover how to register, obtain access, and involve the user when an account needs claiming. Advertised flows must exist and enforce normal authorization checks.",
    href: "/docs/authentication/auth-md",
  },
  {
    id: "web-bot-auth",
    acronym: "Bot Auth",
    name: "Web Bot Auth",
    category: "Auth & Identity",
    definition: "Signed HTTP requests that help a website verify which bot sent them.",
    detail:
      "The sender signs a request and publishes verification keys. The receiving service checks the signature and applies its own access rules. Verifying a bot's identity does not give it permission to read a customer's private data or spend their money.",
    href: "/docs/authentication/agent-identity#web-bot-auth",
  },
  {
    id: "id-jag",
    acronym: "ID-JAG",
    name: "Identity Assertion JWT Authorization Grant",
    category: "Auth & Identity",
    definition: "A signed identity assertion used to request access from another service.",
    detail:
      "A trusted issuer describes an identity in an audience-bound JWT. The receiving service verifies the assertion and decides what access may follow. In auth.md, the provider assertion goes to the identity endpoint; registration and the later token exchange are separate steps.",
    href: "/docs/authentication/auth-md",
  },
  {
    id: "idempotency",
    acronym: "Idempotency",
    name: "Safe Repeated Requests",
    category: "Ops & Lifecycle",
    definition: "Making a repeated request have the same intended effect as a single request.",
    detail:
      "If an order request times out, the caller may not know whether it succeeded. An idempotency key lets the server recognize the retry and return the earlier outcome instead of placing a second order. The API must document how long keys remain valid and how changed inputs are handled.",
    href: "/docs/error-handling/idempotency",
  },
  {
    id: "pagination",
    acronym: "Pagination",
    name: "Paged Results",
    category: "Data & Integration",
    definition:
      "Returning a large collection in smaller portions with a way to request the next portion.",
    detail:
      "A response includes a cursor or another continuation mechanism. Predictable ordering and stable item identifiers help agents work through results without omissions or duplicates, especially when the collection changes between requests.",
    href: "/docs/api-surface/retrieval-and-job-contracts",
  },
  {
    id: "rate-limits",
    acronym: "Rate limits",
    name: "Request Limits",
    category: "Ops & Lifecycle",
    definition: "Limits on how often a client can call a service.",
    detail:
      "A service may cap requests within a time window or limit concurrent work. Documented quotas and retry timing let agents slow down when they reach the limit. Repeatedly retrying immediately can prolong the failure or exhaust a budget.",
    href: "/docs/error-handling/retry-patterns",
  },
  {
    id: "webhooks",
    acronym: "Webhooks",
    name: "Event Notifications",
    category: "Data & Integration",
    definition: "HTTP messages a service sends when a subscribed event occurs.",
    detail:
      "For example, an order service can notify a client when a shipment leaves the warehouse. Receivers should verify the sender, handle duplicate deliveries, and recover from missed events. A webhook reports an event; the current record remains the source for its latest state.",
    href: "/docs/api-surface/webhooks-events",
  },
  {
    id: "sandbox",
    acronym: "Sandbox",
    name: "Test Environment",
    category: "Ops & Lifecycle",
    definition:
      "An isolated environment for trying operations without affecting production customers.",
    detail:
      "A sandbox can provide test credentials, sample records, and simulated payments. It lets agents exercise changes and failure recovery before using live services. Document differences from production so a passing test is not mistaken for proof of every live behavior.",
    href: "/docs/testing/evaluation-framework",
  },
  {
    id: "prompt-injection",
    acronym: "Injection",
    name: "Prompt Injection",
    category: "Ops & Lifecycle",
    definition: "Instructions hidden in external content that try to redirect an agent's behavior.",
    detail:
      "A retrieved page might tell an agent to reveal private data or ignore the user's request. Treat that page as untrusted data and enforce permissions outside the model. Test attempted redirects as well as ordinary input errors.",
    href: "/docs/testing/red-teaming",
  },
  {
    id: "ucp",
    acronym: "UCP",
    name: "Universal Commerce Protocol",
    category: "Payments",
    definition: "A protocol for connecting agent platforms with merchant commerce capabilities.",
    detail:
      "UCP describes capabilities such as checkout, identity linking, and order management. It lets compatible systems exchange purchase information through defined contracts. A merchant still needs supported payment integrations and must enforce its business rules and the buyer's authority.",
    href: "/docs/protocols/agentic-commerce",
  },
  {
    id: "acp",
    acronym: "ACP",
    name: "Agentic Commerce Protocol",
    category: "Payments",
    definition: "A protocol for agent-assisted checkout and related commerce operations.",
    detail:
      "ACP provides defined interfaces for preparing and completing purchases with a merchant. The integration must handle totals, customer approval, payment, and order results. Use the version and binding supported by the actual agent client and payment provider.",
    href: "/docs/protocols/acp",
  },
  {
    id: "ap2",
    acronym: "AP2",
    name: "Agent Payments Protocol",
    category: "Payments",
    definition: "A protocol for expressing and verifying authorization in agent-led payments.",
    detail:
      "AP2 uses signed mandates to record purchase intent and authorization. Participants verify the evidence required by their payment flow. A signed mandate, a completed payment, and delivery of the purchased item are separate facts.",
    href: "/docs/protocols/agentic-commerce",
  },
  {
    id: "payment-mandate",
    acronym: "Mandate",
    name: "Payment Mandate",
    category: "Payments",
    definition: "A record of what someone has authorized an agent to buy or spend.",
    detail:
      "A mandate can bind permission to an amount, merchant, purpose, or expiry, depending on the protocol. The receiving system verifies that permission before proceeding. An agent preparing a cart does not itself establish authority to pay.",
    href: "/docs/protocols/agentic-commerce",
  },
  {
    id: "mpp",
    acronym: "MPP",
    name: "Machine Payments Protocol",
    category: "Payments",
    definition: "An HTTP payment protocol for paid resources such as API calls and content.",
    detail:
      "A server presents a payment challenge, the client responds with a payment credential, and the server verifies it before supplying the resource. Price, spending limits, receipts, and recovery after failed delivery all need defined behavior.",
    href: "/docs/protocols/mpp",
  },
  {
    id: "x402",
    acronym: "x402",
    name: "HTTP Payment Protocol",
    category: "Payments",
    definition: "A protocol that uses HTTP 402 responses to request payment for a resource.",
    detail:
      "The response tells a compatible client what payment is required. The client provides payment information, which is verified under the supported scheme before access is granted. Check the payment network, asset, settlement process, and retry behavior required by the integration.",
    href: "/docs/protocols/agentic-commerce",
  },
];
