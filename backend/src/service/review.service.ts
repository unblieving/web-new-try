import { Inject, Provide } from "@midwayjs/core";
import { DatabaseService } from "./database.service";
import { OrderService } from "./order.service";
import { ItemService } from "./item.service";
import { Review, CreateReviewInput, PaginatedResult } from "../interface";

type ReviewRow = {
  id: number;
  order_id: number;
  item_id: number;
  buyer_id: number;
  rating: number;
  content: string;
  created_at: string;
};

@Provide()
export class ReviewService {
  @Inject()
  databaseService: DatabaseService;

  @Inject()
  orderService: OrderService;

  @Inject()
  itemService: ItemService;

  private get db() {
    return this.databaseService.getDatabase();
  }

  /**
   * Create a review for a completed order.
   * Only the buyer can review, and only after the order is completed.
   * Each order can only have one review.
   */
  createReview(buyerId: number, orderId: number, input: CreateReviewInput): Review {
    // Validate rating
    const rating = Math.floor(input.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error("评分必须是1-5之间的整数");
    }

    // Validate content
    const content = (input.content ?? "").trim();
    if (content.length === 0) {
      throw new Error("评价内容不能为空");
    }
    if (content.length > 500) {
      throw new Error("评价内容不能超过500字");
    }

    // Check order exists and belongs to buyer
    const order = this.orderService.findById(orderId);
    if (!order) {
      throw new Error("订单不存在");
    }
    if (order.buyerId !== buyerId) {
      throw new Error("无权评价他人订单");
    }
    if (order.status !== "completed") {
      throw new Error("只有已完成的订单可以评价");
    }

    // Check not already reviewed
    const existing = this.db
      .prepare("SELECT id FROM reviews WHERE order_id = ?")
      .get(orderId) as { id: number } | undefined;
    if (existing) {
      throw new Error("该订单已评价过");
    }

    const result = this.db
      .prepare(
        `INSERT INTO reviews (order_id, item_id, buyer_id, rating, content)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(orderId, order.itemId, buyerId, rating, content);

    return this.findById(Number(result.lastInsertRowid))!;
  }

  /**
   * Delete a review — only the review author can delete.
   */
  deleteReview(reviewId: number, userId: number): void {
    const review = this.findById(reviewId);
    if (!review) {
      throw new Error("评价不存在");
    }
    if (review.buyerId !== userId) {
      throw new Error("无权删除他人评价");
    }
    this.db.prepare("DELETE FROM reviews WHERE id = ?").run(reviewId);
  }

  /**
   * List reviews for an item with pagination.
   */
  findByItem(
    itemId: number,
    page: number,
    pageSize: number,
  ): PaginatedResult<Review> {
    // Check item exists
    const item = this.itemService.findById(itemId);
    if (!item) {
      throw new Error("商品不存在");
    }

    const offset = (page - 1) * pageSize;
    const total = (
      this.db
        .prepare("SELECT COUNT(*) AS total FROM reviews WHERE item_id = ?")
        .get(itemId) as { total: number }
    ).total;

    const rows = this.db
      .prepare(
        `SELECT * FROM reviews WHERE item_id = ?
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .all(itemId, pageSize, offset) as ReviewRow[];

    return {
      data: rows.map((r) => this.mapReviewWithBuyer(r)),
      total,
      page,
      pageSize,
    };
  }

  findById(id: number): Review | null {
    const row = this.db
      .prepare("SELECT * FROM reviews WHERE id = ?")
      .get(id) as ReviewRow | undefined;
    return row ? this.mapReviewWithBuyer(row) : null;
  }

  private mapReviewWithBuyer(row: ReviewRow): Review {
    const buyer = this.db
      .prepare("SELECT id, username FROM users WHERE id = ?")
      .get(row.buyer_id) as { id: number; username: string } | undefined;

    return {
      id: row.id,
      orderId: row.order_id,
      itemId: row.item_id,
      buyerId: row.buyer_id,
      rating: row.rating,
      content: row.content,
      createdAt: row.created_at,
      buyer: buyer ? { id: buyer.id, username: buyer.username } : undefined,
    };
  }
}