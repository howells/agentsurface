# Data Retrievability

## Summary

Dimension 11 scores how effectively a codebase enables agents to find, understand, and retrieve information. Covers dense and multimodal embeddings, vector databases, hybrid search (BM25 + dense + reranking), chunking strategies (fixed, semantic, contextual), knowledge graphs, agentic RAG with query planning, and evaluation metrics (RAGAS, MTEB). Consensus 2026: hybrid beats dense-only; Contextual Retrieval (Anthropic pattern with summaries) reduces failure 49–67%; agentic RAG with reflection outperforms single-stage; LightRAG 6,000x cheaper than GraphRAG for knowledge graphs.

- **0**: No retrieval infrastructure (blocker)
- **1**: Dense-only, no reranking/hybrid, no evaluation
- **2**: Hybrid (BM25 + dense + fusion), reranking, chunking strategy documented
- **3**: Agentic RAG with query planning, metadata filtering, Contextual Retrieval, RAGAS+domain evals
- **Evidence**: embedding model, vector DB client, BM25 grep, rerank calls, chunking docs, eval scripts

---

Data Retrievability measures how effectively a codebase makes its data searchable, understandable, and retrievable to AI agents. This dimension covers vector embeddings (dense and multimodal), vector databases, hybrid search (BM25 + dense), reranking, chunking strategies, knowledge graphs, agentic RAG patterns, and the evaluation frameworks that measure retrieval quality. In April 2026, the consensus is clear: hybrid retrieval (sparse + dense + rerank) beats naive dense-only; agentic RAG with query planning surpasses single-stage retrieval; and Anthropic's Contextual Retrieval pattern (prepend summaries to chunks before embedding) reduces retrieval failures by 49–67%.

## Scoring rubric

| Score | Criteria | Detection |
|-------|----------|-----------|
| 0 | No data retrieval infrastructure. Documents or data are not indexed, searchable, or retrievable by agents. No embeddings, vector DB, or search indexing present. | No `.embed()`, no vector DB client, no BM25 index, no `retriever()` or `RAG()` patterns. Files are static or database-only without semantic search. |
| 1 | Basic single-stage dense retrieval only. Embeddings are computed but no reranking, no hybrid search, no chunking strategy. Documents are raw or poorly chunked. No evaluation. | Vector DB exists (Pinecone, Qdrant, pgvector) but no hybrid layer. No chunking logic or overlap. No RAGAS, MTEB, or recall metrics. Embedding model is generic (text-embedding-3-small). |
| 2 | Good retrieval infrastructure. Hybrid search (BM25 + dense) with fusion. Reranking (Cohere/Voyage) present. Chunking strategy documented (fixed-size, semantic, or contextual). Basic evaluation metrics (recall@k, nDCG). | Hybrid pipeline in code: BM25 + dense + RRF/Weaviate fusion. Reranking step before generation. Chunk size/overlap >10% documented. RAGAS or MTEB eval script present. Embedding model is mid-tier (Voyage 3, Cohere v4, or bgе-m3). |
| 3 | Excellent retrieval system. Multi-stage retrieval with query planning and reflection. Metadata filtering and namespace isolation. Contextual Retrieval (Anthropic pattern) or late-interaction (ColBERT/ColPali). Knowledge graph or agentic RAG. Embedding drift detection. Comprehensive evaluation (RAGAS + domain-specific metrics). | Agentic retriever with query decomposition, reflection, and tool selection. Contextual embeddings or prepended summaries. ColBERT/ColPali or hybrid (graph + vector). Metadata filters on all queries. Drift detection on embedding similarity. RAGAS + custom metrics in CI/CD. GraphRAG or LightRAG integration for complex domains. |

## Evidence to gather

