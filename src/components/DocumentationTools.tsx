"use client";

import { useEffect } from "react";

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean };
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}
interface ModelContext {
  registerTool: (tool: Tool, options?: { signal: AbortSignal }) => Promise<void> | void;
  unregisterTool?: (name: string) => void;
}

async function readResponse(url: string) {
  const response = await fetch(url);
  const json = response.headers.get("content-type")?.includes("json");
  const result: unknown = json ? await response.json() : { markdown: await response.text() };
  return { status: response.status, result };
}

/** Progressive enhancement: HTTP and MCP remain available in other browsers. */
export function DocumentationTools() {
  useEffect(() => {
    const current = (document as Document & { modelContext?: ModelContext }).modelContext;
    const legacy = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    const context = current?.registerTool ? current : legacy;
    if (!context?.registerTool) {
      return;
    }
    const controller = new AbortController();
    const tools: Tool[] = [
      {
        name: "search_docs",
        description:
          "Search Agent Surface documentation about agent-readable software, protocols, and tools. Returns page titles, URLs, slugs, and snippets.",
        annotations: { readOnlyHint: true },
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", minLength: 2, maxLength: 500 },
            limit: { type: "integer", minimum: 1, maximum: 20, default: 5 },
          },
          required: ["query"],
          additionalProperties: false,
        },
        execute: async ({ query, limit = 5 }) => {
          if (typeof query !== "string" || typeof limit !== "number") {
            throw new TypeError("Use a string query and integer limit.");
          }
          return readResponse(
            `/api/docs/search?${new URLSearchParams({ query, limit: String(limit) })}`,
          );
        },
      },
      {
        name: "get_page",
        description:
          "Read an Agent Surface documentation page as Markdown using a slug returned by search_docs. Use index for the documentation home.",
        annotations: { readOnlyHint: true },
        inputSchema: {
          type: "object",
          properties: { slug: { type: "string", minLength: 1 } },
          required: ["slug"],
          additionalProperties: false,
        },
        execute: async ({ slug }) => {
          if (typeof slug !== "string" || !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(slug)) {
            throw new TypeError("Use a documentation slug such as discovery/llms-txt.");
          }
          return readResponse(`/api/md/${slug}`);
        },
      },
    ];
    for (const tool of tools) {
      try {
        Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(
          (error: unknown) => {
            if (!controller.signal.aborted) {
              console.warn("Documentation tool registration failed", error);
            }
          },
        );
      } catch (error) {
        console.warn("Documentation tool registration failed", error);
      }
    }
    return () => {
      controller.abort();
      // Older navigator implementations use explicit unregistration.
      if (context !== current) {
        for (const tool of tools) {
          context.unregisterTool?.(tool.name);
        }
      }
    };
  }, []);
  return null;
}
