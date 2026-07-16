/**
 * Review service tests — tests review creation, validation, and querying
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

// --- Helper functions replicating review service logic ---

function createReview(
  orderId: number,
  itemId: number,
  buyerId: number,
  rating: number,
  content: string,
): number {
  // Validate rating
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be an integer between 1 and 5");
  }

  // Validate content
  if (!content || typeof content !== "string" || content.trim().length < 1) {
    throw new Error("Review content is required");
  }
  if (content.length > 500) {
    throw new Error("Review content must not exceed 500 characters");
  }

  // Check order exists and is completed
  const order = tdb.getOrderById(orderId) as any;
  if (!order) {
    throw new Error("Order not found");
  }
  if (order.status !== "completed") {
    throw new Error("Can only review completed orders");
  }

  // Check buyer matches
  if (order.buyer_id !== buyerId) {
    throw new Error("Only the buyer can review this order");
  }

  // Check item matches
  if (order.item_id !== itemId) {
    throw new Error("Review item does not match order item");
  }

  // Check duplicate
  const existing = tdb.getReviewByOrder(orderId);
  if (existing) {
    throw new Error("This order has already been reviewed");
  }

  return tdb.createReview(orderId, itemId, buyerId, rating, content.trim());
}

function getItemReviews(
  itemId: number,
  page = 1,
  pageSize = 20,
): { data: any[]; total: number } {
  if (page < 1) page = 1;
  if (pageSize < 1) pageSize = 20;
  if (pageSize > 100) pageSize = 100;

  const totalRow = tdb.db
    .prepare("SELECT COUNT(*) as cnt FROM reviews WHERE item_id = ?")
    .get(itemId) as any;
  const total = totalRow?.cnt ?? 0;

  const offset = (page - 1) * pageSize;
  const data = tdb.db
    .prepare(
      `SELECT r.*, u.username as buyer_username
       FROM reviews r
       LEFT JOIN users u ON u.id = r.buyer_id
       WHERE r.item_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(itemId, pageSize, offset);

  return { data, total };
}

function deleteReview(reviewId: number, userId: number, userRole: string): void {
  const review = tdb.db
    .prepare("SELECT * FROM reviews WHERE id = ?")
    .get(reviewId) as any;
  if (!review) {
    throw new Error("Review not found");
  }
  // Only the buyer who wrote it or an admin can delete
  if (review.buyer_id !== userId && userRole !== "admin") {
    throw new Error("You are not authorized to delete this review");
  }
  tdb.db.prepare("DELETE FROM reviews WHERE id = ?").run(reviewId);
}

// --- Tests ---

test("createReview succeeds for a completed order", () => {
  const sellerId = tdb.createUser("seller1");
  const buyerId = tdb.createUser("buyer1");
  const catId = tdb.createCategory("Books");
  const itemId = tdb.createItem(sellerId, catId);
  const orderId = tdb.createOrder(buyerId, itemId, "Test Item", 10, 1, "completed");

  const reviewId = createReview(orderId, itemId, buyerId, 5, "Excellent item!");
  assert.ok(reviewId > 0);

  const review = tdb.getReviewByOrder(orderId);
  assert.ok(review);
  assert.equal(review.rating, 5);
  assert.equal(review.content, "Excellent item!");
});

test("createReview rejects invalid rating (0)", () => {
  const sellerId = tdb.createUser("seller2");
  const buyerId = tdb.createUser("buyer2");
  const catId = tdb.createCategory("Electronics");
  const itemId = tdb.createItem(sellerId, catId);
  const orderId = tdb.createOrder(buyerId, itemId, "Test", 10, 1, "completed");

  assert.throws(() => createReview(orderId, itemId, buyerId, 0, "Bad"), /Rating must be/);
});

test("createReview rejects invalid rating (6)", () => {
  const sellerId = tdb.createUser("seller3");
  const buyerId = tdb.createUser("buyer3");
  const catId = tdb.createCategory("Books");
  const itemId = tdb.createItem(sellerId, catId);
  const orderId = tdb.createOrder(buyerId, itemId, "Test", 10, 1, "completed");

  assert.throws(() => createReview(orderId, itemId, buyerId, 6, "Too high"), /Rating must be/);
});

test("createReview rejects empty content", () => {
  const sellerId = tdb.createUser("seller4");
  const buyerId = tdb.createUser("buyer4");
  const catId = tdb.createCategory("Books");
  const itemId = tdb.createItem(sellerId, catId);
  const orderId = tdb.createOrder(buyerId, itemId, "Test", 10, 1, "completed");

  assert.throws(() => createReview(orderId, itemId, buyerId, 3, ""), /content is required/);
});

test("createReview rejects content over 500 characters", () => {
  const sellerId = tdb.createUser("seller5");
  const buyerId = tdb.createUser("buyer5");
  const catId = tdb.createCategory("Books");
  const itemId = tdb.createItem(sellerId, catId);
  const orderId = tdb.createOrder(buyerId, itemId, "Test", 10, 1, "completed");

  const longContent = "a".repeat(501);
  assert.throws(
    () => createReview(orderId, itemId, buyerId, 3, longContent),
    /must not exceed 500/,
  );
});

test("createReview rejects non-completed order", () => {
  const sellerId = tdb.createUser("seller6");
  const buyerId = tdb.createUser("buyer6");
  const catId = tdb.createCategory("Books");
  const itemId = tdb.createItem(sellerId, catId);
  const orderId = tdb.createOrder(buyerId, itemId, "Test", 10, 1, "paid");

  assert.throws(
    () => createReview(orderId, itemId, buyerId, 5, "Good"),
    /completed orders/,
  );
});

test("createReview rejects wrong buyer", () => {
  const sellerId = tdb.createUser("seller7");
  const buyerId = tdb.createUser("buyer7");
  const otherUserId = tdb.createUser("other7");
  const catId = tdb.createCategory("Books");
  const itemId = tdb.createItem(sellerId, catId);
  const orderId = tdb.createOrder(buyerId, itemId, "Test", 10, 1, "completed");

  assert.throws(
    () => createReview(orderId, itemId, otherUserId, 5, "Good"),
    /Only the buyer/,
  );
});

test("createReview rejects duplicate review", () => {
  const sellerId = tdb.createUser("seller8");
  const buyerId = tdb.createUser("buyer8");
  const catId = tdb.createCategory("Books");
  const itemId = tdb.createItem(sellerId, catId);
  const orderId = tdb.createOrder(buyerId, itemId, "Test", 10, 1, "completed");

  createReview(orderId, itemId, buyerId, 5, "First review");
  assert.throws(
    () => createReview(orderId, itemId, buyerId, 4, "Second review"),
    /already been reviewed/,
  );
});

test("createReview rejects non-existent order", () => {
  const buyerId = tdb.createUser("buyer9");
  assert.throws(
    () => createReview(9999, 1, buyerId, 5, "No order"),
    /Order not found/,
  );
});

test("getItemReviews returns paginated results", () => {
  const sellerId = tdb.createUser("seller10");
  const catId = tdb.createCategory("Books");
  const itemId = tdb.createItem(sellerId, catId);

  // Create 3 buyers and completed orders with reviews
  for (let i = 0; i < 3; i++) {
    const buyerId = tdb.createUser(`buyer10_${i}`);
    const orderId = tdb.createOrder(
      buyerId,
      itemId,
      "Test Item",
      10,
      1,
      "completed",
    );
    tdb.createReview(orderId, itemId, buyerId, 3 + i, `Review ${i}`);
  }

  const result = getItemReviews(itemId, 1, 2);
  assert.equal(result.total, 3);
  assert.equal(result.data.length, 2);

  const page2 = getItemReviews(itemId, 2, 2);
  assert.equal(page2.total, 3);
  assert.equal(page2.data.length, 1);
});

test("getItemReviews returns empty for item with no reviews", () => {
  const result = getItemReviews(9999, 1, 20);
  assert.equal(result.total, 0);
  assert.equal(result.data.length, 0);
});

test("deleteReview succeeds for the buyer", () => {
  const sellerId = tdb.createUser("seller11");
  const buyerId = tdb.createUser("buyer11");
  const catId = tdb.createCategory("Books");
  const itemId = tdb.createItem(sellerId, catId);
  const orderId = tdb.createOrder(buyerId, itemId, "Test", 10, 1, "completed");
  const reviewId = createReview(orderId, itemId, buyerId, 5, "Great!");

  deleteReview(reviewId, buyerId, "user");
  const deleted = tdb.getReviewByOrder(orderId);
  assert.equal(deleted, undefined);
});

test("deleteReview succeeds for admin", () => {
  const sellerId = tdb.createUser("seller12");
  const buyerId = tdb.createUser("buyer12");
  const adminId = tdb.createUser("admin12", "Admin1234", "admin");
  const catId = tdb.createCategory("Books");
  const itemId = tdb.createItem(sellerId, catId);
  const orderId = tdb.createOrder(buyerId, itemId, "Test", 10, 1, "completed");
  const reviewId = createReview(orderId, itemId, buyerId, 5, "Great!");

  deleteReview(reviewId, adminId, "admin");
  const deleted = tdb.getReviewByOrder(orderId);
  assert.equal(deleted, undefined);
});

test("deleteReview rejects unauthorized user", () => {
  const sellerId = tdb.createUser("seller13");
  const buyerId = tdb.createUser("buyer13");
  const otherUserId = tdb.createUser("other13");
  const catId = tdb.createCategory("Books");
  const itemId = tdb.createItem(sellerId, catId);
  const orderId = tdb.createOrder(buyerId, itemId, "Test", 10, 1, "completed");
  const reviewId = createReview(orderId, itemId, buyerId, 5, "Great!");

  assert.throws(
    () => deleteReview(reviewId, otherUserId, "user"),
    /not authorized/,
  );
});

test("deleteReview rejects non-existent review", () => {
  assert.throws(() => deleteReview(9999, 1, "user"), /Review not found/);
});

test("createReview trims content whitespace", () => {
  const sellerId = tdb.createUser("seller14");
  const buyerId = tdb.createUser("buyer14");
  const catId = tdb.createCategory("Books");
  const itemId = tdb.createItem(sellerId, catId);
  const orderId = tdb.createOrder(buyerId, itemId, "Test", 10, 1, "completed");

  const reviewId = createReview(orderId, itemId, buyerId, 4, "  Trimmed content  ");
  const review = tdb.getReviewByOrder(orderId);
  assert.equal(review.content, "Trimmed content");
});