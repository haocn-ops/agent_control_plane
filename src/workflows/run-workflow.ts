import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep, WorkflowTimeoutDuration } from "cloudflare:workers";
import { dispatchOutboundTask } from "../a2a/outbound.js";
import { expireApproval } from "../lib/approvals.js";
import { recordAuditEvent } from "../lib/audit.js";
import { getApproval, listActivePolicies } from "../lib/db.js";
import { createId, hashPayload, nowIso } from "../lib/ids.js";
import type {
  A2AStatusSignal,
  ApprovalDecisionSignal,
  OutboundA2ADispatchConfig,
  PolicyConditions,
  PolicyRow,
  PolicyDecision,
  RunWorkflowParams,
} from "../types.js";

interface PolicyEvaluationResult {
  channel: "a2a_dispatch" | "external_action";
  subjectType: "a2a_dispatch" | "external_action";
  subjectRef: string;
  decision: PolicyDecision;
  policyId: string | null;
  approverRoles: string[];
  timeoutSeconds: number;
  labels: string[];
  approvalPayloadTemplate?: string | null;
}

const DEFAULT_APPROVER_ROLES = ["legal_approver"];
const DEFAULT_EXTERNAL_POLICY_ID = "pol_default_external_send_v1";
const DEFAULT_A2A_POLICY_ID = "pol_default_a2a_dispatch_v1";
const DEFAULT_APPROVAL_TIMEOUT_SECONDS = 24 * 60 * 60;

