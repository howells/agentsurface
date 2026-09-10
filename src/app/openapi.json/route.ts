const specification = {
  openapi: "3.1.0",
  info: {
    title: "Agent Surface documentation API",
    version: "1.0.0",
    description:
      "Public, read-only documentation retrieval. No credentials required. Browser tools expose search_docs and get_page through WebMCP when supported; remote MCP is available at /mcp.",
  },
  servers: [
    {
      url: "https://agentsurface.dev",
    },
  ],
  security: [],
  paths: {
    "/api/docs/search": {
      get: {
        operationId: "searchDocs",
        summary: "Search documentation with page-level results",
        parameters: [
          {
            name: "query",
            in: "query",
            required: true,
            schema: {
              type: "string",
              minLength: 2,
              maxLength: 500,
            },
          },
          {
            name: "limit",
            in: "query",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 20,
              default: 5,
            },
          },
        ],
        responses: {
          "200": {
            description: "Relevance-ordered matching pages; empty results when no match exists",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["results"],
                  properties: {
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["title", "description", "url", "slug", "snippet"],
                        properties: {
                          title: {
                            type: "string",
                          },
                          description: {
                            type: "string",
                          },
                          url: {
                            type: "string",
                          },
                          slug: {
                            type: "string",
                          },
                          snippet: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Structured error with recovery guidance",
            content: {
              "application/problem+json": {
                schema: {
                  $ref: "#/components/schemas/Problem",
                },
              },
            },
          },
          "500": {
            description: "Structured error with recovery guidance",
            content: {
              "application/problem+json": {
                schema: {
                  $ref: "#/components/schemas/Problem",
                },
              },
            },
          },
        },
      },
    },
    "/api/md/{slug}": {
      get: {
        operationId: "getPage",
        summary: "Read a documentation page as Markdown/MDX",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            description:
              "Slash-separated documentation path, e.g. discovery/llms-txt. Use index for the home page.",
            schema: {
              type: "string",
            },
            example: "discovery/llms-txt",
          },
        ],
        responses: {
          "200": {
            description: "Raw documentation source",
            content: {
              "text/markdown": {
                schema: {
                  type: "string",
                },
              },
            },
          },
          "404": {
            description: "Structured error with recovery guidance",
            content: {
              "application/problem+json": {
                schema: {
                  $ref: "#/components/schemas/Problem",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Problem: {
        type: "object",
        required: ["type", "title", "status", "code", "message", "hint"],
        properties: {
          type: {
            type: "string",
          },
          title: {
            type: "string",
          },
          code: {
            type: "string",
          },
          message: {
            type: "string",
          },
          hint: {
            type: "string",
          },
          status: {
            type: "integer",
          },
        },
      },
    },
  },
};

export function GET() {
  return Response.json(specification, { headers: { "Cache-Control": "public, max-age=3600" } });
}