- **Embedding models and APIs:** Check imports for OpenAI embeddings, Voyage, Cohere, Gemini, or open-source (BGE, E5). Look for embedding batch calls, retry logic, and cost tracking.
- **Vector database:** Identify all Vector DB clients (Pinecone, Qdrant, Weaviate, pgvector, LanceDB, Milvus). Check for serverless vs. self-hosted, schema/index definitions, namespace/multi-tenancy setup.
- **Hybrid search:** Grep for BM25 implementations (Elasticsearch, OpenSearch, Typesense, meilisearch). Detect fusion algorithms (RRF, relative score fusion). Check for parallel sparse + dense queries.
- **Reranking:** Look for Cohere rerank, Voyage rerank, or BGE rerank API calls. Two-stage pipeline (retrieve top-50, rerank to top-5).
- **Chunking strategy:** Read documents in docstrings, config files, or README. Check for fixed-size chunking, semantic splitting, overlap %, and token counting.
- **Contextual Retrieval:** Detect calls to Claude/LLM to prepend chunk context before embedding. Check for prompt caching usage. Compare `contextual_embed()` vs. raw embedding calls.
- **Knowledge graphs:** Neo4j/Cypher queries, KuzuDB embedded graphs, GraphRAG/LightRAG patterns. Detect entity extraction and relationship indexing.
- **Agentic RAG:** Query planning agents (Claude + tool use), reflection loops, dynamic retriever selection. LangGraph, LlamaIndex, Mastra, or custom agent frameworks.
- **Multimodal:** Voyage Multimodal, Gemini Embedding 2, CLIP, SigLIP. Image embeddings stored alongside text.
- **Evaluation:** RAGAS metrics (faithfulness, answer_relevancy, context_precision, context_recall), MTEB evals, domain-specific metrics. CI/CD eval runs.
- **Metadata filtering:** Queries include `where`, `filter`, or `metadata` clauses. Namespace isolation in Vector DB.
- **Drift detection:** Periodic re-embedding of samples, similarity distribution comparison, embedding version tracking.

## Deep dive

### Embedding models: choosing the right one (April 2026)

The embedding model is the foundation of retrieval quality. Select based on cost, latency, quality, and modality:

**Dense text embeddings:**

- **OpenAI text-embedding-3-large** — De facto commercial standard. Integrated into Responses API file_search. 3,072 dims (supports Matryoshka truncation to 256 dims). $0.02/1M tokens. Reliable, widely integrated.
- **Voyage 3 / Voyage 4** (MongoDB-owned since 2024) — 1,536 dims, multilingual, rerank-2.5-lite companion. Voyage 4 latest. $0.01/1M tokens.
- **Cohere Embed v4** — Multimodal (text + images), 1,536 dims, Matryoshka (256/512/1024/1536), 128k context length. $0.12/1M tokens for text, $0.47/1M for images. Enterprise rerank-3.5 and rerank-4.0 bundled.
- **Google Gemini Embedding 2** (March 2026) — All-modality (text, image, video, audio, code), 768 dims. Top MTEB leaderboard (68.32 avg). ~$0.02/1M tokens.
- **Open-source:** BGE-M3 (MTEB competitive, multilingual), E5-Mistral, Nomic Embed (384 dims, efficient), Jina v3. Hugging Face models, no API costs, self-hosted latency variable.

**Key pattern: Matryoshka Embeddings** — Cohere v4 and OpenAI 3-large support dimensionality reduction post-embedding. Store full dims (1,536) but truncate to 256/512 at query time for cost/latency savings without recomputing.

**2026 consensus:** Open-source models now **match or exceed** commercial APIs on MTEB leaderboard. Choose based on latency SLA (API calls are slower) and multi-tenancy cost sensitivity (self-hosted has zero per-token overhead).

### Multimodal embeddings: image, video, audio

**Use when:** PDFs with charts/tables, slide decks, video archives, or cross-modal queries (e.g., "show me documents with graphs like this image").

