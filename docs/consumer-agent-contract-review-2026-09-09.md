# Consumer agent contracts: focused review

9 September 2026. Prompted by Samplize's consultation extraction and inline UI strategy. These are corrections to the documentation and distributed skill, not a new runtime or a host compatibility certification.

## Corrections

- MCP Apps links tool metadata to an HTML resource through `_meta.ui.resourceUri`. Hosts may preload it; tool results supply data. The app-to-host JSON-RPC bridge uses `postMessage`, distinct from the host-to-server MCP connection. Updated the architecture and lifecycle together.
- Authentication scoring now follows the acting identity. Authorization Code with PKCE is appropriate for user-delegated access, while Client Credentials serves service-owned M2M. Updated the published rubric, both skill reference rubrics, scoring prompt, auth guidance and upgrader prompt so they agree. PKCE belongs to the authorization-code exchange, not Client Credentials.
- The protocol decision guide now asks which checkout path the commerce platform and target host support, instead of prescribing ACP for every purchase.

## Primary evidence

- [MCP Apps architecture](https://modelcontextprotocol.io/extensions/apps/overview)
- [MCP authorization extensions](https://modelcontextprotocol.io/extensions/auth/overview)
- [MCP authorization](https://modelcontextprotocol.io/specification/latest/basic/authorization)

Existing page-wide freshness dates were preserved: this review verifies these specific contracts, not every vendor/version statement on each affected page. No deployment or runtime behaviour changed.
