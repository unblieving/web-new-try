# 性能问题与竞态资源问题处理报告

## 一、项目概述

本项目为校园二手交易平台（Campus Marketplace），采用 Next.js + Midway.js + SQLite 技术栈。
在开发过程中，识别并解决了以下性能问题和竞态资源问题。

---

## 二、性能问题及优化措施

### 2.1 数据库查询性能优化

**问题描述：**
商品列表页需要同时展示商品信息、卖家信息和分类信息，最初实现采用 N+1 查询模式——
先查询商品列表，再逐条查询每个商品的卖家和分类信息，导致数据库查询次数随商品数量线性增长。

**优化措施：**
- 在 `items` 表的 `status`、`category_id`、`seller_id` 字段上建立索引，加速条件查询和 JOIN 操作。
- 在 `orders` 表的 `buyer_id`、`item_id` 字段上建立索引，加速"我的订单"查询。
- 在 `favorites` 表的 `user_id` 字段上建立索引，并设置 `UNIQUE(user_id, item_id)` 约束。
- 使用 SQLite 的 WAL（Write-Ahead Logging）模式，允许读写并发执行，避免读操作被写操作阻塞。

**相关代码：**
```sql
-- database.service.ts
PRAGMA journal_mode = WAL;
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_seller ON items(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_item ON orders(item_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
```

### 2.2 前端渲染性能优化

**问题描述：**
商品列表页、收藏页等数据密集型页面，每次导航都重新请求 API 并完整渲染，
在商品数量较多时出现明显的加载延迟和页面闪烁。

**优化措施：**
- 使用 Next.js App Router 的 React Server Components（RSC），在服务端完成数据获取和 HTML 渲染，
  减少客户端 JavaScript 体积和首屏加载时间。
- 商品详情页使用动态路由 `[id]/page.tsx`，按需获取单个商品数据。
- 收藏状态使用客户端组件（`"use client"`）管理，通过 `useOptimistic` 实现乐观更新，
  用户点击收藏后立即更新 UI，后台异步发送请求，失败时回滚。
- 认证上下文使用 `AuthContext` + `useMemo` 避免不必要的重渲染。

### 2.3 Docker 镜像构建优化

**问题描述：**
初始 Docker 镜像包含完整的 `node_modules` 和构建工具，镜像体积过大。

**优化措施：**
- 采用多阶段构建（multi-stage build），构建阶段安装依赖并编译，运行阶段仅拷贝产物。
- 使用 `node:24-alpine` 作为基础镜像，减小镜像体积。
- 利用 Docker 层缓存，将 `package.json` 拷贝和 `npm ci` 放在独立层，
  代码变更时不需要重新安装依赖。

**相关代码：**
```dockerfile
# infra/backend.Dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN npm ci
COPY backend backend
RUN npm run build --workspace backend

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend ./backend
EXPOSE 7001
CMD ["npm", "run", "start", "--workspace", "backend"]
```

---

## 三、竞态资源问题及解决方案

### 3.1 问题背景：商品超卖（Overselling）

**问题描述：**
校园二手交易的核心场景是限量商品的并发购买。当多个买家同时购买同一件库存有限的商品时，
如果采用"先查后写"（check-then-act）的非原子操作，会出现超卖问题：

```
时间线：
  T1: 买家A 查询库存 → stock = 1
  T2: 买家B 查询库存 → stock = 1
  T3: 买家A 扣减库存 → stock = 0，创建订单 ✓
  T4: 买家B 扣减库存 → stock = -1，创建订单 ✗（超卖！）
```

两个买家都读到了 `stock = 1`，都认为可以购买，最终库存变为 -1，产生了无效订单。

### 3.2 解决方案：BEGIN IMMEDIATE 事务 + 事务内二次校验

**核心思路：**
使用 SQLite 的 `BEGIN IMMEDIATE` 语句在事务开始时立即获取写锁（reserved lock），
阻止其他写事务并发执行，将"查库存 → 扣库存 → 创建订单"序列化为原子操作。

**关键代码（order.service.ts）：**
```typescript
createOrder(buyerId: number, input: CreateOrderInput): Order {
  // ... 前置校验 ...

  // 使用 BEGIN IMMEDIATE 立即获取写锁，防止并发写入
  this.db.exec("BEGIN IMMEDIATE");
  try {
    // 事务内重新查询库存（关键：不信任事务外的查询结果）
    const currentRow = this.db
      .prepare("SELECT available_quantity, status FROM items WHERE id = ?")
      .get(itemId) as { available_quantity: number; status: string } | undefined;

    if (!currentRow || currentRow.available_quantity < quantity) {
      throw new Error("库存不足，商品可能已被他人购买");
    }

    // 扣减库存
    this.db
      .prepare(
        "UPDATE items SET available_quantity = ?, status = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .run(newAvailable, newStatus, itemId);

    // 创建订单
    this.db.prepare(
      `INSERT INTO orders (order_no, buyer_id, item_id, quantity, total_price) VALUES (?, ?, ?, ?, ?)`,
    ).run(orderNo, buyerId, itemId, quantity, totalPrice);

    this.db.exec("COMMIT");
    return this.findById(Number(result.lastInsertRowid))!;
  } catch (err) {
    this.db.exec("ROLLBACK");
    throw err;
  }
}
```

