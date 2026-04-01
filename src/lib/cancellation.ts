import { recordAuditEvent } from "./audit.js";
import { getApproval, getRun } from "./db.js";
import { nowIso } from "./ids.js";
import type { RunRow } from "../types.js";

export async function cancelRun(args: {
  env: Env;
  tenantId: string;
  runId: string;
  traceId: string;
  actorType: string;
  actorRef?: string | null;
  reason: string;
}): Promise<{ run: RunRow; cancelledAt: string }> {
  const run = await getRun(args.env, args.tenantId, args.runId);
  if (!run) {
    throw new Error("run_not_found");
  }

  if (["completed", "failed", "cancelled"].includes(run.status)) {
    throw new Error("invalid_state_transition");
  }

  const pendingApproval =
    run.pending_approval_id === null
      ? null
      : await getApproval(args.env, args.tenantId, run.pending_approval_id);
  const cancelledAt = nowIso();
  await args.env.DB.batch([
    args.env.DB.prepare(
      `UPDATE runs
          SET status = 'cancelled',
              pending_approval_id = NULL,
              updated_at = ?1,
              completed_at = ?1
        WHERE tenant_id = ?2 AND run_id = ?3`,
    ).bind(cancelledAt, args.tenantId, args.runId),
    args.env.DB.prepare(
      `UPDATE approvals
          SET status = 'cancelled',
              decided_at = COALESCE(decided_at, ?1)
        WHERE tenant_id = ?2 AND run_id = ?3 AND status = 'pending'`,
    ).bind(cancelledAt, args.tenantId, args.runId),
    args.env.DB.prepare(
      `UPDATE a2a_tasks
          SET status = 'cancelled', updated_at = ?1
        WHERE tenant_id = ?2 AND run_id = ?3 AND status NOT IN ('completed', 'failed', 'cancelled')`,
    ).bind(cancelledAt, args.tenantId, args.runId),
  ]);

  if (pendingApproval && pendingApproval.status === "pending") {
      await recordAuditEvent({
        env: args.env,
        tenantId: args.tenantId,
        runId: args.runId,
        stepId: pendingApproval.step_id,
        traceId: args.traceId,
        eventType: "approval_cancelled",
        actorType: args.actorType,
        actorRef: args.actorRef ?? null,
        payload: {
          approval_id: pendingApproval.approval_id,
          policy_id: pendingApproval.policy_id,
          reason: args.reason,
        },
        createdAt: cancelledAt,
      });

      const approvalStub = args.env.APPROVAL_SESSION.get(args.env.APPROVAL_SESSION.idFromName(pendingApproval.approval_id));
      await approvalStub.fetch("https://approval-session.internal/cancel", {
        method: "POST",
        body: JSON.stringify({
          approval_id: pendingApproval.approval_id,
          run_id: pendingApproval.run_id,
          status: "cancelled",
          decision: null,
        }),
      });
  }

  const coordinatorStub = args.env.RUN_COORDINATOR.get(args.env.RUN_COORDINATOR.idFromName(args.runId));
  await coordinatorStub.fetch("https://run-coordinator.internal/approval", {
    method: "POST",
    body: JSON.stringify({ approval_id: null }),
  });
  await coordinatorStub.fetch("https://run-coordinator.internal/status", {
    method: "POST",
    body: JSON.stringify({ status: "cancelled" }),
  });

  try {
    const instance = await args.env.RUN_WORKFLOW.get(args.runId);
    await instance.terminate();
  } catch {
    // Ignore already-terminal races.
  }

  return { run, cancelledAt };
}
