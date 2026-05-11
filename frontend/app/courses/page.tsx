"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Course, getCourses } from "../../lib/api";
import { clearAccessToken, getAccessToken } from "../../lib/auth";
import { NotificationBell } from "../../components/notification-bell";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/");
      return;
    }

    void loadCourses();
  }, [router]);

  async function loadCourses() {
    setLoading(true);
    setError(null);
    try {
      setCourses(await getCourses());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load courses.";
      if (message.includes("401") || message.includes("Unauthorized") || message.includes("NO_TOKEN")) {
        clearAccessToken();
        router.replace("/");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) =>
      [course.name, course.code, course.description, course.department?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [courses, query]);

  function logout() {
    clearAccessToken();
    router.replace("/");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-4 text-slate-100">
      <div className="isu-orb left-[-8rem] top-10 h-64 w-64 opacity-60" />
      <div className="isu-orb bottom-[-9rem] right-[-6rem] h-80 w-80 opacity-55" />
      <div className="relative mx-auto max-w-6xl">
        <header className="isu-panel relative mb-5 overflow-hidden rounded-[1.75rem] px-5 py-4">
          <div className="isu-sheen" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#7fb7dc]">Academic Catalog</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Courses</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button onClick={logout} className="isu-chip px-3 py-1.5 text-sm text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">
                Logout
              </button>
            </div>
          </div>
          <div className="relative mt-5 flex flex-wrap gap-2 text-sm">
            <Link href="/chat" className="isu-chip px-3 py-1.5 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Chat</Link>
            <Link href="/materials" className="isu-chip px-3 py-1.5 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Materials</Link>
            <Link href="/search" className="isu-chip px-3 py-1.5 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Search</Link>
            <Link href="/departments" className="isu-chip px-3 py-1.5 text-slate-200 hover:bg-[rgba(56,128,176,0.16)]">Departments</Link>
            <Link href="/courses" className="isu-button-primary rounded-full px-3 py-1.5 font-medium">Courses</Link>
          </div>
        </header>

        <section className="isu-panel rounded-[1.75rem] p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Courses</h1>
              <p className="mt-1 text-sm text-[var(--isu-text-soft)]">Find active course entries and jump straight into their material streams.</p>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search courses..."
              className="isu-input w-full max-w-xs rounded-xl px-3 py-2 text-sm"
            />
          </div>

          {loading ? <p className="text-sm text-slate-400">Loading courses...</p> : null}
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          {!loading && !error ? (
            filtered.length === 0 ? (
              <p className="text-sm text-slate-400">No courses match your search.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="rounded-[1.5rem] border border-[rgba(127,183,220,0.16)] bg-[linear-gradient(180deg,rgba(12,28,41,0.96),rgba(8,19,29,0.92))] p-4 transition hover:border-[rgba(127,183,220,0.34)]"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-[#7fb7dc]">{course.code || "Course"}</p>
                    <h2 className="mt-2 font-semibold">{course.name}</h2>
                    <p className="mt-2 text-sm text-slate-400">{course.description || "No description available."}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="isu-chip px-2.5 py-1 text-[11px]">{course.department?.name || "No department"}</span>
                      <span className="isu-chip px-2.5 py-1 text-[11px]">Materials: {course.materialCount ?? 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : null}
        </section>
      </div>
    </main>
  );
}
