# 校园二手交易平台 — 大作业完善设计文档

> 日期：2026-07-14
> 状态：已批准
> 方案：A（测试优先）

## 背景

校园二手交易平台（`specs/002-campus-marketplace.md`）已完成核心功能开发，包括 Midway.js 后端（认证、商品、订单、收藏、后台管理）和 Next.js 前端（首页、商品详情、发布、订单、收藏、后台审核）。但对照大作业要求，存在以下差距：

| 大作业要求 | 当前状态 | 差距 |
|-----------|---------|------|
| 分层测试 + 并发测试证据 | 仅 1 个 validation 测试文件 | 需补充 Service 层测试和并发测试 |
| 结构化日志 | 无 | 需添加请求追踪日志 |
| Agent/MCP 接入 | 无 | 需实现 MCP Server + Skill |
| Docker 产物验证 | 有 Dockerfile 但未验证 | 需验证 Linux/amd64 构建 |
| 问题处理报告 | 无 | 需编写性能/竞态分析报告 |

### 关键发现：Spec 与代码不一致

Spec 定义的订单流程为三阶段（`created → confirmed → completed`），但代码实现为支付模式（`pending_payment → paid → completed`）。**决定以 Spec 为准**，修改代码对齐。

## 实施顺序

```
Phase 1（最高优先级）：订单流程对齐 + 后端测试
Phase 2（高优先级）：结构化日志
Phase 3（中优先级）：Agent 接入（MCP + Skill）
Phase 4（收尾）：Docker 验证 + 报告 + 录屏指引
```

---

## Phase 1：订单流程对齐 + 后端测试

### 1a. 订单流程对齐

**目标**：将代码的订单状态机从支付模式改为 Spec 定义的三阶段模式。

**状态机变更**：

```
旧（代码）：pending_payment → paid → completed
                     ↓
                 cancelled

新（Spec）：created → confirmed → completed
               │          │
               ↓          ↓
           cancelled  cancelled
```

**改动文件**：

| 文件 | 改动 |
|------|------|
| `backend/src/interface.ts` | `OrderStatus` 类型改为 `created \| confirmed \| completed \| cancelled` |
| `backend/src/service/order.service.ts` | `simulatePayment` → `sellerConfirm`；`confirmReceipt` 改为买家确认；`cancelOrder` 支持 `created` 和 `confirmed` 状态 |
| `backend/src/controller/order.controller.ts` | 路由调整：新增 `PATCH /orders/:id/confirm`（卖家确认）、`PATCH /orders/:id/complete`（买家收货） |
| `backend/src/service/database.service.ts` | orders 表 schema 中 status 默认值改为 `created` |
| `frontend/src/app/my-orders/page.tsx` | 状态显示和操作按钮对齐新流程 |
| `frontend/src/lib/types.ts` | `OrderStatus` 类型同步 |
| `frontend/src/lib/api.ts` | API 调用方法对齐新路由 |
| `contracts/openapi.yaml` | 订单相关 operation 对齐 |

**业务规则对齐**：

- `sellerConfirm(orderId, sellerId)`：验证卖家身份，`created` → `confirmed`
- `confirmReceipt(orderId, buyerId)`：验证买家身份，`confirmed` → `completed`，检查库存为 0 时标记商品 `sold`
- `cancelOrder(orderId, userId)`：`created` 状态仅买家可取消；`confirmed` 状态买家或卖家可取消；取消时释放库存

### 1b. Service 层测试

**测试基础设施**：每个测试文件使用独立的内存 SQLite 数据库。创建 `backend/test/helpers/test-db.mts` 提供：
- `createTestDatabase()`：创建内存数据库并初始化 schema
- `seedUser(db, overrides)`：插入测试用户
- `seedCategory(db)`：插入测试分类
- `seedItem(db, sellerId, overrides)`：插入测试商品
- `cleanup(db)`：关闭数据库

**测试文件与覆盖范围**：

| 测试文件 | 覆盖 AC | 用例数 |
|----------|---------|--------|
| `auth.service.test.mts` | AC-01~06 | ~8 |
| `item.service.test.mts` | AC-07~18 | ~12 |
| `order.service.test.mts` | AC-23~31 | ~10 |
| `favorite.service.test.mts` | AC-19~22 | ~5 |
| `concurrency.test.mts` | AC-26 | ~3 |

**认证测试（auth.service.test.mts）**：
- 注册成功返回用户信息（AC-01）
- 重复学号注册返回冲突（AC-02）
- 登录成功返回 token（AC-03）
- 错误密码登录失败（AC-04）
- 有效 token 获取当前用户（AC-05）
- 无效 token 返回 401（AC-06）

**商品测试（item.service.test.mts）**：
- 发布商品状态为 pending_review（AC-07）
- 缺少必填字段校验（AC-09）
- 卖家编辑自己的商品（AC-10）
- 非卖家编辑他人商品被拒（AC-11）
- 卖家删除自己的商品（AC-12）
- 商品列表只返回 listed 状态（AC-13）
- 空列表返回空数组（AC-14）
- 分类筛选（AC-15）
- 关键词搜索（AC-16）
- 商品详情含卖家和分类信息（AC-17）
- 不存在的商品返回 null（AC-18）

