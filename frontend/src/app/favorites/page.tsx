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
    <div>
      <h1 className="text-2xl font-bold mb-6">我的收藏</h1>

      {actionMsg && (
        <div
          className={`mb-4 text-sm p-3 rounded ${
            actionMsg.includes("成功") || actionMsg.includes("已")
              ? "bg-green-50 text-green-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          {actionMsg}
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-12">加载中...</p>
      ) : favorites.length === 0 ? (
        <p className="text-center text-gray-400 py-12">暂无收藏</p>
      ) : (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="border rounded-lg p-4 flex items-center gap-4"
            >
              <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                {fav.item?.images && fav.item.images.length > 0 ? (
                  <img
                    src={fav.item.images[0]}
                    alt={fav.item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-300 text-2xl">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {fav.item && (
                  <Link
                    href={`/items/${fav.item.id}`}
                    className="text-sm font-medium hover:text-blue-600"
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
                  收藏时间: {new Date(fav.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <button
                onClick={() => fav.item && handleRemove(fav.item.id)}
                className="px-3 py-1 border border-red-300 text-red-500 rounded text-xs hover:bg-red-50 flex-shrink-0"
              >
                取消收藏
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}