import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  httpError,
} from "@midwayjs/core";
import { Context } from "@midwayjs/koa";
import { OrderService } from "../service/order.service";
import { AuthMiddleware, getAuthState } from "../middleware/auth.middleware";

@Controller("/api/orders", { middleware: [AuthMiddleware] })
export class OrderController {
  @Inject()
  orderService: OrderService;

  @Inject()
  ctx: Context;

  @Post("/")
  async create(@Body() body: unknown) {
    const { userId } = getAuthState(this.ctx);
    try {
      const input = (body ?? {}) as Record<string, unknown>;
      const order = this.orderService.createOrder(userId, {
        itemId: input.itemId as number,
        quantity: input.quantity as number | undefined,
      });
      this.ctx.status = 201;
      return { data: order };
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes("不存在") || msg.includes("已被他人购买")) {
          throw new httpError.BadRequestError(msg);
        }
        if (msg.includes("不能购买自己")) {
          throw new httpError.ForbiddenError(msg);
        }
        if (
          msg.includes("库存不足") ||
          msg.includes("不可购买") ||
          msg.includes("无法购买")
        ) {
          throw new httpError.ConflictError(msg);
        }
        throw new httpError.BadRequestError(msg);
      }
      throw err;
    }
  }

  @Get("/")
  async myOrders(@Query("status") status?: string) {
    const { userId } = getAuthState(this.ctx);
    const orders = this.orderService.findByBuyer(userId, status);
    return { data: orders };
  }

  @Get("/sold")
  async soldOrders() {
    const { userId } = getAuthState(this.ctx);
    const orders = this.orderService.findBySeller(userId);
    return { data: orders };
  }

  @Get("/:id")
  async detail(@Param("id") id: string) {
    const { userId } = getAuthState(this.ctx);
    const order = this.orderService.findById(parseInt(id, 10));
    if (!order) {
      throw new httpError.NotFoundError("订单不存在");
    }
    if (order.buyerId !== userId) {
      // Check if user is the seller
      const item = order.item;
      if (!item || item.sellerId !== userId) {
        throw new httpError.ForbiddenError("无权查看此订单");
      }
    }
    return { data: order };
  }

  @Post("/:id/pay")
  async pay(@Param("id") id: string) {
    const { userId } = getAuthState(this.ctx);
    try {
      const order = this.orderService.simulatePayment(parseInt(id, 10), userId);
      return { data: order };
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("不存在")) {
          throw new httpError.NotFoundError(err.message);
        }
        if (err.message.includes("无权")) {
          throw new httpError.ForbiddenError(err.message);
        }
        throw new httpError.BadRequestError(err.message);
      }
      throw err;
    }
  }

  @Post("/:id/ship")
  async ship(@Param("id") id: string) {
    const { userId } = getAuthState(this.ctx);
    try {
      const order = this.orderService.sellerConfirm(parseInt(id, 10), userId);
      return { data: order };
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("不存在")) {
          throw new httpError.NotFoundError(err.message);
        }
        if (err.message.includes("无权")) {
          throw new httpError.ForbiddenError(err.message);
        }
        throw new httpError.BadRequestError(err.message);
      }
      throw err;
    }
  }

  @Post("/:id/confirm")
  async confirm(@Param("id") id: string) {
    const { userId } = getAuthState(this.ctx);
    try {
      const order = this.orderService.confirmReceipt(parseInt(id, 10), userId);
      return { data: order };
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("不存在")) {
          throw new httpError.NotFoundError(err.message);
        }
        if (err.message.includes("无权")) {
          throw new httpError.ForbiddenError(err.message);
        }
        throw new httpError.BadRequestError(err.message);
      }
      throw err;
    }
  }

  @Post("/:id/cancel")
  async cancel(@Param("id") id: string) {
    const { userId } = getAuthState(this.ctx);
    try {
      const order = this.orderService.cancelOrder(parseInt(id, 10), userId);
      return { data: order };
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("不存在")) {
          throw new httpError.NotFoundError(err.message);
        }
        if (err.message.includes("无权")) {
          throw new httpError.ForbiddenError(err.message);
        }
        throw new httpError.BadRequestError(err.message);
      }
      throw err;
    }
  }
}
