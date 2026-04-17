/**
 * Draft-then-Confirm Pattern (Human-in-the-Loop)
 *
 * Generic MCP tool pair: `prepare_draft_*` + `confirm_send_*`.
 * The agent prepares a draft and returns a preview for human approval.
 * User reviews and calls the confirm tool to execute the destructive action.
 * Annotations mark prepare_* as WRITE and confirm_* as DESTRUCTIVE.
 *
 * When to use:
 * - Sending records that cannot be unsent (invoices, emails, notifications)
 * - Irreversible bulk operations (delete 100 records, update all customers)
 * - High-stakes changes (salary adjustments, access grants)
 * - Compliance: maintain audit trail of who approved what
 *
 * Canonical docs:
 * - MCP tool annotations: https://modelcontextprotocol.io/docs/concepts/tools#tool-definitions
 * - Idempotency patterns: https://stripe.com/docs/api/idempotent-requests
 * - Draft/confirm workflows: https://martinfowler.com/articles/saga.html
 *
 * // <CUSTOMISE>
 * - Replace prepare_draft_invoice/confirm_send_invoice with your domain
 * - Update draft storage (in-memory, Redis, database)
 * - Implement idempotency keys for replay safety
 * - Add approval workflow (roles, notifications)
 */

import type { Tool } from "ai";
import type {
  Tool as MCPTool,
  ToolInputBase,
} from "@modelcontextprotocol/sdk/shared/messages";
import { z } from "zod";

/**
 * Draft state: stored temporarily until user confirms.
 */
export const DraftRecordSchema = z.object({
  draftId: z.string().describe("Unique draft ID (ephemeral key)"),
  kind: z.enum(["invoice", "email", "notification"]).describe("Record type"),
  preview: z.record(z.string(), z.unknown()).describe("Human-readable preview"),
  payload: z.record(z.string(), z.unknown()).describe("Full payload to execute"),
  createdAt: z.number().describe("Unix timestamp"),
  expiresAt: z.number().describe("Unix timestamp (auto-expires after 24h)"),
  createdBy: z.string().describe("User ID of preparer"),
});

export type DraftRecord = z.infer<typeof DraftRecordSchema>;

/**
 * In-memory draft store (in production, use Redis with TTL).
 */
export class DraftRecordStore {
  private drafts: Map<string, DraftRecord> = new Map();

  /**
   * Save a draft and return its ID.
   */
  saveDraft(draft: Omit<DraftRecord, "draftId" | "createdAt" | "expiresAt">): string {
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();

    const record: DraftRecord = {
      draftId,
      createdAt: now,
      expiresAt: now + 86400000, // 24 hours
      ...draft,
    };

    this.drafts.set(draftId, record);
    return draftId;
  }

  /**
   * Retrieve a draft by ID.
   */
  getDraft(draftId: string): DraftRecord | null {
    const draft = this.drafts.get(draftId);

    // Check expiry
    if (draft && draft.expiresAt < Date.now()) {
      this.drafts.delete(draftId);
      return null;
    }

    return draft || null;
  }

  /**
   * Consume a draft (delete after confirmation).
   */
  consumeDraft(draftId: string): DraftRecord | null {
    const draft = this.getDraft(draftId);
    if (draft) {
      this.drafts.delete(draftId);
    }
    return draft;
  }

  /**
   * Cleanup expired drafts (periodic task).
   */
  evictExpired(): number {
    const now = Date.now();
    let count = 0;

    for (const [draftId, draft] of this.drafts.entries()) {
      if (draft.expiresAt < now) {
        this.drafts.delete(draftId);
        count++;
      }
    }

    return count;
  }
}

/**
 * Zod schema for prepare_draft_invoice input.
 */
export const PrepareDraftInvoiceInputSchema = z.object({
  customerId: z.string().describe("Customer ID"),
  amount: z.number().min(0.01).describe("Total amount in cents"),
  currency: z.string().default("USD").describe("Currency code"),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().int().min(1),
        unitPrice: z.number().min(0),
      }),
    )
    .describe("Line items"),
  dueDate: z.string().optional().describe("YYYY-MM-DD"),
  notes: z.string().optional().describe("Invoice notes"),
});

export type PrepareDraftInvoiceInput = z.infer<
  typeof PrepareDraftInvoiceInputSchema
>;

/**
 * Zod schema for confirm_send_invoice input.
 */
export const ConfirmSendInvoiceInputSchema = z.object({
  draftId: z.string().describe("Draft ID returned by prepare_draft_invoice"),
  sendEmail: z
    .boolean()
    .default(true)
    .describe("Send invoice to customer email"),
});

export type ConfirmSendInvoiceInput = z.infer<
  typeof ConfirmSendInvoiceInputSchema
>;

/**
 * MCP-compatible prepare_draft_invoice tool.
 * Returns a draft preview for human review.
 * Annotation: WRITE (non-destructive, reversible if not confirmed).
 */
