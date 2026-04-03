# Govrail SaaS 第一階段資料模型草案

交付對象：Tech Lead / Backend / Full-stack / Product  
版本：v0.1  
日期：2026-04-02

## 1. 文檔目的

這份文檔是 [saas_plan_zh.md](./saas_plan_zh.md) 的工程落地補充，重點不是再講產品方向，而是回答：

- 第一階段 SaaS 化要先補哪些表
- 這些表與現有 `tenant_id` runtime 模型如何銜接
- 哪些欄位是現在就應該進 migration 的
- 哪些能力先留成保留欄位，不要在第一批開發裡過度展開

對應的 migration 草案在：

- [../migrations/0004_saas_foundation.sql](../migrations/0004_saas_foundation.sql)

## 2. 設計原則

第一階段資料模型遵循以下原則：

- 不重寫現有 control plane 主表
- 保留 `tenant_id` 作為 runtime 主隔離鍵
- 在 SaaS metadata 層新增 `organization / workspace / user / membership / api key`
- 先支持托管式 SaaS，再逐步補自助開通與 billing 深水區
- 先把 plan / usage 模型鋪好，再做真正商業化收費

## 3. 第一階段新增實體

### 3.1 organizations

表示 SaaS 商業層的客戶或團隊。

核心欄位：

- `organization_id`
- `slug`
- `display_name`
- `status`
- `created_by_user_id`
- `created_at`
- `updated_at`

說明：

- `organization` 是 SaaS 合約與管理邊界
- 一個 organization 可以擁有多個 workspace
- billing customer 後續也建議掛在 organization 層

### 3.2 users

表示 SaaS 使用者，而不是 runtime actor。

核心欄位：

- `user_id`
- `email`
- `email_normalized`
- `display_name`
- `auth_provider`
- `auth_subject`
- `status`
- `last_login_at`

說明：

- `auth_provider + auth_subject` 用於對接 OAuth / SSO / passwordless
- `email_normalized` 用於 invitation 與唯一性判斷

### 3.3 organization_memberships

表示 user 與 organization 的關係。

核心欄位：

- `membership_id`
- `organization_id`
- `user_id`
- `role`
- `status`
- `joined_at`

建議角色：

- `organization_owner`
- `organization_admin`
- `billing_admin`
- `member`

### 3.4 pricing_plans

第一階段即建立 pricing plan catalog，但只做簡單結構。

核心欄位：

- `plan_id`
- `code`
- `display_name`
- `tier`
- `status`
- `monthly_price_cents`
- `yearly_price_cents`
- `limits_json`
- `features_json`

說明：

- 第一批先內建 `free / pro / enterprise`
- `limits_json` 先承載配額
- `features_json` 先承載 feature flags

### 3.5 workspaces

這是 SaaS 層和 control plane 的關鍵連接表。

核心欄位：

- `workspace_id`
- `organization_id`
- `tenant_id`
- `slug`
- `display_name`
- `status`
- `plan_id`
- `data_region`

核心原則：

- 一個 workspace 對應一個唯一 `tenant_id`
- console、session、member、billing 都以 `workspace_id` 為中心
- Worker runtime 仍然以 `tenant_id` 查 run / policy / provider / artifact

也就是說：

- `workspace_id` 是 SaaS 產品層 ID
- `tenant_id` 是 control plane 運行層 ID

### 3.6 workspace_memberships

表示 user 在某個 workspace 內的角色。

核心欄位：

- `workspace_membership_id`
- `workspace_id`
- `user_id`
- `role`
- `status`

建議角色：

- `workspace_owner`
- `workspace_admin`
- `operator`
- `approver`
- `auditor`
- `viewer`

### 3.7 workspace_invitations

用於邀請成員加入 organization 或指定 workspace。

核心欄位：

- `invitation_id`
- `organization_id`
- `workspace_id`
- `email_normalized`
- `role`
- `token_hash`
- `status`
- `expires_at`

說明：

- `workspace_id` 可空，代表組織層邀請
- 非空則代表直接邀請進特定 workspace

### 3.8 service_accounts

表示 workspace 內的服務主體。

核心欄位：

- `service_account_id`
- `workspace_id`
- `tenant_id`
- `name`
- `role`
- `status`
- `last_used_at`

說明：

- northbound API key 應優先掛在 service account 下
- 這讓「人類使用者登入」與「機器調用 runtime API」分開

### 3.9 api_keys

表示給程式或 agent 使用的密鑰，不保存明文。

核心欄位：

- `api_key_id`
- `workspace_id`
- `tenant_id`
- `service_account_id`
- `key_prefix`
- `key_hash`
- `scope_json`
- `status`
- `expires_at`
- `revoked_at`

