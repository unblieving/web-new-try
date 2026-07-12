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
  pending_review: "bg-yellow-100 text-yellow-700",
  listed: "bg-green-100 text-green-700",
  reserved: "bg-orange-100 text-orange-700",
  sold: "bg-gray-100 text-gray-500",
  rejected: "bg-red-100 text-red-700",
  removed: "bg-gray-100 text-gray-500",
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
      setOrderMsg(`下单成功！订单号: ${order.id}`);
      await loadItem();
    } catch (err) {
      setOrderMsg(err instanceof Error ? err.message : "下单失败");
    } finally {
      setOrderLoading(false);
    }
  }

  if (loading) {
    return <p className="text-center text-gray-400 py-12">加载中...</p>;
  }

  if (error && !item) {
    return <p className="text-center text-red-500 py-12">{error}</p>;
  }

  if (!item) {
    return <p className="text-center text-gray-400 py-12">商品不存在</p>;
  }

  const isOwner = user?.id === item.sellerId;
  const canBuy = item.status === "listed" && !isOwner;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex gap-6 flex-col md:flex-row">
        {/* Image */}
        <div className="md:w-1/2">
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            {item.images.length > 0 ? (
              <img
                src={item.images[0]}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-300 text-6xl">📦</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="md:w-1/2 space-y-4">
          <h1 className="text-xl font-bold">{item.title}</h1>
          <p className="text-2xl text-red-500 font-bold">
            ¥{item.price.toFixed(2)}
          </p>

          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[item.status] ?? "bg-gray-100"}`}
            >
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
            {item.category && (
              <span className="px-2 py-1 rounded text-xs bg-blue-50 text-blue-600">
                {item.category.name}
              </span>
            )}
          </div>

          <div className="text-sm text-gray-500">
            <p>库存: {item.availableQuantity}</p>
            <p>卖家: {item.seller?.username ?? "未知"}</p>
            <p>发布时间: {new Date(item.createdAt).toLocaleString("zh-CN")}</p>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed">
            {item.description}
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={toggleFavorite}
              disabled={favLoading}
              className={`px-4 py-2 rounded text-sm border ${
                isFavorited
                  ? "bg-red-50 text-red-500 border-red-200"
                  : "bg-white text-gray-600 border-gray-200"
              } hover:opacity-80 disabled:opacity-50`}
            >
              {isFavorited ? "❤️ 已收藏" : "🤍 收藏"}
            </button>

            {canBuy && (
              <button
                onClick={handleBuy}
                disabled={orderLoading}
                className="px-6 py-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {orderLoading ? "处理中..." : "立即购买"}
              </button>
            )}

            {isOwner && (
              <span className="px-4 py-2 rounded text-sm bg-gray-100 text-gray-500">
                这是您的商品
              </span>
            )}
          </div>

          {orderMsg && (
            <div
              className={`text-sm p-3 rounded ${
                orderMsg.includes("成功")
                  ? "bg-green-50 text-green-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {orderMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
