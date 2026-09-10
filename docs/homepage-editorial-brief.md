# Homepage editorial brief

Status: expanded to five areas and 56 cards following a live criteria review; local preview.

## Settled direction

- Explain how to make an existing website or app usable by AI agents.
- Address informed product and business readers such as Jo or Adam. Explain unfamiliar concepts without patronizing the reader or removing useful technical detail.
- Use cards to cover the considerations, with an understandable sense of priority.
- Organize the homepage into five areas: Discoverability, Understandability, Auth & identity, Usability, and Payments.
- Each card explains the action to take, what the feature is, and why it matters, in simple language.
- Clicking a card goes directly to the relevant technical documentation. The explanation needed to understand the recommendation belongs on the card itself.
- Include a visual overview that groups the features into the five areas.
- Keep the docs as a comprehensive technical reference.
- Synthesize useful practices from external sources, including Ora and Is Agentic, into Agent Surface advice. Do not reproduce a vendor checklist or scoring system.

## Implementation

The homepage leads with making existing websites and apps work with agents. A linked visual map groups all 56 recommendations into five areas, followed by action-led cards. The documentation and glossary remain available as reference routes. The Surface skill remains available below the guide.

Content lives in `src/data/homepage-guide.ts`; presentation lives in `src/app/(home)/page.tsx`. Each recommendation has an action, feature name, explanation, reason, applicability label, and direct documentation link. The map and cards use the same data.

The recommendations synthesize related implementation concerns rather than giving each scanner check a card. For example, schema types and metadata quality belong together; REST and GraphQL job lifecycle checks inform the same recommendation. Payment protocols remain conditional implementations of a purchase journey. External authority is earned, not fabricated for a score.

## Five areas

1. **Discoverability — Can agents find you?** Help agents find the website or app and the right place to start.
2. **Understandability — Can agents understand what you offer?** Explain capabilities, information, and limits clearly enough for an agent to judge what is relevant.
3. **Auth & identity — Can agents act with the right permissions?** Make registration, identity, scopes, and revocation explicit.
4. **Usability — Can agents get things done?** Help agents carry out permitted tasks, recover from problems, and confirm the result.
5. **Payments — Can agents pay within agreed limits?** Connect checkout, delegated spending, and paid-resource access to a verified outcome.

## Agreed presentation

- A compact overview of the five areas, followed by grouped cards in the same order.
- Action-led card titles with a short explanation and a concrete reason to care.
- Put broadly useful foundations first within each stage.
- Identify conditional recommendations with simple wording such as “If customers sign in” or “If you sell things.” Emerging features should be clearly identified rather than presented as universal requirements.

- Keep every recommendation visible. Do not require a product selector or hide conditional features behind filters.
- Use clear professional language, retaining useful terms such as OpenAPI, OAuth, and MCP with context.
- The overview links to individual cards; cards link directly to the relevant docs.

## Initial verification (42-card version)

TypeScript, documentation integrity, and scoped formatting/lint checks passed. All card documentation targets resolve to existing pages. Browser review covered the desktop overview and cards, the overview → OpenAPI card → documentation path, and mobile cards and footer. All 42 cards render without filtering; overview anchors resolve. Mobile content fits the 390px viewport after correcting the skill-install block. No browser console errors were reported. Changes remain local.

## Current coverage review

See [the live-source coverage record](homepage-coverage-2026-09-10.md) for the 125-check mapping, added cards, source versions, adaptations, and verification of the expanded homepage. All cards remain visible.

## Copy review

All 56 cards received a signage and deslop pass on 2026-09-10. See the [card-by-card copy review](homepage-copy-review-2026-09-10.md) for wording changes, findings, and verification.

## Glossary carousel restored

Restored the original patterned term cards between the overview and recommendations. The shared glossary now contains 53 terms (29 additions), including discovery formats, API contracts, identity, reliability, and payment protocols. The full glossary retains category filters; new entries link to their implementation guides. Counts are derived from the shared data.

Added carousel navigation buttons, keyboard focus containment and return for expanded cards, and scrolling for tall definitions. The grid now fits narrow screens. Desktop and 390px browser checks exercised scrolling, expansion, Escape, focus return, payment filtering, and navigation to the MPP reference.

Definitions use the canonical guide pages. Protocol descriptions were checked against [UCP](https://ucp.dev/), [AP2](https://ap2-protocol.org/), [x402](https://x402.org/), [auth.md](https://github.com/workos/auth.md), and the [WebMCP draft](https://webmachinelearning.github.io/webmcp/) on 2026-09-10; MPP follows the reference verified earlier that day. No adoption or universal-compatibility claims are implied.
