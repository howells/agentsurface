# Product journey evidence

For a public product or integration audit, use a representative user task to connect the existing Surface dimensions. The canonical guide is https://agentsurface.dev/docs/scoring/product-journeys. This is an evidence lens within the current rubric, not another scoring system.

1. Define the task, intended client, acting identity, authorized boundary, and observable completion condition.
2. Start from a public or intended entry point. Follow available discovery links; record any private knowledge needed to reach the capability.
3. Verify decision facts against the owned source: identity, prices, units, availability, limits, regional constraints, and terms where relevant. Compare visible and machine-readable representations of one real item.
4. Exercise the chosen API, CLI, MCP, or browser path. Check contract and UI semantics, permissions, and the result. Additional interfaces are conditional on actual consumer needs.
5. Test a meaningful failure and recovery. Reconcile interrupted mutations by stable identity; verify idempotency where retries can repeat effects.
6. Observe the authoritative final state within the authorized test boundary. Separate acceptance, completion, payment, and fulfillment when they are distinct.
7. Assign each root cause to an existing scoring dimension, with evidence, impact, an owner, and a targeted fix. Avoid counting one defect under several dimensions merely because it crosses interfaces.

Use `templates/discovery/product-journey-audit.md` in this repository, or retain equivalent fields in the target project's existing audit format. External scanners are evidence sources: preserve report date and observed behavior, assess applicability, and reproduce relevant findings. Do not inherit their weights, protocol adoption requirements, or universal platform-listing assumptions.

Useful guides:

- /docs/discovery/catalogs-and-feeds — discover real resources and validate advertised targets.
- /docs/discovery/commercial-and-entity-discovery — authoritative decision facts, identity, and distribution.
- /docs/agentic-ui/browser-agent-accessibility — browser semantics and untrusted content.
- /docs/api-surface/retrieval-and-job-contracts — pagination, jobs, bulk operations, and partial errors.
- /docs/authentication — authority and credential boundaries.
- /docs/error-handling — safe recovery.
