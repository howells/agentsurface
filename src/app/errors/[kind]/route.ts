import { PROBLEMS, problemType } from "@/lib/api-error";
import type { ProblemKind } from "@/lib/api-error";
import { markdownHeaders } from "@/lib/markdown";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(PROBLEMS).map((kind) => ({ kind }));
}

/** The page each problem `type` URI resolves to. */
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const { status, title, about } = PROBLEMS[kind as ProblemKind];
  const content = `# ${title}\n\n- Type: ${problemType(kind as ProblemKind)}\n- Status: ${status}\n\n${about}\n\nEvery problem document carries \`detail\`, \`instance\`, \`is_retriable\`, \`suggestions\` and \`trace_id\`. The schema is in /openapi.json.\n`;
  return new Response(content, { headers: markdownHeaders(content) });
}
