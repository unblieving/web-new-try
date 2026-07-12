import { Inject, Provide } from "@midwayjs/core";
import { DatabaseService } from "./database.service";
import {
  Item,
  CreateItemInput,
  UpdateItemInput,
  ItemListQuery,
  PaginatedResult,
} from "../interface";
import {
  requireString,
  optionalString,
  requirePositiveInt,
  requirePositiveNumber,
} from "../utils/validation";

type ItemRow = {
  id: number;
  seller_id: number;
  category_id: number;
  title: string;
  description: string | null;
  price: number;
  quantity: number;
  available_quantity: number;
  status: string;
  reject_reason: string | null;
  images: string | null;
  created_at: string;
  updated_at: string;
};

@Provide()
export class ItemService {
  @Inject()
  databaseService: DatabaseService;

  private get db() {
    return this.databaseService.getDatabase();
  }

  list(query: ItemListQuery): PaginatedResult<Item> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Only show listed items to regular users
    conditions.push("i.status = ?");
    params.push("listed");

    if (query.categoryId) {
      conditions.push("i.category_id = ?");
      params.push(query.categoryId);
    }

    if (query.keyword) {
      conditions.push("(i.title LIKE ? OR i.description LIKE ?)");
      const kw = `%${query.keyword}%`;
      params.push(kw, kw);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sortBy = query.sortBy === "price" ? "i.price" : "i.created_at";
    const sortOrder = query.sortOrder === "asc" ? "ASC" : "DESC";

    const total = (
      this.db
        .prepare(`SELECT COUNT(*) AS total FROM items i ${whereClause}`)
        .get(...params) as { total: number }
    ).total;

    const rows = this.db
      .prepare(
        `SELECT i.* FROM items i ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
      )
      .all(...params, pageSize, offset) as ItemRow[];

    return {
      data: rows.map((r) => this.mapItemWithDetails(r)),
      total,
      page,
      pageSize,
    };
  }

  listBySeller(sellerId: number, status?: string): Item[] {
    let sql = "SELECT * FROM items WHERE seller_id = ?";
    const params: (string | number)[] = [sellerId];
    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }
    sql += " ORDER BY created_at DESC";
    const rows = this.db.prepare(sql).all(...params) as ItemRow[];
    return rows.map((r) => this.mapItemWithDetails(r));
  }

  listPendingReview(): Item[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM items WHERE status = 'pending_review' ORDER BY created_at ASC",
      )
      .all() as ItemRow[];
    return rows.map((r) => this.mapItemWithDetails(r));
  }

  listAllForAdmin(status?: string): Item[] {
    let sql = "SELECT * FROM items";
    const params: (string | number)[] = [];
    if (status) {
      sql += " WHERE status = ?";
      params.push(status);
    }
    sql += " ORDER BY created_at DESC";
    const rows = this.db.prepare(sql).all(...params) as ItemRow[];
    return rows.map((r) => this.mapItemWithDetails(r));
  }

  findById(id: number): Item | null {
    const row = this.db.prepare("SELECT * FROM items WHERE id = ?").get(id) as
      ItemRow | undefined;
    return row ? this.mapItemWithDetails(row) : null;
  }

  create(sellerId: number, input: CreateItemInput): Item {
    const title = requireString(input.title, "商品标题", 1, 100);
    const description = optionalString(input.description, "商品描述", 2000);
    const price = requirePositiveNumber(input.price, "价格");
    const quantity =
      input.quantity !== undefined
        ? requirePositiveInt(input.quantity, "数量")
        : 1;
    const categoryId = requirePositiveInt(input.categoryId, "分类");
    const images = input.images ?? [];

    const result = this.db
      .prepare(
        `INSERT INTO items (seller_id, category_id, title, description, price, quantity, available_quantity, images)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        sellerId,
        categoryId,
        title,
        description,
        price,
        quantity,
        quantity,
        JSON.stringify(images),
      );

    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(
    sellerId: number,
    itemId: number,
    input: UpdateItemInput,
  ): Item | null {
    const existing = this.findById(itemId);
    if (!existing) return null;
    if (existing.sellerId !== sellerId) {
      throw new Error("无权修改他人商品");
    }
    if (existing.status === "sold" || existing.status === "removed") {
      throw new Error("该商品状态不允许修改");
    }

    const title =
      input.title !== undefined
        ? requireString(input.title, "商品标题", 1, 100)
        : existing.title;
    const description =
      input.description !== undefined
        ? optionalString(input.description, "商品描述", 2000)
        : existing.description;
    const price =
      input.price !== undefined
        ? requirePositiveNumber(input.price, "价格")
        : existing.price;
    const quantity =
      input.quantity !== undefined
        ? requirePositiveInt(input.quantity, "数量")
        : existing.quantity;
    const categoryId =
      input.categoryId !== undefined
        ? requirePositiveInt(input.categoryId, "分类")
        : existing.categoryId;
    const images = input.images ?? existing.images;

    // If quantity increased, also increase available_quantity
    const quantityDiff = quantity - existing.quantity;
    const availableQuantity = Math.max(
      0,
      existing.availableQuantity + quantityDiff,
    );

    this.db
      .prepare(
        `UPDATE items SET title = ?, description = ?, price = ?, quantity = ?,
         available_quantity = ?, category_id = ?, images = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        title,
        description,
        price,
        quantity,
        availableQuantity,
        categoryId,
        JSON.stringify(images),
        itemId,
      );

    return this.findById(itemId);
  }

  remove(sellerId: number, itemId: number): boolean {
    const existing = this.findById(itemId);
    if (!existing) return false;
    if (existing.sellerId !== sellerId) {
      throw new Error("无权删除他人商品");
    }
    this.db
      .prepare(
        "UPDATE items SET status = 'removed', updated_at = datetime('now') WHERE id = ?",
      )
      .run(itemId);
    return true;
  }

  // Admin operations
  approve(itemId: number): Item | null {
    const existing = this.findById(itemId);
    if (!existing) return null;
    if (existing.status !== "pending_review") {
      throw new Error("只能审核待审核状态的商品");
    }
    this.db
      .prepare(
        "UPDATE items SET status = 'listed', updated_at = datetime('now') WHERE id = ?",
      )
      .run(itemId);
    return this.findById(itemId);
  }

  reject(itemId: number, reason: string): Item | null {
    const existing = this.findById(itemId);
    if (!existing) return null;
    if (existing.status !== "pending_review") {
      throw new Error("只能审核待审核状态的商品");
    }
    this.db
      .prepare(
        "UPDATE items SET status = 'rejected', reject_reason = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .run(reason, itemId);
    return this.findById(itemId);
  }

  adminRemove(itemId: number): boolean {
    const result = this.db
      .prepare(
        "UPDATE items SET status = 'removed', updated_at = datetime('now') WHERE id = ?",
      )
      .run(itemId);
    return result.changes > 0;
  }

  // Concurrency-safe: try to reserve stock
  tryReserveStock(
    itemId: number,
    quantity: number,
  ): { success: boolean; message?: string } {
    // Use a transaction with IMMEDIATE to acquire write lock
    const stmt = this.db.prepare(
      `UPDATE items SET available_quantity = available_quantity - ?, status = CASE WHEN available_quantity - ? = 0 AND quantity = 1 THEN 'reserved' ELSE status END, updated_at = datetime('now')
       WHERE id = ? AND available_quantity >= ? AND status IN ('listed', 'reserved')`,
    );
    const result = stmt.run(quantity, quantity, itemId, quantity);
    if (result.changes === 0) {
      return { success: false, message: "库存不足或商品已下架" };
    }
    return { success: true };
  }

  releaseStock(itemId: number, quantity: number): void {
    this.db
      .prepare(
        `UPDATE items SET available_quantity = available_quantity + ?, status = 'listed', updated_at = datetime('now') WHERE id = ?`,
      )
      .run(quantity, itemId);
  }

  markSold(itemId: number): void {
    this.db
      .prepare(
        "UPDATE items SET status = 'sold', updated_at = datetime('now') WHERE id = ?",
      )
      .run(itemId);
  }

  private mapItemWithDetails(row: ItemRow): Item {
    const images = row.images ? JSON.parse(row.images) : [];

    const seller = this.db
      .prepare("SELECT id, username, student_id FROM users WHERE id = ?")
      .get(row.seller_id) as
      { id: number; username: string; student_id: string } | undefined;

    const category = this.db
      .prepare("SELECT id, name FROM categories WHERE id = ?")
      .get(row.category_id) as { id: number; name: string } | undefined;

    return {
      id: row.id,
      sellerId: row.seller_id,
      categoryId: row.category_id,
      title: row.title,
      description: row.description,
      price: row.price,
      quantity: row.quantity,
      availableQuantity: row.available_quantity,
      status: row.status as Item["status"],
      rejectReason: row.reject_reason,
      images,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      seller: seller
        ? {
            id: seller.id,
            username: seller.username,
            studentId: seller.student_id,
          }
        : undefined,
      category: category ? { id: category.id, name: category.name } : undefined,
    };
  }
}
