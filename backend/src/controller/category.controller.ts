import {
  Body,
  Controller,
  Del,
  Get,
  Inject,
  Param,
  Post,
  Put,
  httpError,
} from "@midwayjs/core";
import { Context } from "@midwayjs/koa";
import { CategoryService } from "../service/category.service";
import { AuthMiddleware, requireAdmin } from "../middleware/auth.middleware";

@Controller("/api/categories")
export class CategoryController {
  @Inject()
  categoryService: CategoryService;

  @Inject()
  ctx: Context;

  @Get("/")
  async list() {
    const categories = this.categoryService.listTree();
    return { data: categories };
  }

  @Get("/flat")
  async listFlat() {
    const categories = this.categoryService.listFlat();
    return { data: categories };
  }

  @Get("/:id")
  async detail(@Param("id") id: string) {
    const category = this.categoryService.findById(parseInt(id, 10));
    if (!category) {
      throw new httpError.NotFoundError("分类不存在");
    }
    return { data: category };
  }
}

@Controller("/api/admin/categories", { middleware: [AuthMiddleware] })
export class AdminCategoryController {
  @Inject()
  categoryService: CategoryService;

  @Inject()
  ctx: Context;

  @Post("/")
  async create(@Body() body: unknown) {
    if (!requireAdmin(this.ctx)) {
      throw new httpError.ForbiddenError("需要管理员权限");
    }
    const input = (body ?? {}) as Record<string, unknown>;
    const name = input.name as string;
    if (!name || name.trim().length === 0) {
      throw new httpError.BadRequestError("分类名称不能为空");
    }
    const parentId = (input.parentId as number) ?? null;
    const sortOrder = (input.sortOrder as number) ?? 0;
    const category = this.categoryService.create(name.trim(), parentId, sortOrder);
    this.ctx.status = 201;
    return { data: category };
  }

  @Put("/:id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    if (!requireAdmin(this.ctx)) {
      throw new httpError.ForbiddenError("需要管理员权限");
    }
    const input = (body ?? {}) as Record<string, unknown>;
    const name = input.name as string;
    if (!name || name.trim().length === 0) {
      throw new httpError.BadRequestError("分类名称不能为空");
    }
    const sortOrder = (input.sortOrder as number) ?? 0;
    const category = this.categoryService.update(
      parseInt(id, 10),
      name.trim(),
      sortOrder
    );
    if (!category) {
      throw new httpError.NotFoundError("分类不存在");
    }
    return { data: category };
  }

  @Del("/:id")
  async remove(@Param("id") id: string) {
    if (!requireAdmin(this.ctx)) {
      throw new httpError.ForbiddenError("需要管理员权限");
    }
    try {
      const success = this.categoryService.delete(parseInt(id, 10));
      if (!success) {
        throw new httpError.NotFoundError("分类不存在");
      }
      return { data: { success: true } };
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("子分类") || err.message.includes("商品"))
      ) {
        throw new httpError.BadRequestError(err.message);
      }
      throw err;
    }
  }
}