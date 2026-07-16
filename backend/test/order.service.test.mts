/**
 * Order service tests — tests order lifecycle and state transitions
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

// --- Helper functions replicating order service logic ---

function createOrder(
  buyerId: number,
  itemId: number,
  quantity: number = 1,
): number {
  const item = tdb.getItemById(itemId) as any;
  if (!item) throw new Error("Item not found");
  if (item.status !== "approved")
    throw new Error("Item is not available for purchase");
  if (item.stock < quantity) throw new Error("Insufficient stock");
  if (item.seller_id === buyerId) throw new Error("Cannot buy your own item");

  // Decrement stock
  tdb.db
    .prepare(
      "UPDATE items SET stock = stock - ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(quantity, itemId);

  const totalAmount = item.price * quantity;
  const result = tdb.db
    .prepare(
      "INSERT INTO orders (buyer_id, item_id, snapshot_title, snapshot_price, quantity, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, 'pending_payment')",
    )
    .run(buyerId, itemId, item.title, item.price, quantity, totalAmount);

  return Number(result.lastInsertRowid);
}

function simulatePayment(orderId: number): void {
  const order = tdb.getOrderById(orderId) as any;
  if (!order) throw new Error("Order not found");
  if (order.status !== "pending_payment")
    throw new Error("Order is not awaiting payment");

  tdb.db
    .prepare(
      "UPDATE orders SET status = 'paid', updated_at = datetime('now') WHERE id = ?",
    )
    .run(orderId);
}

function sellerConfirm(orderId: number, sellerId: number): void {
  const order = tdb.getOrderById(orderId) as any;
  if (!order) throw new Error("Order not found");
  if (order.status !== "paid")
    throw new Error("Order must be paid before shipping");

  const item = tdb.getItemById(order.item_id) as any;
  if (item.seller_id !== sellerId) throw new Error("Forbidden: not the seller");

  tdb.db
    .prepare(
      "UPDATE orders SET status = 'shipped', updated_at = datetime('now') WHERE id = ?",
    )
    .run(orderId);
}

function confirmReceipt(orderId: number, buyerId: number): void {
  const order = tdb.getOrderById(orderId) as any;
  if (!order) throw new Error("Order not found");
  if (order.status !== "shipped")
    throw new Error("Order must be shipped before confirming receipt");
  if (order.buyer_id !== buyerId) throw new Error("Forbidden: not the buyer");

  tdb.db
    .prepare(
      "UPDATE orders SET status = 'completed', updated_at = datetime('now') WHERE id = ?",
    )
    .run(orderId);
}

function cancelOrder(orderId: number, userId: number): void {
  const order = tdb.getOrderById(orderId) as any;
  if (!order) throw new Error("Order not found");
  if (order.status !== "pending_payment")
    throw new Error("Only unpaid orders can be cancelled");
  if (order.buyer_id !== userId) throw new Error("Forbidden: not the buyer");

  // Restore stock
  tdb.db
    .prepare(
      "UPDATE items SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(order.quantity, order.item_id);

  tdb.db
    .prepare(
      "UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?",
    )
    .run(orderId);
}

// --- Tests ---

test("createOrder creates a pending_payment order", () => {
  const sellerId = tdb.createUser("seller1");
  const buyerId = tdb.createUser("buyer1");
  const catId = tdb.createCategory("Cat1");
  const itemId = tdb.createItem(
    sellerId,
    catId,
    "Test Item",
    25.0,
    5,
    "approved",
  );

  const orderId = createOrder(buyerId, itemId, 2);
  const order = tdb.getOrderById(orderId) as any;

  assert.equal(order.status, "pending_payment");
  assert.equal(order.buyer_id, buyerId);
  assert.equal(order.quantity, 2);
  assert.equal(order.total_amount, 50.0);

  // Stock should be decremented
  const item = tdb.getItemById(itemId) as any;
  assert.equal(item.stock, 3);
});

test("createOrder rejects non-approved item", () => {
  const sellerId = tdb.createUser("seller2");
  const buyerId = tdb.createUser("buyer2");
  const catId = tdb.createCategory("Cat2");
  const itemId = tdb.createItem(
    sellerId,
    catId,
    "Pending Item",
    10,
    1,
    "pending",
  );

  assert.throws(() => createOrder(buyerId, itemId), /not available/);
});

test("createOrder rejects insufficient stock", () => {
  const sellerId = tdb.createUser("seller3");
  const buyerId = tdb.createUser("buyer3");
  const catId = tdb.createCategory("Cat3");
  const itemId = tdb.createItem(
    sellerId,
    catId,
    "Rare Item",
    100,
    1,
    "approved",
  );

  assert.throws(() => createOrder(buyerId, itemId, 5), /Insufficient stock/);
});

test("createOrder rejects self-purchase", () => {
  const sellerId = tdb.createUser("seller4");
  const catId = tdb.createCategory("Cat4");
  const itemId = tdb.createItem(sellerId, catId, "My Item", 10, 1, "approved");

  assert.throws(() => createOrder(sellerId, itemId), /Cannot buy your own/);
});

test("simulatePayment transitions to paid", () => {
  const sellerId = tdb.createUser("seller5");
  const buyerId = tdb.createUser("buyer5");
  const catId = tdb.createCategory("Cat5");
  const itemId = tdb.createItem(sellerId, catId, "Item", 10, 1, "approved");
  const orderId = createOrder(buyerId, itemId);

  simulatePayment(orderId);
  const order = tdb.getOrderById(orderId) as any;
  assert.equal(order.status, "paid");
});

test("simulatePayment rejects non-pending order", () => {
  const sellerId = tdb.createUser("seller6");
  const buyerId = tdb.createUser("buyer6");
  const catId = tdb.createCategory("Cat6");
  const itemId = tdb.createItem(sellerId, catId, "Item", 10, 1, "approved");
  const orderId = createOrder(buyerId, itemId);

  simulatePayment(orderId);
  assert.throws(() => simulatePayment(orderId), /not awaiting payment/);
});

test("sellerConfirm transitions to shipped", () => {
  const sellerId = tdb.createUser("seller7");
  const buyerId = tdb.createUser("buyer7");
  const catId = tdb.createCategory("Cat7");
  const itemId = tdb.createItem(sellerId, catId, "Item", 10, 1, "approved");
  const orderId = createOrder(buyerId, itemId);
  simulatePayment(orderId);

  sellerConfirm(orderId, sellerId);
  const order = tdb.getOrderById(orderId) as any;
  assert.equal(order.status, "shipped");
});

test("sellerConfirm rejects non-seller", () => {
  const sellerId = tdb.createUser("seller8");
  const buyerId = tdb.createUser("buyer8");
  const otherId = tdb.createUser("other8");
  const catId = tdb.createCategory("Cat8");
  const itemId = tdb.createItem(sellerId, catId, "Item", 10, 1, "approved");
  const orderId = createOrder(buyerId, itemId);
  simulatePayment(orderId);

  assert.throws(() => sellerConfirm(orderId, otherId), /Forbidden/);
});

test("confirmReceipt transitions to completed", () => {
  const sellerId = tdb.createUser("seller9");
  const buyerId = tdb.createUser("buyer9");
  const catId = tdb.createCategory("Cat9");
  const itemId = tdb.createItem(sellerId, catId, "Item", 10, 1, "approved");
  const orderId = createOrder(buyerId, itemId);
  simulatePayment(orderId);
  sellerConfirm(orderId, sellerId);

  confirmReceipt(orderId, buyerId);
  const order = tdb.getOrderById(orderId) as any;
  assert.equal(order.status, "completed");
});

test("confirmReceipt rejects non-buyer", () => {
  const sellerId = tdb.createUser("seller10");
  const buyerId = tdb.createUser("buyer10");
  const otherId = tdb.createUser("other10");
  const catId = tdb.createCategory("Cat10");
  const itemId = tdb.createItem(sellerId, catId, "Item", 10, 1, "approved");
  const orderId = createOrder(buyerId, itemId);
  simulatePayment(orderId);
  sellerConfirm(orderId, sellerId);

  assert.throws(() => confirmReceipt(orderId, otherId), /Forbidden/);
});

test("cancelOrder cancels unpaid order and restores stock", () => {
  const sellerId = tdb.createUser("seller11");
  const buyerId = tdb.createUser("buyer11");
  const catId = tdb.createCategory("Cat11");
  const itemId = tdb.createItem(sellerId, catId, "Item", 10, 3, "approved");
  const orderId = createOrder(buyerId, itemId, 2);

  // Stock was decremented to 1
  assert.equal((tdb.getItemById(itemId) as any).stock, 1);

  cancelOrder(orderId, buyerId);
  const order = tdb.getOrderById(orderId) as any;
  assert.equal(order.status, "cancelled");

  // Stock should be restored to 3
  assert.equal((tdb.getItemById(itemId) as any).stock, 3);
});

test("cancelOrder rejects paid order", () => {
  const sellerId = tdb.createUser("seller12");
  const buyerId = tdb.createUser("buyer12");
  const catId = tdb.createCategory("Cat12");
  const itemId = tdb.createItem(sellerId, catId, "Item", 10, 1, "approved");
  const orderId = createOrder(buyerId, itemId);
  simulatePayment(orderId);

  assert.throws(() => cancelOrder(orderId, buyerId), /Only unpaid/);
});

test("full order lifecycle: create → pay → ship → complete", () => {
  const sellerId = tdb.createUser("seller13");
  const buyerId = tdb.createUser("buyer13");
  const catId = tdb.createCategory("Cat13");
  const itemId = tdb.createItem(
    sellerId,
    catId,
    "Lifecycle Item",
    50,
    2,
    "approved",
  );

  const orderId = createOrder(buyerId, itemId, 1);
  assert.equal((tdb.getOrderById(orderId) as any).status, "pending_payment");

  simulatePayment(orderId);
  assert.equal((tdb.getOrderById(orderId) as any).status, "paid");

  sellerConfirm(orderId, sellerId);
  assert.equal((tdb.getOrderById(orderId) as any).status, "shipped");

  confirmReceipt(orderId, buyerId);
  assert.equal((tdb.getOrderById(orderId) as any).status, "completed");
});
