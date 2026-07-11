# 002：校园二手交易平台

> 状态：草案  
> 关联事项：方向二·校园交易服务课程项目

## 目标

学生可以在校园内发布闲置商品、浏览搜索商品、收藏感兴趣的商品，并通过模拟交易流程完成购买，管理员可以审核商品和管理分类。

## 用户故事

- 作为一名学生，我希望发布闲置商品，以便转让给有需要的同学。
- 作为一名学生，我希望浏览和搜索商品，以便找到需要的物品。
- 作为一名学生，我希望收藏感兴趣的商品，以便稍后查看。
- 作为一名买家，我希望发起购买并跟踪订单状态，以便完成交易。
- 作为一名卖家，我希望确认订单和管理我的商品，以便完成交易。
- 作为一名管理员，我希望审核商品和管理分类，以便维护平台秩序。

## 范围

- 用户注册与登录（学号+用户名+密码，JWT 认证）
- 商品发布、编辑、删除（支持单件和多库存）
- 商品浏览、分类筛选、关键词搜索、分页
- 商品详情页面
- 收藏与取消收藏
- 三阶段交易流程：发起购买 → 卖家确认 → 买家确认收货
- 订单状态管理与取消
- 后台商品审核（发布前审核）
- 后台两级分类管理
- 并发购买防超卖（SQLite 事务 + 原子库存扣减）

## 非目标

- 真实支付与物流接入
- 站内聊天或消息系统
- 商品评价与评分
- 举报功能
- 商品图片上传到外部存储服务（使用本地存储或 Base64）
- 端到端浏览器自动化测试

## 业务规则

### 用户与认证

- **BR-01**：用户通过学号注册，学号唯一；密码存储为哈希值。
- **BR-02**：登录成功返回 JWT token，存储在 httpOnly cookie 中。
- **BR-03**：用户角色分为 `user`（普通用户）和 `admin`（管理员），管理员通过预设账号或特定学号规则识别。

### 商品

- **BR-04**：商品发布后进入 `pending_review` 状态，管理员审核通过后变为 `listed`，拒绝后变为 `rejected`。
- **BR-05**：只有 `listed` 状态的商品对外可见和可购买。
- **BR-06**：商品支持设置数量（quantity），默认为 1（单件商品）；available_quantity 表示当前可购买数量。
- **BR-07**：商品分类为两级结构，发布时必须选择二级分类。
- **BR-08**：卖家只能编辑和删除自己的商品。
- **BR-09**：商品状态流转：`pending_review` → `listed`/`rejected` → `reserved`（有订单）→ `sold`（订单完成）；订单取消时 `reserved` → `listed`。

### 交易与订单

- **BR-10**：买家不能购买自己发布的商品。
- **BR-11**：创建订单时原子扣减 available_quantity，使用 `UPDATE ... WHERE available_quantity >= ?` 防止超卖。
- **BR-12**：库存不足时返回 409 Conflict；商品已下架时返回 410 Gone。
- **BR-13**：订单状态流转：`created` → `confirmed`（卖家确认）→ `completed`（买家确认收货）；可在 `created` 或 `confirmed` 状态取消。
- **BR-14**：取消订单时释放库存（available_quantity 恢复）。
- **BR-15**：卖家确认订单、买家确认收货、取消订单均需验证操作者身份。

### 收藏

- **BR-16**：每个用户对同一商品只能收藏一次（唯一约束）。
- **BR-17**：收藏和取消收藏需要登录。

### 后台管理

- **BR-18**：只有管理员可以审核商品和管理分类。
- **BR-19**：审核操作包括通过（approve）和拒绝（reject），拒绝时可选填原因。
- **BR-20**：分类为两级结构，一级分类的 parent_id 为 null，二级分类的 parent_id 指向一级分类。
- **BR-21**：删除分类时需检查是否有关联商品，有则拒绝删除或要求迁移。

## Contract 影响

