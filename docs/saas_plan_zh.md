# Govrail SaaS 化產品與技術規劃

交付對象：Founder / Product / Tech Lead / Platform / Full-stack 工程師  
版本：v0.1  
日期：2026-04-02

## 1. 文檔目的

這份文檔回答的不是「Govrail 能不能做成 SaaS」，而是：

- 以目前倉庫真實能力為起點，應該怎麼把它推進成可售賣、可交付、可運營的 SaaS 產品
- 哪些能力已經具備 SaaS 底座
- 哪些能力仍停留在 MVP skeleton / 運營手動階段
- 接下來 8 週如果只做最重要的部分，應該先做什麼

本文件偏執行規劃，不取代現有 API、資料模型與部署文檔，而是把它們整理成一條面向產品化的落地路線。

## 2. 當前基線判斷

### 2.1 已具備的 SaaS 底座

目前倉庫已具備以下對 SaaS 非常關鍵的基礎：

- 後端已是 multi-tenant control plane，核心資料表普遍帶 `tenant_id`
- 已有 northbound API、admin API、A2A gateway、MCP proxy、approval、audit、artifact、replay、cancel 等核心閉環
- 已有 onboarding bundle、verify、release gate、handoff、observability baseline
- 已有 Web Console，可作為未來正式 SaaS console 的前身

可對照：

- [../README.md](../README.md)
- [implementation_status_matrix_zh.md](./implementation_status_matrix_zh.md)
- [tenant_onboarding_runbook_zh.md](./tenant_onboarding_runbook_zh.md)

### 2.2 距離真正 SaaS 的主要缺口

目前最主要的缺口不是工作流引擎本身，而是 SaaS 外層缺失：

- 尚未建立正式的 `organization / workspace / user / membership` 模型
- Web Console 目前仍以環境變數注入 `tenant_id` 與 subject，尚非真實多租戶登入體驗
- Worker northbound 認證仍假設由 trusted edge 處理，尚未與 SaaS 內部帳號系統整合
- 缺少 API key / service account / workspace invitation / member 管理
- 缺少 usage metering、plan limit、subscription、billing
- tenant onboarding 雖有腳本與 runbook，但仍偏運營手動流程，不是產品化自助開通

可對照：

- [api_contract_spec_zh.md](./api_contract_spec_zh.md)
- [environment_config_runbook_zh.md](./environment_config_runbook_zh.md)
- [final_delivery_summary_zh.md](./final_delivery_summary_zh.md)

## 3. 建議產品定位

### 3.1 產品一句話

Govrail 應定位為：

「面向企業與 AI agent 團隊的 governed agent runtime control plane SaaS。」

它不是通用聊天產品，也不是單純 workflow builder，而是提供：

- agent run orchestration
- tool / policy governance
- approval gating
- audit / artifact / replay
- multi-tenant operator console

### 3.2 目標客群

建議先聚焦兩類客群：

- 有內部 agent / tool 調用需求，但必須做審批、審計、出口治理的團隊
- 有多個 agent、工具供應商、審批角色，已經開始進入平台治理階段的中大型團隊

先不要把第一版目標放在：

- 個人開發者大量自助註冊
- 超低價、極致自助、極少運營介入的 PLG 模式

原因很簡單：Govrail 當前優勢是治理與可控，不是海量低價自助。

## 4. 第一階段 SaaS 產品邊界

### 4.1 第一個可售賣版本應該長什麼樣

第一個真正可賣的版本，建議不是「完全自助 SaaS」，而是「托管式 SaaS」：

- 客戶可登入 console
- 每個客戶有自己的 organization 與 workspace
- workspace 內可管理 agent、provider、policy、run、approval、artifact
- 平台方可為客戶開通 workspace、邀請成員、限制配額
- 客戶可生成 API key，把自己的 agent 流量接入 Govrail
- onboarding 仍允許有少量人工介入，但入口在產品內完成，不再依賴散落腳本

這樣的好處是：

- 最快變現
- 與目前代碼落差最小
- 先把運營流程產品化，再逐步自助化

### 4.2 第一階段明確不做什麼

首個 SaaS 版本建議先不做：

- 複雜多產品線計費
- 完整 marketplace
- 用戶級自定義工作流 DSL
- 自建 IAM 替代完整企業身份系統
- 完全無人值守的 enterprise onboarding