設計原則：

- 資料庫只保存 `key_prefix` 和 `key_hash`
- 產生時僅顯示一次完整 key
- 目前已先支持 workspace-scoped key 進入 northbound runtime，並由 key 關聯的 workspace / tenant 推導 runtime 隔離上下文
- 目前 scope 先落成最小集合：`runs:write` 是必備的第一步，`runs:manage` 用於 cancel / replay 等操作，`approvals:write`、`a2a:write`、`mcp:call` 則照常效能需求逐步納入；未提供 scope 的 legacy key 仍被視為 broad-access，scope gate 會逐步收緊更多 runtime 路由。
- 更細粒度的 scope enforcement 仍可在此基礎上逐步補上

### 3.10 workspace_plan_subscriptions

表示 workspace 當前生效的套餐綁定。

核心欄位：

- `subscription_id`
- `workspace_id`
- `organization_id`
- `plan_id`
- `billing_provider`
- `external_customer_ref`
- `external_subscription_ref`
- `status`
- `current_period_start`
- `current_period_end`

第一階段定位：

- 先支持 manual / internal 狀態
- 給後續 Stripe 或其他 billing provider 預留欄位

### 3.11 usage_ledger

表示原始 usage 事件，而不是聚合報表。

核心欄位：

- `usage_event_id`
- `workspace_id`
- `organization_id`
- `tenant_id`
- `meter_name`
- `quantity`
- `source_type`
- `source_id`
- `period_start`
- `period_end`
- `metadata_json`

第一批建議 meter：

- `runs_created`
- `replays_created`
- `artifact_storage_bytes`
- `artifact_egress_bytes`
- `approval_decisions`
- `active_tool_providers`

## 4. 與現有 control plane 的映射

### 4.1 現有 runtime 表不需要重做

目前已存在的：

- `runs`
- `run_steps`
- `approvals`
- `artifacts`
- `tool_providers`
- `policies`
- `audit_events`

都已經帶 `tenant_id`，所以第一期不應改掉它們的主模型。

### 4.2 新的查詢路徑

未來 console 請求應該走這個路徑：

1. user 登入拿到 session  
2. session 查出可訪問的 `workspace_id` 列表  
3. 使用者切到某個 workspace  
4. server-side 根據 `workspace_id` 查出唯一 `tenant_id`  
5. 再用該 `tenant_id` 代理到 control plane runtime API

這樣可以避免：

- 前端直接指定任意 `X-Tenant-Id`
- 單純依賴公開 env 切換 tenant
- workspace 權限與 runtime 權限脫節

## 5. 第一階段不急著做進資料表的內容

以下內容可以先不進第一批 migration，或先保留為 JSON / 外部 provider：

- invoice line items
- payment methods
- tax / region pricing
- usage 聚合快照表
- support impersonation audit table
- SAML connection config
- SCIM provisioning records

原因是第一階段目標是把 SaaS 租戶與身份主骨架搭起來，而不是一次完成整套企業平台。

## 6. migration 0004 的定位

[../migrations/0004_saas_foundation.sql](../migrations/0004_saas_foundation.sql) 的定位是：

- 先把 SaaS 基礎表建立起來
- 內建 `free / pro / enterprise` 三個 plan
- 不改動現有 runtime 表
- 不在這一步加入複雜 foreign key 與跨表 cascade

刻意保持保守，原因是：

- 現有倉庫還沒有正式 session / auth / billing runtime
- 先讓 migration 可以穩定上線，再由應用層逐步接入

## 7. 接下來最直接的開發任務

資料模型一旦確立，建議下一批工作就按下面順序開：

1. 補 `src/types.ts` 或新建 SaaS metadata types
2. 在 `src/lib/db.ts` 旁新增 SaaS metadata access 層
3. 實作 `workspace -> tenant_id` 查詢與 session 授權檢查
4. 改 `web/lib/control-plane-proxy.ts`，不再直接信任 env tenant
5. 補 workspace / member / api key 的最小 CRUD API

## 8. 驗收標準

當以下條件成立時，可以認為第一階段資料模型已經可用：

- migration 可成功套用
- 可建立 organization、workspace、workspace owner
- workspace 能唯一映射到 `tenant_id`
- service account 與 api key 能正確關聯 workspace
- plan 與 usage 表可支撐後續限額邏輯

## 9. 推薦下一步

如果要繼續往前推，最合理的下一步不是先做 UI，而是：

1. 先把 metadata DB access 與初始 CRUD 補上
2. 再接 console session 和 workspace switcher
3. 最後再把 plan limit、usage metering、billing 接進來

這樣節奏最穩，也最不容易把現有 control plane 核心攪亂。
