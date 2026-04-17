/**
 * langgraph-supervisor.ts
 *
 * LangGraph-JS supervisor pattern: one orchestrator node routes work to
 * N specialist worker nodes using Command return values.
 *
 * When to use: When you have clearly separable subtasks (e.g., research + review + write)
 * and want a central supervisor to coordinate them. Supervisor decomposes work,
 * distributes to specialists, synthesizes results.
 *
 * Key pattern:
 * - Typed state schema (Annotation.Root)
 * - supervisor() node: router logic that sends Command("goto", node)
 * - worker nodes: process one subtask, return results via state reducer
 * - Checkpointer: survive crashes + HITL interrupts
 *
 * ⚠️  Cognition consensus: "Single agent with tools is usually better."
 * Multi-agent adds complexity; justify only for clear task separation.
 * See: https://cognition.ai/blog/dont-build-multi-agents
 *
 * Citation: https://langchain-ai.github.io/langgraphjs/
 * State management: https://langchain-ai.github.io/langgraphjs/concepts/low_level_conceptual_index/#state
 * Supervisor pattern: https://langchain-ai.github.io/langgraphjs/tutorials/agents/multi_agent_systems/
 *
 * CUSTOMISE:
 * - Define your AgentState schema (what state fields you need)
 * - Implement supervisor() logic (routing heuristic)
 * - Add worker node functions (fetch, review, write, etc.)
 * - Point to actual LLM (Claude, GPT-5, etc.)
 */

import { Annotation, StateGraph, START, END, Command } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { Anthropic } from '@anthropic-ai/sdk';

// ============================================================================
// STATE SCHEMA (typed, required for LangGraph)
// ============================================================================

/**
 * Define all fields your workflow needs. Each field has a type and optional reducer.
 * <CUSTOMISE> Add fields for your tasks.
 */
const AgentState = Annotation.Root({
  // Input from parent/user
  user_task: Annotation<string>({
    description: 'The original user request or task description',
  }),

  // Supervisor state
  supervisor_decision: Annotation<string>({
    description: 'Which worker to route to next (or "end")',
  }),

  // Worker results (accumulated)
  research_results: Annotation<string>({
    description: 'Output from research worker',
    default: '',
  }),
  review_feedback: Annotation<string>({
    description: 'Output from review worker',
    default: '',
  }),
  final_output: Annotation<string>({
    description: 'Final synthesized result',
    default: '',
  }),

  // Metadata
  step_count: Annotation<number>({
    description: 'Number of steps executed (prevent infinite loops)',
    default: 0,
  }),
  messages: Annotation<Array<{ role: 'user' | 'assistant'; content: string }>>({
    description: 'Conversation history for LLM',
    default: [],
  }),
});

type AgentStateType = typeof AgentState.State;

// ============================================================================
// SUPERVISOR NODE (routing logic)
// ============================================================================

/**
 * Supervisor decomposes the user task into subtasks and routes to workers.
 * Returns Command("goto", nextNode) to navigate the graph.
 * <CUSTOMISE> Implement your routing heuristic here.
 */
async function supervisorNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const systemPrompt = `You are a task supervisor. Decompose the user's request into steps and route to workers.
Possible workers: research, review, write.
Your job: analyze the task, decide which worker to route to, or decide to END.

Respond with ONLY one of these:
- "route:research" — Send task to research worker
- "route:review" — Send to review worker
- "route:write" — Send to write worker
- "end" — All done, synthesis complete`;

  const userMessage = `Task: ${state.user_task}

Current state:
- Research done? ${state.research_results ? 'Yes' : 'No'}
- Review done? ${state.review_feedback ? 'Yes' : 'No'}
- Steps taken: ${state.step_count}

Where should we go next?`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 100,
    system: systemPrompt,
    messages: [
      ...state.messages,
      { role: 'user', content: userMessage },
    ],
  });

  const supervisorChoice =
    response.content[0]?.type === 'text' ? response.content[0].text.trim() : 'end';

  const nextNode =
    supervisorChoice.includes('route:research') ? 'research' :
    supervisorChoice.includes('route:review') ? 'review' :
    supervisorChoice.includes('route:write') ? 'write' :
    END;

  return {
    supervisor_decision: supervisorChoice,
    step_count: state.step_count + 1,
    messages: [
      ...state.messages,
      { role: 'assistant', content: supervisorChoice },
    ],
  };
}

