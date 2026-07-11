export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function requireString(
  value: unknown,
  fieldName: string,
  minLen = 1,
  maxLen = 255
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${fieldName}不能为空`);
  }
  const trimmed = value.trim();
  if (trimmed.length < minLen) {
    throw new ValidationError(`${fieldName}长度不能少于${minLen}个字符`);
  }
  if (trimmed.length > maxLen) {
    throw new ValidationError(`${fieldName}长度不能超过${maxLen}个字符`);
  }
  return trimmed;
}

export function optionalString(
  value: unknown,
  fieldName: string,
  maxLen = 255
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName}必须是字符串`);
  }
  if (value.length > maxLen) {
    throw new ValidationError(`${fieldName}长度不能超过${maxLen}个字符`);
  }
  return value.trim() || null;
}

export function requirePositiveInt(value: unknown, fieldName: string): number {
  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName}必须是正整数`);
  }
  return num;
}

export function requirePositiveNumber(value: unknown, fieldName: string): number {
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num) || num <= 0) {
    throw new ValidationError(`${fieldName}必须是正数`);
  }
  return num;
}