export function createPrepareDraftInvoiceTool(
  store: DraftRecordStore,
  onPrepare?: (input: PrepareDraftInvoiceInput) => Promise<Record<string, unknown>>,
): MCPTool {
  return {
    name: "prepare_draft_invoice",
    description:
      "Create a draft invoice for review. Returns a preview and draft ID. " +
      "Call confirm_send_invoice with the draft ID to finalize and send.",
    inputSchema: {
      type: "object" as const,
      properties: {
        customerId: {
          type: "string",
          description: "Customer ID",
        },
        amount: {
          type: "number",
          description: "Total amount in cents",
        },
        currency: {
          type: "string",
          description: "Currency code",
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
            },
            required: ["description", "quantity", "unitPrice"],
          },
          description: "Line items",
        },
        dueDate: {
          type: "string",
          description: "Due date (YYYY-MM-DD)",
        },
        notes: {
          type: "string",
          description: "Notes",
        },
      },
      required: ["customerId", "amount", "currency", "items"],
    },
  };
}

/**
 * MCP-compatible confirm_send_invoice tool.
 * Executes the draft (sends the invoice). DESTRUCTIVE action.
 * Annotation: DESTRUCTIVE (irreversible once sent).
 */
export function createConfirmSendInvoiceTool(
  store: DraftRecordStore,
  onConfirm?: (draft: DraftRecord, sendEmail: boolean) => Promise<Record<string, unknown>>,
): MCPTool {
  return {
    name: "confirm_send_invoice",
    description:
      "Finalize and send a draft invoice. DESTRUCTIVE: once sent, the invoice cannot be unsent. " +
      "Requires explicit approval via draft ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        draftId: {
          type: "string",
          description: "Draft ID from prepare_draft_invoice",
        },
        sendEmail: {
          type: "boolean",
          description: "Send to customer email",
        },
      },
      required: ["draftId"],
    },
  };
}

/**
 * Handler: execute prepare_draft_invoice.
 */
export async function handlePrepareDraftInvoice(
  input: PrepareDraftInvoiceInput,
  store: DraftRecordStore,
): Promise<{ draftId: string; preview: Record<string, unknown> }> {
  // <CUSTOMISE> Fetch customer details from database
  const customerName = "Acme Corp"; // Placeholder
  const previewUrl = `https://api.example.com/drafts/invoice-preview?id=temp-${Date.now()}`;

  const preview = {
    customerName,
    amount: (input.amount / 100).toFixed(2),
    currency: input.currency,
    items: input.items,
    dueDate: input.dueDate || "not set",
    previewUrl,
  };

  const draftId = store.saveDraft({
    kind: "invoice",
    preview,
    payload: {
      customerId: input.customerId,
      amount: input.amount,
      currency: input.currency,
      items: input.items,
      dueDate: input.dueDate,
      notes: input.notes,
    },
    createdBy: "user-123", // <CUSTOMISE> Get from context
  });

  return {
    draftId,
    preview,
  };
}

/**
 * Handler: execute confirm_send_invoice.
 */
export async function handleConfirmSendInvoice(
  input: ConfirmSendInvoiceInput,
  store: DraftRecordStore,
): Promise<{ invoiceId: string; sent: boolean; message: string }> {
  const draft = store.consumeDraft(input.draftId);

  if (!draft) {
    throw new Error(
      `Draft ${input.draftId} not found (may have expired or been used already)`,
    );
  }

  // <CUSTOMISE> Call your invoice API to create and send
  const invoiceId = `invoice-${Date.now()}`;
  console.log(
    `[confirm_send_invoice] Sending invoice ${invoiceId} to customer ${draft.payload.customerId}`,
  );

  return {
    invoiceId,
    sent: input.sendEmail,
    message: `Invoice ${invoiceId} sent${input.sendEmail ? " to customer email" : ""}`,
  };
}

/**
 * Annotation metadata (for Claude Desktop, etc.).
 */
export const WRITE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
} as const;

export const DESTRUCTIVE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
} as const;

/**
 * Composite tool pair for seamless draft-then-confirm workflow.
 */
export class DraftThenConfirmToolSet {
  private store: DraftRecordStore;

  constructor() {
    this.store = new DraftRecordStore();
  }

  getTools(): Record<string, MCPTool> {
    return {
      prepare_draft_invoice: createPrepareDraftInvoiceTool(this.store),
      confirm_send_invoice: createConfirmSendInvoiceTool(this.store),
    };
  }

  async prepare(input: PrepareDraftInvoiceInput): Promise<unknown> {
    return handlePrepareDraftInvoice(input, this.store);
  }

  async confirm(input: ConfirmSendInvoiceInput): Promise<unknown> {
    return handleConfirmSendInvoice(input, this.store);
  }

  /**
   * Cleanup periodic task.
   */
  async evictExpired(): Promise<void> {
    const count = this.store.evictExpired();
    console.log(`[draft-then-confirm] Evicted ${count} expired drafts`);
  }
}

/**
 * Example usage:
 */
export async function exampleDraftWorkflow() {
  const toolSet = new DraftThenConfirmToolSet();

  // Step 1: Agent prepares draft
  const prepareResult = await toolSet.prepare({
    customerId: "cust-456",
    amount: 50000, // $500.00
    currency: "USD",
    items: [
      {
        description: "Consulting services",
        quantity: 10,
        unitPrice: 50,
      },
    ],
    dueDate: "2026-05-15",
  });

  console.log("Draft prepared:", prepareResult);

  // Step 2: Human reviews and approves
  const draftId = (prepareResult as Record<string, unknown>).draftId as string;

  // Step 3: Agent calls confirm
  const confirmResult = await toolSet.confirm({
    draftId,
    sendEmail: true,
  });

  console.log("Invoice sent:", confirmResult);
}
