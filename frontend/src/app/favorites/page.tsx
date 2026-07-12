"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getFavorites, removeFavorite } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Favorite } from "@/lib/types";

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFavorites();
      setFavorites(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load favorites
    loadFavorites();
  }, [loadFavorites]);

  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  async function handleRemove(itemId: number) {
    setActionMsg("");
    try {
      await removeFavorite(itemId);
      setActionMsg("已取消收藏");
      await loadFavorites();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
    }
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>❤️</span> 我的收藏
        </h1>
        <p className="text-sm text-gray-400 mt-1">你收藏的心仪商品都在这里</p>
      </div>

      {/* Action Message */}
      {actionMsg && (
        <div
          className={`mb-6 text-sm p-4 rounded-xl border flex items-center gap-2 ${
            actionMsg.includes("成功") || actionMsg.includes("已")
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : "bg-red-50 text-red-600 border-red-200"
          }`}
        >
          <span>
            {actionMsg.includes("成功") || actionMsg.includes("已")
              ? "✅"
              : "⚠️"}
          </span>
          {actionMsg}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 animate-bounce">⏳</div>
          <p className="text-gray-400 text-sm">加载中...</p>
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-blue-100/60">
          <div className="text-5xl mb-3">💔</div>
          <p className="text-gray-400 text-sm mb-4">
            你还没有收藏过任何商品
          </p>
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:from-blue-600 hover:to-indigo-600 shadow-sm transition-all"
          >
            🛍️ 去逛逛校园集市
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="bg-white border border-blue-100/60 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center gap-4">
                {/* Image */}
                <div className="w-16 h-16 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-pink-100/50">
                  {fav.item?.images && fav.item.images.length > 0 ? (
                    <img
                      src={fav.item.images[0]}
                      alt={fav.item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-pink-300 text-2xl">📦</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {fav.item && (
                    <Link
                      href={`/items/${fav.item.id}`}
                      className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors"
                    >
                      {fav.item.title}
                    </Link>
                  )}
                  {fav.item && (
                    <p className="text-red-500 font-bold text-sm mt-1">
                      ¥{fav.item.price.toFixed(2)}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    ❤️ 收藏于{" "}
                    {new Date(fav.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  {fav.item && (
                    <Link
                      href={`/items/${fav.item.id}`}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-xs font-medium hover:from-blue-600 hover:to-indigo-600 shadow-sm transition-all"
                    >
                      查看详情
                    </Link>
                  )}
                  <button
                    onClick={() => fav.item && handleRemove(fav.item.id)}
                    className="px-4 py-2 border border-red-200 text-red-500 rounded-xl text-xs hover:bg-red-50 transition-colors"
                  >
                    取消收藏
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}