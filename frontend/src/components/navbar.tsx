"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { user, loading, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-blue-100 shadow-sm">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl group-hover:animate-bounce">🛒</span>
          <span className="text-lg font-bold shimmer-text">校园二手交易</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          <NavLink href="/" icon="🏠">
            首页
          </NavLink>

          {loading ? (
            <span className="text-sm text-gray-400 px-3">加载中...</span>
          ) : user ? (
            <>
              <NavLink href="/publish" icon="📝">
                发布商品
              </NavLink>
              <NavLink href="/my-items" icon="📦">
                我的发布
              </NavLink>
              <NavLink href="/my-orders" icon="🧾">
                我的订单
              </NavLink>
              <NavLink href="/favorites" icon="❤️">
                我的收藏
              </NavLink>
              {user.role === "admin" && (
                <NavLink href="/admin" icon="⚙️">
                  管理后台
                </NavLink>
              )}

              {/* User Menu */}
              <div className="flex items-center gap-2 ml-3 pl-3 border-l border-gray-200">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                  <span className="text-sm">
                    {user.role === "admin" ? "👑" : "👤"}
                  </span>
                  <span className="text-sm font-medium text-blue-700">
                    {user.username}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
                >
                  退出
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Link
                href="/login"
                className="text-sm px-4 py-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors font-medium"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 transition-all shadow-sm hover:shadow-md font-medium"
              >
                注册
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50/60 transition-all"
    >
      <span className="text-base">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
