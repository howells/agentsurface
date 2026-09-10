# Cloudflare checker comparison — 2026-09-10

## Conclusion

DNS for AI Discovery (DNS-AID) is the one additional named capability found in Cloudflare's current scanner that has no counterpart in Ora's published 125-check catalog, contract version 1.24.0. Is Agentic says its checks are run and scored by Ora, so it does not add another independent coverage catalog.

Content Signals is a separate Cloudflare check, but Ora already explicitly accepts it within its AI crawler policy check. The other Cloudflare capabilities overlap Ora. This is a comparison of published coverage and observed probes, not a claim that private backend implementations are identical.

## Evidence and scope

Inspected the live homepage, its published JavaScript client, the machine-readable skill index and relevant individual implementation guides. Requested all 22 known check IDs from the discovered scan API against https://agentsurface.dev; the response returned all 22 at 2026-09-10T09:53:04.296Z. Compared these with Ora's live /api/checks and Is Agentic's live methodology. The adjacent JSON stores the mapping, source references, client hash and complete public scan evidence.

The client default selection excludes A2A and AP2: 20 selected checks, although the scanner supports 22. Commerce does not contribute to the client's overall percentage, and neutral results are excluded from its denominator. The API also returns a separate level from 0 to 5. The skill index contains llms.txt and llms-full.txt guidance, but these are not independent checks in the current 22-ID scan inventory. Do not count guidance pages as executed checks.

The production-domain scan is evidence of checker behavior. It does not test the current local changes, which have not been deployed, and its failures are not automatically implementation requirements for a documentation site.

## What should affect Agent Surface's advice

### Add optional DNS discovery guidance

Cloudflare actually queried SVCB and HTTPS records at `_index._agents`, `_a2a._agents` and `_mcp._agents`, plus a TXT index at `_index._agents`. Its evidence records DNSSEC validation and discovered record details. Its published guide recommends signed discovery zones and service connection parameters.

DNS-AID advertises where an organization's agent services can be reached through DNS. It belongs under Discoverability, with a glossary entry and an advanced reference explaining when a client ecosystem supports it. A possible card title is **Advertise agent services through DNS**. Suggested explanation: **Publish DNS records that point to your agent services, so compatible clients can find their connection details without searching your website.**

Treat this as optional and emerging. The IETF tracker lists revision 02 as an active individual Internet-Draft, not an adopted standard or RFC. It should not become a universal prerequisite for ordinary websites. No DNS-AID guidance was found in the current published docs, skill references, templates or homepage guide.

### Make content-use preferences explicit in existing advice

Crawl permission and permitted use of retrieved content answer different questions. Cloudflare tests AI bot rules and Content Signals separately; Ora gives Content Signals credit as an alternative within `robots-ai-policy-quality`. Cloudflare can therefore flag a missing declaration even where Ora credits the crawler rules.

Agent Surface already explains Content Signals in discovery/robots-txt, discovery/content-negotiation and the discovery-aeo skill reference. Strengthen the existing crawler-policy card to distinguish search, use in an answer, and training. This needs clearer prominence, not a new top-level category.

### Preserve useful implementation distinctions

- Cloudflare probes the canonical URL with `Accept: text/markdown`. Ora's basic markdown check accepts more alternatives, but its separate `markdown-negotiation-vary` check already covers canonical negotiation and safe cache variation. Keep both concepts clear in our advice.
- The observed Cloudflare ARD check also tries `_catalog._agents` TXT and `_search._agents` SRV discovery. Ora's published ARD description names HTTP catalog paths, not those DNS probes. This is an additional detection route within an existing capability, worth noting in technical references rather than adding another homepage card.
- Web Bot Auth directory publication identifies an operator that sends signed bot requests. It is not proof that a receiving website verifies requests, and neither scanner's directory-presence check establishes end-to-end authorization. Our advice should retain that distinction.

### Do not copy scanner assumptions as standards

The observed ARD probe used the older ai-catalog.json path and did not show a request for ard.json, whereas Ora's current catalog explicitly prefers ard.json. Cloudflare's observed WebMCP evidence names navigator.modelContext. This one negative scan cannot establish whether its implementation also handles document.modelContext. Verify current protocol specifications before changing working integrations merely to satisfy a scanner.

