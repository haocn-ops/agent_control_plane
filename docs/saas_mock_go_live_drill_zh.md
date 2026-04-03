# Week 8 Mock Go‑Live Drill

這份 mock go-live drill 是 Week 8「硬化、驗收與試點客戶準備」的霹靂小演練，它直接承接 Week 8 的 Admin Console、Verification Checklist、Onboarding Wizard 與現有 evidence 工具，讓 platform_admin / platform_owner 可以實際跑一次端到端的驗收流程，並把結果留在可追蹤的 evidence 路徑。

## 1. Drill 前置與準備

- `Onboarding`：用 console 上的 Onboarding Wizard 建立一個新的 workspace，執行 baseline bootstrap，並在 Workspace Settings 補上至少一組 service account 與 API key，觀察 `onboarding.checklist` 的 `baseline_ready` / `service_account_created` / `api_key_created` 欄位都變成完成狀態。
- `Tenant bundle`：如果你想把 drill 當作 evidence bundle，可以再跑 `npm run tenant:onboarding:bundle -- --tenant-id <tenant> --deploy-env staging` 生成 `handoff.md`、`handoff-state.json`、`verify.sh` 等檔案，並用 `verify.sh` 產出 `verify-write-summary.json` 作為 drill 的證據。
- `Workspace context`：在 `Workspace Usage Dashboard` 裡確認 billing_summary 與 usage metrics 已更新，為下一步做準備。

## 2. Billing / Feature gating檢查

- `Settings`：用 `/settings` 或 `verification` 頁檢查 `billing_summary.action`、`billing_providers` 以及 `plan.features`（audit_export、sso、dedicated_environment）的開通狀態。如果需要可切換 mock checkout 或 Stripe portal，驗證 `billing/subscription/cancel|resume` 行為。
- `Verification checklist`：在 `/verification` 頁的 Billing 區塊上把狀態步驟完成，尤其是 Past due / warning 的處理與 usage 指標的 Inspector。
- `Plans`：如果打算 mock 升級，用 `billing_summary.action.href` 進行升級流程，然後回驗 `plan.features` 是否即時反映。

## 3. Run flow / Go-live action

- `Run`：從 `/playground` 或 run 操作頁提交一個簡單 run（例如 policy passthrough + agent exec）。觀察 run status 走到 `completed` 且 `audit_events`、`artifacts` 有紀錄。
- `Usage dashboard`：讓 `runs_created` 或 `artifact_storage_bytes` 成長，確認 Workspace Usage Dashboard 的 over-limit badge 會出現或消失。
- `Admin verification links`：在 `/admin` → `Verification flow` 區塊按 `Open Week 8 checklist`，確認 `verification` 頁已經把 run-flow 項目視覺化為 `Complete` 或 `In progress`。

## 4. Evidence 與手動備註

- `Audit export`：從 Workspace Settings 的 `Audit export` 功能下載 `.json` / `.ndjson`，作為 go-live drill 的審計證據，並把檔名帶入 `docs/saas_week8_verification_checklist_zh.md` 的「Evidence capture」項。
- `Verification checklist`：完成上述步驟後，把核對結果記在 [Week 8 驗證清單](./saas_week8_verification_checklist_zh.md) 上，必要時也把抓到的 `verify-write-summary.json` / `verify-readonly-summary.json` 夾到 `onboarding bundle` 的 `evidence/` 下。
- `Handoff note`：把 drill 狀態與 evidence 連結寫進 `docs/saas_plan_zh.md` 的 Week 8 章節或 `docs/README.md` 的 Week 8 入口，讓下一位 review 者可以直接抓到 go-live drill 的證據檔。

完成這些項目之後，Week 8 的 mock go-live drill 就算成功演練一輪；在 `/verification` 與 `/go-live` 頁面右側的 delivery tracking panel 中回填 `status`、負責人、筆記與證據連結，能把此次驗收歷史留給下一位審核者。這些交付狀態也會在 admin console 的 Week 8 overview 中彙總為 pending / in_progress 的數量與最近更新 workspace，讓 governance 團隊看到還在等待驗證或 mock go-live 紀錄的工作區；attention queue 讓你直接跳入對應 workspace 的 `/verification` 或 `/go-live` surface，並把 pending / in_progress workspace 先排在前面，方便依照緊急程度逐一跟進。當跳轉發生時，目標頁面會顯示 `source=admin-attention` 觸發的來源提醒，並提供返回 admin queue 的快捷入口，重申這只是 workspace-level 的驗證/演練流程，並非 support、impersonation 或自動化 go-live 行為。下一步可以再延伸成自動化 `mock-go-live` script 或公共 evidence repository，但目前的切片已經證明 SaaS metadata、billing gating、run flow 與 evidence capture 可以合力支撐一場可驗證的 go-live drill。
