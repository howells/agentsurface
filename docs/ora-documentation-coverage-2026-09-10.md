# Ora research and documentation synthesis — 2026-09-10

The Ora catalog retrieved for research (contract 1.24.0) contains 125 checks: 16 Discovery, 41 Access, 62 Usability, and 6 Payments. The initial implementation below mirrored that catalog. Daniel clarified that the intended result is general advice composed into Agent Surface, rather than an Ora reference. The initial reference pages, generator, bundled catalog, and scanner-specific template were removed before publication.

## Initial reference approach (superseded)

- Docs: `/docs/scoring/ora-reference` and four layer references, with a guide link, applicability condition, and verification evidence for every ID. Scanner labels are recorded separately from Surface advice.
- Docs: new guides for ARD/AI Catalog/NLWeb feeds, commercial and entity discovery, browser accessibility, REST/GraphQL retrieval and jobs, and MPP.
- Docs: linked existing indexes and canonical guides; clarified NLWeb's server-side role, payment authorization boundaries, Markdown recovery, and sandbox evidence.
- Skill: `references/ora.md` routes future audits; `references/ora-checks.json` preserves the catalog facts and coverage mapping. Updated the public skill digest after extending SKILL.md.
- Template: `templates/discovery/ora-audit-record.md` keeps original scanner findings separate from applicability, decisions, and runtime evidence.
- Maintenance: `scripts/sync-ora-reference.mjs` generates layer pages. The existing docs integrity command checks mapping completeness, guide paths, overview counts/version/date, and generated-page consistency. No network scan runs in builds.

## Verification

- All 125 saved IDs and scanner metadata match the retrieved live `/api/checks` catalog.
- `pnpm docs:check` passes, including internal links, navigation coverage, skill digest, and generated-reference consistency.
- Focused shared lint/format checks pass for the new and modified integrity scripts.
- All ten new documentation routes returned HTTP 200 and rendered headings through the local Next/Fumadocs server.
- Playwright loaded the overview; visual inspection confirmed readable content, the layer table, and sidebar links. An initial generated-comment MDX compilation error was fixed and the successful render rechecked.

## Limits and source discrepancies

This is documentation coverage, not an assertion that every target implements every protocol. ARD's current specification owns its schema independently from AI Catalog; Ora's blanket interchangeability recommendation needs consumer-specific verification. NLWeb reference REST documentation uses a different streaming option shape from Ora's recommendation, so the guide records that discrepancy rather than inventing conformance. Existing dated adoption observations in the commerce overview were not treated as newly verified deployment facts.

Changes are local at the time of this record. No production deployment or new scanner score is claimed. Pre-existing consumer-auth documentation edits were preserved.

## Final composition

The canonical guide is now `/docs/scoring/product-journeys`. It connects existing dimensions around a user task: entry point, authoritative decision facts, permission, action, recovery, and verified final state. The existing rubric and skill now use that evidence without adopting vendor weights or requiring a protocol inventory.

Catalog/feed, commercial/entity, browser accessibility, API lifecycle, and MPP guides retain useful technical advice with primary-source links. Product truth includes availability, terms, freshness, and revalidation before commitment. Ora remains in the tooling catalog as an optional evidence source.

The source snapshot is archived at `docs/research/ora-checks-2026-09-10.json` for provenance only. Its guide mappings are historical research annotations, not a maintained compatibility contract. The reusable template is now `templates/discovery/product-journey-audit.md`; the skill reference is `skills/surface/references/product-journeys.md`.

## Homepage follow-up

The [2026-09-10 homepage review](homepage-coverage-2026-09-10.md) re-fetched the live Ora catalog and Is Agentic methodology, traced all 125 public check IDs to 56 homepage cards, and separated Auth & identity and Payments into their own areas. It records current editorial decisions separately from the original archived guide annotations.
