"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(studentId, password);
      await refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold text-center mb-6">登录</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm mb-1">学号</label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "登录中..." : "登录"}
        </button>
        <p className="text-sm text-center text-gray-500">
          还没有账号？{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            注册
          </Link>
        </p>
      </form>
    </div>
  );
}
