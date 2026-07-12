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
    <div className="min-h-[60vh] flex items-center justify-center animate-fade-in-up">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔐</div>
          <h1 className="text-2xl font-bold text-gray-800">欢迎回来</h1>
          <p className="text-sm text-gray-400 mt-1">登录你的校园二手交易账号</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-blue-100/60 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                🎓 学号
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                placeholder="请输入学号"
                className="w-full border border-blue-200 rounded-xl px-4 py-3 text-sm bg-blue-50/30 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                🔑 密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="请输入密码"
                className="w-full border border-blue-200 rounded-xl px-4 py-3 text-sm bg-blue-50/30 focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl py-3 text-sm font-medium hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
            >
              {submitting ? "⏳ 登录中..." : "🚀 登录"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-blue-50 text-center">
            <p className="text-sm text-gray-500">
              还没有账号？{" "}
              <Link
                href="/register"
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                立即注册 →
              </Link>
            </p>
          </div>
        </div>

        {/* Demo hint */}
        <div className="mt-4 bg-blue-50/50 rounded-xl p-4 border border-blue-100/50 text-center">
          <p className="text-xs text-gray-400">
            💡 演示账号：学号 <code className="text-blue-500">2024001</code> ~{" "}
            <code className="text-blue-500">2024006</code>，密码任意
          </p>
        </div>
      </div>
    </div>
  );
}