- 结论：新增
- 理由或影响摘要：新增完整的校园交易平台 API，包括认证、商品、订单、收藏和后台管理。
- OpenAPI operation：
  - `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`
  - `GET /api/items`、`GET /api/items/:id`、`POST /api/items`、`PATCH /api/items/:id`、`DELETE /api/items/:id`
  - `POST /api/items/:id/favorite`、`DELETE /api/items/:id/favorite`
  - `POST /api/orders`、`GET /api/orders`、`GET /api/orders/:id`
  - `PATCH /api/orders/:id/confirm`、`PATCH /api/orders/:id/complete`、`PATCH /api/orders/:id/cancel`
  - `GET /api/admin/items`、`PATCH /api/admin/items/:id/approve`、`PATCH /api/admin/items/:id/reject`
  - `GET /api/admin/categories`、`POST /api/admin/categories`、`PATCH /api/admin/categories/:id`、`DELETE /api/admin/categories/:id`
- 迁移 / 废弃安排：不适用（新增功能）

## 验收标准

### 用户认证

- **AC-01**：给定有效学号、用户名和密码，当用户注册时，则创建成功并返回用户信息。
- **AC-02**：给定已存在的学号，当用户尝试注册时，则返回 409 Conflict 错误。
- **AC-03**：给定正确的学号和密码，当用户登录时，则返回 JWT token 并设置 httpOnly cookie。
- **AC-04**：给定无效凭证，当用户登录时，则返回 401 Unauthorized 错误。
- **AC-05**：给定有效 cookie，当请求 `/api/auth/me` 时，则返回当前用户信息。
- **AC-06**：给定无 cookie 或无效 cookie，当请求 `/api/auth/me` 时，则返回 401 Unauthorized。

### 商品发布与管理

- **AC-07**：给定登录用户，当发布有效商品时，则商品状态为 `pending_review`，返回 201 Created。
- **AC-08**：给定未登录用户，当尝试发布商品时，则返回 401 Unauthorized。
- **AC-09**：给定缺少必填字段（标题、价格、分类），当发布商品时，则返回 400 错误和具体字段提示。
- **AC-10**：给定卖家身份，当编辑自己的商品时，则更新成功。
- **AC-11**：给定非卖家身份，当尝试编辑他人商品时，则返回 403 Forbidden。
- **AC-12**：给定卖家身份，当删除自己的商品时，则删除成功且库存清零。

### 商品浏览与搜索

- **AC-13**：给定存在已上架商品，当请求商品列表时，则返回 `listed` 状态的商品，按创建时间倒序分页。
- **AC-14**：给定无已上架商品，当请求商品列表时，则返回 200 和空数组。
- **AC-15**：给定分类筛选参数，当请求商品列表时，则只返回该分类下的商品。
- **AC-16**：给定关键词搜索参数，当请求商品列表时，则返回标题或描述包含关键词的商品。
- **AC-17**：给定有效商品 ID，当请求商品详情时，则返回完整商品信息（含卖家信息、分类信息）。
- **AC-18**：给定不存在的商品 ID，当请求商品详情时，则返回 404 Not Found。

### 收藏功能

- **AC-19**：给定登录用户和有效商品，当收藏商品时，则创建收藏记录，返回 201。
- **AC-20**：给定已收藏的商品，当再次收藏时，则返回 409 Conflict 或幂等成功。
- **AC-21**：给定已收藏的商品，当取消收藏时，则删除收藏记录，返回 204。
- **AC-22**：给定登录用户，当请求收藏列表时，则返回该用户收藏的所有商品。

### 交易流程

