# Tool naming review — 7 September 2026

Updated surfaces: published naming guidance, the Surface skill's tool-design reference and naming conventions, its tool-design writer prompt, and discovery templates.

## Finding

Use ordinary task language. Lowercase `verb_noun` is Agent Surface's default for consistency, not an MCP restriction or a universally demonstrated model-performance advantage. Remove infrastructure-only choices from a task agent's interface. Keep provenance and freshness in results, with connection handling in application code.

The canonical explanation, worked examples and primary-source comparison are in [Naming and Descriptions](../src/content/docs/tool-design/naming-and-descriptions.mdx). This resolves the older scaffold convention that requested kebab-case tool IDs while the tool-design guidance requested snake_case.

## Research method

Exa search and Tavily search ran successfully in parallel. Exa found Anthropic's tool-definition and tool-design guidance; Tavily found MCP SEP-986. The underlying pages were read directly. Exa contents and Tavily extract then successfully retrieved the relevant Anthropic, current MCP and OpenAI passages. Google and Claude documentation were also read directly. Irrelevant search hits and duplicate URLs were excluded.

Credentials were injected into subprocess environments from existing local configuration. No key was copied into this repository or printed. This was a bounded primary-source review, not a tool-selection benchmark. No claim is made that the revised names improve model accuracy without an evaluation.

## Sources

- [MCP tool names](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#tool-names): protocol recommendations, valid examples and cross-server disambiguation.
- [MCP SEP-986](https://modelcontextprotocol.io/seps/986-specify-format-for-tool-names): naming-format proposal context; current specification governs.
- [Anthropic tool design](https://www.anthropic.com/engineering/writing-tools-for-agents): task boundaries and evaluation-dependent namespace placement.
- [Claude tool definitions](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools): adapter limits and description guidance.
- [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling#best-practices-for-defining-functions): intuitive functions and work that belongs in code.
- [Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling#best-practices): descriptive names and clear parameter definitions.

## Verification

`pnpm docs:check` passed. No deployment or push was performed.