**订单测试（order.service.test.mts）**：
- 创建订单扣减库存（AC-23）
- 库存不足返回错误（AC-24）
- 不能购买自己的商品（AC-25）
- 卖家确认订单（AC-27）
- 非卖家确认被拒（AC-28）
- 买家确认收货（AC-29）
- 买家取消 created 订单恢复库存（AC-30）
- 卖家取消 confirmed 订单恢复库存（AC-31）

**收藏测试（favorite.service.test.mts）**：
- 收藏成功（AC-19）
- 重复收藏幂等或冲突（AC-20）
- 取消收藏（AC-21）
- 收藏列表（AC-22）

### 1c. 并发测试（concurrency.test.mts）

**场景**：10 个并发购买请求，库存 = 3

```typescript
// 伪代码
const results = await Promise.allSettled(
  Array.from({ length: 10 }, (_, i) =>
    orderService.createOrder(buyerIds[i], { itemId, quantity: 1 })
  )
);

const fulfilled = results.filter(r => r.status === 'fulfilled');
const rejected = results.filter(r => r.status === 'rejected');

assert.equal(fulfilled.length, 3);
assert.equal(rejected.length, 7);
assert.equal(item.availableQuantity, 0);
```

**断言**：
- 恰好 3 个成功
- 恰好 7 个失败（"库存不足"错误）
- 最终 `available_quantity === 0`
- orders 表中恰好 3 条记录

---

## Phase 2：结构化日志

### 请求日志中间件

新增 `backend/src/middleware/request-logger.middleware.ts`：

**功能**：
- 每个请求生成唯一 `requestId`（UUID v4 或 crypto.randomUUID）
- 记录：`requestId`、`method`、`path`、`statusCode`、`duration(ms)`
- 错误时记录完整错误栈
- 输出格式：JSON（便于解析和搜索）

**输出示例**：
```json
{"requestId":"abc-123","method":"POST","path":"/api/orders","status":201,"duration":45,"timestamp":"2026-07-14T12:00:00Z"}
{"requestId":"abc-123","method":"POST","path":"/api/orders","status":409,"duration":12,"error":"库存不足","timestamp":"2026-07-14T12:00:01Z"}
```

**集成**：在 Midway.js 配置中注册为全局中间件，位于 auth 中间件之后。

---

## Phase 3：Agent 接入

### 3a. MCP Server

**目录**：`mcp/`（项目根目录）

**实现方式**：stdio transport，Node.js 脚本，直接读取 SQLite 数据库（只读操作）。

**工具定义**：

| 工具名 | 描述 | 输入参数 | 输出 |
|--------|------|---------|------|
| `search_items` | 搜索商品 | `keyword?`, `categoryId?`, `minPrice?`, `maxPrice?`, `page?` | 商品列表（标题、价格、状态、库存） |
| `get_item_detail` | 商品详情 | `itemId` | 完整商品信息（含卖家、分类） |
| `get_order_status` | 订单状态查询 | `orderNo` | 订单状态、商品、金额 |

**技术选型**：`@modelcontextprotocol/sdk`，stdio transport。

**配置**：提供 `mcp-config.json` 供 WorkBuddy 导入。

### 3b. Skill

**目录**：`skills/`（项目根目录）

**技能定义**：

| 技能名 | 描述 | 触发条件 | 操作 |
|--------|------|---------|------|
| `admin-review` | 批量审核商品 | 用户请求审核待审商品 | 调用 `GET /api/admin/items` 列出待审商品，调用 `PATCH /api/admin/items/:id/approve` 或 `reject` |
| `order-stats` | 订单统计 | 用户请求查看订单数据 | 调用 API 统计今日订单、待确认、已完成、总交易额 |

**实现方式**：Cline Skill 格式（`.md` 文件），包含指令和 API 调用模板。

---

## Phase 4：Docker + 报告 + 录屏

### 4a. Docker 验证

- 更新 `infra/compose.yaml`：数据库卷名改为 `campus-marketplace-data`
- 验证命令：`docker compose -f infra/compose.yaml build --platform linux/amd64`
- 验证命令：`docker compose -f infra/compose.yaml up`
- 记录构建产物大小和启动时间

### 4b. 问题处理报告

新增 `docs/problem-solving-report.md`，包含：

**性能问题**：
- 商品列表查询优化（索引、分页）
- 并发购买场景下的锁竞争分析

**竞态问题**：
- 超卖场景分析：`BEGIN IMMEDIATE` + 原子 UPDATE 的防护机制
- 测试证据：并发测试结果（10 并发、3 库存、恰好 3 成功）
- 日志证据：结构化日志中的 requestId 追踪

### 4c. README.txt + 录屏

新增 `README.txt`：
- 项目简介
- 启动方式（本地 + Docker）
- 测试命令
- MCP/Skill 使用说明
- 录屏脚本（建议的操作流程和旁白）

---

## 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 订单流程改动影响前端多处 | 高 | 先改后端 + 测试，再同步前端 |
| 并发测试在 Windows 上行为不同 | 中 | 使用 `Promise.allSettled` 模拟，不依赖 OS 级线程 |
| MCP Server 依赖 `@modelcontextprotocol/sdk` | 低 | 如安装失败，退化为 HTTP API 调用 |
| 时间不够完成所有 Phase | 中 | Phase 1 必做，Phase 2-4 按优先级递减 |

## 不做的事

- 不迁移到 TypeORM（保持 node:sqlite，在报告中说明选型理由）
- 不添加端到端浏览器测试
- 不实现真实支付或物流
- 不添加 WebSocket 实时通知