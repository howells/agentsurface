/**
 * Embedding-based Tool Selection (Toolpick Pattern)
 *
 * Automatically select the most relevant tools for the user's request using
 * semantic similarity. Uses OpenAI's text-embedding-3-small model to embed
 * tool descriptions and conversation context. Only passes the top N tools
 * to the model per step, reducing context window usage.
 *
 * When to use:
 * - You have >20 tools and need semantic tool discovery
 * - Token budget is tight (large tool registries cause prompt bloat)
 * - Tool names don't clearly indicate purpose (semantic ranking helps)
 * - You want to always expose certain "anchor" tools (web_search, help)
 *
 * Canonical docs:
 * - Vercel AI SDK `toolpick`: https://sdk.vercel.ai/docs/reference/ai-sdk-core/toolpick
 * - OpenAI embedding API: https://platform.openai.com/docs/guides/embeddings
 *
 * // <CUSTOMISE>
 * - Adjust maxTools to fit your token budget (8-16 typical)
 * - Update alwaysActive with your anchor tools
 * - Replace fileCache with Redis for distributed systems
 * - Tune embedding cache TTL and warmUp() threshold
 */

import { openai } from "@ai-sdk/openai";
import type { ModelMessage, PrepareStepFunction, Tool } from "ai";
import { ToolLoopAgent, stepCountIs } from "ai";
import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * In-memory tool index backed by OpenAI embeddings.
 * Lazy-loads embeddings on first call; re-embeds if tool registry changes (hash check).
 */
class ToolIndex {
  private tools: Record<string, Tool> = {};
  private embeddings: Record<string, number[]> = {};
  private toolHashes: Record<string, string> = {};
  private registryHash: string = "";
  private isWarmingUp: boolean = false;

  constructor(private embeddingModel = openai.embeddingModel("text-embedding-3-small")) {}

  /**
   * Register tools and compute their embeddings.
   * Call this once at startup to pre-compute embeddings.
   */
  async registerTools(toolMap: Record<string, Tool>): Promise<void> {
    this.tools = toolMap;

    const descriptions = Object.entries(toolMap).map(([name, tool]) => ({
      name,
      description: tool.description || name,
    }));

    // Compute hash of tool registry to detect changes
    const registryStr = JSON.stringify(descriptions);
    this.registryHash = createHash("sha256").update(registryStr).digest("hex");

    // Embed each tool's description
    const embeddingResults = await this.embeddingModel.embed({
      value: descriptions.map((d) => d.description),
    });

    descriptions.forEach((desc, idx) => {
      this.embeddings[desc.name] = embeddingResults.embeddings[idx] || [];
      this.toolHashes[desc.name] = createHash("sha256")
        .update(desc.description)
        .digest("hex");
    });

    this.isWarmingUp = false;
  }

  /**
   * Check if tool registry has changed since last load.
   * If so, re-register and re-embed.
   */
  async ensureFresh(toolMap: Record<string, Tool>): Promise<void> {
    const newRegistryStr = JSON.stringify(
      Object.entries(toolMap).map(([name, tool]) => ({
        name,
        description: tool.description || name,
      })),
    );
    const newHash = createHash("sha256").update(newRegistryStr).digest("hex");

    if (newHash !== this.registryHash) {
      await this.registerTools(toolMap);
    }
  }