**为什么选择 BEGIN IMMEDIATE 而非 BEGIN DEFERRED：**
- `BEGIN DEFERRED`（默认）在第一次写操作时才获取写锁，
  如果两个事务同时开始并各自读取，然后在写入时互相等待对方释放读锁，会产生死锁。
- `BEGIN IMMEDIATE` 在事务开始时就获取写锁，其他写事务会立即收到 `SQLITE_BUSY` 错误并等待，
  从根本上避免了死锁和超卖。

### 3.3 取消订单的库存恢复

取消订单同样使用 `BEGIN IMMEDIATE` 事务，确保"更新订单状态 → 恢复库存"的原子性：

```typescript
cancelOrder(orderId: number, userId: number): Order {
  // ... 权限校验 ...

  this.db.exec("BEGIN IMMEDIATE");
  try {
    this.db.prepare(
      "UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?",
    ).run(orderId);

    // 恢复库存
    this.itemService.releaseStock(order.itemId, order.quantity);

    this.db.exec("COMMIT");
    return this.findById(orderId)!;
  } catch (err) {
    this.db.exec("ROLLBACK");
    throw err;
  }
}
```

### 3.4 确认收货的原子操作

确认收货需要同时更新订单状态和商品状态（当所有库存售罄时标记为 sold），
同样使用 `BEGIN IMMEDIATE` 保证原子性：

```typescript
confirmReceipt(orderId: number, buyerId: number): Order {
  // ... 权限和状态校验 ...

  this.db.exec("BEGIN IMMEDIATE");
  try {
    this.db.prepare(
      "UPDATE orders SET status = 'completed', updated_at = datetime('now') WHERE id = ?",
    ).run(orderId);

    const item = this.itemService.findById(order.itemId);
    if (item && item.availableQuantity === 0) {
      this.itemService.markSold(order.itemId);
    }

    this.db.exec("COMMIT");
    return this.findById(orderId)!;
  } catch (err) {
    this.db.exec("ROLLBACK");
    throw err;
  }
}
```

### 3.5 并发测试验证

编写了完整的并发测试用例（`backend/test/concurrency.test.mts`），覆盖以下场景：

| 测试场景 | 预期结果 | 验证方式 |
|---------|---------|---------|
| 5 个买家同时抢购库存为 1 的商品 | 仅 1 人成功，4 人失败 | `assert.equal(fulfilled.length, 1)` |
| 5 个买家同时抢购库存为 3 的商品 | 恰好 3 人成功，2 人失败 | `assert.equal(fulfilled.length, 3)` |
| 并发购买 + 取消后库存一致性 | 库存 + 活跃订单 = 原始数量 | `assert.equal(stock + activeOrders, 1)` |
| 5 个并发购买库存为 2 的商品 | 恰好 2 人成功，3 人失败 | `assert.equal(successes.length, 2)` |

所有测试均通过，验证了并发安全方案的有效性。

---

## 四、其他安全措施

### 4.1 输入验证
- 所有 API 入参在 Controller 层进行类型和范围校验（`validation.ts`）。
- 使用 `requirePositiveInt` 等工具函数确保 ID、数量等参数合法。

### 4.2 权限控制
- 使用 JWT Token 进行身份认证（`auth.middleware.ts`）。
- 订单操作校验 `buyerId` / `sellerId` 与当前用户一致，防止越权操作。
- 管理员接口校验 `role === 'admin'`。

### 4.3 密码安全
- 使用 `scrypt` 算法加盐哈希存储密码，不使用明文或简单哈希。
- 每次注册生成独立随机盐值。

### 4.4 SQL 注入防护
- 所有 SQL 查询使用参数化语句（`?` 占位符），不拼接用户输入。

---

## 五、总结

| 问题类型 | 具体问题 | 解决方案 | 效果 |
|---------|---------|---------|------|
| 性能 | N+1 查询 | 数据库索引 + WAL 模式 | 查询延迟降低 |
| 性能 | 前端加载慢 | RSC 服务端渲染 + 乐观更新 | 首屏加载加速 |
| 性能 | 镜像体积大 | 多阶段构建 + Alpine 基础镜像 | 镜像体积减小 |
| 竞态 | 商品超卖 | BEGIN IMMEDIATE 事务 + 事务内二次校验 | 并发安全 |
| 竞态 | 取消订单库存丢失 | BEGIN IMMEDIATE 原子恢复 | 数据一致性 |
| 竞态 | 确认收货状态不一致 | BEGIN IMMEDIATE 原子更新 | 数据一致性 |