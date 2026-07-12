import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ValidationError,
  requireString,
  optionalString,
  requirePositiveInt,
  requirePositiveNumber,
} from "../src/utils/validation.ts";

// --- requireString ---

test("requireString trims and returns valid string", () => {
  assert.equal(requireString("  hello  ", "name"), "hello");
});

test("requireString throws on empty string", () => {
  assert.throws(() => requireString("", "name"), ValidationError);
});

test("requireString throws on whitespace-only string", () => {
  assert.throws(() => requireString("   ", "name"), ValidationError);
});

test("requireString throws on non-string", () => {
  assert.throws(() => requireString(123, "name"), ValidationError);
});

test("requireString throws when exceeding maxLen", () => {
  assert.throws(() => requireString("abcdef", "name", 1, 3), ValidationError);
});

test("requireString throws when below minLen", () => {
  assert.throws(() => requireString("ab", "name", 5), ValidationError);
});

// --- optionalString ---

test("optionalString returns null for undefined", () => {
  assert.equal(optionalString(undefined, "desc"), null);
});

test("optionalString returns null for null", () => {
  assert.equal(optionalString(null, "desc"), null);
});

test("optionalString returns null for empty string", () => {
  assert.equal(optionalString("", "desc"), null);
});

test("optionalString trims and returns valid string", () => {
  assert.equal(optionalString("  hello  ", "desc"), "hello");
});

test("optionalString throws on non-string", () => {
  assert.throws(() => optionalString(42, "desc"), ValidationError);
});

test("optionalString throws when exceeding maxLen", () => {
  assert.throws(() => optionalString("abcdef", "desc", 3), ValidationError);
});

// --- requirePositiveInt ---

test("requirePositiveInt returns valid integer", () => {
  assert.equal(requirePositiveInt(5, "qty"), 5);
});

test("requirePositiveInt parses string integer", () => {
  assert.equal(requirePositiveInt("10", "qty"), 10);
});

test("requirePositiveInt throws on zero", () => {
  assert.throws(() => requirePositiveInt(0, "qty"), ValidationError);
});

test("requirePositiveInt throws on negative", () => {
  assert.throws(() => requirePositiveInt(-1, "qty"), ValidationError);
});

test("requirePositiveInt throws on float", () => {
  assert.throws(() => requirePositiveInt(1.5, "qty"), ValidationError);
});

test("requirePositiveInt throws on NaN", () => {
  assert.throws(() => requirePositiveInt("abc", "qty"), ValidationError);
});

// --- requirePositiveNumber ---

test("requirePositiveNumber returns valid number", () => {
  assert.equal(requirePositiveNumber(9.99, "price"), 9.99);
});

test("requirePositiveNumber parses string number", () => {
  assert.equal(requirePositiveNumber("19.50", "price"), 19.5);
});

test("requirePositiveNumber throws on zero", () => {
  assert.throws(() => requirePositiveNumber(0, "price"), ValidationError);
});

test("requirePositiveNumber throws on negative", () => {
  assert.throws(() => requirePositiveNumber(-5, "price"), ValidationError);
});

test("requirePositiveNumber throws on NaN", () => {
  assert.throws(() => requirePositiveNumber("abc", "price"), ValidationError);
});
