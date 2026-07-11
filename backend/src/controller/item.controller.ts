import {
  Body,
  Controller,
  Del,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  httpError,
} from "@midwayjs/core";
import { Context } from "@midwayjs/koa";
import { ItemService } from "../service/item.service";
import { AuthMiddleware, getAuthState, requireAdmin } from "../middleware/auth.middleware";
import { ValidationError } from "../utils/validation";

@Controller("/api/items")
export class ItemController {
  @Inject()
  itemService: ItemService;

  @Inject()
  ctx: Context;

  @Get("/")
  async list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("categoryId") categoryId?: string,
    @Query("keyword") keyword?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: string
  ) {
    const result = this.itemService.list({
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      keyword: keyword || undefined,
      sortBy: sortBy === "price" ? "price" : "created_at",
      sortOrder: sortOrder === "asc" ? "asc" : "desc",
    });
    return { data: result };
  }

  @Get("/:id")
  async detail(@Param("id") id: string) {
    const item = this.itemService.findById(parseInt(id, 10));
    if (!item) {
      throw new httpError.NotFoundError("商品不存在");
    }
    return { data: item };
  }

  @Post("/", { middleware: [AuthMiddleware] })
  async create(@Body() body: unknown) {
    const { userId } = getAuthState(this.ctx);
    try {
      const input = (body ?? {}) as Record<string, unknown>;
      const item = this.itemService.create(userId, {
        categoryId: input.categoryId as number,
        title: input.title as string,
        description: input.description as string | undefined,
        price: input.price as number,
        quantity: input.quantity as number | undefined,
        images: input.images as string[] | undefined,
      });
      this.ctx.status = 201;
      return { data: item };
    } catch (err) {
      if (err instanceof ValidationError) {
        throw new httpError.BadRequestError(err.message);
      }
      throw err;
    }
  }

  @Put("/:id", { middleware: [AuthMiddleware] })
  async update(@Param("id") id: string, @Body() body: unknown) {
    const { userId } = getAuthState(this.ctx);
    try {
      const input = (body ?? {}) as Record<string, unknown>;
      const item = this.itemService.update(userId, parseInt(id, 10), {
        categoryId: input.categoryId as number | undefined,
        title: input.title as string | undefined,
        description: input.description as string | undefined,
        price: input.price as number | undefined,
        quantity: input.quantity as number | undefined,
        images: input.images as string[] | undefined,
      });
      if (!item) {
        throw new httpError.NotFoundError("商品不存在");
      }
      return { data: item };
    } catch (err) {
      if (err instanceof ValidationError) {
        throw new httpError.BadRequestError(err.message);
      }
      if (err instanceof Error && err.message.includes("无权")) {
        throw new httpError.ForbiddenError(err.message);
      }
      if (err instanceof Error && err.message.includes("不允许修改")) {
        throw new httpError.BadRequestError(err.message);
      }
      throw err;
    }
  }

  @Del("/:id", { middleware: [AuthMiddleware] })
  async remove(@Param("id") id: string) {
    const { userId } = getAuthState(this.ctx);
    try {
      const success = this.itemService.remove(userId, parseInt(id, 10));
      if (!success) {
        throw new httpError.NotFoundError("商品不存在");
      }
      return { data: { success: true } };
    } catch (err) {
      if (err instanceof Error && err.message.includes("无权")) {
        throw new httpError.ForbiddenError(err.message);
      }
      throw err;
    }
  }

  @Get("/my/listings", { middleware: [AuthMiddleware] })
  async myListings(@Query("status") status?: string) {
    const { userId } = getAuthState(this.ctx);
    const items = this.itemService.listBySeller(userId, status);
    return { data: items };
  }
}

@Controller("/api/admin/items")
export class AdminItemController {
  @Inject()
  itemService: ItemService;

  @Inject()
  ctx: Context;

  @Get("/pending", { middleware: [AuthMiddleware] })
  async pendingReview() {
    if (!requireAdmin(this.ctx)) {
      throw new httpError.ForbiddenError("需要管理员权限");
    }
    const items = this.itemService.listPendingReview();
    return { data: items };
  }

  @Get("/", { middleware: [AuthMiddleware] })
  async listAll(@Query("status") status?: string) {
    if (!requireAdmin(this.ctx)) {
      throw new httpError.ForbiddenError("需要管理员权限");
    }
    const items = this.itemService.listAllForAdmin(status);
    return { data: items };
  }

  @Post("/:id/approve", { middleware: [AuthMiddleware] })
  async approve(@Param("id") id: string) {
    if (!requireAdmin(this.ctx)) {
      throw new httpError.ForbiddenError("需要管理员权限");
    }
    try {
      const item = this.itemService.approve(parseInt(id, 10));
      if (!item) {
        throw new httpError.NotFoundError("商品不存在");
      }
      return { data: item };
    } catch (err) {
      if (err instanceof Error && err.message.includes("只能审核")) {
        throw new httpError.BadRequestError(err.message);
      }
      throw err;
    }
  }

  @Post("/:id/reject", { middleware: [AuthMiddleware] })
  async reject(@Param("id") id: string, @Body() body: unknown) {
    if (!requireAdmin(this.ctx)) {
      throw new httpError.ForbiddenError("需要管理员权限");
    }
    const { reason } = (body ?? {}) as Record<string, unknown>;
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      throw new httpError.BadRequestError("拒绝原因不能为空");
    }
    try {
      const item = this.itemService.reject(parseInt(id, 10), reason.trim());
      if (!item) {
        throw new httpError.NotFoundError("商品不存在");
      }
      return { data: item };
    } catch (err) {
      if (err instanceof Error && err.message.includes("只能审核")) {
        throw new httpError.BadRequestError(err.message);
      }
      throw err;
    }
  }

  @Del("/:id", { middleware: [AuthMiddleware] })
  async remove(@Param("id") id: string) {
    if (!requireAdmin(this.ctx)) {
      throw new httpError.ForbiddenError("需要管理员权限");
    }
    const success = this.itemService.adminRemove(parseInt(id, 10));
    if (!success) {
      throw new httpError.NotFoundError("商品不存在");
    }
    return { data: { success: true } };
  }
}