- **AC-23**：给定登录买家和 `listed` 状态商品，当发起购买且库存充足时，则创建订单（状态 `created`），available_quantity 扣减，返回 201。
- **AC-24**：给定库存不足，当发起购买时，则返回 409 Conflict 和 "库存不足" 提示。
- **AC-25**：给定买家尝试购买自己的商品，当发起购买时，则返回 403 Forbidden。
- **AC-26**：给定 10 个并发购买请求和库存为 3，当并发执行时，则恰好 3 个成功，7 个返回 409，最终 available_quantity 为 0。
- **AC-27**：给定 `created` 状态订单，当卖家确认时，则订单状态变为 `confirmed`。
- **AC-28**：给定非卖家身份，当尝试确认订单时，则返回 403 Forbidden。
- **AC-29**：给定 `confirmed` 状态订单，当买家确认收货时，则订单状态变为 `completed`，商品状态变为 `sold`。
- **AC-30**：给定 `created` 状态订单，当买家取消时，则订单状态变为 `cancelled`，available_quantity 恢复。
- **AC-31**：给定 `confirmed` 状态订单，当卖家或买家取消时，则订单状态变为 `cancelled`，available_quantity 恢复，商品状态恢复为 `listed`。

### 后台管理

- **AC-32**：给定管理员身份，当请求待审核商品列表时，则返回 `pending_review` 状态的商品。
- **AC-33**：给定管理员身份和有效商品，当审核通过时，则商品状态变为 `listed`。
- **AC-34**：给定管理员身份和有效商品，当审核拒绝时，则商品状态变为 `rejected`。
- **AC-35**：给定非管理员身份，当尝试审核商品时，则返回 403 Forbidden。
- **AC-36**：给定管理员身份，当创建分类时，则分类创建成功，支持一级和二级分类。
- **AC-37**：给定管理员身份，当删除有关联商品的分类时，则返回 409 Conflict 或要求迁移。

### 前端页面

- **AC-38**：当用户打开首页时，则显示商品列表，支持分类筛选和搜索，呈现加载、成功、空结果、错误四态。
- **AC-39**：当用户点击商品卡片时，则跳转到商品详情页，显示完整信息和操作按钮。
- **AC-40**：给定登录用户，当打开发布页面并提交有效表单时，则商品发布成功并跳转到我的发布页面。
- **AC-41**：给定登录用户，当打开我的订单页面时，则显示买入和卖出订单列表，支持 Tab 切换。
- **AC-42**：给定订单操作按钮，当点击确认/取消/收货时，则调用对应 API 并更新界面状态。
- **AC-43**：给定管理员身份，当打开后台审核页面时，则显示待审核商品列表和通过/拒绝操作。
- **AC-44**：当键盘用户遍历页面时，则所有交互元素具有可见焦点和语义标签。

## 验证映射

| AC | 验证方式 | 命令或可复现步骤 | 结果 / 证据 |
| --- | --- | --- | --- |
| AC-01 ~ AC-06 | API Test | `npm run test --workspace backend` 认证相关测试 | 待实现 |
| AC-07 ~ AC-12 | API Test | `npm run test --workspace backend` 商品 CRUD 测试 | 待实现 |
| AC-13 ~ AC-18 | API Test | `npm run test --workspace backend` 商品列表测试 | 待实现 |
| AC-19 ~ AC-22 | API Test | `npm run test --workspace backend` 收藏功能测试 | 待实现 |
| AC-23 ~ AC-25 | API Test | `npm run test --workspace backend` 订单流程测试 | 待实现 |
| AC-26 | 并发测试 | `npm run test --workspace backend` 并发购买测试（Promise.all 模拟 10 并发） | 待实现 |
| AC-27 ~ AC-31 | API Test | `npm run test --workspace backend` 订单状态流转测试 | 待实现 |
| AC-32 ~ AC-37 | API Test | `npm run test --workspace backend` 后台管理测试 | 待实现 |
| AC-38 ~ AC-43 | 组件测试 / 人工 | `npm run build --workspace frontend` + 人工验收 | 待实现 |
| AC-44 | 人工验收 | 键盘遍历 + 辅助技术检查 | 待执行 |

## 验收记录

- `npm run check`：待执行
- 人工验收：待执行
- 已知限制：无

## 数据模型

### 表结构

