"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMyItems } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Item, PaginatedResult } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  pending_review: "审核中",
  listed: "在售",
  reserved: "已预订",
  sold: "已售出",
  rejected: "已拒绝",
  removed: "已下架",
};

const STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-700",
  listed: "bg-green-100 text-green-700",
  reserved: "bg-orange-100 text-orange-700",
  sold: "bg-gray-100 text-gray-500",
  rejected: "bg-red-100 text-red-700",
  removed: "bg-gray-100 text-gray-500",
};

export default function MyItemsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const result: PaginatedResult<Item> = await getMyItems({
        page,
        pageSize,
        status: statusFilter || undefined,
      });
      setItems(result.data);
      setTotal(result.total);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load my items
    loadItems();
  }, [loadItems]);

  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的发布</h1>
        <Link
          href="/publish"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          发布新商品
        </Link>
      </div>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">全部状态</option>
          <option value="pending_review">审核中</option>
          <option value="listed">在售</option>
          <option value="reserved">已预订</option>
          <option value="sold">已售出</option>
          <option value="rejected">已拒绝</option>
          <option value="removed">已下架</option>
        </select>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">加载中...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-400 py-12">暂无商品</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className="flex items-center gap-4 border rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                {item.images.length > 0 ? (
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-300 text-2xl">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate">{item.title}</h3>
                <p className="text-red-500 font-bold text-sm mt-1">
                  ¥{item.price.toFixed(2)}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs flex-shrink-0 ${STATUS_COLORS[item.status] ?? "bg-gray-100"}`}
              >
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
              {item.rejectReason && (
                <span className="text-xs text-red-400 flex-shrink-0 max-w-[200px] truncate">
                  拒绝原因: {item.rejectReason}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}