**Leaders:**
- **Voyage Multimodal 3.5** — text + images + video, unified 1,024-dim space
- **Gemini Embedding 2** — all five modalities
- **Cohere Embed v4** — text + images
- **Open-source:** CLIP (text+image, widely integrated), SigLIP (CLIP successor)

**Pattern: ColPali for PDFs** — Treat entire PDF as image, no OCR. Late-interaction retrieval (token-level embeddings). See ColBERT/ColPali section below.

### Vector databases: when to pick each

**Pinecone serverless (managed)** — Best for: medium-scale (100K–10M vectors), variable workloads, hands-off ops. Automatic scaling, dedicated read nodes (March 2026). $16/1M RUs. 50–100ms baseline latency. Hybrid search + reranking integrated.

**pgvector + pgvectorscale (self-hosted PostgreSQL)** — **2026 breakthrough**: 28x lower p95 latency, 16x higher throughput vs. Pinecone s1 at 99% recall, 75% less cost. pgvector (C-based) + pgvectorscale (Rust, StreamingDiskANN). Requires PostgreSQL ops, but eliminates Vector DB vendor lock-in. Use for cost-sensitive, performance-critical, or on-prem deployments.

**Qdrant** — Best for: fine-grained control, HNSW tuning, binary quantization (32x compression, 40x speedup), hybrid (sparse-dense). Self-host or managed cloud. $0.20/1M RUs.

**Weaviate** — Best for: hybrid search native (BM25 + dense + RRF fusion), full-text search, and multilingual. Managed or self-hosted Kubernetes. $0.50/1k reads. GraphQL API.

**LanceDB** — Best for: multi-vector retrieval (ColBERT, ColPali, late-interaction). Native support. Cost-efficient, TypeScript-friendly.

**Milvus** — Best for: large-scale distributed retrieval (>100M vectors), Kubernetes-native. Open-source, high ops overhead.

**MongoDB Atlas Vector Search** — Best for: Voyage AI integration (post-MongoDB acquisition). Embed Voyage models, search semantic + metadata filters. No standalone Vector DB to operate.

**Turbopuffer** — Best for: serverless, agentic RAG workloads, automatic scaling. New entrant in 2025.

**Redis Vector Search** — Best for: low-latency retrieval in real-time systems, session-scoped caches.

### Hybrid search: BM25 + dense + reranking

**Why hybrid beats dense-only:**
- Dense vectors excel at semantic understanding (synonyms, paraphrasing)
- Sparse (BM25) excels at exact keyword matching and rare terms
- Combined, they cover both signal types; fusion (RRF) ranks by reciprocal position

**Three-stage pipeline (2026 standard):**

1. **Sparse retrieval** (BM25): Query → top-100 via keyword index (Elasticsearch, OpenSearch, Typesense, Meilisearch)
2. **Dense retrieval** (vector DB): Query embedding → top-100 via HNSW
3. **Reranking** (Cohere/Voyage): Fuse top-100 via RRF, rerank top-20, return top-5 for generation

**Fusion algorithms:**
- **Reciprocal Rank Fusion (RRF)** — Combine ranks from sparse and dense; rank-neutral
- **Relative Score Fusion** — Normalize scores (0–1), weighted sum (Weaviate default)

**TypeScript example (Qdrant + Typesense):**

```typescript
import { QdrantClient } from '@qdrant/js-client-rest';
import { Typesense } from 'typesense';

async function hybridSearch(query: string, limit: number = 10) {
  // Sparse: BM25 via Typesense
  const sparse = await typesense.collections('docs').documents().search({
    q: query,
    query_by: 'content',
    limit_hits: 100,
  });

  // Dense: Vector similarity via Qdrant
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
  });
  
  const dense = await qdrant.search('docs_collection', {
    vector: embedding.data[0].embedding,
    limit: 100,
  });

  // Fusion: RRF
  const sparseRanks = new Map(
    sparse.results.map((r, i) => [r.document.id, i])
  );
  const denseRanks = new Map(
    dense.map((r, i) => [r.payload.id, i])
  );

  const fused = new Map<string, number>();
  for (const [id, sparseRank] of sparseRanks) {
    const denseRank = denseRanks.get(id) ?? 1000;
    const rrf = 1 / (60 + sparseRank) + 1 / (60 + denseRank);
    fused.set(id, rrf);
  }

  // Reranking: Cohere
  const topFusedIds = [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id);

  const docs = await Promise.all(
    topFusedIds.map(id => db.getDoc(id))
  );

  const reranked = await cohere.rerank({
    model: 'rerank-3.5',
    query,
    documents: docs.map(d => ({ text: d.content })),
    top_n: limit,
  });

  return reranked.results.map(r => docs[r.index]);
}
```

