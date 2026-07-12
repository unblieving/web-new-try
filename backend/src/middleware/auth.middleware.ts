import { IMiddleware, Middleware } from "@midwayjs/core";
import { Context, NextFunction } from "@midwayjs/koa";

export interface AuthState {
  userId: number;
  studentId: string;
  username: string;
  role: "user" | "admin";
}

const AUTH_STATE_KEY = Symbol("authState");

export function getAuthState(ctx: Context): AuthState {
  const state = (ctx as any)[AUTH_STATE_KEY];
  if (!state) {
    throw new Error("未获取到认证信息");
  }
  return state as AuthState;
}

export function setAuthState(ctx: Context, state: AuthState): void {
  (ctx as any)[AUTH_STATE_KEY] = state;
}

export function requireAdmin(ctx: Context): boolean {
  try {
    const state = getAuthState(ctx);
    return state.role === "admin";
  } catch {
    return false;
  }
}

@Middleware()
export class AuthMiddleware implements IMiddleware<Context, NextFunction> {
  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      const authHeader = ctx.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        ctx.status = 401;
        ctx.body = { error: "未登录或登录已过期" };
        return;
      }

      const token = authHeader.slice(7);
      try {
        // Token format: base64(JSON({userId, studentId, username, role}))
        const decoded = Buffer.from(token, "base64").toString("utf-8");
        const payload = JSON.parse(decoded) as AuthState;

        if (!payload.userId || !payload.studentId) {
          throw new Error("无效的 token");
        }

        setAuthState(ctx, payload);
        await next();
      } catch {
        ctx.status = 401;
        ctx.body = { error: "登录已过期，请重新登录" };
      }
    };
  }

  static getName(): string {
    return "auth";
  }
}
