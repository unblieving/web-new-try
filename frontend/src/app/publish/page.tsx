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
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span>📝</span> 发布闲置商品
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          填写商品信息，让闲置找到新主人
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-blue-100/60 shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              📌 商品标题 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
              className="w-full border border-blue-200 rounded-xl px-4 py-3 text-sm bg-blue-50/30 focus:bg-white transition-colors"
              placeholder="例如：九成新 iPad Air 5、考研数学笔记"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              📝 商品描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
              className="w-full border border-blue-200 rounded-xl px-4 py-3 text-sm bg-blue-50/30 focus:bg-white transition-colors resize-none"
              placeholder="描述商品成色、使用时长、是否有瑕疵等（越详细越容易卖出哦～）"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {description.length}/2000
            </p>
          </div>

          {/* Price & Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                💰 价格 (¥) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0.01"
                step="0.01"
                className="w-full border border-blue-200 rounded-xl px-4 py-3 text-sm bg-blue-50/30 focus:bg-white transition-colors"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                📦 库存数量 <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                min="1"
                step="1"
                className="w-full border border-blue-200 rounded-xl px-4 py-3 text-sm bg-blue-50/30 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              📂 分类 <span className="text-red-400">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full border border-blue-200 rounded-xl px-4 py-3 text-sm bg-blue-50/30 focus:bg-white transition-colors cursor-pointer"
            >
              <option value="">请选择分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.parentId ? "  └ " : ""}
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Image URLs */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              🖼️ 图片链接
            </label>
            <textarea
              value={imageUrls}
              onChange={(e) => setImageUrls(e.target.value)}
              rows={3}
              className="w-full border border-blue-200 rounded-xl px-4 py-3 text-sm bg-blue-50/30 focus:bg-white transition-colors resize-none"
              placeholder="每行一个图片 URL，例如：&#10;https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
            />
            <p className="text-xs text-gray-400 mt-1">
              💡 提示：可留空，系统会使用默认占位图
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl py-3.5 text-sm font-medium hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
          >
            {submitting ? "⏳ 发布中..." : "🚀 发布商品"}
          </button>
        </form>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-blue-50/50 rounded-xl p-5 border border-blue-100/50">
        <h3 className="text-sm font-medium text-blue-700 mb-2">
          💡 发布小贴士
        </h3>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• 标题简洁明了，突出商品亮点</li>
          <li>• 详细描述商品成色和使用情况</li>
          <li>• 合理定价，参考同类商品价格</li>
          <li>• 发布后需等待管理员审核通过</li>
        </ul>
      </div>
    </div>
  );
}