## 5. SaaS 核心能力拆解

### 5.1 身份與租戶模型

需要新增以下核心概念：

- `organizations`
- `workspaces`
- `users`
- `organization_memberships`
- `workspace_memberships`
- `service_accounts`
- `api_keys`
- `workspace_invitations`

建議關係如下：

- 一個 `organization` 可以有多個 `workspace`
- 一個 `workspace` 對應一個 Govrail `tenant_id`
- 一個 `user` 可以屬於多個 organization / workspace
- `service_account` 屬於 workspace，用於服務對服務接入
- `api_keys` 與 `service_accounts` 掛鉤，並帶 scope / last_used_at / revoked_at

### 5.2 權限與角色

建議把當前粗粒度 roles 擴成兩層：

- SaaS 平台角色：`platform_owner`、`support_admin`
- Workspace 角色：`workspace_owner`、`workspace_admin`、`operator`、`approver`、`auditor`、`viewer`

其中：

- `workspace_owner` 可管理成員、API key、套餐與安全設定
- `workspace_admin` 可管理 provider / policy / agent
- `operator` 可查看與操作 run、replay、cancel
- `approver` 可決策 approval
- `auditor` 可查看 audit / artifacts / policies，但不可修改
- `viewer` 僅可讀

### 5.3 認證模型

建議分成兩條線：

- Console user auth
- API / server auth

Console user auth：

- 接 OAuth 或企業 SSO
- 成功登入後拿到 platform session
- session 在 server-side 解析成可訪問的 organization / workspace 列表

API / server auth：

- workspace API key
- service account token
- 企業版可選 trusted edge / service token / private ingress

MVP 階段不要直接讓每個 SaaS user 去調用 northbound API；應優先透過 workspace API key 或 server proxy。

### 5.4 包裝與定價

建議第一版只做 3 檔：

- Free / Trial
- Pro
- Enterprise

限制維度建議先做這幾個：

- 每月 run 次數
- 每 workspace 的 tool providers 數量
- artifact 保留天數
- approver / member 席位數
- 高級能力開關，例如 SSO、readonly export、dedicated environment

### 5.5 Usage metering

建議建立單獨的 usage ledger，而不是事後從業務表硬算。

至少記錄：

- `workspace_id`
- `tenant_id`
- `meter_name`
- `quantity`
- `period_start`
- `period_end`
- `source_type`
- `source_id`

最小 meter 建議：

- `runs_created`
- `replays_created`
- `artifact_storage_bytes`
- `artifact_egress_bytes`
- `approval_decisions`
- `active_tool_providers`

## 6. 與現有代碼的對接方式

### 6.1 後端控制面

目前 `src/` 的 Worker 可繼續作為 control plane 核心，不建議重寫。

建議做法：

- 保留現有 `tenant_id` 作為 runtime 隔離鍵
- 新增 SaaS 元資料層，把 `workspace_id -> tenant_id` 做映射
- 控制面 API 繼續保持 tenant-scoped，但不再信任前端直接傳任意 `X-Tenant-Id`
- 對 console 流量，改由 server route 根據登入 session 注入 tenant context

這樣可以保留現有：

- runs / approvals / artifacts / policies / providers 資料結構
- onboarding bundle 與 verify 流程
- 現有 Cloudflare 部署形態

### 6.2 Web Console

`web/` 目前更像 operator demo console，需要升級為正式 SaaS app。

主要變更方向：

- 增加登入、session、workspace switcher
- 所有 control plane proxy route 以 session 推導 tenant，不再從公開 env 直接讀取
- `settings` 頁從靜態內容改成真實 workspace settings
- 增加 billing、members、api keys、usage、audit export 等 SaaS 頁面

### 6.3 Onboarding

目前 onboarding 是一組很好的運營腳本基礎，適合演進成產品內的 onboarding job。

建議演進為：

- Console 內建立 workspace
- 觸發 provisioning job
- 系統生成預設 provider / policy baseline
- 系統記錄 onboarding state machine
- 成功後引導使用者生成第一把 API key 並跑第一個 verify / demo run

## 7. 建議新增資料模型

以下是第一期最值得補齊的 SaaS 表。

### 7.1 平台層

