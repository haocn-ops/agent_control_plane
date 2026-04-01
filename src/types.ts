export type RunStatus =
  | "queued"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "blocked";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export type PolicyDecision = "allow" | "deny" | "approval_required";
export type PolicyStatus = "active" | "disabled";
export type ToolProviderStatus = "active" | "disabled";
export type ToolProviderType = "mcp_server" | "mcp_portal" | "http_api";
export type AuditEventType =
  | "policy_evaluated"
  | "approval_created"
  | "approval_decided"
  | "approval_expired"
  | "approval_cancelled"
  | "side_effect_blocked"
  | "side_effect_executed";

export interface PolicyConditions {
  risk_level?: "low" | "medium" | "high";
  target_classification?: "internal" | "external" | "restricted";
  labels?: string[];
}

export interface PolicyApprovalConfig {
  approver_roles?: string[];
  timeout_seconds?: number;
}

export interface PolicyCreateRequest {
  policy_id?: string;
  channel?: string;
  scope?: {
    tool_provider_id?: string;
    tool_name?: string;
  };
  conditions?: PolicyConditions;
  decision?: PolicyDecision;
  approval_config?: PolicyApprovalConfig;
  priority?: number;
  status?: PolicyStatus;
}

export interface PolicyUpdateRequest {
  channel?: string;
  scope?: {
    tool_provider_id?: string;
    tool_name?: string;
  };
  conditions?: PolicyConditions;
  decision?: PolicyDecision;
  approval_config?: PolicyApprovalConfig;
  priority?: number;
  status?: PolicyStatus;
}

export interface ToolProviderCreateRequest {
  tool_provider_id?: string;
  name?: string;
  provider_type?: ToolProviderType;
  endpoint_url?: string;
  auth_ref?: string | null;
  visibility_policy_ref?: string | null;
  execution_policy_ref?: string | null;
  status?: ToolProviderStatus;
}

export interface ToolProviderUpdateRequest {
  name?: string;
  provider_type?: ToolProviderType;
  endpoint_url?: string;
  auth_ref?: string | null;
  visibility_policy_ref?: string | null;
  execution_policy_ref?: string | null;
  status?: ToolProviderStatus;
}

export interface RunRow {
  run_id: string;
  tenant_id: string;
  trace_id: string;
  entry_agent_id: string | null;
  status: RunStatus;
  workflow_instance_id: string;
  current_step_id: string | null;
  pending_approval_id: string | null;
  input_blob_key: string;
  context_json: string;
  error_code: string | null;
  error_message: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface RunStepRow {
  step_id: string;
  run_id: string;
  sequence_no: number;
  step_type: string;
  actor_type: string;
  actor_ref: string | null;
  status: StepStatus;
  started_at: string;
  ended_at: string | null;
  metadata_json: string;
}

export interface ApprovalRow {
  approval_id: string;
  run_id: string;
  step_id: string;
  policy_id: string;
  subject_type: string;
  subject_ref: string;
  status: ApprovalStatus;
  requested_by: string;
  approver_scope_json: string;
  decision_by: string | null;
  decision_comment: string | null;
  decision_reason_code: string | null;
  expires_at: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface ArtifactRow {
  artifact_id: string;
  run_id: string;
  step_id: string | null;
  artifact_type: string;
  mime_type: string;
  r2_key: string;
  sha256: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface AuditEventRow {
  event_id: string;
  tenant_id: string;
  run_id: string;
  step_id: string | null;
  trace_id: string;
  event_type: AuditEventType;
  actor_type: string;
  actor_ref: string | null;
  payload_json: string;
  created_at: string;
}

export interface AuditEventEnvelope {
  message_type: "audit_event";
  dedupe_key: string;
  event_id: string;
  tenant_id: string;
  run_id: string;
  step_id: string | null;
  trace_id: string;
  event_type: AuditEventType;
  actor: {
    type: string;
    ref: string | null;
  };
  payload: Record<string, unknown>;
  created_at: string;
}

export interface IdempotencyRecordRow {
  resource_id: string;
  payload_hash: string;
}

export interface RunCreateRequest {
  input: {
    kind: "user_instruction" | "structured_payload";
    text?: string;
    payload?: Record<string, unknown>;
  };
  entry_agent_id?: string;
  context?: Record<string, unknown>;
  policy_context?: {
    risk_tier?: string;
    labels?: string[];
  };
  options?: {
    async?: boolean;
    priority?: "low" | "normal" | "high";
  };
}

export interface ApprovalDecisionRequest {
  decision: "approved" | "rejected";
  comment?: string;
  reason_code?: string;
}

export interface ReplayRunRequest {
  mode?: "from_input" | "from_step";
  from_step_id?: string;
  reason?: string;
  overrides?: {
    policy_version?: string;
    entry_agent_id?: string;
  };
}

export interface A2AMessageSendRequest {
  message_id?: string;
  task_id?: string;
  conversation_id?: string;
  sender?: {
    agent_id?: string;
  };
  target?: {
    agent_id?: string;
  };
  content?: {
    type?: string;
    text?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface OutboundA2ADispatchConfig {
  tool_provider_id?: string;
  provider_type?: ToolProviderType;
  endpoint_url: string;
  agent_id: string;
  auth_ref?: string;
  task_id?: string;
  message_text?: string;
  wait_for_completion?: boolean;
  metadata?: Record<string, unknown>;
}

export interface A2AWebhookPushRequest {
  remote_task_id?: string;
  task_id?: string;
  status?: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  message_id?: string;
  artifact?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface RunWorkflowParams {
  runId: string;
  tenantId: string;
  traceId: string;
  requestId: string;
  subjectId: string;
  entryAgentId: string | null;
  inputBlobKey: string;
  context: Record<string, unknown>;
  policyContext: {
    risk_tier?: string;
    labels?: string[];
  };
}

export interface ApprovalDecisionSignal {
  approval_id: string;
  decision: "approved" | "rejected";
  decided_by: string;
  decided_at: string;
  comment?: string;
  reason_code?: string;
}

export interface RunCoordinatorState {
  run_id: string;
  tenant_id: string;
  status: RunStatus;
  last_sequence_no: number;
  pending_approval_id: string | null;
  current_step_id: string | null;
}

export interface A2AStatusSignal {
  task_id: string;
  remote_task_id: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  message_id?: string;
  artifact_json?: string;
}

export interface ToolProviderRow {
  tool_provider_id: string;
  tenant_id: string;
  name: string;
  provider_type: ToolProviderType;
  endpoint_url: string;
  auth_ref: string | null;
  visibility_policy_ref: string | null;
  execution_policy_ref: string | null;
  status: ToolProviderStatus;
  created_at: string;
  updated_at: string;
}

export interface PolicyRow {
  policy_id: string;
  tenant_id: string;
  channel: string;
  tool_provider_id: string | null;
  tool_name: string | null;
  decision: PolicyDecision;
  approver_roles_json: string;
  priority: number;
  status: PolicyStatus;
  conditions_json: string;
  approval_config_json: string;
  created_at: string;
  updated_at: string;
}
