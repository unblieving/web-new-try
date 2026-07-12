"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getCategories, getItems } from "@/lib/api";
import type { Category, Item, PaginatedResult } from "@/lib/types";

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

const STICKERS = ["🎒", "📚", "🎮", "🎧", "👟", "🧸", "🌸", "☕"];

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "price">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const pageSize = 12;

  const loadCategories = useCallback(async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch {
      /* ignore */
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const result: PaginatedResult<Item> = await getItems({
        page,
        pageSize,
        categoryId,
        keyword: keyword || undefined,
        sortBy,
        sortOrder,
      });
      setItems(result.data);
      setTotal(result.total);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, categoryId, keyword, sortBy, sortOrder]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial data fetch
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Data fetch on filter change
    loadItems();
  }, [loadItems]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="animate-fade-in-up">
      {/* Hero Banner */}
      <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">🛍️ 校园二手集市</h1>
          <p className="text-blue-100 text-sm mb-1">
            闲置好物，在这里找到新主人
          </p>
          <p className="text-blue-200 text-xs">
            教材 · 数码 · 生活用品 · 宠物 · 服饰
          </p>
        </div>
        {/* Floating stickers */}
        <div className="absolute top-4 right-8 text-4xl animate-float opacity-80">
          🎒
        </div>
        <div
          className="absolute bottom-4 right-24 text-3xl animate-float opacity-60"
          style={{ animationDelay: "1s" }}
        >
          📚
        </div>
        <div
          className="absolute top-8 right-40 text-2xl animate-float opacity-50"
          style={{ animationDelay: "2s" }}
        >
          ✨
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10" />
      </div>

      {/* Search & Filter Bar */}
      <div className="mb-6 p-4 rounded-xl bg-white/70 backdrop-blur-sm border border-blue-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input with gradient border */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="搜索你想要的好物..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-blue-200 rounded-lg bg-white focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Category Select */}
          <select
            value={categoryId ?? ""}
            onChange={(e) => {
              setCategoryId(
                e.target.value ? Number(e.target.value) : undefined,
              );
              setPage(1);
            }}
            className="px-4 py-2.5 text-sm border border-blue-200 rounded-lg bg-white focus:border-blue-400 transition-colors cursor-pointer"
          >
            <option value="">📂 全部分类</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.parentId ? "  └ " : ""}
                {cat.name}
              </option>
            ))}
          </select>

          {/* Sort Select */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split("-") as [
                "created_at" | "price",
                "asc" | "desc",
              ];
              setSortBy(by);
              setSortOrder(order);
              setPage(1);
            }}
            className="px-4 py-2.5 text-sm border border-blue-200 rounded-lg bg-white focus:border-blue-400 transition-colors cursor-pointer"
          >
            <option value="created_at-desc">🕐 最新发布</option>
            <option value="created_at-asc">📅 最早发布</option>
            <option value="price-asc">💰 价格从低到高</option>
            <option value="price-desc">💎 价格从高到低</option>
          </select>
        </div>

        {/* Quick category tags */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-blue-50">
          <button
            onClick={() => {
              setCategoryId(undefined);
              setPage(1);
            }}
            className={`px-3 py-1 text-xs rounded-full transition-all ${
              !categoryId
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            全部
          </button>
          {categories
            .filter((c) => !c.parentId)
            .map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategoryId(cat.id);
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs rounded-full transition-all ${
                  categoryId === cat.id
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                {cat.name}
              </button>
            ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          共找到 <span className="font-semibold text-blue-600">{total}</span>{" "}
          件好物
        </p>
        <div className="flex gap-1">
          {STICKERS.slice(0, 4).map((s, i) => (
            <span
              key={i}
              className="sticker text-lg opacity-40"
              style={{ animationDelay: `${i * 0.5}s` }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4" />
          <p className="text-gray-400 text-sm">正在加载好物...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-5xl mb-4">🔍</span>
          <p className="text-gray-400 text-sm">暂无商品，试试其他搜索词？</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map((item, index) => (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className="group bg-white rounded-xl overflow-hidden border border-blue-100/60 card-hover animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Image */}
              <div className="relative aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden">
                {item.images.length > 0 ? (
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <span className="text-gray-300 text-5xl group-hover:scale-110 transition-transform">
                    📦
                  </span>
                )}
                {/* Status badge */}
                <span
                  className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}
                >
                  {STATUS_LABELS[item.status] ?? item.status}
                </span>
              </div>

              {/* Info */}
              <div className="p-3.5">
                <h3 className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-red-500">
                    ¥{item.price.toFixed(2)}
                  </span>
                  {item.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">
                      {item.category.name}
                    </span>
                  )}
                </div>
                {item.availableQuantity <= 1 && item.status === "listed" && (
                  <p className="text-xs text-orange-500 mt-1.5 flex items-center gap-1">
                    <span>🔥</span> 仅剩{item.availableQuantity}件
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-10">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 border border-blue-200 rounded-lg text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← 上一页
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
              )
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-1 text-gray-300">...</span>
                  )}
                  <button
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm transition-all ${
                      p === page
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-gray-500 hover:bg-blue-50"
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
          </div>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 border border-blue-200 rounded-lg text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            下一页 →
          </button>
        </div>
      )}

      {/* Footer decoration */}
      <div className="mt-12 pt-6 border-t border-blue-100 text-center">
        <p className="text-xs text-gray-400">
          🛒 校园二手交易平台 · 让闲置流转，让价值延续 🌱
        </p>
      </div>
    </div>
  );
}
