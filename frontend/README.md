# Frontend

Next.js App Router 前端，使用 React Server Components 和 Tailwind CSS 4 构建蓝色主题 UI。通过 `next.config.ts` 把 `/api/*` 请求转发到 Midway 后端。

```bash
npm run dev --workspace frontend
```

默认端口为 `3000`。

## 页面路由

| 路由                    | 文件                          | 说明                           |
| ----------------------- | ----------------------------- | ------------------------------ |
| `/`                     | `src/app/page.tsx`            | 首页：商品列表、搜索、分类筛选 |
| `/items/[id]`           | `src/app/items/[id]/page.tsx` | 商品详情：图片、卖家信息、购买 |
| `/login`                | `src/app/login/page.tsx`      | 登录页                         |
| `/register`             | `src/app/register/page.tsx`   | 注册页                         |
| `/publish`              | `src/app/publish/page.tsx`    | 发布商品（需登录）             |
| `/my-items`             | `src/app/my-items/page.tsx`   | 我的发布（需登录）             |
| `/my-orders`            | `src/app/my-orders/page.tsx`  | 我的订单：买入/卖出 Tab 切换   |
| `/favorites`            | `src/app/favorites/page.tsx`  | 我的收藏（需登录）             |
| `/admin`                | `src/app/admin/page.tsx`      | 后台管理：商品审核、分类管理   |

## 核心文件

| 文件                          | 说明                                     |
| ----------------------------- | ---------------------------------------- |
| `src/app/layout.tsx`          | 全局布局，引入导航栏和认证 Provider      |
| `src/app/globals.css`         | Tailwind CSS 入口，蓝色主题变量和动画    |
| `src/components/navbar.tsx`   | 响应式导航栏（渐变 Logo、用户菜单）      |
| `src/lib/api.ts`              | API 调用封装（fetch wrapper）            |
| `src/lib/auth-context.tsx`    | 认证上下文（React Context + Provider）   |
| `src/lib/types.ts`            | TypeScript 类型定义（与 OpenAPI 对齐）   |

## 设计特点

- **蓝色主题**：渐变背景、蓝色按钮、圆角卡片
- **响应式布局**：移动端适配，导航栏折叠菜单
- **四态覆盖**：每个数据页面均处理加载、成功、空结果、错误状态
- **语义化 HTML**：保留键盘访问和可见焦点样式

## 构建与检查

```bash
npm run build --workspace frontend   # 生产构建
npm run lint --workspace frontend    # ESLint 检查