Retain the five-area taxonomy. Add Cloudflare as another diagnostic source when the tooling reference is next updated; its separate emphasis on content-use policies is useful, but its score should not dictate our priorities.

## Complete capability mapping

An overlapping row means the same broad capability is covered; acceptance criteria, applicability and weight can differ.

| Cloudflare check ID      | Ora counterpart(s)                                                               |
| ------------------------ | -------------------------------------------------------------------------------- |
| `robotsTxt`              | `robots-ai-policy-quality`                                                       |
| `sitemap`                | `sitemap`, `sitemap-lastmod`                                                     |
| `linkHeaders`            | `link-headers-discovery`                                                         |
| `dnsAid`                 | **No published equivalent**                                                      |
| `markdownNegotiation`    | `markdown-negotiation`, `markdown-negotiation-vary`                              |
| `robotsTxtAiRules`       | `robots-ai-policy-quality`, `robots-agent-user-policy`                           |
| `contentSignals`         | `robots-ai-policy-quality`                                                       |
| `webBotAuth`             | `web-bot-auth-directory`                                                         |
| `apiCatalog`             | `api-catalog-rfc9727`                                                            |
| `oauthDiscovery`         | `oauth-support`, `mcp-oauth-metadata`, `agent-auth-discovery-metadata`           |
| `oauthProtectedResource` | `oauth-protected-resource`                                                       |
| `authMd`                 | `auth-md-exists`, `auth-md-structure`, `auth-md-walkthrough-simulation`          |
| `mcpServerCard`          | `mcp-server-card`, `mcp-well-known-discovery`                                    |
| `a2aAgentCard`           | `a2a-agent-card`                                                                 |
| `agentSkills`            | `agent-skills-index-v2`, `agent-discovery-file`                                  |
| `webMcp`                 | `webmcp`                                                                         |
| `ard`                    | `ard-catalog`, `ai-catalog-published`, `ard-entries-valid`, `ard-trust-manifest` |
| `x402`                   | `x402-support`                                                                   |
| `mpp`                    | `mpp-support`                                                                    |
| `ucp`                    | `ucp-support`                                                                    |
| `acp`                    | `acp-support`, `acp-delegate-payment`                                            |
| `ap2`                    | `ap2-support`                                                                    |

## Sources

- [Cloudflare checker](https://isitagentready.com/) and [published skill index](https://isitagentready.com/.well-known/agent-skills/index.json)
- [DNS-AID check guide](https://isitagentready.com/.well-known/agent-skills/dns-aid/SKILL.md)
- [Content Signals check guide](https://isitagentready.com/.well-known/agent-skills/content-signals/SKILL.md)
- [Markdown negotiation guide](https://isitagentready.com/.well-known/agent-skills/markdown-negotiation/SKILL.md)
- [Web Bot Auth guide](https://isitagentready.com/.well-known/agent-skills/web-bot-auth/SKILL.md)
- [Ora live check catalog](https://ora.ai/api/checks)
- [Is Agentic methodology](https://is-agentic.com/methodology)
- [DNS-AID draft status](https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/)

## Implementation follow-up

Implemented on 2026-09-10 after approval: an optional DNS-AID homepage card, DNS-AID and Content Signals glossary entries, a DNS discovery reference, clearer crawler/content-use wording, and synchronized catalog and skill guidance. The homepage now has 57 cards across the same five areas and the glossary has 55 terms. Existing Cloudflare listings were expanded rather than duplicated. No scoring weights, DNS configuration, application endpoints or deployment settings changed.

The comparison above records the research baseline; its recommendations have now been composed into the guide. Existing unrelated edits and the separate Fable review remain outside this change.

Validation: documentation integrity, the existing 125-check homepage coverage validation, and TypeScript checks passed. Browser verification followed the overview anchor to the DNS card and opened its rendered reference. The standards review found no violations; the scope review found an older content-use contradiction in the skill, which was corrected along with the equivalent crawler-policy wording. No standalone test suite is configured in this package.
