import { createDocsMcpServer } from "@/lib/docs-mcp";
import { retrieveDocs } from "@/lib/search";
import { docsLlms, source } from "@/lib/source";
import { createMcpHandler } from "@modelcontextprotocol/server";
import packageJson from "../../../package.json";

const handler = createMcpHandler(() =>
  createDocsMcpServer(
    {
      pages: () => source.getPages(),
      markdown: async (page) => {
        const original = source.getPage(page.slugs);
        if (!original) {
          throw new Error(`Documentation source changed: ${page.url}`);
        }
        return docsLlms.page(original);
      },
      search: retrieveDocs,
    },
    packageJson.version,
  ),
);

export async function GET(request: Request): Promise<Response> {
  return handler.fetch(request);
}
export async function POST(request: Request): Promise<Response> {
  return handler.fetch(request);
}
export async function DELETE(request: Request): Promise<Response> {
  return handler.fetch(request);
}
