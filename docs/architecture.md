# 系统架构

```mermaid
flowchart LR
  Browser["浏览器"] -->|"页面与 /api 请求"| Next["Next.js :3000"]
  Next -->|"重写 /api/*"| Midway["Midway.js :7001"]
  Midway --> Service["CourseService"]
  Service --> SQLite[("SQLite 文件")]
  Contract["OpenAPI 契约"] -.约束.-> Next
  Contract -.约束.-> Midway
```

## 设计边界

- `frontend` 负责页面渲染、交互状态和用户体验。
- `backend` 负责 HTTP 边界、业务规则和数据持久化。
- `contracts` 是前后端共同遵守的接口事实来源。
- `specs` 说明为什么做、为谁做，以及如何判断完成。

功能开发遵循 `specs → contracts → frontend/backend → test/check`。Spec、Contract、ADR 与测试各自的边界和当前模板成熟度见[模板结构审查](./architecture-review.md)。

## 请求链路

开发环境中，浏览器请求 Next.js 的 `/api/*`。Next.js 按 `BACKEND_INTERNAL_URL` 将请求重写到 Midway。这样本地开发和部署都保持同源请求，后端无需放宽 CORS。

## 数据策略

课程项目固定使用 Node.js 24，因此直接使用 `node:sqlite`。数据库默认位于 `backend/data/course-demo.sqlite`，不进入版本控制。当前用建表语句完成初始化；当课程进入 schema 演进章节时，应替换成显式迁移机制。

当前 `CourseService` 为保持首个示例最小而直接访问 SQLite。增加新的业务流程、数据源或正式 schema 演进时，应将数据访问抽到 Repository，并让 Service 只保留业务规则、流程编排和事务边界。
