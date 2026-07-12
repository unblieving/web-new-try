import { MidwayConfig } from "@midwayjs/core";

export default {
  keys: "campus-marketplace-development-key",
  koa: {
    port: Number(process.env.BACKEND_PORT ?? 7001),
  },
  database: {
    path: process.env.DATABASE_PATH ?? "./data/campus-marketplace.sqlite",
  },
} as MidwayConfig;
