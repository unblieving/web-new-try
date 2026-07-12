"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cancelOrder, confirmOrder, getMyOrders, payOrder } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Order, PaginatedResult } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "待付款",
  paid: "已付款",
  completed: "已完成",
  cancelled: "已取消",
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-700",
  paid: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function MyOrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const pageSize = 10;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result: PaginatedResult<Order> = await getMyOrders({
        page,
        pageSize,
        status: statusFilter || undefined,
      });
      setOrders(result.data);
      setTotal(result.total);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

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
      await loadOrders();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function handleConfirm(id: number) {
    setActionMsg("");
    try {
      await confirmOrder(id);
      setActionMsg("确认收货成功");
      await loadOrders();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function handleCancel(id: number) {
    setActionMsg("");
    try {
      await cancelOrder(id);
      setActionMsg("订单已取消");
      await loadOrders();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "操作失败");
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">我的订单</h1>

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
          <option value="pending_payment">待付款</option>
          <option value="paid">已付款</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      {actionMsg && (
        <div
          className={`mb-4 text-sm p-3 rounded ${
            actionMsg.includes("成功")
              ? "bg-green-50 text-green-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          {actionMsg}
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-12">加载中...</p>
      ) : orders.length === 0 ? (
        <p className="text-center text-gray-400 py-12">暂无订单</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border rounded-lg p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-400">
                    订单号: {order.orderNo}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[order.status] ?? "bg-gray-100"}`}
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
                {order.item && (
                  <Link
                    href={`/items/${order.item.id}`}
                    className="text-sm font-medium hover:text-blue-600"
                  >
                    {order.item.title}
                  </Link>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  <span>数量: {order.quantity}</span>
                  <span className="ml-3">
                    总价: ¥{order.totalPrice.toFixed(2)}
                  </span>
                  <span className="ml-3">
                    {new Date(order.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {order.status === "pending_payment" && (
                  <>
                    <button
                      onClick={() => handlePay(order.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      模拟付款
                    </button>
                    <button
                      onClick={() => handleCancel(order.id)}
                      className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </>
                )}
                {order.status === "paid" && (
                  <button
                    onClick={() => handleConfirm(order.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                  >
                    确认收货
                  </button>
                )}
              </div>
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