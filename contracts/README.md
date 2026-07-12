# HTTP API 契约规范

本目录保存前端、后端、测试和 Agent 共同依赖的 HTTP API 契约。规范中的“必须”是合并门槛，“建议”允许在评审中说明理由后例外。

## 课程明确原则

以下原则来自 `Course_WebDevelopment` 的 `web-frontend.md` 与 `web-backend.md`：

- 信息流是 `specs/ → contracts/ → frontend/ ↔ backend/ → test / check`。Spec 先说明目标、边界和可观察的验收标准，契约再把跨端行为机器化。
- REST 路径表达资源，HTTP Method 表达动作，状态码表达结果；客户端应能稳定区分成功、空结果和失败。
- 一个可验证的 operation 至少明确 Path、Method、输入、成功响应和失败响应。
- 请求与响应 Schema、输入校验、错误格式、鉴权和日志追踪都是接口行为的一部分，不能只存在于实现或聊天记录中。
- AI 生成的是候选实现；是否完成要由契约测试、状态码与 JSON 断言、日志证据和人工审查共同证明。

## 本模板落地约定

### 唯一事实源

[`openapi.yaml`](./openapi.yaml) 是本项目 HTTP API 的唯一机器可读事实源。Controller、DTO、前端 TypeScript 类型、Mock、文档和测试都必须与它一致；这些派生物不能反过来定义另一套接口。需要生成代码时也只能从该文件生成。

若 Spec 与 OpenAPI 冲突，先澄清业务意图并修改 Spec，再修改 OpenAPI，不能让前后端分别猜测。

### 何时更新

出现以下任一对调用方可观察的变化时，必须在同一改动中更新 `openapi.yaml`：

- 新增、删除或重命名 Path、Method、参数、请求头或响应头；
- 修改请求体、响应体、字段类型、`required`、可空性、默认值、枚举、格式或取值约束；
- 修改状态码、错误码、错误结构、鉴权或权限要求；
- 修改输入归一化、空值/空列表、排序、分页、幂等性或其他业务语义；
- 修改媒体类型，或把同步响应改为异步任务等交互方式。

以下改动无需更新 OpenAPI：

- 不改变外部行为的重构、性能优化、依赖升级或日志文本调整；
- 不影响 API Schema 或语义的数据库内部实现变化；
- 只改变页面布局、样式或本地 UI 状态的前端改动。

判断不清时，以“旧客户端能否从 HTTP 请求与响应观察到差异”为准；能观察到就更新契约。

### Contract-first 顺序

1. substantial feature 先在 `specs/` 写目标、范围、非目标和带稳定编号的验收标准。
2. 在 `openapi.yaml` 设计或修改 operation，并用 `x-spec` 追溯到对应验收标准。
3. 评审资源语义、输入边界、成功与失败、鉴权和兼容性后，再开始实现。
4. 后端按契约实现校验与响应；前端从同一契约生成或同步类型并实现所有可见状态。
5. 补齐契约/API 测试，确认实现没有超出或遗漏契约。
6. 运行 `npm run check`，并完成本文末尾的 DoD。

仅修复内部缺陷且 HTTP 行为不变时，可以从第 4 步开始，但仍需用现有契约做回归验证。

### 每个 operation 的必填内容

| 项目          | 必须明确的内容                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Path / Method | 资源路径和正确的 HTTP Method                                                                                           |
| 标识          | 唯一且稳定的 `operationId`、简短 `summary`、`x-spec`                                                                   |
| 输入          | Path、Query、Header、Cookie、Body 的位置、名称、类型、是否必填、默认值、约束和媒体类型；Path 参数必须 `required: true` |
| 成功          | 每一种成功状态码、响应头、媒体类型和完整 Schema；无响应体时也要明确，如 `204`                                          |
| 失败          | 每一种可预期失败的状态码、触发条件和统一错误 Schema，不能只写一句 description                                          |
| 安全          | operation 是公开还是需要哪种鉴权；受保护资源还要区分 `401` 与 `403`                                                    |

operation 级追溯统一使用以下结构，验收标准 ID 一经引用不得因重排而改变：

```yaml
x-spec:
  file: specs/002-campus-marketplace.md
  acceptanceCriteria: [AC-01, AC-02]
```

### REST 与状态码

- Path 使用小写复数名词，例如 `/api/courses`、`/api/courses/{courseId}`；不要使用 `/createCourse` 一类动词路径。
- `GET` 只读取，`POST` 创建，`PUT` 完整替换，`PATCH` 局部更新，`DELETE` 删除。语义不是标准 CRUD 时，在 Spec 和 operation description 中说明。
- 创建成功默认返回 `201`，并在适用时返回 `Location`；查询/更新成功返回 `200`；成功且无响应体返回 `204`。
- 常用失败语义：`400` 请求不符合输入规则，`401` 未认证，`403` 已认证但无权限，`404` 资源不存在，`409` 状态冲突，`500` 未预期的服务端错误。不要用 `200` 包装业务失败。
- 会产生副作用的重试语义必须明确；需要幂等键时，将请求头、格式、有效期和冲突响应写入契约。

