/**
 * agents-sdk-handoff.ts
 *
 * OpenAI Agents SDK example with agent-to-agent handoffs.
 * Demonstrates guardrails + handoff + output schema enforcement.
 *
 * When to use: Building multi-agent workflows with OpenAI. Each agent is a Tool
 * that can return another Agent. Handoffs preserve full conversation history.
 *
 * Key patterns:
 * - Agents are Tools; handoffs are function calls that return new agents
 * - Input guardrails: validate input before agent starts
 * - Output guardrails: validate final response shape
 * - Built-in tracing: OpenTelemetry export
 *
 * ⚠️  Cognition: Single agent with tools is simpler. Only multi-agent for clear
 * task decomposition. Use this pattern when you've proven you need delegation.
 *
 * Citation: https://openai.github.io/openai-agents-js/
 * Guardrails: https://github.com/openai/openai-guardrails-python
 * Responses API: https://platform.openai.com/docs/guides/migrate-to-responses
 *
 * CUSTOMISE:
 * - Define your agents (writer, editor, reviewer, etc.)
 * - Implement handoff conditions (when to delegate)
 * - Set input/output guardrails for your domain
 * - Connect to actual tools via @openai/agents
 */

import {
  Agent,
  Tool,
  Guardrail,
  InputGuardrail,
  OutputGuardrail,
  ToolGuardrail,
} from '@openai/agents';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// ============================================================================
// OUTPUT SCHEMAS (enforce response shape)
// ============================================================================

/**
 * Writer agent output: article markdown with metadata.
 * <CUSTOMISE> Define schema for your task.
 */
const WriterOutputSchema = z.object({
  title: z.string().describe('Article title'),
  body: z.string().describe('Article content in Markdown'),
  tags: z.array(z.string()).describe('SEO tags'),
  readtime_minutes: z.number().describe('Estimated read time'),
});

/**
 * Editor agent output: feedback on article.
 */
const EditorOutputSchema = z.object({
  feedback: z.string().describe('Editorial feedback'),
  suggestions: z.array(z.string()).describe('Specific improvements'),
  ready_to_publish: z.boolean().describe('Is article ready?'),
});

// ============================================================================
// INPUT GUARDRAILS (validate before agent runs)
// ============================================================================

/**
 * Guardrail: reject requests for harmful content.
 * <CUSTOMISE> Add domain-specific checks.
 */
const inputGuardrail = new InputGuardrail({
  name: 'content-policy',
  description: 'Reject harmful content requests',
  execute: async (input: string) => {
    const forbidden = ['hate', 'violence', 'illegal'];
    for (const word of forbidden) {
      if (input.toLowerCase().includes(word)) {
        return {
          tripwire_triggered: true,
          reason: `Input contains forbidden topic: ${word}`,
        };
      }
    }
    return { tripwire_triggered: false };
  },
});

// ============================================================================
// TOOL GUARDRAILS (validate tool calls)
// ============================================================================

/**
 * Guardrail: ensure tool calls have valid parameters.
 */
const toolGuardrail = new ToolGuardrail({
  name: 'tool-safety',
  description: 'Validate tool parameters before execution',
  execute: async (toolName: string, params: any) => {
    // Example: prevent excessively long inputs
    if (JSON.stringify(params).length > 50000) {
      return {
        tripwire_triggered: true,
        reason: 'Input too large (>50KB)',
      };
    }
    return { tripwire_triggered: false };
  },
});

// ============================================================================
// OUTPUT GUARDRAILS (validate final response)
// ============================================================================

/**
 * Guardrail: ensure output matches schema and has minimum quality.
 */
const outputGuardrail = new OutputGuardrail({
  name: 'output-quality',
  description: 'Ensure output meets minimum quality standards',
  execute: async (output: any) => {
    // Check required fields
    if (!output.title || output.title.length < 10) {
      return {
        tripwire_triggered: true,
        reason: 'Title too short (<10 chars)',
      };
    }
    if (!output.body || output.body.length < 500) {
      return {
        tripwire_triggered: true,
        reason: 'Body too short (<500 chars)',
      };
    }
    return { tripwire_triggered: false };
  },
});

// ============================================================================
// TOOLS (agents as tools; handoffs)
// ============================================================================

/**
 * Tool: Delegate to editor agent.
 * Returns another Agent; OpenAI Agents SDK will invoke it.
 */
const delegateToEditorTool = new Tool({
  name: 'delegate_to_editor',
  description: 'Hand off article to editor agent for feedback and improvements',
  parameters: zodToJsonSchema(
    z.object({
      article: z.string().describe('Article content to edit'),
    })
  ),
  execute: async (params: any) => {
    // Return an Agent (not a direct result)
    return editorAgent;
  },
});

/**
 * Tool: Delegate to reviewer agent.
 */
const delegateToReviewerTool = new Tool({
  name: 'delegate_to_reviewer',
  description: 'Hand off to fact-checker / reviewer',
  parameters: zodToJsonSchema(
    z.object({
      article: z.string().describe('Article to review'),
    })
  ),
  execute: async () => {
    return reviewerAgent;
  },
});

// ============================================================================
// AGENTS
// ============================================================================

