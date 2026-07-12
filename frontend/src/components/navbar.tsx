"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { user, loading, logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="text-lg font-bold text-blue-600">
          校园二手交易
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm hover:text-blue-600">
            首页
          </Link>

          {loading ? (
            <span className="text-sm text-gray-400">加载中...</span>
          ) : user ? (
            <>
              <Link href="/publish" className="text-sm hover:text-blue-600">
                发布商品
              </Link>
              <Link href="/my-items" className="text-sm hover:text-blue-600">
                我的发布
              </Link>
              <Link href="/my-orders" className="text-sm hover:text-blue-600">
                我的订单
              </Link>
              <Link href="/favorites" className="text-sm hover:text-blue-600">
                我的收藏
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="text-sm hover:text-blue-600">
                  管理后台
                </Link>
              )}
              <span className="text-sm text-gray-500">{user.username}</span>
              <button
                onClick={logout}
                className="text-sm text-red-500 hover:text-red-700"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm hover:text-blue-600">
                登录
              </Link>
              <Link href="/register" className="text-sm hover:text-blue-600">
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