- `organizations`
- `users`
- `organization_memberships`
- `workspace_invitations`

### 7.2 工作區層

- `workspaces`
- `workspace_memberships`
- `service_accounts`
- `api_keys`
- `workspace_usage_daily`
- `workspace_plan_subscriptions`

### 7.3 計費與配額層

- `pricing_plans`
- `plan_features`
- `usage_ledger`
- `billing_customers`
- `billing_subscriptions`

### 7.4 與 control plane 關聯

建議在 `workspaces` 表中直接保存：

- `workspace_id`
- `organization_id`
- `tenant_id`
- `slug`
- `display_name`
- `status`
- `plan_id`
- `data_region`
- `created_at`
- `updated_at`

原則上：

- `tenant_id` 對 Worker 仍然是主隔離鍵
- `workspace_id` 對 SaaS 產品層是主 ID

## 8. 目標架構演進

### 8.1 建議的邏輯分層

建議把整體拆成 3 層：

1. SaaS App Layer  
負責 organization、workspace、member、session、billing、usage、support。

2. Control Plane Layer  
負責 run、policy、approval、artifact、audit、tool provider、A2A、MCP proxy。

3. Provisioning / Ops Layer  
負責 workspace bootstrap、secret wiring、verify、release gate、運營自動化。

### 8.2 為什麼這樣拆

這樣拆的好處是：

- 不破壞現有 control plane 核心
- SaaS 層可以快速迭代，不必頻繁侵入 workflow / DO / queue 核心
- 企業版未來需要 dedicated deployment 時，也能保留同一套 SaaS 管理面

## 9. 8 週落地里程碑

以下是以「2 名工程師左右，優先做能賣的版本」為前提的建議節奏。

### Week 1：定義產品邊界與資料模型

輸出：

- SaaS 資料模型草案
- workspace / organization / user / membership / api key schema
- 權限模型與 plan limit 定義
- 現有 API 與未來 SaaS session 的映射方案

完成標準：

- ERD 與 migration 草案評審通過
- 確認第一版只支援托管式 SaaS，不追求完全自助

### Week 2：實作平台資料表與基礎後端

輸出：

- 新 migration
- workspace / member / api key CRUD
- server-side tenant resolution
- 基礎 seed / bootstrap helpers

完成標準：

- 可建立 organization、workspace、workspace owner
- 可從 workspace 查出唯一對應 `tenant_id`

### Week 3：接入 Console 登入與 session

輸出：

- user login
- session middleware
- workspace switcher
- members / settings 基礎頁面

完成標準：

- 不再依賴公開 env 指定 tenant 與 subject
- 使用者登入後只能看到自己有權限的 workspace

### Week 4：Workspace API key 與服務接入

輸出：

- service account / API key 管理頁
- key create / revoke / rotate
- northbound API 對 workspace key 的校驗邊界

完成標準：

- 客戶可自行建立 API key
- 客戶可用 API key 接入建立第一個 run
- customer portal create API 現在可以接受可選的 `return_url` 把特定 URL 注入 session，若沒有提供會先使用 `STRIPE_CUSTOMER_PORTAL_RETURN_URL`，再沒有就退回到 `BILLING_RETURN_BASE_URL` + `/settings?intent=manage-plan`。這個 URL 只用於 portal 結束後的返回動作，與 webhook 或 checkout 成功的重定向無關。

目前落地狀態（2026-04）：

- `service account / API key` 管理頁與 create / revoke / rotate 已落在 SaaS console。
- northbound runtime 現在已接受 workspace-scoped API key：可用 `Authorization: Bearer <key>` 或 `X-API-Key` 進入 `/api/v1` runtime 路由。
- runtime tenant context 不再信任客戶任意傳入的 `X-Tenant-Id`；對 API key 流量，Worker 會從 key 綁定的 workspace / tenant 推導實際 `tenant_id`，並把 subject 映射到 service account 或 API key actor。
- 目前最小 scope enforcement 已接上：只有當 API key 顯式帶 `scope_json` 時才會生效；現階段支持 `runs:write`、`runs:manage`、`approvals:write`、`a2a:write`、`mcp:call`。
- 最小 scope gate 現在只會在有 `scope_json` 的 key 上生效，第一步要求至少包含 `runs:write` 才能成功呼叫 `POST /api/v1/runs`，未來 `runs:manage` 會涵蓋 cancel/replay 等操作。空 scope 表示 legacy key，仍然能工作不會被即刻拒絕，scope enforcement 會隨後逐步延伸到更多 runtime 路由。
- 目前這一刀先完成最小安全閉環：active / revoked / expired 檢查、service account 綁定驗證、`last_used_at` 更新、最小 scope enforcement，以及 smoke 覆蓋；更細粒度的 `scope_json` enforcement 仍保留給後續切片。
- Smoke 基線現在也會 seed 帶 `scope_json` 的 workspace API key，實驗 `runs:write` 對 `POST /api/v1/runs` 的行為，為 scope enforcement 做測試準備。

