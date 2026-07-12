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
    <div>
      {/* Search & Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="搜索商品..."
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
          className="border rounded px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select
          value={categoryId ?? ""}
          onChange={(e) => {
            setCategoryId(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">全部分类</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
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
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="created_at-desc">最新发布</option>
          <option value="created_at-asc">最早发布</option>
          <option value="price-asc">价格从低到高</option>
          <option value="price-desc">价格从高到低</option>
        </select>
      </div>

      {/* Items Grid */}
      {loading ? (
        <p className="text-center text-gray-400 py-12">加载中...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-400 py-12">暂无商品</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {item.images.length > 0 ? (
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-300 text-4xl">📦</span>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium truncate">{item.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-red-500 font-bold">
                    ¥{item.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </div>
                {item.category && (
                  <p className="text-xs text-gray-400 mt-1">
                    {item.category.name}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
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