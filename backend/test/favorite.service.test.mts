/**
 * Favorite service tests — tests favorite add/remove/list logic
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

// --- Helper functions replicating favorite service logic ---

function addFavorite(userId: number, itemId: number): void {
  const item = tdb.getItemById(itemId) as any;
  if (!item) throw new Error("Item not found");

  const existing = tdb.getFavorite(userId, itemId);
  if (existing) return; // Idempotent

  tdb.db
    .prepare("INSERT INTO favorites (user_id, item_id) VALUES (?, ?)")
    .run(userId, itemId);
}

function removeFavorite(userId: number, itemId: number): void {
  const result = tdb.db
    .prepare("DELETE FROM favorites WHERE user_id = ? AND item_id = ?")
    .run(userId, itemId);
  if (result.changes === 0) throw new Error("Favorite not found");
}

function listFavorites(userId: number): any[] {
  return tdb.db
    .prepare(
      `SELECT i.*, f.created_at as favorited_at
     FROM favorites f
     JOIN items i ON f.item_id = i.id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    )
    .all(userId);
}

function isFavorite(userId: number, itemId: number): boolean {
  const fav = tdb.getFavorite(userId, itemId);
  return !!fav;
}

// --- Tests ---

test("addFavorite creates a favorite", () => {
  const userId = tdb.createUser("user1");
  const sellerId = tdb.createUser("seller1");
  const catId = tdb.createCategory("Cat1");
  const itemId = tdb.createItem(sellerId, catId, "Item", 10, 1, "approved");

  addFavorite(userId, itemId);
  assert.ok(isFavorite(userId, itemId));
});

test("addFavorite is idempotent", () => {
  const userId = tdb.createUser("user2");
  const sellerId = tdb.createUser("seller2");
  const catId = tdb.createCategory("Cat2");
  const itemId = tdb.createItem(sellerId, catId, "Item", 10, 1, "approved");

  addFavorite(userId, itemId);
  addFavorite(userId, itemId); // Should not throw
  assert.ok(isFavorite(userId, itemId));
});

test("addFavorite rejects non-existent item", () => {
  const userId = tdb.createUser("user3");
  assert.throws(() => addFavorite(userId, 9999), /Item not found/);
});

test("removeFavorite removes the favorite", () => {
  const userId = tdb.createUser("user4");
  const sellerId = tdb.createUser("seller4");
  const catId = tdb.createCategory("Cat4");
  const itemId = tdb.createItem(sellerId, catId, "Item", 10, 1, "approved");

  addFavorite(userId, itemId);
  removeFavorite(userId, itemId);
  assert.ok(!isFavorite(userId, itemId));
});

test("removeFavorite throws for non-existent favorite", () => {
  const userId = tdb.createUser("user5");
  assert.throws(() => removeFavorite(userId, 9999), /Favorite not found/);
});

test("listFavorites returns user's favorites", () => {
  const userId = tdb.createUser("user6");
  const sellerId = tdb.createUser("seller6");
  const catId = tdb.createCategory("Cat6");
  const item1 = tdb.createItem(sellerId, catId, "Item 1", 10, 1, "approved");
  const item2 = tdb.createItem(sellerId, catId, "Item 2", 20, 1, "approved");

  addFavorite(userId, item1);
  addFavorite(userId, item2);

  const favs = listFavorites(userId);
  assert.equal(favs.length, 2);
});

test("listFavorites returns empty array for user with no favorites", () => {
  const userId = tdb.createUser("user7");
  const favs = listFavorites(userId);
  assert.equal(favs.length, 0);
});

test("favorites are per-user", () => {
  const user1 = tdb.createUser("user8a");
  const user2 = tdb.createUser("user8b");
  const sellerId = tdb.createUser("seller8");
  const catId = tdb.createCategory("Cat8");
  const itemId = tdb.createItem(sellerId, catId, "Item", 10, 1, "approved");

  addFavorite(user1, itemId);
  assert.ok(isFavorite(user1, itemId));
  assert.ok(!isFavorite(user2, itemId));
});
