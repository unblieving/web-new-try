"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }

    setSubmitting(true);
    try {
      await register(studentId, username, password);
      await refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold text-center mb-6">注册</h1>
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
          <label className="block text-sm mb-1">用户名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={2}
            maxLength={20}
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
            minLength={6}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">确认密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "注册中..." : "注册"}
        </button>
        <p className="text-sm text-center text-gray-500">
          已有账号？{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            登录
          </Link>
        </p>
      </form>
    </div>
  );
}
