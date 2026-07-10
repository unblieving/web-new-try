# 模板结构审查

> 审查日期：2026-07-10  
> 参考：`Course_WebDevelopment/pages/web-frontend.md` 与 `web-backend.md`

## 结论

当前结构适合作为**教学型、模块化单体的最小起点**：npm workspaces 管理前后端，Next.js 与 Midway.js 边界清楚，`specs/`、`contracts/`、`docs/`、`test/` 和 `infra/` 也位于正确层级。无需为了“看起来完整”预先创建大量空目录，也不应在业务边界尚未形成时拆成微服务。

它目前还不是一个已经闭环的生产模板。主要问题不是根目录划分，而是 Contract 尚未进入自动验证链，示例实现与 OpenAPI 已有漂移，前后端测试也不足以证明 Spec 的验收标准。

## 分项评估

| 范围            | 评价               | 说明                                                                                                                                                                |
| --------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 根目录          | 合理               | `frontend → backend` 之外，将需求、契约、文档、脚本和部署配置独立出来，符合 `specs → contracts → implementation → checks` 的信息流。                                |
| Next.js 前端    | 基本合理           | 已使用 App Router、TypeScript、Tailwind 和同源 `/api/*` rewrite；但当前纯展示数据仍在 Client Component 的 Effect 中获取，也没有路由级 `loading.tsx` / `error.tsx`。 |
| Midway.js 后端  | 可作为最小示例     | Controller 与 Service 已分开并使用依赖注入；但 `CourseService` 同时承担业务、建表、种子和 SQL，功能增长后需要 Repository 与 Migration 边界。                        |
| Spec / Contract | 目录合理、约束不足 | 已有示例文件，但原先没有明确触发条件、模板、AC 追溯和完成定义；本次已补充规范。                                                                                     |
| 验证链          | 不足               | `npm run check` 能执行 lint、单元测试和构建，但没有 OpenAPI lint、真实 API Contract Test 或端到端验收。                                                             |

## 优先处理的缺口

### P0：先保证契约可信

1. `CreateCourse` 在 OpenAPI 中禁止额外字段，但运行时解析会静默忽略额外字段；两者必须统一。
2. OpenAPI 的字符串长度约束与后端“先去首尾空格、再校验长度”的语义没有被同一套 Contract Test 证明。
3. `POST /api/courses` 当前返回 `200`；课程 REST 规范将资源创建定义为 `201`。如调整，必须先补创建课程 Spec，再同步 OpenAPI、后端和测试。
4. `400` 只有文字描述，没有稳定错误 JSON；需要统一错误 Schema，并由中间件、OpenAPI 与 API Test 共同保证。
5. `npm run check` 尚未校验 OpenAPI 语法、破坏性变化或实际响应。引入契约工具前，应先记录选型理由，避免只增加依赖而没有门禁价值。

### P1：让示例真正体现课程边界

1. 前端成功得到空数组时仍显示加载骨架，未区分 loading 与 empty。
2. 当前前端在组件内重复声明 API 类型并直接断言 JSON。应优先从 OpenAPI 生成；生成链落地前，至少集中到 API 边界模块并做响应校验。
3. 新的展示型路由默认由 Server Component 取数；只有输入、事件、局部状态或浏览器 API 才进入 Client Component。
4. 后端在增加第二个业务流程、可替换数据源或正式 Schema 演进前，拆出 Repository、DTO / HTTP 校验和 Migration。
5. 测试需要从“测试运行器存在”升级为能映射 `AC-xx` 的组件状态测试、Service Test 和真实 API Test。
6. 生产环境不能继续使用代码内固定的 Koa key；应从环境或密钥管理服务注入，并在启动时校验。

### P2：交付工程补强

1. 增加根 `.dockerignore`，避免把本地 `node_modules`、`.next`、`dist`、日志、数据库和密钥送入 Docker build context。
2. 当认证、结构化日志、requestId、缓存或限流成为需求时，以 Middleware 实现跨切面能力，不散落到 Controller。
3. 只有当渲染、状态、ORM、缓存或服务拆分出现需要长期解释的取舍时新增 ADR；不要把架构决策混入功能 Spec。

## 目标目录边界

目录按实际复杂度渐进生长，不要求立即创建所有条目：

```text
frontend/src/
├── app/                 # 路由、布局及 loading/error/not-found
├── components/          # 跨页面复用的 UI
├── features/            # 形成独立边界后的功能模块
└── lib/api/             # API 客户端、运行时校验、契约派生类型

backend/src/
├── controller/          # HTTP 输入、状态码与响应
├── service/             # 业务规则、流程编排与事务边界
├── repository/          # 数据访问；复杂度达到阈值后抽取
├── dto/                 # HTTP 输入输出及运行时校验
├── middleware/          # 错误、日志、requestId、认证等跨切面能力
└── migration/           # 可回放的生产 Schema 演进
```

## 文档边界

| 文档            | 回答的问题                                | 不应承载                               |
| --------------- | ----------------------------------------- | -------------------------------------- |
| Spec            | 为什么做、做什么、边界是什么、怎样算完成  | 文件落点、类设计、完整 API Schema      |
| Contract        | 调用者与服务端实际交换什么                | 产品价值、内部数据库结构、Service 实现 |
| ADR             | 为什么选择某个长期架构方案                | 单次功能的验收清单                     |
| Test / 验收记录 | 哪些可复现证据证明实现满足 AC 与 Contract | 未确认的新需求                         |

详细规则见 [`specs/README.md`](../specs/README.md) 与 [`contracts/README.md`](../contracts/README.md)。
