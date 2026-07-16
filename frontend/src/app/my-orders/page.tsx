"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  cancelOrder,
  confirmOrder,
  getMyOrders,
  getSoldOrders,
  payOrder,
  shipOrder,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Order } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "待付款",
  paid: "已付款",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消",
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-amber-50 text-amber-600 border-amber-200",
  paid: "bg-blue-50 text-blue-600 border-blue-200",
  shipped: "bg-purple-50 text-purple-600 border-purple-200",
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
};

const STATUS_ICONS: Record<string, string> = {
  pending_payment: "💳",
  paid: "✅",
  shipped: "🚚",
  completed: "🎉",
  cancelled: "❌",
};

type Tab = "buy" | "sell";

export default function MyOrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("buy");
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [actionMsgType, setActionMsgType] = useState<"success" | "error">(
    "success",
  );

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "buy") {
        const result = await getMyOrders({
          status: statusFilter || undefined,
        });
        setOrders(result);
      } else {
        const result = await getSoldOrders();
        setOrders(
          statusFilter
            ? result.filter((o) => o.status === statusFilter)
            : result,
        );
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load orders
    loadOrders();
  }, [loadOrders]);

  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  async function handlePay(id: number) {
    setActionMsg("");
    try {
      await payOrder(id);
      setActionMsg("付款成功");
      setActionMsgType("success");
      await loadOrders();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
      setActionMsgType("error");
    }
  }

  async function handleShip(id: number) {
    setActionMsg("");
    try {
      await shipOrder(id);
      setActionMsg("已确认发货");
      setActionMsgType("success");
      await loadOrders();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
      setActionMsgType("error");
    }
  }

  async function handleConfirm(id: number) {
    setActionMsg("");
    try {
      await confirmOrder(id);
      setActionMsg("确认收货成功");
      setActionMsgType("success");
      await loadOrders();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
      setActionMsgType("error");
    }
  }

  async function handleCancel(id: number) {
    setActionMsg("");
    try {
      await cancelOrder(id);
      setActionMsg("订单已取消");
      setActionMsgType("success");
      await loadOrders();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
      setActionMsgType("error");
    }
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>🛒</span> 我的订单
        </h1>
        <p className="text-sm text-gray-400 mt-1">查看和管理你的所有订单</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setTab("buy");
            setStatusFilter("");
          }}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === "buy"
              ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm"
              : "border border-blue-200 text-gray-600 hover:bg-blue-50"
          }`}
        >
          🛍️ 我的购买
        </button>
        <button
          onClick={() => {
            setTab("sell");
            setStatusFilter("");
          }}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === "sell"
              ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm"
              : "border border-blue-200 text-gray-600 hover:bg-blue-50"
          }`}
        >
          📦 我的出售
        </button>
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
          <option value="pending_payment">💳 待付款</option>
          <option value="paid">✅ 已付款</option>
          <option value="shipped">🚚 已发货</option>
          <option value="completed">🎉 已完成</option>
          <option value="cancelled">❌ 已取消</option>
        </select>
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
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-blue-100/60">
          <div className="text-5xl mb-3">{tab === "buy" ? "🛒" : "📦"}</div>
          <p className="text-gray-400 text-sm mb-4">
            {statusFilter
              ? "该状态下暂无订单"
              : tab === "buy"
                ? "你还没有任何购买订单"
                : "你还没有任何出售订单"}
          </p>
          {!statusFilter && tab === "buy" && (
            <Link
              href="/"
              className="inline-block bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:from-blue-600 hover:to-indigo-600 shadow-sm transition-all"
            >
              🛍️ 去逛逛校园集市
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-blue-100/60 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition-all"
            >
              {/* Order Header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-blue-50">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono">
                    #{order.orderNo}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-medium border ${STATUS_COLORS[order.status] ?? "bg-gray-50 border-gray-200"}`}
                  >
                    {STATUS_ICONS[order.status] ?? "📋"}{" "}
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(order.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>

              {/* Order Body */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {order.item && (
                    <Link
                      href={`/items/${order.item.id}`}
                      className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors"
                    >
                      {order.item.title}
                    </Link>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>📦 数量: {order.quantity}</span>
                    <span className="text-red-500 font-bold text-sm">
                      ¥{order.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0 ml-4">
                  {tab === "buy" && (
                    <>
                      {order.status === "pending_payment" && (
                        <>
                          <button
                            onClick={() => handlePay(order.id)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-xs font-medium hover:from-blue-600 hover:to-indigo-600 shadow-sm transition-all"
                          >
                            💳 模拟付款
                          </button>
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs hover:bg-gray-50 transition-colors"
                          >
                            取消
                          </button>
                        </>
                      )}
                      {order.status === "paid" && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs hover:bg-gray-50 transition-colors"
                        >
                          取消订单
                        </button>
                      )}
                      {order.status === "shipped" && (
                        <>
                          <button
                            onClick={() => handleConfirm(order.id)}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl text-xs font-medium hover:from-emerald-600 hover:to-green-600 shadow-sm transition-all"
                          >
                            ✅ 确认收货
                          </button>
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs hover:bg-gray-50 transition-colors"
                          >
                            取消
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {tab === "sell" && (
                    <>
                      {order.status === "paid" && (
                        <>
                          <button
                            onClick={() => handleShip(order.id)}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-xs font-medium hover:from-purple-600 hover:to-indigo-600 shadow-sm transition-all"
                          >
                            🚚 确认发货
                          </button>
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs hover:bg-gray-50 transition-colors"
                          >
                            取消
                          </button>
                        </>
                      )}
                      {order.status === "shipped" && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs hover:bg-gray-50 transition-colors"
                        >
                          取消订单
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
