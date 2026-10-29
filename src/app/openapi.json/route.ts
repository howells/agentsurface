import { searchOutput } from "@/lib/retrieval-contract";
import { z } from "zod";

const problemResponse = {
  description:
    "Problem Details with recovery suggestions and a trace_id. is_retriable means safe to retry the unchanged request.",
  content: { "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } } },
};
const specification = {
  openapi: "3.1.0",
  info: {
    title: "Agent Surface documentation API",
    version: "1.0.0",
    description:
      "Public read-only documentation retrieval, without credentials. Search to discover pages, then fetch the canonical Markdown. Compatibility: these unversioned URLs and existing operationIds are stable within API version 1. Additive fields may appear; clients should ignore unknown fields. Breaking changes require a new major version and a documented migration period before retiring an existing route. There is no application quota or rate-limit policy; query and response bounds below apply. Remote MCP uses POST /mcp with protocol 2026-07-28.",
  },
  servers: [{ url: "https://agentsurface.dev" }],
  security: [],
  paths: {
    "/api/docs/search": {
      get: {
        operationId: "searchDocs",
        summary: "Search documentation with bounded page-level results",
        description:
          "Use when you know the topic but not the page URL. Searches titles, descriptions, headings and body. Chunks are deduplicated by canonical page URL, preserving the page-group order returned by Fumadocs full-text search (ZBSearch). rank is a 1-based position, not a probability or confidence score. Snippets are capped at 600 characters. No match (including an unknown section) returns 200 with results: [] and has_more: false. has_more means additional pages exist: narrow the query or section, or increase limit up to 20. Use the docs index for exhaustive browsing. Fetch a selected page with getPage.",
        parameters: [
          {
            name: "query",
            in: "query",
            required: true,
            description: "Trimmed topic keywords; 2 to 500 characters.",
            example: "content negotiation",
            schema: { type: "string", minLength: 2, maxLength: 500 },
          },
          {
            name: "limit",
            in: "query",
            description: "Maximum number of distinct pages, default 5 and maximum 20.",
            example: 5,
            schema: { type: "integer", minimum: 1, maximum: 20, default: 5 },
          },
          {
            name: "section",
            in: "query",
            description:
              "Optional top-level documentation section. Unknown sections return an empty result set.",
            example: "discovery",
            schema: { type: "string", pattern: "^[a-z0-9-]+$" },
          },
        ],
        responses: {
          "200": {
            description:
              "Bounded relevance-ordered pages with stable IDs, canonical URLs and content dates where available.",
            content: { "application/json": { schema: z.toJSONSchema(searchOutput) } },
          },
          "400": problemResponse,
          "500": problemResponse,
        },
      },
    },
    "/api/md/{slug}": {
      get: {
        operationId: "getPage",
        summary: "Read a documentation page as Markdown",
        description:
          "Use after searchDocs to read one complete authoritative page. The processed Markdown includes canonical URL, description and freshness metadata where available. Use the result slug verbatim, or index for the documentation home. Missing slugs return a 404 Problem Details document with recovery hints; they do not return an HTML shell. For offline indexing only, the opt-in /llms-full.txt export is roughly 1.9 MB or 470,000 estimated tokens (characters / 4); prefer single pages for normal reading.",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            description:
              "Slash-separated documentation path from a search result. Use index for the documentation home.",
            example: "discovery/llms-txt",
            schema: { type: "string", minLength: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Complete processed Markdown with source metadata.",
            content: { "text/markdown": { schema: { type: "string" } } },
          },
          "404": problemResponse,
        },
      },
    },
  },
  components: {
    schemas: {
      Problem: {
        type: "object",
        required: [
          "type",
          "title",
          "status",
          "detail",
          "instance",
          "is_retriable",
          "suggestions",
          "trace_id",
          "code",
          "message",
          "hint",
        ],
        properties: {
          type: { type: "string", example: "about:blank" },
          title: { type: "string" },
          status: { type: "integer" },
          detail: { type: "string" },
          instance: {
            type: "string",
            description: "Request path and query, identifying the failed request.",
            example: "/api/docs/search?query=x",
          },
          is_retriable: {
            type: "boolean",
            description:
              "True only when it is safe to retry the unchanged request. Validation and missing-page errors are false; a temporary read-only search failure is true.",
          },
          suggestions: { type: "array", items: { type: "string" } },
          trace_id: {
            type: "string",
            description: "Opaque request identifier, also returned in X-Request-Id.",
          },
          code: { type: "string" },
          message: { type: "string" },
          hint: { type: "string" },
        },
      },
    },
  },
};
export function GET() {
  return Response.json(specification, { headers: { "Cache-Control": "public, max-age=3600" } });
}
