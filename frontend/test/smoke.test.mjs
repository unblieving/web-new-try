import assert from "node:assert/strict";
import { test } from "node:test";

test("frontend test runner is configured", () => {
  assert.equal(typeof fetch, "function");
});
