# 0002. Surface guidance is the core; agent building is a secondary inventory

Agent Surface has two parts. The core is the guide and the surface skill: making an existing product (website, app, API, CLI, MCP server) usable by agents, and testing that it works. The secondary part is the agent-building inventory: condensed current best practice and a curated list of tools and platforms for teams building their own agents (frameworks, orchestration, memory, durable execution, browser and sandbox access, guardrails, agent retrieval).

An earlier decision kept agent-internal architecture out entirely. It was reversed because the inventory is worth maintaining as a reference, but it stays out of the core so the guide does not turn into a broad agent-building toolkit.

Consequences: the docs navigation splits into two labelled parts (`src/content/docs/meta.json`), the homepage covers only the product side, and the surface skill's Guide, Audit and Scaffold workflows stay product-side and framework-neutral. Inventory pages give one short summary of current practice per topic, with no deep tutorials. Framework ecosystems such as Mastra's integration lists are sources for the inventory, not credited as the authority.
