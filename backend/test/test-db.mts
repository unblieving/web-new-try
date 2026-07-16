/**
 * Test database helper — creates an in-memory SQLite database
 * with the same schema as the production database.
 *
 * Usage:
 *   import { createTestDb, type TestDb } from "./test-db.mjs";
 *   const db = createTestDb();
 *   db.setup();
 *   // ... run tests ...
 *   db.close();
 */
import { DatabaseSync } from "node:sqlite";
import { randomBytes, createHash } from "node:crypto";

export interface TestDb {
  db: DatabaseSync;
  setup: () => void;
  close: () => void;
  clear: () => void;
  // Helper methods for creating test data
  createUser: (username: string, password?: string, role?: string) => number;
  createCategory: (name: string) => number;
  createItem: (
    sellerId: number,
    categoryId: number,
    title?: string,
    price?: number,
    stock?: number,
    status?: string,
  ) => number;
  createOrder: (
    buyerId: number,
    itemId: number,
    snapshotTitle?: string,
    snapshotPrice?: number,
    quantity?: number,
    status?: string,
  ) => number;
  // Helper methods for queries
  getUserById: (id: number) => any;
  getItemById: (id: number) => any;
  getOrderById: (id: number) => any;
  createReview: (
    orderId: number,
    itemId: number,
    buyerId: number,
    rating?: number,
    content?: string,
  ) => number;
  getFavorite: (userId: number, itemId: number) => any;
  getReviewByOrder: (orderId: number) => any;
  getReviewsByItem: (itemId: number) => any[];
  countOrders: (itemId: number, status?: string) => number;
}

export function createTestDb(): TestDb {
  const db = new DatabaseSync(":memory:");

  function setup() {
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        username   TEXT    NOT NULL UNIQUE,
        password   TEXT    NOT NULL,
        role       TEXT    NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT    NOT NULL UNIQUE
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_id   INTEGER NOT NULL REFERENCES users(id),
        category_id INTEGER NOT NULL REFERENCES categories(id),
        title       TEXT    NOT NULL,
        description TEXT,
        price       REAL    NOT NULL CHECK(price > 0),
        stock       INTEGER NOT NULL DEFAULT 1 CHECK(stock >= 0),
        status      TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','sold','removed')),
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS favorites (
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
        created_at TEXT    NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (user_id, item_id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        buyer_id        INTEGER NOT NULL REFERENCES users(id),
        item_id         INTEGER NOT NULL REFERENCES items(id),
        snapshot_title  TEXT    NOT NULL,
        snapshot_price  REAL    NOT NULL,
        quantity        INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
        total_amount    REAL    NOT NULL,
        status          TEXT    NOT NULL DEFAULT 'pending_payment'
                        CHECK(status IN ('pending_payment','paid','shipped','completed','cancelled')),
        created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS reviews (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id   INTEGER NOT NULL UNIQUE REFERENCES orders(id),
        item_id    INTEGER NOT NULL REFERENCES items(id),
        buyer_id   INTEGER NOT NULL REFERENCES users(id),
        rating     INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        content    TEXT    NOT NULL,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Seed default categories
    const insertCat = db.prepare(
      "INSERT OR IGNORE INTO categories (name) VALUES (?)",
    );
    for (const name of [
      "Books",
      "Electronics",
      "Daily Necessities",
      "Clothing",
      "Sports",
      "Other",
    ]) {
      insertCat.run(name);
    }
  }

  function close() {
    db.close();
  }

  function clear() {
    db.exec("DELETE FROM reviews");
    db.exec("DELETE FROM orders");
    db.exec("DELETE FROM favorites");
    db.exec("DELETE FROM items");
    db.exec("DELETE FROM users");
  }

  function hashPassword(password: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = createHash("sha256")
      .update(salt + password)
      .digest("hex");
    return `${salt}:${hash}`;
  }

  function createUser(
    username: string,
    password = "Test1234",
    role = "user",
  ): number {
    const passwordHash = hashPassword(password);
    const result = db
      .prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)")
      .run(username, passwordHash, role);
    return Number(result.lastInsertRowid);
  }

  function createCategory(name: string): number {
    const result = db
      .prepare("INSERT INTO categories (name) VALUES (?)")
      .run(name);
    return Number(result.lastInsertRowid);
  }

  function createItem(
    sellerId: number,
    categoryId: number,
    title = "Test Item",
    price = 10.0,
    stock = 1,
    status = "approved",
  ): number {
    const result = db
      .prepare(
        "INSERT INTO items (seller_id, category_id, title, description, price, stock, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        sellerId,
        categoryId,
        title,
        "Test description",
        price,
        stock,
        status,
      );
    return Number(result.lastInsertRowid);
  }

  function createOrder(
    buyerId: number,
    itemId: number,
    snapshotTitle = "Test Item",
    snapshotPrice = 10.0,
    quantity = 1,
    status = "pending_payment",
  ): number {
    const totalAmount = snapshotPrice * quantity;
    const result = db
      .prepare(
        "INSERT INTO orders (buyer_id, item_id, snapshot_title, snapshot_price, quantity, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        buyerId,
        itemId,
        snapshotTitle,
        snapshotPrice,
        quantity,
        totalAmount,
        status,
      );
    return Number(result.lastInsertRowid);
  }

  function getUserById(id: number) {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  }

  function getItemById(id: number) {
    return db.prepare("SELECT * FROM items WHERE id = ?").get(id);
  }

  function getOrderById(id: number) {
    return db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  }

  function getFavorite(userId: number, itemId: number) {
    return db
      .prepare("SELECT * FROM favorites WHERE user_id = ? AND item_id = ?")
      .get(userId, itemId);
  }

  function createReview(
    orderId: number,
    itemId: number,
    buyerId: number,
    rating = 5,
    content = "Great item!",
  ): number {
    const result = db
      .prepare(
        "INSERT INTO reviews (order_id, item_id, buyer_id, rating, content) VALUES (?, ?, ?, ?, ?)",
      )
      .run(orderId, itemId, buyerId, rating, content);
    return Number(result.lastInsertRowid);
  }

  function getReviewByOrder(orderId: number) {
    return db
      .prepare("SELECT * FROM reviews WHERE order_id = ?")
      .get(orderId);
  }

  function getReviewsByItem(itemId: number) {
    return db
      .prepare("SELECT * FROM reviews WHERE item_id = ? ORDER BY created_at DESC")
      .all(itemId);
  }

  function countOrders(itemId: number, status?: string): number {
    if (status) {
      const row = db
        .prepare(
          "SELECT COUNT(*) as cnt FROM orders WHERE item_id = ? AND status = ?",
        )
        .get(itemId, status) as any;
      return row?.cnt ?? 0;
    }
    const row = db
      .prepare("SELECT COUNT(*) as cnt FROM orders WHERE item_id = ?")
      .get(itemId) as any;
    return row?.cnt ?? 0;
  }

  return {
    db,
    setup,
    close,
    clear,
    createUser,
    createCategory,
    createItem,
    createOrder,
    createReview,
    getUserById,
    getItemById,
    getOrderById,
    getFavorite,
    getReviewByOrder,
    getReviewsByItem,
    countOrders,
  };
}