// ============================================================================
// WORKER NODES (actual task execution)
// ============================================================================

/**
 * Research worker: gather information.
 * <CUSTOMISE> Replace with your actual research logic.
 */
async function researchNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `Research the following task and provide key findings:\n\n${state.user_task}`,
      },
    ],
  });

  const findings =
    response.content[0]?.type === 'text' ? response.content[0].text : '';

  return {
    research_results: findings,
    messages: [
      ...state.messages,
      { role: 'assistant', content: `[research worker completed]` },
    ],
  };
}

/**
 * Review worker: evaluate research and provide feedback.
 * <CUSTOMISE> Replace with your review logic.
 */
async function reviewNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Review the following research and provide constructive feedback:\n\n${state.research_results}`,
      },
    ],
  });

  const feedback =
    response.content[0]?.type === 'text' ? response.content[0].text : '';

  return {
    review_feedback: feedback,
    messages: [
      ...state.messages,
      { role: 'assistant', content: `[review worker completed]` },
    ],
  };
}

/**
 * Write worker: synthesize final output.
 * <CUSTOMISE> Replace with your synthesis logic.
 */
async function writeNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `Synthesize the following into a final, polished output:
Original task: ${state.user_task}
Research: ${state.research_results}
Review feedback: ${state.review_feedback}

Write final output that incorporates all feedback:`,
      },
    ],
  });

  const output =
    response.content[0]?.type === 'text' ? response.content[0].text : '';

  return {
    final_output: output,
    messages: [
      ...state.messages,
      { role: 'assistant', content: `[write worker completed]` },
    ],
  };
}

// ============================================================================
// GRAPH CONSTRUCTION
// ============================================================================

export function createSupervisorWorkflow() {
  const workflow = new StateGraph(AgentState)
    // Add nodes
    .addNode('supervisor', supervisorNode)
    .addNode('research', researchNode)
    .addNode('review', reviewNode)
    .addNode('write', writeNode)

    // Define edges
    // From START -> supervisor (always start with supervisor)
    .addEdge(START, 'supervisor')

    // Supervisor decides next node dynamically
    .addConditionalEdges(
      'supervisor',
      (state: AgentStateType) => {
        if (state.supervisor_decision.includes('route:research')) return 'research';
        if (state.supervisor_decision.includes('route:review')) return 'review';
        if (state.supervisor_decision.includes('route:write')) return 'write';
        return END;
      }
    )

    // Workers route back to supervisor for next decision
    .addEdge('research', 'supervisor')
    .addEdge('review', 'supervisor')
    .addEdge('write', 'supervisor')

    // Compile with checkpointer (survives crashes)
    .compile({
      checkpointer: new MemorySaver(),
      // <CUSTOMISE> Optional: add interrupt_before for HITL
      // interrupt_before: ['supervisor']
    });

  return workflow;
}

// ============================================================================
// EXECUTION EXAMPLE
// ============================================================================

export async function runSupervisorExample() {
  const workflow = createSupervisorWorkflow();

  const input = {
    user_task: 'Write a blog post about TypeScript best practices for AI agents',
  };

  // Create a thread (checkpoint identity)
  const threadId = `thread-${Date.now()}`;

  // Run the workflow
  // <CUSTOMISE> Configure maxSteps to prevent infinite loops
  const result = await workflow.invoke(input, {
    configurable: { thread_id: threadId },
  });

  console.log('=== Supervisor Workflow Complete ===');
  console.log('Steps taken:', result.step_count);
  console.log('Final output:');
  console.log(result.final_output);

  return result;
}

// ============================================================================
// MULTI-AGENT NOTE
// ============================================================================

/**
 * Why this pattern:
 * - Supervisor orchestrates; workers are stateless
 * - State schema typed (no surprises)
 * - Checkpointer recovers from failures
 * - Each worker is small and focused
 *
 * When to reconsider:
 * - Cognition: "Don't build multi-agents" (https://cognition.ai/blog/dont-build-multi-agents)
 * - Single agent + 3–5 tools often simpler, cheaper, faster
 * - Only use multi-agent for clear task decomposition
 *
 * Lilian Weng: agent = LLM + tools + memory. Multi-agent = composition.
 * Start single; decompose only when justified by performance or correctness.
 */
