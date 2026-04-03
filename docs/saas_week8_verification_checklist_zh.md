# Week 8 驗證清單

本清單對應 Week 8「硬化、驗收與試點客戶準備」的驗證節點，讓 platform_admin / platform_owner 可以依照現有 SaaS metadata + feature gate 的能力，逐步確認 onboarding、billing、run flow 與 evidence capture 是否達到可交付狀態。

## 1. Onboarding 驗證

- [ ] Workspace 建立：使用 `/api/control-plane/workspace` 或 console Onboarding 頁面建立新的 workspace，確認返回含 `organization_id`、`tenant_id`、`plan_id`。
- [ ] 基線啟動：呼叫 `/api/control-plane/workspaces/[workspaceId]/bootstrap`，或透過 Onboarding wizard 補齊 provider/policy 快捷鍵，確認 `baseline_ready` checklist 反映在 workspace state。
- [ ] API key/service account：在 workspace 設定頁新增 service account + API key，並確認 `usage`/`members` 數據與 onboarding checklist 同步更新。
- [ ] Demo run：在 console 中開啟 Playground 或 Run Flow，觸發一個簡單 run，確認 `run`、`artifacts`、`audit` tables 有紀錄，且 `workspace` 的 `latest_demo_run` 更新。

## 2. Billing 驗證

- [ ] Plan binding：確認工作區與 plan 的綁定，透過 `/api/control-plane/workspace`、`workspace/billing` 或 `settings` 頁觀察 `plan_id`、`billing_summary`、`subscription` 狀態。
- [ ] 升級路徑：使用 `billing_summary.action.href`、`/settings?intent=upgrade` 或 mock checkout，驗證 `pricing_plans.features_json` 影響 `audit_export`、`sso`、`dedicated_environment` gating。
- [ ] 開啟/關閉 billing portal：在有 Stripe 或 mock provider 的 workspace 上呼叫 `workspace/billing/portal-sessions`、`/billing/subscription/cancel`，確認 Web UI 上有提示與 `billing_providers` 描述一致。
- [ ] Usage 總覽：使用 `/usage` 或 Workspace Usage Dashboard，確認 `metrics` 中 runs、storage、tool providers 數據與實際操作相符。

## 3. Run Flow 驗證

- [ ] Run 建立：從 console Run 頁啟動以 `agent` 為 entry 的 run，確認 `run.status` 走 complete，且 `audit_events` 與 `artifacts` 產生。
- [ ] Billing 觸發：讓 run 造成 usage pressure（例如增長 `runs_created`）並透過 Usage Dashboard 檢查警示/over-limit badge 是否出現。
- [ ] Admin Console 連結：確認 `/admin` 頁的驗證卡片已列出 `onboarding`、`usage`、`settings`、`playground` 連結，並確保 link 可打開頁面。

## 4. Evidence Capture

- [ ] Audit 檔案：使用 Workspace Settings 的 Audit export 功能，下載 `.json` 或 `.ndjson`，確認檔名與 `workspace.slug`、`format` 一致。
- [ ] Checklist 更新：在 admin overview 或 onboarding wizard 中，檢查 `checklist` 物件或 UI badge 是否反映上述三大流程的狀態。
- [ ] Runbook 備註：將檢查結果記錄到 `docs/saas_plan_zh.md` 的 Week 8 章節，或附註在 `docs/README.md` 的 Week 8 查閱入口。

完成以上項目即可視 Week 8 核心驗證需求達成，之後可以再延伸 mock go-live 與 impersonation 等進階場景。

## 5. 持久化交付追蹤與證據手動回填

- [ ] 開啟 `/verification` 或 `/go-live` 頁面右側的 delivery tracking panel，填寫此次驗證與 mock go-live 演練的 `status`、負責人、筆記與證據連結。
- [ ] 輸入的內容會記錄在 `workspace_delivery_tracks` 等 SaaS 表格，方便下一位 platform_admin 回顧決策歷史與 evidence 路徑。
- [ ] 目前的 tracking 只保存文字與連結，例如 run summary、evidence repo URL 或手動手冊。還未支援檔案上傳或自動化 go-live 編排。
- [ ] admin console 會聚合來自 delivery tracking 的 pending / in_progress 計數和最近更新 workspace，讓 platform_admin 針對還沒準備好、或剛更新但未驗證完的 workspace 採取行動。
- [ ] 從 admin attention queue “Open verification” 或 “Open go-live” 進入 workspace 時，確認目標頁面 Banner 顯示 `source=admin-attention` 的來自 queue 的上下文提醒，提醒你正在跟進這個可跟進 workspace（這只是一條導航註記，仍要在 workspace surface 上手動完成驗證）。
- [ ] 注意 handoff 卡片中的 “Return to admin queue” 動作會帶回 `/admin?queue_surface=...&attention_workspace=...&queue_returned=1`，讓 governance 視圖保留原本的 surface 與 workspace 聚焦；這仍然只是 navigation context，不是 impersonation、support 或自動 remediation。
- [ ] 在 admin overview 的 `Recent delivery activity` 卡片中，確認你可以用 `attention_workspace` / `surface`（可選 `attention_organization`）contract 直接跳回該 workspace 的 `/verification` 或 `/go-live` surface，這仍然是 navigation-only 的治理視圖。
- [ ] admin overview 的 action queue 現在預設顯示幾筆緊急 workspace 並標示「Show more」來在相同 snapshot 內展開更多項目；這仍然是 navigation-only 的 governance 視圖，不會自動化任何 support 或 impersonation 行為。新增 focus-state control bar 會把 surface、organization、workspace 與 returned follow-up 狀態用 chip 呈現，每個 chip 都顯示 filter 標籤、當前值，並附有該層級的「Clear」連結（若提供），同時在任一 focus 有值時也會列出「Clear all focus」的 action，讓 platform_admin 可以逐層清除 focus 或直接回到 `/admin` 的 broader governance snapshot；所有操作都只影響導航線索，不進行實際 impersonation 或 automation。
- [ ] admin console 現在還會展示 Week 8 readiness summary 卡片，平台層可以直接看到 onboarding baseline、credentials、demo run、billing warning 與 mock go-live-ready 這 5 個指標的總數，讓 governance 團隊瞭解整體 fleet 的 readiness gate 進度。選取任一指標會把 Week 8 readiness follow-up 列表過濾到貢獻該數字的工作區，並可直接跳到 onboarding、settings、verification 或 go-live surface 追蹤後續狀態；目標 surface 會檢查 `source=admin-readiness` / `week8_focus` / `attention_workspace`（可選 `attention_organization`），提示當前 governance focus 並提供「Return to admin readiness view」的治理鏈路，讓 `/admin` 可以持續保留該 focus；所有 drill-down 均為 navigation cues，沒有 impersonation 或 support automation。
- [ ] 在 admin overview 的 attention-by-organization rollup 中，展開某個組織會列出該組織正等待 verification 或 mock go-live 跟進的 workspace，並可以直接以相同的 navigation contract 把 workspace context 切換到 `/verification` 或 `/go-live`；這是 governance review 的便捷視圖，仍然依賴 workspace-level surface 完成實際驗證或演練。
- [ ] 管理後台現在會顯示一個 attention queue，列出仍在等待 verification 或 go-live 準備的工作區；每個項目可以先切換 workspace context 再打開 `/verification` 或 `/go-live`，讓 governance 團隊直接跟進該 workspace。此 queue 也會簡單依照 pending / in_progress 排序，把還沒完成的項目擺到前面，提醒大家這只是 navigation context，並不包含 impersonation 或 automation。
