# Frontend

Next.js App Router 前端。它通过 `next.config.ts` 把 `/api/*` 请求转发到 Midway 后端。

```bash
npm run dev --workspace frontend
```

主要入口：

- `src/app/page.tsx`：首页服务端组件
- `src/components/course-dashboard.tsx`：客户端数据获取与状态展示
- `src/app/globals.css`：Tailwind CSS 入口和全局主题
