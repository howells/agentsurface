export function GET() {
  return new Response(
    `# Agent Surface access\n\nAgent Surface is a public, read-only documentation service. No account, API key, bearer token, OAuth flow, or identity assertion is required for documentation search, Markdown retrieval, or the MCP endpoint.\n\n- API specification: https://agentsurface.dev/openapi.json\n- Documentation index: https://agentsurface.dev/llms.txt\n- MCP endpoint: https://agentsurface.dev/mcp\n\nThere are no protected resources or authorization servers on this service. Do not send credentials or mint assertions. This page describes access; it does not advertise an auth.md registration or identity endpoint.\n`,
    { headers: { "Content-Type": "text/markdown; charset=utf-8" } },
  );
}
