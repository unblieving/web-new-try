/**
 * Item service tests — tests item CRUD and status management
 * using raw SQLite operations (no Midway framework dependency).
 */
import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";
import { createTestDb, type TestDb } from "./test-db.mts";

let tdb: TestDb;

beforeEach(() => {
  tdb = createTestDb();
  tdb.setup();
});

afterEach(() => {
  tdb.close();
});

// --- Helper functions replicating item service logic ---

function publishItem(
  sellerId: number,
  categoryId: number,
  title: string,
  description: string | null,
  price: number,
  stock: number,
): number {
  if (!title || title.trim().length === 0) throw new Error("Title is required");
  if (typeof price !== "number" || price <= 0)
    throw new Error("Price must be positive");
  if (!Number.isInteger(stock) || stock < 0)
    throw new Error("Stock must be a non-negative integer");

  const result = tdb.db
    .prepare(
      "INSERT INTO items (seller_id, category_id, title, description, price, stock, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
    )
    .run(sellerId, categoryId, title.trim(), description, price, stock);
  return Number(result.lastInsertRowid);
}

function updateItem(
  itemId: number,
  sellerId: number,
  updates: {
    title?: string;
    description?: string | null;
    price?: number;
    stock?: number;
    categoryId?: number;
  },
): void {
  const item = tdb.getItemById(itemId) as any;
  if (!item) throw new Error("Item not found");
  if (item.seller_id !== sellerId) throw new Error("Forbidden");
  if (!["pending", "approved", "rejected"].includes(item.status)) {
    throw new Error("Item cannot be edited in current status");
  }

  const title = updates.title ?? item.title;
  const description =
    updates.description !== undefined ? updates.description : item.description;
  const price = updates.price ?? item.price;
  const stock = updates.stock ?? item.stock;
  const categoryId = updates.categoryId ?? item.category_id;

  if (price !== undefined && price <= 0)
    throw new Error("Price must be positive");

  tdb.db
    .prepare(
      "UPDATE items SET title = ?, description = ?, price = ?, stock = ?, category_id = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(title, description, price, stock, categoryId, itemId);
}

function reviewItem(itemId: number, action: "approve" | "reject"): void {
  const item = tdb.getItemById(itemId) as any;
  if (!item) throw new Error("Item not found");
  if (item.status !== "pending")
    throw new Error("Only pending items can be reviewed");

  const newStatus = action === "approve" ? "approved" : "rejected";
  tdb.db
    .prepare(
      "UPDATE items SET status = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(newStatus, itemId);
}

function removeItem(itemId: number, sellerId: number): void {
  const item = tdb.getItemById(itemId) as any;
  if (!item) throw new Error("Item not found");
  if (item.seller_id !== sellerId) throw new Error("Forbidden");
  if (item.status === "removed") throw new Error("Item already removed");

  tdb.db
    .prepare(
      "UPDATE items SET status = 'removed', updated_at = datetime('now') WHERE id = ?",
    )
    .run(itemId);
}

function listItems(filters: {
  categoryId?: number;
  keyword?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): { items: any[]; total: number } {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.categoryId) {
    conditions.push("i.category_id = ?");
    params.push(filters.categoryId);
  }
  if (filters.keyword) {
    conditions.push("(i.title LIKE ? OR i.description LIKE ?)");
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
  }
  if (filters.status) {
    conditions.push("i.status = ?");
    params.push(filters.status);
  } else {
    conditions.push("i.status = 'approved'");
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const total = (
    tdb.db
      .prepare(`SELECT COUNT(*) as cnt FROM items i ${where}`)
      .get(...params) as any
  ).cnt;
  const items = tdb.db
    .prepare(
      `SELECT i.*, u.username as seller_name, c.name as category_name
     FROM items i
     JOIN users u ON i.seller_id = u.id
     JOIN categories c ON i.category_id = c.id
     ${where}
     ORDER BY i.created_at DESC
     LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset);

  return { items, total };
}

// --- Tests ---

test("publishItem creates a pending item", () => {
  const sellerId = tdb.createUser("seller1");
  const catId = tdb.createCategory("TestCat");
  const itemId = publishItem(
    sellerId,
    catId,
    "My Book",
    "A nice book",
    15.5,
    3,
  );

  const item = tdb.getItemById(itemId) as any;
  assert.equal(item.status, "pending");
  assert.equal(item.title, "My Book");
  assert.equal(item.price, 15.5);
  assert.equal(item.stock, 3);
});

test("publishItem rejects empty title", () => {
  const sellerId = tdb.createUser("seller2");
  const catId = tdb.createCategory("Cat2");
  assert.throws(
    () => publishItem(sellerId, catId, "", null, 10, 1),
    /Title is required/,
  );
});

test("publishItem rejects negative price", () => {
  const sellerId = tdb.createUser("seller3");
  const catId = tdb.createCategory("Cat3");
  assert.throws(
    () => publishItem(sellerId, catId, "Item", null, -5, 1),
    /Price must be positive/,
  );
});

test("updateItem updates fields correctly", () => {
  const sellerId = tdb.createUser("seller4");
  const catId = tdb.createCategory("Cat4");
  const itemId = publishItem(sellerId, catId, "Old Title", "desc", 10, 1);

  // Approve first so it can be edited
  reviewItem(itemId, "approve");

  updateItem(itemId, sellerId, { title: "New Title", price: 20 });
  const item = tdb.getItemById(itemId) as any;
  assert.equal(item.title, "New Title");
  assert.equal(item.price, 20);
});

test("updateItem rejects non-owner", () => {
  const sellerId = tdb.createUser("seller5");
  const otherId = tdb.createUser("other");
  const catId = tdb.createCategory("Cat5");
  const itemId = publishItem(sellerId, catId, "Item", null, 10, 1);

  assert.throws(
    () => updateItem(itemId, otherId, { title: "Hacked" }),
    /Forbidden/,
  );
});

test("reviewItem approves a pending item", () => {
  const sellerId = tdb.createUser("seller6");
  const catId = tdb.createCategory("Cat6");
  const itemId = publishItem(sellerId, catId, "Item", null, 10, 1);

  reviewItem(itemId, "approve");
  const item = tdb.getItemById(itemId) as any;
  assert.equal(item.status, "approved");
});

test("reviewItem rejects a pending item", () => {
  const sellerId = tdb.createUser("seller7");
  const catId = tdb.createCategory("Cat7");
  const itemId = publishItem(sellerId, catId, "Item", null, 10, 1);

  reviewItem(itemId, "reject");
  const item = tdb.getItemById(itemId) as any;
  assert.equal(item.status, "rejected");
});

test("reviewItem fails on non-pending item", () => {
  const sellerId = tdb.createUser("seller8");
  const catId = tdb.createCategory("Cat8");
  const itemId = publishItem(sellerId, catId, "Item", null, 10, 1);

  reviewItem(itemId, "approve");
  assert.throws(() => reviewItem(itemId, "approve"), /Only pending/);
});

test("removeItem soft-deletes the item", () => {
  const sellerId = tdb.createUser("seller9");
  const catId = tdb.createCategory("Cat9");
  const itemId = publishItem(sellerId, catId, "Item", null, 10, 1);

  removeItem(itemId, sellerId);
  const item = tdb.getItemById(itemId) as any;
  assert.equal(item.status, "removed");
});

test("removeItem rejects non-owner", () => {
  const sellerId = tdb.createUser("seller10");
  const otherId = tdb.createUser("other2");
  const catId = tdb.createCategory("Cat10");
  const itemId = publishItem(sellerId, catId, "Item", null, 10, 1);

  assert.throws(() => removeItem(itemId, otherId), /Forbidden/);
});

test("listItems returns only approved items by default", () => {
  const sellerId = tdb.createUser("seller11");
  const catId = tdb.createCategory("Cat11");
  const id1 = publishItem(sellerId, catId, "Approved Item", null, 10, 1);
  const id2 = publishItem(sellerId, catId, "Pending Item", null, 20, 1);
  reviewItem(id1, "approve");
  // id2 stays pending

  const result = listItems({});
  assert.equal(result.total, 1);
  assert.equal(result.items[0].title, "Approved Item");
});

test("listItems filters by keyword", () => {
  const sellerId = tdb.createUser("seller12");
  const catId = tdb.createCategory("Cat12");
  const id1 = publishItem(sellerId, catId, "Math Textbook", null, 30, 1);
  const id2 = publishItem(sellerId, catId, "Novel Book", null, 15, 1);
  reviewItem(id1, "approve");
  reviewItem(id2, "approve");

  const result = listItems({ keyword: "Math" });
  assert.equal(result.total, 1);
  assert.equal(result.items[0].title, "Math Textbook");
});

test("listItems filters by category", () => {
  const sellerId = tdb.createUser("seller13");
  const cat1 = tdb.createCategory("CatFilterA");
  const cat2 = tdb.createCategory("CatFilterB");
  const id1 = publishItem(sellerId, cat1, "Phone", null, 500, 1);
  const id2 = publishItem(sellerId, cat2, "Book", null, 10, 1);
  reviewItem(id1, "approve");
  reviewItem(id2, "approve");

  const result = listItems({ categoryId: cat1 });
  assert.equal(result.total, 1);
  assert.equal(result.items[0].title, "Phone");
});
