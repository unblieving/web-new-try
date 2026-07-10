import type { CreateCourseInput } from "../interface";

export function parseCourseInput(value: unknown): CreateCourseInput {
  if (!isRecord(value)) {
    throw new TypeError("请求体必须是 JSON 对象");
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description =
    typeof value.description === "string" ? value.description.trim() : "";

  if (title.length < 2 || title.length > 80) {
    throw new TypeError("title 长度必须在 2 到 80 个字符之间");
  }

  if (description.length < 2 || description.length > 500) {
    throw new TypeError("description 长度必须在 2 到 500 个字符之间");
  }

  return { title, description };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