### Reranking: two-stage pipeline

**Principle:** Retrieve broad (top-50 dense), rerank narrow (top-5 rerank).

**Leaders:**
- **Cohere Rerank 3.5** — Multilingual, 100+ languages, 32k doc token limit
- **Cohere Rerank 4.0** (2026) — Latest, most performant
- **Voyage Rerank 2.5** — 13.89% accuracy boost over dense, $0.01/1M tokens, 4k query tokens
- **BGE Rerank** — Open-source, competitive

**Cost-benefit:** Rerank reduces token spend downstream by filtering irrelevant docs before generation. Typical: $0.01 per 1M tokens reranked (negligible vs. generation cost).

### Chunking strategies and Contextual Retrieval

**Fixed-size chunking (baseline):**
- 512–1024 tokens, 20% overlap
- Simple, predictable; loses document structure
- Works when documents are homogeneous

**Semantic chunking:**
- Split on paragraph, section, or heading boundaries
- Preserves structure; slightly slower
- Better for hierarchical documents (books, specs)

**Late chunking (post-embedding):**
- Embed full document, chunk after embedding
- Avoids context loss at chunk boundaries
- Expensive (one embedding per document, not per chunk)

**Contextual Retrieval (Anthropic, 2024) — 2026 STANDARD:**

Before embedding or indexing, prepend chunk-specific context:

```typescript
async function contextualEmbed(chunk: string, fullDoc: string): Promise<number[]> {
  // Use Claude Haiku to generate chunk context (50–100 tokens)
  const context = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 150,
    system: 'Generate a concise 1-2 sentence context for this chunk within the broader document.',
    messages: [{
      role: 'user',
      content: `Document:\n${fullDoc}\n\nChunk:\n${chunk}\n\nContext:`,
    }],
  });

  // Prepend context to chunk
  const contextual = `${context.content[0].text}\n\n${chunk}`;

  // Embed contextual text
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: contextual,
  });

  return embedding.data[0].embedding;
}
```

**Results:** 49% reduction in retrieval failures alone; 67% with reranking. Prompt caching makes it cost-effective (cache the full doc once, reference repeatedly).

### Knowledge graphs: Neo4j, GraphRAG, LightRAG

**When to use graphs:**
- Explicit relationships matter (org hierarchies, supply chains, dependency graphs)
- Multi-hop reasoning required (find all vendors who supply manufacturer X)
- Schema-driven queries (structured data with known properties)

**GraphRAG (Microsoft, 2024):**
- Build hierarchical communities of entities
- Traverse communities at query time for global reasoning
- **Problem:** 610K+ tokens per query (expensive, slow updates)
- Use for: Complex domains with rich relationship semantics