  /**
   * Find the top-K tools most relevant to the user's request.
   * Uses cosine similarity between the query embedding and tool embeddings.
   */
  async selectTools<T extends Record<string, Tool>>(
    userMessage: string,
    allTools: T,
    options: {
      maxTools: number;
      alwaysActive: string[];
    },
  ): Promise<Partial<T>> {
    await this.ensureFresh(allTools);

    // Embed the user's message
    const queryEmbedding = (
      await this.embeddingModel.embed({
        value: userMessage,
      })
    ).embeddings[0];

    if (!queryEmbedding) {
      // Fallback: return alwaysActive tools + first N tools
      return Object.fromEntries(
        Object.entries(allTools)
          .filter(([name]) => options.alwaysActive.includes(name))
          .slice(0, options.maxTools),
      ) as Partial<T>;
    }

    // Compute cosine similarity for each tool
    const similarities = Object.entries(this.embeddings).map(([name, emb]) => ({
      name,
      score: cosineSimilarity(queryEmbedding, emb),
    }));

    // Sort by relevance and add always-active tools
    const selected = new Set<string>();
    options.alwaysActive.forEach((name) => selected.add(name));

    similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, options.maxTools)
      .forEach(({ name }) => selected.add(name));

    return Object.fromEntries(
      Array.from(selected)
        .filter((name) => name in allTools)
        .map((name) => [name, allTools[name as keyof T]]),
    ) as Partial<T>;
  }
}

/**
 * Compute cosine similarity between two embedding vectors.
 * Result in [-1, 1]; higher = more similar.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  const dotProduct = a.reduce((sum, val, idx) => sum + val * b[idx]!, 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Build a prepareStep function that uses the tool index to select tools.
 * Returns only the top-K most relevant tools per step.
 */
export function buildToolpickPrepareStep<T extends Record<string, Tool>>(
  index: ToolIndex,
  options: {
    maxTools: number;
    alwaysActive: string[];
  },
): PrepareStepFunction<T> {
  return async (input) => {
    // Extract user message from conversation history
    const lastUserMsg = [...input.messages]
      .reverse()
      .find((m) => m.role === "user");

    const userQuery = lastUserMsg?.content ? String(lastUserMsg.content) : "";

    const selectedTools = await index.selectTools(userQuery, input.tools, options);

    return {
      tools: selectedTools as T,
    };
  };
}

/**
 * Example: Register tools and run agent with toolpick.
 */
export async function runAgentWithToolpick(
  userMessage: string,
  availableTools: Record<string, Tool>,
) {
  const toolIndex = new ToolIndex();

  // Pre-register and warm up embeddings
  await toolIndex.registerTools(availableTools);

  const agent = new ToolLoopAgent({
    model: openai("gpt-4.1-mini"),
    instructions: "You are a helpful assistant. Use the provided tools to help the user.",
    tools: availableTools as Record<string, Tool>,
    prepareStep: buildToolpickPrepareStep(toolIndex, {
      maxTools: 12,
      alwaysActive: ["web_search", "search_tools"],
    }),
    stopWhen: stepCountIs(10),
  });

  const messages: ModelMessage[] = [{ role: "user", content: userMessage }];

  const result = await agent.stream({
    messages,
  });

  return result;
}

/**
 * Zod schema for tool registry (optional, for validation).
 */
export const ToolRegistrySchema = z.object({
  name: z.string().describe("Tool identifier"),
  description: z.string().describe("Human-readable description"),
  parameters: z.record(z.string(), z.unknown()).describe("Input schema (Zod or JSON schema)"),
  category: z
    .enum(["read", "write", "destructive", "external"])
    .optional()
    .describe("Tool classification for filtering"),
});

export type ToolRegistry = z.infer<typeof ToolRegistrySchema>;

/**
 * Optional: Cache embeddings to disk to avoid re-embedding on restart.
 * In production, use Redis with TTL-based expiry.
 */
export class EmbeddingCache {
  private cache: Record<string, number[]> = {};
  private lastFlush: number = Date.now();

  async save(key: string, embedding: number[]): Promise<void> {
    this.cache[key] = embedding;
    // <CUSTOMISE> Implement persistent storage (Redis, DynamoDB, etc.)
  }

  async load(key: string): Promise<number[] | null> {
    // <CUSTOMISE> Implement persistent storage (Redis, DynamoDB, etc.)
    return this.cache[key] || null;
  }

  async clear(): Promise<void> {
    this.cache = {};
  }
}
