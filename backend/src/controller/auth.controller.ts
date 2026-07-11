import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  httpError,
} from "@midwayjs/core";
import { Context } from "@midwayjs/koa";
import { AuthService } from "../service/auth.service";
import { AuthMiddleware, getAuthState } from "../middleware/auth.middleware";
import { ValidationError } from "../utils/validation";

function generateToken(user: {
  id: number;
  studentId: string;
  username: string;
  role: string;
}): string {
  const payload = {
    userId: user.id,
    studentId: user.studentId,
    username: user.username,
    role: user.role,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

@Controller("/api/auth")
export class AuthController {
  @Inject()
  authService: AuthService;

  @Inject()
  ctx: Context;

  @Post("/register")
  async register(@Body() body: unknown) {
    try {
      const { studentId, username, password } = (body ?? {}) as Record<
        string,
        unknown
      >;
      const user = this.authService.register({
        studentId: studentId as string,
        username: username as string,
        password: password as string,
      });
      const token = generateToken(user);
      this.ctx.status = 201;
      return {
        data: {
          token,
          user: {
            id: user.id,
            studentId: user.studentId,
            username: user.username,
            role: user.role,
          },
        },
      };
    } catch (err) {
      if (err instanceof ValidationError) {
        throw new httpError.BadRequestError(err.message);
      }
      if (err instanceof Error) {
        if (err.message.includes("已注册")) {
          throw new httpError.ConflictError(err.message);
        }
        throw new httpError.BadRequestError(err.message);
      }
      throw err;
    }
  }

  @Post("/login")
  async login(@Body() body: unknown) {
    try {
      const { studentId, password } = (body ?? {}) as Record<string, unknown>;
      const user = this.authService.login({
        studentId: studentId as string,
        password: password as string,
      });
      const token = generateToken(user);
      return {
        data: {
          token,
          user: {
            id: user.id,
            studentId: user.studentId,
            username: user.username,
            role: user.role,
          },
        },
      };
    } catch (err) {
      if (err instanceof ValidationError) {
        throw new httpError.BadRequestError(err.message);
      }
      if (err instanceof Error && err.message.includes("密码")) {
        throw new httpError.UnauthorizedError(err.message);
      }
      throw err;
    }
  }

  @Get("/me", { middleware: [AuthMiddleware] })
  async me() {
    const { userId } = getAuthState(this.ctx);
    const user = this.authService.findById(userId);
    if (!user) {
      throw new httpError.NotFoundError("用户不存在");
    }
    return {
      data: {
        id: user.id,
        studentId: user.studentId,
        username: user.username,
        role: user.role,
      },
    };
  }
}