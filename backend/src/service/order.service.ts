import { Inject, Provide } from "@midwayjs/core";
import { randomBytes } from "node:crypto";
import { DatabaseService } from "./database.service";
import { ItemService } from "./item.service";
import { Order, CreateOrderInput } from "../interface";
import { requirePositiveInt } from "../utils/validation";

type OrderRow = {
  id: number;
  order_no: string;
  buyer_id: number;
  item_id: number;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  updated_at: string;
};

@Provide()
export class OrderService {
  @Inject()
  databaseService: DatabaseService;

  @Inject()
  itemService: ItemService;

  private get db() {
    return this.databaseService.getDatabase();
  }

  createOrder(buyerId: number, input: CreateOrderInput): Order {
    const itemId = requirePositiveInt(input.itemId, "商品ID");
    const quantity = input.quantity !== undefined
      ? requirePositiveInt(input.quantity, "数量")
      : 1;

    // Check item exists
    const item = this.itemService.findById(itemId);
    if (!item) {
      throw new Error("商品不存在");
    }

    // Cannot buy own item
    if (item.sellerId === buyerId) {
      throw new Error("不能购买自己的商品");
    }

    // Check item is available for purchase
    if (item.status !== "listed" && item.status !== "reserved") {
      throw new Error("商品当前状态不可购买");
    }

    if (item.availableQuantity < quantity) {
      throw new Error("库存不足");
    }

    const totalPrice = item.price * quantity;
    const orderNo = generateOrderNo();

    // Use BEGIN IMMEDIATE to acquire write lock upfront,
    // preventing concurrent writes from interleaving.
    this.db.exec("BEGIN IMMEDIATE");
    try {
      // Re-check stock inside transaction (critical for concurrency safety)
      const currentRow = this.db
        .prepare("SELECT available_quantity, status FROM items WHERE id = ?")
        .get(itemId) as { available_quantity: number; status: string } | undefined;

      if (!currentRow || currentRow.available_quantity < quantity) {
        throw new Error("库存不足，商品可能已被他人购买");
      }

      if (currentRow.status !== "listed" && currentRow.status !== "reserved") {
        throw new Error("商品状态已变更，无法购买");
      }

      // Deduct stock
      const newAvailable = currentRow.available_quantity - quantity;
      const newStatus = newAvailable === 0 && item.quantity === quantity ? "reserved" : currentRow.status;

      this.db
        .prepare(
          "UPDATE items SET available_quantity = ?, status = ?, updated_at = datetime('now') WHERE id = ?"
        )
        .run(newAvailable, newStatus, itemId);

      // Create order
      const result = this.db
        .prepare(
          `INSERT INTO orders (order_no, buyer_id, item_id, quantity, total_price)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(orderNo, buyerId, itemId, quantity, totalPrice);

      this.db.exec("COMMIT");
      return this.findById(Number(result.lastInsertRowid))!;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  simulatePayment(orderId: number, buyerId: number): Order {
    const order = this.findById(orderId);
    if (!order) {
      throw new Error("订单不存在");
    }
    if (order.buyerId !== buyerId) {
      throw new Error("无权操作他人订单");
    }
    if (order.status !== "pending_payment") {
      throw new Error("订单状态不允许支付");
    }

    this.db
      .prepare(
        "UPDATE orders SET status = 'paid', updated_at = datetime('now') WHERE id = ?"
      )
      .run(orderId);

    return this.findById(orderId)!;
  }

  confirmReceipt(orderId: number, buyerId: number): Order {
    const order = this.findById(orderId);
    if (!order) {
      throw new Error("订单不存在");
    }
    if (order.buyerId !== buyerId) {
      throw new Error("无权操作他人订单");
    }
    if (order.status !== "paid") {
      throw new Error("订单状态不允许确认收货");
    }

    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare(
          "UPDATE orders SET status = 'completed', updated_at = datetime('now') WHERE id = ?"
        )
        .run(orderId);

      // Check if all stock is sold
      const item = this.itemService.findById(order.itemId);
      if (item && item.availableQuantity === 0) {
        this.itemService.markSold(order.itemId);
      }

      this.db.exec("COMMIT");
      return this.findById(orderId)!;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  cancelOrder(orderId: number, buyerId: number): Order {
    const order = this.findById(orderId);
    if (!order) {
      throw new Error("订单不存在");
    }
    if (order.buyerId !== buyerId) {
      throw new Error("无权操作他人订单");
    }
    if (order.status !== "pending_payment") {
      throw new Error("只能取消待支付订单");
    }

    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare(
          "UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?"
        )
        .run(orderId);

      // Release stock
      this.itemService.releaseStock(order.itemId, order.quantity);

      this.db.exec("COMMIT");
      return this.findById(orderId)!;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  findByBuyer(buyerId: number, status?: string): Order[] {
    let sql = "SELECT * FROM orders WHERE buyer_id = ?";
    const params: (string | number)[] = [buyerId];
    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }
    sql += " ORDER BY created_at DESC";
    const rows = this.db.prepare(sql).all(...params) as OrderRow[];
    return rows.map((r) => this.mapOrderWithDetails(r));
  }

  findBySeller(sellerId: number): Order[] {
    const rows = this.db
      .prepare(
        `SELECT o.* FROM orders o
         JOIN items i ON o.item_id = i.id
         WHERE i.seller_id = ?
         ORDER BY o.created_at DESC`
      )
      .all(sellerId) as OrderRow[];
    return rows.map((r) => this.mapOrderWithDetails(r));
  }

  findById(id: number): Order | null {
    const row = this.db
      .prepare("SELECT * FROM orders WHERE id = ?")
      .get(id) as OrderRow | undefined;
    return row ? this.mapOrderWithDetails(row) : null;
  }

  findByOrderNo(orderNo: string): Order | null {
    const row = this.db
      .prepare("SELECT * FROM orders WHERE order_no = ?")
      .get(orderNo) as OrderRow | undefined;
    return row ? this.mapOrderWithDetails(row) : null;
  }

  private mapOrderWithDetails(row: OrderRow): Order {
    const item = this.itemService.findById(row.item_id);
    return {
      id: row.id,
      orderNo: row.order_no,
      buyerId: row.buyer_id,
      itemId: row.item_id,
      quantity: row.quantity,
      totalPrice: row.total_price,
      status: row.status as Order["status"],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      item: item ?? undefined,
    };
  }
}

function generateOrderNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `CM${timestamp}${random}`;
}