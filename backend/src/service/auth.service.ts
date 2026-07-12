import { Inject, Provide } from "@midwayjs/core";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { DatabaseService } from "./database.service";
import { User, CreateUserInput, LoginInput } from "../interface";
import { requireString } from "../utils/validation";

type UserRow = {
  id: number;
  student_id: string;
  username: string;
  password_hash: string;
  role: string;
  created_at: string;
};

@Provide()
export class AuthService {
  @Inject()
  databaseService: DatabaseService;

  private get db() {
    return this.databaseService.getDatabase();
  }

  register(input: CreateUserInput): User {
    const studentId = requireString(input.studentId, "学号", 1, 50);
    const username = requireString(input.username, "用户名", 1, 50);
    const password = requireString(input.password, "密码", 6, 100);

    const existing = this.db
      .prepare("SELECT id FROM users WHERE student_id = ?")
      .get(studentId) as { id: number } | undefined;
    if (existing) {
      throw new Error("该学号已注册");
    }

    const passwordHash = hashPassword(password);
    const result = this.db
      .prepare(
        "INSERT INTO users (student_id, username, password_hash) VALUES (?, ?, ?)",
      )
      .run(studentId, username, passwordHash);

    return this.findById(Number(result.lastInsertRowid))!;
  }

  login(input: LoginInput): User {
    const studentId = requireString(input.studentId, "学号", 1, 50);
    const password = requireString(input.password, "密码", 1, 100);

    const row = this.db
      .prepare("SELECT * FROM users WHERE student_id = ?")
      .get(studentId) as UserRow | undefined;

    if (!row || !verifyPassword(password, row.password_hash)) {
      throw new Error("学号或密码错误");
    }

    return mapUser(row);
  }

  findById(id: number): User | null {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      UserRow | undefined;
    return row ? mapUser(row) : null;
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return timingSafeEqual(derived, expected);
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    studentId: row.student_id,
    username: row.username,
    role: row.role as User["role"],
    createdAt: row.created_at,
  };
}
