# Multi-Provider Model Routing

Configure agents to use different model providers based on environment variables
or runtime bindings. This pattern lets you switch between free tiers (Google AI),
cost-effective routing (OpenRouter), direct API access (Anthropic, OpenAI),
gateway policy layers (Cloudflare AI Gateway), Workers-native inference
(Workers AI), and local subscriptions (Envelope) without changing agent code.

## The Model Function

Create a single `model.ts` that all agents import:

```typescript
// agents/model.ts
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

type Provider = "google" | "openrouter" | "anthropic" | "openai";

const DEFAULTS: Record<Provider, string> = {
  google: "gemini-2.5-flash",
  openrouter: "google/gemini-2.5-flash",
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4.1-mini",
};

export function agentModel(overrideModel?: string) {
  const provider = (process.env.AGENT_PROVIDER || "google") as Provider;
  const modelId = overrideModel || process.env.AGENT_MODEL || DEFAULTS[provider];

  switch (provider) {
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return google(modelId);
    }

    case "openrouter": {
      const routerModel = process.env.OPENROUTER_MODEL || modelId;
      return {
        id: routerModel,
        url: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      };
    }

    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(modelId);
    }

    case "openai": {
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      return openai(modelId);
    }

    default:
      throw new Error(`Unknown AGENT_PROVIDER: ${provider}`);
  }
}
```

## Usage in Agents

```typescript
import { agentModel } from "./model";

export const myAgent = new Agent({
  id: "my-agent",
  model: agentModel(),         // Uses env-based default
  // or
  model: agentModel("claude-opus-4-6"),  // Override for specific agent
  // ...
});
```

## Environment Variables

```bash
# Provider selection (required)
AGENT_PROVIDER=google          # google | openrouter | anthropic | openai

# Model override (optional — uses provider default if unset)
AGENT_MODEL=gemini-2.5-flash

# Provider-specific keys
GOOGLE_GENERATIVE_AI_API_KEY=...   # For google provider
OPENROUTER_API_KEY=...              # For openrouter provider
OPENROUTER_MODEL=...                # OpenRouter model ID override
ANTHROPIC_API_KEY=...               # For anthropic provider
OPENAI_API_KEY=...                  # For openai provider

# Cloudflare AI Gateway, when used from a Node/server app through a compatible SDK
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_AI_GATEWAY_ID=...
CLOUDFLARE_API_TOKEN=...
```

## Cloudflare-Native Variant

Treat Cloudflare as two distinct surfaces:

| Surface | What It Is | Generate When |
|---------|------------|---------------|
| **AI Gateway** | Gateway, policy, logging, caching, rate control, provider routing | The app wants central model governance across providers |
| **Workers AI** | Runtime-bound inference available through Workers bindings | The agent runs inside Cloudflare Workers |

For Workers-native projects, do not force model access through Node-style
`process.env` helpers. Generate code that receives bindings through the Worker
`env` object and keeps provider selection close to the request/runtime boundary.

```typescript
export interface Env {
  AI: Ai;
  AI_GATEWAY?: string;
}

export async function runWorkersAI(
  env: Env,
  prompt: string,
  model = "@cf/meta/llama-3.1-8b-instruct"
) {
  return env.AI.run(model, { prompt });
}
```

For Node/server projects that use Cloudflare AI Gateway as a provider gateway,
prefer the provider SDK or OpenAI-compatible client the project already uses and
configure its base URL/API key through env vars. Keep the public `agentModel()`
interface the same so agents do not care which gateway is active.

## Provider Comparison

| Provider | Cost | Best For | Rate Limits |
|----------|------|----------|-------------|
| **Google AI** | Free tier available | Development, prototyping | 15 RPM, 1M tokens/min |
| **OpenRouter** | ~$0.01-0.50/1M tokens | Cost optimization, model variety | Varies by model |
| **Anthropic** | ~$3-15/1M tokens | Quality-critical agents | Standard API limits |
| **OpenAI** | ~$0.15-60/1M tokens | GPT ecosystem, function calling | Standard API limits |
| **Cloudflare AI Gateway** | Gateway pricing + provider costs | Provider governance, logs, caching, fallback | Gateway and provider limits |
| **Workers AI** | Platform pricing | Workers-native agents and edge inference | Workers/platform limits |

## Recommendations

- **Development:** Google AI (free, fast, good enough for iteration)
- **Production (cost-sensitive):** OpenRouter with `gemini-2.5-flash` or `deepseek-r1`
- **Production (quality-critical):** Anthropic with `claude-sonnet-4-6`
- **Production (diverse models):** OpenRouter lets you switch models without code changes
- **Production (governed providers):** Cloudflare AI Gateway when you need central logs, policy, caching, budgets, or provider fallback
- **Workers-native agents:** Workers AI when the agent already runs in Cloudflare Workers and latency/runtime simplicity matters

## Required Packages

```bash
# Base (always needed)
npm install @mastra/core zod

# Per provider (install what you use)
npm install @ai-sdk/google       # For Google AI
npm install @ai-sdk/anthropic    # For Anthropic
npm install @ai-sdk/openai       # For OpenAI
# OpenRouter uses the OpenAI-compatible format — no extra package needed
# Workers AI usually uses Worker bindings; install a provider package only if the project already uses one
```

## Advanced: Quality Tiers

For projects with mixed quality needs, define tiers:

```typescript
type Tier = "quick" | "standard" | "rigorous";

const TIER_MODELS: Record<Provider, Record<Tier, string>> = {
  google: {
    quick: "gemini-2.5-flash-lite",
    standard: "gemini-2.5-flash",
    rigorous: "gemini-2.5-pro",
  },
  anthropic: {
    quick: "claude-haiku-4-5",
    standard: "claude-sonnet-4-6",
    rigorous: "claude-opus-4-6",
  },
  openrouter: {
    quick: "deepseek/deepseek-chat",
    standard: "anthropic/claude-sonnet-4-6",
    rigorous: "anthropic/claude-opus-4-6",
  },
  openai: {
    quick: "gpt-4.1-mini",
    standard: "gpt-4.1",
    rigorous: "o3",
  },
};

export function agentModelForTier(tier: Tier) {
  const provider = (process.env.AGENT_PROVIDER || "google") as Provider;
  const modelId = TIER_MODELS[provider]?.[tier];
  if (!modelId) throw new Error(`No ${tier} model for provider ${provider}`);
  return agentModel(modelId);
}
```

Usage:
```typescript
// Cheap agent for simple classification
export const classifierAgent = new Agent({
  model: agentModelForTier("quick"),
  // ...
});

// Quality agent for user-facing responses
export const assistantAgent = new Agent({
  model: agentModelForTier("rigorous"),
  // ...
});
```