export class RunWorkflow extends WorkflowEntrypoint<Env, RunWorkflowParams> {
  async run(event: Readonly<WorkflowEvent<RunWorkflowParams>>, step: WorkflowStep): Promise<{
    run_id: string;
    status: string;
  }> {
    const params = event.payload;

    let approvalIdForSummary: string | null = null;
    let approvalDecisionForSummary: ApprovalDecisionSignal | null = null;
    let outboundDispatchForSummary: Record<string, unknown> | null = null;

    const runningStartedAt = await step.do("mark-run-running", async () => {
      const timestamp = nowIso();
      await this.env.DB.prepare(
        "UPDATE runs SET status = ?1, updated_at = ?2 WHERE run_id = ?3 AND tenant_id = ?4",
      )
        .bind("running", timestamp, params.runId, params.tenantId)
        .run();

      await this.notifyCoordinator(params.runId, "/status", { status: "running" });
      return timestamp;
    });

    const plannerStep = await step.do("create-planner-step", async () => {
      const timestamp = nowIso();
      const stepId = createId("step");

      const replayContext = params.context.replay as Record<string, unknown> | undefined;
      const isStepReplay = replayContext?.mode === "from_step" && typeof replayContext.from_step_id === "string";
      const replayStartPhase = getReplayStartPhase(replayContext);

      await this.env.DB.batch([
        this.env.DB.prepare(
          `INSERT INTO run_steps (
              step_id, tenant_id, run_id, parent_step_id, sequence_no, step_type, actor_type, actor_ref,
              status, input_blob_key, output_blob_key, started_at, ended_at, error_code, metadata_json
            ) VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?6, ?7, ?8, NULL, NULL, ?9, ?10, NULL, ?11)`,
        ).bind(
          stepId,
          params.tenantId,
          params.runId,
          1,
          "planner",
          "agent",
          params.entryAgentId ?? "catalog_router",
          "completed",
          timestamp,
          timestamp,
          JSON.stringify({
            labels: params.policyContext.labels ?? [],
            is_replay: !!replayContext,
            replay_from_step: isStepReplay ? replayContext?.from_step_id : null,
            replay_start_phase: replayStartPhase,
          }),
        ),
        this.env.DB.prepare(
          "UPDATE runs SET current_step_id = ?1, updated_at = ?2 WHERE run_id = ?3 AND tenant_id = ?4",
        ).bind(stepId, timestamp, params.runId, params.tenantId),
      ]);

      await this.notifyCoordinator(params.runId, "/step", {
        current_step_id: stepId,
        sequence_no: 1,
      });

      return { stepId };
    });

    const replayContext = params.context.replay as Record<string, unknown> | undefined;
    const replayStartPhase = getReplayStartPhase(replayContext);
    const outboundDispatch = extractOutboundDispatch(params.context);

    const policyEvaluation: PolicyEvaluationResult =
      replayStartPhase === "approval_wait"
        ? await loadReplayApprovalEvaluation({
            env: this.env,
            tenantId: params.tenantId,
            replayContext,
            outboundDispatch,
            labels: params.policyContext.labels ?? [],
          })
        : replayStartPhase === "a2a_dispatch"
          ? buildReplayAllowEvaluation(outboundDispatch, params.policyContext.labels ?? [])
          : await step.do<PolicyEvaluationResult>("evaluate-policy", async () => {
              const payload = await this.readInput(params.inputBlobKey);
              const input =
                payload && typeof payload.input === "object" && payload.input ? payload.input : null;
              const text =
                input && "text" in input && typeof input.text === "string" ? input.text : "";
              const evaluation = await evaluateWorkflowPolicy({
                env: this.env,
                tenantId: params.tenantId,
                labels: params.policyContext.labels ?? [],
                riskTier: params.policyContext.risk_tier,
                text,
                outboundDispatch,
              });

              await recordAuditEvent({
                env: this.env,
                tenantId: params.tenantId,
                runId: params.runId,
                stepId: plannerStep.stepId,
                traceId: params.traceId,
                eventType: "policy_evaluated",
                actorType: "system",
                actorRef: "run_workflow",
                payload: {
                  channel: evaluation.channel,
                  subject_ref: evaluation.subjectRef,
                  decision: evaluation.decision,
                  policy_id: evaluation.policyId,
                  labels: evaluation.labels,
                },
              });

              return evaluation;
            });

    if (policyEvaluation.decision === "deny") {
      await step.do("block-denied-policy", async () => {
        const timestamp = nowIso();
        await this.env.DB.prepare(
          "UPDATE runs SET status = ?1, error_code = ?2, error_message = ?3, updated_at = ?4, completed_at = ?4 WHERE run_id = ?5 AND tenant_id = ?6",
        )
          .bind(
            "failed",
            "policy_denied",
            `Policy denied ${policyEvaluation.channel} for ${policyEvaluation.subjectRef}`,
            timestamp,
            params.runId,
            params.tenantId,
          )
          .run();

        await recordAuditEvent({
          env: this.env,
          tenantId: params.tenantId,
          runId: params.runId,
          stepId: plannerStep.stepId,
          traceId: params.traceId,
          eventType: "side_effect_blocked",
          actorType: "system",
          actorRef: "run_workflow",
          payload: {
            channel: policyEvaluation.channel,
            subject_ref: policyEvaluation.subjectRef,
            decision: policyEvaluation.decision,
            policy_id: policyEvaluation.policyId,
          },
          createdAt: timestamp,
        });

        await this.notifyCoordinator(params.runId, "/status", { status: "failed" });
      });

      return {
        run_id: params.runId,
        status: "failed",
      };
    }

    const needsApproval = policyEvaluation.decision === "approval_required";

    if (needsApproval) {
      const approvalId = await step.do("create-approval", async () => {
        const timestamp = nowIso();
        const approvalId = createId("apr");
        const approvalPayload = await buildWorkflowApprovalPayload({
          env: this.env,
          tenantId: params.tenantId,
          runId: params.runId,
          stepId: plannerStep.stepId,
          traceId: params.traceId,
          inputBlobKey: params.inputBlobKey,
          policyContext: params.policyContext,
          outboundDispatch,
          policyEvaluation,
        });
        const approvalBlobKey = `tenants/${params.tenantId}/runs/${params.runId}/audit/${approvalId}.json`;
        await this.env.ARTIFACTS_BUCKET.put(approvalBlobKey, JSON.stringify(approvalPayload, null, 2), {
          httpMetadata: {
            contentType: "application/json",
          },
        });

        await this.env.DB.batch([
          this.env.DB.prepare(
            `INSERT INTO approvals (
                approval_id, tenant_id, run_id, step_id, policy_id, subject_type, subject_ref, status,
                requested_by, approver_scope_json, decision_by, decision_comment, decision_reason_code,
                expires_at, created_at, decided_at
              ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NULL, NULL, NULL, ?11, ?12, NULL)`,
          ).bind(
            approvalId,
            params.tenantId,
            params.runId,
            plannerStep.stepId,
            policyEvaluation.policyId ??
              (policyEvaluation.channel === "a2a_dispatch"
                ? DEFAULT_A2A_POLICY_ID
                : DEFAULT_EXTERNAL_POLICY_ID),
            policyEvaluation.subjectType,
            policyEvaluation.subjectRef,
            "pending",
            params.subjectId,
            JSON.stringify({
              approver_roles:
                policyEvaluation.approverRoles.length > 0
                  ? policyEvaluation.approverRoles
                  : DEFAULT_APPROVER_ROLES,
            }),
            new Date(Date.now() + policyEvaluation.timeoutSeconds * 1000).toISOString(),
            timestamp,
          ),
          this.env.DB.prepare(
            `INSERT INTO run_steps (
                step_id, tenant_id, run_id, parent_step_id, sequence_no, step_type, actor_type, actor_ref,
                status, input_blob_key, output_blob_key, started_at, ended_at, error_code, metadata_json
              ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL, NULL, ?10, NULL, NULL, ?11)`,
          ).bind(
            createId("step"),
            params.tenantId,
            params.runId,
            plannerStep.stepId,
            2,
            "approval_wait",
            "system",
            "approval_gateway",
            "blocked",
            timestamp,
            JSON.stringify({ approval_id: approvalId }),
          ),
          this.env.DB.prepare(
            "UPDATE runs SET status = ?1, pending_approval_id = ?2, updated_at = ?3 WHERE run_id = ?4 AND tenant_id = ?5",
          ).bind("waiting_approval", approvalId, timestamp, params.runId, params.tenantId),
        ]);

        await recordAuditEvent({
          env: this.env,
          tenantId: params.tenantId,
          runId: params.runId,
          stepId: plannerStep.stepId,
          traceId: params.traceId,
          eventType: "approval_created",
          actorType: "system",
          actorRef: "approval_gateway",
          payload: {
            approval_id: approvalId,
            policy_id:
              policyEvaluation.policyId ??
              (policyEvaluation.channel === "a2a_dispatch"
                ? DEFAULT_A2A_POLICY_ID
                : DEFAULT_EXTERNAL_POLICY_ID),
            subject_type: policyEvaluation.subjectType,
            subject_ref: policyEvaluation.subjectRef,
            approval_blob_key: approvalBlobKey,
          },
          createdAt: timestamp,
        });

        await this.notifyCoordinator(params.runId, "/approval", { approval_id: approvalId });

        const stub = this.env.APPROVAL_SESSION.get(
          this.env.APPROVAL_SESSION.idFromName(approvalId),
        );
        await stub.fetch("https://approval-session.internal/init", {
          method: "POST",
          body: JSON.stringify({
            approval_id: approvalId,
            run_id: params.runId,
            status: "pending",
            decision: null,
          }),
        });

        return approvalId;
      });
      approvalIdForSummary = approvalId;

      let approvalEvent;
      try {
        approvalEvent = await step.waitForEvent<ApprovalDecisionSignal>("wait-for-approval", {
          type: "approval.decision",
          timeout: formatWorkflowWaitTimeout(policyEvaluation.timeoutSeconds),
        });
      } catch (error) {
        const expired = await expireApproval({
          env: this.env,
          tenantId: params.tenantId,
          approvalId,
          traceId: params.traceId,
          reason: "workflow_timeout",
          actorType: "system",
          actorRef: "run_workflow",
        });
        if (expired) {
          return {
            run_id: params.runId,
            status: "failed",
          };
        }
        throw error;
      }

      approvalDecisionForSummary = approvalEvent.payload;

      await step.do("apply-approval-decision", async () => {
        const timestamp = nowIso();
        const decision = approvalEvent.payload.decision;
        const terminalStatus = decision === "approved" ? "running" : "failed";
        await this.env.DB.prepare(
          `UPDATE runs
              SET status = ?1,
                  pending_approval_id = NULL,
                  error_code = CASE WHEN ?2 = 'rejected' THEN 'approval_rejected' ELSE error_code END,
                  error_message = CASE WHEN ?2 = 'rejected' THEN 'Approval was rejected' ELSE error_message END,
                  updated_at = ?3,
                  completed_at = CASE WHEN ?2 = 'rejected' THEN ?3 ELSE completed_at END
            WHERE run_id = ?4 AND tenant_id = ?5`,
        )
          .bind(terminalStatus, decision, timestamp, params.runId, params.tenantId)
          .run();

        await this.notifyCoordinator(params.runId, "/approval", { approval_id: null });
        if (decision === "rejected") {
          await this.notifyCoordinator(params.runId, "/status", { status: "failed" });
        } else {
          await this.notifyCoordinator(params.runId, "/status", { status: "running" });
        }

        return approvalId;
      });

      if (approvalEvent.payload.decision === "rejected") {
        return {
          run_id: params.runId,
          status: "failed",
        };
      }
    }

    if (outboundDispatch) {
      const dispatchResult = await step.do("dispatch-outbound-a2a-task", async () => {
        const timestamp = nowIso();
        const stepId = createId("step");
        const dispatchSequenceNo = needsApproval ? 3 : 2;
        const result = await dispatchOutboundTask({
          env: this.env,
          tenantId: params.tenantId,
          runId: params.runId,
          traceId: params.traceId,
          subjectId: params.subjectId,
          config: outboundDispatch,
        });

        await this.env.DB.batch([
          this.env.DB.prepare(
            `INSERT INTO run_steps (
                step_id, tenant_id, run_id, parent_step_id, sequence_no, step_type, actor_type, actor_ref,
                status, input_blob_key, output_blob_key, started_at, ended_at, error_code, metadata_json
              ) VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?6, ?7, ?8, NULL, NULL, ?9, ?9, NULL, ?10)`,
          ).bind(
            stepId,
            params.tenantId,
            params.runId,
            dispatchSequenceNo,
            "a2a_dispatch",
            "agent",
            outboundDispatch.agent_id,
            result.status === "completed" ? "completed" : "running",
            timestamp,
            JSON.stringify({
              tool_provider_id: outboundDispatch.tool_provider_id ?? null,
              task_id: result.taskId,
              remote_task_id: result.remoteTaskId,
              endpoint_url: outboundDispatch.endpoint_url,
              resolved_endpoint_url: result.resolvedEndpointUrl ?? outboundDispatch.endpoint_url,
              agent_card_url: result.agentCardUrl ?? null,
              used_agent_card: result.usedAgentCard ?? false,
            }),
          ),
          this.env.DB.prepare(
            "UPDATE runs SET current_step_id = ?1, updated_at = ?2 WHERE run_id = ?3 AND tenant_id = ?4",
          ).bind(stepId, timestamp, params.runId, params.tenantId),
        ]);

        await recordAuditEvent({
          env: this.env,
          tenantId: params.tenantId,
          runId: params.runId,
          stepId,
          traceId: params.traceId,
          eventType: "side_effect_executed",
          actorType: "agent",
          actorRef: outboundDispatch.agent_id,
          payload: {
            channel: "a2a_dispatch",
            tool_provider_id: outboundDispatch.tool_provider_id ?? null,
            task_id: result.taskId,
            remote_task_id: result.remoteTaskId,
            endpoint_url: outboundDispatch.endpoint_url,
            resolved_endpoint_url: result.resolvedEndpointUrl ?? outboundDispatch.endpoint_url,
            agent_card_url: result.agentCardUrl ?? null,
            used_agent_card: result.usedAgentCard ?? false,
            status: result.status,
          },
          createdAt: timestamp,
        });

        await this.notifyCoordinator(params.runId, "/step", { step_id: stepId });
        return result;
      });

      outboundDispatchForSummary = {
        channel: "a2a_dispatch",
        agent_id: outboundDispatch.agent_id,
        tool_provider_id: outboundDispatch.tool_provider_id ?? null,
        endpoint_url: outboundDispatch.endpoint_url,
        wait_for_completion: outboundDispatch.wait_for_completion ?? false,
        task_id: dispatchResult.taskId,
        remote_task_id: dispatchResult.remoteTaskId,
        resolved_endpoint_url: dispatchResult.resolvedEndpointUrl ?? outboundDispatch.endpoint_url,
        agent_card_url: dispatchResult.agentCardUrl ?? null,
        used_agent_card: dispatchResult.usedAgentCard ?? false,
        dispatch_status: dispatchResult.status,
        remote_status: null,
        remote_artifact_written: false,
      };

      if (outboundDispatch.wait_for_completion) {
        const remoteEvent = await step.waitForEvent<A2AStatusSignal>("wait-for-a2a-status", {
          type: "a2a.task.status",
          timeout: "12 hours",
        });

        if (outboundDispatchForSummary) {
          outboundDispatchForSummary.remote_status = remoteEvent.payload.status;
          outboundDispatchForSummary.remote_artifact_written = !!remoteEvent.payload.artifact_json;
        }

        await step.do("apply-a2a-status", async () => {
          const timestamp = nowIso();
          if (remoteEvent.payload.status === "failed" || remoteEvent.payload.status === "cancelled") {
            await this.env.DB.prepare(
              "UPDATE runs SET status = ?1, error_code = ?2, error_message = ?3, updated_at = ?4, completed_at = ?4 WHERE run_id = ?5 AND tenant_id = ?6",
            )
              .bind(
                "failed",
                "a2a_remote_failed",
                `Remote A2A task ended with status ${remoteEvent.payload.status}`,
                timestamp,
                params.runId,
                params.tenantId,
              )
              .run();
            await this.notifyCoordinator(params.runId, "/status", { status: "failed" });
          }

          if (remoteEvent.payload.artifact_json) {
            const artifact = JSON.parse(remoteEvent.payload.artifact_json) as Record<string, unknown>;
            const artifactId = createId("art");
            const r2Key = `tenants/${params.tenantId}/runs/${params.runId}/artifacts/${artifactId}.json`;
            const body = JSON.stringify(artifact, null, 2);
            await this.env.ARTIFACTS_BUCKET.put(r2Key, body, {
              httpMetadata: {
                contentType: "application/json",
              },
            });
            await this.env.DB.prepare(
              `INSERT INTO artifacts (
                  artifact_id, tenant_id, run_id, step_id, artifact_type, mime_type, r2_key, sha256, size_bytes, created_at
                ) VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?6, ?7, ?8, ?9)`,
            )
              .bind(
                artifactId,
                params.tenantId,
                params.runId,
                "a2a_remote_artifact",
                "application/json",
                r2Key,
                await hashPayload(artifact),
                body.length,
                timestamp,
              )
              .run();
          }

          return remoteEvent.payload.status;
        });

        if (remoteEvent.payload.status === "failed" || remoteEvent.payload.status === "cancelled") {
          return {
            run_id: params.runId,
            status: "failed",
          };
        }
      } else if (dispatchResult.status === "completed") {
        await step.do("record-outbound-completion-summary", async () => {
          const timestamp = nowIso();
          await this.env.DB.prepare(
            "UPDATE runs SET updated_at = ?1 WHERE run_id = ?2 AND tenant_id = ?3",
          )
            .bind(timestamp, params.runId, params.tenantId)
            .run();
          return dispatchResult.taskId;
        });
      }
    }

    const runSummary = await step.do("write-artifact", async () => {
      const timestamp = nowIso();
      const artifactId = createId("art");
      const replayContext = params.context.replay as Record<string, unknown> | undefined;
      const replayFromStepId =
        replayContext?.mode === "from_step" && typeof replayContext.from_step_id === "string"
          ? replayContext.from_step_id
          : null;
      const replayStartPhase = getReplayStartPhase(replayContext);

      let effectivePolicyId: string | null = null;
      let policySource: "matched" | "default" | "none" = "none";
      if (policyEvaluation.policyId) {
        effectivePolicyId = policyEvaluation.policyId;
        policySource = "matched";
      } else if (needsApproval) {
        effectivePolicyId =
          policyEvaluation.channel === "a2a_dispatch" ? DEFAULT_A2A_POLICY_ID : DEFAULT_EXTERNAL_POLICY_ID;
        policySource = "default";
      }

      const artifactPayload = {
        kind: "run_summary_v1",
        run_id: params.runId,
        tenant_id: params.tenantId,
        trace_id: params.traceId,
        request_id: params.requestId,
        status: "completed",
        summary: needsApproval ? "Run completed after approval." : "Run completed.",
        started_at: runningStartedAt,
        completed_at: timestamp,
        replay:
          replayContext && typeof replayContext.mode === "string"
            ? {
                mode: replayContext.mode,
                from_step_id: replayFromStepId,
                start_phase: replayStartPhase,
                reason: typeof replayContext.reason === "string" ? replayContext.reason : null,
              }
            : null,
        subject: {
          subject_id: params.subjectId,
          entry_agent_id: params.entryAgentId,
        },
        policy: {
          channel: policyEvaluation.channel,
          subject_ref: policyEvaluation.subjectRef,
          decision: policyEvaluation.decision,
          matched_policy_id: policyEvaluation.policyId,
          effective_policy_id: effectivePolicyId,
          policy_source: policySource,
          approver_roles:
            policyEvaluation.approverRoles.length > 0 ? policyEvaluation.approverRoles : DEFAULT_APPROVER_ROLES,
          timeout_seconds: policyEvaluation.timeoutSeconds,
          labels: policyEvaluation.labels,
          risk_tier: params.policyContext.risk_tier ?? null,
          approval_required: needsApproval,
        },
        approval:
          approvalIdForSummary || approvalDecisionForSummary
            ? {
                approval_id: approvalIdForSummary ?? approvalDecisionForSummary?.approval_id ?? null,
                decision: approvalDecisionForSummary?.decision ?? null,
                decided_by: approvalDecisionForSummary?.decided_by ?? null,
                decided_at: approvalDecisionForSummary?.decided_at ?? null,
                comment: approvalDecisionForSummary?.comment ?? null,
                reason_code: approvalDecisionForSummary?.reason_code ?? null,
              }
            : null,
        outbound: outboundDispatchForSummary,
        generated_at: timestamp,
      };
      const body = JSON.stringify(artifactPayload, null, 2);
      const r2Key = `tenants/${params.tenantId}/runs/${params.runId}/artifacts/${artifactId}.json`;
      await this.env.ARTIFACTS_BUCKET.put(r2Key, body, {
        httpMetadata: {
          contentType: "application/json",
        },
      });

      await this.env.DB.prepare(
        `INSERT INTO artifacts (
            artifact_id, tenant_id, run_id, step_id, artifact_type, mime_type, r2_key, sha256, size_bytes, created_at
          ) VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?6, ?7, ?8, ?9)`,
      )
        .bind(
          artifactId,
          params.tenantId,
          params.runId,
          "run_summary",
          "application/json",
          r2Key,
          await hashPayload(artifactPayload),
          body.length,
          timestamp,
        )
        .run();

      return { artifactId, completedAt: timestamp };
    });

    await step.do("finalize-run", async () => {
      await this.env.DB.prepare(
        "UPDATE runs SET status = ?1, updated_at = ?2, completed_at = ?2 WHERE run_id = ?3 AND tenant_id = ?4",
      )
        .bind("completed", runSummary.completedAt, params.runId, params.tenantId)
        .run();
      await this.notifyCoordinator(params.runId, "/status", { status: "completed" });
      return { status: "completed" };
    });

    return {
      run_id: params.runId,
      status: "completed",
    };
  }

