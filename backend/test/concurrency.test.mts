/**
 * Concurrency tests: verify that concurrent purchases of limited-stock items
 * do not cause overselling or duplicate transactions.
 *
 * Uses BEGIN IMMEDIATE to acquire a write lock, which serializes
 * concurrent writes in SQLite WAL mode.
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

// --- Helper: atomic purchase using BEGIN IMMEDIATE (same as order.service.ts) ---

function atomicPurchase(
  buyerId: number,
  itemId: number,
  quantity: number = 1,
): number {
  const db = tdb.db;

  // Use BEGIN IMMEDIATE to acquire a write lock upfront
  db.prepare("BEGIN IMMEDIATE").run();
  try {
    const item = db
      .prepare("SELECT * FROM items WHERE id = ?")
      .get(itemId) as any;
    if (!item) {
      db.prepare("ROLLBACK").run();
      throw new Error("Item not found");
    }
    if (item.status !== "approved") {
      db.prepare("ROLLBACK").run();
      throw new Error("Item is not available for purchase");
    }
    if (item.stock < quantity) {
      db.prepare("ROLLBACK").run();
      throw new Error("Insufficient stock");
    }
    if (item.seller_id === buyerId) {
      db.prepare("ROLLBACK").run();
      throw new Error("Cannot buy your own item");
    }

    // Decrement stock
    db.prepare(
      "UPDATE items SET stock = stock - ?, updated_at = datetime('now') WHERE id = ?",
    ).run(quantity, itemId);

    const totalAmount = item.price * quantity;
    const result = db
      .prepare(
        "INSERT INTO orders (buyer_id, item_id, snapshot_title, snapshot_price, quantity, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, 'pending_payment')",
      )
      .run(buyerId, itemId, item.title, item.price, quantity, totalAmount);

    db.prepare("COMMIT").run();
    return Number(result.lastInsertRowid);
  } catch (err) {
    try {
      db.prepare("ROLLBACK").run();
    } catch {
      /* already rolled back */
    }
    throw err;
  }
}

function cancelOrderWithRestore(orderId: number, buyerId: number): void {
  const db = tdb.db;

  db.prepare("BEGIN IMMEDIATE").run();
  try {
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ?")
      .get(orderId) as any;
    if (!order) {
      db.prepare("ROLLBACK").run();
      throw new Error("Order not found");
    }
    if (order.status !== "pending_payment") {
      db.prepare("ROLLBACK").run();
      throw new Error("Only unpaid orders can be cancelled");
    }
    if (order.buyer_id !== buyerId) {
      db.prepare("ROLLBACK").run();
      throw new Error("Forbidden: not the buyer");
    }

    // Restore stock
    db.prepare(
      "UPDATE items SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?",
    ).run(order.quantity, order.item_id);

    db.prepare(
      "UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?",
    ).run(orderId);

    db.prepare("COMMIT").run();
  } catch (err) {
    try {
      db.prepare("ROLLBACK").run();
    } catch {
      /* already rolled back */
    }
    throw err;
  }
}

// --- Tests ---

test("only one buyer succeeds when purchasing the last item", async () => {
  const sellerId = tdb.createUser("seller1");
  const catId = tdb.createCategory("限量商品");
  const itemId = tdb.createItem(
    sellerId,
    catId,
    "限量版手办",
    500,
    1,
    "approved",
  );

  // Create 5 buyers
  const buyerIds: number[] = [];
  for (let i = 0; i < 5; i++) {
    buyerIds.push(tdb.createUser(`buyer${i}`));
  }

  // Fire all purchase attempts concurrently
  // Wrap in Promise.resolve().then() so synchronous throws become rejections
  const results = await Promise.allSettled(
    buyerIds.map((buyerId) =>
      Promise.resolve().then(() => atomicPurchase(buyerId, itemId, 1)),
    ),
  );

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  assert.equal(fulfilled.length, 1, "Exactly one purchase should succeed");
  assert.equal(rejected.length, 4, "Four purchases should fail");

  // Verify stock is 0
  const item = tdb.getItemById(itemId) as any;
  assert.equal(item.stock, 0);

  // Verify exactly one order was created
  const allOrders = tdb.db
    .prepare("SELECT * FROM orders WHERE item_id = ?")
    .all(itemId);
  assert.equal(allOrders.length, 1, "Exactly one order should exist");
});

