import serverCard from "../../../../public/.well-known/mcp/server-card.json";

// MCP Server Card at the location the extension recommends:
// `<streamable-http-url>/server-card`. It serves the same document as the
// `/.well-known/mcp/server-card.json` compatibility copy, so the two cannot drift.
const headers = {
  "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "ETag",
  "Cache-Control": "public, max-age=3600",
  "Content-Type": "application/mcp-server-card+json",
};

export function GET(): Response {
  return Response.json(serverCard, { headers });
}

export function OPTIONS(): Response {
  return new Response(null, { headers, status: 204 });
}
