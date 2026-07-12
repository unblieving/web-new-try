"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMyItems } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Item } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  pending_review: "审核中",
  listed: "在售",
  reserved: "已预订",
  sold: "已售出",
  rejected: "已拒绝",
  removed: "已下架",
};

const STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-amber-50 text-amber-600 border-amber-200",
  listed: "bg-emerald-50 text-emerald-600 border-emerald-200",
  reserved: "bg-orange-50 text-orange-600 border-orange-200",
  sold: "bg-gray-50 text-gray-500 border-gray-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  removed: "bg-gray-50 text-gray-500 border-gray-200",
};

const STATUS_ICONS: Record<string, string> = {
  pending_review: "⏳",
  listed: "✅",
  reserved: "🔒",
  sold: "💰",
  rejected: "❌",
  removed: "📦",
};

export default function MyItemsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMyItems({
        status: statusFilter || undefined,
      });
      setItems(result);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load my items
    loadItems();
  }, [loadItems]);

  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>📦</span> 我的发布
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            管理你发布的所有商品
          </p>
        </div>
        <Link
          href="/publish"
          className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:from-blue-600 hover:to-indigo-600 shadow-sm hover:shadow-md transition-all"
        >
          + 发布新商品
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
          }}
          className="border border-blue-200 rounded-xl px-4 py-2.5 text-sm bg-blue-50/30 focus:bg-white transition-colors cursor-pointer"
        >
          <option value="">📋 全部状态</option>
          <option value="pending_review">⏳ 审核中</option>
          <option value="listed">✅ 在售</option>
          <option value="reserved">🔒 已预订</option>
          <option value="sold">💰 已售出</option>
          <option value="rejected">❌ 已拒绝</option>
          <option value="removed">📦 已下架</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 animate-bounce">⏳</div>
          <p className="text-gray-400 text-sm">加载中...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-blue-100/60">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-gray-400 text-sm mb-4">
            {statusFilter ? "该状态下暂无商品" : "你还没有发布过商品"}
          </p>
          {!statusFilter && (
            <Link
              href="/publish"
              className="inline-block bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:from-blue-600 hover:to-indigo-600 shadow-sm transition-all"
            >
              🚀 去发布第一件商品
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className="flex items-center gap-4 bg-white border border-blue-100/60 rounded-xl p-4 hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-blue-100/50">
                {item.images.length > 0 ? (
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-blue-300 text-2xl">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-red-500 font-bold text-sm mt-1">
                  ¥{item.price.toFixed(2)}
                </p>
                {item.rejectReason && (
                  <p className="text-xs text-red-400 mt-1 truncate max-w-[300px]">
                    拒绝原因: {item.rejectReason}
                  </p>
                )}
              </div>
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 border ${STATUS_COLORS[item.status] ?? "bg-gray-50 border-gray-200"}`}
              >
                {STATUS_ICONS[item.status] ?? "📋"}{" "}
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}