```sql
-- 用户表
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 分类表（两级）
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER, -- NULL 表示一级分类
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- 商品表
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  available_quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending_review', -- pending_review | listed | rejected | reserved | sold
  reject_reason TEXT, -- 审核拒绝原因（可选）
  images TEXT, -- JSON 数组或逗号分隔
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 订单表
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  buyer_id INTEGER NOT NULL,
  seller_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  total_price REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'created', -- created | confirmed | completed | cancelled
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (seller_id) REFERENCES users(id)
);

-- 收藏表
CREATE TABLE favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, item_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (item_id) REFERENCES items(id)
);
```

### 状态流转图

```
商品状态：
pending_review ──→ listed ──→ reserved ──→ sold
       │              ↑           │
       ↓              │           ↓
    rejected          └───── listed（订单取消）

订单状态：
created ──→ confirmed ──→ completed
    │            │
    ↓            ↓
 cancelled   cancelled
```

## 技术架构

### 后端结构

```
backend/src/
├── controller/
│   ├── auth.controller.ts      # 认证相关 API
│   ├── item.controller.ts      # 商品相关 API
│   ├── order.controller.ts     # 订单相关 API
│   ├── favorite.controller.ts  # 收藏相关 API
│   └── admin.controller.ts     # 后台管理 API
├── service/
│   ├── auth.service.ts         # 认证逻辑（JWT、密码哈希）
│   ├── item.service.ts         # 商品业务逻辑
│   ├── order.service.ts        # 订单业务逻辑（含并发控制）
│   ├── favorite.service.ts     # 收藏业务逻辑
│   └── admin.service.ts        # 后台管理逻辑
├── repository/
│   ├── user.repository.ts      # 用户数据访问
│   ├── item.repository.ts      # 商品数据访问
│   ├── order.repository.ts     # 订单数据访问
│   ├── favorite.repository.ts  # 收藏数据访问
│   └── category.repository.ts  # 分类数据访问
├── middleware/
│   └── auth.middleware.ts      # JWT 认证中间件
└── utils/
    └── validation.ts           # 输入校验工具
```

### 前端结构

```
frontend/src/
├── app/
│   ├── page.tsx                # 首页（商品列表）
│   ├── items/[id]/page.tsx     # 商品详情
│   ├── publish/page.tsx        # 发布商品
│   ├── login/page.tsx          # 登录
│   ├── register/page.tsx       # 注册
│   ├── my/
│   │   ├── items/page.tsx      # 我的发布
│   │   ├── orders/page.tsx     # 我的订单
│   │   └── favorites/page.tsx  # 我的收藏
│   └── admin/
│       ├── items/page.tsx      # 商品审核
│       └── categories/page.tsx # 分类管理
├── components/
│   ├── layout/
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   ├── item/
│   │   ├── item-card.tsx
│   │   ├── item-form.tsx
│   │   └── item-status.tsx
│   ├── order/
│   │   ├── order-card.tsx
│   │   └── order-actions.tsx
│   ├── category/
│   │   └── category-tree.tsx
│   └── common/
│       ├── pagination.tsx
│       ├── search-bar.tsx
│       └── empty-state.tsx
└── lib/
    └── api.ts                  # API 调用封装
```

## 并发控制策略

### 防止超卖

```sql
-- 在事务中执行
BEGIN TRANSACTION;

UPDATE items 
SET available_quantity = available_quantity - ?
WHERE id = ? AND available_quantity >= ? AND status = 'listed';

-- 检查 affected rows，为 0 则回滚并返回 409
-- 成功则创建订单
INSERT INTO orders (...) VALUES (...);

COMMIT;
```

### 错误响应格式

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "该商品库存不足"
  }
}
```

| HTTP 状态码 | 错误码 | 场景 |
|-------------|--------|------|
| 400 | VALIDATION_ERROR | 输入校验失败 |
| 401 | UNAUTHORIZED | 未登录 |
| 403 | FORBIDDEN | 无权限 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 并发冲突 |
| 410 | GONE | 商品已下架 |