/**
 * Writer agent: generates article.
 * Can hand off to editor if it wants feedback.
 * <CUSTOMISE> Implement your writer prompt.
 */
const writerAgent = new Agent({
  name: 'writer',
  description: 'Write articles on given topics',
  model: 'gpt-5.4',
  tools: [delegateToEditorTool],
  inputGuardrails: [inputGuardrail],
  outputGuardrails: [outputGuardrail],
  outputSchema: zodToJsonSchema(WriterOutputSchema),
  instructions: `You are a professional writer. Given a topic:
1. Research the topic (use your knowledge)
2. Outline the article
3. Write engaging content
4. If you want editorial feedback, use delegate_to_editor
5. Return final article in JSON format with title, body, tags, readtime_minutes`,
});

/**
 * Editor agent: provides feedback and improves article.
 * Can hand off to reviewer if fact-check needed.
 */
const editorAgent = new Agent({
  name: 'editor',
  description: 'Edit and improve articles',
  model: 'gpt-5.4',
  tools: [delegateToReviewerTool],
  toolGuardrails: [toolGuardrail],
  outputGuardrails: [outputGuardrail],
  outputSchema: zodToJsonSchema(EditorOutputSchema),
  instructions: `You are a senior editor. Review the article for:
1. Clarity and flow
2. Grammar and style
3. Engagement and voice
4. Whether it's ready to publish
If you need fact-checking, use delegate_to_reviewer.
Return feedback as JSON with feedback, suggestions, ready_to_publish.`,
});

/**
 * Reviewer agent: fact-checks and validates.
 * Final agent; does not delegate further.
 */
const reviewerAgent = new Agent({
  name: 'reviewer',
  description: 'Fact-check and validate articles',
  model: 'gpt-5.4',
  outputGuardrails: [outputGuardrail],
  outputSchema: zodToJsonSchema(
    z.object({
      verified: z.boolean().describe('Are facts correct?'),
      corrections: z.array(z.string()).describe('Needed corrections'),
      final_status: z.enum(['approved', 'needs_revision']),
    })
  ),
  instructions: `You are a fact-checker. Validate the article:
1. Check key claims against your knowledge
2. Identify any errors or unsupported statements
3. Recommend corrections
4. Give final approval status
Return result as JSON.`,
});

// ============================================================================
// EXECUTION EXAMPLE
// ============================================================================

export async function runHandoffExample() {
  // Create a session (conversation thread)
  const session = writerAgent.createSession();

  const topic = 'The history of TypeScript and its impact on web development';

  try {
    // Start with writer agent
    console.log('=== Agents SDK Handoff Example ===');
    console.log(`Task: Write article on "${topic}"`);
    console.log('');

    // Run writer (may hand off to editor)
    const writerResult = await session.run(
      `Write an article about: ${topic}`
    );

    console.log('Writer output:');
    console.log(writerResult);
    console.log('');

    // If writer handed off to editor, the result is editor output
    // If editor handed off to reviewer, result is reviewer output
    // Handoffs preserve conversation history automatically

    console.log('=== Workflow complete ===');
    console.log('Conversation length:', session.messages.length, 'messages');

    return writerResult;
  } catch (error) {
    console.error('Workflow failed:', error);
    throw error;
  }
}

// ============================================================================
// TRACING & OBSERVABILITY
// ============================================================================

/**
 * OpenAI Agents SDK exports OpenTelemetry traces automatically.
 * Connect to Langfuse, Arize Phoenix, Datadog, or other OTEL backend.
 *
 * Example (Langfuse):
 * import { observe } from "langfuse";
 *
 * // Traces are auto-exported; configure via env:
 * process.env.LANGFUSE_SECRET_KEY = '...';
 * process.env.LANGFUSE_PUBLIC_KEY = '...';
 */

// ============================================================================
// STRICT MODE NOTE
// ============================================================================

/**
 * OpenAI Agents SDK enforces strict: true by default on tool schemas.
 * This means:
 * - additionalProperties: false on all objects
 * - Enums must be exhaustive
 * - No union types in nested objects
 * - All fields typed exactly
 *
 * zodToJsonSchema output must satisfy these constraints.
 * If you get schema validation errors, check for:
 * - Optional fields (use z.optional() or z.union([...]).optional())
 * - Union types (flatten or use discriminated unions)
 * - Extra fields (ensure .strict() on Zod objects)
 *
 * Citation: https://platform.openai.com/docs/guides/function-calling
 */

// ============================================================================
// HANDOFF PATTERNS
// ============================================================================

/**
 * Pattern 1: Agent decides to hand off
 * - Agent evaluates its output
 * - If high quality: return result
 * - If needs review: call delegateToEditor tool
 * - OpenAI SDK routes to editor agent; conversation continues
 *
 * Pattern 2: Multi-step delegation
 * - Writer -> Editor (feedback) -> Reviewer (fact-check) -> Done
 * - Each handoff preserves conversation history
 * - Reviewer's output is final result to user
 *
 * Pattern 3: Cost optimization
 * - Simple tasks: use cheap agent (gpt-5.4-mini)
 * - Escalate to premium agent (gpt-5.4) if needed
 * - Example: writer-mini generates draft -> editor (full model) refines
 */
