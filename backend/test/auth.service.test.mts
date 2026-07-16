/**
 * Auth service tests — tests user registration and authentication logic
 * using raw SQLite operations (no Midway framework dependency).
 */
import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";
import { createTestDb, type TestDb } from "./test-db.mts";
import { randomBytes, createHash } from "node:crypto";

let tdb: TestDb;

beforeEach(() => {
  tdb = createTestDb();
  tdb.setup();
});

afterEach(() => {
  tdb.close();
});

// --- Helper functions replicating auth service logic ---

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(salt + password).digest("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const computed = createHash("sha256").update(salt + password).digest("hex");
  return hash === computed;
}

function registerUser(username: string, password: string): { id: number; token: string } {
  // Validate
  if (!username || typeof username !== "string" || username.trim().length < 3) {
    throw new Error("Username must be at least 3 characters");
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  // Check duplicate
  const existing = tdb.db.prepare("SELECT id FROM users WHERE username = ?").get(username.trim());
  if (existing) {
    throw new Error("Username already exists");
  }

  const passwordHash = hashPassword(password);
  const result = tdb.db.prepare(
    "INSERT INTO users (username, password, role) VALUES (?, ?, 'user')"
  ).run(username.trim(), passwordHash);

  const id = Number(result.lastInsertRowid);
  const token = randomBytes(32).toString("hex");
  return { id, token };
}

function loginUser(username: string, password: string): { id: number; token: string; role: string } {
  const user = tdb.db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
  if (!user) {
    throw new Error("Invalid username or password");
  }
  if (!verifyPassword(password, user.password)) {
    throw new Error("Invalid username or password");
  }
  const token = randomBytes(32).toString("hex");
  return { id: user.id, token, role: user.role };
}

// --- Tests ---

test("registerUser creates a new user", () => {
  const result = registerUser("alice", "password123");
  assert.ok(result.id > 0);
  assert.ok(result.token.length > 0);

  const user = tdb.getUserById(result.id);
  assert.ok(user);
  assert.equal(user.username, "alice");
  assert.equal(user.role, "user");
});

test("registerUser trims username", () => {
  const result = registerUser("  bob  ", "password123");
  const user = tdb.getUserById(result.id);
  assert.equal(user.username, "bob");
});

test("registerUser rejects duplicate username", () => {
  registerUser("charlie", "password123");
  assert.throws(() => registerUser("charlie", "otherpass"), /already exists/);
});

test("registerUser rejects short username", () => {
  assert.throws(() => registerUser("ab", "password123"), /at least 3/);
});

test("registerUser rejects short password", () => {
  assert.throws(() => registerUser("dave", "12345"), /at least 6/);
});

test("loginUser succeeds with correct credentials", () => {
  registerUser("eve", "mypassword");
  const result = loginUser("eve", "mypassword");
  assert.ok(result.id > 0);
  assert.ok(result.token.length > 0);
  assert.equal(result.role, "user");
});

test("loginUser fails with wrong password", () => {
  registerUser("frank", "correctpass");
  assert.throws(() => loginUser("frank", "wrongpass"), /Invalid/);
});

test("loginUser fails with non-existent user", () => {
  assert.throws(() => loginUser("nobody", "password"), /Invalid/);
});