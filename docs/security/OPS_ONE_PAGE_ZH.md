# AI Studio 中文运维手册（一页版）

## 1. 先看结论（给业务同学）
- 这个系统支持中文和英文剧本。
- 用户可以不懂提示词，系统会在服务端自动生成。
- 提示词模板不会暴露给前端，具备防盗机制。
- 日志、失败原因、重试点都在 Worker 日志和任务状态里可追踪。

## 2. 环境变量怎么填（按优先级）

### 核心安全（必须）
1. `INTERNAL_API_KEY`
- 用途：保护内部接口（提示词模板列表/渲染）
- 填法：32位以上随机字符串
- 影响：不填会导致内部接口401/不可用

2. `PROMPT_VAULT_SECRET`
- 用途：请求签名验签 + 提示词指纹追踪
- 填法：32位以上随机密钥
- 影响：不填会导致提示词渲染接口500

3. `STRIPE_WEBHOOK_SECRET`
- 用途：支付回调验签
- 填法：Stripe 控制台 webhook secret
- 影响：不填会导致支付回调无法入账

4. `CREEM_WEBHOOK_SECRET` / `DODO_WEBHOOK_SECRET`
- 用途：Creem / Dodo 回调验签
- 填法：各平台 webhook secret
- 影响：对应平台启用后，不填会导致该平台回调失败

### 模型与渲染（生产必填）
4. `GEMINI_API_KEY`
- 用途：主LLM（改写/分镜/翻译）

5. `DEEPSEEK_API_KEY`
- 用途：备选LLM

6. `MODAL_ENDPOINT` + `MODAL_TOKEN`
- 用途：GPU渲染调用

7. `CLOUD_RUN_COMPOSER_URL` + `CLOUD_RUN_ID_TOKEN`
- 用途：FFmpeg组装服务调用

### 可选（Cloudflare）
8. `CLOUDFLARE_AI_ACCOUNT_ID` + `CLOUDFLARE_AI_TOKEN`
- 用途：Cloudflare免费模型备选

## 2.1 多支付备援开关（防封号）
主变量（推荐使用）：
1. `STRIPE_ENABLED`
2. `CREEM_ENABLED`
3. `DODO_ENABLED`
- 规则：只有值为 `TRUE` 才启用，其他值都视为关闭

4. `PAYMENT_PROVIDER_ORDER`
- 示例：`stripe,creem,dodo`
- 含义：按优先级自动选可用通道

兼容变量（老配置可继续使用）：
- `BILLING_STRIPE_ENABLED`
- `BILLING_CREEM_ENABLED`
- `BILLING_DODO_ENABLED`
- `BILLING_PROVIDER_PRIORITY`

## 3. 英文出海怎么开

### 业务层
- 创建项目时传 `contentLanguage: "en"`
- 不传则系统自动检测（中文/英文）

### 渲染层
- 字幕编码固定 `UTF-8`，支持英文和字母
- 绘图提示词执行仍统一英文，语义来自原文

## 4. 日志在哪里看

### Worker接口日志
- 看 `apps/worker/src/index.ts` 对应服务日志
- 重点关注路由：
  - `/api/projects`
  - `/api/projects/{id}/storyboard`
  - `/api/projects/{id}/render`
  - `/api/prompts/render`

### 任务状态日志
- 状态流转：`QUEUED -> SCRIPTED -> RENDERING -> TTS_DONE -> COMPOSITING -> SUCCEEDED/FAILED`
- 在任务查询接口 `/api/jobs/{id}` 看当前状态

## 5. 失败原因怎么定位

1. 返回401：
- 检查 `INTERNAL_API_KEY` 是否正确

2. 返回400（签名失败）：
- 检查 `x-prompt-signature` 与 `PROMPT_VAULT_SECRET`

3. 返回429（限流）：
- 提示词接口每分钟超过阈值，稍后重试

4. 返回500（prompt vault secret missing）：
- 没配置 `PROMPT_VAULT_SECRET`

5. 渲染失败：
- 检查 `MODAL_ENDPOINT/TOKEN` 是否可用
- 检查 `providerId` 平台切段是否超出能力上限

## 6. 平台秒数限制怎么处理
- 业务只定义“目标镜头时长”。
- 导出按 `providerId` 自动切段：
  - 例如 `doubao` 上限9秒，系统自动把长镜头拆段。
- 不需要人工改分镜秒数。

## 7. 运维日常动作（建议）
1. 每月轮换：`PROMPT_VAULT_SECRET`
2. 每季度轮换：`INTERNAL_API_KEY`
3. 每天巡检：失败任务数、429频率、渲染平均耗时
4. 每周回归：`npm run check && npm run test:full && npm run test:security && npm run test:providers`
