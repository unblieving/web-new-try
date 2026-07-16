import {
  Body,
  Controller,
  Del,
  Get,
  Inject,
  Param,
  Post,
  Query,
  httpError,
} from "@midwayjs/core";
import { Context } from "@midwayjs/koa";
import { ReviewService } from "../service/review.service";
import { AuthMiddleware, getAuthState } from "../middleware/auth.middleware";

@Controller("/api", { middleware: [AuthMiddleware] })
export class ReviewController {
  @Inject()
  reviewService: ReviewService;

  @Inject()
  ctx: Context;

  /**
   * GET /api/items/:id/reviews — list reviews for an item (public).
   */
  @Get("/items/:id/reviews")
  async listByItem(
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const itemId = parseInt(id, 10);
    if (isNaN(itemId) || itemId <= 0) {
      throw new httpError.BadRequestError("无效的商品ID");
    }
    const p = Math.max(1, parseInt(page ?? "1", 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize ?? "20", 10) || 20));
    try {
      return this.reviewService.findByItem(itemId, p, ps);
    } catch (err) {
      if (err instanceof Error && err.message.includes("不存在")) {
        throw new httpError.NotFoundError(err.message);
      }
      throw err;
    }
  }

  /**
   * POST /api/orders/:id/review — create a review for a completed order.
   */
  @Post("/orders/:id/review")
  async create(@Param("id") id: string, @Body() body: unknown) {
    const { userId } = getAuthState(this.ctx);
    const orderId = parseInt(id, 10);
    if (isNaN(orderId) || orderId <= 0) {
      throw new httpError.BadRequestError("无效的订单ID");
    }
    const input = (body ?? {}) as Record<string, unknown>;
    try {
      const review = this.reviewService.createReview(userId, orderId, {
        rating: input.rating as number,
        content: input.content as string,
      });
      this.ctx.status = 201;
      return { data: review };
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes("不存在")) {
          throw new httpError.NotFoundError(msg);
        }
        if (msg.includes("无权")) {
          throw new httpError.ForbiddenError(msg);
        }
        if (msg.includes("已评价")) {
          throw new httpError.ConflictError(msg);
        }
        if (msg.includes("已完成") || msg.includes("评分") || msg.includes("内容")) {
          throw new httpError.BadRequestError(msg);
        }
        throw new httpError.BadRequestError(msg);
      }
      throw err;
    }
  }

  /**
   * DELETE /api/reviews/:id — delete own review.
   */
  @Del("/reviews/:id")
  async delete(@Param("id") id: string) {
    const { userId } = getAuthState(this.ctx);
    const reviewId = parseInt(id, 10);
    if (isNaN(reviewId) || reviewId <= 0) {
      throw new httpError.BadRequestError("无效的评价ID");
    }
    try {
      this.reviewService.deleteReview(reviewId, userId);
      return { data: { success: true } };
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes("不存在")) {
          throw new httpError.NotFoundError(msg);
        }
        if (msg.includes("无权")) {
          throw new httpError.ForbiddenError(msg);
        }
        throw new httpError.BadRequestError(msg);
      }
      throw err;
    }
  }
}