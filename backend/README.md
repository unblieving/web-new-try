# Backend

Midway.js + Koa API，使用 Node.js 24 内置的 `node:sqlite` 保存数据。

```bash
npm run dev --workspace backend
```

默认端口为 `7001`，数据库首次启动时会自动创建并写入三条课程示例数据。

主要入口：

- `src/configuration.ts`：Midway 应用配置
- `src/controller/api.controller.ts`：HTTP API
- `src/service/course.service.ts`：SQLite 数据访问
- `src/config/config.default.ts`：运行时配置
