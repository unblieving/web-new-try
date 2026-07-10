# Web 开发课程项目

这是一个用于 Web 全栈开发课程的 npm workspaces 单仓库。项目以一个最小的课程目录应用为例，串起 Next.js、Tailwind CSS、Midway.js、SQLite、OpenAPI、自动化测试和容器化部署。

## 技术栈

- 前端：Next.js 16、React 19、TypeScript、Tailwind CSS 4
- 后端：Midway.js 4、Koa、TypeScript
- 数据库：Node.js 内置 SQLite
- 工程化：npm workspaces、Prettier、ESLint、GitHub Actions、Docker Compose

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

前端通过同源 `/api/*` 路径代理后端，因此浏览器端不需要额外配置 CORS。

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
```

## 目录说明

```text
.
├── frontend/          # Next.js 用户界面
├── backend/           # Midway.js API 与 SQLite 数据访问
├── specs/             # 需求与验收标准
├── contracts/         # OpenAPI 等跨端契约
├── docs/              # 架构及课程资料
├── scripts/           # 本地开发脚本
├── infra/             # Docker 等部署配置
├── .github/           # CI 工作流
└── .cursor/           # 编辑器项目规则
```

建议从 [课程指南](docs/course-guide.md) 开始，再阅读 [系统架构](docs/architecture.md)、[模板结构审查](docs/architecture-review.md) 和第一个 [功能规格](specs/001-course-catalog.md)。开始功能开发前先阅读 [Spec 编写规范](specs/README.md)；涉及 HTTP 时同时阅读 [Contract 编写规范](contracts/README.md)。

## 环境变量

默认值足以完成本地开发。需要覆盖时，将 `.env.example` 复制为 `.env` 并在启动命令所在的终端加载它：

```bash
set -a && source .env && set +a
npm run dev
```

不要提交 `.env`、数据库文件或密钥。
