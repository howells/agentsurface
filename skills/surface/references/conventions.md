# Agent Project Conventions

Codified from 6 production Mastra projects. Follow these conventions when generating
scaffolding to ensure consistency with established patterns.

## Directory Structure

### Monorepo Pattern (preferred for larger projects)

```
packages/agents/
├── package.json             # @project/agents package
├── tsconfig.json
└── src/
    ├── index.ts             # Package exports
    ├── mastra.ts            # Central Mastra instance (registers all agents + workflows)
    ├── triggers.ts          # Fire-and-forget workflow trigger functions
    ├── agents/
    │   ├── index.ts         # Barrel export of all agents
    │   ├── agent-name.ts    # One agent per file
    │   ├── model.ts         # Model/provider configuration
    │   └── load-instructions.ts  # Load system prompts from markdown
    ├── tools/
    │   ├── index.ts         # Barrel export (grouped by domain)
    │   ├── shared/          # Cross-agent tools (web-search, web-fetch)
    │   │   ├── index.ts
    │   │   └── web-search.ts
    │   └── domain-name/     # Domain-specific tools
    │       ├── index.ts
    │       └── tool-name.ts
    └── workflows/
        ├── index.ts
        └── workflow-name/
            ├── index.ts     # Workflow definition + step composition
            ├── steps/       # Individual step files
            │   ├── index.ts
            │   └── step-name.ts
            └── state.ts     # Zod schema for shared workflow state
```

### Single-App Pattern (simpler projects)

```
src/mastra/
├── index.ts                 # Central Mastra instance
├── agents/
│   ├── index.ts
│   └── agent-name.ts
├── tools/
│   ├── index.ts
│   └── tool-name.ts
└── workflows/
    └── workflow-name.ts
```

## Naming Conventions

### Files
- Agent files: `kebab-case.ts` matching the agent's id
- Tool files: `kebab-case.ts` matching the tool's id
- Workflow directories: `kebab-case/` matching the workflow's id

### Identifiers
- Agent id: `kebab-case` (e.g., `"reading-companion"`, `"brand-intelligence"`)
- Agent name: `Title Case` (e.g., `"Reading Companion"`, `"Brand Intelligence"`)
- Tool id: `kebab-case` (e.g., `"get-piece"`, `"search-recipes"`)
- Workflow id: `kebab-case` (e.g., `"recipe-generation"`, `"enrich-image"`)
- Variable names: `camelCase` for the exported const (e.g., `readingCompanion`, `getPieceTool`)

### Tool Naming
Tools should use verb-first naming that describes what the tool does:
- `get-piece`, `search-recipes`, `classify-image`
- `create-invoice`, `update-status`, `remove-background`

## Agent Definition Pattern

```typescript
import { Agent } from "@mastra/core/agent";

export const myAgent = new Agent({
  id: "my-agent",
  name: "My Agent",
  description: "One sentence about what this agent does.",
  instructions: "System prompt. Can be a string or loaded from markdown files.",
  model: "anthropic/claude-sonnet-4-6",  // Use Mastra model router format
  tools: {
    // Compose from tool groups
    ...domainTools,
    ...sharedTools,
  },
});
```

## Tool Definition Pattern

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const myTool = createTool({
  id: "my-tool",
  description: "What this tool does. Written as agent onboarding — include when to use and when not to use.",
  inputSchema: z.object({
    param: z.string().describe("What this parameter means."),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async (input, context) => {
    // Implementation
    return { result: "value" };
  },
  mcp: {
    annotations: {
      title: "My Tool",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
});
```

## Tool Grouping Pattern

Export tools as named objects for composition:

```typescript
// tools/reader/index.ts
export const readerTools = {
  getPieceTool,
  searchPiecesTool,
  getConnectionsTool,
};

// tools/graph/index.ts
export const graphTools = {
  getGraphTool,
  traverseGraphTool,
};

// agents/my-agent.ts — compose multiple groups
tools: {
  ...readerTools,
  ...graphTools,
  ...sharedTools,
},
```

## Workflow Definition Pattern

```typescript
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const stepOne = createStep({
  id: "step-one",
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => {
    return { result: "done" };
  },
});

export const myWorkflow = createWorkflow({
  id: "my-workflow",
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ finalResult: z.string() }),
})
  .then(stepOne)
  .then(stepTwo)
  .commit();  // Always call .commit()
```

### Parallel Steps

```typescript
export const myWorkflow = createWorkflow({
  id: "my-workflow",
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ finalResult: z.string() }),
})
  .parallel([classifyStep, paletteStep, embedStep])
  .then(mergeStep)
  .commit();
```

### Shared State (for fan-out/fan-in)

```typescript
// state.ts
export const workflowState = z.object({
  description: z.string().optional(),
  classifications: z.record(z.unknown()).optional(),
  embedding: z.array(z.number()).optional(),
});

// In steps:
execute: async ({ inputData, state, setState }) => {
  const result = await generateDescription(inputData);
  setState({ description: result });
  return result;
};
```

## Central Registry (mastra.ts)

Every project has one Mastra instance that registers all agents and workflows:

```typescript
import { Mastra } from "@mastra/core/mastra";
import { myAgent, otherAgent } from "./agents";
import { myWorkflow } from "./workflows";

export const mastra = new Mastra({
  agents: {
    myAgent,
    otherAgent,
  },
  workflows: {
    myWorkflow,
  },
});
```

Retrieve agents in API routes:
```typescript
const agent = mastra.getAgent("my-agent");
const result = await agent.stream(messages, { requestContext });
```

## Trigger Functions (triggers.ts)

Fire-and-forget pattern for workflow execution from API routes:

```typescript
export function onImageSaved(sourceImageId: string, imageUrl: string) {
  void import("./workflows/enrich-image")
    .then(({ enrichImageWorkflow }) => enrichImageWorkflow.createRun())
    .then((run) => run.start({ inputData: { imageUrl, sourceImageId } }))
    .catch((error) => console.error("Enrich workflow failed:", error));
}
```

Dynamic imports avoid loading heavy dependencies at route init time.

## Instructions Loading

For agents with complex instructions, load from markdown files:

```typescript
// agents/load-instructions.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadAgentInstructions(agentPath: string): string {
  const base = join(import.meta.dirname, "instructions", agentPath);
  const files = ["role.md", "domain.md", "tools.md", "playbook.md"];
  return files
    .map((f) => {
      try { return readFileSync(join(base, f), "utf-8"); }
      catch { return ""; }
    })
    .filter(Boolean)
    .join("\n\n");
}
```

Directory structure:
```
agents/instructions/
└── brand-intelligence/
    ├── role.md        # Who the agent is
    ├── domain.md      # Domain knowledge
    ├── tools.md       # How to use available tools
    └── playbook.md    # Step-by-step workflows
```

## Barrel Exports

Every directory has an `index.ts` that re-exports its contents:

```typescript
// agents/index.ts
export { myAgent } from "./my-agent";
export { otherAgent } from "./other-agent";

// tools/index.ts
export { readerTools } from "./reader";
export { graphTools } from "./graph";
export { sharedTools } from "./shared";
```