### Schema 与查询行为

- 公共模型放入 `components/schemas` 并通过 `$ref` 复用。每个字段必须声明 `type`；对象必须显式列出 `required`，新增或修改的稳定 DTO 必须声明 `additionalProperties: false`。
- “缺失”“空字符串”和 `null` 是不同状态。字段只有在业务允许时才声明可空；不要用可空替代可选。
- 时间、UUID、邮箱、URI 等使用标准 `format`；字符串声明适用的 `minLength`、`maxLength`、`pattern` 或 `enum`，数值声明适用的上下界。示例不能代替约束。
- 输入的 `trim`、大小写、空字符串、Unicode、默认值以及“先归一化还是先校验”必须在 Spec 中定义，并在参数/Schema description 中体现；后端是最终裁决者，前端只能做一致的体验增强。
- 列表无匹配项返回成功状态和空数组，例如 `{ "data": [] }`，不得用 `404`、`null` 或省略 `data`。列表元素 Schema 与非空时保持一致。
- 列表必须有确定性默认排序；排序字段使用白名单。允许调用方排序时，统一使用 `sort` 和 `order=asc|desc`，并用唯一字段（通常是 `id`）作为并列值的最终排序键。
- 未分页的小列表可以直接返回。引入分页时，本模板默认使用从 1 开始的 `page` 和 `pageSize`：默认值分别为 `1`、`20`，`pageSize` 最大为 `100`；响应包含 `{ data, pagination: { page, pageSize, total } }`。超出末页返回 `200` 和空 `data`，不返回 `404`。若改用 cursor，必须在 Spec 中说明原因且同一资源不能混用两套语义。

### 错误、鉴权与 requestId

JSON 错误统一采用以下语义；字段的正式定义应放入 `components/schemas` 并由所有错误响应复用：

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "请求参数不合法",
    "details": [{ "field": "title", "reason": "minLength" }]
  },
  "requestId": "req-7f31"
}
```

- `error.code` 是供程序判断的稳定代码；`message` 面向用户；`details` 可选且不得泄露 SQL、堆栈、密钥或内部路径。
- 所有响应必须返回 `X-Request-Id`。客户端可传入合法的 `X-Request-Id`，否则后端生成；错误体中的 `requestId` 必须与响应头和日志一致。
- 第一个受保护接口出现时，在 `components/securitySchemes` 定义统一方案。受保护 operation 用 `security` 声明，公开 operation 显式使用 `security: []`；不能只在文字或 Controller 中隐含鉴权。
- 鉴权只证明身份，资源权限必须由服务端逐项判断并默认拒绝。凭据不得放在 Query、响应、错误详情或日志中。
- Agent、Skill 或 MCP 是普通调用方，必须复用同一 REST 契约，不能绕过鉴权与业务规则。

### 兼容性

- 删除/重命名 Path 或字段、改变类型或语义、收紧约束、增加必填输入、改变状态码或默认排序，均视为破坏性变更。
- 新增可选输入、独立 operation 或不改变旧语义的响应通常是兼容变更；新增枚举值和响应字段仍需验证前端是否做了穷举或严格校验。
- 优先采用“先新增、迁移调用方、标记 `deprecated`、最后删除”的演进方式。需要新旧客户端并存时，提供并行版本（例如 `/api/v2`），不得静默改变旧接口。
- `info.version` 按 SemVer 表达契约版本：文档/示例修正升 patch，向后兼容能力升 minor，破坏性变更升 major。`operationId` 在兼容期内保持稳定。

## 同步要求与完成定义（DoD）

涉及 HTTP 行为的改动只有同时满足以下条件才算完成：

- [ ] Spec 已新增或更新，目标、边界、非目标和验收标准可观察、可测试。
- [ ] `openapi.yaml` 已先于实现更新，且每个受影响 operation 都有有效 `x-spec`。
- [ ] OpenAPI 能被 3.1 校验器解析，Path/Method、输入、成功、失败、安全和 Schema 信息完整。
- [ ] Midway Controller/DTO/Service 的校验、归一化、状态码、响应头和 JSON 与契约一致。
- [ ] Next.js 调用路径和类型来自同一契约，并覆盖加载、成功、空结果、鉴权失败和其他错误状态。
- [ ] API/契约测试至少覆盖主成功路径、每类声明的失败、字段边界和 `requestId`；列表接口还覆盖空列表、默认排序及已声明的分页行为。
- [ ] 兼容性已评估；破坏性变更有版本、迁移和废弃方案。
- [ ] `npm run check` 通过，评审记录能够从 `x-spec` 追溯“验收标准 → operation → 前后端实现 → 测试”。
