/**
 * Embedding Pipeline with Batching, Retry, and Matryoshka Truncation
 *
 * What: Production-grade pipeline to embed documents with automatic retry, batching, and optional Matryoshka truncation.
 * When: Use when ingesting large document sets (>1K docs) into a vector DB.
 * Spec: OpenAI text-embedding-3-large API
 *
 * Customization:
 * - [ ] Set MODEL_ID to your choice (text-embedding-3-large, text-embedding-3-small, or other)
 * - [ ] Configure BATCH_SIZE based on API rate limits
 * - [ ] Update MATRYOSHKA_DIM for cost/quality trade-off (1536 = full, 256 = smallest)
 * - [ ] Add vector DB upsert logic (Pinecone, Qdrant, pgvector, etc.)
 */

import OpenAI from 'openai';
import { batch } from 'lodash';
import pRetry from 'p-retry';
import { z } from 'zod';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configuration
const MODEL_ID = 'text-embedding-3-large';
const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const MATRYOSHKA_DIM = 1536; // Use 256/512 for cost, 1536 for quality

// Input validation
const DocumentSchema = z.object({
  id: z.string().min(1, 'Document ID required'),
  text: z.string().min(10, 'Document text must be at least 10 chars'),
  metadata: z.record(z.string(), z.any()).optional(),
});

type Document = z.infer<typeof DocumentSchema>;

interface EmbeddedDocument {
  id: string;
  embedding: number[];
  text: string;
  metadata?: Record<string, any>;
  embeddedAt: Date;
  model: string;
}

/**
 * Embed documents with automatic batching and retry
 */
async function embedDocuments(docs: Document[]): Promise<EmbeddedDocument[]> {
  // Validate input
  const validDocs = docs.map((doc) => DocumentSchema.parse(doc));

  console.log(`Embedding ${validDocs.length} documents with model ${MODEL_ID}`);

  const batches = batch(validDocs, BATCH_SIZE);
  const results: EmbeddedDocument[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batchDocs = batches[i];

    console.log(
      `Batch ${i + 1}/${batches.length}: embedding ${batchDocs.length} docs`
    );

    // Retry with exponential backoff
    const response = await pRetry(
      () =>
        client.embeddings.create({
          model: MODEL_ID,
          input: batchDocs.map((d) => d.text),
          dimensions: MATRYOSHKA_DIM,
        }),
      {
        retries: MAX_RETRIES,
        onFailedAttempt: (error) => {
          console.warn(
            `Embedding batch attempt ${error.attemptNumber}/${MAX_RETRIES + 1} failed`,
            error.message
          );
        },
      }
    );

    // Sort by index (OpenAI may not return in order)
    const sortedEmbeddings = response.data.sort((a, b) => a.index - b.index);

    // Map back to documents
    sortedEmbeddings.forEach((emb, idx) => {
      results.push({
        id: batchDocs[idx].id,
        embedding: emb.embedding,
        text: batchDocs[idx].text,
        metadata: batchDocs[idx].metadata,
        embeddedAt: new Date(),
        model: MODEL_ID,
      });
    });

    // Rate limit: OpenAI allows 500K tokens/min
    // Typical token count: 1.3 * word count
    const tokensInBatch = batchDocs.reduce(
      (sum, d) => sum + Math.ceil(d.text.split(/\s+/).length * 1.3),
      0
    );
    console.log(`  Batch used ~${tokensInBatch} tokens`);

    if (i < batches.length - 1) {
      // Small delay between batches to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log(
    `✓ Embedded ${results.length} documents successfully (avg ${MATRYOSHKA_DIM} dims per vector)`
  );
  return results;
}

/**
 * Truncate embedding to smaller dimension (Matryoshka)
 * Reduces vector size from 3072 (3-large) to specified dimension without re-embedding
 */
function truncateEmbedding(embedding: number[], targetDim: number): number[] {
  if (targetDim >= embedding.length) return embedding;
  return embedding.slice(0, targetDim);
}

/**
 * Cost estimation for embedding
 */
function estimateCost(
  numDocs: number,
  avgTokensPerDoc: number = 300
): string {
  const totalTokens = numDocs * avgTokensPerDoc;
  const costPer1MTokens = 0.02; // text-embedding-3-large
  const totalCost = (totalTokens / 1_000_000) * costPer1MTokens;
  return `$${totalCost.toFixed(2)} (${totalTokens.toLocaleString()} tokens)`;
}

// Example usage
async function main() {
  const sampleDocs: Document[] = [
    {
      id: 'doc-1',
      text: 'The quick brown fox jumps over the lazy dog. This is a sample document for embedding.',
      metadata: { source: 'example', domain: 'test' },
    },
    {
      id: 'doc-2',
      text: 'Another document about natural language processing and vector embeddings.',
      metadata: { source: 'example', domain: 'test' },
    },
  ];

  try {
    console.log(
      `Cost estimate: ${estimateCost(sampleDocs.length, 50)}`
    );

    const embedded = await embedDocuments(sampleDocs);

    // Optionally truncate for cost savings at query time
    const truncated = embedded.map((doc) => ({
      ...doc,
      embedding: truncateEmbedding(doc.embedding, 256), // Truncate to 256 dims for speed
    }));

    console.log('\nFirst embedded document:');
    console.log(
      `  ID: ${truncated[0].id}, Dims: ${truncated[0].embedding.length}`
    );

    // <CUSTOMISE>: Add your vector DB upsert logic here
    // Example: await pinecone.index('main').upsert(truncated.map(d => ({
    //   id: d.id,
    //   values: d.embedding,
    //   metadata: d.metadata
    // })));
  } catch (error) {
    console.error('Embedding pipeline failed:', error);
    process.exit(1);
  }
}

export { embedDocuments, EmbeddedDocument, truncateEmbedding, estimateCost };

if (import.meta.main) {
  main().catch(console.error);
}
