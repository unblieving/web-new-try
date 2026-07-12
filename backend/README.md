# Backend

Midway.js + Koa API，使用 Node.js 24 内置的 `node:sqlite` 保存数据。

```bash
npm run dev --workspace backend
```

默认端口为 `7001`，数据库首次启动时会自动创建表结构并写入预置用户和示例分类数据。

## 主要入口

| 文件                           | 说明                           |
| ------------------------------ | ------------------------------ |
| `src/configuration.ts`         | Midway 应用配置                |
| `src/config/config.default.ts` | 运行时配置（端口、JWT 密钥等） |
| `src/interface.ts`             | 全局 TypeScript 类型定义       |

## Controller 层

| 文件                                    | 路由前缀                                       | 说明                       |
| --------------------------------------- | ---------------------------------------------- | -------------------------- |
| `src/controller/api.controller.ts`      | `GET /api/health`                              | 健康检查                   |
| `src/controller/auth.controller.ts`     | `/api/auth/*`                                  | 注册、登录、获取当前用户   |
| `src/controller/item.controller.ts`     | `/api/items/*`                                 | 商品 CRUD、列表、详情      |
| `src/controller/order.controller.ts`    | `/api/orders/*`                                | 订单创建、确认、收货、取消 |
| `src/controller/favorite.controller.ts` | `/api/items/:id/favorite`                      | 收藏与取消收藏             |
| `src/controller/category.controller.ts` | `/api/categories/*`、`/api/admin/categories/*` | 分类查询与后台管理         |

## Service 层

| 文件                              | 说明                                 |
| --------------------------------- | ------------------------------------ |
| `src/service/database.service.ts` | SQLite 连接管理、建表、种子数据      |
| `src/service/auth.service.ts`     | JWT 签发与验证、密码哈希（bcrypt）   |
| `src/service/item.service.ts`     | 商品发布、编辑、删除、列表查询、详情 |
| `src/service/order.service.ts`    | 订单创建（含并发库存扣减）、状态流转 |
| `src/service/favorite.service.ts` | 收藏与取消收藏                       |
| `src/service/category.service.ts` | 两级分类 CRUD                        |

## 中间件

| 文件                                | 说明                                    |
| ----------------------------------- | --------------------------------------- |
| `src/middleware/auth.middleware.ts` | JWT Cookie 认证、角色鉴权（user/admin） |

## 工具

| 文件                      | 说明                                                 |
| ------------------------- | ---------------------------------------------------- |
| `src/utils/validation.ts` | 输入校验工具（requireString、requirePositiveInt 等） |

## 并发控制

订单创建使用 SQLite 事务 + 原子库存扣减防止超卖：

```sql
UPDATE items
SET available_quantity = available_quantity - ?
WHERE id = ? AND available_quantity >= ? AND status = 'listed';
```

若 `affected rows` 为 0，则回滚事务并返回 `409 Conflict`。

## 测试

```bash
npm run test --workspace backend
```

测试文件位于 `test/` 目录，使用 Node.js 内置 `node:test` 运行器。
