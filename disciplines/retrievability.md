# Retrievability

## Summary

Agents reason over data they can retrieve. Data retrievability—the ability to find relevant information quickly and accurately—is a first-class design concern. Hybrid retrieval (BM25 + dense embeddings + reranking) is the default; chunking strategy is everything; and evaluation via RAGAS or MTEB is non-negotiable. A poorly retrievable knowledge base cripples even a perfect agent.

- **Hybrid search**: BM25 for exact matches, embeddings for semantic similarity, rerankers to fuse results
- **Chunking**: Size/strategy (sentence, paragraph, sliding window) directly impacts retrieval quality
- **Evaluation**: RAGAS metrics (context precision, recall, relevance) measure retrieval quality
- **Indexing**: Full-text indices, embedding tables, and reranker embeddings must be kept in sync
- **Latency**: Retrieval is often the critical path; optimize aggressively

---

## Core Principle

> Retrieval is not a feature; it is the agent's access to truth. Get it wrong, and the agent hallucinates at scale.

---

## Principles

### 1. Chunking Strategy Shapes Retrieval

How you split documents determines what the agent can find.

**Common strategies**:

- **Fixed size** (e.g., 512 tokens): Simple, but may split coherent ideas across chunks
- **Sentence-aware**: Align chunks to sentence boundaries; preserves semantic units
- **Sliding window**: Overlap chunks by 50 tokens to preserve context across boundaries
- **Semantic (recursive)**: Split on headings, then paragraphs, then sentences if needed

**Rule of thumb**: Chunk size should match the agent's expected query scope. If queries are "what is the VAT rate for Germany?", use small chunks (~100 tokens). If "summarize Q3 performance", use larger chunks (~512 tokens).

**Testing**: Run RAGAS evaluation on your candidate chunking strategies. Measure context precision (is retrieved content relevant?) and context recall (did you find all relevant chunks?).

### 2. Hybrid Retrieval is Table Stakes

Never use embeddings alone.

**BM25** (keyword/full-text search):
- Efficient, exact-match strength
- Fails on synonyms and paraphrases
- Essential for proper nouns, IDs, dates

**Dense embeddings** (e.g., OpenAI's text-embedding-3):
- Semantic similarity; catches paraphrases
- Slow at scale without proper indexing
- Can conflate unrelated concepts

**Reranking** (cross-encoder):
- Re-scores top-k results from BM25 + embeddings
- Fuses ranking signals; much more accurate than either alone
- Adds latency; use sparingly (rerank only top 20, not all documents)

**Pattern**:
```
1. BM25 search (top 20) + Dense search (top 20) → Union of results
2. Rerank top 20 combined results
3. Return top 5
```

Latency: ~500ms (BM25 + dense in parallel) + 200ms (rerank) + 300ms (retrieval from database) = ~1s total. Acceptable for agent reasoning loops.

### 3. Evaluation via RAGAS

Don't guess whether retrieval works. Measure it.

**RAGAS metrics**:
- **Context Precision**: Of the retrieved chunks, how many are relevant to the query?
- **Context Recall**: Of all relevant chunks in the corpus, how many did we retrieve?
- **Faithfulness**: Does the LLM's answer match the retrieved context (no hallucination)?
- **Answer Relevance**: Is the answer relevant to the query?

**Workflow**:
1. Build an eval set: (query, ground_truth_answer, relevant_chunk_ids)
2. Run retrieval; measure context precision/recall
3. Feed retrieved context to LLM; measure faithfulness/answer relevance
4. Aggregate across eval set; track over time

**Target**: Context precision >80%, context recall >70% for most use cases.

### 4. Indexing and Sync

Your retrieval infrastructure must stay in sync with source data.

**Indexing layers**:
- **Full-text index**: PostgreSQL tsvector, Elasticsearch, Meilisearch (rebuild on document change)
- **Embedding table**: One row per chunk, embedding vector (rebuild periodically, e.g., weekly)
- **Reranker embeddings**: Store reranker scores (optional; speeds up repeated queries)

**Sync strategy**:
- On document insert/update: Recompute BM25 index immediately, queue embedding job (async)
- Embedding jobs batch (~1000 chunks per batch) to amortize API costs
- Stale embeddings acceptable for <1 week

**Monitoring**: Track index staleness (max age of any chunk's embedding). Alert if >7 days.

### 5. Latency is Non-Negotiable

Retrieval is often on the critical path. Optimize ruthlessly.

**Tactics**:
- Run BM25 and dense search in parallel (threads or async)
- Cache results for repeated queries (Redis, in-memory LRU)
- Use approximate nearest neighbor (ANN) indexes for dense search (HNSW, IVF)
- Rerank only top 20 results, not all 1000
- Denormalize: Store chunk metadata (title, category) in the index, not separately

**Measurement**: Log retrieval latency per component (BM25: 50ms, dense: 200ms, rerank: 100ms, database: 150ms). Identify bottleneck; optimize that.

### 6. User-Facing Retrievability

Let users know what sources the agent used.

- Log chunk IDs and scores with every retrieval
- Return source attribution (e.g., "based on FAQ #12, policy v3.1 from 2026-03-15")
- Audit trail: Users can click through and verify the agent's sources

This builds trust and enables human-in-the-loop correction: if retrieved context was wrong, update the source document and the agent's next query will be better.

---

## Anti-Patterns

### 1. Embeddings Without BM25
"We use vector search; it's more modern." Fails on exact-match queries.

**Fix**: Use both. Combine results; let reranker decide relevance.

### 2. No Eval on Retrieval
"The agent seems to find the right stuff." No metric, no evidence.

**Fix**: Implement RAGAS eval. Measure context precision/recall quarterly.

### 3. Fixed Chunk Size Across All Domains
Using 512 tokens for both short FAQs and long policy documents.

**Fix**: Analyze query patterns. Use different chunk sizes per corpus.

### 4. Index Lag
Embeddings are weeks out of date. Agent retrieves stale information.

**Fix**: Automate embedding jobs. Alert on staleness >7 days.

### 5. Unbounded Retrieval
"Return all matching chunks." Feeds 100KB of context to the agent, blowing token budget and latency.

**Fix**: Return top 5 after reranking. If agent needs more, let it ask for next-page results.

---

## See Also

- `/references/retrieval-cookbook.md` — Qdrant, Pinecone, Weaviate, Milvus configurations
- `/references/chunking-guide.md` — LLM-specific chunk size recommendations
- RAGAS documentation — Retrieval-augmented generation evaluation
- MTEB leaderboard — Compare embedding models and rerankers
