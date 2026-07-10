import { CourseDashboard } from "@/components/course-dashboard";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 sm:py-16">
      <header className="mb-14 grid gap-8 border-b border-slate-200 pb-12 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="mb-4 font-mono text-sm font-semibold tracking-[0.2em] text-blue-700 uppercase">
            Full-stack course starter
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
            从能运行的骨架，长成真正的 Web 应用。
          </h1>
        </div>
        <a
          className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
          href="/api/health"
        >
          检查 API
        </a>
      </header>

      <CourseDashboard />

      <footer className="mt-auto pt-16 text-sm text-slate-500">
        Next.js · Midway.js · SQLite · OpenAPI
      </footer>
    </main>
  );
}
