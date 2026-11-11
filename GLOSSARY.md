# Agent Surface

A field guide and implementation kit for engineering teams making software operable by agents.

## Language

**agent surface**:
The complete set of contact points through which agents discover, understand, retrieve from, act through, recover from, and are evaluated against software.
_Avoid_: Integration, API layer

**guide**:
The canonical, evidence-backed engineering guidance. It does not define conformance requirements.
_Avoid_: Standard, specification

**surface skill**:
The intent-routed workflow that applies the guide to a software repository through its Guide, Audit or Scaffold workflow.
_Avoid_: CLI, agent framework

**Audit**:
Evidence-backed diagnosis of a system's agent operability. Its score, plan and transformation modes are diagnostic and never certify conformance.
_Avoid_: Compliance audit, certification

**Scaffold**:
Creation or extension of agent surfaces and their evaluation harnesses. Generic agent-stack generation is outside it unless it consumes or validates a surface.
_Avoid_: Agent generator, application scaffolder

**scorecard**:
A diagnostic summary of evidence and judgment about a system's agent surface.
_Avoid_: Certification, conformance report

**Markdown twin**:
The Markdown representation of a page, served at `<path>.md` or for `Accept: text/markdown`, with the same content as the HTML.
_Avoid_: Markdown mirror, text version

**agent-building inventory**:
The secondary part of the site: condensed current practice and a curated list of tools for teams building their own agents. It sits outside the guide and the surface skill.
_Avoid_: Core guidance, agent framework

**agent retrieval**:
How an agent finds and uses knowledge for its own work (vector search, embeddings, RAG). It belongs to the agent-building inventory; retrievability, the product's side, belongs to the guide.
_Avoid_: Retrievability
