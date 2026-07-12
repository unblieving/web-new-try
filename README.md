# 校园二手交易平台

面向校园闲置物品流转场景的全栈 Web 应用。学生可以发布闲置商品、浏览搜索、收藏感兴趣的商品，并通过模拟交易流程完成购买；管理员可以审核商品和管理分类。项目以模拟交易串联商品管理、用户行为和后台治理，不接入真实支付与物流。

## 技术栈

- **前端**：Next.js 16、React 19、TypeScript、Tailwind CSS 4
- **后端**：Midway.js 4、Koa、TypeScript
- **数据库**：Node.js 内置 SQLite（`node:sqlite`）
- **认证**：JWT（httpOnly Cookie）
- **工程化**：npm workspaces、Prettier、ESLint、Docker Compose

## 核心功能

| 模块       | 功能                                                     |
| ---------- | -------------------------------------------------------- |
| 用户认证   | 学号注册、密码登录、JWT Cookie 认证、角色区分            |
| 商品管理   | 发布、编辑、删除、两级分类、图片（URL）                  |
| 商品浏览   | 分类筛选、关键词搜索、分页、商品详情                     |
| 收藏       | 收藏 / 取消收藏、收藏列表                                |
| 模拟交易   | 发起购买 → 卖家确认 → 买家确认收货，三阶段订单流转       |
| 并发控制   | SQLite 事务 + 原子库存扣减，防止超卖                     |
| 后台治理   | 商品审核（通过 / 拒绝）、两级分类管理                    |

## 快速开始

环境要求：Node.js 24.14.1 及以上、npm 11 及以上。

```bash
npm install
cp .env.example .env
npm run dev
```

启动后访问：

- Web 页面：http://localhost:3000
- 后端健康检查：http://localhost:7001/api/health
- API 契约：`contracts/openapi.yaml`

前端通过同源 `/api/*` 路径代理后端，浏览器端无需额外配置 CORS。

### 预置账号

数据库首次启动时自动创建预置用户和示例分类：

| 角色   | 学号        | 密码       |
| ------ | ----------- | ---------- |
| 管理员 | `admin001`  | `admin123` |
| 学生   | `2024001`   | `123456`   |
| 学生   | `2024002`   | `123456`   |

## 常用命令

```bash
npm run dev           # 同时启动前端与后端
npm run build         # 构建全部工作区
npm run test          # 运行全部测试
npm run lint          # 运行静态检查
npm run format        # 格式化代码与文档
npm run check         # 执行 lint、test 和 build
npm run check:env     # 检查本地 Node/npm 环境
```

也可以只操作一个工作区：

```bash
npm run dev --workspace frontend
npm run dev --workspace backend
npm run test --workspace backend
npm run lint --workspace frontend
```

## 目录说明

```text
.
├── frontend/          # Next.js 用户界面（App Router）
├── backend/           # Midway.js API 与 SQLite 数据访问
├── specs/             # 需求规格与验收标准
├── contracts/         # OpenAPI 等跨端契约
├── docs/              # 架构及课程资料
├── scripts/           # 本地开发脚本
├── infra/             # Docker 等部署配置
└── .cursor/           # 编辑器项目规则
```

## 项目结构

### 后端

```text
backend/src/
├── controller/
│   ├── api.controller.ts        # 健康检查
│   ├── auth.controller.ts       # 注册、登录、当前用户
│   ├── item.controller.ts       # 商品 CRUD、列表、详情
│   ├── order.controller.ts      # 订单创建、确认、收货、取消
│   ├── favorite.controller.ts   # 收藏与取消收藏
│   └── category.controller.ts   # 分类查询与后台管理
├── service/
│   ├── auth.service.ts          # JWT 签发、密码哈希
│   ├── database.service.ts      # SQLite 连接与建表
│   ├── item.service.ts          # 商品业务逻辑
│   ├── order.service.ts         # 订单业务逻辑（含并发控制）
│   ├── favorite.service.ts      # 收藏业务逻辑
│   └── category.service.ts      # 分类业务逻辑
├── middleware/
│   └── auth.middleware.ts       # JWT 认证与角色鉴权中间件
├── utils/
│   └── validation.ts            # 输入校验工具函数
├── config/
│   └── config.default.ts        # 运行时配置
├── configuration.ts             # Midway 应用配置
└── interface.ts                 # 全局类型定义
```

### 前端

```text
frontend/src/
├── app/
│   ├── page.tsx                 # 首页（商品列表、搜索、分类筛选）
│   ├── layout.tsx               # 全局布局与导航栏
│   ├── globals.css              # Tailwind CSS 入口与蓝色主题
│   ├── items/[id]/page.tsx      # 商品详情页
│   ├── login/page.tsx           # 登录页
│   ├── register/page.tsx        # 注册页
│   ├── publish/page.tsx         # 发布商品页
│   ├── my-items/page.tsx        # 我的发布
│   ├── my-orders/page.tsx       # 我的订单（买入 / 卖出）
│   ├── favorites/page.tsx       # 我的收藏
│   └── admin/page.tsx           # 后台管理（商品审核、分类管理）
├── components/
│   └── navbar.tsx               # 响应式导航栏组件
└── lib/
    ├── api.ts                   # API 调用封装
    ├── auth-context.tsx         # 认证上下文（React Context）
    └── types.ts                 # TypeScript 类型定义
```

## 数据模型

```
users ─────────┐
  │            │
  │ seller_id  │ buyer_id
  ↓            ↓
items ────→ orders
  │
  │ item_id
  ↓
favorites
  │
  │ category_id
  ↓
categories（两级：parent_id → 自身）
```

| 表          | 说明                         | 关键字段                                         |
| ----------- | ---------------------------- | ------------------------------------------------ |
| `users`     | 用户                         | `student_id`（唯一）、`role`（user/admin）       |
| `items`     | 商品                         | `status`、`quantity`、`available_quantity`        |
| `orders`    | 订单                         | `status`（created/confirmed/completed/cancelled） |
| `favorites` | 收藏                         | `UNIQUE(user_id, item_id)`                       |
| `categories`| 两级分类                     | `parent_id`（NULL 为一级）                       |

## 状态流转

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

## 环境变量

默认值足以完成本地开发。需要覆盖时，将 `.env.example` 复制为 `.env` 并在启动命令所在的终端加载它：

```bash
set -a && source .env && set +a
npm run dev
```

不要提交 `.env`、数据库文件或密钥。

## 文档导航

| 文档                                    | 说明                       |
| --------------------------------------- | -------------------------- |
| [功能规格](specs/002-campus-marketplace.md) | 完整需求、业务规则与验收标准 |
| [API 契约](contracts/openapi.yaml)      | HTTP 接口定义（OpenAPI 3.1）|
| [Spec 编写规范](specs/README.md)        | 如何编写需求规格           |
| [Contract 编写规范](contracts/README.md)| 如何维护 API 契约          |
| [系统架构](docs/architecture.md)        | 整体架构设计               |
| [课程指南](docs/course-guide.md)        | 课程学习指引               |