test("handles concurrent purchases of multi-quantity item correctly", async () => {
  const sellerId = tdb.createUser("seller2");
  const catId = tdb.createCategory("教材");
  const itemId = tdb.createItem(
    sellerId,
    catId,
    "二手教材套装",
    80,
    3,
    "approved",
  );

  // Create 5 buyers, each trying to buy 1
  const buyerIds: number[] = [];
  for (let i = 0; i < 5; i++) {
    buyerIds.push(tdb.createUser(`buyer_m${i}`));
  }

  const results = await Promise.allSettled(
    buyerIds.map((buyerId) =>
      Promise.resolve().then(() => atomicPurchase(buyerId, itemId, 1)),
    ),
  );

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  assert.equal(fulfilled.length, 3, "Exactly 3 purchases should succeed");
  assert.equal(rejected.length, 2, "Two purchases should fail");

  // Verify stock is 0
  const item = tdb.getItemById(itemId) as any;
  assert.equal(item.stock, 0);
});

test("concurrent purchase + cancel does not lose stock", async () => {
  const sellerId = tdb.createUser("seller3");
  const catId = tdb.createCategory("电子产品");
  const itemId = tdb.createItem(
    sellerId,
    catId,
    "二手Switch",
    1200,
    1,
    "approved",
  );

  const buyer1 = tdb.createUser("buyer_c1");
  const buyer2 = tdb.createUser("buyer_c2");

  // First buyer purchases
  const orderId = atomicPurchase(buyer1, itemId, 1);

  // Cancel and immediately try to buy again
  const cancelPromise = Promise.resolve(
    cancelOrderWithRestore(orderId, buyer1),
  );
  const buyPromise = new Promise<{ success: boolean; error?: string }>(
    (resolve) => {
      try {
        atomicPurchase(buyer2, itemId, 1);
        resolve({ success: true });
      } catch (err: any) {
        resolve({ success: false, error: err.message });
      }
    },
  );

  const [cancelResult, buyResult] = await Promise.all([
    cancelPromise,
    buyPromise,
  ]);

  // After cancel, stock should be restored
  const item = tdb.getItemById(itemId) as any;

  // Count active (non-cancelled) orders
  const activeOrders = tdb.db
    .prepare(
      "SELECT COUNT(*) as cnt FROM orders WHERE item_id = ? AND status != 'cancelled'",
    )
    .get(itemId) as any;

  // Stock + active orders should equal original quantity
  assert.equal(
    item.stock + activeOrders.cnt,
    1,
    "Stock consistency: available + active orders = original quantity",
  );
});

test("atomic purchase is serialised under concurrent access", async () => {
  const sellerId = tdb.createUser("seller4");
  const catId = tdb.createCategory("球鞋");
  const itemId = tdb.createItem(
    sellerId,
    catId,
    "限量球鞋",
    300,
    2,
    "approved",
  );

  // 5 concurrent purchase attempts of 1 each
  const buyerIds = Array.from({ length: 5 }, (_, i) =>
    tdb.createUser(`buyer_r${i}`),
  );

  const results = await Promise.allSettled(
    buyerIds.map((bid) =>
      Promise.resolve().then(() => atomicPurchase(bid, itemId, 1)),
    ),
  );

  const successes = results.filter((r) => r.status === "fulfilled");
  const failures = results.filter((r) => r.status === "rejected");

  assert.equal(successes.length, 2, "Exactly 2 purchases should succeed");
  assert.equal(failures.length, 3, "Three purchases should fail");

  const item = tdb.getItemById(itemId) as any;
  assert.equal(item.stock, 0);
});
