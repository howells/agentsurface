# Agent Surface

Agent Surface is a field guide and implementation kit for engineering teams making software operable by agents.

## Language

**Agent Surface**:
The field guide and implementation kit for making software operable by agents.
_Avoid_: Agent framework, agent platform, standard

**agent surface**:
The complete set of contact points through which agents discover, understand, retrieve from, act through, recover from, and are evaluated against software.
_Avoid_: Integration, API layer

**surface channel**:
An applicable kind of contact point through which agents use software, such as documentation, an API, a CLI, MCP, or a tool contract. A system need not expose every channel.
_Avoid_: Required protocol, integration

**operability quality**:
An observable property that applies across one or more surface channels, such as discoverability, authorization, recoverability, retrievability, or evaluability.
_Avoid_: Feature, maturity level

**agent-operable software**:
Software that agents can use reliably within explicit permission, side-effect, and recovery boundaries.
_Avoid_: Agent-readable software, AI-enabled software

**software agent**:
An AI-directed software actor that pursues tasks by selecting and using external capabilities. Coding agents are one example, not the category boundary.
_Avoid_: Coding agent, chatbot

**representative agent task**:
An end-to-end goal that reflects how agents are expected to use the software, including relevant permissions, side effects, and recovery paths.
_Avoid_: Prompt, unit test

**agent-surface engineering**:
The discipline of designing and improving the contact points through which agents use software.
_Avoid_: Agent engineering, AI integration

## Product

**guide**:
The canonical, evidence-backed engineering guidance for agent-surface engineering. It does not define conformance requirements.
_Avoid_: Standard, specification

**surface skill**:
The intent-routed workflow that applies the guide to a software repository through Guide, Audit, or Scaffold.
_Avoid_: CLI, agent framework

**implementation kit**:
The reusable templates and specialist guidance that help teams apply the guide.
_Avoid_: Toolchain, software development kit

**Guide route**:
The read-only application of the guide to explain agent-surface concepts and support decisions.
_Avoid_: Audit, documentation site

**Audit route**:
The evidence-backed diagnosis of a software system's agent operability. Its score, plan, and transformation modes remain diagnostic rather than certifying conformance.
_Avoid_: Compliance audit, certification

**Scaffold route**:
The creation or extension of agent surfaces and their evaluation harnesses. Generic agent-stack generation is outside this route unless it directly consumes or validates a surface.
_Avoid_: Agent generator, application scaffolder

**scorecard**:
A diagnostic summary of evidence and judgment about applicable surface channels and their operability qualities.
_Avoid_: Certification, conformance report