### Week 5：Onboarding Wizard 與首次體驗

輸出：

- 新建 workspace wizard
- baseline provider / policy bootstrap
- first-run guide
- onboarding state tracking

完成標準：

- 新 workspace 建立後 10 分鐘內可完成第一個 demo run
- 運營手工步驟明顯下降

### Week 6：Usage Metering 與套餐限制

輸出：

- usage ledger
- plan limit enforcement
- usage dashboard
- over-limit 提示與保守阻斷策略

完成標準：

- 可按 workspace 看本月 run / storage / provider usage
- 可根據 plan 限制建立 provider 或 run

### Week 7：Billing 接入

輸出：

- billing customer / subscription 模型
- checkout / upgrade / cancel
- plan 與 feature mapping

完成標準：

- Pro plan 可自助升級
- Workspace plan 能真正影響 feature gate

目前落地狀態（2026-04）：

- `audit_export`：已從 `pricing_plans.features_json` 進入實際 feature gate，workspace 層已能依方案判斷是否提供 audit export 能力。
- `sso`：已開始從 plan catalog 的旗標派生出 workspace 設定與 API 的 plan-gated readiness/config surface，供啟用方案指引 SSO 配置；完整登入與 runtime 強制仍維持 staged，需後續切片深化。
- `dedicated_environment`：已開始從 plan catalog 的旗標派生出 workspace 設定與 API 的 plan-gated readiness/delivery surface，提示可在啟用方案下規劃專屬環境排期；真正的 dedicated 資源編排與 isolation gate 仍維持 staged，需後續切片實作。

也就是說，本輪已完成三個可見的「plan 與 feature mapping」垂直切片：`audit_export`、`sso` readiness surface 以及 `dedicated_environment` 的 readiness/delivery surface；其餘 enterprise 向能力仍按路線圖分段推進。

### Week 8：硬化、驗收與試點客戶準備

輸出：

- 支援流程與運營手冊
- SaaS admin console 最小能力
- onboarding / billing / run flow 驗證清單
- 1 個試點客戶的 mock go-live 演練

在這一輪我們先交付一個最小的 SaaS admin console overview，讓 platform_admin / platform_owner 能在一頁看到組織與 workspace 的健康快照、已啟用方案/feature 的態勢，以及對 onboarding、billing、run 流程驗證的快速連結。這個 console 依然只用現有 SaaS metadata 和 feature gate，不包含 impersonation 或原生 support 介面，但它驗證了系統可以為 admin 角色呈現治理級視角。詳細的驗證步驟可依循 [Week 8 驗證清單](./saas_week8_verification_checklist_zh.md) 逐項簽核，持續保留 `onboarding`、`billing`、`run` 流程的可追蹤 evidence。上面的驗證過程完成後，就可以沿用 [Week 8 Mock Go-Live Drill](./saas_mock_go_live_drill_zh.md) 測跑一小型的 mock go-live，確認 onboarding bundle、billing gate、run flow、audit export、verify summaries 都有 evidence 備查。

另外我們也首次把 verification 與 go-live 的進度、筆記、證據路徑透過 workspace delivery tracking 持久化了：console 右側會顯示一個最小狀態板，讓 platform_admin / platform_owner 能記錄 verification 與 mock go-live 的 `status`、負責人、手動筆記與證據連結。這些資料經由 control-plane 代理與 SaaS API 寫入 `workspace_delivery_tracks`（或同等命名的表），用於在後續 review 時復現驗證結果。為了保持誠實，這個能力目前只保留文字與連結（例如 evidence repository 或 run summary），不支援檔案上傳或自動化 go-live 執行。