  private async readInput(inputBlobKey: string): Promise<Record<string, unknown> | null> {
    const object = await this.env.ARTIFACTS_BUCKET.get(inputBlobKey);
    if (!object) {
      return null;
    }
    return (await object.json()) as Record<string, unknown>;
  }

  private async notifyCoordinator(
    runId: string,
    pathname: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    const stub = this.env.RUN_COORDINATOR.get(this.env.RUN_COORDINATOR.idFromName(runId));
    await stub.fetch(`https://run-coordinator.internal${pathname}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

function getReplayStartPhase(
  replayContext: Record<string, unknown> | undefined,
): "planner" | "approval_wait" | "a2a_dispatch" | null {
  if (!replayContext || replayContext.mode !== "from_step") {
    return null;
  }

  if (replayContext.start_phase === "planner") {
    return "planner";
  }
  if (replayContext.start_phase === "approval_wait") {
    return "approval_wait";
  }
  if (replayContext.start_phase === "a2a_dispatch") {
    return "a2a_dispatch";
  }
  return null;
}

function extractOutboundDispatch(
  context: Record<string, unknown>,
): OutboundA2ADispatchConfig | null {
  const candidate =
    context.a2a_dispatch &&
    typeof context.a2a_dispatch === "object" &&
    !Array.isArray(context.a2a_dispatch)
      ? (context.a2a_dispatch as Record<string, unknown>)
      : null;

  if (!candidate) {
    return null;
  }

  if (typeof candidate.endpoint_url !== "string" || typeof candidate.agent_id !== "string") {
    return null;
  }

  return {
    ...(typeof candidate.tool_provider_id === "string" ? { tool_provider_id: candidate.tool_provider_id } : {}),
    ...(candidate.provider_type === "mcp_server" ||
    candidate.provider_type === "mcp_portal" ||
    candidate.provider_type === "http_api"
      ? { provider_type: candidate.provider_type }
      : {}),
    endpoint_url: candidate.endpoint_url,
    agent_id: candidate.agent_id,
    ...(typeof candidate.auth_ref === "string" ? { auth_ref: candidate.auth_ref } : {}),
    ...(typeof candidate.task_id === "string" ? { task_id: candidate.task_id } : {}),
    ...(typeof candidate.message_text === "string" ? { message_text: candidate.message_text } : {}),
    ...(typeof candidate.wait_for_completion === "boolean"
      ? { wait_for_completion: candidate.wait_for_completion }
      : {}),
    ...(candidate.metadata && typeof candidate.metadata === "object" && !Array.isArray(candidate.metadata)
      ? { metadata: candidate.metadata as Record<string, unknown> }
      : {}),
  };
}

async function buildWorkflowApprovalPayload(args: {
  env: Env;
  tenantId: string;
  runId: string;
  stepId: string;
  traceId: string;
  inputBlobKey: string;
  policyContext: RunWorkflowParams["policyContext"];
  outboundDispatch: OutboundA2ADispatchConfig | null;
  policyEvaluation: PolicyEvaluationResult;
}): Promise<Record<string, unknown>> {
  if (args.policyEvaluation.approvalPayloadTemplate) {
    return mergeReplayApprovalPayloadTemplate(args.policyEvaluation.approvalPayloadTemplate, {
      traceId: args.traceId,
      runId: args.runId,
      stepId: args.stepId,
    });
  }

  const inputPayload = await readApprovalInputPayload(args.env, args.inputBlobKey);
  const input =
    inputPayload?.input && typeof inputPayload.input === "object" && !Array.isArray(inputPayload.input)
      ? (inputPayload.input as Record<string, unknown>)
      : null;
  const inputText = typeof input?.text === "string" ? input.text : null;
  const inputStructuredPayload =
    input?.payload && typeof input.payload === "object" && !Array.isArray(input.payload)
      ? (input.payload as Record<string, unknown>)
      : null;

  return {
    summary: {
      action: args.policyEvaluation.channel === "a2a_dispatch" ? "dispatch_a2a_task" : "external_action",
      provider: args.outboundDispatch?.tool_provider_id ?? null,
      risk_level: normalizePolicyRiskLevel(args.policyContext.risk_tier),
      reason: buildWorkflowApprovalReason(args.policyEvaluation, args.outboundDispatch),
    },
    subject_snapshot: args.outboundDispatch
      ? {
          tool_provider_id: args.outboundDispatch.tool_provider_id ?? null,
          agent_id: args.outboundDispatch.agent_id,
          endpoint_url: args.outboundDispatch.endpoint_url,
          message_text: args.outboundDispatch.message_text ?? null,
          wait_for_completion: args.outboundDispatch.wait_for_completion ?? false,
          metadata: args.outboundDispatch.metadata ?? null,
          input_text: inputText,
        }
      : {
          input_text: inputText,
          input_payload: inputStructuredPayload,
          labels: args.policyEvaluation.labels,
        },
    trace: {
      trace_id: args.traceId,
      run_id: args.runId,
      step_id: args.stepId,
    },
  };
}

function mergeReplayApprovalPayloadTemplate(
  template: string,
  trace: { traceId: string; runId: string; stepId: string },
): Record<string, unknown> {
  const parsedTemplate = parseReplayApprovalPayloadTemplate(template);
  const summary =
    parsedTemplate?.summary &&
    typeof parsedTemplate.summary === "object" &&
    !Array.isArray(parsedTemplate.summary)
      ? (parsedTemplate.summary as Record<string, unknown>)
      : {};
  const subjectSnapshot =
    parsedTemplate?.subject_snapshot &&
    typeof parsedTemplate.subject_snapshot === "object" &&
    !Array.isArray(parsedTemplate.subject_snapshot)
      ? (parsedTemplate.subject_snapshot as Record<string, unknown>)
      : {};

  return {
    summary,
    subject_snapshot: subjectSnapshot,
    trace: {
      trace_id: trace.traceId,
      run_id: trace.runId,
      step_id: trace.stepId,
    },
  };
}

async function readApprovalInputPayload(
  env: Env,
  inputBlobKey: string,
): Promise<Record<string, unknown> | null> {
  const object = await env.ARTIFACTS_BUCKET.get(inputBlobKey);
  if (!object) {
    return null;
  }
  return (await object.json()) as Record<string, unknown>;
}

function buildWorkflowApprovalReason(
  policyEvaluation: PolicyEvaluationResult,
  outboundDispatch: OutboundA2ADispatchConfig | null,
): string {
  if (policyEvaluation.policyId) {
    return `matched policy ${policyEvaluation.policyId}`;
  }
  if (outboundDispatch?.tool_provider_id) {
    return `provider-scoped outbound A2A dispatch for ${outboundDispatch.tool_provider_id}`;
  }
  return "workflow fallback approval policy";
}

async function evaluateWorkflowPolicy(args: {
  env: Env;
  tenantId: string;
  labels: string[];
  riskTier: string | undefined;
  text: string;
  outboundDispatch: OutboundA2ADispatchConfig | null;
}): Promise<PolicyEvaluationResult> {
  if (args.outboundDispatch?.tool_provider_id) {
    const policies = await listActivePolicies(
      args.env,
      args.tenantId,
      "a2a_dispatch",
      args.outboundDispatch.tool_provider_id,
    );
    const matchedPolicy = selectBestPolicy({
      policies,
      toolProviderId: args.outboundDispatch.tool_provider_id,
      labels: args.labels,
      riskLevel: normalizePolicyRiskLevel(args.riskTier),
    });
    if (matchedPolicy) {
      return {
        channel: "a2a_dispatch",
        subjectType: "a2a_dispatch",
        subjectRef: args.outboundDispatch.tool_provider_id,
        decision: matchedPolicy.decision,
        policyId: matchedPolicy.policy_id,
        approverRoles: parsePolicyApproverRoles(matchedPolicy),
        timeoutSeconds: parsePolicyApprovalTimeoutSeconds(matchedPolicy),
        labels: args.labels,
      };
    }
  }

  return buildHeuristicPolicyEvaluation({
    labels: args.labels,
    text: args.text,
    outboundDispatch: args.outboundDispatch,
  });
}

async function loadReplayApprovalEvaluation(args: {
  env: Env;
  tenantId: string;
  replayContext: Record<string, unknown> | undefined;
  outboundDispatch: OutboundA2ADispatchConfig | null;
  labels: string[];
}): Promise<PolicyEvaluationResult> {
  const restored = await restoreReplayApprovalEvaluation(args);
  if (restored) {
    return restored;
  }

  return buildReplayApprovalEvaluation(args.outboundDispatch, args.labels);
}

async function restoreReplayApprovalEvaluation(args: {
  env: Env;
  tenantId: string;
  replayContext: Record<string, unknown> | undefined;
  outboundDispatch: OutboundA2ADispatchConfig | null;
  labels: string[];
}): Promise<PolicyEvaluationResult | null> {
  const sourceRunId =
    args.replayContext && typeof args.replayContext.source_run_id === "string"
      ? args.replayContext.source_run_id
      : null;
  const anchorStepId =
    args.replayContext && typeof args.replayContext.anchor_step_id === "string"
      ? args.replayContext.anchor_step_id
      : null;

  if (!sourceRunId || !anchorStepId) {
    return null;
  }

  const sourceApprovalStep = await args.env.DB.prepare(
    `SELECT metadata_json
       FROM run_steps
      WHERE tenant_id = ?1 AND run_id = ?2 AND step_id = ?3 AND step_type = 'approval_wait'`,
  )
    .bind(args.tenantId, sourceRunId, anchorStepId)
    .first<{ metadata_json: string }>();
  const sourceApprovalId = parseReplayApprovalId(sourceApprovalStep?.metadata_json ?? null);
  if (!sourceApprovalId) {
    return null;
  }

  const approval = await getApproval(args.env, args.tenantId, sourceApprovalId);
  if (!approval) {
    return null;
  }

  return {
    channel: approval.subject_type === "a2a_dispatch" ? "a2a_dispatch" : "external_action",
    subjectType: approval.subject_type === "a2a_dispatch" ? "a2a_dispatch" : "external_action",
    subjectRef: approval.subject_ref,
    decision: "approval_required",
    policyId: approval.policy_id,
    approverRoles: parseApprovalScopeRoles(approval.approver_scope_json),
    timeoutSeconds: parseApprovalTimeoutSecondsFromRow(approval.created_at, approval.expires_at),
    labels: args.labels,
    approvalPayloadTemplate: await readReplayApprovalPayload(args.env, args.tenantId, sourceRunId, sourceApprovalId),
  };
}

function buildReplayApprovalEvaluation(
  outboundDispatch: OutboundA2ADispatchConfig | null,
  labels: string[],
): PolicyEvaluationResult {
  return buildHeuristicPolicyEvaluation({
    labels,
    text: "",
    outboundDispatch,
    forcedDecision: "approval_required",
  });
}

function buildReplayAllowEvaluation(
  outboundDispatch: OutboundA2ADispatchConfig | null,
  labels: string[],
): PolicyEvaluationResult {
  return buildHeuristicPolicyEvaluation({
    labels,
    text: "",
    outboundDispatch,
    forcedDecision: "allow",
  });
}

function buildHeuristicPolicyEvaluation(args: {
  labels: string[];
  text: string;
  outboundDispatch: OutboundA2ADispatchConfig | null;
  forcedDecision?: PolicyDecision;
}): PolicyEvaluationResult {
  const normalizedText = args.text.toLowerCase();
  const looksExternalAction =
    args.labels.includes("external-send") ||
    args.text.includes("外發") ||
    normalizedText.includes("external");

  const decision = args.forcedDecision ?? (looksExternalAction ? "approval_required" : "allow");

  if (args.outboundDispatch?.tool_provider_id) {
    return {
      channel: "a2a_dispatch",
      subjectType: "a2a_dispatch",
      subjectRef: args.outboundDispatch.tool_provider_id,
      decision,
      policyId: decision === "approval_required" ? DEFAULT_A2A_POLICY_ID : null,
      approverRoles: DEFAULT_APPROVER_ROLES,
      timeoutSeconds: DEFAULT_APPROVAL_TIMEOUT_SECONDS,
      labels: args.labels,
      approvalPayloadTemplate: null,
    };
  }

  return {
    channel: "external_action",
    subjectType: "external_action",
    subjectRef: "send_email",
    decision,
    policyId: decision === "approval_required" ? DEFAULT_EXTERNAL_POLICY_ID : null,
    approverRoles: DEFAULT_APPROVER_ROLES,
    timeoutSeconds: DEFAULT_APPROVAL_TIMEOUT_SECONDS,
    labels: args.labels,
    approvalPayloadTemplate: null,
  };
}

function parseReplayApprovalId(metadataJson: string | null): string | null {
  if (!metadataJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(metadataJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return typeof (parsed as Record<string, unknown>).approval_id === "string"
      ? ((parsed as Record<string, unknown>).approval_id as string)
      : null;
  } catch {
    return null;
  }
}

function parseApprovalScopeRoles(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_APPROVER_ROLES;
    }
    const approverRoles = (parsed as Record<string, unknown>).approver_roles;
    if (!Array.isArray(approverRoles)) {
      return DEFAULT_APPROVER_ROLES;
    }
    const roles = approverRoles.filter((value): value is string => typeof value === "string");
    return roles.length > 0 ? roles : DEFAULT_APPROVER_ROLES;
  } catch {
    return DEFAULT_APPROVER_ROLES;
  }
}

function parseApprovalTimeoutSecondsFromRow(createdAt: string, expiresAt: string | null): number {
  if (!expiresAt) {
    return DEFAULT_APPROVAL_TIMEOUT_SECONDS;
  }
  const createdAtMs = Date.parse(createdAt);
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(expiresAtMs) || expiresAtMs <= createdAtMs) {
    return DEFAULT_APPROVAL_TIMEOUT_SECONDS;
  }
  return Math.max(1, Math.round((expiresAtMs - createdAtMs) / 1000));
}

async function readReplayApprovalPayload(
  env: Env,
  tenantId: string,
  sourceRunId: string,
  approvalId: string,
): Promise<string | null> {
  const object = await env.ARTIFACTS_BUCKET.get(`tenants/${tenantId}/runs/${sourceRunId}/audit/${approvalId}.json`);
  if (!object) {
    return null;
  }
  const parsed = (await object.json()) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? JSON.stringify(parsed)
    : null;
}

function parseReplayApprovalPayloadTemplate(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function parsePolicyApproverRoles(policy: PolicyRow): string[] {
  try {
    const parsed = JSON.parse(policy.approval_config_json) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const approverRoles = (parsed as Record<string, unknown>).approver_roles;
      if (Array.isArray(approverRoles)) {
        const roles = approverRoles.filter((value): value is string => typeof value === "string");
        if (roles.length > 0) {
          return roles;
        }
      }
    }
  } catch {}

  try {
    const parsed = JSON.parse(policy.approver_roles_json) as unknown;
    if (Array.isArray(parsed)) {
      const roles = parsed.filter((value): value is string => typeof value === "string");
      if (roles.length > 0) {
        return roles;
      }
    }
  } catch {}

  return DEFAULT_APPROVER_ROLES;
}

function parsePolicyApprovalTimeoutSeconds(policy: PolicyRow): number {
  try {
    const parsed = JSON.parse(policy.approval_config_json) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const timeoutSeconds = (parsed as Record<string, unknown>).timeout_seconds;
      if (typeof timeoutSeconds === "number" && Number.isFinite(timeoutSeconds) && timeoutSeconds > 0) {
        return timeoutSeconds;
      }
    }
  } catch {}

  return DEFAULT_APPROVAL_TIMEOUT_SECONDS;
}

function selectBestPolicy(args: {
  policies: PolicyRow[];
  toolProviderId: string;
  labels: string[];
  riskLevel: PolicyConditions["risk_level"] | null;
}): PolicyRow | null {
  let bestPolicy: PolicyRow | null = null;

  for (const policy of args.policies) {
    if (policy.tool_name !== null) {
      continue;
    }

    const conditions = parsePolicyConditions(policy.conditions_json);
    if (!conditions || !matchesPolicyConditions(conditions, args)) {
      continue;
    }

    if (!bestPolicy) {
      bestPolicy = policy;
      continue;
    }

    if (policy.priority !== bestPolicy.priority) {
      if (policy.priority > bestPolicy.priority) {
        bestPolicy = policy;
      }
      continue;
    }

    const policySpecificity = getPolicySpecificity(policy, args.toolProviderId, conditions);
    const bestSpecificity = getPolicySpecificity(
      bestPolicy,
      args.toolProviderId,
      parsePolicyConditions(bestPolicy.conditions_json) ?? {},
    );
    if (policySpecificity !== bestSpecificity) {
      if (policySpecificity > bestSpecificity) {
        bestPolicy = policy;
      }
      continue;
    }

    const policySeverity = getPolicyDecisionSeverity(policy.decision);
    const bestSeverity = getPolicyDecisionSeverity(bestPolicy.decision);
    if (policySeverity > bestSeverity) {
      bestPolicy = policy;
      continue;
    }
    if (policySeverity < bestSeverity) {
      continue;
    }

    if (policy.updated_at !== bestPolicy.updated_at) {
      if (policy.updated_at > bestPolicy.updated_at) {
        bestPolicy = policy;
      }
      continue;
    }

    if (policy.policy_id > bestPolicy.policy_id) {
      bestPolicy = policy;
    }
  }

  return bestPolicy;
}

function parsePolicyConditions(raw: string): PolicyConditions | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as PolicyConditions;
  } catch {
    return null;
  }
}

function matchesPolicyConditions(
  conditions: PolicyConditions,
  args: {
    labels: string[];
    riskLevel: PolicyConditions["risk_level"] | null;
  },
): boolean {
  for (const [key, value] of Object.entries(conditions as Record<string, unknown>)) {
    switch (key) {
      case "labels":
        if (!Array.isArray(value)) {
          return false;
        }
        for (const label of value) {
          if (typeof label !== "string" || !args.labels.includes(label)) {
            return false;
          }
        }
        break;
      case "risk_level":
        if (value !== args.riskLevel) {
          return false;
        }
        break;
      case "target_classification":
        return false;
      default:
        return false;
    }
  }

  return true;
}

function getPolicySpecificity(
  policy: PolicyRow,
  toolProviderId: string,
  conditions: PolicyConditions,
): number {
  let specificity = policy.tool_provider_id === toolProviderId ? 1 : 0;

  for (const key of Object.keys(conditions as Record<string, unknown>)) {
    switch (key) {
      case "labels":
      case "risk_level":
        specificity += 1;
        break;
      default:
        break;
    }
  }

  return specificity;
}

function normalizePolicyRiskLevel(value: string | undefined): PolicyConditions["risk_level"] | null {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return null;
}

function formatWorkflowWaitTimeout(timeoutSeconds: number): WorkflowTimeoutDuration {
  const normalizedSeconds = Math.max(1, Math.ceil(timeoutSeconds));

  if (normalizedSeconds % 3600 === 0) {
    const hours = normalizedSeconds / 3600;
    return `${hours} ${hours === 1 ? "hour" : "hours"}` as WorkflowTimeoutDuration;
  }

  if (normalizedSeconds % 60 === 0) {
    const minutes = normalizedSeconds / 60;
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}` as WorkflowTimeoutDuration;
  }

  return `${normalizedSeconds} ${normalizedSeconds === 1 ? "second" : "seconds"}` as WorkflowTimeoutDuration;
}

function getPolicyDecisionSeverity(decision: PolicyDecision): number {
  if (decision === "deny") {
    return 3;
  }
  if (decision === "approval_required") {
    return 2;
  }
  return 1;
}
