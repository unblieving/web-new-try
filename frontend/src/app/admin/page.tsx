"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminListItems, approveItem, rejectItem, removeItem } from "@/lib/api";
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

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const pageSize = 10;

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const result: PaginatedResult<Item> = await adminListItems({
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load admin items
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  async function handleApprove(id: number) {
    setActionMsg("");
    try {
      await approveItem(id);
      setActionMsg("审核通过");
      await loadItems();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function handleReject(id: number) {
    if (!rejectReason.trim()) {
      setActionMsg("请输入拒绝原因");
      return;
    }
    setActionMsg("");
    try {
      await rejectItem(id, rejectReason.trim());
      setActionMsg("已拒绝");
      setRejectingId(null);
      setRejectReason("");
      await loadItems();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function handleRemove(id: number) {
    setActionMsg("");
    try {
      await removeItem(id);
      setActionMsg("已下架");
      await loadItems();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
    }
  }

  if (authLoading || !user || user.role !== "admin") {
    return <p className="text-center text-gray-400 py-12">加载中...</p>;
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">后台管理 - 商品审核</h1>

      <div className="mb-4 flex items-center gap-3">
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
        <span className="text-sm text-gray-500">共 {total} 件商品</span>
      </div>

      {actionMsg && (
        <div
          className={`mb-4 text-sm p-3 rounded ${
            actionMsg.includes("成功") ||
            actionMsg.includes("通过") ||
            actionMsg.includes("已")
              ? "bg-green-50 text-green-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          {actionMsg}
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-12">加载中...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-400 py-12">暂无商品</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-4">
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
                  <Link
                    href={`/items/${item.id}`}
                    className="text-sm font-medium hover:text-blue-600"
                  >
                    {item.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-red-500 font-bold text-sm">
                      ¥{item.price.toFixed(2)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[item.status] ?? "bg-gray-100"}`}
                    >
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    <span>卖家: {item.seller?.username ?? "未知"}</span>
                    <span className="ml-3">库存: {item.quantity}</span>
                    <span className="ml-3">
                      发布: {new Date(item.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  {item.rejectReason && (
                    <p className="text-xs text-red-400 mt-1">
                      拒绝原因: {item.rejectReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  {item.status === "pending_review" && (
                    <>
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        通过
                      </button>
                      <button
                        onClick={() => setRejectingId(item.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                      >
                        拒绝
                      </button>
                    </>
                  )}
                  {(item.status === "listed" || item.status === "reserved") && (
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
                    >
                      下架
                    </button>
                  )}
                </div>
              </div>

              {/* Reject reason input */}
              {rejectingId === item.id && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="请输入拒绝原因"
                    className="flex-1 border rounded px-3 py-1 text-sm"
                  />
                  <button
                    onClick={() => handleReject(item.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                  >
                    确认拒绝
                  </button>
                  <button
                    onClick={() => {
                      setRejectingId(null);
                      setRejectReason("");
                    }}
                    className="px-3 py-1 border rounded text-xs"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
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