**LightRAG (2025, EMNLP'25) — 2026 PREFERRED:**
- Avoids community traversal; retrieves entities/relations directly via vectors
- **6,000x token efficiency** vs. GraphRAG ($0.15 vs. $4–7 per document)
- Dual-level: low-level (entities, relations) + high-level (global topics)
- March 2026: OpenSearch backend integration + setup wizard
- Use for: Token-efficient, agentic RAG at scale

**Vendors:**
- **Neo4j** — Dominant enterprise choice, Cypher, GraphRAG integration
- **Memgraph** — Open-source Neo4j alternative
- **TigerGraph** — Graph analytics
- **KuzuDB** — Embedded, fast (archived Oct 2025 post-Apple acquisition)

### Agentic RAG: query planning + reflection

**Pattern:** Query → Plan → Tool Use → Reflect → Answer (iterative)

**Components:**
1. **Query Router** — Classify (simple vs. complex) → choose retriever type
2. **Multi-hop Retrieval** — Decompose query into sub-queries, retrieve iteratively
3. **Self-RAG** — Agent ranks retrieved docs, reflects on sufficiency
4. **Reflection Loop** — Check coverage, rewrite query if needed
5. **Tool Selection** — Dynamic choice (vector DB vs. graph vs. SQL vs. APIs)

**Frameworks (TypeScript):**
- **LangGraph** (LangChain, 2026 edition) — State machines with branching
- **LlamaIndex** — Agentic composition, auto-retriever selection
- **Vercel AI SDK** — `useChat` + tool use
- **Mastra** — TypeScript-first agents
- **Haystack** — Pipeline flexibility

**2026 state:** Single-stage RAG (embed query, retrieve, generate) is outdated. Expect multi-agent, reflection, and dynamic tool selection.

### ColBERT / ColPali: late-interaction retrieval

**Late-interaction mechanism:** Instead of one embedding per document, store token-level embeddings. At query time, compute max similarity between query tokens and doc tokens (MaxSim operator).

**ColBERT (text):**
- Each passage = matrix of token embeddings
- Query = matrix of token embeddings
- MaxSim: max similarity between query and passage token pairs
- PLAID indexing: efficient approximate nearest neighbor

**ColPali (multimodal):**
- Treat entire PDF as image (no OCR)
- Vision language model (VLM) encodes PDF as image patches
- Late-interaction on patch embeddings
- Outperforms OCR + chunking on visually complex documents

**Advantage:** Fine-grained matching without explicit keyword index. Better for long-form, hierarchical documents (research papers, contracts).

**Implementation:**
- **LanceDB** — Native multi-vector support
- **Qdrant** — FastEmbed ColBERT integration
- **Elasticsearch** — Late-interaction plugin (2026 support)

### Metadata filtering and multi-tenancy

**Metadata filters** reduce search scope and enforce access control:

```typescript
// Qdrant example
const results = await qdrant.search('collection', {
  vector: embedding,
  filter: {
    must: [
      { key: 'user_id', match: { value: currentUserId } },
      { key: 'created_at', range: { gte: oneMonthAgo } },
      { key: 'status', match: { value: 'published' } },
    ],
  },
  limit: 10,
});
```

**Namespace isolation** (separate indexes per tenant):

```typescript
// Pinecone namespaces
const pinecone = new Pinecone();
const namespace = `tenant-${customerId}`;
const results = await pinecone
  .index('main')
  .namespace(namespace)
  .query({ vector: embedding, topK: 10 });
```

### Embedding drift detection

Over time, embeddings degrade if:
- Model updates (OpenAI updates embeddings version)
- Corpus shifts (new data types, language mix)
- Vector DB bug fixes change similarity scoring

**Monitor:**
```typescript
async function detectDrift() {
  const samples = await db.getSample(1000); // Random sample
  const oldEmbeddings = samples.map(s => s.embedding);
  
  // Re-embed sample
  const newEmbeddings = await embed(samples.map(s => s.text));
  
  // Compute similarity distribution
  const sims = oldEmbeddings.map((old, i) => cosineSimilarity(old, newEmbeddings[i]));
  const meanSim = sims.reduce((a, b) => a + b) / sims.length;
  
  if (meanSim < 0.95) {
    console.warn('Embedding drift detected; consider re-embedding corpus');
  }
}
```

### Evaluation: RAGAS, MTEB, custom metrics

**RAGAS metrics (evaluates full RAG pipeline):**
- **Faithfulness** — Retrieved docs support the generated answer (0–1)
- **Answer Relevancy** — Answer addresses the query (0–1)
- **Context Precision** — Relevant docs ranked first (0–1)
- **Context Recall** — All relevant docs retrieved (0–1)

```typescript
import { evaluate } from '@ragas/sdk';

const results = await evaluate({
  dataset: testDataset, // { question, ground_truth_answer, retrieved_context }
  metrics: [faithfulness, answerRelevancy, contextPrecision, contextRecall],
});
```

**MTEB (Massive Text Embedding Benchmark):**
- 56+ tasks: retrieval, classification, clustering, semantic similarity
- Leaderboard updated monthly
- Caveat: text-only, no cross-lingual retrieval, limited long-doc coverage

**Custom metrics:**
- **Recall@k** — % relevant docs in top-k
- **nDCG** — normalized discounted cumulative gain
- **MRR** — mean reciprocal rank
- **Domain-specific:** latency, cost, user satisfaction (A/B testing)

**CI/CD integration:**

```typescript
// jest test
test('retrieval maintains >0.85 recall@10', async () => {
  const results = await retriever.search(queries);
  const recall = results.map(r => r.recall_at_10);
  const avg = recall.reduce((a, b) => a + b) / recall.length;
  expect(avg).toBeGreaterThan(0.85);
});
```

## Cross-vendor capability table

| Capability | Pinecone | Qdrant | Weaviate | pgvector | Neo4j | OpenAI API | Voyage | Cohere |
|-----------|----------|--------|----------|----------|-------|-----------|--------|--------|
| Dense vectors | Yes | Yes | Yes | Yes | Yes (plug-in) | Embeddings API | Native | Native |
| Sparse (BM25) | Yes (native) | Yes (SPLADE) | Yes (native) | No (use Postgres FTS) | No (use Cypher + FTS) | No | No | No |
| Hybrid fusion | Yes (native RRF) | Yes | Yes (RRF) | Manual (SQL JOIN) | Manual (Cypher) | N/A | No | No |
| Reranking | Integrated | No | No | No | No | N/A | rerank-2.5 API | rerank-3.5/4.0 API |
| Multimodal | No (store + embed external) | No | No | No | No | No | voyage-multimodal-3.5 | embed-v4 |
| Metadata filters | Yes | Yes (payload) | Yes (where) | Yes (SQL WHERE) | Yes (Cypher properties) | N/A | N/A | N/A |
| Namespaces / multi-tenancy | Yes | Yes (collection sharding) | Yes (tenant schemas) | Yes (schema/namespace) | Yes (graph sharding) | N/A | N/A | N/A |
| Quantization | No | Yes (binary, scalar) | No | No (use pgvectorscale) | No | N/A | N/A | N/A |
| Latency (p95) | 50–100ms | 10–30ms (self-host) | 50–100ms | 5–15ms (self-host) | 20–50ms | 100–300ms (API) | 50–150ms (API) | 100–300ms (API) |
| Cost (1M vectors, monthly) | $330 (storage) | Variable | $500+ | $70 (AWS EC2) | $1K+ | $0.02/1M tokens | $0.01/1M tokens | $0.12/1M tokens |
| Self-host option | No (serverless only) | Yes | Yes | Yes (PostgreSQL) | Yes | N/A | No (API only) | No (API only) |
| GraphRAG / LightRAG | No | No | No | No | Yes (GraphRAG) | N/A | No | No |
| Late-interaction (ColBERT) | No | Yes (FastEmbed) | No | No | No | N/A | No | No |

## Anti-patterns to avoid

1. **"Just dump docs in Pinecone."** No chunking strategy, no metadata, no eval. Guaranteed poor recall.
2. **Dense-only retrieval.** Skip BM25. Hybrid always beats dense; 2026 consensus.
3. **Single embedding model for all domains.** Domain-specific embeddings (legal, medical, code) outperform generalists (BGE-M3 for multilingual, Cohere v4 for mixed modality).
4. **No reranking.** Two-stage (retrieve broad, rerank narrow) is 2026 baseline. Expect Cohere/Voyage in production.
5. **Contextless chunks.** Anthropic Contextual Retrieval reduces failures 49–67%. No reason not to use it.
6. **Stale embeddings.** Drift occurs; detect and re-embed. Monitor similarity distribution monthly.
7. **Ignoring metadata filters.** Multi-tenant systems require namespace isolation. Access control is non-optional.
8. **No evaluation.** Always run RAGAS (faithfulness, answer_relevancy, context_precision) in CI/CD. MTEB for embeddings, domain-specific metrics for retrieval quality.
9. **GraphRAG for token efficiency.** Use LightRAG or vector-only instead. GraphRAG is 6,000x more expensive.
10. **Naive pagination.** No `next_cursor`, `has_more`. Agents can't reason over large result sets without explicit pagination.
11. **Cold-start: no embeddings for new docs.** Incremental indexing required. New docs get embeddings on ingest, not on first query.

## Templates and code examples

See `/templates/data-retrievability/` for:
- `embedding-pipeline.ts` — OpenAI batch embedding with retry, Matryoshka truncation
- `contextual-retrieval.ts` — Anthropic's pattern (prepend summaries via Haiku)
- `hybrid-search.ts` — BM25 + dense + RRF fusion (Typesense + Qdrant)
- `rerank.ts` — Two-stage retrieval with Cohere/Voyage rerank
- `pinecone-client.ts` — Production Pinecone (serverless, namespaces, sparse-dense)
- `pgvector-schema.sql` + `pgvector-client.ts` — pgvector + pgvectorscale + Drizzle/Kysely
- `qdrant-client.ts` — Qdrant client (HNSW, quantization, collections)
- `neo4j-knowledge-graph.ts` — GraphRAG extraction and retrieval (Cypher)
- `multimodal-embed.ts` — Voyage Multimodal or Gemini Multimodal
- `ragas-eval.ts` — RAGAS evaluation loop (TypeScript)
- `agentic-rag.ts` — Query planning agent with Claude + dynamic tool selection

## See also

- `/docs/data-retrievability/index.mdx` — TL;DR and decision tree
- `/docs/data-retrievability/embeddings.mdx` — Model selection (OpenAI, Voyage, Cohere, open-source)
- `/docs/data-retrievability/multimodal-embeddings.mdx` — Image/video/audio (Voyage Multimodal, Gemini)
- `/docs/data-retrievability/vector-databases.mdx` — Pinecone vs. Qdrant vs. Weaviate vs. pgvector
- `/docs/data-retrievability/hybrid-search.mdx` — BM25 + dense + RRF
- `/docs/data-retrievability/reranking.mdx` — Two-stage retrieval (Cohere, Voyage, BGE)
- `/docs/data-retrievability/chunking.mdx` — Fixed, semantic, late, contextual (Anthropic)
- `/docs/data-retrievability/knowledge-graphs.mdx` — Neo4j, KuzuDB, GraphRAG, LightRAG
- `/docs/data-retrievability/agentic-rag.mdx` — Query planning, reflection, tool selection
- `/docs/data-retrievability/evaluation.mdx` — RAGAS, MTEB, custom metrics
- `/docs/data-retrievability/anti-patterns.mdx` — What not to do
- [Anthropic Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [Cohere Rerank 4](https://cohere.com/blog/rerank-4)
- [Weaviate Hybrid Search](https://docs.weaviate.io/weaviate/search/hybrid)
- [LightRAG GitHub](https://github.com/hkuds/lightrag)
- [pgvectorscale](https://github.com/timescale/pgvectorscale)
- [MTEB Leaderboard](https://huggingface.co/mteb)
- [RAGAS Docs](https://docs.ragas.io/)
