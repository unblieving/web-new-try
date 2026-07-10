"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  status: "ok";
  service: string;
  timestamp: string;
};

type Course = {
  id: number;
  title: string;
  description: string;
  createdAt: string;
};

type CourseResponse = {
  data: Course[];
};

export function CourseDashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const [healthResponse, courseResponse] = await Promise.all([
          fetch("/api/health", { signal: controller.signal }),
          fetch("/api/courses", { signal: controller.signal }),
        ]);

        if (!healthResponse.ok || !courseResponse.ok) {
          throw new Error("API 返回了非预期状态");
        }

        const healthData = (await healthResponse.json()) as HealthResponse;
        const courseData = (await courseResponse.json()) as CourseResponse;
        setHealth(healthData);
        setCourses(courseData.data);
      } catch (reason) {
        if (reason instanceof Error && reason.name !== "AbortError") {
          setError(reason.message);
        }
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, []);

  return (
    <section aria-labelledby="dashboard-heading">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            id="dashboard-heading"
            className="text-2xl font-bold text-slate-900"
          >
            课程模块
          </h2>
          <p className="mt-2 text-slate-600">
            这里的数据来自 Midway API 和 SQLite。
          </p>
        </div>
        <div
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            health
              ? "bg-emerald-100 text-emerald-800"
              : error
                ? "bg-rose-100 text-rose-800"
                : "bg-amber-100 text-amber-800"
          }`}
          role="status"
        >
          {health ? "API 已连接" : error ? "API 连接失败" : "正在连接 API…"}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <p className="font-semibold">暂时无法加载课程。</p>
          <p className="mt-2 text-sm">请确认后端已在 7001 端口启动：{error}</p>
        </div>
      ) : courses.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              key={course.id}
            >
              <span className="font-mono text-xs font-semibold text-blue-700">
                MODULE {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-xl font-bold text-slate-900">
                {course.title}
              </h3>
              <p className="mt-3 leading-7 text-slate-600">
                {course.description}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3" aria-label="正在加载课程">
          {[0, 1, 2].map((item) => (
            <div
              className="h-48 animate-pulse rounded-2xl bg-slate-200"
              key={item}
            />
          ))}
        </div>
      )}
    </section>
  );
}
