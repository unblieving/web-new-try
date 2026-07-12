"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  addFavorite,
  checkFavorite,
  createOrder,
  getItem,
  removeFavorite,
} from "@/lib/api";
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
  pending_review: "bg-amber-100 text-amber-700 border-amber-200",
  listed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  reserved: "bg-orange-100 text-orange-700 border-orange-200",
  sold: "bg-gray-100 text-gray-500 border-gray-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  removed: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = Number(params.id);

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFavorited, setIsFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMsg, setOrderMsg] = useState("");

  const loadItem = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getItem(id);
      setItem(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadFavoriteStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await checkFavorite(id);
      setIsFavorited(res.isFavorited);
    } catch {
      /* ignore */
    }
  }, [id, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load item detail
    loadItem();
  }, [loadItem]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Check favorite status
    loadFavoriteStatus();
  }, [loadFavoriteStatus]);

  async function toggleFavorite() {
    if (!user) {
      router.push("/login");
      return;
    }
    setFavLoading(true);
    try {
      if (isFavorited) {
        await removeFavorite(id);
        setIsFavorited(false);
      } else {
        await addFavorite(id);
        setIsFavorited(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setFavLoading(false);
    }
  }

  async function handleBuy() {
    if (!user) {
      router.push("/login");
      return;
    }
    setOrderLoading(true);
    setOrderMsg("");
    try {
      const order = await createOrder(id);
      setOrderMsg(`🎉 下单成功！订单号: ${order.id}`);
      await loadItem();
    } catch (err) {
      setOrderMsg(err instanceof Error ? err.message : "下单失败");
    } finally {
      setOrderLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-gray-400 text-sm">正在加载商品详情...</p>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="text-5xl mb-4">😵</span>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="text-5xl mb-4">🔍</span>
        <p className="text-gray-400">商品不存在</p>
      </div>
    );
  }

  const isOwner = user?.id === item.sellerId;
  const canBuy = item.status === "listed" && !isOwner;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <button
          onClick={() => router.push("/")}
          className="hover:text-blue-500 transition-colors"
        >
          🏠 首页
        </button>
        <span>/</span>
        {item.category && (
          <>
            <span className="text-gray-500">{item.category.name}</span>
            <span>/</span>
          </>
        )}
        <span className="text-gray-600 truncate">{item.title}</span>
      </div>

      <div className="bg-white rounded-2xl border border-blue-100/60 shadow-sm overflow-hidden">
        <div className="flex gap-0 flex-col md:flex-row">
          {/* Image */}
          <div className="md:w-1/2">
            <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden relative">
              {item.images.length > 0 ? (
                <img
                  src={item.images[0]}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-300 text-7xl">📦</span>
              )}
              {/* Status badge */}
              <span
                className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}
              >
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="md:w-1/2 p-6 md:p-8 space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                {item.title}
              </h1>
              <div className="flex items-center gap-2">
                {item.category && (
                  <span className="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-100">
                    {item.category.name}
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100/50">
              <p className="text-xs text-gray-500 mb-1">售价</p>
              <p className="text-3xl font-bold text-red-500">
                ¥{item.price.toFixed(2)}
              </p>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">库存</p>
                <p className="font-medium text-gray-700">
                  {item.availableQuantity} 件
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">卖家</p>
                <p className="font-medium text-gray-700">
                  {item.seller?.username ?? "未知"}
                </p>
              </div>
              <div className="col-span-2 bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">发布时间</p>
                <p className="font-medium text-gray-700">
                  {new Date(item.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs text-gray-400 mb-2">📝 商品描述</p>
              <p className="text-sm text-gray-600 leading-relaxed bg-blue-50/30 rounded-lg p-4 border border-blue-100/40">
                {item.description || "暂无描述"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={toggleFavorite}
                disabled={favLoading}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                  isFavorited
                    ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                } disabled:opacity-50`}
              >
                {isFavorited ? "❤️ 已收藏" : "🤍 收藏"}
              </button>

              {canBuy && (
                <button
                  onClick={handleBuy}
                  disabled={orderLoading}
                  className="flex-[2] px-6 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
                >
                  {orderLoading ? "⏳ 处理中..." : "🛒 立即购买"}
                </button>
              )}

              {isOwner && (
                <span className="flex-1 px-4 py-3 rounded-xl text-sm text-center bg-gray-100 text-gray-500 border border-gray-200">
                  👤 这是您的商品
                </span>
              )}
            </div>

            {orderMsg && (
              <div
                className={`text-sm p-4 rounded-xl border animate-fade-in-up ${
                  orderMsg.includes("成功")
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : "bg-red-50 text-red-600 border-red-200"
                }`}
              >
                {orderMsg}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-blue-50/50 rounded-xl p-5 border border-blue-100/50">
        <h3 className="text-sm font-medium text-blue-700 mb-2">
          💡 交易小贴士
        </h3>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• 购买前请仔细查看商品描述和卖家信息</li>
          <li>• 建议在校内公共场所进行线下交易</li>
          <li>• 如遇问题可联系平台管理员处理</li>
        </ul>
      </div>
    </div>
  );
}