`Recent delivery activity` 則可以使用相同的 `source=admin-attention` / `surface` / `attention_workspace`（以及選用的 `attention_organization`）contract 直接跳回相應的 `/verification` 或 `/go-live` surface，只是另一條 governance navigation 線索，並不涉入 impersonation 或 automation 行為。新增的 focus-state control bar 會把 surface、organization、workspace 與 returned follow-up 狀態用 chip 呈現，每個 chip 都顯示 filter 標籤、當前值，並附帶一條 per-chip 的「Clear」連結（如果該層級有可清除的 state），同時在任一 focus 有價值時也會展示「Clear all focus」的動作，讓平台維運可以清除單一層級或回到整體 `/admin` 視角，所有清除/返回仍維持 navigation-only，不觸發 impersonation 或自動 remediation。
另外，admin console 現在會透過 Week 8 readiness summary 卡片公布平台層的整體 readiness 計數：完成 onboarding baseline 的 workspace 有多少、service account/API key 都已準備好的 workspace 有多少、已經有 successful demo run 的 workspace 有多少、仍處於 billing warning 的 workspace 有多少、以及 mock go-live ready 的 workspace 有多少。這些指標也可 drill down：點選任一 count 會把 Week 8 readiness follow-up 列表過濾到貢獻此計數的工作區，同時把 `source=admin-readiness`、`week8_focus`、`attention_workspace` / `attention_organization` 傳到 onboarding、settings、verification 或 go-live surface，使目標頁面顯示“Return to admin readiness view”的治理提示，並把相同的 focus 紀錄帶回 `/admin`。所有 drill-down 仍只是 navigation-only 的 governance cues，沒有 impersonation、support automation 或自動 remediation。

完成標準：

- 完成一次從註冊、開 workspace、接 API key、跑 run、命中 usage、升級 plan 的端到端演練

## 10. 優先級排序

如果時間有限，優先順序建議固定如下：

1. 正式身份與 workspace 模型
2. Console session 與 tenant resolution
3. API key / service account
4. onboarding wizard
5. usage metering
6. billing
7. 企業級能力

不要把 billing 放在身份與租戶之前，否則容易得到一個能付款、但不能穩定交付的產品。

## 11. 主要風險與對應策略

### 11.1 把 control plane 與 SaaS app 混成一層

風險：

- 後續功能耦合過重
- session、billing、runtime API 難以演進

策略：

- 明確分出 SaaS metadata layer
- 讓 runtime 仍以 `tenant_id` 為中心

### 11.2 太早追求完全自助 enterprise onboarding

風險：

- 工程量巨大
- 延遲變現

策略：

- 先做托管式 SaaS
- 先把運營手工流程收斂到產品後台

### 11.3 沒有 usage ledger 就先做 billing

風險：

- 後續對賬困難
- plan enforcement 與 invoice 對不上

策略：

- 先做 metering
- 再做 billing 與 subscription

### 11.4 前端直接決定 tenant

風險：

- 越權風險
- 難以審計

策略：

- 所有 tenant context 都由 server-side session 推導
- 前端只傳 workspace slug / current workspace selection

## 12. 第一版驗收標準

當以下條件成立時，可以認為 Govrail 已從 MVP skeleton 進入「可售賣 SaaS alpha」：

- 使用者可註冊或被邀請加入 organization
- organization owner 可建立 workspace
- workspace 自動對應一個 `tenant_id`
- workspace admin 可建立 API key
- 使用 API key 可成功發起 run
- console 能查看 runs、policies、providers、approvals、artifacts
- workspace 有基礎 usage 與 plan limit 顯示
- 至少一條付費升級路徑可用

## 13. 推薦下一步

若要正式啟動 SaaS 化，建議按以下順序開工：

1. 先補第一版 migration 與資料模型文檔
2. 決定 Console auth 方案與 session 邊界
3. 把 `web/` 的 control plane proxy 改成 server-side workspace resolution
4. 補 `workspace / member / api key` 管理頁
5. 再接 usage 與 billing

最重要的判斷是：

Govrail 現在最值錢的部分不是再補一個 run API，而是把現有 multi-tenant control plane 外面包上一層真正的 SaaS 租戶、身份、配額與商業化能力。
