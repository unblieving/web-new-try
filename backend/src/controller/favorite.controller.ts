import {
  Controller,
  Del,
  Get,
  Inject,
  Param,
  Post,
  httpError,
} from "@midwayjs/core";
import { Context } from "@midwayjs/koa";
import { FavoriteService } from "../service/favorite.service";
import { AuthMiddleware, getAuthState } from "../middleware/auth.middleware";

@Controller("/api/favorites", { middleware: [AuthMiddleware] })
export class FavoriteController {
  @Inject()
  favoriteService: FavoriteService;

  @Inject()
  ctx: Context;

  @Get("/")
  async list() {
    const { userId } = getAuthState(this.ctx);
    const favorites = this.favoriteService.findByUser(userId);
    return { data: favorites };
  }

  @Post("/:itemId")
  async add(@Param("itemId") itemId: string) {
    const { userId } = getAuthState(this.ctx);
    try {
      const favorite = this.favoriteService.add(userId, parseInt(itemId, 10));
      this.ctx.status = 201;
      return { data: favorite };
    } catch (err) {
      if (err instanceof Error && err.message.includes("不存在")) {
        throw new httpError.NotFoundError(err.message);
      }
      throw err;
    }
  }

  @Del("/:itemId")
  async remove(@Param("itemId") itemId: string) {
    const { userId } = getAuthState(this.ctx);
    const success = this.favoriteService.remove(userId, parseInt(itemId, 10));
    if (!success) {
      throw new httpError.NotFoundError("收藏记录不存在");
    }
    return { data: { success: true } };
  }

  @Get("/check/:itemId")
  async check(@Param("itemId") itemId: string) {
    const { userId } = getAuthState(this.ctx);
    const isFavorited = this.favoriteService.isFavorited(
      userId,
      parseInt(itemId, 10),
    );
    return { data: { isFavorited } };
  }
}
