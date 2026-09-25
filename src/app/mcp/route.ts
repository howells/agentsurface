import { searchServer } from "@/lib/search";
import { docsLlms, source } from "@/lib/source";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { registerSearchTool, registerSourceTools } from "fumadocs-core/mcp";
import packageJson from "../../../package.json";

const handler = createMcpHandler(() => {
  const mcp = new McpServer(
    { name: "agentsurface-docs", version: packageJson.version },
    {
      instructions:
        "Search and read Agent Surface documentation about making software legible to AI agents. Call search first to find relevant pages by keyword, or list_pages to browse the full index, then get_page with a page's URL (from either tool's results) to read it as Markdown.",
    },
  );

  registerSourceTools(mcp, source, docsLlms);
  registerSearchTool(mcp, searchServer);

  return mcp;
});

export async function GET(request: Request): Promise<Response> {
  return handler.fetch(request);
}

export async function POST(request: Request): Promise<Response> {
  return handler.fetch(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handler.fetch(request);
}
