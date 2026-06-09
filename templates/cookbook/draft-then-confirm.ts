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
import type { Tool as MCPTool, ToolInputBase } from "@modelcontextprotocol/sdk/shared/messages";
import { z } from "zod";

/**
 * Draft state: stored temporarily until user confirms.
 */
export const DraftRecordSchema = z.object({
  createdAt: z.number().describe("Unix timestamp"),
  createdBy: z.string().describe("User ID of preparer"),
  draftId: z.string().describe("Unique draft ID (ephemeral key)"),
  expiresAt: z.number().describe("Unix timestamp (auto-expires after 24h)"),
  kind: z.enum(["invoice", "email", "notification"]).describe("Record type"),
  payload: z.record(z.string(), z.unknown()).describe("Full payload to execute"),
  preview: z.record(z.string(), z.unknown()).describe("Human-readable preview"),
});

export type DraftRecord = z.infer<typeof DraftRecordSchema>;

/**
 * In-memory draft store (in production, use Redis with TTL).
 */
export class DraftRecordStore {
  private drafts = new Map<string, DraftRecord>();

  /**
   * Save a draft and return its ID.
   */
  saveDraft(draft: Omit<DraftRecord, "draftId" | "createdAt" | "expiresAt">): string {
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();

    const record: DraftRecord = {
      createdAt: now,
      draftId,
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
  amount: z.number().min(0.01).describe("Total amount in cents"),
  currency: z.string().default("USD").describe("Currency code"),
  customerId: z.string().describe("Customer ID"),
  dueDate: z.string().optional().describe("YYYY-MM-DD"),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().int().min(1),
        unitPrice: z.number().min(0),
      }),
    )
    .describe("Line items"),
  notes: z.string().optional().describe("Invoice notes"),
});

export type PrepareDraftInvoiceInput = z.infer<typeof PrepareDraftInvoiceInputSchema>;

/**
 * Zod schema for confirm_send_invoice input.
 */
export const ConfirmSendInvoiceInputSchema = z.object({
  draftId: z.string().describe("Draft ID returned by prepare_draft_invoice"),
  sendEmail: z.boolean().default(true).describe("Send invoice to customer email"),
});

export type ConfirmSendInvoiceInput = z.infer<typeof ConfirmSendInvoiceInputSchema>;

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
    description:
      "Create a draft invoice for review. Returns a preview and draft ID. " +
      "Call confirm_send_invoice with the draft ID to finalize and send.",
    inputSchema: {
      properties: {
        amount: {
          description: "Total amount in cents",
          type: "number",
        },
        currency: {
          description: "Currency code",
          type: "string",
        },
        customerId: {
          description: "Customer ID",
          type: "string",
        },
        dueDate: {
          description: "Due date (YYYY-MM-DD)",
          type: "string",
        },
        items: {
          description: "Line items",
          items: {
            properties: {
              description: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
            },
            required: ["description", "quantity", "unitPrice"],
            type: "object",
          },
          type: "array",
        },
        notes: {
          description: "Notes",
          type: "string",
        },
      },
      required: ["customerId", "amount", "currency", "items"],
      type: "object" as const,
    },
    name: "prepare_draft_invoice",
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
    description:
      "Finalize and send a draft invoice. DESTRUCTIVE: once sent, the invoice cannot be unsent. " +
      "Requires explicit approval via draft ID.",
    inputSchema: {
      properties: {
        draftId: {
          description: "Draft ID from prepare_draft_invoice",
          type: "string",
        },
        sendEmail: {
          description: "Send to customer email",
          type: "boolean",
        },
      },
      required: ["draftId"],
      type: "object" as const,
    },
    name: "confirm_send_invoice",
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
    amount: (input.amount / 100).toFixed(2),
    currency: input.currency,
    customerName,
    dueDate: input.dueDate || "not set",
    items: input.items,
    previewUrl,
  };

  const draftId = store.saveDraft({
    createdBy: "user-123", // <CUSTOMISE> Get from context
    kind: "invoice",
    payload: {
      amount: input.amount,
      currency: input.currency,
      customerId: input.customerId,
      dueDate: input.dueDate,
      items: input.items,
      notes: input.notes,
    },
    preview,
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
    throw new Error(`Draft ${input.draftId} not found (may have expired or been used already)`);
  }

  // <CUSTOMISE> Call your invoice API to create and send
  const invoiceId = `invoice-${Date.now()}`;
  console.log(
    `[confirm_send_invoice] Sending invoice ${invoiceId} to customer ${draft.payload.customerId}`,
  );

  return {
    invoiceId,
    message: `Invoice ${invoiceId} sent${input.sendEmail ? " to customer email" : ""}`,
    sent: input.sendEmail,
  };
}

/**
 * Annotation metadata (for Claude Desktop, etc.).
 */
export const WRITE_ANNOTATIONS = {
  destructiveHint: false,
  idempotentHint: false,
  readOnlyHint: false,
} as const;

export const DESTRUCTIVE_ANNOTATIONS = {
  destructiveHint: true,
  idempotentHint: true,
  readOnlyHint: false,
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
      confirm_send_invoice: createConfirmSendInvoiceTool(this.store),
      prepare_draft_invoice: createPrepareDraftInvoiceTool(this.store),
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
    amount: 50000, // $500.00
    currency: "USD",
    customerId: "cust-456",
    dueDate: "2026-05-15",
    items: [
      {
        description: "Consulting services",
        quantity: 10,
        unitPrice: 50,
      },
    ],
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
