import { createId, nowIso } from "./ids.js";
import { ApiError } from "./http.js";
import type { AuditEventEnvelope, AuditEventRow, AuditEventType } from "../types.js";

export interface RunEventsQueryOptions {
  pageSize?: number;
  cursor?: string | null;
}

const DEFAULT_EVENTS_PAGE_SIZE = 100;

export async function recordAuditEvent(args: {
  env: Env;
  tenantId: string;
  runId: string;
  stepId?: string | null;
  traceId: string;
  eventType: AuditEventType;
  actorType: string;
  actorRef?: string | null;
  payload: Record<string, unknown>;
  createdAt?: string;
}): Promise<string> {
  const eventId = createId("evt");
  const createdAt = args.createdAt ?? nowIso();
  const envelope: AuditEventEnvelope = {
    message_type: "audit_event",
    dedupe_key: `audit_event:${eventId}`,
    event_id: eventId,
    tenant_id: args.tenantId,
    run_id: args.runId,
    step_id: args.stepId ?? null,
    trace_id: args.traceId,
    event_type: args.eventType,
    actor: {
      type: args.actorType,
      ref: args.actorRef ?? null,
    },
    payload: args.payload,
    created_at: createdAt,
  };
  await args.env.DB.prepare(
    `INSERT INTO audit_events (
        event_id, tenant_id, run_id, step_id, trace_id, event_type, actor_type, actor_ref, payload_json, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
  )
    .bind(
      eventId,
      args.tenantId,
      args.runId,
      args.stepId ?? null,
      args.traceId,
      args.eventType,
      args.actorType,
      args.actorRef ?? null,
      JSON.stringify(args.payload),
      createdAt,
    )
    .run();

  try {
    await args.env.EVENT_QUEUE.send(envelope, { contentType: "json" });
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "audit_event_queue_publish_failed",
        event_id: eventId,
        tenant_id: args.tenantId,
        run_id: args.runId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  return eventId;
}

export async function listRunAuditEvents(
  env: Env,
  tenantId: string,
  runId: string,
  options: RunEventsQueryOptions = {},
): Promise<{
  items: AuditEventRow[];
  page_info: {
    next_cursor: string | null;
  };
}> {
  const pageSize = options.pageSize ?? DEFAULT_EVENTS_PAGE_SIZE;
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new ApiError(400, "invalid_request", "page_size must be a positive integer");
  }

  const offset = parseEventCursor(options.cursor);
  const result = await env.DB.prepare(
    `SELECT event_id, tenant_id, run_id, step_id, trace_id, event_type, actor_type, actor_ref, payload_json, created_at
       FROM audit_events
      WHERE tenant_id = ?1 AND run_id = ?2
      ORDER BY created_at ASC, event_id ASC
      LIMIT ?3 OFFSET ?4`,
  )
    .bind(tenantId, runId, pageSize + 1, offset)
    .run();

  const items = ((result.results ?? []) as unknown as AuditEventRow[]).slice(0, pageSize);
  const hasMore = (result.results ?? []).length > pageSize;
  return {
    items,
    page_info: {
      next_cursor: hasMore ? encodeEventCursor(offset + items.length) : null,
    },
  };
}

export async function listTenantAuditEvents(
  env: Env,
  tenantId: string,
): Promise<AuditEventRow[]> {
  const result = await env.DB.prepare(
    `SELECT event_id, tenant_id, run_id, step_id, trace_id, event_type, actor_type, actor_ref, payload_json, created_at
       FROM audit_events
      WHERE tenant_id = ?1
      ORDER BY created_at ASC, event_id ASC`,
  )
    .bind(tenantId)
    .run();

  return (result.results ?? []) as unknown as AuditEventRow[];
}

function encodeEventCursor(offset: number): string {
  return encodeURIComponent(JSON.stringify({ offset }));
}

function parseEventCursor(cursor: string | null | undefined): number {
  if (cursor === undefined || cursor === null || cursor === "") {
    return 0;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(cursor)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid cursor");
    }
    const candidate = parsed as { offset: unknown };
    if (
      typeof candidate.offset !== "number" ||
      !Number.isInteger(candidate.offset) ||
      candidate.offset < 0
    ) {
      throw new Error("invalid cursor");
    }
    return candidate.offset;
  } catch {
    throw new ApiError(400, "invalid_request", "cursor must be a valid event cursor");
  }
}
