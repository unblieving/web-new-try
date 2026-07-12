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

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [actionMsgType, setActionMsgType] = useState<"success" | "error">(
    "success",
  );
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
      setActionMsgType("success");
      await loadItems();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
      setActionMsgType("error");
    }
  }

  async function handleReject(id: number) {
    if (!rejectReason.trim()) {
      setActionMsg("请输入拒绝原因");
      setActionMsgType("error");
      return;
    }
    setActionMsg("");
    try {
      await rejectItem(id, rejectReason.trim());
      setActionMsg("已拒绝");
      setActionMsgType("success");
      setRejectingId(null);
      setRejectReason("");
      await loadItems();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
      setActionMsgType("error");
    }
  }

  async function handleRemove(id: number) {
    setActionMsg("");
    try {
      await removeItem(id);
      setActionMsg("已下架");
      setActionMsgType("success");
      await loadItems();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
      setActionMsgType("error");
    }
  }

  if (authLoading || !user || user.role !== "admin") {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 animate-bounce">⏳</div>
        <p className="text-gray-400 text-sm">加载中...</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>🛡️</span> 后台管理 - 商品审核
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          审核和管理平台上的所有商品
        </p>
      </div>

      {/* Filter & Stats */}
      <div className="mb-6 flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
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
        <span className="text-sm text-gray-500 bg-white px-4 py-2.5 rounded-xl border border-blue-100/60">
          📊 共 <span className="font-medium text-blue-600">{total}</span>{" "}
          件商品
        </span>
      </div>

      {/* Action Message */}
      {actionMsg && (
        <div
          className={`mb-6 text-sm p-4 rounded-xl border flex items-center gap-2 ${
            actionMsgType === "success"
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : "bg-red-50 text-red-600 border-red-200"
          }`}
        >
          <span>{actionMsgType === "success" ? "✅" : "⚠️"}</span>
          {actionMsg}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 animate-bounce">⏳</div>
          <p className="text-gray-400 text-sm">加载中...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-blue-100/60">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-gray-400 text-sm">暂无商品</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-blue-100/60 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition-all"
            >
              <div className="flex items-center gap-4">
                {/* Image */}
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

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/items/${item.id}`}
                    className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors"
                  >
                    {item.title}
                  </Link>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-red-500 font-bold text-sm">
                      ¥{item.price.toFixed(2)}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-medium border ${STATUS_COLORS[item.status] ?? "bg-gray-50 border-gray-200"}`}
                    >
                      {STATUS_ICONS[item.status] ?? "📋"}{" "}
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                    <span>👤 卖家: {item.seller?.username ?? "未知"}</span>
                    <span>📦 库存: {item.quantity}</span>
                    <span>
                      🕐{" "}
                      {new Date(item.createdAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                  {item.rejectReason && (
                    <p className="text-xs text-red-400 mt-1.5 bg-red-50 px-3 py-1.5 rounded-lg inline-block">
                      ❌ 拒绝原因: {item.rejectReason}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {item.status === "pending_review" && (
                    <>
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl text-xs font-medium hover:from-emerald-600 hover:to-green-600 shadow-sm transition-all"
                      >
                        ✅ 通过
                      </button>
                      <button
                        onClick={() => setRejectingId(item.id)}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl text-xs font-medium hover:from-red-600 hover:to-rose-600 shadow-sm transition-all"
                      >
                        ❌ 拒绝
                      </button>
                    </>
                  )}
                  {(item.status === "listed" ||
                    item.status === "reserved") && (
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs hover:bg-gray-50 transition-colors"
                    >
                      📦 下架
                    </button>
                  )}
                </div>
              </div>

              {/* Reject reason input */}
              {rejectingId === item.id && (
                <div className="mt-4 pt-4 border-t border-blue-50 flex items-center gap-3">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="请输入拒绝原因..."
                    className="flex-1 border border-blue-200 rounded-xl px-4 py-2.5 text-sm bg-blue-50/30 focus:bg-white transition-colors"
                  />
                  <button
                    onClick={() => handleReject(item.id)}
                    className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl text-xs font-medium hover:from-red-600 hover:to-rose-600 shadow-sm transition-all"
                  >
                    确认拒绝
                  </button>
                  <button
                    onClick={() => {
                      setRejectingId(null);
                      setRejectReason("");
                    }}
                    className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-8">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 border border-blue-200 rounded-xl text-sm disabled:opacity-40 hover:bg-blue-50 transition-colors"
          >
            ← 上一页
          </button>
          <span className="text-sm text-gray-500 bg-white px-4 py-2 rounded-xl border border-blue-100/60">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 border border-blue-200 rounded-xl text-sm disabled:opacity-40 hover:bg-blue-50 transition-colors"
          >
            下一页 →
          </button>
        </div>
      )}
    </div>
  );
}