# Homepage copy review — 2026-09-10

Reviewed all 56 cards and their 280 display strings using signage for labels and headings, and deslop for explanations. Audience: informed product and business readers, including Jo and Adam. Changed 186 card strings, plus overview questions, descriptions, and two surrounding labels.

Kept the feature, action, and reason distinct. Retained useful names such as OpenAPI, OAuth, MCP, and idempotency keys where explained in the body. All five groups, 56 card IDs, ordering, and documentation destinations are unchanged.

## Primary signage findings

Counts classify each flagged card once by its primary issue, rather than counting every changed word. Other cards received prose edits without a primary signage finding. Action-led headings and the “Why it matters” label are intentional requirements of this guide.

| Tell | Issue                                           | Cards |
| ---- | ----------------------------------------------- | ----: |
| 1    | Specialist language in a general-audience label |     6 |
| 3    | Unnatural verbs                                 |     4 |
| 4    | Abstract wording                                |    19 |
| 6    | Wordy headings                                  |    16 |
| 13   | Metaphorical wording                            |     1 |

## Card-by-card review

Source links point to each card's stable ID in the shared homepage data. Every card's explanation and reason were also reviewed; the table shows its feature label and action heading before and after.

| Card                                                          | Before: feature / action                                                    | After: feature / action                                                 | Primary tell |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------ |
| [crawler-access](../src/data/homepage-guide.ts#L28)           | Crawler access / Let agents reach your public content                       | Crawler access / Let agents reach your public content                   | Prose edit   |
| [sitemaps](../src/data/homepage-guide.ts#L37)                 | Sitemaps & URLs / Give every important page a reliable address              | Sitemaps & URLs / Give important pages stable URLs                      | 6            |
| [identity](../src/data/homepage-guide.ts#L46)                 | Business identity / Make it clear who is behind the product                 | Business identity / Identify the business behind your product           | 6            |
| [public-docs](../src/data/homepage-guide.ts#L55)              | Public documentation / Make your documentation easy to find                 | Public documentation / Make your documentation easy to find             | Prose edit   |
| [llms-index](../src/data/homepage-guide.ts#L64)               | llms.txt / Publish a concise index for agents                               | llms.txt / Give agents a documentation index                            | 6            |
| [endpoint-discovery](../src/data/homepage-guide.ts#L73)       | Endpoint discovery / Advertise the interfaces you actually support          | API & tool discovery / Publish where agents can connect                 | 3            |
| [catalogs](../src/data/homepage-guide.ts#L82)                 | Catalogs & feeds / Make collections available for discovery                 | Catalogs & feeds / Publish your product and content feeds               | 4            |
| [verifiable-trust](../src/data/homepage-guide.ts#L91)         | Verifiable trust / Back up claims about your resources                      | Publisher verification / Provide evidence for publisher claims          | 4            |
| [distribution](../src/data/homepage-guide.ts#L100)            | Official listings / Show up in the channels your customers use              | Official listings / List your official integrations                     | 6            |
| [agent-plugins](../src/data/homepage-guide.ts#L109)           | Agent plugins / Package integrations for the intended agent platform        | Agent plugins / Package a plugin for each supported platform            | 6            |
| [search-visibility](../src/data/homepage-guide.ts#L118)       | Search visibility / Check how agents find and describe you                  | Search visibility / Check how agents find and describe you              | Prose edit   |
| [product-purpose](../src/data/homepage-guide.ts#L136)         | Purpose & fit / Explain what your product is useful for                     | Product use cases / Explain when to use your product                    | 4            |
| [readable-pages](../src/data/homepage-guide.ts#L145)          | Readable content / Make the important content available as text             | Readable content / Make key information readable as text                | 6            |
| [page-metadata](../src/data/homepage-guide.ts#L154)           | Page metadata / Identify each page and its preferred URL                    | Page metadata / Set each page's identity and preferred URL              | Prose edit   |
| [structured-data](../src/data/homepage-guide.ts#L163)         | Structured data / Label your information consistently                       | Structured data / Label your information consistently                   | Prose edit   |
| [pricing](../src/data/homepage-guide.ts#L172)                 | Prices & terms / Publish the full cost and conditions                       | Prices & terms / Publish prices and purchase terms                      | 6            |
| [availability](../src/data/homepage-guide.ts#L181)            | Availability & freshness / Keep decision-making facts current               | Current availability / Keep availability and eligibility up to date     | 4            |
| [markdown](../src/data/homepage-guide.ts#L190)                | Markdown views / Offer a clean reading format                               | Markdown views / Provide Markdown versions of your pages                | 4            |
| [api-specification](../src/data/homepage-guide.ts#L199)       | OpenAPI / Describe your API in a usable specification                       | OpenAPI / Document your API with OpenAPI                                | 6            |
| [graphql-contract](../src/data/homepage-guide.ts#L208)        | GraphQL schemas / Make your GraphQL contract self-describing                | GraphQL schemas / Document your GraphQL schema                          | 1            |
| [tool-contracts](../src/data/homepage-guide.ts#L217)          | Tool names & schemas / Make each action unambiguous                         | Tool names & schemas / Describe what each tool accepts and returns      | 4            |
| [tool-behavior](../src/data/homepage-guide.ts#L226)           | Tool annotations / Declare the effects of an action                         | Tool behavior / Describe what each action can change                    | 3            |
| [task-guidance](../src/data/homepage-guide.ts#L235)           | Agent skills & examples / Show how to complete a real task                  | Agent skills & examples / Show how to complete a real task              | Prose edit   |
| [repo-instructions](../src/data/homepage-guide.ts#L244)       | Repository instructions / Give coding agents the project context            | Repository instructions / Document how to work on your codebase         | 4            |
| [retrieval-sources](../src/data/homepage-guide.ts#L253)       | Sources & context / Return enough evidence to trust an answer               | Source references / Show where an answer comes from                     | 4            |
| [auth-onboarding](../src/data/homepage-guide.ts#L271)         | Authentication / Provide a clear route to authorized access                 | Authentication / Provide a supported way for agents to sign in          | 4            |
| [auth-discovery](../src/data/homepage-guide.ts#L280)          | Auth discovery / Make the sign-in requirements discoverable                 | Authentication discovery / Publish your authentication requirements     | 6            |
| [agent-registration](../src/data/homepage-guide.ts#L289)      | auth.md & registration / Explain how an agent can obtain credentials        | auth.md & registration / Document agent registration with auth.md       | 6            |
| [signed-bot-identity](../src/data/homepage-guide.ts#L298)     | Signed bot identity / Verify who is sending automated requests              | Signed bot identity / Verify who is sending automated requests          | Prose edit   |
| [permissions](../src/data/homepage-guide.ts#L307)             | Scoped permissions / Give agents only the access they need                  | Scoped permissions / Give agents only the access they need              | Prose edit   |
| [accessible-ui](../src/data/homepage-guide.ts#L325)           | Accessible interfaces / Make your interface operable                        | Accessible interfaces / Make controls easy to identify and use          | 1            |
| [working-api](../src/data/homepage-guide.ts#L334)             | Action APIs / Expose the actions customers need                             | Product APIs / Make product actions available through an API            | 3            |
| [search-and-collections](../src/data/homepage-guide.ts#L343)  | Search & pagination / Help agents find the right record                     | Search & pagination / Make large collections searchable                 | 1            |
| [natural-language-search](../src/data/homepage-guide.ts#L352) | Natural-language search / Let agents query your content in natural language | Natural-language search / Support searches phrased as questions         | 6            |
| [mcp](../src/data/homepage-guide.ts#L361)                     | MCP servers / Connect your product to agent tools                           | MCP servers / Connect your product through MCP                          | 6            |
| [mcp-resources](../src/data/homepage-guide.ts#L370)           | MCP resources / Let agents read reference material through MCP              | MCP resources / Provide reference material through MCP                  | 6            |
| [developer-tools](../src/data/homepage-guide.ts#L379)         | Command-line tools / Support agents working in developer environments       | Command-line tools / Provide a CLI for automated tasks                  | 4            |
| [official-sdks](../src/data/homepage-guide.ts#L388)           | Official SDKs / Provide maintained client libraries                         | Official SDKs / Provide maintained client libraries                     | Prose edit   |
| [untrusted-content](../src/data/homepage-guide.ts#L397)       | Untrusted content / Keep external content separate from instructions        | Untrusted content / Keep external content separate from instructions    | Prose edit   |
| [human-control](../src/data/homepage-guide.ts#L406)           | Approvals & handoff / Keep people in control of consequential actions       | Approvals & handoff / Let customers review actions and take over        | 4            |
| [structured-errors](../src/data/homepage-guide.ts#L415)       | Actionable errors / Explain failures in a form agents can use               | Error responses / Explain what failed and how to recover                | 4            |
| [missing-pages](../src/data/homepage-guide.ts#L424)           | Missing-page recovery / Give agents a route out of a dead end               | Missing pages / Help agents recover from a missing page                 | 13           |
| [rate-limits](../src/data/homepage-guide.ts#L433)             | Limits & retries / Tell agents when to slow down or try again               | Limits & retries / Tell agents when they can retry                      | 6            |
| [safe-retries](../src/data/homepage-guide.ts#L442)            | Idempotency / Make repeated requests safe                                   | Safe retries / Make repeated requests safe                              | 1            |
| [jobs-and-bulk](../src/data/homepage-guide.ts#L451)           | Background & bulk work / Make long-running work trackable                   | Background & batch jobs / Report progress and failures for longer tasks | 4            |
| [verified-results](../src/data/homepage-guide.ts#L460)        | Outcome verification / Make the final result verifiable                     | Confirming results / Return a result the agent can check                | 4            |
| [compatibility](../src/data/homepage-guide.ts#L469)           | Versioning / Keep integrations working as the product changes               | Versioning / Plan for API and tool changes                              | 6            |
| [sandbox](../src/data/homepage-guide.ts#L478)                 | Test environments / Provide a safe place to try the integration             | Test environments / Provide a test environment                          | 6            |
| [journey-tests](../src/data/homepage-guide.ts#L487)           | Real-task testing / Test the whole journey with a real agent                | Task testing / Test complete tasks with a real agent                    | 1            |
| [monitoring](../src/data/homepage-guide.ts#L496)              | Monitoring / Learn where agent journeys fail                                | Monitoring / Find out where agent tasks fail                            | 1            |
| [webmcp](../src/data/homepage-guide.ts#L505)                  | WebMCP / Expose useful actions inside the page                              | WebMCP / Add browser tools with WebMCP                                  | 3            |
| [embedded-ui](../src/data/homepage-guide.ts#L514)             | MCP Apps / Bring a useful interface into the agent client                   | MCP Apps / Show interactive results in the conversation                 | 4            |
| [delegation](../src/data/homepage-guide.ts#L523)              | Agent delegation / Make delegated tasks explicit                            | Agent delegation / Define tasks that other agents can delegate          | 4            |
| [checkout](../src/data/homepage-guide.ts#L541)                | Checkout & payments / Support a purchase with clear authority               | Agent checkout / Let agents prepare and complete purchases              | 4            |
| [delegated-spending](../src/data/homepage-guide.ts#L550)      | Delegated spending / Define the permission to spend                         | Spending permissions / Set limits on what agents can spend              | 4            |
| [machine-payments](../src/data/homepage-guide.ts#L559)        | Machine payments / Let agents pay for individual resources                  | Pay-per-use access / Accept payment for individual resources            | 4            |

## Prose examples

| Card                               | Before                                                                                                                                | After                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Error responses: why it matters    | An agent can tell whether to correct an input, request permission, try later, or stop.                                                | Agents can decide whether to fix an input, ask for permission, try later, or stop.                      |
| Confirming results: why it matters | The agent can report what actually happened and link the customer to the result, rather than treating a success message as proof.     | Agents can tell the customer what actually happened and link to the result.                             |
| Agent checkout: why it matters     | An agent can prepare or complete a purchase within the customer's budget and consent, with an order that can be reconciled afterward. | Agents can prepare a purchase for approval, complete it when authorized, and check the resulting order. |
| Safe retries: why it matters       | A network retry should not create a second order, charge a customer twice, or repeat a destructive change.                            | Retrying after a network failure should not place a second order or charge the customer again.          |

## Verification

- Snapshot comparison confirmed all 56 card IDs, group assignments, ordering, and documentation links unchanged.
- Coverage validator passed: all 125 source checks remain mapped and documentation targets exist.
- Focused shared lint and formatting checks passed for the homepage and card data.
- Inspected rendered authentication cards at 1440px and retry cards at 390px. Mobile content width equals viewport width; all 56 cards render, overview anchors resolve, and the browser reported no console errors.
