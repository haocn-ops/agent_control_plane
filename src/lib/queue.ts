import { createId, nowIso } from "./ids.js";
import type { AuditEventEnvelope } from "../types.js";

export async function markQueueMessageProcessed(args: {
  env: Env;
  queueName: string;
  envelope: AuditEventEnvelope;
}): Promise<boolean> {
  const existing = await args.env.DB.prepare(
    `SELECT record_id
       FROM queue_dedupe_records
      WHERE queue_name = ?1 AND dedupe_key = ?2
      LIMIT 1`,
  )
    .bind(args.queueName, args.envelope.dedupe_key)
    .first<{ record_id: string }>();

  if (existing) {
    return false;
  }

  await args.env.DB.prepare(
    `INSERT INTO queue_dedupe_records (
        record_id, tenant_id, queue_name, message_type, dedupe_key, run_id, trace_id, processed_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
  )
    .bind(
      createId("qdedupe"),
      args.envelope.tenant_id,
      args.queueName,
      args.envelope.message_type,
      args.envelope.dedupe_key,
      args.envelope.run_id,
      args.envelope.trace_id,
      nowIso(),
    )
    .run();

  return true;
}
