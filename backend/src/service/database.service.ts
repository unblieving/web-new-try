import { Config, Destroy, Init, Provide } from "@midwayjs/core";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

@Provide()
export class DatabaseService {
  @Config("database.path")
  databasePath: string;

  private database: DatabaseSync;

  @Init()
  async initialize() {
    const absolutePath = resolve(process.cwd(), this.databasePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    this.database = new DatabaseSync(absolutePath);
    this.database.exec("PRAGMA journal_mode = WAL");
    this.database.exec("PRAGMA foreign_keys = ON");
    this.createSchema();
    this.seedData();
  }

  getDatabase(): DatabaseSync {
    return this.database;
  }

  private createSchema() {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (parent_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        available_quantity INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending_review',
        reject_reason TEXT,
        images TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (seller_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT UNIQUE NOT NULL,
        buyer_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        total_price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending_payment',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (buyer_id) REFERENCES users(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (item_id) REFERENCES items(id),
        UNIQUE(user_id, item_id)
      );

      CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
      CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
      CREATE INDEX IF NOT EXISTS idx_items_seller ON items(seller_id);
      CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_item ON orders(item_id);
      CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    `);
  }

  private seedData() {
    const categoryCount = this.database
      .prepare("SELECT COUNT(*) AS total FROM categories")
      .get() as { total: number };

    if (categoryCount.total === 0) {
      // Seed categories (two-level structure)
      const insertCategory = this.database.prepare(
        "INSERT INTO categories (name, parent_id, sort_order) VALUES (?, ?, ?)",
      );

      // Level 1 categories
      insertCategory.run("教材", null, 0);
      const textbookId = Number(
        (
          this.database.prepare("SELECT last_insert_rowid() AS id").get() as {
            id: number;
          }
        ).id,
      );
      insertCategory.run("电子产品", null, 1);
      const electronicsId = Number(
        (
          this.database.prepare("SELECT last_insert_rowid() AS id").get() as {
            id: number;
          }
        ).id,
      );
      insertCategory.run("生活用品", null, 2);
      const dailyId = Number(
        (
          this.database.prepare("SELECT last_insert_rowid() AS id").get() as {
            id: number;
          }
        ).id,
      );

      // Level 2 categories
      insertCategory.run("课本", textbookId, 0);
      insertCategory.run("笔记", textbookId, 1);
      insertCategory.run("手机", electronicsId, 0);
      insertCategory.run("电脑", electronicsId, 1);
      insertCategory.run("宿舍用品", dailyId, 0);
      insertCategory.run("其他", dailyId, 1);
    }
  }

  @Destroy()
  async close() {
    this.database?.close();
  }
}
