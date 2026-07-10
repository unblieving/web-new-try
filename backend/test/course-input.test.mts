import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCourseInput } from "../src/utils/course-input.ts";

test("parseCourseInput trims valid input", () => {
  assert.deepEqual(
    parseCourseInput({ title: "  React  ", description: "  组件基础  " }),
    { title: "React", description: "组件基础" },
  );
});

test("parseCourseInput rejects invalid input", () => {
  assert.throws(
    () => parseCourseInput({ title: "", description: "" }),
    TypeError,
  );
});
