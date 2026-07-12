"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createItem, getCategoriesFlat } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Category } from "@/lib/types";

export default function PublishPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await getCategoriesFlat();
      setCategories(cats);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load categories on mount
    loadCategories();
  }, [loadCategories]);

  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("请输入有效的价格");
      return;
    }
    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 1) {
      setError("请输入有效的库存数量");
      return;
    }
    if (!categoryId) {
      setError("请选择分类");
      return;
    }

    setSubmitting(true);
    try {
      const images = imageUrls
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const item = await createItem({
        title,
        description: description || undefined,
        price: parsedPrice,
        quantity: parsedQty,
        categoryId: Number(categoryId),
        images: images.length > 0 ? images : undefined,
      });
      router.push(`/items/${item.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">发布商品</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">商品标题 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="例如：九成新 iPad Air 5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">商品描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="描述商品成色、使用时长、是否有瑕疵等"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">价格 (¥) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min="0.01"
              step="0.01"
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">库存数量 *</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              min="1"
              step="1"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">分类 *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">请选择分类</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            图片链接（每行一个 URL）
          </label>
          <textarea
            value={imageUrls}
            onChange={(e) => setImageUrls(e.target.value)}
            rows={3}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "发布中..." : "发布商品"}
        </button>
      </form>
    </div>
  );
}